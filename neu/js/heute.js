/* ============================================================
   Bereich „Heute“ (Etappe 4)
   Ort + Tag wählen -> Lage (Wetter, Druck, Wind, Sonne, Mond, Gezeiten),
   welche Fische passen (mit Begründung), Schonzeit, Tasche mit Packliste
   und darunter der Berater, vorbelegt mit dem Gewässer des Orts.
   ============================================================ */
import { lese, schreibe } from "./store.js";
import { orteListe, ladeWetter, tagesLage, ladeGezeiten, mondphase, windRichtung, fischBewertung, urteil, rechtFuer, tagISO } from "./lage.js";
import { tasche, packliste } from "./tasche.js";
import { beraterHTML, bst, merkeBerater } from "./berater-ui.js";
import { erfahrung, erfahrungHTML, schonzeitHTML } from "./erfahrung.js";
import { musterHeute } from "./muster.js";
const musterZeile = (lage, iso) => { const t = musterHeute(lage, iso); return t ? `<p class="h-muster">${esc(t)} <a href="#fangbuch" data-fb-zu-muster>Deine Muster ›</a></p>` : ""; };
import { ausfluegeGeladen, ladeAusfluege } from "./tagebuch.js";
import { scheinHinweisHTML } from "./scheine.js";
import { ladeKueste, kuesteTag, kuesteHTML, seeSetzen } from "./kueste.js";
import { unterwegsHTML, unterwegsVorbereiten } from "./offline.js";
import { pflegeKarteHTML } from "./geraetepflege.js";
import { startPlan, startHTML } from "./startzeit.js";
import { wohinHTML } from "./wohin.js";
import { liveHTML } from "./live.js";
import { koederKarteHTML } from "./koederwahl.js";
import { saisonVorschauHTML } from "./jahresplan.js";

const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[c]));
const KEY = "neu_heute_v1";
export const hst = Object.assign({ ort: "eider_rd", tag: 0 }, lese(KEY, {}) || {});
export function merkeHeute(){ schreibe(KEY, hst); }

const wetterCache = {};   // ortId -> Rohdaten (im Speicher, damit Neuzeichnen sofort geht)
const gezCache = {};
const kuesteCache = {};   // ortId -> Küstendaten (Welle, Seerichtung, Pegel)
let kuesteLaeuft = null;

export function aktuellerOrt(){
  const orte = orteListe();
  return orte.find(o => o.id === hst.ort) || orte[0];
}
function aktuelleLage(){
  const ort = aktuellerOrt();
  const w = wetterCache[ort.id];
  const l = w ? tagesLage(w, hst.tag) : null;
  if(l && ort.kueste && kuesteCache[ort.id]) l.kueste = kuesteTag(kuesteCache[ort.id], l.iso, hst.tag === 0, l);
  return l;
}
const TAGE = ["Heute", "Morgen", "Übermorgen"];

