// =====================================================================
//  Service Worker — Oasis Seguimiento
// =====================================================================
// REQUISITO CRÍTICO: La constante VERSION define el ciclo de vida de la caché.
// Cada vez que se modifique este archivo o los recursos estáticos, sube el número.
const VERSION = '1.0.3';
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

  // 1. Documento HTML (Petición de navegación): Network-First con Timeout Seguro (2.8s)
  // Intenta siempre obtener la versión más reciente de la red para reflejar cambios de inmediato.
  // Si la red móvil tarda más de 2.8s, falla o da error de servidor (5xx), acude a la copia en caché (ignoreSearch: true).
  const esNavegacion =
    req.mode === 'navigate' ||
    req.destination === 'document' ||
    (req.headers.get('accept') && req.headers.get('accept').includes('text/html'));

  if (esNavegacion) {
    event.respondWith(
      new Promise((resolve) => {
        let resuelto = false;

        function responderCache() {
          if (resuelto) return;
          resuelto = true;
          caches.match(req, { ignoreSearch: true }).then((res) => {
            if (res) return resolve(res);
            caches.match('/index.html', { ignoreSearch: true }).then((fallback) => {
              resolve(fallback || caches.match('/'));
            });
          });
        }

        // Timeout seguro de 2.8 segundos para redes móviles lentas o inestables
        const temporizador = setTimeout(() => {
          responderCache();
        }, 2800);

        fetch(req)
          .then((respuestaRed) => {
            clearTimeout(temporizador);
            if (respuestaRed && respuestaRed.status === 200) {
              const clon = respuestaRed.clone();
              caches.open(CACHE_NAME).then((cache) => {
                cache.put(req, clon);
                cache.put('/index.html', respuestaRed.clone());
              });
              if (!resuelto) {
                resuelto = true;
                resolve(respuestaRed);
              }
            } else if (respuestaRed && respuestaRed.status >= 500) {
              // Si el servidor da error 5xx en navegación, rescatar con la caché
              responderCache();
            } else {
              if (!resuelto) {
                resuelto = true;
                resolve(respuestaRed);
              }
            }
          })
          .catch(() => {
            clearTimeout(temporizador);
            responderCache();
          });
      }),
    );
    return;
  }

  // 2. Recursos estáticos (imágenes, scripts, estilos, fuentes): Stale-While-Revalidate
  // Sirve de inmediato si está en caché y actualiza en segundo plano si hay red
  event.respondWith(
    caches.match(req, { ignoreSearch: true }).then((respuestaCache) => {
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
