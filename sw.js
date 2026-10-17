// Bump CACHE when the app files change so phones pick up the new version.
const CACHE = 'farrq-v10';
const SHARE_CACHE = 'farrq-share';
const FILES = ['./', './index.html', './manifest.json', './icon-192.png', './icon-512.png', './jspdf.umd.min.js'];
self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k !== CACHE && k !== SHARE_CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  // A CSV shared from WhatsApp (Share > FARR Q Charge) arrives here as a POST.
  if (e.request.method === 'POST' && url.pathname.endsWith('/share-target')) {
    e.respondWith(receiveShare(e.request));
    return;
  }
  if (e.request.method !== 'GET') return;
  e.respondWith(caches.match(e.request).then(hit => hit || fetch(e.request)
    .then(res => { const copy = res.clone(); caches.open(CACHE).then(c => c.put(e.request, copy)); return res; })
    .catch(() => caches.match('./index.html'))));
});
async function receiveShare(request) {
  const app = self.registration.scope;
  try {
    const data = await request.formData();
    const file = data.get('file');
    if (!file || typeof file.text !== 'function') throw new Error('no file');
    const text = await file.text();
    const c = await caches.open(SHARE_CACHE);
    await c.put('backup', new Response(text, { headers: { 'Content-Type': 'text/csv' } }));
    return Response.redirect(app + '?shared=1', 303);
  } catch (err) {
    return Response.redirect(app + '?shared=0', 303);
  }
}
