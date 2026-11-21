/* ============================================================
   Bereich „Gewässer“ (Etappe 5): eine Karte für alles
   Ebenen: deine Spots · LAV-Gewässer · Dänemark Put & Take ·
           freie Küstengewässer SH · OSM-Angelstellen (aus der alten App)
   Antippen -> Steckbrief (Preise, Regeln, deine Fänge dort, Notizen),
   „Heute hier angeln“ übernimmt den Ort in „Heute“.
   Die Karte (Leaflet) wird einmal erzeugt und bei jedem Neuzeichnen nur
   wieder eingehängt – so bleiben Ausschnitt und Zoom erhalten.
   ============================================================ */
import { lese, schreibe, ladeFaengeDaten, speichereFaengeDaten, dkNotizen, setzeDkNotiz } from "./store.js";
import { istFluss, linienVon, anfordern, UMKREIS_KM, vorabGeladen } from "./flusslauf.js";
import { pegelHTML } from "./pegel.js";
import { alleFaenge } from "./fangbuch.js";
import { scheineHTML, scheineSpotHTML } from "./scheine.js";
import { kachelnAusschnitt } from "./offline.js";
import { FUEHRER, GRUNDKOSTEN, STAND as FUEHRER_STAND } from "../daten/fuehrer.js";
import { spotTeilen, planTeilen } from "./teilen.js";
import { spotWetterHTML, spotWetterKlick } from "./spotwetter.js";

const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[c]));
const genId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const KEY = "neu_karte_v1";
export const kst = Object.assign({ ebenen: { spots: true, lav: true, dk: false, kueste: false, osm: false }, auswahl: null, suche: "", zentrum: null, zoom: null }, lese(KEY, {}) || {});
kst.auswahl = null;
if(kst.ebenen.faenge === undefined) kst.ebenen.faenge = true;
if(kst.ebenen.fuehrer === undefined) kst.ebenen.fuehrer = true;
function merke(){ schreibe(KEY, { ebenen: kst.ebenen, zentrum: kst.zentrum, zoom: kst.zoom }); }

const TYP = { see: "See", fluss: "Fluss", kanal: "Kanal", kueste: "Küste / Meer", forellensee: "Forellensee / Put & Take", teich: "Teich" };
const REGION = { sh: "Schleswig-Holstein", hh: "Hamburg", ni: "Niedersachsen", mv: "Mecklenburg-Vorpommern", dk: "Dänemark" };
const EBENEN = [
  { id: "spots",  label: "Deine Spots",       farbe: "--float" },
  { id: "faenge", label: "Meine Fänge",       farbe: "--warn" },
  { id: "fuehrer", label: "Angelführer SH/HH", farbe: "--guide" },
  { id: "lav",    label: "LAV-Gewässer",      farbe: "--water" },
  { id: "dk",     label: "Dänemark P&T",      farbe: "--ok" },
  { id: "kueste", label: "Freie Küste SH",    farbe: "--bad" },
  { id: "osm",    label: "OSM-Angelstellen",  farbe: "--muted" }
];

/* ---------- Freie Küstengewässer (aus der alten App übernommen, grob vereinfacht) ---------- */
const KUESTE_ZONEN = [
  { name: "Ostsee-Küstengewässer (SH)", punkte: [[54.83,9.90],[54.85,10.50],[54.60,11.30],[54.30,11.50],[53.95,10.95],[53.90,10.50],[54.10,10.00]] },
  { name: "Nordsee-Küstengewässer / Wattenmeer (SH)", punkte: [[54.90,8.20],[55.05,8.55],[54.80,8.90],[54.35,8.85],[54.00,8.75],[53.85,8.60],[53.85,8.30],[54.30,8.10]] }
];
const KUESTE_TEXT = "Freier Fischfang mit der Handangel: nur Fischereischein nötig, kein Erlaubnisschein (§ 4 Abs. 2 LFischG SH). Grob vereinfachte Fläche – eine amtliche Grenzkarte gibt es laut Land SH nicht. Vor Ort prüfen.";
const KUESTE_PUNKTE = [
  { id: "k_eider", name: "Eider – Küstengewässer-Grenze", lat: 54.273, lng: 8.89, art: "grenze", text: "Küstengewässer beginnt flussabwärts der Schleuse Nordfeld. Zwischen Schleuse Nordfeld und der Brücke Tönning gilt aber die Eidermündungs-Ausnahme (Erlaubnisschein nötig)." },
  { id: "k_stoer", name: "Stör – Küstengewässer-Grenze", lat: 53.924, lng: 9.518, art: "grenze", text: "Küstengewässer beginnt flussabwärts der Straßenbrücke B 77 in Itzehoe." },
  { id: "k_krueckau", name: "Krückau – Küstengewässer-Grenze", lat: 53.754, lng: 9.653, art: "grenze", text: "Küstengewässer beginnt flussabwärts der ehemaligen Wassermühle Piening in Elmshorn." },
  { id: "k_pinnau", name: "Pinnau – Küstengewässer-Grenze", lat: 53.680, lng: 9.667, art: "grenze", text: "Küstengewässer beginnt flussabwärts der Straßenbrücke B 431 in Uetersen." },
  { id: "k_trave", name: "Trave – Küstengewässer-Grenze", lat: 53.956, lng: 10.871, art: "grenze", text: "Küstengewässer beginnt an der Linie der Molenköpfe in Travemünde." },
  { id: "k_elbe", name: "Elbe – Küstengewässer-Grenze", lat: 53.585, lng: 9.696, art: "grenze", text: "Küstengewässer beginnt an der Landesgrenze SH/Hamburg bei Wedel." },
  { id: "k_schlei", name: "Schlei – Ausnahme", lat: 54.65, lng: 9.85, art: "ausnahme", text: "Die gesamte Schlei unterliegt eigenen Fischereirechten – trotz Küstengewässer ist ein Erlaubnisschein nötig." },
  { id: "k_luebeck", name: "Lübecker Bucht (Teil) – Ausnahme", lat: 53.96, lng: 10.87, art: "ausnahme", text: "Erlaubnisschein-pflichtig von der Gemeindegrenze Timmendorfer Strand/Lübeck bis zur Nordermole Travemünde sowie vom Priwall-Strand bis zur Landesgrenze." },
  { id: "k_eidermuendung", name: "Eidermündung – Ausnahme", lat: 54.32, lng: 8.94, art: "ausnahme", text: "Zwischen Schleuse Nordfeld und der Straßenbrücke Tönning/Karolinenkoog ist ein Erlaubnisschein nötig." }
];

