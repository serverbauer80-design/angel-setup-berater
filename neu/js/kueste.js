/* ============================================================
   Wind & Wasser an der Küste
   Für Küstenorte: Wo liegt die See (Küstenlinie aus OpenStreetMap,
   bei festen Orten hinterlegt, sonst Schätzung über das Wellenmodell)?
   Daraus: Ist der Wind auflandig, ablandig oder seitlich? Dazu Welle
   und Wassertemperatur (Open-Meteo Marine) und an der Ostsee der
   gemessene Wasserstand (PEGELONLINE). Das fließt in „Passt heute“ ein.
   ============================================================ */
import { lese, schreibe } from "./store.js";
import { overpass } from "./flusslauf.js";
import { windRichtung, rechtFuer, TOPMONATE } from "./lage.js";

const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[c]));
const zahl = (v, n = 1) => String(Math.round(v * 10 ** n) / 10 ** n).replace(".", ",");
const kmZw = (a, b, c, d) => 6371 * Math.hypot((c - a) * Math.PI / 180, (d - b) * Math.PI / 180 * Math.cos(a * Math.PI / 180));
const peil = (a, b, c, d) => (Math.atan2((d - b) * Math.cos(a * Math.PI / 180), c - a) * 180 / Math.PI + 360) % 360;
const RICHTUNGEN = ["N", "NO", "O", "SO", "S", "SW", "W", "NW"];

/* Beaufort aus km/h */
export function bft(kmh){ const g = [1, 6, 12, 20, 29, 39, 50, 62, 75, 89, 103, 118]; let b = 0; while(b < g.length && kmh >= g[b]) b++; return b; }

/* ---------- Wo liegt die See? ---------- */
/* Feste Orte: Richtung zur offenen See (Grad) */
const FEST = { ostsee_sh: 55, nordsee_sh: 270, hvidesande: 270, blaavand: 245, soendervig: 270 };
const SEE_KEY = "neu_kueste_see_v1";
const ortKey = o => o.lat.toFixed(3) + "," + o.lng.toFixed(3);
const laeuftSee = new Map();

export function seeBekannt(ort){
  if(FEST[ort.id] != null) return { grad: FEST[ort.id], quelle: "fest" };
  return (lese(SEE_KEY, {}) || {})[ortKey(ort)] || null;
}
export function seeSetzen(ort, grad){
  const m = lese(SEE_KEY, {}) || {};
  if(grad === null) delete m[ortKey(ort)]; else m[ortKey(ort)] = { grad, quelle: "du" };
  schreibe(SEE_KEY, m);
}
/* Küstenlinie in OSM: Land links, Wasser rechts der Wegrichtung -> See = Richtung + 90° */
async function seeAusOSM(ort){
  const d = 0.03, bb = `${ort.lat - d},${ort.lng - d / 0.6},${ort.lat + d},${ort.lng + d / 0.6}`;
  const data = await overpass(`[out:json][timeout:25];way(around:3000,${ort.lat},${ort.lng})["natural"="coastline"];out geom(${bb});`);
  const k = Math.cos(ort.lat * Math.PI / 180);
  let best = null;
  (data.elements || []).forEach(w => {
    const g = w.geometry || [];
    for(let i = 0; i < g.length - 1; i++){
      const a = g[i], b = g[i + 1]; if(!a || !b) continue;
      const ax = (a.lon - ort.lng) * k, ay = a.lat - ort.lat, bx = (b.lon - ort.lng) * k, by = b.lat - ort.lat;
      const dx = bx - ax, dy = by - ay, L = dx * dx + dy * dy;
      const t = L ? Math.max(0, Math.min(1, -(ax * dx + ay * dy) / L)) : 0;
      const dist = Math.hypot(ax + t * dx, ay + t * dy) * 111.32;
      if(!best || dist < best.dist) best = { dist, grad: (Math.atan2(dx, dy) * 180 / Math.PI + 90 + 360) % 360 };
    }
  });
  return best && best.dist < 3 ? { grad: Math.round(best.grad), quelle: "osm", km: Math.round(best.dist * 10) / 10 } : null;
}
/* Ermittelt (einmal je Spot) und speichert die Seerichtung */
export function ermittleSee(ort, ersatz){
  const k = ortKey(ort);
  if(seeBekannt(ort) || laeuftSee.has(k)) return laeuftSee.get(k) || Promise.resolve(seeBekannt(ort));
  const p = seeAusOSM(ort).catch(() => null).then(r => {
    laeuftSee.delete(k);
    const erg = r || ersatz || null;
    if(erg){ const m = lese(SEE_KEY, {}) || {}; if(!m[k]) { m[k] = erg; schreibe(SEE_KEY, m); } }
    return erg;
  });
  laeuftSee.set(k, p);
  return p;
}

