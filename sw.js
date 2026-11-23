const C = 'zchat-v2';
const ASSETS = ['./', './index.html', './manifest.json', './icon-192.png', './icon-512.png'];
self.addEventListener('install', e => { e.waitUntil(caches.open(C).then(c => c.addAll(ASSETS))); self.skipWaiting(); });
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== C).map(k => caches.delete(k)))));
  self.clients.claim();
});
// Buka instan dari cache, lalu perbarui di latar belakang. Permintaan ke Supabase tidak disentuh.
self.addEventListener('fetch', e => {
  const r = e.request, u = new URL(r.url);
  if (r.method !== 'GET') return;
  if (u.hostname === 'cdn.jsdelivr.net') {
    e.respondWith(caches.match(r).then(m => m || fetch(r).then(res => { const cp = res.clone(); caches.open(C).then(c => c.put(r, cp)); return res; })));
    return;
  }
  if (u.origin !== location.origin) return;
  e.respondWith(caches.open(C).then(async c => {
    const m = (await c.match(r, { ignoreSearch: true })) || (r.mode === 'navigate' ? await c.match('./index.html') : null);
    const net = fetch(r).then(async res => {
      if (res && res.ok) {
        const changed = m && res.headers.get('etag') && res.headers.get('etag') !== m.headers.get('etag');
        await c.put(r, res.clone());
        if (changed && r.mode === 'navigate') (await self.clients.matchAll()).forEach(cl => cl.postMessage('zchat-update'));
      }
      return res;
    }).catch(() => null);
    if (m) { e.waitUntil(net); return m; }
    return (await net) || new Response('Tidak ada koneksi', { status: 503 });
  }));
});