/* ---------- Angelführer: Kosten kurz und als Tabelle ---------- */
const FU_ART = { kueste: "Küste", see: "See", fluss: "Fluss / Elbe", forellensee: "Forellensee" };
function kostenKurz(g){
  if(g.preis === "frei") return g.region === "hh" ? "frei – nur Abgabe 10 €/Jahr" : "frei – nur Abgabe";
  if(g.preis === "erfragen") return "Gastkarte – Preis erfragen";
  const k = (g.karten || [])[0];
  return k ? `${k[0]} ${k[1].split(" · ")[0]}` : "";
}
function fuehrerHTML(g){
  const gk = GRUNDKOSTEN[g.region] || GRUNDKOSTEN.sh;
  return `<dl class="reihen">
      <div class="reihe"><dt>Ort</dt><dd>${esc(g.ort)} · ${esc(g.typ)}</dd></div>
      <div class="reihe"><dt>Fische</dt><dd>${esc(g.fische)}</dd></div>
    </dl>
    <div class="fu-kosten ${g.preis}">
      <b>${g.preis === "frei" ? "Keine Angelkarte nötig" : g.preis === "ok" ? "Angelkarte" : "Gastkarte – Preis nicht veröffentlicht"}</b>
      <ul>${(g.karten || []).map(([a, p]) => `<li><span>${esc(a)}</span><b>${esc(p)}</b></li>`).join("")}</ul>
      ${g.kauf ? `<p><small>Kaufen: ${esc(g.kauf)}</small></p>` : ""}
      <p><small>Dazu immer: Fischereischein + ${esc(gk.titel)} – ${esc(gk.text.split(".")[0])}.</small></p>
    </div>
    ${g.tipp ? `<p class="fu-tipp">${esc(g.tipp)}</p>` : ""}
    ${g.art === "kueste" && g.lng > 9.5 && !/Dorsch und Aal/.test(g.tipp || "") ? `<p class="hinweis-klein">Ostsee: Dorsch und Aal sind für Angler ganzjährig verboten. Meeresangler müssen sich seit 2026 registrieren – Infos beim Land SH.</p>` : ""}
    <p class="hinweis-klein">${[g.url ? `<a href="${esc(g.url)}" target="_blank" rel="noopener">Seite des Anbieters ›</a>` : "", g.quelle && g.quelle !== g.url ? `<a href="${esc(g.quelle)}" target="_blank" rel="noopener">Quelle ›</a>` : ""].filter(Boolean).join(" · ")}
      ${esc(FUEHRER_STAND)} – Preise und Regeln vor dem Angeltag prüfen. Lage ungefähr.</p>`;
}
/* Grundkosten-Karte über der Liste, wenn der Führer an ist */
function grundkostenHTML(){
  return `<details class="fu-grund"><summary>Was kostet Angeln in SH und HH?</summary>
    ${Object.values(GRUNDKOSTEN).map(g => `<p><b>${esc(g.titel)}:</b> ${esc(g.text)} <a href="${esc(g.url)}" target="_blank" rel="noopener">Quelle ›</a></p>`).join("")}
    <p><b>Küste SH:</b> Ostsee und Nordsee sind größtenteils freie Küstengewässer – Fischereischein und Abgabe reichen. Ausnahmen (Erlaubnisschein): Schlei, Teile der Lübecker Bucht, Eidermündung.</p>
    <p><b>Forellensee:</b> Tageskarte beim Betreiber, Fischereiabgabe gilt trotzdem.</p>
    <p class="hinweis-klein">${esc(FUEHRER_STAND)}</p></details>`;
}

/* ---------- Daten aller Ebenen als einheitliche Liste ---------- */
function eintraege(){
  const f = ladeFaengeDaten();
  const out = [];
  if(kst.ebenen.spots) f.spots.filter(s => typeof s.lat === "number").forEach(s => out.push({ id: "spot:" + s.id, ebene: "spots", name: s.name, lat: s.lat, lng: s.lng, roh: s,
    unter: [TYP[s.type] || s.type, REGION[s.region] || ""].filter(Boolean).join(" · "), eigen: !!(s.visited || s.rating || f.catches.some(c => c.spotId === s.id)) }));
  if(kst.ebenen.faenge){
    /* je Spot mit Fängen ein Eintrag – Fänge ohne Spot haben keinen Ort */
    const proSpot = {};
    alleFaenge().forEach(c => { if(c.spotId) (proSpot[c.spotId] = proSpot[c.spotId] || []).push(c); });
    Object.entries(proSpot).forEach(([sid, fa]) => {
      const s = f.spots.find(x => x.id === sid);
      if(!s || typeof s.lat !== "number") return;
      fa.sort((a, b) => String(b.datum).localeCompare(String(a.datum)));
      out.push({ id: "fang:" + sid, ebene: "faenge", name: s.name, lat: s.lat, lng: s.lng, roh: { spot: s, faenge: fa },
        unter: `${fa.length > 1 ? fa.length + " Fänge" : "1 Fang"} · zuletzt ${datumKurz(fa[0].datum)}` });
    });
  }
  if(kst.ebenen.lav && typeof LAV_GEWAESSER !== "undefined") LAV_GEWAESSER.forEach(g => out.push({ id: "lav:" + g.id, ebene: "lav", name: g.name, lat: g.lat, lng: g.lng, roh: g,
    unter: `${g.typ} · LAV${g.kostenlosLav ? " · für Mitglieder kostenlos" : ""}` }));
  if(kst.ebenen.fuehrer) FUEHRER.forEach(g => out.push({ id: "fuehrer:" + g.id, ebene: "fuehrer", name: g.name, lat: g.lat, lng: g.lng, roh: g, unter: `${FU_ART[g.art] || g.art} · ${kostenKurz(g)}` }));
  if(kst.ebenen.dk && typeof DK_PUTTAKE !== "undefined") DK_PUTTAKE.forEach(d => out.push({ id: "dk:" + d.nr, ebene: "dk", name: d.name, lat: d.lat, lng: d.lng, roh: d,
    unter: `Nr. ${d.nr} · ${d.gew || ""} · ${d.km} km ab Fockbek` }));
  if(kst.ebenen.kueste) KUESTE_PUNKTE.forEach(k => out.push({ id: "kueste:" + k.id, ebene: "kueste", name: k.name, lat: k.lat, lng: k.lng, roh: k, unter: k.art === "ausnahme" ? "Erlaubnisschein nötig" : "Grenze des freien Küstengewässers" }));
  if(kst.ebenen.osm) (lese("osm_spots_cache_v1", []) || []).forEach((o, i) => { if(typeof o.lat === "number") out.push({ id: "osm:" + (o.id || i), ebene: "osm", name: o.name || "Angelstelle (OSM)", lat: o.lat, lng: o.lng, roh: o, unter: "OpenStreetMap" }); });
  return out;
}

