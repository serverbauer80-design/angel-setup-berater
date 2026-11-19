/* ============================================================
   Lage am Wasser (Etappe 4)
   Ort, Wetter (Open-Meteo), Gezeiten (worldtides.info), Sonne, Mond,
   Schonzeit (RECHT_SH aus data.js) und die Frage: Welcher Fisch passt?
   Die Bewertung ist Erfahrungswissen mit Begründung – keine Garantie.
   ============================================================ */
import { lese, schreibe } from "./store.js";

/* Orte – dieselben wie in der bisherigen App, dazu deine besuchten Spots */
export const ORTE = [
  { id:"nok",        name:"Nord-Ostsee-Kanal (Rendsburg)", lat:54.30, lng:9.67, gw:"nok",     tides:false, ohne:["hering"] },
  { id:"eider_rd",   name:"Eider (Rendsburg/Fockbek)",     lat:54.30, lng:9.62, gw:"eider",   tides:false, ohne:["wolfsbarsch", "flunder"] },
  { id:"eider",      name:"Eider-Mündung (Tönning)",       lat:54.31, lng:8.90, gw:"eider",   tides:true },
  { id:"elbe",       name:"Elbe (Brunsbüttel)",            lat:53.89, lng:9.14, gw:"elbe",    tides:true },
  { id:"ostsee_sh",  name:"Ostsee SH (Kiel/Eckernförde)",  lat:54.47, lng:10.18, gw:"ostsee", tides:false, kueste:true },
  { id:"nordsee_sh", name:"Nordsee SH (St. Peter-Ording)", lat:54.30, lng:8.63, gw:"nordsee", tides:true, kueste:true },
  { id:"hvidesande", name:"Hvide Sande (Dänemark)",        lat:56.0011, lng:8.1281, gw:"nordsee", tides:true, kueste:true },
  { id:"blaavand",   name:"Blåvand (Dänemark)",            lat:55.56, lng:8.12, gw:"nordsee", tides:true, kueste:true },
  { id:"soendervig", name:"Søndervig (Dänemark)",          lat:56.09, lng:8.15, gw:"nordsee", tides:true, kueste:true }
];
const SPOT_GW = { see:"see", teich:"see", fluss:null, kanal:"nok", kueste:"ostsee", forellensee:"forellensee" };

export function orteListe(){
  const d = lese("meine_faenge_v1", null);
  const spots = d && Array.isArray(d.spots) ? d.spots : [];
  const catches = d && Array.isArray(d.catches) ? d.catches : [];
  const eigene = spots
    .filter(s => typeof s.lat === "number" && typeof s.lng === "number")
    .filter(s => s.visited || s.rating > 0 || catches.some(c => c.spotId === s.id))
    .map(s => ({ id: "spot_" + s.id, name: s.name, lat: s.lat, lng: s.lng, gw: SPOT_GW[s.type] ?? null, tides: false, eigen: true, kueste: s.type === "kueste" }));
  return ORTE.concat(eigene);
}

/* ---------- Datum ---------- */
export function tagISO(offset){
  const d = new Date(); d.setDate(d.getDate() + offset);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
}
export function jahreszeit(m){
  if([12, 1, 2].includes(m)) return "Winter";
  if([3, 4, 5].includes(m)) return "Frühling";
  if([6, 7, 8].includes(m)) return "Sommer";
  return "Herbst";
}

/* ---------- Mond ---------- */
export function mondphase(iso){
  const d = new Date(iso + "T12:00:00");
  const tage = (d - new Date("2000-01-06T18:14:00Z")) / 86400000;
  const p = ((tage % 29.53058867) + 29.53058867) % 29.53058867 / 29.53058867;
  if(p < 0.03 || p > 0.97) return { name: "Neumond", p };
  if(p < 0.22) return { name: "zunehmende Sichel", p };
  if(p < 0.28) return { name: "erstes Viertel", p };
  if(p < 0.47) return { name: "zunehmender Mond", p };
  if(p < 0.53) return { name: "Vollmond", p };
  if(p < 0.72) return { name: "abnehmender Mond", p };
  if(p < 0.78) return { name: "letztes Viertel", p };
  return { name: "abnehmende Sichel", p };
}

