/* ============================================================
   Flussverläufe für die Gewässer-Karte
   Für Flüsse und Kanäle (deine Spots mit Typ fluss/kanal, LAV-Gewässer
   „Fluss“/„Kanal“) wird der Verlauf aus OpenStreetMap geholt
   (Overpass, waterway mit passendem Namen im Umkreis des Punkts) und
   als Linie gezeichnet. Ergebnis bleibt dauerhaft im Browser gespeichert –
   Flüsse wandern nicht. Geladen wird nur, was gerade auf der Karte liegt.
   ============================================================ */
import { lese, schreibe } from "./store.js";

const KEY = "neu_flusslauf_cache_v1";
const SERVER = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.private.coffee/api/interpreter",
  "https://maps.mail.ru/osm/tools/overpass/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter"
];
/* Namen, bei denen der Fluss nicht vorne steht */
const ALIAS = {
  "Hamburg Hafen (Norderelbe)": "Norderelbe",
  "Boizenburger Elbe": "Elbe"
};
let cache = lese(KEY, {}) || {};
/* Vorab geholte Verläufe aller mitgelieferten Gewässer (neu/daten/fluesse.json):
   sofort da, auch offline – live geladen wird nur für eigene neue Spots */
let vorab = {};
export const vorabGeladen = fetch(new URL("../daten/fluesse.json", import.meta.url))
  .then(r => r.ok ? r.json() : {}).then(d => { vorab = d || {}; }).catch(() => {});

export function istFluss(e){
  if(e.ebene === "spots") return e.roh.type === "fluss" || e.roh.type === "kanal";
  if(e.ebene === "lav") return /fluss|kanal/i.test(e.roh.typ || "");
  return false;
}
export function flussName(name){
  if(ALIAS[name]) return ALIAS[name];
  return String(name).replace(/\s*\(.*\)\s*$/, "").replace(/\s+bei\s+.*$/i, "").trim();
}
const schluessel = e => flussName(e.name) + "|" + e.lat.toFixed(2) + "|" + e.lng.toFixed(2);
const umkreis = e => (e.roh.type === "kanal" || /kanal/i.test(e.roh.typ || "")) ? 25000 : 15000;
export const UMKREIS_KM = 15;

/* Linien (Array von Punktlisten) oder null, solange nichts geladen ist */
export function linienVon(e){
  const k = schluessel(e);
  const c = (vorab[k] && vorab[k].l.length) ? vorab[k] : cache[k];
  return c && c.l && c.l.length ? c.l : null;
}

/* Punkte ausdünnen: nur behalten, was mehr als ~30 m vom letzten entfernt ist */
function duenne(geo){
  const out = [];
  geo.forEach((p, i) => {
    const q = [Math.round(p.lat * 1e5) / 1e5, Math.round(p.lon * 1e5) / 1e5];
    const l = out[out.length - 1];
    if(!l || i === geo.length - 1 || Math.hypot(q[0] - l[0], (q[1] - l[1]) * 0.6) > 0.0003) out.push(q);
  });
  return out;
}

async function overpass(query){
  let fehler;
  for(const url of SERVER){
    const ctrl = new AbortController(); const t = setTimeout(() => ctrl.abort(), 60000);   /* Overpass ist manchmal sehr langsam */
    try {
      const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: "data=" + encodeURIComponent(query), signal: ctrl.signal });
      clearTimeout(t);
      if(res.ok) return await res.json();
      fehler = new Error("HTTP " + res.status);
    } catch(err){ clearTimeout(t); fehler = err; }
  }
  throw fehler;
}

async function lade(e){
  const name = flussName(e.name);
  const muster = "^" + name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/[ -]/g, "[ -]") + "$";
  const q = `[out:json][timeout:25];way["waterway"~"^(river|canal|stream)$"]["name"~"${muster.replace(/"/g, '\\"')}",i](around:${umkreis(e)},${e.lat},${e.lng});out geom;`;
  const data = await overpass(q);
  const l = (data.elements || []).filter(w => w.geometry && w.geometry.length > 1).map(w => duenne(w.geometry));
  cache[schluessel(e)] = { t: Date.now(), l };
  schreibe(KEY, cache);
  return l.length > 0;
}

/* Warteschlange: nacheinander, damit Overpass nicht überlastet */
const warte = [], unterwegs = new Set();
let laeuft = false;
export function anfordern(eintraege, fertig){
  eintraege.forEach(e => {
    const k = schluessel(e);
    if(vorab[k]) return;
    const c = cache[k];
    /* leeres Ergebnis erst nach 30 Tagen erneut versuchen */
    if(c && (c.l.length || Date.now() - c.t < 30 * 864e5)) return;
    if(unterwegs.has(k)) return;
    unterwegs.add(k); warte.push(e);
  });
  if(laeuft || !warte.length) return;
  laeuft = true;
  (async () => {
    while(warte.length){
      const e = warte.shift();
      try { if(await lade(e)) fertig(); }
      catch(err){ /* offline oder Server ausgelastet: beim nächsten Verschieben erneut */ unterwegs.delete(schluessel(e)); }
      await new Promise(r => setTimeout(r, 800));
    }
    laeuft = false;
  })();
}
