(function(){
  const scriptUrl = new URL(document.currentScript.src);
  const baseUrl = new URL('./', scriptUrl);
  const manifestUrl = new URL('cache-manifest.json', baseUrl);
  const swUrl = new URL('sw.js', baseUrl);
  const activeKey = 'dousoukai_offline_cache_active';
  const activeTtlMs = 45000;

  const unsupported = !('serviceWorker' in navigator) || !('caches' in window) || !('fetch' in window);
  let manifest = null;
  let cacheName = null;
  let audioItems = [];
  let coreItems = [];
  let ui = null;
  let isCaching = false;
  let activeTimer = null;

  function onReady(fn){
    if(document.readyState === 'loading'){
      document.addEventListener('DOMContentLoaded', fn, { once:true });
    }else{
      fn();
    }
  }

  function absoluteUrl(entry){
    const path = typeof entry === 'string' ? entry : entry.url;
    return new URL(path, baseUrl).href;
  }

  function formatBytes(bytes){
    if(!bytes) return '0MB';
    if(bytes >= 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024 / 1024).toFixed(1)}GB`;
    return `${Math.round(bytes / 1024 / 1024)}MB`;
  }

  function audioBytesTotal(){
    return audioItems.reduce((sum, item) => sum + (Number(item.bytes) || 0), 0);
  }

  function ensureStyles(){
    if(document.getElementById('dousoukai-offline-cache-style')) return;
    const style = document.createElement('style');
    style.id = 'dousoukai-offline-cache-style';
    style.textContent = `
      .offline-cache-panel{
        margin:0 0 22px;
        border:2px solid #2f5f8f;
        border-radius:14px;
        background:#f3f8ff;
        color:#244b73;
        box-shadow:0 2px 8px rgba(60,45,15,.10);
        padding:14px 16px;
      }
      .offline-cache-head{
        display:flex;
        align-items:flex-start;
        justify-content:space-between;
        gap:12px;
        margin-bottom:10px;
      }
      .offline-cache-title{
        margin:0;
        font-size:18px;
        font-weight:900;
        line-height:1.35;
      }
      .offline-cache-status{
        margin:3px 0 0;
        color:#5b5447;
        font-size:14px;
      }
      .offline-cache-actions{
        display:flex;
        flex-wrap:wrap;
        gap:8px;
      }
      .offline-cache-actions button{
        min-height:42px;
        border:2px solid #2f5f8f;
        border-radius:12px;
        background:#fff;
        color:#244b73;
        font-family:inherit;
        font-size:15px;
        font-weight:900;
        padding:8px 12px;
        cursor:pointer;
      }
      .offline-cache-actions button.primary{
        background:#2f5f8f;
        color:#fff;
      }
      .offline-cache-actions button:disabled{
        cursor:default;
        opacity:.58;
      }
      .offline-cache-bar{
        width:100%;
        height:12px;
        overflow:hidden;
        border-radius:999px;
        background:#dbe8f6;
      }
      .offline-cache-fill{
        width:0;
        height:100%;
        background:#1d7a43;
        transition:width .18s ease;
      }
      .offline-cache-detail{
        margin:8px 0 0;
        color:#5b5447;
        font-size:13px;
      }
      .offline-cache-panel[data-state="done"]{
        border-color:#1d7a43;
        background:#f0fbf4;
      }
      .offline-cache-panel[data-state="error"]{
        border-color:#a84437;
        background:#fff4f1;
      }
      @media(max-width:520px){
        .offline-cache-head{ display:block; }
        .offline-cache-actions{ margin-top:10px; }
        .offline-cache-actions button{ width:100%; }
      }
    `;
    document.head.appendChild(style);
  }

  function createPanel(){
    ensureStyles();
    const panel = document.createElement('section');
    panel.className = 'offline-cache-panel';
    panel.setAttribute('aria-live', 'polite');
    panel.innerHTML = `
      <div class="offline-cache-head">
        <div>
          <p class="offline-cache-title">オフライン再生用 音源保存</p>
          <p class="offline-cache-status">保存状況を確認しています。未保存分は自動で保存します。</p>
        </div>
        <div class="offline-cache-actions">
          <button class="primary" type="button" data-cache-start>今すぐ保存</button>
          <button type="button" data-cache-check>状況確認</button>
        </div>
      </div>
      <div class="offline-cache-bar" aria-hidden="true"><div class="offline-cache-fill"></div></div>
      <p class="offline-cache-detail"></p>
    `;

    const target = document.querySelector('main.wrap') || document.querySelector('body > .wrap') || document.body;
    target.insertBefore(panel, target.firstChild);

    const startButton = panel.querySelector('[data-cache-start]');
    const checkButton = panel.querySelector('[data-cache-check]');
    startButton.addEventListener('click', () => cacheAllAudio({ manual:true }));
    checkButton.addEventListener('click', () => updateStatus());

    return {
      panel,
      startButton,
      checkButton,
      status: panel.querySelector('.offline-cache-status'),
      detail: panel.querySelector('.offline-cache-detail'),
      fill: panel.querySelector('.offline-cache-fill'),
    };
  }

  function setProgress(done, total){
    const percent = total ? Math.round((done / total) * 100) : 0;
    ui.fill.style.width = `${Math.max(0, Math.min(100, percent))}%`;
  }

  async function cachedAudioInfo(){
    const cache = await caches.open(cacheName);
    let cachedCount = 0;
    let cachedBytes = 0;
    for(const item of audioItems){
      const match = await cache.match(absoluteUrl(item));
      if(match){
        cachedCount += 1;
        cachedBytes += Number(item.bytes) || 0;
      }
    }
    return { cachedCount, cachedBytes };
  }

  async function storageText(){
    if(!navigator.storage || !navigator.storage.estimate) return '';
    try{
      const estimate = await navigator.storage.estimate();
      if(!estimate.quota) return '';
      const used = formatBytes(estimate.usage || 0);
      const quota = formatBytes(estimate.quota || 0);
      return `端末保存領域 ${used} / ${quota}`;
    }catch(error){
      return '';
    }
  }

  async function updateStatus(){
    if(!ui || !manifest) return;
    const total = audioItems.length;
    const totalBytes = audioBytesTotal();
    const { cachedCount, cachedBytes } = await cachedAudioInfo();
    const storage = await storageText();
    setProgress(cachedCount, total);
    ui.panel.dataset.state = cachedCount === total ? 'done' : 'ready';
    ui.status.textContent = cachedCount === total ? `保存済み ${cachedCount} / ${total} 本` : `保存済み ${cachedCount} / ${total} 本。未保存分を自動保存します。`;
    ui.detail.textContent = `音源 ${formatBytes(cachedBytes)} / 約${formatBytes(totalBytes)}${storage ? ` ・ ${storage}` : ''}`;
    ui.startButton.disabled = isCaching || cachedCount === total;
    ui.startButton.textContent = cachedCount === total ? '保存済み' : '今すぐ保存';
  }

  function readActiveLock(){
    try{
      return JSON.parse(localStorage.getItem(activeKey) || 'null');
    }catch(error){
      return null;
    }
  }

  function isAnotherCacheActive(){
    const active = readActiveLock();
    if(!active || active.cacheName !== cacheName) return false;
    return Date.now() - Number(active.time || 0) < activeTtlMs;
  }

  function markActive(){
    try{
      localStorage.setItem(activeKey, JSON.stringify({ cacheName, time:Date.now() }));
    }catch(error){
      // Ignore storage write errors; the cache process can still continue.
    }
  }

  function startActiveHeartbeat(){
    markActive();
    if(activeTimer) window.clearInterval(activeTimer);
    activeTimer = window.setInterval(markActive, 15000);
  }

  function stopActiveHeartbeat(){
    if(activeTimer){
      window.clearInterval(activeTimer);
      activeTimer = null;
    }
    const active = readActiveLock();
    if(active && active.cacheName === cacheName){
      try{ localStorage.removeItem(activeKey); }catch(error){}
    }
  }

  async function fetchAndCache(cache, entry){
    const url = absoluteUrl(entry);
    const existing = await cache.match(url);
    if(existing) return { skipped:true };

    const response = await fetch(url, { cache:'reload', credentials:'same-origin' });
    if(!response.ok) throw new Error(`${response.status} ${url}`);
    await cache.put(url, response.clone());
    return { skipped:false };
  }

  async function cacheCore(cache){
    for(const entry of coreItems){
      try{
        await fetchAndCache(cache, entry);
      }catch(error){
        // Core page files are useful but should not block audio caching.
      }
    }
  }

  async function requestPersistence(){
    if(!navigator.storage || !navigator.storage.persist) return false;
    try{
      return await navigator.storage.persist();
    }catch(error){
      return false;
    }
  }

  async function cacheAllAudio(options = {}){
    if(isCaching || !manifest) return;
    if(isAnotherCacheActive()){
      ui.status.textContent = '別のタブで音源を保存中です。';
      ui.detail.textContent = 'このページでは保存状況だけ確認します。';
      return;
    }
    if(!navigator.onLine){
      ui.panel.dataset.state = 'error';
      ui.status.textContent = 'オフラインのため保存を開始できません。';
      ui.detail.textContent = 'ネット接続がある場所でページを開くと、自動で保存を再開します。';
      return;
    }
    isCaching = true;
    ui.panel.dataset.state = 'working';
    ui.startButton.disabled = true;
    ui.checkButton.disabled = true;
    ui.startButton.textContent = '保存中';
    startActiveHeartbeat();

    const persisted = await requestPersistence();
    const cache = await caches.open(cacheName);
    await cacheCore(cache);

    let done = 0;
    let failed = 0;
    const total = audioItems.length;

    for(const item of audioItems){
      try{
        await fetchAndCache(cache, item);
      }catch(error){
        failed += 1;
      }
      done += 1;
      markActive();
      setProgress(done, total);
      ui.status.textContent = `${options.manual ? '保存中' : '自動保存中'} ${done} / ${total} 本`;
      ui.detail.textContent = `${item.url || item}${persisted ? ' ・ 永続保存を許可済み' : ''}`;
      await new Promise(resolve => setTimeout(resolve, 20));
    }

    isCaching = false;
    stopActiveHeartbeat();
    ui.checkButton.disabled = false;
    await updateStatus();
    if(failed){
      ui.panel.dataset.state = 'error';
      ui.status.textContent = `保存できなかった音源があります: ${failed} 本`;
      ui.detail.textContent = '通信状態を確認してください。次にページを開くと未保存分だけ自動で再開します。';
      ui.startButton.disabled = false;
    }
  }

  async function startAutoCacheIfNeeded(){
    if(!manifest || !audioItems.length || isCaching) return;
    const { cachedCount } = await cachedAudioInfo();
    if(cachedCount >= audioItems.length) return;
    if(!navigator.onLine){
      ui.panel.dataset.state = 'error';
      ui.status.textContent = 'オフラインです。ネット接続後にページを開くと自動保存します。';
      return;
    }
    window.setTimeout(() => cacheAllAudio({ auto:true }), 900);
  }

  async function init(){
    ui = createPanel();
    if(unsupported){
      ui.panel.dataset.state = 'error';
      ui.status.textContent = 'このブラウザではオフライン保存に対応していません。';
      ui.detail.textContent = '';
      ui.startButton.disabled = true;
      ui.checkButton.disabled = true;
      return;
    }

    try{
      const response = await fetch(manifestUrl.href, { cache:'no-store' });
      manifest = await response.json();
      cacheName = manifest.cacheName;
      audioItems = manifest.audio || [];
      coreItems = manifest.core || [];
      await navigator.serviceWorker.register(swUrl.href, { scope: baseUrl.pathname });
      await navigator.serviceWorker.ready;
      await updateStatus();
      await startAutoCacheIfNeeded();
    }catch(error){
      ui.panel.dataset.state = 'error';
      ui.status.textContent = '保存機能の準備に失敗しました。';
      ui.detail.textContent = 'ページを再読み込みして、もう一度お試しください。';
      ui.startButton.disabled = true;
    }
  }

  onReady(init);
})();