const datumKurz = iso => iso ? new Date(iso + "T12:00:00").toLocaleDateString("de-DE", { day: "numeric", month: "short", year: "numeric" }) : "";

/* ---------- Karte ---------- */
let karte = null, kartenEl = null, schicht = null, kuesteSchicht = null, setzModus = null, setzMarker = null;
function farbe(v){ return getComputedStyle(document.documentElement).getPropertyValue(v).trim() || "#1d5a6d"; }

function karteErzeugen(){
  kartenEl = document.createElement("div");
  kartenEl.id = "gw-karte";
  kartenEl.className = "gw-karte";
  karte = L.map(kartenEl, { zoomControl: true, attributionControl: true }).setView(kst.zentrum || [54.35, 9.6], kst.zoom || 8);
  /* ohne Subdomain und mit CORS: so kann der Service Worker die Kacheln für offline zwischenspeichern */
  L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 18, crossOrigin: true, attribution: "© OpenStreetMap" }).addTo(karte);
  schicht = L.layerGroup().addTo(karte);
  karte.on("moveend", () => { const c = karte.getCenter(); kst.zentrum = [c.lat, c.lng]; kst.zoom = karte.getZoom(); merke(); flussLaden(); });
  karte.on("click", e => {
    if(!setzModus) return;
    const ll = e.latlng;
    setzMarker && karte.removeLayer(setzMarker);
    setzMarker = L.circleMarker(ll, { radius: 9, color: farbe("--float"), weight: 3, fillOpacity: 0.3 }).addTo(karte);
    setzModus(ll.lat, ll.lng);
  });
}

function zeichneMarker(){
  if(!karte) return;
  schicht.clearLayers();
  if(kuesteSchicht){ karte.removeLayer(kuesteSchicht); kuesteSchicht = null; }
  if(kst.ebenen.kueste){
    kuesteSchicht = L.layerGroup(KUESTE_ZONEN.map(z => L.polygon(z.punkte, { color: farbe("--bad"), weight: 1.5, fillOpacity: 0.12, interactive: false }))).addTo(karte);
  }
  const FARBE = { fuehrer: farbe("--guide"), spots: farbe("--float"), faenge: farbe("--warn"), lav: farbe("--water"), dk: farbe("--ok"), kueste: farbe("--bad"), osm: farbe("--muted") };
  const pinPlatz = {};
  eintraege().forEach(e => {
    const gewaehlt = kst.auswahl === e.id;
    if(e.ebene === "faenge"){
      /* Spots mit gleicher Position: Fähnchen nebeneinander statt übereinander */
      const pk = e.lat.toFixed(4) + "," + e.lng.toFixed(4); const versatz = (pinPlatz[pk] = (pinPlatz[pk] || 0) + 1) - 1;
      /* Fänge als Zahl-Fähnchen über dem Spot, damit der Spot-Punkt sichtbar bleibt */
      const n = e.roh.faenge.length;
      const m = L.marker([e.lat, e.lng], { icon: L.divIcon({ className: "gw-fang-pin" + (gewaehlt ? " sel" : ""), html: `<span><i>${n > 99 ? "99+" : n}</i></span>`, iconSize: [28, 34], iconAnchor: [14 - versatz * 30, 38] }),
        title: e.name, keyboard: false, zIndexOffset: 500 });
      m.bindTooltip(`${e.name}: ${e.unter}`, { direction: "top", offset: [0, -36] });
      m.on("click", ev => { L.DomEvent.stopPropagation(ev); waehle(e.id, false); });
      m.addTo(schicht);
      return;
    }
    /* Flüsse und Kanäle: Verlauf als Linie, der Punkt bleibt als Zugang klein darauf */
    const linien = istFluss(e) ? linienVon(e) : null;
    if(linien){
      const fl = L.polyline(linien, { color: FARBE[e.ebene], weight: gewaehlt ? 7 : 4.5, opacity: gewaehlt ? 1 : 0.8, lineCap: "round", lineJoin: "round", interactive: false });
      fl.addTo(schicht);
      /* breiter, unsichtbarer Streifen zum Antippen */
      const hit = L.polyline(linien, { color: "#000", weight: 18, opacity: 0 });
      hit.bindTooltip(e.name, { sticky: true });
      hit.on("click", ev => { L.DomEvent.stopPropagation(ev); waehle(e.id, false); });
      hit.addTo(schicht);
    }
    const m = L.circleMarker([e.lat, e.lng], {
      radius: gewaehlt ? 10 : linien ? 4.5 : (e.ebene === "spots" && e.eigen ? 7 : 5.5),
      color: gewaehlt ? farbe("--ink") : "#fff", weight: gewaehlt ? 3 : 1.5,
      fillColor: e.ebene === "kueste" && e.roh.art === "grenze" ? farbe("--ok") : FARBE[e.ebene], fillOpacity: 0.95
    });
    m.bindTooltip(e.name, { direction: "top", offset: [0, -6] });
    m.on("click", ev => { L.DomEvent.stopPropagation(ev); waehle(e.id, false); });
    m.addTo(schicht);
  });
  /* Hotspots */
  const alleHs = karte.getZoom() >= 15;
  ladeFaengeDaten().spots.forEach(sp => {
    if(!(sp.hotspots || []).length || !(alleHs || kst.auswahl === "spot:" + sp.id)) return;
    sp.hotspots.forEach(h => {
      const [sym, label] = HS_TYP[h.typ] || HS_TYP.sonst;
      const hm = L.marker([h.lat, h.lng], { icon: L.divIcon({ className: "gw-hs-pin hs-" + h.typ, html: `<span>${sym}</span>`, iconSize: [24, 24], iconAnchor: [12, 12] }), keyboard: false, zIndexOffset: 400 });
      hm.bindTooltip(`${label}${h.tiefe != null ? " · " + String(h.tiefe).replace(".", ",") + " m" : ""}${h.notiz ? ": " + h.notiz : ""}`, { direction: "top", offset: [0, -10] });
      hm.on("click", ev => { L.DomEvent.stopPropagation(ev); hotspotForm(sp.id, h, h.lat, h.lng, m2 => { neuZeichnenFn(); }); });
      hm.addTo(schicht);
    });
  });
  flussLaden();
}

