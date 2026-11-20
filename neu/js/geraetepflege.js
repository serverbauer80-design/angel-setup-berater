/* ============================================================
   Gerätepflege nach Einsatz
   Ergänzt die festen Fristen (Wartung 180 Tage, Schnur 4 Monate) um
   das, was wirklich zählt: wie oft und wo du gefischt hast.
   Gezählt werden Angeltage je Setup aus Ausflügen und Fängen –
   Küste (Salzwasser) gesondert. Hinweise nur in der App.
   ============================================================ */
import { lese, schreibe, pflege, ladeFaengeDaten } from "./store.js";
import { alleSetups, pflegeVon, heuteISO, datumDE } from "./setups.js";
import { ausfluege } from "./tagebuch.js";
import { alleFaenge } from "./fangbuch.js";
import { tasche } from "./tasche.js";

const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[c]));
const QUITT_KEY = "neu_pflege_quitt_v1";
const tageZw = (a, b) => Math.round((new Date(b + "T12:00:00") - new Date(a + "T12:00:00")) / 864e5);

/* Angeltage je Setup: { datum -> salz? } */
function einsaetze(){
  const spots = Object.fromEntries(ladeFaengeDaten().spots.map(s => [s.id, s]));
  const salz = spotId => { const s = spots[spotId]; return !!s && (s.type === "kueste" || /ostsee|nordsee|strand|küste|mole|buhne/i.test(s.name || "")); };
  const m = {};
  const add = (key, datum, spotId) => {
    if(!key || !/^\d{4}-\d\d-\d\d$/.test(datum || "")) return;
    const t = (m[key] = m[key] || {});
    t[datum] = t[datum] || salz(spotId);
  };
  ausfluege().forEach(a => add(a.setup, a.datum, a.spotId));
  alleFaenge().forEach(c => { if(!c.setupGeraten) add(c.setup, c.datum, c.spotId); });
  return m;
}

/* Zähler für ein Setup seit der letzten Wartung */
export function einsatzStand(key, alle){
  const tage = (alle || einsaetze())[key] || {};
  const w = pflege.wartung[key] || null;
  const seit = Object.entries(tage).filter(([d]) => !w || d > w);
  return { gesamt: seit.length, salz: seit.filter(([, s]) => s).length, letzterSalz: Object.entries(tage).filter(([, s]) => s).map(([d]) => d).sort().pop() || null, wartung: w };
}