/* ---------- Wetter (Open-Meteo, kein Schlüssel nötig) ----------
   Ergebnis wird je Ort im Browser zwischengespeichert, damit am Wasser
   ohne Netz der letzte Stand sichtbar bleibt. */
const WETTER_KEY = "neu_wetter_cache_v1";
export async function ladeWetter(ort){
  const cache = lese(WETTER_KEY, {}) || {};
  const alt = cache[ort.id];
  if(alt && Date.now() - alt.t < 20 * 60 * 1000) return { ...alt.data, _stand: alt.t, _cache: false };
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${ort.lat}&longitude=${ort.lng}` +
    `&current=temperature_2m,wind_speed_10m,wind_gusts_10m,wind_direction_10m,cloud_cover,surface_pressure,precipitation` +
    `&hourly=temperature_2m,surface_pressure,wind_speed_10m,wind_gusts_10m,wind_direction_10m,cloud_cover,precipitation_probability` +
    `&daily=sunrise,sunset,temperature_2m_max,temperature_2m_min,wind_gusts_10m_max,precipitation_probability_max` +
    `&past_hours=6&forecast_days=3&timezone=Europe%2FBerlin`;
  try {
    const res = await fetch(url);
    if(!res.ok) throw new Error("HTTP " + res.status);
    const data = await res.json();
    cache[ort.id] = { t: Date.now(), data };
    schreibe(WETTER_KEY, cache);
    return { ...data, _stand: Date.now(), _cache: false };
  } catch(err){
    if(alt) return { ...alt.data, _stand: alt.t, _cache: true };
    throw err;
  }
}

const RICHTUNG = ["N", "NO", "O", "SO", "S", "SW", "W", "NW"];
export const windRichtung = g => RICHTUNG[Math.round(g / 45) % 8];

/* Werte für einen Tag: heute = aktuelle Werte, sonst Mittag; Trend über 6 Stunden */
export function tagesLage(w, offset){
  const iso = tagISO(offset);
  const h = w.hourly, dIdx = w.daily.time.indexOf(iso);
  let idx, aktuell;
  if(offset === 0 && w.current){
    idx = h.time.indexOf(w.current.time.slice(0, 13) + ":00");
    aktuell = { temp: w.current.temperature_2m, wind: w.current.wind_speed_10m, boen: w.current.wind_gusts_10m,
      richtung: w.current.wind_direction_10m, wolken: w.current.cloud_cover, druck: w.current.surface_pressure };
  } else {
    idx = h.time.indexOf(iso + "T12:00");
    aktuell = idx >= 0 ? { temp: h.temperature_2m[idx], wind: h.wind_speed_10m[idx], boen: h.wind_gusts_10m[idx],
      richtung: h.wind_direction_10m[idx], wolken: h.cloud_cover[idx], druck: h.surface_pressure[idx] } : null;
  }
  if(!aktuell) return null;
  const vorher = idx >= 6 ? h.surface_pressure[idx - 6] : null;
  const delta = vorher !== null && aktuell.druck ? aktuell.druck - vorher : 0;
  const trend = delta < -1.5 ? "fallend" : delta < -0.5 ? "leicht fallend" : delta > 1.5 ? "steigend" : delta > 0.5 ? "leicht steigend" : "stabil";
  const stunden = [];
  h.time.forEach((t, i) => { if(t.startsWith(iso) && +t.slice(11, 13) % 3 === 0 && +t.slice(11, 13) >= 3) stunden.push({
    zeit: t.slice(11, 13), temp: h.temperature_2m[i], wind: h.wind_speed_10m[i], regen: h.precipitation_probability[i], wolken: h.cloud_cover[i] }); });
  return {
    iso, ...aktuell, delta, trend,
    regenMax: dIdx >= 0 ? w.daily.precipitation_probability_max[dIdx] : null,
    tmin: dIdx >= 0 ? w.daily.temperature_2m_min[dIdx] : null, tmax: dIdx >= 0 ? w.daily.temperature_2m_max[dIdx] : null,
    boenMax: dIdx >= 0 ? w.daily.wind_gusts_10m_max[dIdx] : aktuell.boen,
    aufgang: dIdx >= 0 ? w.daily.sunrise[dIdx].slice(11, 16) : null,
    untergang: dIdx >= 0 ? w.daily.sunset[dIdx].slice(11, 16) : null,
    stunden, stand: w._stand, ausCache: w._cache
  };
}

/* ---------- Gezeiten ----------
   Der worldtides-Schlüssel der bisherigen App hat keine Guthaben mehr.
   Ersatz: Open-Meteo Marine (kostenlos, ohne Schlüssel) liefert den
   stündlichen Wasserstand. Hoch- und Niedrigwasser werden daraus
   berechnet (Parabel durch die Nachbarstunden) – Genauigkeit etwa
   ±30 Minuten. Für exakte Zeiten gilt der amtliche Gezeitenkalender (BSH). */
const GEZ_KEY = "neu_gezeiten_cache_v3";
export async function ladeGezeiten(ort, iso){
  const cache = lese(GEZ_KEY, {}) || {};
  const k = ort.id + "_" + iso;
  if(cache[k]) return cache[k];
  /* Vor- und Folgetag mitladen, sonst fehlen Extreme kurz nach/vor Mitternacht */
  const res = await fetch(`https://marine-api.open-meteo.com/v1/marine?latitude=${ort.lat}&longitude=${ort.lng}&hourly=sea_level_height_msl&timezone=Europe%2FBerlin&start_date=${tagVersatz(iso, -1)}&end_date=${tagVersatz(iso, 1)}`);
  if(!res.ok) throw new Error("HTTP " + res.status);
  const data = await res.json();
  const v = data.hourly && data.hourly.sea_level_height_msl;
  if(!v || v.filter(x => x !== null).length < 36) throw new Error("keine Wasserstandsdaten für diesen Ort");
  const liste = extreme(v).filter(e => e.t >= 24 && e.t < 48).map(e => ({ ...e, t: e.t - 24 })).map(zeitText);
  const keys = Object.keys(cache); if(keys.length > 30) delete cache[keys[0]];
  cache[k] = liste; schreibe(GEZ_KEY, cache);
  return liste;
}
function tagVersatz(iso, d){ const x = new Date(iso + "T12:00:00"); x.setDate(x.getDate() + d); return x.toISOString().slice(0, 10); }
function extreme(v){
  const roh = [];
  for(let i = 1; i < v.length - 1; i++){
    const a = v[i - 1], b = v[i], c = v[i + 1];
    if(a === null || b === null || c === null) continue;
    const hoch = b >= a && b > c, tief = b <= a && b < c;
    if(!hoch && !tief) continue;
    /* Parabel durch drei Punkte: Lage des Scheitels zwischen den Stunden */
    const nenner = a - 2 * b + c;
    const off = nenner ? Math.max(-0.5, Math.min(0.5, (a - c) / (2 * nenner))) : 0;
    roh.push({ typ: hoch ? "Hochwasser" : "Niedrigwasser", t: i + off, h: b });
  }
  /* Gleiche Typen direkt hintereinander (flache Scheitel) zusammenfassen */
  const out = [];
  roh.forEach(e => {
    const letzt = out[out.length - 1];
    if(letzt && letzt.typ === e.typ){ if((e.typ === "Hochwasser") ? e.h > letzt.h : e.h < letzt.h) out[out.length - 1] = e; return; }
    if(letzt && Math.abs(letzt.h - e.h) < 0.25) return;   // kleine Wellen sind keine Tide
    out.push(e);
  });
  return out;
}
function zeitText(e){
  const min = Math.round(e.t * 12) * 5;   // auf 5 Minuten gerundet
  const hh = String(Math.floor(min / 60) % 24).padStart(2, "0"), mm = String(min % 60).padStart(2, "0");
  return { typ: e.typ, zeit: `${hh}:${mm}`, hoehe: Math.round(e.h * 100) / 100 };
}