/* Verläufe für Flüsse im sichtbaren Ausschnitt nachladen (ab mittlerem Zoom) */
function flussLaden(){
  if(!karte || karte.getZoom() < 8) return;
  const b = karte.getBounds().pad(0.3);
  const fehlen = eintraege().filter(e => istFluss(e) && !linienVon(e) && b.contains([e.lat, e.lng]));
  const sel = eintraege().find(e => e.id === kst.auswahl && istFluss(e) && !linienVon(e));
  if(sel && !fehlen.includes(sel)) fehlen.unshift(sel);
  if(fehlen.length) anfordern(fehlen, () => zeichneMarker());
}

let neuZeichnenFn = () => {};
export function initKarte(fn){ neuZeichnenFn = fn; }
function waehle(id, zentrieren){
  kst.auswahl = id;
  const e = eintraege().find(x => x.id === id);
  const lin = e && istFluss(e) ? linienVon(e) : null;
  if(zentrieren && lin && karte) karte.fitBounds(L.latLngBounds(lin.flat()), { padding: [20, 20], maxZoom: 13 });
  else if(zentrieren && e && karte) karte.setView([e.lat, e.lng], Math.max(karte.getZoom(), 11));
  neuZeichnenFn();
  const s = document.getElementById("gw-steckbrief"); if(s && !matchMedia("(min-width: 900px)").matches) s.scrollIntoView({ block: "start", behavior: "smooth" });
}

/* Nach dem Einfügen der Seite: Karte einhängen und Marker zeichnen */
export function karteEinhaengen(){
  const platz = document.getElementById("gw-karten-platz");
  if(!platz || typeof L === "undefined") return;
  if(!karte) karteErzeugen();
  platz.appendChild(kartenEl);
  setTimeout(() => { karte.invalidateSize(); zeichneMarker(); }, 0);
  vorabGeladen.then(() => zeichneMarker());
}

/* ---------- Seite ---------- */
export function gewaesserHTML(){
  if(typeof L === "undefined") return `<section class="gewaesser"><p class="leer">Die Karte konnte nicht geladen werden (keine Verbindung?). Die Liste der Gewässer funktioniert trotzdem, sobald du wieder online bist.</p></section>`;
  const alle = eintraege();
  const q = kst.suche.toLowerCase();
  const liste = q ? alle.filter(e => (e.name + " " + e.unter + " " + (e.roh.notes || "") + " " + (e.roh.adr || "") + " " + (e.roh.fische || "") + " " + (e.roh.ort || "")).toLowerCase().includes(q)) : alle.filter(e => e.ebene !== "osm" && e.ebene !== "faenge");
  const sortiert = liste.sort((a, b) => (b.eigen ? 1 : 0) - (a.eigen ? 1 : 0) || a.name.localeCompare(b.name, "de")).slice(0, 60);
  const aktiv = alle.find(e => e.id === kst.auswahl);
  return `<section class="gewaesser">
    <div class="gw-werkzeug">
      <div class="chips gw-ebenen" role="group" aria-label="Ebenen">${EBENEN.map(eb => `<button type="button" class="chip${kst.ebenen[eb.id] ? " on" : ""}" data-ebene="${eb.id}" aria-pressed="${!!kst.ebenen[eb.id]}"><span class="gw-punkt" style="background:var(${eb.farbe})"></span>${eb.label}</button>`).join("")}</div>
      <div class="gw-zeile">
        <label class="such"><span class="vh">Gewässer suchen</span><input id="gw-suche" type="search" placeholder="Gewässer, Ort, Notiz …" value="${esc(kst.suche)}" autocomplete="off"></label>
        <button type="button" class="knopf" data-gw-neu>+ Spot</button>
      </div>
    </div>
    <div class="gw-raster">
      <div class="gw-links">
        <div id="gw-karten-platz" class="gw-karten-platz"></div>
        <p class="gw-offline"><button type="button" class="knopf klein leise" data-gw-offline>Ausschnitt offline speichern</button><span class="hinweis-klein" id="gw-offline-status"></span></p>
        ${setzModus ? `<p class="gw-setzen">Tippe auf die Karte, um die Position zu setzen (zum Genauen: nah heranzoomen). <button type="button" class="knopf klein leise" data-gw-setzen-ab>Abbrechen</button></p>` : ""}
        ${kst.ebenen.fuehrer ? grundkostenHTML() : ""}
        ${scheineHTML()}
      </div>
      <div class="gw-rechts">
        <div id="gw-steckbrief">${aktiv ? steckbriefHTML(aktiv) : `<p class="hinweis-klein">Tippe auf einen Punkt in der Karte oder ein Gewässer in der Liste.</p>`}</div>
        <h3 class="gw-liste-titel">${q ? `${liste.length} Treffer` : "Gewässer"}</h3>
        <ul class="gw-liste">${sortiert.map(e => `<li><button type="button" class="gw-eintrag${kst.auswahl === e.id ? " sel" : ""}" data-gw-wahl="${esc(e.id)}">
          <span class="gw-punkt" style="background:var(${EBENEN.find(x => x.id === e.ebene).farbe})"></span>
          <span class="gw-txt"><b>${esc(e.name)}</b><small>${esc(e.unter)}</small></span></button></li>`).join("")}</ul>
        ${liste.length > sortiert.length ? `<p class="hinweis-klein">Weitere ${liste.length - sortiert.length} – Suche oder Karte nutzen.</p>` : ""}
      </div>
    </div>
  </section>`;
}

