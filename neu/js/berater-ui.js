/* ============================================================
   Berater-Oberfläche (Etappe 3)
   - beraterHTML(): „Was willst du fangen?“ – Fisch + Gewässer -> Ansätze
     mit dem besten eigenen Setup, Begründung, Alternativen und Montage
   - fischeHTML(): Reiter „Fische“ im Setup-Detail – wofür taugt die Rute?
   Die Bewertung selbst steckt in ../berater.js (gemeinsam mit der alten App).
   ============================================================ */
import { lese, schreibe } from "./store.js";
import { angelartFuer } from "./angelarten.js";
import { inTascheFuer } from "./tasche.js";
import { knotenLinks } from "./knoten.js";

const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[c]));
const komma = v => String(v).replace(".", ",");
const AMPEL = ["g", "y", "r"];
const STATUS = { machbar: ["g", "Passt"], bedingt: ["y", "Geht mit Abstrichen"], wunsch: ["w", "Wunschliste"] };
const gwName = k => GEWAESSER[k] ? GEWAESSER[k].name : k;
const kurz = s => esc(String(s.name || "").split(" · ")[0]) + (String(s.name).match(/\(([^)]+)\)\s*$/) ? ` <small>(${esc(s.name.match(/\(([^)]+)\)\s*$/)[1])})</small>` : "");

const KEY = "neu_berater_v1";
export const bst = Object.assign({ fisch: "", gw: "" }, lese(KEY, {}) || {});
export function merkeBerater(){ schreibe(KEY, bst); }

function kettenHTML(a, set, gw){
  const montage = BERATER.montageFuer(a, set);
  const k = BERATER.koederFuer(a, gw);
  const zeilen = montage.map(m => {
    const echt = /^hauptschnur$/i.test(m.k) && set && set.rolleId;
    return `<li><b>${esc(m.k)}</b><span>${knotenLinks(esc(m.v))}${echt ? ` <em class="quelle">aus deinem Setup</em>` : ""}</span></li>`;
  });
  if(k) zeilen.push(`<li><b>Gesamtgewicht am Wurf</b><span>≈ ${komma(k[0])}–${komma(k[1])} g (Blei/Jigkopf + Köder)</span></li>`);
  return zeilen.length ? `<ol class="kette">${zeilen.join("")}</ol>` : "";
}

function grundHTML(plus, gruende, hinweise){
  const p = (plus || []).map(t => `<li class="plus">${esc(t)}</li>`).join("");
  const m = (gruende || []).map(t => `<li class="minus">${esc(t)}</li>`).join("");
  const h = (hinweise || []).map(t => `<li class="info">${esc(t)}</li>`).join("");
  return p || m || h ? `<ul class="gruende">${p}${m}${h}</ul>` : "";
}

/* ---------- Reiter „Fische“ im Setup-Detail ---------- */
export function fischeAnzahl(key){ return BERATER.fuerSetup(key).length; }

