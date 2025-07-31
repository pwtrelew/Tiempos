
// Define un nombre para la caché actual.
// Cambia este valor cada vez que actualices los archivos de la app para forzar la actualización de la caché.
const CACHE_NAME = 'reunion-vmc-cache-v1';

// Lista de archivos que se almacenarán en la caché para que la app funcione sin conexión.
const urlsToCache = [
  '/', // La raíz del sitio
  'index.html' // El archivo HTML principal
  // No añadimos los scripts de CDN (tailwindcss, html2canvas) aquí,
  // ya que el service worker los cacheará automáticamente la primera vez que se soliciten.
];

// Evento 'install': Se dispara cuando el Service Worker se instala por primera vez.
self.addEventListener('install', event => {
  console.log('Service Worker: Instalando...');
  // Espera hasta que la promesa se resuelva.
  event.waitUntil(
    // Abre la caché con el nombre que definimos.
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Service Worker: Caché abierta.');
        // Añade todos los archivos de nuestra lista a la caché.
        return cache.addAll(urlsToCache);
      })
      .then(() => {
        console.log('Service Worker: Archivos cacheados exitosamente.');
        // Forza al nuevo Service Worker a activarse inmediatamente.
        return self.skipWaiting();
      })
  );
});

// Evento 'activate': Se dispara cuando el Service Worker se activa.
// Se usa para limpiar cachés antiguas.
self.addEventListener('activate', event => {
  console.log('Service Worker: Activando...');
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cache => {
          // Si el nombre de una caché no coincide con la actual, la eliminamos.
          if (cache !== CACHE_NAME) {
            console.log('Service Worker: Limpiando caché antigua:', cache);
            return caches.delete(cache);
          }
        })
      );
    }).then(() => {
        // Le dice al Service Worker que tome el control de la página inmediatamente.
        return self.clients.claim();
    })
  );
});

// Evento 'fetch': Se dispara cada vez que la página realiza una solicitud de red (ej. un archivo, una imagen).
self.addEventListener('fetch', event => {
  // Responde a la solicitud.
  event.respondWith(
    // Primero, busca el recurso en la caché.
    caches.match(event.request)
      .then(response => {
        // Si el recurso está en la caché, lo devuelve desde ahí.
        if (response) {
          // console.log('Service Worker: Sirviendo desde caché:', event.request.url);
          return response;
        }

        // Si no está en la caché, lo busca en la red.
        // console.log('Service Worker: Solicitando a la red:', event.request.url);
        return fetch(event.request).then(
          networkResponse => {
            // Si la solicitud a la red falla, no hacemos nada más.
            if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
              return networkResponse;
            }

            // Clonamos la respuesta de la red porque solo se puede leer una vez.
            const responseToCache = networkResponse.clone();

            caches.open(CACHE_NAME)
              .then(cache => {
                // Guardamos la respuesta de la red en la caché para futuras solicitudes.
                cache.put(event.request, responseToCache);
              });

            return networkResponse;
          }
        );
      })
      .catch(error => {
        // Si tanto la caché como la red fallan (ej. sin conexión y sin caché),
        // podrías mostrar una página de "sin conexión" personalizada.
        console.error('Service Worker: Error en fetch', error);
        // Opcional: return caches.match('offline.html');
      })
  );
});