function faengeAm(spotId){
  const f = ladeFaengeDaten();
  return f.catches.filter(c => c.spotId === spotId).sort((a, b) => String(b.datum).localeCompare(String(a.datum)));
}

/* Steckbrief der Ebene „Meine Fänge“: was, wann, womit an diesem Spot */
function fangUebersicht(fa, spot){
  const name = id => ((FISCHE.find(f => f.id === id) || {}).name || id || "").split(" (")[0];
  const arten = {};
  fa.forEach(c => { const k = c.fischId || c.fischName; const a = arten[k] = arten[k] || { name: c.fischId ? name(c.fischId) : c.fischName, n: 0, max: 0 }; a.n++; if(+c.laenge > a.max) a.max = +c.laenge; });
  const zaehle = arr => { const z = {}; arr.filter(Boolean).forEach(x => z[x] = (z[x] || 0) + 1); return Object.entries(z).sort((a, b) => b[1] - a[1]); };
  const tz = zaehle(fa.map(c => c.tz))[0];
  const TZ = { daemmerung_morgen: "Morgendämmerung", vormittag: "Vormittag", mittag: "Mittag", nachmittag: "Nachmittag", daemmerung_abend: "Abenddämmerung", nacht: "Nacht" };
  const monate = zaehle(fa.map(c => c.datum && new Date(c.datum + "T12:00:00").toLocaleDateString("de-DE", { month: "long" })));
  return `<div class="gw-fang-arten">${Object.values(arten).sort((a, b) => b.n - a.n).map(a => `<span><b>${a.n}×</b> ${esc(a.name)}${a.max ? ` <small>bis ${a.max} cm</small>` : ""}</span>`).join("")}</div>
    <dl class="reihen">
      ${tz ? `<div class="reihe"><dt>Beste Zeit</dt><dd>${esc(TZ[tz[0]] || tz[0])} (${tz[1]}×)</dd></div>` : ""}
      ${monate.length ? `<div class="reihe"><dt>Monate</dt><dd>${monate.slice(0, 3).map(([m, n]) => `${esc(m)} ${n}×`).join(" · ")}</dd></div>` : ""}
    </dl>
    <ul class="gw-fang-liste">${fa.slice(0, 6).map(c => `<li>${esc(datumKurz(c.datum))}${c.uhrzeit ? " · " + esc(c.uhrzeit) : ""} · ${esc(c.fischId ? name(c.fischId) : c.fischName)}${c.laenge ? " · " + esc(c.laenge) + " cm" : ""}${c.koeder ? " · " + esc(c.koeder) : ""}</li>`).join("")}</ul>
    <p><button type="button" class="knopf leise klein" data-gw-wahl="spot:${esc(spot.id)}">Spot-Steckbrief öffnen ›</button></p>`;
}

/* Google Maps mit Ziel = Koordinaten des Spots. Auf dem Handy öffnet der Link
   die Google-Maps-App (falls installiert) direkt in der Routenführung. */