export function heuteHTML(){
  const ort = aktuellerOrt();
  const orte = orteListe();
  const iso = tagISO(hst.tag);
  const datum = new Date(iso + "T12:00:00").toLocaleDateString("de-DE", { weekday: "long", day: "numeric", month: "long" });
  /* Berater folgt dem Ort, solange du dort kein anderes Gewässer gewählt hast */
  if(ort.gw && bst.fisch && FISCHE.find(f => f.id === bst.fisch)?.gewaesser.includes(ort.gw) && !bst.gwFest) bst.gw = ort.gw;

  return `<section class="heute">
    <div class="h-kopf">
      <p class="eyebrow">${esc(datum)}</p>
      <div class="h-wahl">
        <label class="feld"><span>Wo gehst du hin?</span>
          <select id="h-ort">${groupOrte(orte, ort.id)}</select></label>
        <div class="chips h-tage" role="group" aria-label="Tag">${TAGE.map((t, i) => `<button type="button" class="chip${hst.tag === i ? " on" : ""}" data-h-tag="${i}" aria-pressed="${hst.tag === i}">${t}</button>`).join("")}</div>
      </div>
    </div>
    <div id="h-live">${liveHTML(ort.id)}</div>
    <div id="h-wohin">${wohinHTML()}</div>
    <div id="h-unterwegs">${unterwegsHTML(ort)}</div>
    ${scheinHinweisHTML()}
    <div id="h-lage" class="h-lage">${lageHTML(ort)}</div>
    <div id="h-gezeiten"></div>
    <div id="h-kueste">${kuesteKarte(ort, orte)}</div>
    <div id="h-start">${startKarte(ort)}</div>
    <div id="h-erfahrung">${erfahrungHTML(erfahrung(ort, aktuelleLage(), iso), ort.name)}${musterZeile(aktuelleLage(), iso)}</div>
    <div id="h-fische">${fischeHTML(ort)}</div>
    <div id="h-koeder">${koederKarte(ort)}</div>
    <div id="h-schonzeit">${hst.tag === 0 ? schonzeitHTML() : ""}</div>
    <div id="h-vorschau">${hst.tag === 0 ? saisonVorschauHTML() : ""}</div>
    <div id="h-pflege">${pflegeKarteHTML()}</div>
    <div id="h-tasche">${tascheHTML(ort)}</div>
    <div id="berater-anker">${beraterHTML()}</div>
  </section>`;
}

function groupOrte(orte, aktiv){
  const opt = o => `<option value="${esc(o.id)}"${o.id === aktiv ? " selected" : ""}>${esc(o.name)}</option>`;
  const std = orte.filter(o => !o.eigen), eig = orte.filter(o => o.eigen);
  return `<optgroup label="Gewässer">${std.map(opt).join("")}</optgroup>${eig.length ? `<optgroup label="Deine Spots">${eig.map(opt).join("")}</optgroup>` : ""}`;
}

/* ---------- Lage ---------- */
function lageHTML(ort){
  const w = wetterCache[ort.id];
  if(!w) return `<div class="h-karte"><p class="hinweis-klein">Lade Wetter für ${esc(ort.name)} …</p></div>`;
  const l = tagesLage(w, hst.tag);
  if(!l) return `<div class="h-karte"><p class="hinweis-klein">Für diesen Tag liegen noch keine Wetterdaten vor.</p></div>`;
  const mond = mondphase(l.iso);
  const pfeil = /fallend/.test(l.trend) ? "↘" : /steigend/.test(l.trend) ? "↗" : "→";
  const stand = new Date(l.stand).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" });
  return `<div class="h-karte">
    <div class="h-kacheln">
      <div><small>${hst.tag ? "Mittags" : "Jetzt"}</small><b>${Math.round(l.temp)}°</b><span>${l.tmin !== null ? `${Math.round(l.tmin)}–${Math.round(l.tmax)}°` : ""}</span></div>
      <div><small>Wind</small><b>${Math.round(l.wind)} <i>km/h</i></b><span>${windRichtung(l.richtung)} · Böen ${Math.round(l.boenMax)}</span></div>
      <div class="${/fallend/.test(l.trend) ? "akzent" : ""}"><small>Luftdruck</small><b>${Math.round(l.druck)} ${pfeil}</b><span>${l.trend}</span></div>
      <div><small>Himmel</small><b>${Math.round(l.wolken)} %</b><span>Regen bis ${l.regenMax ?? "–"} %</span></div>
    </div>
    <div class="h-zeile"><span>Sonne ${l.aufgang}–${l.untergang}</span><span>Mond: ${mond.name}</span></div>
    ${l.boenMax > 55 ? `<p class="h-warn">Böen bis ${Math.round(l.boenMax)} km/h – am Wasser vorsichtig sein, an der Küste besser nicht waten.</p>` : ""}
    ${l.stunden.length ? `<div class="h-stunden">${l.stunden.map(s => `<div><b>${s.zeit}</b><span>${Math.round(s.temp)}°</span><span>${Math.round(s.wind)}</span><span>${s.regen ?? 0}%</span></div>`).join("")}</div>
      <p class="h-legende">Uhrzeit · Temperatur · Wind km/h · Regenrisiko</p>` : ""}
    <p class="hinweis-klein">${l.ausCache ? `Ohne Netz – letzter Stand von ${stand} Uhr.` : `Open-Meteo · Stand ${stand} Uhr`}</p>
  </div>`;
}

