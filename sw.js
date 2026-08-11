/* Angel-Setup-Berater – Service Worker (PWA Offline)
   VERSION bei jedem Release zusammen mit version.txt hochzaehlen.
   Unkritisch, falls es mal vergessen wird: Navigationen laufen network-first
   und Assets tragen ihre Version in der ?v=-Query, ein alter Cache-Name
   haelt also nichts mehr fest – er wird nur nicht aufgeraeumt. */
const VERSION = "20260722-39";
const CACHE = "angel-" + VERSION;

/* Nur was ohne Versions-Query angefragt wird. style.css/app.js/data.js
   bewusst NICHT: die kommen immer mit ?v= und landen ueber den
   Asset-Zweig unten im Cache. */
const ASSETS = [
  "./index.html",
  "./manifest.json",
  "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css",
  "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"
];

self.addEventListener("install", e => {
  e.waitUntil(
    caches.open(CACHE)
      // einzeln statt addAll: ein nicht erreichbares CDN darf die
      // Installation nicht komplett scheitern lassen
      .then(c => Promise.allSettled(ASSETS.map(u => c.add(u))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

function istNavigation(req){
  if(req.mode === "navigate") return true;
  const accept = req.headers.get("accept") || "";
  return accept.includes("text/html");
}

self.addEventListener("fetch", e => {
  const req = e.request;
  if(req.method !== "GET") return;

  let url;
  try { url = new URL(req.url); } catch(err){ return; }

  /* version.txt niemals aus dem Cache beantworten – sonst kann der
     Update-Check per Definition nie ein Update entdecken. */
  if(url.pathname.endsWith("version.txt")){
    e.respondWith(fetch(req).catch(() => new Response("", { status: 504 })));
    return;
  }

  /* HTML immer zuerst aus dem Netz. Cache-first war hier der Fehler:
     die gecachte index.html verweist auf ihre alten ?v=-Staende und
     haelt die App damit dauerhaft auf dem Stand von damals fest.
     Der Cache bleibt reiner Offline-Fallback. */
  if(istNavigation(req)){
    e.respondWith(
      fetch(req).then(res => {
        if(res && res.status === 200){
          const clone = res.clone();
          caches.open(CACHE).then(c => c.put("./index.html", clone));
        }
        return res;
      }).catch(() => caches.match("./index.html").then(r => r || Response.error()))
    );
    return;
  }

  /* Statische Assets: Cache zuerst. Unbedenklich, weil jede Version
     ueber ?v= eine eigene URL hat. */
  e.respondWith(
    caches.match(req).then(cached => {
      if(cached) return cached;
      return fetch(req).then(res => {
        if(res && res.status === 200 && res.type !== "opaque"){
          const clone = res.clone();
          caches.open(CACHE).then(c => c.put(req, clone));
        }
        return res;
      }).catch(() => cached);
    })
  );
});
