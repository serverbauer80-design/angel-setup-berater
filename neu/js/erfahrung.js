/* ============================================================
   Deine Erfahrung (Etappe 8)
   „Heute“ vergleicht die Bedingungen des Tages mit deinen Fängen im
   Fangbuch: gleicher Ort, gleiche Jahreszeit, gleicher Luftdrucktrend,
   ähnliche Temperatur. Je mehr du einträgst, desto treffender.
   Dazu die Schonzeit-Kachel: was ist gerade geschont, was ändert sich
   in den nächsten 14 Tagen (tagesgenau aus RECHT_SH).
   ============================================================ */
import { alleFaenge } from "./fangbuch.js";
import { ausfluege } from "./tagebuch.js";
import { ladeFaengeDaten } from "./store.js";
import { alleSetups } from "./setups.js";
import { schonzeitSpanne, inSpanne, tagISO } from "./lage.js";

const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[c]));
const km = (a, b, c, d) => 6371 * Math.hypot((c - a) * Math.PI / 180, (d - b) * Math.PI / 180 * Math.cos(a * Math.PI / 180));
const MONATE = ["Januar", "Februar", "März", "April", "Mai", "Juni", "Juli", "August", "September", "Oktober", "November", "Dezember"];
const TZ_NAME = { daemmerung_morgen: "in der Morgendämmerung", vormittag: "vormittags", mittag: "mittags", nachmittag: "nachmittags", daemmerung_abend: "in der Abenddämmerung", nacht: "nachts" };
const fischName = id => (FISCHE.find(f => f.id === id) || {}).name || id;
const druckKlasse = t => /fallend/.test(t || "") ? "fallend" : /steigend/.test(t || "") ? "steigend" : "stabil";
function haeufigste(arr){
  const z = {}; arr.filter(Boolean).forEach(x => z[x] = (z[x] || 0) + 1);
  const best = Object.entries(z).sort((a, b) => b[1] - a[1])[0];
  return best ? { wert: best[0], n: best[1] } : null;
}
function setupTitel(key){
  const s = alleSetups().find(x => x.key === key);
  if(s) return s.titel + (s.zusatz ? " (" + s.zusatz + ")" : "");
  return typeof AKTUELL !== "undefined" && AKTUELL[key] ? String(AKTUELL[key].name).split(" · ")[0] : null;
}