function koederKarte(ort){
  const lage = aktuelleLage();
  if(!lage) return "";
  const iso = tagISO(hst.tag);
  const b = fischBewertung(ort, lage, +iso.slice(5, 7), iso, null);
  const top = b.passt.filter(x => x.punkte >= 1).slice(0, 3).map(x => ({ id: x.fisch.id, name: x.fisch.name, zeitTipp: x.zeitTipp }));
  return koederKarteHTML(ort, lage, top, lage.kueste, ["heute", "morgen", "übermorgen"][hst.tag]);
}

/* Wann losfahren? – braucht Wetter (und an Tidegewässern die Gezeiten) */
function startKarte(ort){
  const w = wetterCache[ort.id], lage = aktuelleLage();
  if(!w || !lage) return "";
  const iso = tagISO(hst.tag);
  if(ort.tides && !gezCache[ort.id + iso]) return "";
  const b = fischBewertung(ort, lage, +iso.slice(5, 7), iso, null);
  const fische = b.passt.filter(x => x.punkte >= 1).slice(0, 3).map(x => x.fisch.id);
  return startHTML(startPlan(w, iso, ort, lage, ort.tides ? gezCache[ort.id + iso] : null, fische.length ? fische : b.passt.slice(0, 2).map(x => x.fisch.id), hst.tag === 0), ort, hst.tag === 0, ["heute", "morgen", "übermorgen"][hst.tag]);
}

function kuesteKarte(ort, orte){
  if(!ort.kueste) return "";
  const l = aktuelleLage();
  return kuesteHTML(ort, l && l.kueste, orte || orteListe(), l, !kuesteCache[ort.id] || !l);
}
/* Seerichtung von Hand setzen („automatisch“ = neu ermitteln) */
export function kuesteSeeAendern(wert){
  const ort = aktuellerOrt();
  seeSetzen(ort, wert === "" ? null : +wert);
  delete kuesteCache[ort.id];
}

function gezeitenHTML(ort, liste, fehler){
  if(!ort.tides) return "";
  if(fehler) return `<div class="h-karte"><h3>Gezeiten</h3><p class="hinweis-klein">Nicht ladbar (${esc(fehler)}).</p></div>`;
  if(!liste) return `<div class="h-karte"><h3>Gezeiten</h3><p class="hinweis-klein">Lade …</p></div>`;
  return `<div class="h-karte"><h3>Gezeiten</h3><div class="h-tiden">${liste.map(e => `<div class="${e.typ === "Hochwasser" ? "hoch" : "niedrig"}"><small>${e.typ}</small><b>ca. ${e.zeit}</b></div>`).join("")}</div>
    <p class="hinweis-klein">Die ersten zwei Stunden nach dem Tidenwechsel bringen oft die meiste Bewegung – und Fisch. Zeiten aus dem Wasserstandsmodell von Open-Meteo (±30 Min). Exakt: Gezeitenkalender des BSH.</p></div>`;
}

