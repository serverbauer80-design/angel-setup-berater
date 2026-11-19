/* ============================================================
   Rutenwand – neue Oberfläche
   Etappe 1: Gerüst (4 Bereiche, Handy unten / Desktop seitlich) + Rutenwand
   Etappe 2: Ausrüstung in der App pflegen (edit.js, ../ausruestung.js)
   Etappe 3: Berater mit Regeln (berater-ui.js, ../berater.js)
   Etappe 4: Heute mit Lage, Fischauswahl und Tasche (heute.js, lage.js, tasche.js)
   Routing über den Hash: #rutenwand, #rutenwand/setup22, #heute …
   ============================================================ */
import { KEYS, pflege, setzePflege, beiAenderung, ladeFaenge, startSync, sync, anmelden, abmelden, lese, schreibe, leseText, schreibeText } from "./store.js";
import {
  KATEGORIEN, katByKey, alleSetups, gruppiere, pflegeVon, freieRollen, ansaetzeFuer, faengeFuer,
  bewerteKombo, rolleMontiertAuf, wgPos, komma, ersterTeil, heuteISO, datumDE, tageSeit,
  ART_LABEL, ZUSTAND_LABEL, WARTUNG_TAGE, SCHNUR_TAGE
} from "./setups.js";
import { beraterHTML, fischeHTML, fischeAnzahl, bst, merkeBerater } from "./berater-ui.js";
import { protokollHTML } from "./protokoll.js";
import { wissenHTML } from "./wissen.js";
import { heuteHTML, heuteNachladen, hst, merkeHeute, fischWaehlen } from "./heute.js";
import { umschalten, abhaken, leeren, nurHakenWeg, inTasche } from "./tasche.js";
import { initEdit, ruteBearbeiten, neueRute, rolleBearbeiten, neueRolle, montiere, schnurWechseln, schnurDatum, zurueckholen, tragkraftEintragen } from "./edit.js";

const $ = s => document.querySelector(s);
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[c]));
const desktop = window.matchMedia("(min-width: 900px)");
const meter = v => komma(Number(v).toFixed(2)) + " m";

/* ---------- Bereiche ---------- */
const ICON = {
  heute: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="12" cy="12" r="4"/><path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4"/></svg>',
  rutenwand: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M4.5 20.5L19 3.5M8.5 20.5L20.5 7"/><circle cx="16.5" cy="15.5" r="2.3"/><path d="M14.4 14.3l-2.2-.9"/></svg>',
  gewaesser: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><path d="M12 21s-6.5-5.9-6.5-11A6.5 6.5 0 0 1 18.5 10c0 5.1-6.5 11-6.5 11z"/><circle cx="12" cy="10" r="2.4"/></svg>',
  fangbuch: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><path d="M2.5 12c3-4.2 8.2-5.2 12.3-3l4.7-3.3v12.6l-4.7-3.3C10.7 17.2 5.5 16.2 2.5 12z"/><circle cx="7.6" cy="11.2" r=".9" fill="currentColor"/></svg>',
  wissen: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><path d="M4 5.5C6.5 4.3 9.5 4.3 12 6c2.5-1.7 5.5-1.7 8-.5V19c-2.5-1.2-5.5-1.2-8 .5-2.5-1.7-5.5-1.7-8-.5z"/><path d="M12 6v13.5"/></svg>'
};
const BEREICHE = [
  { id:"heute",     label:"Heute" },
  { id:"rutenwand", label:"Rutenwand" },
  { id:"gewaesser", label:"Gewässer" },
  { id:"fangbuch",  label:"Fangbuch" },
  { id:"wissen",    label:"Wissen" }
];
/* Was in Etappe 1 noch in der bisherigen App lebt (?view= öffnet dort den Reiter) */
const NOCH_ALT = {
  heute: { etappe: 4, text: "Wetter, Wind, Gezeiten und welcher Fisch heute passt – daraus wird eine „Tasche für heute“ mit Packliste.",
    links: [["heute","Heute"],["tagescheck","Tagescheck"],["berater","Berater"],["wochenende","Planung"]] },
  gewaesser: { etappe: 5, text: "Eine Karte für alles: LAV-Gewässer, Dänemark Put & Take, deine Spots, OSM und Küste als Ebenen, mit Steckbrief pro Gewässer.",
    links: [["lav","LAV-Gewässer"],["dkpt","Dänemark"],["faenge","Fänge & Spots"]] },
  fangbuch: { etappe: 6, text: "Fänge und Tagebuch in einem Verlauf, mit Statistik pro Setup, Spot und Uhrzeit.",
    links: [["faenge","Fänge & Spots"],["tagebuch","Tagebuch"]] }
};

/* ---------- Zustand ---------- */
const st = {
  bereich: "rutenwand",
  setup: null,          // gewählte Gruppen-ID (Schlüssel des ersten Setups)
  tab: "infos",
  filter: leseText(KEYS.filter, "alle"),
  suche: ""
};
let SETUPS = alleSetups();
let GRUPPEN = gruppiere(SETUPS);

const pv = x => pflegeVon(x.key, x.kategorie === "stippe", x.schnurInfo && x.schnurInfo.seit);
function neuAufbauen(){ SETUPS = alleSetups(); GRUPPEN = gruppiere(SETUPS); }

function gruppeZu(key){ return GRUPPEN.find(g => g.glieder.some(s => s.key === key)) || null; }

