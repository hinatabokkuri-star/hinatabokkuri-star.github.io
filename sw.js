// Code cache: bumped on each deploy via bump_sw.sh (triggers RELOAD notification)
const CACHE = 'hina-202604230424';
// Music cache: stable across deployments (mp3 / covers / Suno CDN images survive bumps)
const CACHE_MUSIC = 'hina-music-v1';

self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys
          .filter(k => k.startsWith('hina-') && k !== CACHE && k !== CACHE_MUSIC)
          .map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
      .then(() => self.clients.matchAll({ type: 'window' }))
      .then(clients => clients.forEach(c => c.postMessage({ type: 'RELOAD', version: CACHE })))
  );
});

self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // HTML（ナビゲーション）はSWを素通り（常に最新取得）
  if (request.mode === 'navigate') return;

  // 音楽・ジャケ・Suno CDN → 安定キャッシュ（bumpで消えない）
  const isMusic = url.pathname.startsWith('/music/')
    || url.pathname.startsWith('/covers/')
    || url.hostname.includes('suno.ai');
  if (isMusic) {
    event.respondWith(
      caches.match(request).then(cached => cached || fetch(request).then(res => {
        if (res && res.status === 200) {
          caches.open(CACHE_MUSIC).then(c => c.put(request, res.clone()));
        }
        return res;
      }))
    );
    return;
  }

  // アイコン → コードキャッシュ
  if (url.pathname.startsWith('/icons/')) {
    event.respondWith(
      caches.match(request).then(cached => cached || fetch(request).then(res => {
        caches.open(CACHE).then(c => c.put(request, res.clone()));
        return res;
      }))
    );
    return;
  }

  // その他（JS/CSSなど）：ネットワーク優先、失敗時キャッシュ
  event.respondWith(
    fetch(request)
      .then(res => { caches.open(CACHE).then(c => c.put(request, res.clone())); return res; })
      .catch(() => caches.match(request))
  );
});