/* ---------- Welche Fische passen? ---------- */
function fischeHTML(ort){
  const monat = +tagISO(hst.tag).slice(5, 7);
  const lage = aktuelleLage();
  const iso = tagISO(hst.tag);
  const b = fischBewertung(ort, lage, monat, iso, erfahrung(ort, lage, iso).map);
  const zeile = x => {
    const [farbe, text] = urteil(x.punkte);
    const gruende = [...x.plus.slice(0, 2).map(t => `<li class="plus">${esc(t)}</li>`), ...x.minus.slice(0, 2).map(t => `<li class="minus">${esc(t)}</li>`)].join("");
    const r = x.recht && x.recht.status === "achtung" ? `<li class="minus">${esc(x.recht.r.hinweis.replace(/&amp;/g, "&").replace(/^⚠️\s*/, ""))}</li>` : "";
    return `<li class="h-fisch">
      <div class="h-fisch-kopf"><span class="amp ${farbe}"></span><b>${esc(x.fisch.name)}</b><span class="status ${farbe}">${text}</span></div>
      <ul class="gruende">${gruende}${r}</ul>
      ${x.zeitTipp ? `<p class="hinweis-klein">${esc(x.zeitTipp)}${lage && lage.untergang ? ` · Sonnenuntergang ${lage.untergang}` : ""}</p>` : ""}
      <div class="h-fisch-akt">
        <button type="button" class="knopf klein" data-h-fisch="${x.fisch.id}">Methode &amp; Montage ›</button>
        ${x.setup ? `<span class="hinweis-klein">mit ${esc(String(x.setup.name).split(" · ")[0])}</span>` : ""}
      </div></li>`;
  };
  return `<div class="h-karte">
    <h3>Passt ${hst.tag === 0 ? "heute" : hst.tag === 1 ? "morgen" : "übermorgen"} am ${esc(ort.name)}</h3>
    ${b.passt.length ? `<ul class="h-fische">${b.passt.slice(0, 6).map(zeile).join("")}</ul>` : `<p class="leer">Für diesen Ort ist kein passender Fisch hinterlegt.</p>`}
    ${b.passt.length > 6 ? `<details class="h-mehr"><summary>${b.passt.length - 6} weitere</summary><ul class="h-fische">${b.passt.slice(6).map(zeile).join("")}</ul></details>` : ""}
    ${b.gesperrt.length ? `<div class="h-schonzeit"><b>Schonzeit / geschützt:</b> ${b.gesperrt.map(g => `${esc(g.fisch.name)} <small>(${esc(g.recht.r.schonzeit)})</small>`).join(", ")}<br><span>Nicht gezielt beangeln, ein Beifang wird sofort schonend zurückgesetzt.</span></div>` : ""}
    ${b.fehltGeraet.length ? `<p class="hinweis-klein">Ohne passendes Gerät: ${b.fehltGeraet.map(x => esc(x.fisch.name)).join(", ")} – siehe Wunschliste im Berater.</p>` : ""}
    <p class="hinweis-klein">Einschätzung aus Saison, Wetter und deinem Gerät – Erfahrungswerte, keine Garantie. Schonzeiten und Mindestmaße sind Orientierungswerte für Schleswig-Holstein: Gewässerordnung und Erlaubnisschein gehen immer vor.</p>
  </div>`;
}