export function fischeHTML(key, catches){
  const liste = BERATER.fuerSetup(key);
  const set = AKTUELL[key];
  if(!set) return "";
  if(!liste.length){
    const grund = set.kategorie === "stippe" ? "" : !set.rolleId ? " Es ist keine Rolle montiert – setz im Reiter „Kombi“ eine auf, dann prüft der Berater neu." : "";
    return `<p class="leer">Für dieses Setup passt gerade kein Ansatz aus dem Berater.${grund}</p>`;
  }
  const n1 = liste.filter(x => x.platz === 1).length;
  return `<p class="hinweis-klein">Der Berater prüft jedes Setup gegen Wurfgewicht, Schnur, Länge und Freilauf. ${n1 ? `Bei <b>${n1}</b> ${n1 === 1 ? "Ansatz" : "Ansätzen"} ist dieses Setup deine beste Wahl.` : "Für jeden Ansatz gibt es ein Setup, das noch besser passt – es steht jeweils dabei."}</p>` +
    liste.map(x => {
      const zahl = catches.filter(c => c.fischId === x.fisch.id && c.methode === x.ansatz.methode).length;
      const gwTxt = [x.gwGruen.length ? "passt: " + x.gwGruen.map(gwName).join(" · ") : "", x.gwGelb.length ? "knapp: " + x.gwGelb.map(gwName).join(" · ") : ""].filter(Boolean).join("  ·  ");
      const rang = x.platz === 1 ? `<span class="pill rang1">beste Wahl</span>` : `<span class="pill">Platz ${x.platz}</span>`;
      const besser = x.besser.length ? `<p class="besser">Passt noch besser: ${x.besser.slice(0, 2).map(s => `<a href="#rutenwand/${s.key}">${kurz(s)}</a>`).join(", ")}</p>` : "";
      return `<details class="ansatz">
        <summary><span class="amp ${AMPEL[x.stufe]}" title="${x.stufe ? "geht" : "passt"}"></span>
          <span class="ansatz-txt"><b>${esc(x.fisch.name)}</b><span>${esc(x.ansatz.methode)}</span><small>${esc(gwTxt)}</small></span>
          <span class="ansatz-rechts">${rang}${zahl ? `<span class="pill fang">${zahl > 1 ? zahl + " Fänge" : "1 Fang"}</span>` : ""}</span></summary>
        <div class="ansatz-innen">
          ${grundHTML(x.plus, x.gruende, x.hinweise)}
          ${besser}
          ${kettenHTML(x.ansatz, set, null)}
          ${x.ansatz.tipp ? `<p class="ansatz-tipp">${esc(x.ansatz.tipp)}</p>` : ""}
          ${x.hinweis ? `<p class="ansatz-tipp">${esc(x.hinweis)}</p>` : ""}
          ${mehrLink(x.fisch, x.ansatz)}
        </div>
      </details>`;
    }).join("");
}

/* ---------- Seite „Was willst du fangen?“ ---------- */
export function beraterHTML(){
  const fisch = FISCHE.find(f => f.id === bst.fisch) || null;
  const gws = fisch ? fisch.gewaesser : [];
  if(fisch && bst.gw && !gws.includes(bst.gw)) bst.gw = "";
  let h = `<section class="berater">
    <p class="eyebrow">Berater</p>
    <h2>Was willst du fangen?</h2>
    <div class="berater-wahl">
      <label class="feld"><span>Zielfisch</span><select id="b-fisch"><option value="">– Fisch wählen –</option>${FISCHE.map(f => `<option value="${f.id}"${f.id === bst.fisch ? " selected" : ""}>${esc(f.name)}</option>`).join("")}</select></label>
      <label class="feld"><span>Gewässer</span><select id="b-gw"${fisch ? "" : " disabled"}><option value="">Alle Gewässer</option>${gws.map(k => `<option value="${k}"${k === bst.gw ? " selected" : ""}>${esc(gwName(k))}</option>`).join("")}</select></label>
    </div>`;
  if(!fisch){
    h += `<p class="leer">Wähle einen Fisch. Die App prüft dann alle deine Setups und zeigt dir für jede Methode das passendste – mit Begründung und Montage.</p>`;
  } else {
    const gw = bst.gw || null;
    if(gw && GEWAESSER[gw]) h += `<p class="hinweis-klein">${esc(GEWAESSER[gw].typ)}: ${esc(GEWAESSER[gw].hinweis)}</p>`;
    h += `<p class="fisch-info">${esc(fisch.info || "")}</p>`;
    const ansaetze = fisch.ansaetze.filter(a => !gw || !a.gewaesser || a.gewaesser.includes(gw));
    if(!ansaetze.length) h += `<p class="leer">Für ${esc(fisch.name)} ist an diesem Gewässer keine Methode hinterlegt.</p>`;
    const RANG = { machbar: 0, bedingt: 1, wunsch: 2 };
    const karten = ansaetze.map(a => {
      const b = BERATER.bewerte(a, gw);
      if(!b) return { rang: RANG[a._orig.status] ?? 2, html: altKarte(a) };
      return { rang: RANG[b.status], html: karte(a, b.liste, gw, b.status, fisch) };
    }).sort((x, y) => x.rang - y.rang);
    h += karten.map(k => k.html).join("");
    h += `<p class="hinweis-klein">Schonzeiten und Mindestmaße findest du vorerst im <a href="../index.html?view=saison">Saisonkalender der bisherigen App</a>.</p>`;
  }
  h += `<a class="knopf proto-link" href="#heute/pruefprotokoll">Wie rechnet der Berater? Prüfprotokoll ansehen</a>`;
  return h + `</section>`;
}

