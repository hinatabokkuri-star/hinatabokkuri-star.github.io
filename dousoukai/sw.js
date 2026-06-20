const CACHE_VERSION = '2026-06-20-v1';
const CACHE_PREFIX = 'dousoukai-offline-';
const CACHE_NAME = `${CACHE_PREFIX}${CACHE_VERSION}`;

self.addEventListener('install', event => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    // Old audio caches are cleaned after the page migrates reusable files.
    await self.clients.claim();
  })());
});

function withinScope(url){
  return url.origin === self.location.origin && url.pathname.startsWith(new URL(self.registration.scope).pathname);
}

function isAudioRequest(url){
  return withinScope(url) && url.pathname.includes('/audio/') && url.pathname.endsWith('.mp3');
}

async function rangeResponse(request, cached){
  const range = request.headers.get('range');
  if(!range) return cached;

  const match = range.match(/^bytes=(\d*)-(\d*)$/);
  if(!match) return cached;

  const buffer = await cached.arrayBuffer();
  const size = buffer.byteLength;
  let start;
  let end;

  if(match[1] === '' && match[2] !== ''){
    const suffix = Number(match[2]);
    start = Math.max(size - suffix, 0);
    end = size - 1;
  }else{
    start = match[1] ? Number(match[1]) : 0;
    end = match[2] ? Number(match[2]) : size - 1;
  }

  if(Number.isNaN(start) || Number.isNaN(end) || start < 0 || end >= size || start > end){
    return new Response(null, {
      status: 416,
      headers: {
        'Content-Range': `bytes */${size}`,
        'Accept-Ranges': 'bytes',
      },
    });
  }

  const sliced = buffer.slice(start, end + 1);
  const headers = new Headers(cached.headers);
  headers.set('Content-Type', cached.headers.get('Content-Type') || 'audio/mpeg');
  headers.set('Content-Length', String(sliced.byteLength));
  headers.set('Content-Range', `bytes ${start}-${end}/${size}`);
  headers.set('Accept-Ranges', 'bytes');

  return new Response(sliced, {
    status: 206,
    statusText: 'Partial Content',
    headers,
  });
}

async function audioFirst(request){
  const cache = await caches.open(CACHE_NAME);
  const url = request.url;
  const cached = await cache.match(url);
  if(cached) return rangeResponse(request, cached.clone());

  const response = await fetch(request);
  if(response.ok && response.status === 200){
    await cache.put(url, response.clone());
  }
  return response;
}

async function pageNetworkFirst(request){
  const cache = await caches.open(CACHE_NAME);
  try{
    const response = await fetch(request);
    if(response.ok && request.method === 'GET'){
      await cache.put(request.url, response.clone());
    }
    return response;
  }catch(error){
    const cached = await cache.match(request.url);
    if(cached) return cached;
    throw error;
  }
}

self.addEventListener('fetch', event => {
  const request = event.request;
  if(request.method !== 'GET') return;

  const url = new URL(request.url);
  if(!withinScope(url)) return;

  if(isAudioRequest(url)){
    event.respondWith(audioFirst(request));
    return;
  }

  event.respondWith(pageNetworkFirst(request));
});