/* ---------- Tasche ---------- */
/* Vorschläge: die Setups der stärksten Fische aus „Passt heute“, die noch nicht in der Tasche sind */
function vorschlaege(ort, t){
  const iso = tagISO(hst.tag), lage = aktuelleLage();
  const b = fischBewertung(ort, lage, +iso.slice(5, 7), iso, erfahrung(ort, lage, iso).map);
  const out = [], gesehen = new Set(t.setups);
  b.passt.filter(x => x.punkte >= 2 && x.setup && x.besteStatus === "machbar").forEach(x => {
    if(out.length >= 3 || gesehen.has(x.setup.key)) return;
    gesehen.add(x.setup.key);
    out.push({ key: x.setup.key, name: String(x.setup.name).split(" · ")[0], fisch: x.fisch.name.split(" (")[0], zweck: x.fisch.id + "#" + x.fisch.ansaetze.indexOf(x.beste) });
  });
  return out;
}
function vorschlagHTML(v, leer){
  if(!v.length) return "";
  return `<div class="h-vorschlag"><p class="hinweis-klein">${leer ? "Vorschlag für heute – antippen packt das Setup ein:" : "Passt heute auch:"}</p>
    <div class="h-vorschlag-knoepfe">${v.map(x => `<button type="button" class="knopf klein" data-tasche="${esc(x.key)}" data-zweck="${esc(x.zweck)}">+ ${esc(x.name)} <small>für ${esc(x.fisch)}</small></button>`).join("")}</div></div>`;
}
function tascheHTML(ort){
  const p = packliste(ort, aktuelleLage());
  const t = p.t;
  const v = vorschlaege(ort, t);
  if(!t.setups.length){
    return `<div class="h-karte h-tasche-leer"><h3>Tasche für ${hst.tag === 0 ? "heute" : TAGE[hst.tag].toLowerCase()}</h3>
      ${vorschlagHTML(v, true)}
      <p class="hinweis-klein">Oder leg im Berater unten bzw. in der Rutenwand Setups mit „In die Tasche“ hinein. Dann entsteht hier deine Packliste mit allem, was du für die Montagen, das Wetter und den Ort brauchst.</p></div>`;
  }
  const prozent = Math.round(p.erledigt / p.gesamt * 100);
  return `<div class="h-karte">
    <div class="h-tasche-kopf"><h3>Tasche: ${t.setups.length} Setup${t.setups.length > 1 ? "s" : ""}</h3><span class="mono">${p.erledigt}/${p.gesamt} eingepackt</span></div>
    <div class="fortschritt" role="progressbar" aria-valuenow="${prozent}" aria-valuemin="0" aria-valuemax="100"><span style="width:${prozent}%"></span></div>
    ${p.gruppen.map(g => `<div class="pack-gruppe"><h4>${esc(g.titel)}</h4>${g.hinweis ? `<p class="hinweis-klein">${esc(g.hinweis)}</p>` : ""}
      <ul>${g.punkte.map(x => `<li><label class="pack${p.haken[x.text] ? " erledigt" : ""}"><input type="checkbox" data-pack="${esc(x.text)}"${p.haken[x.text] ? " checked" : ""}>
        <span><b>${esc(x.text)}</b>${x.info ? `<small>${esc(x.info)}</small>` : ""}${x.box ? `<small class="pk-box${x.box.knapp ? " knapp" : ""}">${esc(x.box.text)}</small>` : ""}</span></label></li>`).join("")}</ul></div>`).join("")}
    ${(() => { const n = p.gruppen.flatMap(g => g.punkte).filter(x => x.box && x.box.knapp).length; return n ? `<p class="hinweis-klein">${n} Teil${n > 1 ? "e" : ""} knapp oder nicht in der Box – <a href="#rutenwand" data-zu-box>zur Kleinteile-Box</a>.</p>` : ""; })()}
    <div class="akt-zeile">
      ${t.setups.map(k => AKTUELL[k] ? `<button type="button" class="knopf klein leise" data-tasche="${k}">${esc(String(AKTUELL[k].name).split(" · ")[0])} ✕</button>` : "").join("")}
    </div>
    ${vorschlagHTML(v, false)}
    <div class="akt-zeile"><button type="button" class="knopf" data-tasche-haken>Häkchen zurücksetzen</button><button type="button" class="knopf leise" data-tasche-leeren>Tasche leeren</button></div>
  </div>`;
}

