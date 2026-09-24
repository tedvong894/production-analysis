// 生产经营分析系统 - Service Worker
// 修改此版本号即可强制所有客户端更新缓存
const CACHE_VERSION = 'v1.30.289';
const CACHE_NAME = 'production-analysis-' + CACHE_VERSION;

const urlsToCache = [
  './',
  './index.html',
  './chart.umd.min.js',
  './jspdf.umd.min.js',
  './html2canvas.min.js',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  './apple-touch-icon.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(urlsToCache))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  // 清理旧版本缓存
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  // 跨域请求（如 Supabase REST）与非 GET 请求：直接透传，不缓存（Cache API 无法缓存 POST / 跨域响应）
  let sameOrigin = false;
  try { sameOrigin = new URL(req.url).origin === self.location.origin; } catch (e) { sameOrigin = false; }
  if (!sameOrigin || req.method !== 'GET') {
    event.respondWith(fetch(req));
    return;
  }
  event.respondWith(
    fetch(req)
      .then((networkResponse) => {
        // 网络请求成功，更新缓存
        if (networkResponse && networkResponse.status === 200) {
          const clone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(req, clone);
          }).catch(() => {});
        }
        return networkResponse;
      })
      .catch(() => {
        // 网络失败，回退到缓存
        return caches.match(req);
      })
  );
});
