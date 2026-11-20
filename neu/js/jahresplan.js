/* ============================================================
   Jahresplaner
   Für jeden Fisch, den du mit deinem Gerät beangeln kannst: Monat für
   Monat Top-Zeit, möglich oder Schonzeit (tagesgenau, auch halbe
   Monate). Dazu in „Heute“ die Vorschau: welche Top-Zeit beginnt in
   den nächsten drei Wochen – und ist das passende Setup bereit?
   ============================================================ */
import { TOPMONATE, rechtFuer, schonzeitSpanne, inSpanne, tagISO } from "./lage.js";
import { pflegeVon } from "./setups.js";
import { tasche } from "./tasche.js";

const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[c]));
const MON = ["Jan", "Feb", "Mär", "Apr", "Mai", "Jun", "Jul", "Aug", "Sep", "Okt", "Nov", "Dez"];
const MON_L = ["Januar", "Februar", "März", "April", "Mai", "Juni", "Juli", "August", "September", "Oktober", "November", "Dezember"];
const GW = { ostsee: "Ostsee", nordsee: "Nordsee", see: "See", nok: "Kanal", eider: "Eider", elbe: "Elbe", forellensee: "Forellensee", kutter: "Kutter" };
const RANG = { machbar: 0, bedingt: 1, wunsch: 2 };

/* bestes eigenes Setup je Fisch über alle Gewässer */
function bestesFuer(f){
  const b = f.ansaetze.map(a => ({ a, b: BERATER.bewerte(a, null) })).filter(x => x.b).sort((x, y) => RANG[x.b.status] - RANG[y.b.status])[0];
  return b ? { status: b.b.status, setup: b.b.bester ? b.b.bester.setup : null, methode: b.a.methode.split(" – ")[0], braucht: b.a.braucht } : null;
}
/* Monatsstatus: schon (ganz), teils (Schonzeit endet/beginnt im Monat), top, geht */
function monatStatus(id, m){
  const r = typeof RECHT_SH !== "undefined" ? RECHT_SH[id] : null;
  if(r && r.schutz && /ganzjährig/i.test(r.schonzeit)) return "geschuetzt";
  const sp = r ? schonzeitSpanne(r.schonzeit) : null;
  if(sp){
    const jahr = new Date().getFullYear();
    const tage = new Date(jahr, m, 0).getDate();
    let n = 0;
    for(let d = 1; d <= tage; d++) if(inSpanne(sp, `${jahr}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`)) n++;
    if(n === tage) return "schon";
    if(n > 0) return (TOPMONATE[id] || []).includes(m) ? "teils-top" : "teils";
  } else if(r && rechtFuer(id, m).status === "schonzeit") return "schon";
  return (TOPMONATE[id] || []).includes(m) ? "top" : "geht";
}

function zeilen(){
  return FISCHE.map(f => ({ f, b: bestesFuer(f) })).filter(x => x.b && x.b.status !== "wunsch" && TOPMONATE[x.f.id]);
}

export function jahresplanHTML(){
  const jetzt = new Date().getMonth() + 1;
  const liste = zeilen();
  const LEG = { top: "Top-Zeit", geht: "möglich", schon: "Schonzeit", teils: "Schonzeit beginnt/endet", "teils-top": "Top-Zeit, Schonzeit beginnt/endet", geschuetzt: "geschützt" };
  return `<section class="wissen jp">
    <a class="zurueck sichtbar" href="#wissen">‹ Wissen</a>
    <p class="eyebrow">Wissen</p>
    <h2>Jahresplaner</h2>
    <p class="lead-klein">Welche Fische du mit deinem Gerät wann beangeln kannst – Top-Zeit, möglich oder Schonzeit, tagesgenau aus den Regeln für Schleswig-Holstein.</p>
    <div class="jp-tabelle" role="table" aria-label="Jahresplaner">
      <div class="jp-kopf" role="row"><span role="columnheader">Fisch</span>${MON.map((m, i) => `<span role="columnheader" class="${i + 1 === jetzt ? "jetzt" : ""}" title="${MON_L[i]}">${m.charAt(0)}</span>`).join("")}</div>
      ${liste.map(({ f, b }) => `<div class="jp-zeile" role="row">
        <span role="rowheader" class="jp-fisch"><b>${esc(f.name.split(" (")[0])}</b><small>${esc((f.gewaesser || []).map(g => GW[g] || g).join(", "))}</small></span>
        ${MON.map((m, i) => { const st = monatStatus(f.id, i + 1); return `<span role="cell" class="jp-m ${st}${i + 1 === jetzt ? " jetzt" : ""}" title="${MON_L[i]}: ${LEG[st]}"></span>`; }).join("")}
      </div>`).join("")}
    </div>
    <p class="jp-legende"><span class="jp-m top"></span>Top-Zeit <span class="jp-m geht"></span>möglich <span class="jp-m teils"></span>Schonzeit beginnt/endet im Monat <span class="jp-m schon"></span>Schonzeit</p>
    <p class="hinweis-klein">Nur Fische, für die du ein passendes Setup hast (grün oder gelb im Berater). Gewässerordnung und Erlaubnisschein können strenger sein.</p>
  </section>`;
}

/* Vorschau für „Heute“: Top-Zeiten, die in den nächsten 21 Tagen beginnen */
export function saisonVorschauHTML(){
  const heute = tagISO(0), mHeute = +heute.slice(5, 7);
  const t = tasche();
  const out = [];
  zeilen().forEach(({ f, b }) => {
    const top = TOPMONATE[f.id] || [];
    for(let d = 1; d <= 21; d++){
      const iso = tagISO(d), m = +iso.slice(5, 7);
      const r = rechtFuer(f.id, m, iso), rGestern = rechtFuer(f.id, +tagISO(d - 1).slice(5, 7), tagISO(d - 1));
      const frei = r.status !== "schonzeit" && r.status !== "geschuetzt";
      const topJetzt = top.includes(m) && frei;
      const topVorher = top.includes(+tagISO(d - 1).slice(5, 7)) && rGestern.status !== "schonzeit" && rGestern.status !== "geschuetzt";
      if(topJetzt && !topVorher && !(d === 1 && top.includes(mHeute) && rechtFuer(f.id, mHeute, heute).status !== "schonzeit")){
        const s = b.setup;
        const p = s ? pflegeVon(s.key, s.kategorie === "stippe", s.schnurInfo && s.schnurInfo.seit) : null;
        out.push({ f, iso, d, s, status: b.status, wartung: p && (p.wartungFaellig || p.schnurFaellig), inTasche: s && t.setups.includes(s.key) });
        break;
      }
    }
  });
  if(!out.length) return "";
  out.sort((a, b) => a.d - b.d);
  return `<div class="h-karte h-vorschau"><h3>Saison-Vorschau</h3><ul class="jp-vorschau">${out.slice(0, 4).map(x => `<li>
      <b>${esc(new Date(x.iso + "T12:00:00").toLocaleDateString("de-DE", { day: "numeric", month: "long" }))}: Top-Zeit ${esc(x.f.name.split(" (")[0])}</b>
      <span>${x.s ? `${x.status === "machbar" ? "Passt" : "Geht mit Abstrichen"}: <a href="#rutenwand/${esc(x.s.key)}">${esc(String(x.s.name).split(" · ")[0])}</a>${x.wartung ? " – vorher Pflege fällig" : x.inTasche ? " – liegt schon in der Tasche" : ""}` : "kein Setup"}</span></li>`).join("")}</ul>
    <p class="hinweis-klein"><a href="#wissen/jahr">Ganzes Jahr im Jahresplaner ›</a></p></div>`;
}
