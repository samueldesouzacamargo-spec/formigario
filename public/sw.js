// rede primeiro, cache como reserva: atualiza sozinho e abre offline
const CACHE = 'formigario-v2';
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET' || !req.url.startsWith('http')) return;
  if (req.url.includes('generativelanguage.googleapis.com')) return; // nunca cachear o cérebro
  e.respondWith(
    fetch(req)
      .then((res) => { if (res.ok) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); } return res; })
      .catch(() => caches.match(req).then((r) => r || caches.match(new URL('./', self.registration.scope).href)))
  );
});