export const naviLink = (lat, lng) => `https://www.google.com/maps/dir/?api=1&destination=${(+lat).toFixed(6)},${(+lng).toFixed(6)}&travelmode=driving`;
function steckbriefHTML(e){
  const r = e.roh;
  const heuteKnopf = e.ebene === "spots" || e.ebene === "faenge" ? `<button type="button" class="knopf prim" data-gw-heute="${esc(e.ebene === "faenge" ? r.spot.id : r.id)}">Heute hier angeln</button>` : "";
  const alsSpot = !["spots", "kueste", "faenge"].includes(e.ebene) ? `<button type="button" class="knopf" data-gw-alsspot="${esc(e.id)}">Als Spot speichern</button>` : "";
  let inhalt = "";
  if(e.ebene === "spots"){
    const fa = faengeAm(r.id);
    const groesster = fa.filter(c => +c.laenge).sort((a, b) => b.laenge - a.laenge)[0];
    inhalt = `<dl class="reihen">
      ${r.price ? `<div class="reihe"><dt>Karte</dt><dd>${String(r.price).replace(".", ",")} € / Tag</dd></div>` : ""}
      ${r.rating ? `<div class="reihe"><dt>Wertung</dt><dd>${"★".repeat(r.rating)}${"☆".repeat(5 - r.rating)}</dd></div>` : ""}
      ${r.notes ? `<div class="reihe"><dt>Notiz</dt><dd>${esc(r.notes)}</dd></div>` : ""}
    </dl>
    ${hotspotsHTML(r)}
    ${scheineSpotHTML(r.id)}
    <div class="gw-faenge">${fa.length ? `<b>${fa.length > 1 ? fa.length + " Fänge" : "1 Fang"} hier</b> · zuletzt ${esc(fa[0].datum)}${groesster ? ` · größter: ${esc(groesster.fischName)} ${esc(groesster.laenge)} cm` : ""}
      <ul>${fa.slice(0, 5).map(c => `<li>${esc(c.datum)} · ${esc(c.fischName || c.fischId)}${c.laenge ? " · " + esc(c.laenge) + " cm" : ""}${c.methode ? " · " + esc(c.methode.split(" – ")[0]) : ""}</li>`).join("")}</ul>` : `<span class="hinweis-klein">Noch keine Fänge hier eingetragen.</span>`}</div>`;
  } else if(e.ebene === "faenge"){
    inhalt = fangUebersicht(e.roh.faenge, e.roh.spot);
  } else if(e.ebene === "lav"){
    inhalt = `<dl class="reihen">${(r.gruppen || []).map(g => `<div class="reihe"><dt>${esc(g.name)}</dt><dd>${esc(g.preise)}</dd></div>`).join("")}</dl>
      ${r.url ? `<p><a href="${esc(r.url)}" target="_blank" rel="noopener">Gewässerseite beim LAV ›</a></p>` : ""}
      <p class="hinweis-klein">${esc(typeof LAV_GEWAESSER_META !== "undefined" ? LAV_GEWAESSER_META.stand : "")} – Preise vor dem Angeltag prüfen.</p>`;
  } else if(e.ebene === "fuehrer"){
    inhalt = fuehrerHTML(r);
  } else if(e.ebene === "dk"){
    const notiz = dkNotizen()[r.nr] || "";
    inhalt = `<dl class="reihen">
      <div class="reihe"><dt>Adresse</dt><dd>${esc(r.adr)}</dd></div>
      <div class="reihe"><dt>Gewässer</dt><dd>${esc(r.gew || "–")}</dd></div>
      <div class="reihe"><dt>Saison</dt><dd>${esc(r.saison || "–")}</dd></div>
      ${r.hund ? `<div class="reihe"><dt>Hund</dt><dd>${esc(r.hund)}</dd></div>` : ""}
      ${(r.aus || []).length ? `<div class="reihe"><dt>Vor Ort</dt><dd>${r.aus.map(esc).join(" · ")}</dd></div>` : ""}
      ${r.tel ? `<div class="reihe"><dt>Telefon</dt><dd>${esc(r.tel)}</dd></div>` : ""}
    </dl>
    ${(r.links || []).map(([t, u]) => `<a href="${esc(u)}" target="_blank" rel="noopener">${esc(t)} ›</a>`).join(" · ")}
    <label class="feld breit gw-notiz"><span>Deine Notiz (Preise, Erfahrungen)</span><textarea id="gw-dk-notiz" data-dk-nr="${r.nr}" rows="2" placeholder="z. B. 4 Std. 2 Fische 250 DKK">${esc(notiz)}</textarea></label>
    <p class="hinweis-klein">In Dänemark brauchst du den Fisketegn (dänischer Angelschein) – an Put-&-Take-Anlagen oft nicht, dort gilt die Tageskarte. Vorher prüfen.</p>`;
  } else if(e.ebene === "kueste"){
    inhalt = `<p>${esc(r.text)}</p><p class="hinweis-klein">${esc(KUESTE_TEXT)}</p>`;
  } else {
    inhalt = `<p class="hinweis-klein">Angelstelle aus OpenStreetMap – ob dort geangelt werden darf, steht in OSM nicht. Gewässerordnung prüfen.</p>`;
  }
  const eb = EBENEN.find(x => x.id === e.ebene);
  return `<article class="gw-karte-steck">
    <p class="eyebrow">${esc(eb.label)}</p>
    <h2>${esc(e.name)}</h2>
    <p class="det-sub">${esc(e.unter)}</p>
    <a class="knopf prim gw-navi" href="${naviLink(e.lat, e.lng)}" target="_blank" rel="noopener">Navigieren</a>
    ${e.ebene !== "faenge" ? spotWetterHTML(e, () => neuZeichnenFn()) : ""}
    ${istFluss(e) ? `<p class="hinweis-klein">${linienVon(e) ? `Die Linie zeigt den Verlauf aus OpenStreetMap im Umkreis von etwa ${UMKREIS_KM} km um den Zugangspunkt – nicht die erlaubte Angelstrecke. Die steht im Erlaubnisschein.` : "Verlauf wird geladen, sobald du online bist …"}</p>` : ""}
    ${istFluss(e) ? pegelHTML(e) : ""}
    ${inhalt}
    <div class="akt-zeile">${heuteKnopf}${alsSpot}${e.ebene === "spots" ? `<button type="button" class="knopf" data-gw-bearb="${esc(r.id)}">Bearbeiten</button>` : ""}
      ${e.ebene !== "faenge" ? `<button type="button" class="knopf leise" data-gw-teilen="${esc(e.id)}">Teilen</button><button type="button" class="knopf leise" data-gw-plan="${esc(e.id)}">Angeltag hier planen</button>` : ""}</div>
  </article>`;
}

/* ---------- Spot anlegen / bearbeiten ---------- */
/* ---------- Hotspots im Spot: Kante, Steine, Kraut, Tiefe, Biss-Stelle … ---------- */
export const HS_TYP = { kante: ["K", "Kante / Abbruch"], steine: ["S", "Steinpackung"], kraut: ["Kr", "Krautfeld"], tief: ["T", "Loch / tiefe Stelle"],
  flach: ["F", "Flachwasser"], bauwerk: ["B", "Steg / Bauwerk"], stroemung: ["E", "Einlauf / Strömung"], biss: ["★", "Hier gebissen"], sonst: ["•", "Notiz"] };