/* ---------- Nachladen (Wetter, Gezeiten) ---------- */
let laeuft = null;
export function heuteNachladen(neuZeichnen){
  const ort = aktuellerOrt();
  const fuelle = () => {
    const l = document.getElementById("h-lage"); if(l) l.innerHTML = lageHTML(ort);
    const e = document.getElementById("h-erfahrung"); if(e) e.innerHTML = erfahrungHTML(erfahrung(ort, aktuelleLage(), tagISO(hst.tag)), ort.name) + musterZeile(aktuelleLage(), tagISO(hst.tag));
    const f = document.getElementById("h-fische"); if(f) f.innerHTML = fischeHTML(ort);
    const t = document.getElementById("h-tasche"); if(t) t.innerHTML = tascheHTML(ort);
    const k = document.getElementById("h-kueste"); if(k) k.innerHTML = kuesteKarte(ort);
    const pf = document.getElementById("h-pflege"); if(pf) pf.innerHTML = pflegeKarteHTML();
    const sz = document.getElementById("h-start"); if(sz) sz.innerHTML = startKarte(ort);
    const kw = document.getElementById("h-koeder"); if(kw) kw.innerHTML = koederKarte(ort);
  };
  if(!ausfluegeGeladen()) ladeAusfluege();   /* Wetter der Ausflüge für den Vergleich */
  if(!wetterCache[ort.id] && laeuft !== ort.id){
    laeuft = ort.id;
    ladeWetter(ort).then(w => { wetterCache[ort.id] = w; laeuft = null; if(aktuellerOrt().id === ort.id) fuelle(); })
      .catch(err => { laeuft = null; const l = document.getElementById("h-lage");
        if(l) l.innerHTML = `<div class="h-karte"><p class="hinweis-klein">Wetter nicht ladbar (${esc(err.message)}). Ohne Netz? Die Fischauswahl unten nutzt dann nur Saison und Gerät.</p></div>`; });
  }
  if(ort.kueste && !kuesteCache[ort.id] && kuesteLaeuft !== ort.id){
    kuesteLaeuft = ort.id;
    ladeKueste(ort).then(k => {
      kuesteCache[ort.id] = k; kuesteLaeuft = null;
      if(aktuellerOrt().id === ort.id) fuelle();
      if(k.spaeter) k.spaeter.then(see => { if(see){ k.see = see; if(aktuellerOrt().id === ort.id) fuelle(); } });
    })
      .catch(() => { kuesteLaeuft = null; const k = document.getElementById("h-kueste"); if(k) k.innerHTML = kuesteHTML(ort, null, [], null, false); });
  }
  if(ort.tides){
    const iso = tagISO(hst.tag), k = ort.id + iso;
    const g = document.getElementById("h-gezeiten");
    if(gezCache[k]){ if(g) g.innerHTML = gezeitenHTML(ort, gezCache[k]); }
    else {
      if(g) g.innerHTML = gezeitenHTML(ort, null);
      ladeGezeiten(ort, iso).then(liste => { gezCache[k] = liste; const gg = document.getElementById("h-gezeiten"); if(gg && aktuellerOrt().id === ort.id){ gg.innerHTML = gezeitenHTML(ort, liste); const sz = document.getElementById("h-start"); if(sz) sz.innerHTML = startKarte(ort); } })
        .catch(err => { const gg = document.getElementById("h-gezeiten"); if(gg) gg.innerHTML = gezeitenHTML(ort, null, err.message); });
    }
  }
}

/* Für unterwegs: Daten und Karte vorab laden */
export function unterwegsStarten(toast){
  const ort = aktuellerOrt();
  const knopf = document.querySelector("[data-unterwegs]"), st = document.getElementById("h-unterwegs-status");
  if(knopf) knopf.disabled = true;
  delete wetterCache[ort.id]; delete kuesteCache[ort.id];
  unterwegsVorbereiten(ort, msg => { if(st) st.textContent = msg; })
    .then(teile => { toast && toast(teile.length ? "Für unterwegs gespeichert" : "Nichts geladen – ist Netz da?"); const u = document.getElementById("h-unterwegs"); if(u) u.innerHTML = unterwegsHTML(ort); heuteNachladen(); })
    .catch(() => { if(knopf) knopf.disabled = false; });
}

/* Fisch aus „Passt heute“ in den Berater übernehmen */
export function fischWaehlen(id){
  const ort = aktuellerOrt();
  bst.fisch = id;
  const f = FISCHE.find(x => x.id === id);
  bst.gw = ort.gw && f && f.gewaesser.includes(ort.gw) ? ort.gw : "";
  bst.gwFest = false;
  merkeBerater();
}
