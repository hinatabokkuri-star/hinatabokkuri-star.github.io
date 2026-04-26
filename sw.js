// Code cache: bumped on each deploy via bump_sw.sh (triggers RELOAD notification)
const CACHE = 'hina-202604270057';
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

// Build a 206 Partial Content response from a cached full blob based on a Range header
async function rangeFromCache(cachedResponse, rangeHeader) {
  const blob = await cachedResponse.blob();
  const size = blob.size;
  const m = /bytes=(\d+)-(\d*)/.exec(rangeHeader);
  if (!m) return cachedResponse;
  const start = parseInt(m[1], 10);
  const end = m[2] ? parseInt(m[2], 10) : size - 1;
  const slice = blob.slice(start, end + 1);
  return new Response(slice, {
    status: 206,
    statusText: 'Partial Content',
    headers: {
      'Content-Type': cachedResponse.headers.get('Content-Type') || 'audio/mpeg',
      'Content-Range': `bytes ${start}-${end}/${size}`,
      'Content-Length': String(slice.size),
      'Accept-Ranges': 'bytes',
    },
  });
}

async function handleMusicRequest(request) {
  const cache = await caches.open(CACHE_MUSIC);
  // Match by URL, ignoring Range header on request
  const cached = await cache.match(request.url);
  const rangeHeader = request.headers.get('range');

  if (cached) {
    // Serve from cache (sliced if Range was requested)
    if (rangeHeader) return rangeFromCache(cached, rangeHeader);
    return cached;
  }

  // Not cached yet → fetch full file (no Range header), cache it, respond appropriately
  try {
    const fullReq = new Request(request.url, { cache: 'no-store' });
    const fullRes = await fetch(fullReq);
    if (fullRes && fullRes.status === 200) {
      // Store full response in cache
      await cache.put(request.url, fullRes.clone());
      // Respond to client
      if (rangeHeader) return rangeFromCache(fullRes, rangeHeader);
      return fullRes;
    }
    return fullRes;
  } catch (e) {
    // Network failure; try to return anything we have
    return new Response('', { status: 503 });
  }
}

self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // HTML（ナビゲーション）はSWを素通り（常に最新取得）
  if (request.mode === 'navigate') return;

  // 音楽・ジャケ・Suno CDN → Range対応の安定キャッシュ
  const isMusic = url.pathname.startsWith('/music/')
    || url.pathname.startsWith('/covers/')
    || url.hostname.includes('suno.ai');
  if (isMusic) {
    event.respondWith(handleMusicRequest(request));
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