/* Wind relativ zur Küste. Windrichtung = woher der Wind kommt. */
export function windZurKueste(windGrad, seeGrad){
  const d = Math.abs(((windGrad - seeGrad) % 360 + 540) % 360 - 180);   /* 0 = Wind kommt genau von See */
  if(d <= 55) return { art: "auflandig", d };
  if(d >= 125) return { art: "ablandig", d };
  return { art: "seitlich", d, schraeg: d < 90 ? "schräg auflandig" : "schräg ablandig" };
}

/* ---------- Welle, Wassertemperatur, Ostsee-Pegel ---------- */
const MAR_KEY = "neu_kueste_marine_v1";
async function ladeMarine(ort){
  const cache = lese(MAR_KEY, {}) || {};
  const alt = cache[ort.id];
  if(alt && Date.now() - alt.t < 30 * 60e3) return alt.d;
  try {
    const res = await fetch(`https://marine-api.open-meteo.com/v1/marine?latitude=${ort.lat}&longitude=${ort.lng}&hourly=wave_height,wave_direction,sea_surface_temperature&forecast_days=3&timezone=Europe%2FBerlin`);
    if(!res.ok) throw new Error("HTTP " + res.status);
    const d = await res.json();
    const keys = Object.keys(cache); if(keys.length > 20) delete cache[keys[0]];
    cache[ort.id] = { t: Date.now(), d }; schreibe(MAR_KEY, cache);
    return d;
  } catch(e){ if(alt) return alt.d; throw e; }
}
const PG = "https://www.pegelonline.wsv.de/webservices/rest-api/v2";
let ostseeListe = null;
async function ladeOstseePegel(ort){
  if(!ostseeListe || Date.now() - ostseeListe.t > 15 * 60e3){
    const res = await fetch(`${PG}/stations.json?waters=OSTSEE&includeTimeseries=true&includeCurrentMeasurement=true&includeCharacteristicValues=true`);
    if(!res.ok) throw new Error("HTTP " + res.status);
    ostseeListe = { t: Date.now(), l: await res.json() };
  }
  const st = ostseeListe.l.map(s => ({ s, km: kmZw(ort.lat, ort.lng, s.latitude, s.longitude), w: (s.timeseries || []).find(t => t.shortname === "W") }))
    .filter(x => x.w && x.w.currentMeasurement && x.km < 40).sort((a, b) => a.km - b.km)[0];
  if(!st) return null;
  const mw = ((st.w.characteristicValues || []).find(c => c.shortname === "MW") || {}).value;
  if(mw == null) return null;
  let trend = null;
  try {
    const r = await fetch(`${PG}/stations/${st.s.uuid}/W/measurements.json?start=PT3H`);
    const m = r.ok ? await r.json() : [];
    if(m.length > 2){ const d = m[m.length - 1].value - m[0].value; trend = d > 4 ? "steigend" : d < -4 ? "fallend" : "gleichbleibend"; }
  } catch(e){}
  const name = st.s.longname.split(/\s+/).map(w => w.charAt(0) + w.slice(1).toLowerCase()).join(" ").replace(/^Lt /, "Leuchtturm ");
  return { name, km: Math.round(st.km), w: st.w.currentMeasurement.value, mw, diff: Math.round(st.w.currentMeasurement.value - mw), trend, zeit: st.w.currentMeasurement.timestamp };
}