/* ---------- Schonzeit ---------- */
const MONAT = { januar:1, februar:2, "märz":3, maerz:3, april:4, mai:5, juni:6, juli:7, august:8, september:9, oktober:10, november:11, dezember:12 };
export function schonzeitMonate(text){
  if(!text) return null;
  const re = /(\d{1,2})\.\s*([A-Za-zäöüÄÖÜ]+)/g; const t = []; let m;
  while((m = re.exec(text)) !== null){ const n = MONAT[m[2].toLowerCase()]; if(n) t.push(n); }
  if(t.length < 2) return null;
  const [a, b] = t, out = [];
  if(a <= b) for(let x = a; x <= b; x++) out.push(x); else { for(let x = a; x <= 12; x++) out.push(x); for(let x = 1; x <= b; x++) out.push(x); }
  return out;
}
export function rechtFuer(fischId, monat){
  const r = typeof RECHT_SH !== "undefined" ? RECHT_SH[fischId] : null;
  if(!r) return { status: "unbekannt" };
  if(r.schutz && /ganzjährig/i.test(r.schonzeit)) return { status: "geschuetzt", r };
  const mon = schonzeitMonate(r.schonzeit);
  if(mon && mon.includes(monat)) return { status: "schonzeit", r };
  if(r.schutz) return { status: "achtung", r };
  if(/eingeschränkt|verboten|quote/i.test(r.schonzeit)) return { status: "achtung", r };
  return { status: "frei", r };
}

