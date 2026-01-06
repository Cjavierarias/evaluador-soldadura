/**
 * Service Worker para Evaluador de Soldadura
 * Proporciona funcionalidad offline y mejora el rendimiento
 */

const CACHE_NAME = 'soldadura-eval-v1';
const ASSETS_TO_CACHE = [
    '/',
    '/index.html',
    '/styles.css',
    '/app.js',
    '/manifest.json',
    '/icon-192.png',
    '/icon-512.png'
];

// Evento de instalación del Service Worker
self.addEventListener('install', (event) => {
    console.log('[Service Worker] Instalando...');
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('[Service Worker] Cacheando recursos');
                return cache.addAll(ASSETS_TO_CACHE);
            })
            .then(() => {
                console.log('[Service Worker] Instalación completada');
                return self.skipWaiting();
            })
            .catch((error) => {
                console.error('[Service Worker] Error en instalación:', error);
            })
    );
});

// Evento de activación del Service Worker
self.addEventListener('activate', (event) => {
    console.log('[Service Worker] Activando...');
    event.waitUntil(
        caches.keys()
            .then((cacheNames) => {
                return Promise.all(
                    cacheNames.map((cacheName) => {
                        if (cacheName !== CACHE_NAME) {
                            console.log(`[Service Worker] Eliminando cache antiguo: ${cacheName}`);
                            return caches.delete(cacheName);
                        }
                    })
                );
            })
            .then(() => {
                console.log('[Service Worker] Activación completada');
                return self.clients.claim();
            })
    );
});

// Evento de interceptación de solicitudes
self.addEventListener('fetch', (event) => {
    // Ignorar solicitudes de Google Forms (no deben ser cacheadas)
    if (event.request.url.includes('google.com') || 
        event.request.url.includes('googleforms.com')) {
        return;
    }
    
    // Para solicitudes locales, intentar cache primero
    event.respondWith(
        caches.match(event.request)
            .then((cachedResponse) => {
                // Si hay respuesta en cache, devolverla
                if (cachedResponse) {
                    return cachedResponse;
                }
                
                // Si no hay cache, hacer la solicitud original
                return fetch(event.request)
                    .then((response) => {
                        // Verificar si es una respuesta válida
                        if (!response || response.status !== 200 || response.type !== 'basic') {
                            return response;
                        }
                        
                        // Clonar la respuesta para cachearla
                        const responseToCache = response.clone();
                        
                        // Agregar al cache
                        caches.open(CACHE_NAME)
                            .then((cache) => {
                                cache.put(event.request, responseToCache);
                            });
                        
                        return response;
                    })
                    .catch((error) => {
                        console.error('[Service Worker] Error en fetch:', error);
                        // Aquí se podría devolver una página offline
                        throw error;
                    });
            })
    );
});

// Manejar mensajes desde la aplicación principal
self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
});
