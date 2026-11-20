/* Rutenwand – Service Worker (Scope: ./neu/)
   Alles network-first: online immer der neueste Stand (kein ?v=-Hochzählen
   nötig), offline der zuletzt geladene. VERSION nur ändern, wenn der
   Cache bewusst geleert werden soll. */
const VERSION = "neu-16";
const CACHE = "rutenwand-" + VERSION;
const KERN = ["./", "./index.html", "./app.css", "./js/main.js", "./js/store.js", "./js/setups.js", "./js/edit.js", "./js/berater-ui.js", "./js/protokoll.js", "./js/wissen.js", "./js/angelarten.js", "./js/schaubild.js", "./js/heute.js", "./js/lage.js", "./js/tasche.js", "./js/karte.js", "./js/flusslauf.js", "./js/pegel.js", "./js/erfahrung.js", "./js/scheine.js", "./js/einkauf.js", "./daten/fluesse.json", "./js/fangbuch.js", "./js/tagebuch.js", "./manifest.json", "../data.js", "../ausruestung.js", "../berater.js",
  "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css", "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => Promise.allSettled(KERN.map(u => c.add(new Request(u, { cache: "no-cache" }))))).then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k.startsWith("rutenwand-") && k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", e => {
  const req = e.request;
  if(req.method !== "GET") return;
  let url; try { url = new URL(req.url); } catch(err){ return; }
  /* Firebase/Firestore nie anfassen – die haben eigene Offline-Logik */
  if(/googleapis\.com$|firebaseio\.com$/.test(url.hostname) && !/fonts\./.test(url.hostname)) return;
  const eigen = url.origin === self.location.origin;
  e.respondWith(
    (req.mode === "navigate"
      ? fetch(req.url, { cache: "no-cache", credentials: "same-origin" })   /* Navigations-Requests lassen sich nicht umbauen */
      : fetch(eigen ? new Request(req, { cache: "no-cache" }) : req)
    ).then(res => {
      if(res && res.status === 200 && (eigen || res.type === "cors")){
        const kopie = res.clone();
        caches.open(CACHE).then(c => c.put(req.mode === "navigate" ? "./index.html" : req, kopie));
      }
      return res;
    }).catch(() => caches.match(req.mode === "navigate" ? "./index.html" : req, { ignoreSearch: req.mode === "navigate" }).then(r => r || Response.error()))
  );
});