/* Alles für einen Küstenort laden */
export async function ladeKueste(ort){
  const marine = await ladeMarine(ort).catch(() => null);
  /* Ersatz für die Seerichtung: das Wellenmodell rastet auf die nächste Seezelle ein */
  const ersatz = marine && marine.latitude != null && kmZw(ort.lat, ort.lng, marine.latitude, marine.longitude) > 0.8
    ? { grad: Math.round(peil(ort.lat, ort.lng, marine.latitude, marine.longitude)), quelle: "modell" } : null;
  /* Küstenlinie aus OSM kann dauern: sofort mit der Schätzung anzeigen, danach verfeinern */
  const bekannt = seeBekannt(ort);
  const spaeter = bekannt ? null : ermittleSee(ort, ersatz);
  const see = bekannt || (ersatz ? { ...ersatz, vorlaeufig: true } : null);
  const pegel = ort.gw === "ostsee" ? await ladeOstseePegel(ort).catch(() => null) : null;
  return { marine, see, pegel, spaeter, nordsee: ort.gw === "nordsee" };
}

/* Werte für den gewählten Tag (heute: aktuelle Stunde, sonst Mittag) */
export function kuesteTag(k, iso, heute, lage){
  if(!k) return null;
  const h = k.marine && k.marine.hourly;
  let welle = null, welleMax = null, sst = null, wRichtung = null;
  if(h){
    const jetzt = new Date(); const std = String(jetzt.getHours()).padStart(2, "0");
    let i = h.time.indexOf(iso + "T" + (heute ? std : "12") + ":00");
    if(i < 0) i = h.time.findIndex(t => t.startsWith(iso));
    if(i >= 0){ welle = h.wave_height[i]; sst = h.sea_surface_temperature[i]; wRichtung = h.wave_direction[i]; }
    const tag = h.time.map((t, j) => t.startsWith(iso) ? h.wave_height[j] : null).filter(v => v != null);
    if(tag.length) welleMax = Math.max(...tag);
  }
  const see = k.see;
  const rel = see && lage && lage.richtung != null ? windZurKueste(lage.richtung, see.grad) : null;
  return { iso, nordsee: !!k.nordsee, welle, welleMax, sst, wRichtung, see, rel, bft: lage ? bft(lage.wind) : null, pegel: heute ? k.pegel : null };
}

/* ---------- Bewertung je Fisch ---------- */
export function kuestenPunkte(fischId, kt){
  const out = { p: 0, plus: [], minus: [] };
  if(!kt) return out;
  const { rel, bft: b, welle, welleMax, sst, pegel } = kt;
  const auf = rel && rel.art === "auflandig", ab = rel && rel.art === "ablandig", seit = rel && rel.art === "seitlich";
  const wl = welle ?? 0, wmax = welleMax ?? wl;
  /* Nordsee: deutlich mehr Welle normal als an der Ostsee */
  const grenze = kt.nordsee ? { bft: 7, welle: 2.2 } : { bft: 6, welle: 1.2 };
  const zuViel = (auf || seit) && (b >= grenze.bft || wmax > grenze.welle);
  if(fischId === "meerforelle"){
    if(zuViel){ out.p -= 2; out.minus.push(`zu viel Welle (bis ${zahl(wmax)} m) – Kraut im Wasser, Waten gefährlich: Leeseite oder geschützte Bucht suchen`); }
    else if((auf || (seit && rel.d < 90)) && b >= 2 && b <= 5){ out.p += 2; out.plus.push(`${auf ? "auflandiger" : "schräg auflandiger"} Wind (${b} Bft) – angetrübtes Wasser, Meerforellen ziehen dicht unter Land`); }
    else if(ab && wl < 0.2){ out.p -= 1; out.minus.push("ablandig und glatt – klares Wasser: Dämmerung nutzen, weit werfen, kleine Köder"); }
    if(sst != null){
      if(sst >= 6 && sst <= 12){ out.p += 1; out.plus.push(`Wasser ${zahl(sst)} °C – Wohlfühltemperatur der Meerforelle`); }
      else if(sst < 4){ out.p -= 1; out.minus.push(`Wasser nur ${zahl(sst)} °C – in Förden und an Brackwasser-Einläufen suchen, langsam führen`); }
      else if(sst > 15){ out.p -= 1; out.minus.push(`Wasser ${zahl(sst)} °C – tagsüber zu warm, nur Dämmerung und Nacht`); }
    }
  }
  const monat = kt.iso ? +kt.iso.slice(5, 7) : new Date().getMonth() + 1;
  if(fischId === "hornhecht" && (TOPMONATE.hornhecht || []).includes(monat)){
    if(b != null && b <= 4 && wl < 0.5){ out.p += 1; out.plus.push("ruhiges Wasser – Hornhechte jagen an der Oberfläche"); }
    if(b >= 6){ out.p -= 1; out.minus.push("zu viel Wind für die Oberflächenfischerei"); }
    if(sst != null && sst >= 10){ out.p += 1; out.plus.push(`Wasser ${zahl(sst)} °C – die Hornhechte sind unter Land`); }
  }
  if(fischId === "dorsch" || fischId === "flunder"){
    if(zuViel && wmax > 1.6){ out.p -= 1; out.minus.push(`Welle bis ${zahl(wmax)} m – Montage hält kaum, Kraut in der Schnur`); }
    else if((auf || seit) && wl >= 0.3 && !zuViel){ out.p += 1; out.plus.push(`${auf ? "auflandig" : "seitlicher Wind"} mit Welle – die Brandung wirbelt Futter auf (abends und nachts am besten)`); }
    else if(ab && wl < 0.2 && fischId === "dorsch"){ out.minus.push("ablandig und glatt – Dorsch eher nachts und auf Distanz"); }
  }
  if(fischId === "wolfsbarsch"){
    if((auf || seit) && wl >= 0.5 && !zuViel){ out.p += 2; out.plus.push("Brandung und trübes Wasser – Wolfsbarsch jagt im Weißwasser"); }
    if(sst != null && sst < 10){ out.p -= 1; out.minus.push(`Wasser ${zahl(sst)} °C – für Wolfsbarsch eher zu kalt`); }
  }
  if(pegel && pegel.diff >= 60){ out.p -= 1; out.minus.push(`Wasserstand ${pegel.diff > 0 ? "+" : ""}${pegel.diff} cm – Strand überflutet, Waten nur eingeschränkt`); }
  return out;
}

