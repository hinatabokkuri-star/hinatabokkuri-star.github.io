const CACHE = 'hina-v1';

// インストール時：即座に待機をスキップして次のSWへ
self.addEventListener('install', () => self.skipWaiting());

// アクティベート時：古いキャッシュ削除 → 全クライアントをリロード
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

  // ナビゲーション（HTML）：ネットワーク優先 → 失敗時はキャッシュ
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then(res => { caches.open(CACHE).then(c => c.put(request, res.clone())); return res; })
        .catch(() => caches.match(request))
    );
    return;
  }

  // 音楽ファイル・外部CDN：キャッシュ優先（大容量のため）
  if (url.pathname.startsWith('/music/') || url.hostname.includes('suno.ai')) {
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