/* Alle Hinweise; nurKeys: nur diese Setups (z. B. die in der Tasche) – Spül-Hinweise gelten immer */
export function pflegeHinweise(nurKeys){
  const alle = einsaetze();
  const quitt = lese(QUITT_KEY, {}) || {};
  const heute = heuteISO();
  const out = [];
  alleSetups().forEach(s => {
    const e = einsatzStand(s.key, alle);
    const name = s.titel + (s.zusatz ? " (" + s.zusatz + ")" : "");
    const rolle = s.kategorie !== "stippe" && !!s.rolle;
    /* 1) Nach Salzwasser spülen – in den zwei Tagen danach */
    if(rolle && e.letzterSalz && tageZw(e.letzterSalz, heute) <= 2 && !(quitt[s.key] >= e.letzterSalz) && !(e.wartung >= e.letzterSalz)){
      out.push({ key: s.key, name, prio: 1, art: "spuelen", text: `Nach der Küste (${datumDE(e.letzterSalz)}): Rolle und Rute mit lauwarmem Süßwasser abbrausen – nicht abspritzen –, Bremse lockern, offen trocknen lassen.` });
    }
    if(nurKeys && !nurKeys.includes(s.key)) return;
    /* 2) Wartung nach Einsätzen */
    if(rolle){
      if(e.salz >= 3) out.push({ key: s.key, name, prio: 2, art: "wartung", text: `${e.salz} Küsteneinsätze seit der letzten Wartung: Rolle öffnen, Salzreste entfernen, Lager und Schnurlaufröllchen ölen.` });
      else if(e.gesamt >= 15) out.push({ key: s.key, name, prio: 3, art: "wartung", text: `${e.gesamt} Angeltage seit der letzten Wartung: Rolle reinigen und ölen, Bremsscheiben prüfen.` });
      else if(!e.wartung && e.gesamt >= 5) out.push({ key: s.key, name, prio: 4, art: "wartung", text: `${e.gesamt} Angeltage und noch keine Wartung eingetragen – einmal reinigen und ölen, dann Datum setzen.` });
    }
    /* 3) Schnur je nach Art */
    const si = s.schnurInfo;
    if(rolle && si){
      const p = pflegeVon(s.key, false, si.seit);
      const monate = p.schnurTage != null ? p.schnurTage / 30 : null;
      if(si.art === "geflecht" && monate != null){
        if(monate >= 24) out.push({ key: s.key, name, prio: 2, art: "schnur", text: `Geflecht ist ${Math.floor(monate / 12)} Jahre alt – erneuern. Ausgeblichen und rau verliert es spürbar Tragkraft.` });
        else if(monate >= 12) out.push({ key: s.key, name, prio: 4, art: "schnur", text: `Geflecht seit über einem Jahr drauf: die vorderen 20–30 m abschneiden oder die Schnur umspulen (wenden) – der hintere Teil ist wie neu.` });
      } else if((si.art === "mono" || si.art === "fc") && monate != null && monate >= 4){
        out.push({ key: s.key, name, prio: 3, art: "schnur", text: `${si.art === "fc" ? "Fluorocarbon" : "Monofile"} ist ${Math.round(monate)} Monate alt – sie altert durch Licht und Kringel. Spätestens zur neuen Saison wechseln.` });
      }
    }
  });
  return out.sort((a, b) => a.prio - b.prio);
}

export function spuelenQuittieren(key){
  const q = lese(QUITT_KEY, {}) || {};
  q[key] = heuteISO();
  schreibe(QUITT_KEY, q);
}

/* Karte in „Heute“: Spül-Hinweise immer, sonst nur für die Setups in der Tasche */
export function pflegeKarteHTML(){
  const t = tasche();
  const h = pflegeHinweise(t.setups);
  if(!h.length) return "";
  return `<div class="h-karte h-pflege"><h3>Gerät-Check</h3><ul class="pf-liste">${h.slice(0, 5).map(x => `<li class="pf-${x.art}">
      <b>${esc(x.name)}</b><span>${esc(x.text)}</span>
      <span class="pf-akt">${x.art === "spuelen" ? `<button type="button" class="knopf klein" data-pf-gespuelt="${esc(x.key)}">Erledigt</button>`
        : x.art === "wartung" ? `<button type="button" class="knopf klein" data-pf-gewartet="${esc(x.key)}">Heute gewartet</button>`
        : `<button type="button" class="knopf klein leise" data-zu-pflege="${esc(x.key)}">Zur Pflege ›</button>`}</span></li>`).join("")}</ul>
    <p class="hinweis-klein">Gezählt aus deinen Ausflügen und Fängen mit Setup-Angabe. ${t.setups.length ? "Spül-Hinweise gelten für alle Ruten, alles andere für die Setups in der Tasche." : "Spül-Hinweise gelten für alle Ruten – leg Setups in die Tasche, dann prüft die App auch Wartung und Schnur."}</p></div>`;
}

/* Zeile für den Pflege-Reiter eines Setups */
export function einsatzZeileHTML(key){
  const e = einsatzStand(key);
  if(!e.gesamt) return "";
  return `<p class="hinweis-klein pf-zaehler">Seit ${e.wartung ? "der letzten Wartung" : "Beginn der Aufzeichnung"}: <b>${e.gesamt} Angeltag${e.gesamt > 1 ? "e" : ""}</b>${e.salz ? `, davon <b>${e.salz} an der Küste</b>` : ""}. Faustregel: nach 3 Küsteneinsätzen oder 15 Angeltagen warten.</p>`;
}