/* ---------- Ansicht ---------- */
const relText = r => !r ? "" : r.art === "seitlich" ? r.schraeg : r.art;
function kompass(see, wind){
  /* See als blauer Sektor (±60°), Wind als Pfeil, der zur Mitte zeigt (woher er kommt) */
  const r = 34, c = 40, rad = g => (g - 90) * Math.PI / 180;
  const pt = (g, rr) => [c + rr * Math.cos(rad(g)), c + rr * Math.sin(rad(g))];
  let s = `<circle class="kk-land" cx="${c}" cy="${c}" r="${r}"/>`;
  if(see){ const [x1, y1] = pt(see.grad - 60, r), [x2, y2] = pt(see.grad + 60, r);
    s += `<path class="kk-see" d="M${c} ${c} L${x1.toFixed(1)} ${y1.toFixed(1)} A${r} ${r} 0 0 1 ${x2.toFixed(1)} ${y2.toFixed(1)}Z"/>`; }
  ["N", "O", "S", "W"].forEach((t, i) => { const [x, y] = pt(i * 90, r - 8); s += `<text class="kk-txt" x="${x.toFixed(1)}" y="${(y + 3.5).toFixed(1)}" text-anchor="middle">${t}</text>`; });
  if(wind != null){ const [x1, y1] = pt(wind, r + 4), [x2, y2] = pt(wind, 8);
    const w = rad(wind) + Math.PI, l = 7;
    s += `<line class="kk-wind" x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}"/>
      <path class="kk-spitze" d="M${x2.toFixed(1)} ${y2.toFixed(1)} L${(x2 - l * Math.cos(w - .5)).toFixed(1)} ${(y2 - l * Math.sin(w - .5)).toFixed(1)} L${(x2 - l * Math.cos(w + .5)).toFixed(1)} ${(y2 - l * Math.sin(w + .5)).toFixed(1)}Z"/>`; }
  return `<svg class="kk" viewBox="-6 -6 92 92" role="img" aria-label="Kompass: See ${see ? windRichtung(see.grad) : "unbekannt"}, Wind aus ${wind != null ? windRichtung(wind) : "?"}">${s}</svg>`;
}