/* Vergleich: liefert je Fisch die ähnlichen Fänge mit Begründung */
export function erfahrung(ort, lage, iso){
  const faenge = alleFaenge().filter(c => c.fischId && c.datum);
  const trips = ausfluege();
  const tripBy = Object.fromEntries(trips.map(a => [a.id, a]));
  const spots = Object.fromEntries(ladeFaengeDaten().spots.map(s => [s.id, s]));
  const monat = +iso.slice(5, 7);
  const tempHeute = lage ? (lage.tmin != null && lage.tmax != null ? (lage.tmin + lage.tmax) / 2 : lage.temp) : null;
  const druckHeute = lage ? druckKlasse(lage.trend) : null;

  const proFisch = {};
  faenge.forEach(c => {
    const trip = (c.ausflugId && tripBy[c.ausflugId]) || trips.find(a => a.datum === c.datum && (!c.spotId || !a.spotId || a.spotId === c.spotId));
    const w = (trip && trip.wetter) || {};
    const sp = c.spotId && spots[c.spotId];
    const hier = sp && typeof sp.lat === "number" && km(sp.lat, sp.lng, ort.lat, ort.lng) < 5;
    const m = +c.datum.slice(5, 7), md = Math.min(Math.abs(m - monat), 12 - Math.abs(m - monat));
    let s = 0; const g = {};
    /* selber Ort zählt voll nur in derselben Jahreszeit (±2 Monate) */
    if(hier){ s += md <= 2 ? 3 : 1; g.hier = 1; }
    if(md === 0){ s += 2; g.monat = 1; } else if(md === 1){ s += 1; g.saison = 1; }
    if(druckHeute && w.luftdruck && w.luftdruck === druckHeute){ s += 1; g.druck = 1; }
    const tw = w.temp != null && w.temp !== "" ? +w.temp : null;
    if(tempHeute != null && tw != null && Math.abs(tw - tempHeute) <= 4){ s += 1; g.temp = 1; }
    const e = proFisch[c.fischId] = proFisch[c.fischId] || { fischId: c.fischId, gesamt: 0, n: 0, punkte: 0, aehnlich: [], g: {} };
    e.gesamt++;
    if(s >= 3){ e.n++; e.punkte += s; e.aehnlich.push(c); Object.keys(g).forEach(k => e.g[k] = (e.g[k] || 0) + 1); }
  });

  const liste = Object.values(proFisch).filter(e => e.n).map(e => {
    const gr = [];
    if(e.g.hier) gr.push(`${e.g.hier}× hier am Ort`);
    if(e.g.monat) gr.push(`${e.g.monat}× im ${MONATE[monat - 1]}`);
    else if(e.g.saison) gr.push(`${e.g.saison}× im Nachbarmonat`);
    if(e.g.druck) gr.push(`${e.g.druck}× bei ${druckHeute}em Luftdruck`);
    if(e.g.temp) gr.push(`${e.g.temp}× bei ähnlicher Temperatur`);
    const setup = haeufigste(e.aehnlich.map(c => c.setup));
    const tz = haeufigste(e.aehnlich.map(c => c.tz));
    const koeder = haeufigste(e.aehnlich.map(c => c.koeder && String(c.koeder).trim()));
    const groesster = e.aehnlich.filter(c => +c.laenge).sort((a, b) => b.laenge - a.laenge)[0];
    return { ...e, gruende: gr, setup: setup && setupTitel(setup.wert), tz: tz && tz.n >= 2 ? TZ_NAME[tz.wert] : (tz && e.n === 1 ? TZ_NAME[tz.wert] : null), koeder: koeder && koeder.wert, groesster };
  }).sort((a, b) => b.punkte - a.punkte);

  /* Ausflüge mit gleichem Drucktrend: wie oft gab es Fang? */
  let druckStat = null;
  if(druckHeute){
    const mitFang = new Set(faenge.map(c => c.ausflugId).filter(Boolean));
    trips.forEach(a => (a.faenge || []).some(f => f.art) && mitFang.add(a.id));
    const gleich = trips.filter(a => a.wetter && a.wetter.luftdruck === druckHeute);
    if(gleich.length >= 3) druckStat = { trend: druckHeute, n: gleich.length, ok: gleich.filter(a => mitFang.has(a.id)).length };
  }
  return { liste, gesamt: faenge.length, druckStat, map: Object.fromEntries(liste.map(e => [e.fischId, e])) };
}

