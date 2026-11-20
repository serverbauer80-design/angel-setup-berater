/* ============================================================
   Offline am Wasser
   - „Für unterwegs speichern“: Wetter, Gezeiten, Küstendaten und die
     Karte rund um den Ort vorab laden, solange Netz da ist.
   - Kartenausschnitt offline speichern (Gewässer-Karte).
   - Offline-Hinweis: zeigt, von wann die angezeigten Daten sind.
   Kacheln liegen im Cache „rutenwand-kacheln“ (der Service Worker
   liefert sie von dort, wenn kein Netz da ist). Nach den Regeln von
   OpenStreetMap nur kleine, selbst angestoßene Ausschnitte bis Zoom 16.
   ============================================================ */
import { lese, schreibe } from "./store.js";
import { ladeWetter, ladeGezeiten, tagISO } from "./lage.js";
import { ladeKueste } from "./kueste.js";

const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[c]));
const KACHEL_CACHE = "rutenwand-kacheln";
const KACHEL_URL = (z, x, y) => `https://tile.openstreetmap.org/${z}/${x}/${y}.png`;
const UNTERWEGS_KEY = "neu_unterwegs_v1";
const uhr = t => new Date(t).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" });
const tagUhr = t => new Date(t).toLocaleString("de-DE", { weekday: "short", hour: "2-digit", minute: "2-digit" });

export const istOffline = () => typeof navigator !== "undefined" && navigator.onLine === false;

/* ---------- Kacheln ---------- */
const lon2x = (lng, z) => Math.floor((lng + 180) / 360 * 2 ** z);
const lat2y = (lat, z) => { const r = lat * Math.PI / 180; return Math.floor((1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2 * 2 ** z); };
function kachelListe(s, w, n, e, zooms, max){
  const out = [];
  for(const z of zooms){
    const x1 = lon2x(w, z), x2 = lon2x(e, z), y1 = lat2y(n, z), y2 = lat2y(s, z);
    for(let x = x1; x <= x2; x++) for(let y = y1; y <= y2; y++){ out.push([z, x, y]); if(out.length >= max) return out; }
  }
  return out;
}
async function kachelnHolen(liste, fortschritt){
  if(!("caches" in window)) throw new Error("Dieser Browser kann keine Karten speichern");
  const c = await caches.open(KACHEL_CACHE);
  let ok = 0, i = 0;
  const arbeite = async () => {
    while(i < liste.length){
      const [z, x, y] = liste[i++];
      const url = KACHEL_URL(z, x, y);
      try {
        if(await c.match(url)){ ok++; continue; }
        const r = await fetch(url, { mode: "cors" });
        if(r.ok){ await c.put(url, r); ok++; }
      } catch(err){}
      fortschritt && fortschritt(ok, liste.length);
    }
  };
  await Promise.all([arbeite(), arbeite(), arbeite()]);   /* höchstens 3 gleichzeitig – schont die Server */
  return ok;
}
/* Umkreis um einen Punkt (km) – Zoom 11 bis 15 */
export function kachelnUm(lat, lng, km = 1.5, fortschritt){
  const dLat = km / 111.32, dLng = km / (111.32 * Math.cos(lat * Math.PI / 180));
  return kachelnHolen(kachelListe(lat - dLat, lng - dLng, lat + dLat, lng + dLng, [11, 12, 13, 14, 15], 160), fortschritt);
}
/* Sichtbarer Kartenausschnitt: aktueller Zoom und zwei Stufen tiefer, höchstens Zoom 16 */
export function kachelnAusschnitt(bounds, zoom, fortschritt){
  const zs = [zoom, zoom + 1, zoom + 2].filter(z => z <= 16);
  const liste = kachelListe(bounds.getSouth(), bounds.getWest(), bounds.getNorth(), bounds.getEast(), zs, 250);
  return kachelnHolen(liste, fortschritt).then(n => ({ n, gesamt: liste.length, begrenzt: liste.length >= 250 }));
}

/* ---------- Für unterwegs ---------- */
export function unterwegsStand(ort){ return (lese(UNTERWEGS_KEY, {}) || {})[ort.id] || null; }
export async function unterwegsVorbereiten(ort, fortschritt){
  const teile = [];
  fortschritt && fortschritt("Wetter …");
  await ladeWetter(ort).then(() => teile.push("Wetter (3 Tage)")).catch(() => {});
  if(ort.tides){
    fortschritt && fortschritt("Gezeiten …");
    let n = 0;
    for(let d = 0; d < 3; d++){ try { await ladeGezeiten(ort, tagISO(d)); n++; } catch(e){} }
    if(n) teile.push("Gezeiten");
  }
  if(ort.kueste){
    fortschritt && fortschritt("Welle & Wasser …");
    await ladeKueste(ort).then(() => teile.push("Welle & Wassertemperatur")).catch(() => {});
  }
  fortschritt && fortschritt("Karte …");
  const k = await kachelnUm(ort.lat, ort.lng, 1.5, (a, b) => fortschritt && fortschritt(`Karte ${a}/${b} …`)).catch(() => 0);
  if(k) teile.push(`Karte (${k} Kacheln)`);
  const m = lese(UNTERWEGS_KEY, {}) || {};
  m[ort.id] = { t: Date.now(), teile };
  const keys = Object.keys(m); if(keys.length > 15) delete m[keys[0]];
  schreibe(UNTERWEGS_KEY, m);
  return teile;
}

/* ---------- Anzeige in „Heute“ ---------- */
export function unterwegsHTML(ort){
  const s = unterwegsStand(ort);
  if(istOffline()){
    const w = (lese("neu_wetter_cache_v1", {}) || {})[ort.id];
    return `<div class="h-offline"><b>Ohne Netz</b><span>${w ? `Wetter von ${esc(tagUhr(w.t))} Uhr.` : "Für diesen Ort ist kein Wetter gespeichert."} Fänge werden gespeichert und abgeglichen, sobald wieder Netz da ist.</span></div>`;
  }
  return `<div class="h-unterwegs"><button type="button" class="knopf klein leise" data-unterwegs>${s ? "Für unterwegs aktualisieren" : "Für unterwegs speichern"}</button>
    <span class="hinweis-klein" id="h-unterwegs-status">${s ? `Gespeichert ${esc(tagUhr(s.t))} Uhr: ${esc(s.teile.join(", "))}` : "Wetter, Gezeiten und Karte vorab laden – falls am Wasser kein Netz ist."}</span></div>`;
}