const hsGenId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
function hotspotForm(spotId, hs, lat, lng, fertig){
  const d = $blatt();
  const h = hs || { typ: "kante" };
  d.innerHTML = `<form class="blatt-form" novalidate>
    <div class="dialog-kopf"><h2>${hs ? "Hotspot bearbeiten" : "Neuer Hotspot"}</h2><button type="button" class="rund" data-blatt-zu aria-label="Schließen">✕</button></div>
    <div class="feld-raster">
      <label class="feld breit"><span>Was ist hier?</span><select name="typ">${Object.entries(HS_TYP).map(([k, [, l]]) => `<option value="${k}"${h.typ === k ? " selected" : ""}>${l}</option>`).join("")}</select></label>
      <label class="feld"><span>Tiefe (m)</span><input name="tiefe" inputmode="decimal" value="${h.tiefe != null ? String(h.tiefe).replace(".", ",") : ""}" placeholder="optional"></label>
      <label class="feld breit"><span>Notiz</span><textarea name="notiz" rows="2" placeholder="z. B. Kante auf 4 m, Zander abends, Hänger-Gefahr">${esc(h.notiz || "")}</textarea></label>
    </div>
    <div class="blatt-akt"><button type="submit" class="knopf prim">Speichern</button></div>
    ${hs ? `<div class="gefahr"><button type="submit" class="knopf warn" value="loeschen" formnovalidate>Hotspot löschen</button></div>` : ""}
  </form>`;
  const form = d.querySelector("form");
  d.querySelector("[data-blatt-zu]").addEventListener("click", () => d.close());
  form.addEventListener("submit", ev => {
    ev.preventDefault();
    const fd = new FormData(form);
    const daten = ladeFaengeDaten();
    const sp = daten.spots.find(x => x.id === spotId); if(!sp){ d.close(); return; }
    sp.hotspots = sp.hotspots || [];
    if(ev.submitter && ev.submitter.value === "loeschen") sp.hotspots = sp.hotspots.filter(x => x.id !== hs.id);
    else {
      const t = parseFloat(String(fd.get("tiefe") || "").replace(",", "."));
      const neu = { ...(hs || { id: hsGenId(), lat, lng, erstellt: new Date().toISOString() }), typ: fd.get("typ"), tiefe: isNaN(t) ? null : t, notiz: String(fd.get("notiz") || "").trim() };
      if(hs) sp.hotspots = sp.hotspots.map(x => x.id === hs.id ? neu : x); else sp.hotspots.push(neu);
    }
    speichereFaengeDaten(daten); d.close(); fertig(ev.submitter && ev.submitter.value === "loeschen" ? "Hotspot gelöscht" : "Hotspot gespeichert");
  });
  d.showModal();
}
function hotspotsHTML(r){
  const hs = r.hotspots || [];
  return `<div class="gw-hs"><div class="gw-hs-kopf"><b>Hotspots${hs.length ? ` (${hs.length})` : ""}</b><button type="button" class="knopf klein" data-hs-neu="${esc(r.id)}">+ Hotspot setzen</button></div>
    ${hs.length ? `<ul class="gw-hs-liste">${hs.map(h => `<li><button type="button" class="gw-hs-zeile" data-hs-zeige="${esc(r.id)}|${esc(h.id)}">
      <span class="gw-hs-sym hs-${esc(h.typ)}">${HS_TYP[h.typ] ? HS_TYP[h.typ][0] : "•"}</span>
      <span><b>${esc(HS_TYP[h.typ] ? HS_TYP[h.typ][1] : "Notiz")}${h.tiefe != null ? ` · ${String(h.tiefe).replace(".", ",")} m` : ""}</b>${h.notiz ? `<small>${esc(h.notiz)}</small>` : ""}</span></button>
      <button type="button" class="knopf klein leise" data-hs-bearb="${esc(r.id)}|${esc(h.id)}" aria-label="Hotspot bearbeiten">✎</button></li>`).join("")}</ul>`
      : `<p class="hinweis-klein">Markiere Kanten, Steinpackungen, Krautfelder, tiefe Löcher oder wo es gebissen hat – sie erscheinen auf der Karte, sobald der Spot gewählt ist.</p>`}</div>`;
}

function spotForm(spot, lat, lng, fertig){
  const d = $blatt();
  const s = spot || {};
  d.innerHTML = `<form class="blatt-form" novalidate>
    <div class="dialog-kopf"><h2>${spot ? "Spot bearbeiten" : "Neuer Spot"}</h2><button type="button" class="rund" data-blatt-zu aria-label="Schließen">✕</button></div>
    <div class="feld-raster">
      <label class="feld breit"><span>Name *</span><input name="name" value="${esc(s.name)}" required autocomplete="off" placeholder="z. B. Eider Steinpackung Fockbek"></label>
      <label class="feld"><span>Art</span><select name="type">${Object.entries(TYP).map(([k, v]) => `<option value="${k}"${(s.type || "see") === k ? " selected" : ""}>${v}</option>`).join("")}</select></label>
      <label class="feld"><span>Region</span><select name="region">${Object.entries(REGION).map(([k, v]) => `<option value="${k}"${(s.region || "sh") === k ? " selected" : ""}>${v}</option>`).join("")}</select></label>
      <label class="feld"><span>Tageskarte (€)</span><input name="price" inputmode="decimal" value="${s.price ? String(s.price).replace(".", ",") : ""}" placeholder="optional"></label>
      <label class="feld"><span>Wertung</span><select name="rating">${[0, 1, 2, 3, 4, 5].map(n => `<option value="${n}"${(s.rating || 0) === n ? " selected" : ""}>${n ? "★".repeat(n) : "keine"}</option>`).join("")}</select></label>
      <label class="feld breit"><span>Notiz</span><textarea name="notes" rows="2" placeholder="Fische, Zufahrt, Besonderheiten …">${esc(s.notes)}</textarea></label>
      <p class="feld breit hinweis-klein">Position: <span class="mono">${lat.toFixed(5)}, ${lng.toFixed(5)}</span></p>
    </div>
    <p class="fehler" id="blatt-fehler" hidden></p>
    <div class="blatt-akt"><button type="submit" class="knopf prim">Speichern</button></div>
    ${spot ? `<div class="gefahr"><button type="submit" class="knopf warn" value="loeschen" formnovalidate>Spot löschen</button></div>` : ""}
  </form>`;
  const form = d.querySelector("form");
  d.querySelector("[data-blatt-zu]").addEventListener("click", () => d.close());
  form.addEventListener("submit", ev => {
    ev.preventDefault();
    const fd = new FormData(form);
    const daten = ladeFaengeDaten();
    if(ev.submitter && ev.submitter.value === "loeschen"){
      const n = faengeAm(spot.id).length;
      if(!confirm(`„${spot.name}“ löschen?${n ? `\n\n${n} Fänge bleiben erhalten, verlieren aber den Ortsbezug.` : ""}`)) return;
      daten.spots = daten.spots.filter(x => x.id !== spot.id);
      speichereFaengeDaten(daten); d.close(); kst.auswahl = null; fertig("Spot gelöscht"); return;
    }
    const name = String(fd.get("name") || "").trim();
    if(!name){ const f = d.querySelector("#blatt-fehler"); f.textContent = "Bitte einen Namen eintragen."; f.hidden = false; return; }
    const neu = { ...(spot || { id: genId(), visited: true, created: new Date().toISOString() }), name, type: fd.get("type"), region: fd.get("region"),
      price: parseFloat(String(fd.get("price") || "").replace(",", ".")) || 0, rating: +fd.get("rating") || 0, notes: String(fd.get("notes") || "").trim(), lat, lng };
    if(spot) daten.spots = daten.spots.map(x => x.id === spot.id ? neu : x); else daten.spots.push(neu);
    speichereFaengeDaten(daten); d.close(); kst.auswahl = "spot:" + neu.id; fertig(spot ? "Spot gespeichert" : "Spot angelegt");
  });
  d.showModal();
}
function $blatt(){ return document.getElementById("blatt"); }

