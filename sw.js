const CACHE = 'hina-v2';

self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
      .then(() => self.clients.matchAll({ type: 'window' }))
      .then(clients => clients.forEach(c => c.postMessage({ type: 'RELOAD' })))
  );
});

self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // HTML（ナビゲーション）はSWを素通りさせて常にブラウザが直接取得
  // → sw.js が変わらなくても常に最新HTMLが来る
  if (request.mode === 'navigate') return;

  // 音楽ファイル・Suno CDN：キャッシュ優先（大容量）
  if (url.pathname.startsWith('/music/') || url.hostname.includes('suno.ai')) {
    event.respondWith(
      caches.match(request).then(cached => cached || fetch(request).then(res => {
        caches.open(CACHE).then(c => c.put(request, res.clone()));
        return res;
      }))
    );
    return;
  }

  // アイコン・その他静的アセット：キャッシュ優先
  if (url.pathname.startsWith('/icons/')) {
    event.respondWith(
      caches.match(request).then(cached => cached || fetch(request).then(res => {
        caches.open(CACHE).then(c => c.put(request, res.clone()));
        return res;
      }))
    );
    return;
  }

  // その他：ネットワーク優先
  event.respondWith(
    fetch(request)
      .then(res => { caches.open(CACHE).then(c => c.put(request, res.clone())); return res; })
      .catch(() => caches.match(request))
  );
});