function deutung(kt){
  const { rel, bft: b, welle, welleMax, sst, nordsee } = kt;
  const t = [];
  if(rel){
    const wl = welle ?? 0, wmax = welleMax ?? wl;
    const grenze = nordsee ? { bft: 7, welle: 2.2 } : { bft: 6, welle: 1.2 };
    if((rel.art !== "ablandig") && (b >= grenze.bft || wmax > grenze.welle)) t.push(nordsee
      ? "Schwere Brandung: Montagen halten kaum, Strömung und Sog am Strand sind gefährlich. Besser an Hafenmolen, Buhnen oder Prielen im Windschatten."
      : "Viel Welle von See: Kraut und Seegras im Wasser, Waten gefährlich. Besser eine Bucht auf der windabgewandten Seite (Lee) oder eine Förde.");
    else if(rel.art === "auflandig" && b >= 2) t.push(nordsee
      ? "Auflandig mit Brandung: Das Weißwasser wirbelt Würmer und Krebse auf – Wolfsbarsch und Plattfisch fressen dicht am Strand. Rund um Hochwasser fischen, Brandungsblei mit Krallen."
      : "Leicht auflandig ist an der Ostsee meist die beste Lage: Die Welle trübt das Wasser an und spült Futter ins Flache – Meerforellen kommen dicht unter Land. Kurz werfen, auch die erste Rinne abfischen.");
    else if(rel.art === "ablandig") t.push(`Ablandiger Wind: ${wl < 0.2 ? "glattes, klares Wasser – tagsüber schwierig. Dämmerung und Nacht nutzen, Rückenwind für weite Würfe, kleinere und dezente Köder." : "Rückenwind für weite Würfe, das Wasser beruhigt sich unter Land."}`);
    else if(rel.art === "seitlich") t.push("Seitlicher Wind: Strömung parallel zum Strand. Quer zur Strömung werfen und den Köder mittreiben lassen; Landzungen und Steinpackungen sind jetzt Hotspots.");
    else t.push("Kaum Wind: klares, ruhiges Wasser – Dämmerung nutzen, leise waten.");
  }
  if(sst != null && nordsee) t.push(sst < 10 ? "Kaltes Wasser: Plattfisch und Wittling eher als Wolfsbarsch." : sst < 14 ? "Wassertemperatur im Übergang: Wolfsbarsch noch an warmen Tagen, Plattfisch gut." : "Warmes Wasser: Hauptsaison für Wolfsbarsch.");
  else if(sst != null) t.push(sst < 4 ? "Sehr kaltes Wasser: Fische ziehen in Förden und an Brackwasser-Einläufe, Köder langsam führen." : sst <= 12 ? "Wassertemperatur im Meerforellen-Bereich (6–12 °C ideal)." : sst <= 16 ? "Das Wasser wird warm: frühe Morgenstunden und Abend nutzen." : "Warmes Wasser: Meerforellen stehen tief, nachts kommen sie ins Flache – tagsüber eher Hornhecht und Plattfisch.");
  return t;
}

/* Andere eigene Küstenspots im Vergleich (gleicher Wind) */
function vergleichHTML(ort, orte, lage){
  if(!lage || lage.richtung == null) return "";
  /* nur dasselbe Meer in der Nähe – Ostsee und Nordsee lassen sich nicht vergleichen */
  const andere = orte.filter(o => o.kueste && o.id !== ort.id && seeBekannt(o) && (!o.gw || !ort.gw || o.gw === ort.gw) && kmZw(ort.lat, ort.lng, o.lat, o.lng) < 80);
  if(!andere.length) return "";
  const r = andere.map(o => ({ o, rel: windZurKueste(lage.richtung, seeBekannt(o).grad) }))
    .sort((a, b) => a.rel.d - b.rel.d).slice(0, 5);
  return `<div class="kk-vergleich"><h4>Andere Küstenstellen in der Nähe bei ${windRichtung(lage.richtung)}-Wind</h4>
    <ul>${r.map(x => `<li><button type="button" class="kk-ort" data-h-ort-wahl="${esc(x.o.id)}">${esc(x.o.name)}</button><span class="pill ${x.rel.art === "auflandig" ? "frei" : ""}">${relText(x.rel)}</span></li>`).join("")}</ul></div>`;
}