/* ---------- Ereignisse (von main.js aufgerufen) ---------- */
export function karteKlick(e, toast, geheZuHeute){
  const t = e.target;
  const eb = t.closest("[data-ebene]");
  if(eb){ kst.ebenen[eb.dataset.ebene] = !kst.ebenen[eb.dataset.ebene]; merke(); neuZeichnenFn(); return true; }
  const w = t.closest("[data-gw-wahl]");
  if(w){ waehle(w.dataset.gwWahl, true); return true; }
  if(t.closest("[data-gw-offline]")){
    if(!karte) return true;
    const st = document.getElementById("gw-offline-status");
    if(karte.getZoom() < 11){ toast("Bitte näher heranzoomen – gespeichert wird nur ein kleiner Ausschnitt"); return true; }
    t.closest("[data-gw-offline]").disabled = true;
    kachelnAusschnitt(karte.getBounds(), karte.getZoom(), (a, b) => { if(st) st.textContent = ` ${a} von ${b} …`; })
      .then(r => { if(st) st.textContent = ` ${r.n} Kacheln gespeichert${r.begrenzt ? " (Ausschnitt gekürzt – für mehr näher heranzoomen)" : ""}.`; toast("Kartenausschnitt offline gespeichert"); })
      .catch(err => { if(st) st.textContent = " " + err.message; })
      .finally(() => { const b = document.querySelector("[data-gw-offline]"); if(b) b.disabled = false; });
    return true;
  }
  if(spotWetterKlick(e)){ neuZeichnenFn(); return true; }
  const h = t.closest("[data-gw-heute]");
  if(h){ geheZuHeute("spot_" + h.dataset.gwHeute); return true; }
  const b = t.closest("[data-gw-bearb]");
  if(b){ const s = ladeFaengeDaten().spots.find(x => x.id === b.dataset.gwBearb); if(s) spotForm(s, s.lat, s.lng, m => { toast(m); neuZeichnenFn(); }); return true; }
  const gt = t.closest("[data-gw-teilen]");
  if(gt){ const e2 = eintraege().find(x => x.id === gt.dataset.gwTeilen); if(e2) spotTeilen(e2, toast); return true; }
  const gp = t.closest("[data-gw-plan]");
  if(gp){ const e2 = eintraege().find(x => x.id === gp.dataset.gwPlan); if(e2) planTeilen({ ort: { n: e2.name, la: +e2.lat.toFixed(5), lo: +e2.lng.toFixed(5) } }, toast); return true; }
  const as = t.closest("[data-gw-alsspot]");
  if(as){
    const e2 = eintraege().find(x => x.id === as.dataset.gwAlsspot);
    if(e2) spotForm(null, e2.lat, e2.lng, m => { toast(m); neuZeichnenFn(); });
    const n = document.querySelector('#blatt input[name="name"]'); if(n && e2) n.value = e2.name;
    const ty = document.querySelector('#blatt select[name="type"]'); if(ty && e2 && e2.ebene === "dk") ty.value = "forellensee";
    const rg = document.querySelector('#blatt select[name="region"]'); if(rg && e2 && e2.ebene === "dk") rg.value = "dk";
    if(e2 && e2.ebene === "fuehrer"){
      const g = e2.roh;
      if(ty) ty.value = g.art;
      if(rg) rg.value = g.region;
      const pr = document.querySelector('#blatt input[name="price"]'); const tag = (g.karten || []).find(k => /^tag/i.test(k[0]));
      if(pr && tag && g.preis === "ok"){ const n = parseFloat(tag[1].replace(",", ".")); if(!isNaN(n)) pr.value = String(n).replace(".", ","); }
      const no = document.querySelector('#blatt textarea[name="notes"]'); if(no) no.value = [g.fische, g.tipp].filter(Boolean).join(" | ");
    }
    return true;
  }
  const hn = t.closest("[data-hs-neu]");
  if(hn){
    const spotId = hn.dataset.hsNeu;
    setzModus = (lat, lng) => { setzModus = null; hotspotForm(spotId, null, lat, lng, m => { toast(m); if(setzMarker){ karte.removeLayer(setzMarker); setzMarker = null; } neuZeichnenFn(); }); };
    const sp = ladeFaengeDaten().spots.find(x => x.id === spotId);
    if(sp && karte && typeof sp.lat === "number") karte.setView([sp.lat, sp.lng], Math.max(karte.getZoom(), 16));
    neuZeichnenFn();
    toast("Tippe auf die Karte, wo der Hotspot liegt");
    const k = document.getElementById("gw-karte"); if(k) k.scrollIntoView({ block: "center", behavior: "smooth" });
    return true;
  }
  const hz = t.closest("[data-hs-zeige]");
  if(hz){
    const [sid, hid] = hz.dataset.hsZeige.split("|");
    const h = ((ladeFaengeDaten().spots.find(x => x.id === sid) || {}).hotspots || []).find(x => x.id === hid);
    if(h && karte){ karte.setView([h.lat, h.lng], Math.max(karte.getZoom(), 17)); const k = document.getElementById("gw-karte"); if(k) k.scrollIntoView({ block: "center", behavior: "smooth" }); }
    return true;
  }
  const hb = t.closest("[data-hs-bearb]");
  if(hb){
    const [sid, hid] = hb.dataset.hsBearb.split("|");
    const h = ((ladeFaengeDaten().spots.find(x => x.id === sid) || {}).hotspots || []).find(x => x.id === hid);
    if(h) hotspotForm(sid, h, h.lat, h.lng, m => { toast(m); neuZeichnenFn(); });
    return true;
  }
  if(t.closest("[data-gw-neu]")){
    setzModus = (lat, lng) => { setzModus = null; spotForm(null, lat, lng, m => { toast(m); if(setzMarker){ karte.removeLayer(setzMarker); setzMarker = null; } neuZeichnenFn(); }); };
    neuZeichnenFn();
    toast("Tippe auf die Karte, wo der Spot liegt");
    return true;
  }
  if(t.closest("[data-gw-setzen-ab]")){ setzModus = null; neuZeichnenFn(); return true; }
  return false;
}
export function karteEingabe(e){
  if(e.target.id === "gw-suche"){ kst.suche = e.target.value; return true; }
  return false;
}
export function karteAenderung(e){
  if(e.target.id === "gw-dk-notiz"){ setzeDkNotiz(e.target.dataset.dkNr, e.target.value.trim()); return true; }
  return false;
}
