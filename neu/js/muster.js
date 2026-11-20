/* ============================================================
   Was bei dir funktioniert – Muster aus deinen Ausflügen
   Für jede Bedingung (Luftdruck, Wind, Himmel, Temperatur, Mond,
   Startzeit) der Anteil deiner Ausflüge mit Fang. Gezählt werden nur
   Ausflüge – auch die ohne Fang, sonst wäre die Quote geschönt.
   musterHeute() prüft, ob die Lage heute zu deinen guten Tagen passt.
   ============================================================ */
import { ausfluege } from "./tagebuch.js";
import { ladeFaengeDaten } from "./store.js";
import { mondphase } from "./lage.js";

const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[c]));

const windKmh = w => { const m = String(w || "").match(/(\d+)\s*km/); return m ? +m[1] : null; };
const windKl = n => n == null ? null : n < 10 ? "schwach (< 10 km/h)" : n <= 25 ? "mäßig (10–25 km/h)" : "stark (> 25 km/h)";
const tempKl = t => t == null || t === "" ? null : +t < 5 ? "kalt (< 5 °C)" : +t < 12 ? "kühl (5–12 °C)" : +t < 20 ? "mild (12–20 °C)" : "warm (≥ 20 °C)";
const mondKl = iso => { const p = mondphase(iso).name; return /neumond/i.test(p) ? "Neumond" : /vollmond/i.test(p) ? "Vollmond" : /zunehm|erstes/i.test(p) ? "zunehmend" : "abnehmend"; };
const startKl = v => { const h = parseInt(String(v || "").slice(0, 2), 10); return isNaN(h) ? null : h < 8 ? "früh (vor 8 Uhr)" : h < 12 ? "vormittags" : h < 17 ? "nachmittags" : "abends (ab 17 Uhr)"; };
const himmelKl = b => !b ? null : /regen/i.test(b) ? "Regen" : /klar|sonnig/i.test(b) ? "klar / sonnig" : /leicht/i.test(b) ? "leicht bewölkt" : "bewölkt / bedeckt";

export const DIMENSIONEN = [
  { id: "druck", titel: "Luftdruck", wert: a => a.wetter && a.wetter.luftdruck || null },
  { id: "wind", titel: "Wind", wert: a => windKl(windKmh(a.wetter && a.wetter.wind)) },
  { id: "himmel", titel: "Himmel", wert: a => himmelKl(a.wetter && a.wetter.bewoelkung) },
  { id: "temp", titel: "Lufttemperatur", wert: a => tempKl(a.wetter && a.wetter.temp) },
  { id: "mond", titel: "Mond", wert: a => a.datum ? mondKl(a.datum) : null },
  { id: "start", titel: "Losgegangen", wert: a => startKl(a.von) }
];

function ausfluegeMitErgebnis(){
  const alle = ladeFaengeDaten().catches;
  return ausfluege().map(a => ({ a, ok: (a.faenge || []).some(x => x.art) || alle.some(c => c.ausflugId === a.id) }));
}

export function muster(){
  const liste = ausfluegeMitErgebnis();
  const gesamt = liste.length ? liste.filter(x => x.ok).length / liste.length : 0;
  return { n: liste.length, quote: gesamt, dims: DIMENSIONEN.map(d => {
    const m = new Map();
    liste.forEach(({ a, ok }) => { const k = d.wert(a); if(!k) return; const e = m.get(k) || { k, n: 0, ok: 0 }; e.n++; if(ok) e.ok++; m.set(k, e); });
    return { ...d, gruppen: [...m.values()].sort((x, y) => y.ok / y.n - x.ok / x.n || y.n - x.n) };
  }) };
}

/* Auffällige Muster: mind. 3 Ausflüge in der Gruppe und deutlich besser als dein Schnitt */
export function auffaellig(mu = muster()){
  if(mu.n < 6) return [];
  return mu.dims.map(d => {
    const g = d.gruppen.find(x => x.n >= 3 && x.ok / x.n >= mu.quote + 0.15);
    return g ? { dim: d, g } : null;
  }).filter(Boolean);
}

export function musterHTML(){
  const mu = muster();
  if(mu.n < 3) return `<section class="fb-stat"><h3>Deine Muster</h3><p class="hinweis-klein">Ab drei gespeicherten Ausflügen (auch ohne Fang – am einfachsten mit dem Live-Modus) zeigt die App, bei welchem Wetter, Wind und Mond es bei dir läuft.</p></section>`;
  const au = auffaellig(mu);
  const q = x => Math.round(x * 100);
  return `<section class="fb-stat mu"><h3>Deine Muster</h3>
    <p>${mu.n} Ausflüge, davon ${q(mu.quote)} % mit Fang.</p>
    ${au.length ? `<ul class="mu-fazit">${au.map(({ dim, g }) => `<li><b>${esc(dim.titel)} ${esc(g.k)}:</b> ${g.ok} von ${g.n} Ausflügen mit Fang (${q(g.ok / g.n)} %)</li>`).join("")}</ul>`
      : `<p class="hinweis-klein">${mu.n < 6 ? "Noch zu wenige Ausflüge für klare Muster – ab etwa sechs wird es interessant." : "Kein Muster sticht deutlich heraus – du fängst bei ganz unterschiedlichen Bedingungen."}</p>`}
    <div class="mu-dims">${mu.dims.filter(d => d.gruppen.length).map(d => `<details><summary>${esc(d.titel)}</summary><ul class="fb-balken">${d.gruppen.map(g => `<li><span class="fb-b-label">${esc(g.k)}<small>${g.ok} von ${g.n} mit Fang</small></span>
        <span class="fb-b-spur"><span style="width:${Math.max(g.ok ? 3 : 0, g.ok / g.n * 100)}%"></span></span><b class="fb-b-wert">${q(g.ok / g.n)} %</b></li>`).join("")}</ul></details>`).join("")}</div>
    <p class="hinweis-klein">Zählt nur gespeicherte Ausflüge. Wenige Ausflüge je Gruppe = Zufall möglich.</p>
  </section>`;
}

/* Passt die Lage heute zu deinen guten Tagen? lage: aus tagesLage() */
export function musterHeute(lage, iso){
  const au = auffaellig(); if(!au.length || !lage) return "";
  const heute = {
    druck: /fallend/.test(lage.trend || "") ? "fallend" : /steigend/.test(lage.trend || "") ? "steigend" : "stabil",
    wind: windKl(Math.round(lage.wind)), himmel: (lage.regenMax || 0) >= 60 ? "Regen" : himmelKl(lage.wolken < 20 ? "klar" : lage.wolken < 50 ? "leicht bewölkt" : "bedeckt"),
    temp: tempKl(Math.round(lage.temp)), mond: mondKl(iso), start: null
  };
  const treffer = au.filter(({ dim, g }) => heute[dim.id] === g.k);
  return treffer.length ? `Passt zu deinen guten Tagen: ${treffer.map(({ dim, g }) => `${dim.titel} ${g.k}`).join(", ")}.` : "";
}