function wunschHTML(a){
  const w = a.braucht && typeof WUNSCH !== "undefined" ? WUNSCH[a.braucht] : null;
  return w ? `<div class="wunsch-box"><b>Passt dafür (Wunschliste): ${esc(w.name)}</b><span>${esc([w.rute, w.rolle].filter(Boolean).join(" · "))}</span><span class="preis">${esc(w.preis || "")}</span></div>` : "";
}

function mehrLink(fisch, a){
  const art = angelartFuer(fisch.id, fisch.ansaetze.indexOf(a));
  return art ? `<a class="mehr-link" href="#wissen/${art.id}">Mehr zur Methode: ${esc(art.name)} – mit Schaubild ›</a>` : "";
}

function karte(a, rl, gw, status, fisch) {
  const [farbe, label] = STATUS[status];
  const bester = rl[0] && rl[0].stufe < 2 ? rl[0] : null;
  const gruen = bester ? rl.slice(1).filter(x => x.stufe === 0) : [];
  const gelb = bester ? rl.slice(1).filter(x => x.stufe === 1).slice(0, 2) : [];
  const set = bester ? bester.setup : null;
  const zweck = fisch.id + "#" + fisch.ansaetze.indexOf(a);
  return `<article class="b-karte">
    <div class="b-kopf"><span class="status ${farbe}">${label}</span><h3>${esc(a.methode)}</h3></div>
    ${set ? `<a class="b-setup" href="#rutenwand/${set.key}"><small>Dein bestes Setup</small><b>${kurz(set)}</b><span>${esc(String(set.rolle || "").split(" · ")[0])} · ${esc(String(set.schnur || "").split(" – ")[0])}</span><i>Setup öffnen ›</i></a>
      <button type="button" class="knopf klein ${inTascheFuer(set.key, zweck) ? "" : "prim"} b-tasche" data-tasche="${set.key}" data-zweck="${zweck}">${inTascheFuer(set.key, zweck) ? "✓ In der Tasche" : "In die Tasche"}</button>
      ${grundHTML(bester.plus, bester.gruende, bester.hinweise)}`
      : `<p class="leer">Keins deiner Setups passt hierfür.</p>`}
    ${gruen.length ? `<p class="besser"><span class="amp g"></span> Passt ebenso: ${gruen.map(x => `<a href="#rutenwand/${x.setup.key}">${kurz(x.setup)}</a>`).join(", ")}</p>` : ""}
    ${gelb.length ? `<p class="besser"><span class="amp y"></span> Geht auch (knapp): ${gelb.map(x => `<a href="#rutenwand/${x.setup.key}" title="${esc(x.gruende.join(" · "))}">${kurz(x.setup)}</a>`).join(", ")}</p>` : ""}
    ${status !== "machbar" ? wunschHTML(a) : ""}
    <details class="b-montage"${set ? "" : " open"}><summary>Montage</summary>${kettenHTML(a, set, gw)}</details>
    ${a.tipp ? `<p class="ansatz-tipp">${esc(a.tipp)}</p>` : ""}
    ${a.regel && a.regel.hinweis ? `<p class="ansatz-tipp">${esc(a.regel.hinweis)}</p>` : ""}
    ${mehrLink(fisch, a)}
  </article>`;
}

function altKarte(a){
  const [farbe, label] = STATUS[a._orig.status] || STATUS.wunsch;
  return `<article class="b-karte"><div class="b-kopf"><span class="status ${farbe}">${label}</span><h3>${esc(a.methode)}</h3></div>
    ${wunschHTML(a)}<details class="b-montage"><summary>Montage</summary>${kettenHTML(a, null, null)}</details></article>`;
}