export function kuesteHTML(ort, kt, orte, lage, laedt){
  if(!ort.kueste) return "";
  if(!kt) return `<div class="h-karte h-kueste"><h3>Wind &amp; Wasser an der Küste</h3><p class="hinweis-klein">${laedt ? "Lade Welle, Wassertemperatur und Küstenrichtung …" : "Küstendaten nicht ladbar – ohne Netz?"}</p></div>`;
  const { rel, bft: b, welle, welleMax, sst, see, pegel } = kt;
  const fest = see && see.quelle === "fest";
  const quelle = !see ? "Richtung der See unbekannt" : see.quelle === "osm" ? "aus der Küstenlinie (OpenStreetMap)" : see.quelle === "du" ? "von dir festgelegt" : see.vorlaeufig ? "vorläufig geschätzt, die Küstenlinie wird noch geladen" : see.quelle === "modell" ? "geschätzt – bitte prüfen" : "hinterlegt";
  return `<div class="h-karte h-kueste"><h3>Wind &amp; Wasser an der Küste</h3>
    <div class="kk-kopf">${kompass(see, lage ? lage.richtung : null)}
      <div class="kk-werte">
        <div><small>Wind zur Küste</small><b>${rel ? esc(relText(rel)) : "–"}</b><span>${lage ? `${windRichtung(lage.richtung)} · ${b} Bft` : ""}</span></div>
        <div><small>Welle</small><b>${welle != null ? zahl(welle) + " m" : "–"}</b><span>${welleMax != null ? "max " + zahl(welleMax) + " m" : ""}</span></div>
        <div><small>Wasser</small><b>${sst != null ? zahl(sst) + " °C" : "–"}</b><span>Oberfläche</span></div>
        ${pegel ? `<div class="${Math.abs(pegel.diff) >= 50 ? "akzent" : ""}"><small>Wasserstand</small><b>${pegel.diff > 0 ? "+" : ""}${pegel.diff} cm</b><span title="${esc(pegel.name + (pegel.trend ? ", " + pegel.trend : ""))}">${pegel.trend ? { steigend: "↗ ", fallend: "↘ ", gleichbleibend: "→ " }[pegel.trend] : ""}${esc(pegel.name.replace(/^Leuchtturm /, "Lt. "))}</span></div>` : ""}
      </div></div>
    ${deutung(kt).map(t => `<p class="kk-text">${esc(t)}</p>`).join("")}
    ${(() => { const r = kt.iso && !kt.nordsee && rechtFuer("meerforelle", +kt.iso.slice(5, 7), kt.iso); return r && r.status === "schonzeit" ? `<p class="hinweis-klein">Die Meerforelle hat gerade Schonzeit (${esc(String(r.r.schonzeit).replace(/&amp;/g, "&"))}). Wind und Welle lesen lohnt trotzdem: Für Dorsch und Plattfisch in der Brandung gilt dasselbe.</p>` : ""; })()}
    ${pegel && Math.abs(pegel.diff) >= 50 ? `<p class="h-warn">${pegel.diff > 0 ? `Hochwasser: ${pegel.diff} cm über Mittel${pegel.diff >= 100 ? " – Sturmflut-Niveau, nicht waten" : " – Strand schmal, Waten nur eingeschränkt"}.` : `Niedrigwasser: ${-pegel.diff} cm unter Mittel – Sandbänke und Steinfelder liegen frei. Gute Gelegenheit, die Struktur für später kennenzulernen; die Fische stehen weiter draußen.`}</p>` : ""}
    ${vergleichHTML(ort, orte, lage)}
    <p class="hinweis-klein kk-quelle">Blau im Kompass = Seeseite, ${quelle}${see && see.km != null ? ` (Küste ${zahl(see.km)} km entfernt)` : ""}.
      ${!fest ? `<label class="kk-aendern">Richtung ändern <select data-kk-see="${esc(ort.id)}"><option value="">automatisch</option>${RICHTUNGEN.map((r, i) => `<option value="${i * 45}"${see && see.quelle === "du" && see.grad === i * 45 ? " selected" : ""}>See im ${r}</option>`).join("")}</select></label>` : ""}
      Welle und Wassertemperatur: Open-Meteo Marine${pegel ? ", Wasserstand: PEGELONLINE (WSV)" : ""}.</p>
  </div>`;
}
