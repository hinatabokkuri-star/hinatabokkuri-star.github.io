(function(){
  const scriptUrl = new URL(document.currentScript.src);
  const baseUrl = new URL('./', scriptUrl);
  const manifestUrl = new URL('cache-manifest.json', baseUrl);
  const swUrl = new URL('sw.js', baseUrl);
  const cachePrefix = 'dousoukai-offline-';
  const activeKey = 'dousoukai_offline_cache_active';
  const activeTtlMs = 45000;

  let manifest = null;
  let cacheName = null;
  let audioItems = [];
  let coreItems = [];
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

  function log(message){
    console.info(`[dousoukai-cache] ${message}`);
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
      // Cache can continue even when localStorage is blocked.
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

  async function cachedAudioInfo(existingCache){
    const cache = existingCache || await caches.open(cacheName);
    let cachedCount = 0;
    let cachedBytes = 0;
    for(const item of audioItems){
      const match = await cache.match(absoluteUrl(item));
      if(await cachedMatchesEntry(match, item)){
        cachedCount += 1;
        cachedBytes += Number(item.bytes) || 0;
      }
    }
    return { cachedCount, cachedBytes };
  }

  async function cachedMatchesEntry(response, entry){
    if(!response) return false;

    const expectedBytes = Number(entry.bytes) || 0;
    if(!expectedBytes) return true;

    const headerBytes = Number(response.headers.get('content-length') || 0);
    if(headerBytes) return headerBytes === expectedBytes;

    try{
      const blob = await response.clone().blob();
      return blob.size === expectedBytes;
    }catch(error){
      return false;
    }
  }

  async function reusableCaches(){
    const keys = await caches.keys();
    const sourceKeys = keys.filter(key => key.startsWith(cachePrefix) && key !== cacheName).reverse();
    return Promise.all(sourceKeys.map(async key => ({ key, cache:await caches.open(key) })));
  }

  async function copyReusableEntry(cache, entry, sources){
    const url = absoluteUrl(entry);
    for(const source of sources){
      const match = await source.cache.match(url);
      if(await cachedMatchesEntry(match, entry)){
        await cache.put(url, match.clone());
        return true;
      }
    }
    return false;
  }

  async function migrateReusableAudio(cache){
    const sources = await reusableCaches();
    if(!sources.length) return 0;

    let reused = 0;
    for(const item of audioItems){
      const url = absoluteUrl(item);
      const current = await cache.match(url);
      if(await cachedMatchesEntry(current, item)) continue;
      if(await copyReusableEntry(cache, item, sources)) reused += 1;
    }

    if(reused) log(`reused ${reused} cached audio file(s)`);
    return reused;
  }

  async function cleanupOldAudioCaches(){
    const info = await cachedAudioInfo();
    if(info.cachedCount < audioItems.length) return;

    const keys = await caches.keys();
    await Promise.all(keys.map(key => {
      if(key.startsWith(cachePrefix) && key !== cacheName) return caches.delete(key);
      return Promise.resolve(false);
    }));
  }

  async function fetchAndCache(cache, entry){
    const url = absoluteUrl(entry);
    const existing = await cache.match(url);
    if(await cachedMatchesEntry(existing, entry)) return { skipped:true };

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
        log(`core skip: ${entry}`);
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

  function connectionInfo(){
    const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    if(!connection) return { kind:'unknown', label:'通信種別を判定できません' };
    if(connection.saveData) return { kind:'metered', label:'データセーバー有効' };

    const type = String(connection.type || '').toLowerCase();
    if(type === 'wifi') return { kind:'unmetered', label:'Wi-Fi' };
    if(type === 'ethernet') return { kind:'unmetered', label:'有線LAN' };
    if(type === 'cellular') return { kind:'metered', label:'キャリア回線' };
    if(type === 'none') return { kind:'offline', label:'オフライン' };
    if(type) return { kind:'unknown', label:`通信種別: ${type}` };

    const effectiveType = connection.effectiveType ? `通信状態: ${connection.effectiveType}` : '通信種別を判定できません';
    return { kind:'unknown', label:effectiveType };
  }

  function confirmLargeDownload(info){
    return window.confirm(`${info.label}のため、通信量に注意してください。\n同窓会ページの全音源保存には約${formatBytes(audioBytesTotal())}を使います。\nこの回線で保存を開始しますか？`);
  }

  function sessionDecisionKey(){
    return `dousoukai_offline_cache_confirmed_${cacheName}`;
  }

  function isConfirmedForSession(){
    try{
      return sessionStorage.getItem(sessionDecisionKey()) === 'yes';
    }catch(error){
      return false;
    }
  }

  function setConfirmedForSession(){
    try{
      sessionStorage.setItem(sessionDecisionKey(), 'yes');
    }catch(error){}
  }

  async function shouldStartDownload(){
    if(!navigator.onLine) return false;
    const connection = connectionInfo();
    if(connection.kind === 'unmetered') return true;
    if(connection.kind === 'offline') return false;
    if(isConfirmedForSession()) return true;

    const ok = confirmLargeDownload(connection);
    if(ok) setConfirmedForSession();
    return ok;
  }

  async function cacheMissingAudio(){
    if(isCaching || !manifest) return;
    if(isAnotherCacheActive()){
      log('another tab is caching');
      return;
    }

    const cache = await caches.open(cacheName);
    await migrateReusableAudio(cache);

    const total = audioItems.length;
    const before = await cachedAudioInfo(cache);
    if(before.cachedCount >= total){
      log(`latest cache already complete: ${before.cachedCount}/${total}`);
      await cleanupOldAudioCaches();
      return;
    }

    const shouldStart = await shouldStartDownload();
    if(!shouldStart){
      log(`cache deferred: ${before.cachedCount}/${total}`);
      return;
    }

    isCaching = true;
    startActiveHeartbeat();

    await requestPersistence();
    await cacheCore(cache);

    let done = before.cachedCount;
    let failed = 0;

    for(const item of audioItems){
      try{
        const result = await fetchAndCache(cache, item);
        if(!result.skipped) done += 1;
      }catch(error){
        failed += 1;
      }
      markActive();
      if(done % 10 === 0 || done === total){
        log(`cached ${done}/${total}`);
      }
      await new Promise(resolve => setTimeout(resolve, 20));
    }

    stopActiveHeartbeat();
    isCaching = false;

    const after = await cachedAudioInfo();
    if(failed){
      log(`cache incomplete: ${after.cachedCount}/${total}, failed ${failed}`);
    }else{
      log(`cache complete: ${after.cachedCount}/${total}`);
      await cleanupOldAudioCaches();
    }
  }

  async function init(){
    if(!('serviceWorker' in navigator) || !('caches' in window) || !('fetch' in window)){
      log('offline cache unsupported');
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
      window.setTimeout(cacheMissingAudio, 900);
    }catch(error){
      log('offline cache init failed');
    }
  }

  onReady(init);
})();