/* ---------- Routing ---------- */
function leseHash(){
  const h = decodeURIComponent(location.hash.replace(/^#/, ""));
  const [b, s] = h.split("/");
  st.bereich = BEREICHE.some(x => x.id === b) ? b : "rutenwand";
  st.protokoll = st.bereich === "heute" && s === "pruefprotokoll";
  st.wissen = st.bereich === "wissen" ? (s || null) : null;
  const g = s ? gruppeZu(s) : null;
  if(g && g.id !== st.setup) st.tab = "infos";
  st.setup = g ? g.id : null;
}
function geheZu(bereich, setup){
  const ziel = "#" + bereich + (setup ? "/" + setup : "");
  if(location.hash !== ziel) location.hash = ziel; else render();
}
window.addEventListener("hashchange", () => { leseHash(); render(); window.scrollTo(0, 0); });

/* ---------- Navigation ---------- */
function renderNav(){
  const item = (b, cls) => `<a class="${cls}${st.bereich === b.id ? " on" : ""}" href="#${b.id}"${st.bereich === b.id ? ' aria-current="page"' : ""}>${ICON[b.id]}<span>${b.label}</span></a>`;
  $("#tabbar").innerHTML = BEREICHE.map(b => item(b, "tab")).join("");
  $("#seite-nav").innerHTML = BEREICHE.map(b => item(b, "seite-link")).join("");
  const titel = BEREICHE.find(b => b.id === st.bereich).label;
  $("#kopf-titel").textContent = titel;
  document.title = titel === "Rutenwand" ? "Rutenwand" : titel + " · Rutenwand";
}

/* ---------- Rutenwand: Liste ---------- */
function passtFilter(g){
  const s = g.kopf;
  if(st.filter === "achtung"){
    if(!g.glieder.some(x => { const p = pv(x); return p.wartungFaellig || p.schnurFaellig || x.zustand !== "bereit"; })) return false;
  } else if(st.filter !== "alle" && s.kategorie !== st.filter) return false;
  if(st.suche){
    const q = st.suche.toLowerCase();
    const heu = [s.titel, s.zusatz, s.rolleName, s.schnurText, s.roh.einsatz, katByKey[s.kategorie]?.titel].join(" ").toLowerCase();
    if(!q.split(/\s+/).every(w => heu.includes(w))) return false;
  }
  return true;
}

function wgHTML(s){
  if(!s.wg) return `<div class="wg ohne"><span>${s.kategorie === "stippe" ? "Stippe · Schnur fest an der Spitze" : "kein Wurfgewicht hinterlegt"}</span></div>`;
  const a = wgPos(s.wg[0]), b = wgPos(s.wg[1]);
  return `<div class="wg"><div class="wgbar" aria-hidden="true"><span style="left:${a.toFixed(1)}%;width:${Math.max(2, b - a).toFixed(1)}%"></span></div><span class="wglbl">${komma(s.wg[0])}–${komma(s.wg[1])} g</span></div>`;
}

function pillsHTML(g){
  const s = g.kopf;
  const out = [];
  if(s.art) out.push(`<span class="pill ${s.art.replace(" ", "-")}">${ART_LABEL[s.art] || s.art}${s.dm ? " " + s.dm : ""}</span>`);
  if(g.glieder.length > 1) out.push(`<span class="pill anzahl">×${g.glieder.length}</span>`);
  if(s.zustand !== "bereit") out.push(`<span class="pill zustand-${s.zustand}">${ZUSTAND_LABEL[s.zustand]}</span>`);
  const p = g.glieder.map(x => pv(x));
  if(p.some(x => x.wartungFaellig)) out.push(`<span class="pill warn">Wartung fällig</span>`);
  if(p.some(x => x.schnurFaellig)) out.push(`<span class="pill warn">Schnur alt</span>`);
  return out.join("");
}

function karteHTML(g){
  const s = g.kopf;
  const sel = st.setup === g.id;
  return `<a class="sk${sel ? " sel" : ""}${s.zustand === "verkauf" ? " blass" : ""}" href="#rutenwand/${g.id}"${sel ? ' aria-current="true"' : ""}>
    <span class="sk-top"><span class="sk-name">${esc(s.titel)}${s.zusatz && !/verkauf/i.test(s.zusatz) ? ` <small>${esc(s.zusatz)}</small>` : ""}</span><span class="sk-len">${s.laenge ? meter(s.laenge) : ""}</span></span>
    <span class="sk-rolle">${esc(s.rolleName || "keine Rolle")}</span>
    ${wgHTML(s)}
    <span class="sk-foot">${pillsHTML(g)}</span>
  </a>`;
}

function listeHTML(){
  const sichtbar = GRUPPEN.filter(passtFilter);
  const zahl = k => GRUPPEN.filter(g => g.kopf.kategorie === k).reduce((n, g) => n + g.glieder.length, 0);
  const achtung = GRUPPEN.filter(g => g.glieder.some(x => { const p = pv(x); return p.wartungFaellig || p.schnurFaellig || x.zustand !== "bereit"; })).length;
  const chips = [["alle", "Alle", SETUPS.length], ...KATEGORIEN.filter(k => zahl(k.key)).map(k => [k.key, k.titel, zahl(k.key)])];
  if(achtung) chips.push(["achtung", "Achtung", achtung]);

  let html = `<div class="werkzeug">
    <label class="such"><span class="vh">Setups durchsuchen</span>
      <input id="suche" type="search" placeholder="Rute, Rolle, Schnur …" value="${esc(st.suche)}" autocomplete="off" enterkeyhint="search"></label>
    <div class="chips" role="group" aria-label="Nach Einsatz filtern">${chips.map(([k, l, n]) =>
      `<button type="button" class="chip${st.filter === k ? " on" : ""}${k === "achtung" ? " chip-warn" : ""}" data-filter="${k}" aria-pressed="${st.filter === k}">${l}<i>${n}</i></button>`).join("")}</div>
    <div class="neu-knoepfe"><button type="button" class="knopf" data-neu="rute">+ Rute</button><button type="button" class="knopf" data-neu="rolle">+ Rolle</button></div>
  </div>`;

  if(!sichtbar.length){
    html += `<p class="leer">Kein Setup passt zu „${esc(st.suche)}“${st.filter !== "alle" ? " in diesem Filter" : ""}.</p>`;
  } else if(st.filter === "alle" && !st.suche){
    KATEGORIEN.forEach(k => {
      const gs = sichtbar.filter(g => g.kopf.kategorie === k.key);
      if(!gs.length) return;
      html += `<section class="gruppe"><h2 class="gruppe-titel">${esc(k.titel)} <span>${gs.reduce((n, g) => n + g.glieder.length, 0)}</span></h2>
        <p class="gruppe-hinweis">${esc(k.hinweis)}</p><div class="karten">${gs.map(karteHTML).join("")}</div></section>`;
    });
  } else {
    html += `<div class="karten">${sichtbar.map(karteHTML).join("")}</div>`;
  }

  const frei = freieRollen();
  if(frei.length && (st.filter === "alle" || st.filter === "achtung") && !st.suche){
    html += `<section class="frei"><h2 class="gruppe-titel">Freie Rollen <span>${frei.length}</span></h2>
      <p class="gruppe-hinweis">Liegen bereit, auf keiner Rute montiert. Antippen zum Bearbeiten.</p>
      ${frei.map(r => `<button type="button" class="frei-rolle" data-rolle-bearb="${r.id}"><b>${esc(r.name)}${r.groesse ? ` <small>${r.groesse}${r.freilauf ? " · Freilauf" : ""}</small>` : ""}</b><span>${esc(r.schnur || "keine Schnur eingetragen")}</span></button>`).join("")}</section>`;
  }
  const arch = AUSR.archiv();
  const nArch = arch.ruten.length + arch.rollen.length;
  if(nArch && st.filter === "alle" && !st.suche){
    const tag = d => d ? " · verkauft " + datumDE(d) : "";
    html += `<details class="archiv"><summary><span class="gruppe-titel">Archiv <span>${nArch}</span></span></summary>
      <p class="gruppe-hinweis">Verkauft oder ausgemustert. Fänge und Pflegedaten bleiben erhalten.</p>
      ${arch.ruten.map(r => `<div class="archiv-teil"><div><b>${esc(r.name)}</b><span>Rute${tag(r.verkauftAm)}</span></div><button type="button" class="knopf leise" data-zurueck="rute" data-id="${r.id}">Zurückholen</button></div>`).join("")}
      ${arch.rollen.map(r => `<div class="archiv-teil"><div><b>${esc(r.name)}</b><span>Rolle${tag(r.verkauftAm)}</span></div><button type="button" class="knopf leise" data-zurueck="rolle" data-id="${r.id}">Zurückholen</button></div>`).join("")}
    </details>`;
  }
  html += `<p class="skala-hinweis">Der Wurfgewichtsbalken nutzt für alle Ruten dieselbe Skala von 0,5 bis 150 g. So siehst du Lücken und Überschneidungen.</p>`;
  return html;
}

/* ---------- Rutenwand: Detail ---------- */
const TABS = [["infos","Infos"],["fische","Fische"],["pflege","Pflege"],["faenge","Fänge"],["kombi","Kombi"]];
const AMPEL = { machbar:"g", bedingt:"y", wunsch:"r" };
const AMPEL_TEXT = { machbar:"machbar", bedingt:"bedingt", wunsch:"Wunschliste" };

function reihe(k, v){ return v ? `<div class="reihe"><dt>${k}</dt><dd>${esc(v)}</dd></div>` : ""; }

function rolleFeldHTML(s){
  if(s.kategorie === "stippe") return "";
  if(s.rolle){
    const details = [s.rolle.groesse ? "Größe " + s.rolle.groesse : "", s.rolle.freilauf ? "Freilauf" : ""].filter(Boolean).join(" · ");
    return `<button type="button" class="rolle-feld" data-geh-tab="kombi">
      <span class="rolle-feld-txt"><small>Montierte Rolle</small><b>${esc(s.rolle.name)}</b>
        <span>${esc(details)}${s.schnurText ? (details ? " · " : "") + esc(s.schnurText.split(" – ")[0]) : ""}</span></span>
      <span class="rolle-feld-pfeil">Tauschen ›</span></button>`;
  }
  return `<button type="button" class="rolle-feld leer-rolle" data-geh-tab="kombi">
    <span class="rolle-feld-txt"><small>Rolle</small><b>Noch keine Rolle montiert</b><span>Antippen, um eine freie Rolle auszuwählen</span></span>
    <span class="rolle-feld-pfeil">Auswählen ›</span></button>`;
}

function tabInfos(g){
  const s = g.kopf, r = s.roh;
  const AKT = { schnell: "schnell (Spitzenaktion)", mittel: "mittel (semiparabolisch)", parabolisch: "parabolisch (durchgehend)" };
  const QTXT = { "geschätzt": " · geschätzt", "Hersteller": " · laut Hersteller", "Händler": " · laut Händler", "du": " · deine Angabe" };
  const aktion = s.rute && s.rute.aktion ? AKT[s.rute.aktion] + (QTXT[s.rute.aktionQuelle] || "") + (s.rute.aktionNotiz ? ` (${s.rute.aktionNotiz})` : "") : (s.kategorie === "stippe" ? "" : "unbekannt");
  const tk = s.rolle ? AUSR.tragkraft(s.rolle) : null;
  let h = rolleFeldHTML(s) + `<dl class="reihen">
    ${reihe("Rute", s.rute ? s.rute.text : "")}
    ${reihe("Aktion", aktion)}
    ${s.rute && s.rute.feederspitze ? reihe("Spitze", "Bibberspitze (Feeder)") : ""}
    ${tk ? reihe("Tragkraft", "ca. " + komma(tk.kg) + " kg" + (tk.quelle === "geschätzt" ? " · geschätzt aus dem Durchmesser" : "")) : ""}
    ${s.rolle && s.rolle.salzwasser !== undefined && s.rolle.salzwasser !== null ? reihe("Salzwasser", (s.rolle.salzwasser ? "Rolle salzwassertauglich" : "Rolle nicht salzwasserfest") + (s.rolle.salzQuelle ? " · laut " + s.rolle.salzQuelle : "")) : ""}
    ${s.kategorie === "stippe" ? reihe("Rolle", r.rolleText) + reihe("Schnur", s.schnurText) : ""}
    ${reihe("Vorfach", r.vorfach)}
    ${reihe("Dazu", r.extra)}
  </dl>`;
  if(r.einsatz) h += `<div class="absatz"><h3>Einsatz</h3><p>${esc(r.einsatz)}</p></div>`;
  if(r.bewusst) h += `<div class="absatz bewusst"><h3>Bewusst so gewählt</h3><p>${esc(r.bewusst)}</p></div>`;
  if(r.tippKompakt) h += `<div class="absatz tipp"><h3>Tipp</h3><p>${esc(r.tippKompakt)}</p></div>`;
  const offen = [];
  if(s.rute && s.rute.aktionQuelle === "geschätzt") offen.push("die Aktion");
  if(tk && tk.quelle === "geschätzt") offen.push("die Tragkraft der Schnur");
  if(offen.length) h += `<p class="pruefen">Für den Berater geschätzt: ${offen.join(" und ")}. Ein Blick auf Rute bzw. Schnurspule macht die Empfehlung genauer.
    ${tk && tk.quelle === "geschätzt" ? `<button type="button" class="knopf klein" data-tragkraft="${s.rolle.id}">Tragkraft eintragen</button>` : ""}</p>`;
  h += `<div class="akt-zeile"><button type="button" class="knopf ${inTasche(s.key) ? "" : "prim"}" data-tasche="${s.key}">${inTasche(s.key) ? "Aus der Tasche nehmen" : "In die Tasche"}</button>
    <button type="button" class="knopf" data-rute-bearb="${s.key}">Rute &amp; Angaben bearbeiten</button>${s.rolle ? `<button type="button" class="knopf" data-rolle-bearb="${s.rolle.id}">Rolle bearbeiten</button>` : ""}</div>`;
  return h;
}

function tabFische(g, catches){
  return fischeHTML(g.kopf.key, catches);
}

function pflegeZeile(art, s, p){
  const datum = art === "wartung" ? p.wartung : p.schnur;
  const tage = art === "wartung" ? p.wartungTage : p.schnurTage;
  const grenze = art === "wartung" ? WARTUNG_TAGE : SCHNUR_TAGE;
  const faellig = art === "wartung" ? p.wartungFaellig : p.schnurFaellig;
  const titel = art === "wartung" ? "Wartung" : "Schnurwechsel";
  const knopf = art === "wartung" ? "Heute gewartet" : "Heute gewechselt";
  let info;
  if(!datum) info = "noch nichts eingetragen";
  else if(art === "schnur") info = `${datumDE(datum)} · vor ${komma((tage / 30).toFixed(1))} Monaten`;
  else info = `${datumDE(datum)} · ${tage === 0 ? "heute" : tage === 1 ? "gestern" : "vor " + tage + " Tagen"}`;
  return `<div class="pflege-zeile${faellig ? " faellig" : ""}">
    <div class="pflege-txt"><b>${titel}</b><span>${info}</span><small>Richtwert: alle ${art === "wartung" ? grenze + " Tage" : Math.round(grenze / 30) + " Monate"}</small></div>
    <div class="pflege-akt">
      <button type="button" class="knopf prim" data-pflege="${art}" data-key="${s.key}" data-wert="heute">${knopf}</button>
      <label class="datum-wahl"><span class="vh">${titel}: anderes Datum für ${esc(s.titel)}</span>
        <input type="date" id="d-${art}-${s.key}" data-pflege-datum="${art}" data-key="${s.key}" max="${heuteISO()}" value="${datum || ""}"></label>
      ${datum ? `<button type="button" class="knopf leise" data-pflege="${art}" data-key="${s.key}" data-wert="weg">Löschen</button>` : ""}
    </div>
  </div>`;
}

function schnurBlock(s, p){
  if(!s.rolle) return `<div class="pflege-zeile"><div class="pflege-txt"><b>Schnur</b><span>Keine Rolle montiert</span><small>Eine Rolle setzt du im Reiter „Kombi“ auf.</small></div></div>`;
  const voll = AUSR.rolleVoll(s.rolle.id) || {};
  const verlauf = voll.schnurVerlauf || [];
  const datum = p.schnur, tage = p.schnurTage;
  return `<div class="pflege-zeile${p.schnurFaellig ? " faellig" : ""}">
    <div class="pflege-txt"><b>Schnur auf der ${esc(s.rolle.name)}</b><span class="schnur-jetzt">${esc(s.schnurText || "–")}</span>
      <span>${datum ? `aufgespult ${datumDE(datum)} · ${tage === 0 ? "heute" : tage < 45 ? "vor " + tage + (tage === 1 ? " Tag" : " Tagen") : "vor " + komma((tage / 30).toFixed(1)) + " Monaten"}` : "Datum noch nicht eingetragen"}</span>
      <small>Richtwert: alle ${Math.round(SCHNUR_TAGE / 30)} Monate wechseln</small></div>
    <div class="pflege-akt">
      <button type="button" class="knopf prim" data-schnur-neu="${s.rolle.id}" data-key="${s.key}">Neue Schnur</button>
      <button type="button" class="knopf" data-schnur-heute="${s.rolle.id}" data-key="${s.key}">Gleiche heute neu</button>
      <label class="datum-wahl"><span class="vh">Aufspul-Datum ändern</span>
        <input type="date" id="d-schnur-${s.key}" data-schnur-datum="${s.rolle.id}" data-key="${s.key}" max="${heuteISO()}" value="${datum || ""}"></label>
    </div>
    ${verlauf.length ? `<details class="verlauf"><summary>Frühere Schnüre (${verlauf.length})</summary><ul>${verlauf.map(v =>
      `<li><b>${esc(v.text || AUSR.schnurText(v))}</b><span>${v.seit ? datumDE(v.seit) : "?"} – ${v.bis ? datumDE(v.bis) : "?"}</span></li>`).join("")}</ul></details>` : ""}
  </div>`;
}

function tabPflege(g){
  return g.glieder.map((s, i) => {
    const ohneSchnur = s.kategorie === "stippe";
    const p = pv(s);
    const kopf = g.glieder.length > 1 ? `<h3 class="glied">Rute ${i + 1}${s.zusatz ? " · " + esc(s.zusatz) : ""}</h3>` : "";
    return `<div class="pflege-block">${kopf}${pflegeZeile("wartung", s, p)}${ohneSchnur ? "" : schnurBlock(s, p)}</div>`;
  }).join("") + `<p class="hinweis-klein">Gespeichert unter denselben Daten wie in der bisherigen App und mit deinem Login auf alle Geräte synchronisiert.</p>`;
}

function tabFaenge(g, catches){
  const eigene = faengeFuer(g.glieder.map(x => x.key), catches).sort((a, b) => String(b.datum).localeCompare(String(a.datum)));
  if(!eigene.length) return `<p class="leer">Noch keine Fänge mit diesem Setup erkannt. Zugeordnet werden Fänge, die du im Berater mit einer Methode dieses Setups eingetragen hast. Ab Etappe 6 wählst du das Setup beim Eintragen direkt aus.</p>`;
  const groesster = eigene.filter(c => +c.laenge).sort((a, b) => b.laenge - a.laenge)[0];
  return `<div class="fang-kopf"><div><b>${eigene.length}</b><span>Fänge</span></div>${groesster ? `<div><b>${esc(groesster.laenge)} cm</b><span>größter · ${esc(groesster.fischName)}</span></div>` : ""}<div><b>${datumDE(eigene[0].datum)}</b><span>zuletzt</span></div></div>
    <ul class="fang-liste">${eigene.slice(0, 30).map(c => `<li><span class="fang-datum">${datumDE(c.datum)}</span><b>${esc(c.fischName || c.fischId)}</b><span>${[c.laenge ? esc(c.laenge) + " cm" : "", c.gewicht ? komma(c.gewicht) + " kg" : ""].filter(Boolean).join(" · ")}</span></li>`).join("")}</ul>
    <p class="hinweis-klein">Zugeordnet über Fischart und Berater-Methode.</p>`;
}

function tabKombi(g){
  const s = g.kopf;
  if(s.kategorie === "stippe") return `<p class="leer">Stippruten tragen keine Rolle, die Schnur hängt fest am Gummizug.</p>`;
  if(!s.rute || !s.rute.wg) return `<p class="leer">Für diese Rute ist kein Wurfgewicht hinterlegt, deshalb lässt sich keine Rolle bewerten.</p>`;
  const urteil = s.rolle ? bewerteKombo(s.rute, s.rolle) : null;
  const ST = ["g", "y", "r"];
  let h = "";
  if(urteil){
    h += `<div class="kombi-jetzt ${ST[urteil.stufe]}"><span class="amp ${ST[urteil.stufe]}"></span><div><b>Jetzt montiert: ${esc(s.rolle.name)} · ${urteil.urteil}</b><span>${urteil.gruende.map(esc).join(" · ")}</span>
      <span class="akt-zeile"><button type="button" class="knopf" data-rolle-bearb="${s.rolle.id}">Rolle bearbeiten</button><button type="button" class="knopf leise" data-montiere="" data-key="${s.key}">Abnehmen</button></span></div></div>`;
  } else {
    /* Freie Rollen zur Auswahl, die passendsten zuerst */
    const frei = freieRollen().map(r => ({ r, b: bewerteKombo(s.rute, r) }))
      .sort((a, b) => (a.b ? a.b.stufe : 3) - (b.b ? b.b.stufe : 3) || (a.r.groesse || 0) - (b.r.groesse || 0));
    const URTEIL = ["passt", "geht", "passt nicht"];
    h += `<div class="kombi-jetzt"><span class="amp y"></span><div><b>Keine Rolle montiert</b>
      ${frei.length ? `<label class="feld frei-wahl"><span>Freie Rolle montieren</span>
          <select id="frei-wahl-${s.key}">${frei.map(x => `<option value="${x.r.id}">${esc(x.r.name)}${x.r.groesse ? " · " + x.r.groesse : ""}${x.b ? " – " + URTEIL[x.b.stufe] : ""}</option>`).join("")}</select></label>
        <span class="akt-zeile"><button type="button" class="knopf prim" data-montiere-wahl="${s.key}">Montieren</button><button type="button" class="knopf" data-neu="rolle" data-key="${s.key}">+ Neue Rolle anlegen</button></span>`
      : `<span>Gerade ist keine Rolle frei. Nimm eine von einer anderen Rute (unten) oder lege eine neue an.</span>
        <span class="akt-zeile"><button type="button" class="knopf" data-neu="rolle" data-key="${s.key}">+ Neue Rolle anlegen</button></span>`}
      </div></div>`;
  }
  const andere = ROLLEN.filter(r => !s.rolle || r.id !== s.rolle.id).map(r => ({ r, b: bewerteKombo(s.rute, r), auf: rolleMontiertAuf(r.id) }))
    .filter(x => x.b).sort((a, b) => a.b.stufe - b.b.stufe || (a.auf ? 1 : 0) - (b.auf ? 1 : 0) || a.r.groesse - b.r.groesse);
  h += `<h3 class="kombi-titel">Andere Rollen auf dieser Rute</h3><ul class="kombi-liste">` + andere.map(x => `<li>
      <span class="amp ${ST[x.b.stufe]}" title="${x.b.urteil}"></span>
      <span class="kombi-txt"><b>${esc(x.r.name)}</b><small>${x.b.gruende.map(esc).join(" · ")}</small></span>
      <span class="kombi-rechts"><span class="pill ${x.auf ? "" : "frei"}">${x.auf ? "auf " + esc(ersterTeil(x.auf.name)) : "frei"}</span>
        <button type="button" class="knopf klein" data-montiere="${x.r.id}" data-key="${s.key}" aria-label="${esc(x.r.name)} auf diese Rute setzen">Montieren</button></span></li>`).join("") + `</ul>
    <p class="hinweis-klein">Gleiche Faustregeln wie die Werkstatt: Rollengröße folgt dem Wurfgewicht, lange Ruten brauchen Gegengewicht, Freilauf gehört an die Rute im Halter. Beim Umsetzen wandert die Schnur mit der Rolle.</p>`;
  return h;
}

function detailHTML(g){
  const s = g.kopf;
  const catches = ladeFaenge();
  const kat = katByKey[s.kategorie];
  const nFische = fischeAnzahl(g.kopf.key);
  const nFaenge = faengeFuer(g.glieder.map(x => x.key), catches).length;
  const tiles = [
    ["Länge", s.laenge ? meter(s.laenge) : "–"],
    ["Wurfgewicht", s.wg ? `${komma(s.wg[0])}–${komma(s.wg[1])} g` : "–"],
    ["Schnur", s.art ? (ART_LABEL[s.art] || s.art) + (s.dm ? " " + s.dm : "") : "–", s.kategorie === "stippe" ? null : "pflege"],
    ["Rolle", s.rolle ? (s.rolle.groesse + (s.rolle.freilauf ? " · Freilauf" : "")) : "–", s.kategorie === "stippe" ? null : "kombi"]
  ];
  let body = "";
  if(st.tab === "infos") body = tabInfos(g);
  if(st.tab === "fische") body = tabFische(g, catches);
  if(st.tab === "pflege") body = tabPflege(g);
  if(st.tab === "faenge") body = tabFaenge(g, catches);
  if(st.tab === "kombi") body = tabKombi(g);
  const zahl = { fische: nFische, faenge: nFaenge };
  return `<article class="detail" aria-labelledby="det-titel">
    <a class="zurueck" href="#rutenwand">‹ Alle Setups</a>
    <p class="eyebrow">${esc(kat ? kat.titel : s.kategorie)} · ${ZUSTAND_LABEL[s.zustand]}${g.glieder.length > 1 ? ` · ${g.glieder.length}× vorhanden` : ""}</p>
    <h2 id="det-titel">${esc(s.titel)}</h2>
    <p class="det-sub">${esc(s.rolleName || "keine Rolle")}${s.schnurText ? " · " + esc(s.schnurText.split(" – ")[0].split(" · ")[0]) : ""}</p>
    <div class="tiles">${tiles.map(([k, v, ziel]) => ziel
      ? `<button type="button" class="kachel-link${v === "–" ? " fehlt" : ""}" data-geh-tab="${ziel}" aria-label="${k}: ${esc(v)} – öffnen"><small>${k} ›</small><b>${esc(v === "–" && k === "Rolle" ? "keine" : v)}</b></button>`
      : `<div><small>${k}</small><b>${esc(v)}</b></div>`).join("")}</div>
    ${s.wg ? `<div class="det-wg">${wgHTML(s)}</div>` : ""}
    <div class="seg" role="tablist" aria-label="Setup-Details">${TABS.map(([k, l]) =>
      `<button type="button" role="tab" id="tab-${k}" aria-selected="${st.tab === k}" class="${st.tab === k ? "on" : ""}" data-tab="${k}">${l}${zahl[k] ? `<i>${zahl[k]}</i>` : ""}</button>`).join("")}</div>
    <div class="tabinhalt" role="tabpanel" aria-labelledby="tab-${st.tab}">${body}</div>
  </article>`;
}

/* ---------- Platzhalter für spätere Etappen ---------- */
function platzhalterHTML(id, klein){
  const p = NOCH_ALT[id];
  const b = BEREICHE.find(x => x.id === id);
  return `<section class="platzhalter${klein ? " klein" : ""}">
    <p class="eyebrow">Kommt in Etappe ${p.etappe}</p>
    ${klein ? `<h3>Wetter, Tagescheck &amp; Packliste</h3>` : `<h2>${b.label}</h2>`}
    <p>${p.text}</p>
    <p class="hinweis-klein">Bis dahin funktioniert alles wie gewohnt in der bisherigen App:</p>
    <div class="alt-knoepfe">${p.links.map(([v, l]) => `<a class="knopf" href="../index.html?view=${v}">${l}</a>`).join("")}</div>
  </section>`;
}

/* ---------- Gesamt-Render ---------- */
function render(){
  renderNav();
  renderSync();
  const main = $("#inhalt");
  document.body.dataset.bereich = st.bereich;
  if(st.bereich !== "rutenwand"){
    document.body.classList.remove("hat-detail");
    main.innerHTML = st.bereich === "heute"
      ? (st.protokoll ? protokollHTML() : heuteHTML())
      : st.bereich === "wissen" ? wissenHTML(st.wissen) : platzhalterHTML(st.bereich);
    if(st.bereich === "heute" && !st.protokoll) heuteNachladen();
    return;
  }
  neuAufbauen();
  if(st.setup && !GRUPPEN.some(x => x.id === st.setup)) st.setup = null;
  /* Desktop: ohne Auswahl das erste Setup zeigen */
  if(!st.setup && desktop.matches && GRUPPEN.length) st.setup = GRUPPEN.filter(passtFilter)[0]?.id || GRUPPEN[0].id;
  const g = st.setup ? GRUPPEN.find(x => x.id === st.setup) : null;
  document.body.classList.toggle("hat-detail", !!g);
  const sucheHatteFokus = document.activeElement && document.activeElement.id === "suche";
  const pos = sucheHatteFokus ? document.activeElement.selectionStart : null;
  const listeScroll = $(".liste") ? $(".liste").scrollTop : 0;
  main.innerHTML = `<div class="wand">
      <div class="liste">${listeHTML()}</div>
      <div class="det-spalte">${g ? detailHTML(g) : `<p class="leer">Wähle links ein Setup.</p>`}</div>
    </div>`;
  if($(".liste")) $(".liste").scrollTop = listeScroll;
  aktivenChipZeigen();
  if(sucheHatteFokus){ const i = $("#suche"); i.focus(); try { i.setSelectionRange(pos, pos); } catch(e){} }
}

/* Gewählter Filter-Chip soll sichtbar sein, auch wenn er rechts aus dem Bild ragt */
function aktivenChipZeigen(){
  const c = $(".chip.on"), leiste = $(".chips");
  if(c && leiste && leiste.scrollWidth > leiste.clientWidth) leiste.scrollLeft = Math.max(0, (c.offsetLeft - leiste.offsetLeft) - leiste.clientWidth / 2 + c.offsetWidth / 2);
}

/* Nur die Liste neu zeichnen (beim Tippen in die Suche) */
function renderListe(){
  const el = $(".liste"); if(!el) return render();
  const i = $("#suche"); const pos = i ? i.selectionStart : null;
  el.innerHTML = listeHTML();
  aktivenChipZeigen();
  const n = $("#suche"); if(n){ n.focus(); try { n.setSelectionRange(pos, pos); } catch(e){} }
}

/* ---------- Ereignisse ---------- */
document.addEventListener("click", e => {
  const f = e.target.closest("[data-filter]");
  if(f){ st.filter = f.dataset.filter; schreibeText(KEYS.filter, st.filter); renderListe(); return; }
  const ht = e.target.closest("[data-h-tag]");
  if(ht){ hst.tag = +ht.dataset.hTag; merkeHeute(); render(); return; }
  const hf = e.target.closest("[data-h-fisch]");
  if(hf){
    fischWaehlen(hf.dataset.hFisch); render();
    const z = document.getElementById("berater-anker"); if(z) z.scrollIntoView({ block: "start", behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
    return;
  }
  const tb = e.target.closest("[data-tasche]");
  if(tb){ const drin = umschalten(tb.dataset.tasche, tb.dataset.zweck || null); toast(drin ? "In der Tasche" : "Aus der Tasche genommen"); return; }
  if(e.target.closest("[data-tasche-leeren]")){ leeren(); toast("Tasche geleert"); return; }
  if(e.target.closest("[data-tasche-haken]")){ nurHakenWeg(); toast("Häkchen zurückgesetzt"); return; }
  const gt = e.target.closest("[data-geh-tab]");
  if(gt){
    st.tab = gt.dataset.gehTab; render();
    const seg = $(".seg"); if(seg) seg.scrollIntoView({ block: "start", behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
    const b = $(`#tab-${st.tab}`); if(b) b.focus({ preventScroll: true });
    return;
  }
  const t = e.target.closest("[data-tab]");
  if(t){ st.tab = t.dataset.tab; render(); const b = $(`#tab-${st.tab}`); if(b) b.focus(); return; }
  const b = e.target.closest("[data-neu],[data-rute-bearb],[data-rolle-bearb],[data-montiere],[data-montiere-wahl],[data-schnur-neu],[data-schnur-heute],[data-zurueck],[data-tragkraft]");
  if(b){
    const d = b.dataset;
    if(d.tragkraft) return tragkraftEintragen(d.tragkraft);
    if(d.montiereWahl){ const sel = document.getElementById("frei-wahl-" + d.montiereWahl); if(sel && sel.value) return montiere(d.montiereWahl, sel.value); return; }
    if(d.neu === "rute") return neueRute();
    if(d.neu === "rolle") return neueRolle(d.key || null);
    if(d.ruteBearb) return ruteBearbeiten(d.ruteBearb);
    if(d.rolleBearb) return rolleBearbeiten(d.rolleBearb);
    if(d.montiere !== undefined) return montiere(d.key, d.montiere || null);
    if(d.schnurNeu) return schnurWechseln(d.schnurNeu, d.key);
    if(d.schnurHeute){ schnurDatum(d.schnurHeute, d.key, heuteISO()); return toast("Schnurwechsel für heute eingetragen"); }
    if(d.zurueck) return zurueckholen(d.zurueck, d.id);
  }
  const p = e.target.closest("[data-pflege]");
  if(p){
    const art = p.dataset.pflege, key = p.dataset.key;
    if(p.dataset.wert === "weg"){ setzePflege(art, key, null); toast(art === "wartung" ? "Wartungsdatum gelöscht" : "Schnurdatum gelöscht"); }
    else { setzePflege(art, key, heuteISO()); toast(art === "wartung" ? "Wartung für heute eingetragen" : "Schnurwechsel für heute eingetragen"); }
    return;
  }
});
document.addEventListener("change", e => {
  if(e.target.id === "h-ort"){ hst.ort = e.target.value; merkeHeute(); render(); return; }
  const pk = e.target.closest("[data-pack]");
  if(pk){ abhaken(pk.dataset.pack); return; }
  if(e.target.id === "b-fisch" || e.target.id === "b-gw"){
    if(e.target.id === "b-fisch"){ bst.fisch = e.target.value; bst.gw = ""; bst.gwFest = false; } else { bst.gw = e.target.value; bst.gwFest = true; }
    merkeBerater(); render();
    const z = document.getElementById(e.target.id); if(z) z.focus();
    return;
  }
  const sd = e.target.closest("[data-schnur-datum]");
  if(sd && sd.value){
    if(sd.value > heuteISO()){ toast("Das Datum liegt in der Zukunft"); return; }
    schnurDatum(sd.dataset.schnurDatum, sd.dataset.key, sd.value);
    toast("Datum gespeichert: " + datumDE(sd.value));
    return;
  }
  const d = e.target.closest("[data-pflege-datum]");
  if(d && d.value){
    if(d.value > heuteISO()){ toast("Das Datum liegt in der Zukunft"); return; }
    setzePflege(d.dataset.pflegeDatum, d.dataset.key, d.value);
    toast("Datum gespeichert: " + datumDE(d.value));
  }
});
document.addEventListener("input", e => {
  if(e.target.id === "suche"){ st.suche = e.target.value.trim(); renderListe(); }
});
desktop.addEventListener("change", () => render());

let toastTimer = null;
function toast(text){
  const t = $("#toast"); t.textContent = text; t.hidden = false;
  clearTimeout(toastTimer); toastTimer = setTimeout(() => { t.hidden = true; }, 2600);
}

/* ---------- Hell / Dunkel ---------- */
const THEMES = ["auto", "hell", "dunkel"];
const THEME_ICON = { auto: "◐", hell: "☀", dunkel: "☾" };
const THEME_TEXT = { auto: "Farbschema: automatisch", hell: "Farbschema: hell", dunkel: "Farbschema: dunkel" };
function setzeTheme(t){
  const root = document.documentElement;
  if(t === "hell") root.dataset.theme = "light"; else if(t === "dunkel") root.dataset.theme = "dark"; else delete root.dataset.theme;
  const b = $("#theme-btn"); b.textContent = THEME_ICON[t]; b.title = THEME_TEXT[t]; b.setAttribute("aria-label", THEME_TEXT[t] + ", antippen zum Wechseln");
}
let theme = leseText(KEYS.theme, "auto"); if(!THEMES.includes(theme)) theme = "auto";
setzeTheme(theme);
$("#theme-btn").addEventListener("click", () => {
  theme = THEMES[(THEMES.indexOf(theme) + 1) % THEMES.length];
  schreibeText(KEYS.theme, theme); setzeTheme(theme); toast(THEME_TEXT[theme]);
});

/* ---------- Sync-Dialog ---------- */
let dialogFuer;   // für welchen Login-Zustand der Dialog zuletzt gebaut wurde
function renderSync(inhaltAuch){
  const chip = $("#sync-chip");
  const txt = { aus: "Nicht angemeldet", laedt: "Verbinde …", an: "Synchronisiert", fehler: "Sync-Fehler", offline: "Nur lokal" }[sync.status] || "Nicht angemeldet";
  chip.textContent = txt;
  chip.dataset.status = sync.status;
  /* Offenen Dialog nur neu bauen, wenn sich der Login geändert hat – sonst wären getippte Eingaben weg */
  const wer = sync.user ? sync.user.uid + sync.fehler : "";
  if(!inhaltAuch && !($("#sync-dialog").open && dialogFuer !== wer)) return;
  dialogFuer = wer;
  const inh = $("#sync-inhalt");
  if(sync.user){
    inh.innerHTML = `<p>Angemeldet als <b>${esc(sync.user.email)}</b>. Wartung und Schnurwechsel werden mit der bisherigen App und deinen anderen Geräten abgeglichen.</p>
      ${sync.fehler ? `<p class="fehler">${esc(sync.fehler)}</p>` : ""}
      <button type="button" class="knopf" id="abmelden">Abmelden</button>`;
  } else {
    inh.innerHTML = `<p>Mit demselben Login wie in der bisherigen App. Bist du dort schon angemeldet, bist du es hier auch.</p>
      <form id="login-form" class="login">
        <label>E-Mail<input id="login-mail" type="email" required autocomplete="username"></label>
        <label>Passwort<input id="login-pass" type="password" required autocomplete="current-password"></label>
        <p class="fehler" id="login-fehler" hidden></p>
        <button type="submit" class="knopf prim">Anmelden</button>
      </form>`;
  }
}
$("#sync-chip").addEventListener("click", () => { renderSync(true); $("#sync-dialog").showModal(); });
$("#sync-dialog").addEventListener("submit", async e => {
  if(e.target.id !== "login-form") return;
  e.preventDefault();
  const fe = $("#login-fehler");
  try {
    await anmelden($("#login-mail").value.trim(), $("#login-pass").value);
    $("#sync-dialog").close(); toast("Angemeldet");
  } catch(err){
    fe.hidden = false;
    fe.textContent = /password|credential|user/i.test(err.code || err.message) ? "E-Mail oder Passwort stimmt nicht." : "Anmelden fehlgeschlagen: " + err.message;
  }
});
$("#sync-dialog").addEventListener("click", async e => {
  if(e.target.id === "abmelden"){ await abmelden(); $("#sync-dialog").close(); toast("Abgemeldet"); }
});

/* ---------- Start ---------- */
initEdit({ toast, geheZu });
beiAenderung(() => render());
leseHash();
render();
startSync();