export function erfahrungHTML(erf, ortName){
  if(!erf.gesamt) return `<div class="h-karte h-erf"><h3>Deine Erfahrung</h3>
    <p class="hinweis-klein">Noch keine Fänge im Fangbuch. Trag deine Fänge mit Uhrzeit und Setup ein (am besten mit Ausflug und Wetter). Dann zeigt dir die App hier, was bei dir unter ähnlichen Bedingungen funktioniert hat.</p></div>`;
  const zeile = e => {
    const info = [e.tz ? (e.n > 1 ? "Meist " : "Gefangen ") + e.tz : "", e.setup ? "mit " + e.setup : "", e.koeder ? "Köder: " + e.koeder : "", e.groesster ? `größter ${e.groesster.laenge} cm` : ""].filter(Boolean);
    return `<li><div class="h-erf-kopf"><b>${esc(fischName(e.fischId))}</b><span class="mono" title="ähnliche Fänge von allen dieser Art">${e.n} von ${e.gesamt}</span></div>
      <small>${esc(e.gruende.join(" · "))}</small>
      ${info.length ? `<p>${esc(info.join(" · "))}</p>` : ""}</li>`;
  };
  const ds = erf.druckStat;
  return `<div class="h-karte h-erf"><h3>Deine Erfahrung bei solchen Bedingungen</h3>
    ${erf.liste.length ? `<ul class="h-erf-liste">${erf.liste.slice(0, 3).map(zeile).join("")}</ul>`
      : `<p class="hinweis-klein">Unter solchen Bedingungen (Ort, Monat, Luftdruck, Temperatur) hast du noch nichts eingetragen. Heute sammelst du neue Erfahrung.</p>`}
    ${ds ? `<p class="h-erf-druck">Bei ${esc(ds.trend)}em Luftdruck hattest du in <b>${ds.ok} von ${ds.n}</b> Ausflügen Fang.</p>` : ""}
    <p class="hinweis-klein">${erf.gesamt < 10 ? `Erst ${erf.gesamt} ${erf.gesamt > 1 ? "Fänge" : "Fang"} im Fangbuch: ein erster Hinweis, noch keine Statistik.` : `Aus ${erf.gesamt} Fängen in deinem Fangbuch.`} Als ähnlich zählt ein Fang am selben Ort oder in derselben Jahreszeit bei passendem Wetter.</p>
  </div>`;
}

/* ---------- Schonzeit-Kachel ---------- */
const tagDE = iso => new Date(iso + "T12:00:00").toLocaleDateString("de-DE", { day: "numeric", month: "long" });
export function schonzeitHTML(){
  if(typeof RECHT_SH === "undefined") return "";
  const heute = tagISO(0);
  const aktiv = [], bald = [], geschuetzt = [];
  Object.entries(RECHT_SH).forEach(([id, r]) => {
    if(!FISCHE.find(f => f.id === id)) return;
    if(r.schutz && /ganzjährig/i.test(r.schonzeit)){ geschuetzt.push(fischName(id)); return; }
    const sp = schonzeitSpanne(r.schonzeit);
    if(!sp) return;
    const jetzt = inSpanne(sp, heute);
    let wechsel = null;
    for(let d = 1; d <= 14; d++){ if(inSpanne(sp, tagISO(d)) !== jetzt){ wechsel = d; break; } }
    const endeISO = jetzt ? (() => { for(let d = 1; d <= 366; d++) if(!inSpanne(sp, tagISO(d))) return tagISO(d - 1); })() : null;
    if(jetzt) aktiv.push({ name: fischName(id), bis: endeISO, frei: wechsel });
    else if(wechsel) bald.push({ name: fischName(id), ab: tagISO(wechsel), in: wechsel });
  });
  if(!aktiv.length && !bald.length && !geschuetzt.length) return "";
  return `<div class="h-karte h-schon"><h3>Schonzeiten in SH</h3>
    <ul class="h-schon-liste">
      ${bald.map(x => `<li class="bald"><b>${esc(x.name)}</b><span>Schonzeit ab ${esc(tagDE(x.ab))} · in ${x.in} Tag${x.in > 1 ? "en" : ""}</span></li>`).join("")}
      ${aktiv.map(x => `<li class="aktiv${x.frei ? " endet" : ""}"><b>${esc(x.name)}</b><span>${x.frei ? `frei ab ${esc(tagDE(tagISO(x.frei)))} · in ${x.frei} Tag${x.frei > 1 ? "en" : ""}` : `geschont bis ${esc(tagDE(x.bis))}`}</span></li>`).join("")}
    </ul>
    ${geschuetzt.length ? `<p class="hinweis-klein">Ganzjährig geschützt: ${esc(geschuetzt.join(", "))}.</p>` : ""}
    <p class="hinweis-klein">Gesetzliche Orientierungswerte für Schleswig-Holstein. Gewässerordnung und Erlaubnisschein können strenger sein.</p></div>`;
}
