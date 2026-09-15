// =====================================================================
//  Service Worker — Oasis Seguimiento
// =====================================================================
// REQUISITO CRÍTICO: La constante VERSION define el ciclo de vida de la caché.
// Cada vez que se modifique este archivo o los recursos estáticos, sube el número.
const VERSION = '1.0.2';
const CACHE_NAME = 'oasis-cache-v' + VERSION;

// Recursos base indispensables para funcionamiento inicial y offline
const RECURSOS_PRECACHE = [
  '/',
  '/index.html',
  '/manifest.json',
  '/manifest.webmanifest',
  '/logo.svg',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/apple-touch-icon.png',
];

// ---------------------------------------------------------------------
//  Instalación: precarga de recursos base
// ---------------------------------------------------------------------
self.addEventListener('install', (event) => {
  // Forzar activación inmediata del nuevo service worker
  self.skipWaiting();

  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(RECURSOS_PRECACHE).catch((err) => {
        console.warn('[SW] Aviso durante precaching inicial:', err);
      });
    }),
  );
});

// ---------------------------------------------------------------------
//  Activación: limpieza estricta de cachés antiguas
// ---------------------------------------------------------------------
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((llaves) => {
        return Promise.all(
          llaves
            .filter((llave) => llave.startsWith('oasis-cache-') && llave !== CACHE_NAME)
            .map((llave) => {
              console.log('[SW] Eliminando caché antigua:', llave);
              return caches.delete(llave);
            }),
        );
      })
      .then(() => {
        // Tomar control inmediato de todas las pestañas y clientes abiertos
        return self.clients.claim();
      }),
  );
});

// ---------------------------------------------------------------------
//  Fetch: Enrutamiento inteligente y soporte offline
// ---------------------------------------------------------------------
self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // Solo interceptar peticiones GET
  if (req.method !== 'GET') return;

  // EXCLUSIÓN OBLIGATORIA: Nunca interceptar llamadas a la API ni al Webhook
  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/webhook/')) {
    return;
  }

  // 1. Documento HTML (Petición de navegación): Network-First
  // Cuando el navegador pide la página en sí, intenta primero traerla de la red.
  // Guarda la respuesta nueva en la caché para seguir sirviendo sin internet y usa la copia guardada solo si la red falla.
  const esNavegacion =
    req.mode === 'navigate' ||
    req.destination === 'document' ||
    (req.headers.get('accept') && req.headers.get('accept').includes('text/html'));

  if (esNavegacion) {
    event.respondWith(
      fetch(req)
        .then((respuestaRed) => {
          if (respuestaRed && respuestaRed.status === 200) {
            const clon = respuestaRed.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(req, clon);
              cache.put('/index.html', respuestaRed.clone());
            });
          }
          return respuestaRed;
        })
        .catch(() => {
          // Si la red falla, usar la copia guardada en la caché
          return caches.match(req).then((res) => {
            return res || caches.match('/index.html') || caches.match('/');
          });
        }),
    );
    return;
  }

  // 2. Recursos estáticos (imágenes, scripts, estilos, fuentes): Stale-While-Revalidate
  // Sirve de inmediato si está en caché y actualiza en segundo plano si hay red
  event.respondWith(
    caches.match(req).then((respuestaCache) => {
      const peticionRed = fetch(req)
        .then((respuestaRed) => {
          if (respuestaRed && respuestaRed.status === 200 && respuestaRed.type === 'basic') {
            const clon = respuestaRed.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(req, clon));
          }
          return respuestaRed;
        })
        .catch(() => respuestaCache);

      return respuestaCache || peticionRed;
    }),
  );
});