/* ---------- Welcher Fisch passt? ----------
   Transparente Punkte aus Saison, Wetter und deinem Gerät, je mit Begründung. */
const RAEUBER = ["zander", "hecht", "barsch", "rapfen", "meerforelle", "wolfsbarsch", "doebel"];

/* Top-Monate je Fisch (Norddeutschland) – genauer als Jahreszeiten.
   Schonzeiten schließen ohnehin aus; hier geht es um die Beißlaune. */
const TOPMONATE = {
  zander: [6, 9, 10, 11, 12, 1], hecht: [5, 9, 10, 11, 12, 1], barsch: [7, 8, 9, 10, 11],
  forelle: [3, 4, 5, 10, 11, 12, 1, 2], rapfen: [5, 6, 7, 8, 9], doebel: [5, 6, 7, 8, 9, 10],
  aal: [5, 6, 7, 8, 9], quappe: [11, 12, 1, 2, 3], karpfen: [5, 6, 7, 8, 9, 10], schleie: [5, 6, 7, 8],
  rotauge: [3, 4, 9, 10, 11], wels: [6, 7, 8, 9], dorsch: [10, 11, 12, 1, 2, 3], hering: [3, 4, 5],
  wolfsbarsch: [6, 7, 8, 9, 10], flunder: [9, 10, 11, 12], meerforelle: [3, 4, 5, 10, 11], hornhecht: [4, 5, 6]
};
const MONATSNAME = ["Januar", "Februar", "März", "April", "Mai", "Juni", "Juli", "August", "September", "Oktober", "November", "Dezember"];
const WARM = ["karpfen", "schleie", "aal", "wels", "rotauge", "doebel", "rapfen"];

