/* =========================================================
   Aurio Burger — service worker (PWA)
   - Página, CSS e JS: rede primeiro, cache como reserva (sem rede)
   - Imagens e fontes: cache primeiro, atualizadas em segundo plano
   Ao publicar alterações grandes, subir CACHE_VERSION para limpar caches antigas.
   ========================================================= */
var CACHE_VERSION = 'v1';
var PRECACHE = 'aurio-precache-' + CACHE_VERSION;
var RUNTIME = 'aurio-runtime-' + CACHE_VERSION;

var PRECACHE_URLS = [
  './',
  'assets/css/styles.css',
  'assets/js/main.js',
  'site.webmanifest',
  'favicon-48.png',
  'apple-touch-icon.png',
  'assets/img/logo-240.webp',
  'assets/img/logo-480.webp',
  'assets/img/icons/icon-192.png',
  'assets/img/icons/icon-512.png'
];

self.addEventListener('install', function (event) {
  event.waitUntil(
    caches.open(PRECACHE)
      .then(function (cache) { return cache.addAll(PRECACHE_URLS); })
      .then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.map(function (key) {
        if (key !== PRECACHE && key !== RUNTIME) return caches.delete(key);
      }));
    }).then(function () { return self.clients.claim(); })
  );
});

function networkFirst(request, fallbackUrl) {
  return fetch(request).then(function (response) {
    if (response.ok) {
      var copy = response.clone();
      caches.open(RUNTIME).then(function (cache) { cache.put(request, copy); });
    }
    return response;
  }).catch(function () {
    return caches.match(request, { ignoreSearch: true })
      .then(function (cached) { return cached || (fallbackUrl && caches.match(fallbackUrl)); })
      .then(function (cached) { return cached || Response.error(); });
  });
}

function staleWhileRevalidate(event) {
  var request = event.request;
  return caches.open(RUNTIME).then(function (cache) {
    return cache.match(request).then(function (cached) {
      var update = fetch(request).then(function (response) {
        // Respostas opacas (status 0) das fontes também são guardadas
        if (response.ok || response.type === 'opaque') cache.put(request, response.clone());
        return response;
      });
      if (cached) {
        event.waitUntil(update.catch(function () {}));
        return cached;
      }
      return update;
    });
  });
}

self.addEventListener('fetch', function (event) {
  var request = event.request;
  if (request.method !== 'GET') return;

  var url = new URL(request.url);
  var sameOrigin = url.origin === self.location.origin;
  var isFont = url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com';

  if (request.mode === 'navigate') {
    event.respondWith(networkFirst(request, './'));
    return;
  }
  if (!sameOrigin && !isFont) return; // WhatsApp e outros domínios: sem intervenção

  if (isFont || request.destination === 'image') {
    event.respondWith(staleWhileRevalidate(event));
    return;
  }
  if (sameOrigin) event.respondWith(networkFirst(request));
});
