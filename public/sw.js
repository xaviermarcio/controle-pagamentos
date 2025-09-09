const CACHE_NAME = "controle-pagamentos-v1";
const urlsToCache = [
  "/",
  "/index.html",
  "/dashboard.html",
  "/parcelas.html",
  "/register.html",
  "/reset.html",
  "/contato.html",
  "/404.html",
  "/teste.html",
  "/images/icon-192.png",
  "/images/icon-512.png"
];

// Instalação
self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(urlsToCache))
  );
});

// Ativação
self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key)))
    )
  );
});

// Intercepta requisições
self.addEventListener("fetch", event => {
  event.respondWith(
    caches.match(event.request).then(resp => resp || fetch(event.request))
  );
});