export function fischBewertung(ort, lage, monat){
  const saison = jahreszeit(monat);
  const ergebnis = { passt: [], gesperrt: [], fehltGeraet: [] };
  FISCHE.forEach(f => {
    if(ort.gw && !f.gewaesser.includes(ort.gw)) return;
    if(ort.ohne && ort.ohne.includes(f.id)) return;          // kommt an diesem Ort praktisch nicht vor
    let recht = rechtFuer(f.id, monat);
    /* Forellensee: dort gilt die Gewässerordnung, nicht die Schonzeit der wilden Bachforelle */
    if(f.id === "forelle" && ort.gw === "forellensee" && recht.status === "schonzeit") recht = { status: "achtung", r: { ...recht.r, hinweis: "Am Forellensee gilt die Gewässerordnung der Anlage – die gesetzliche Schonzeit betrifft wilde Bachforellen." } };
    if(recht.status === "schonzeit" || recht.status === "geschuetzt"){ ergebnis.gesperrt.push({ fisch: f, recht }); return; }

    /* Gerät: beste Methode am Gewässer */
    const ansaetze = f.ansaetze.filter(a => !ort.gw || !a.gewaesser || a.gewaesser.includes(ort.gw));
    const bewertet = ansaetze.map(a => ({ a, b: BERATER.bewerte(a, ort.gw) })).filter(x => x.b);
    const RANG = { machbar: 0, bedingt: 1, wunsch: 2 };
    bewertet.sort((x, y) => RANG[x.b.status] - RANG[y.b.status]);
    const beste = bewertet[0];
    if(!beste || beste.b.status === "wunsch"){ ergebnis.fehltGeraet.push({ fisch: f }); return; }

    const hint = (typeof TAGESCHECK_HINT !== "undefined" && TAGESCHECK_HINT[f.id]) || {};
    let p = 0; const plus = [], minus = [];
    const top = TOPMONATE[f.id];
    if(top){
      if(top.includes(monat)){ p += 2; plus.push(`${MONATSNAME[monat - 1]} ist eine Top-Zeit`); }
      else { p -= 1; minus.push(`${MONATSNAME[monat - 1]} ist nicht die beste Zeit`); }
    } else if(hint.topSaison){
      if(hint.topSaison.includes(saison)){ p += 2; plus.push(`${saison} ist Hauptsaison`); }
      else { p -= 1; minus.push(`${saison} ist nicht die beste Zeit`); }
    } else p += 1;
    if(beste.b.status === "machbar"){ p += 1; } else minus.push("dein Gerät geht nur mit Abstrichen");

    if(lage){
      /* Lufttemperatur ist nicht Wassertemperatur: Tagesmittel als grober Hinweis */
      const t = lage.tmin !== null && lage.tmax !== null ? (lage.tmin + lage.tmax) / 2 : lage.temp;
      if(RAEUBER.includes(f.id) && /fallend/.test(lage.trend)){ p += 1; plus.push("fallender Luftdruck – Räuber oft beißfreudig"); }
      if(["karpfen", "schleie"].includes(f.id) && lage.trend === "stabil" && lage.druck > 1015){ p += 1; plus.push("stabile Hochdrucklage"); }
      if(["hecht", "zander", "forelle", "meerforelle"].includes(f.id) && lage.wolken >= 65){ p += 1; plus.push("bedeckt – Räuber jagen auch tagsüber"); }
      if(f.id === "zander" && lage.wolken < 25 && t > 12){ p -= 1; minus.push("grelles Licht – Zander eher in der Dämmerung"); }
      if(WARM.includes(f.id) && t < 3){ p -= 1; minus.push(`sehr kalter Tag (um ${Math.round(t)} °C) – Friedfische beißen träge, fein und langsam fischen`); }
      else if(["karpfen", "schleie", "aal", "wels"].includes(f.id) && t >= 18){ p += 1; plus.push("warm – Friedfisch und Aal aktiv"); }
      if(f.id === "quappe" && t < 6){ p += 1; plus.push("Kälte – Quappen werden aktiv"); }
      if(ort.kueste){
        if(lage.wind >= 12 && lage.wind <= 35 && ["meerforelle", "wolfsbarsch"].includes(f.id)){ p += 1; plus.push("bewegtes Wasser an der Küste"); }
        if(lage.boenMax > 55){ p -= 2; minus.push(`Böen bis ${Math.round(lage.boenMax)} km/h – an der Küste zu viel`); }
      } else if(lage.boenMax > 60){ p -= 1; minus.push(`Böen bis ${Math.round(lage.boenMax)} km/h`); }
    }
    const zeitTipp = hint.nachtaktiv ? "beste Zeit: Abenddämmerung und Nacht" : hint.daemmerung ? "beste Zeit: Morgen- und Abenddämmerung" : "";
    ergebnis.passt.push({ fisch: f, punkte: p, plus, minus, zeitTipp, recht, beste: beste.a, besteStatus: beste.b.status, setup: beste.b.bester ? beste.b.bester.setup : null });
  });
  ergebnis.passt.sort((a, b) => b.punkte - a.punkte);
  return ergebnis;
}
export function urteil(p){
  if(p >= 4) return ["g", "sehr gut"];
  if(p >= 2) return ["g", "gut"];
  if(p >= 1) return ["y", "möglich"];
  return ["r", "eher schwach"];
}
