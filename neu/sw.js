/* Rutenwand – Service Worker (Scope: ./neu/)
   Alles network-first: online immer der neueste Stand (kein ?v=-Hochzählen
   nötig), offline der zuletzt geladene. VERSION nur ändern, wenn der
   Cache bewusst geleert werden soll. */
const VERSION = "neu-24";
const CACHE = "rutenwand-" + VERSION;
const KERN = ["./", "./index.html", "./app.css", "./js/main.js", "./js/store.js", "./js/setups.js", "./js/edit.js", "./js/berater-ui.js", "./js/protokoll.js", "./js/wissen.js", "./js/angelarten.js", "./js/schaubild.js", "./js/heute.js", "./js/lage.js", "./js/tasche.js", "./js/karte.js", "./js/flusslauf.js", "./js/pegel.js", "./js/erfahrung.js", "./js/scheine.js", "./js/einkauf.js", "./js/knoten.js", "./js/kueste.js", "./js/kleinteile.js", "./js/offline.js", "./js/saison.js", "./js/fangmeldung.js", "./js/geraetepflege.js", "./js/startzeit.js", "./daten/fluesse.json", "./js/fangbuch.js", "./js/tagebuch.js", "./manifest.json", "../data.js", "../ausruestung.js", "../berater.js",
  "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css", "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"];

/* Fremde Bibliotheken ohne CORS (Firebase, Schriften): als „opaque“ zwischenspeichern,
   damit die App auch ohne Netz startet */
const FREMD = ["https://www.gstatic.com/firebasejs/10.13.2/firebase-app-compat.js", "https://www.gstatic.com/firebasejs/10.13.2/firebase-auth-compat.js", "https://www.gstatic.com/firebasejs/10.13.2/firebase-firestore-compat.js"];
const FREMD_HOSTS = /^(www\.gstatic\.com|unpkg\.com|fonts\.googleapis\.com|fonts\.gstatic\.com)$/;
/* Kartenkacheln: eigener Cache, bleibt bei neuen Versionen erhalten */
const KACHELN = "rutenwand-kacheln", KACHELN_MAX = 2500;

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => Promise.allSettled([
    ...KERN.map(u => c.add(new Request(u, { cache: "no-cache" }))),
    ...FREMD.map(u => fetch(u, { mode: "no-cors" }).then(r => c.put(u, r)))
  ])).then(() => self.skipWaiting()));
});
async function kachel(req){
  const c = await caches.open(KACHELN);
  const hit = await c.match(req.url);
  if(hit) return hit;
  try {
    const res = await fetch(req);
    if(res && (res.ok || res.type === "opaque")){
      c.put(req.url, res.clone());
      /* gelegentlich aufräumen: älteste zuerst raus */
      if(Math.random() < 0.02) c.keys().then(k => { if(k.length > KACHELN_MAX) k.slice(0, k.length - KACHELN_MAX).forEach(x => c.delete(x)); });
    }
    return res;
  } catch(err){ return Response.error(); }
}
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k.startsWith("rutenwand-") && k !== CACHE && k !== KACHELN).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", e => {
  const req = e.request;
  if(req.method !== "GET") return;
  let url; try { url = new URL(req.url); } catch(err){ return; }
  /* Firebase/Firestore nie anfassen – die haben eigene Offline-Logik */
  if(/googleapis\.com$|firebaseio\.com$/.test(url.hostname) && !/fonts\./.test(url.hostname)) return;
  if(/(^|\.)tile\.openstreetmap\.org$/.test(url.hostname)){ e.respondWith(kachel(req)); return; }
  const eigen = url.origin === self.location.origin;
  const fremd = FREMD_HOSTS.test(url.hostname);
  e.respondWith(
    (req.mode === "navigate"
      ? fetch(req.url, { cache: "no-cache", credentials: "same-origin" })   /* Navigations-Requests lassen sich nicht umbauen */
      : fetch(eigen ? new Request(req, { cache: "no-cache" }) : req)
    ).then(res => {
      if(res && ((res.status === 200 && (eigen || res.type === "cors")) || (fremd && res.type === "opaque"))){
        const kopie = res.clone();
        caches.open(CACHE).then(c => c.put(req.mode === "navigate" ? "./index.html" : req, kopie));
      }
      return res;
    }).catch(() => caches.match(req.mode === "navigate" ? "./index.html" : (fremd ? req.url : req), { ignoreSearch: req.mode === "navigate" }).then(r => r || Response.error()))
  );
});
