/* ============================================================
   Ausrüstung bearbeiten (Etappe 2)
   Formulare als Blatt (Handy: von unten, Desktop: mittig).
   Alle Änderungen laufen über AUSR (../ausruestung.js) und landen
   damit auch in der alten App und auf deinen anderen Geräten.
   ============================================================ */
import { setzePflege, pflege } from "./store.js";
import { heuteISO, komma, datumDE, ersterTeil } from "./setups.js";

const $ = s => document.querySelector(s);
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[c]));
const zahl = v => { const n = parseFloat(String(v ?? "").replace(",", ".").trim()); return isNaN(n) ? null : n; };
const kZahl = v => v === null || v === undefined || v === "" ? "" : komma(v);

let toastFn = () => {}, geheZuFn = () => {};
export function initEdit({ toast, geheZu }){ toastFn = toast; geheZuFn = geheZu; }

/* ---------- Blatt ---------- */
function blatt(titel, inhalt, onSubmit){
  const d = $("#blatt");
  d.innerHTML = `<form class="blatt-form" novalidate>
      <div class="dialog-kopf"><h2>${esc(titel)}</h2><button type="button" class="rund" data-blatt-zu aria-label="Schließen">✕</button></div>
      <div class="blatt-inhalt">${inhalt}</div>
      <p class="fehler" id="blatt-fehler" hidden></p>
    </form>`;
  const form = d.querySelector("form");
  form.addEventListener("submit", e => {
    e.preventDefault();
    const fehler = onSubmit(new FormData(form), e.submitter);
    if(fehler === false) return;   // abgebrochen (z. B. Rückfrage verneint) – Blatt bleibt offen
    if(fehler){ const f = $("#blatt-fehler"); f.textContent = fehler; f.hidden = false; return; }
    d.close();
  });
  d.querySelector("[data-blatt-zu]").addEventListener("click", () => d.close());
  d.showModal();
  const erstes = d.querySelector("input,select,textarea"); if(erstes && !matchMedia("(pointer:coarse)").matches) erstes.focus();
  return d;
}

const feld = (name, label, wert, opt = {}) => `<label class="feld${opt.breit ? " breit" : ""}"><span>${label}${opt.pflicht ? " *" : ""}</span>
  ${opt.textarea
    ? `<textarea name="${name}" id="f-${name}" rows="${opt.rows || 3}" placeholder="${esc(opt.ph || "")}">${esc(wert ?? "")}</textarea>`
    : `<input name="${name}" id="f-${name}" value="${esc(wert ?? "")}" ${opt.typ ? `type="${opt.typ}"` : ""} ${opt.im ? `inputmode="${opt.im}"` : ""} placeholder="${esc(opt.ph || "")}" ${opt.pflicht ? "required" : ""} autocomplete="off">`}
  </label>`;
const auswahl = (name, label, optionen, wert, opt = {}) => `<label class="feld${opt.breit ? " breit" : ""}"><span>${label}</span>
  <select name="${name}" id="f-${name}">${optionen.map(([v, l]) => `<option value="${esc(v)}"${String(v) === String(wert ?? "") ? " selected" : ""}>${esc(l)}</option>`).join("")}</select></label>`;
const KAT_OPT = () => SETUP_KATEGORIEN.map(k => [k.key, k.titel]);
const ART_OPT = [["geflecht", "Geflecht"], ["mono", "Monofil"], ["fc", "Fluorocarbon"], ["", "unbekannt"]];

/* Zusatzangaben aus einem alten Text holen: alles nach Name, Länge und WG */
function details(text, name){
  return String(text || "").split(" · ").slice(1)
    .filter(t => !/^\d+([,.]\d+)?\s*m$/.test(t.trim()) && !/^WG\b/.test(t.trim()) && t.trim() !== name)
    .join(" · ");
}
function zusatzAus(name){ const m = String(name || "").match(/\(([^)]+)\)\s*$/); return m ? m[1] : ""; }

function ruteFelder(r, set, neu){
  return `<div class="feld-raster">
    ${feld("name", "Name der Rute", r.name, { pflicht: true, breit: true, ph: "z. B. Sportex Air Spin Seatrout" })}
    ${auswahl("kategorie", "Einsatz-Gruppe", KAT_OPT(), set.kategorie || r.kategorie || "raubfisch")}
    ${feld("zusatz", "Zusatzname", zusatzAus(set.name), { ph: "z. B. Grundangeln 1" })}
    ${feld("laenge", "Länge (m)", kZahl(r.laenge), { im: "decimal", ph: "2,70" })}
    <div class="feld-paar">${feld("wgvon", "WG von (g)", r.wg ? kZahl(r.wg[0]) : "", { im: "decimal", ph: "7" })}${feld("wgbis", "WG bis (g)", r.wg ? kZahl(r.wg[1]) : "", { im: "decimal", ph: "25" })}</div>
    ${feld("details", "Weitere Angaben zur Rute", r.details ?? details(r.text, r.name), { breit: true, ph: "z. B. 2-teilig · 121 g · Aktion schnell" })}
    ${neu ? "" : feld("vorfach", "Vorfach", set.vorfach, { breit: true, textarea: true, rows: 2 })}
    ${neu ? "" : feld("extra", "Dazu (Köder, Kleinteile)", set.extra, { breit: true, textarea: true, rows: 2 })}
    ${feld("einsatz", "Einsatz", set.einsatz, { breit: true, textarea: true, rows: 3, ph: "Wofür nimmst du die Rute?" })}
    ${neu ? "" : feld("tippKompakt", "Tipp", set.tippKompakt, { breit: true, textarea: true, rows: 3 })}
  </div>`;
}
function leseRute(fd){
  const name = String(fd.get("name") || "").trim();
  if(!name) return { fehler: "Bitte einen Namen für die Rute eintragen." };
  const laenge = zahl(fd.get("laenge"));
  const von = zahl(fd.get("wgvon")), bis = zahl(fd.get("wgbis"));
  if((von === null) !== (bis === null)) return { fehler: "Wurfgewicht bitte mit beiden Werten (von und bis) eintragen – oder beide leer lassen." };
  if(von !== null && von > bis) return { fehler: "Beim Wurfgewicht ist „von“ größer als „bis“." };
  if(laenge !== null && (laenge < 0.5 || laenge > 20)) return { fehler: "Die Länge bitte in Metern eintragen, z. B. 2,70." };
  const d = { name, kategorie: fd.get("kategorie"), zusatz: String(fd.get("zusatz") || "").trim(), laenge,
    wg: von !== null ? [von, bis] : null, details: String(fd.get("details") || "").trim() };
  ["vorfach", "extra", "einsatz", "tippKompakt"].forEach(k => { if(fd.has(k)) d[k] = String(fd.get(k) || "").trim(); });
  return { d };
}

/* ---------- Rute ---------- */
export function ruteBearbeiten(setupKey){
  const s = AUSR.stand();
  const set = s.setups[setupKey]; if(!set) return;
  const r = s.ruten.find(x => x.id === set.ruteId); if(!r) return;
  blatt("Rute bearbeiten", ruteFelder(r, set, false) + `
    <div class="blatt-akt"><button type="submit" class="knopf prim" value="speichern">Speichern</button></div>
    <div class="gefahr"><p>Rute verkauft oder ausgemustert? Sie wandert ins Archiv, ihre Fänge bleiben erhalten. ${set.rolleId ? "Die Rolle wird frei." : ""}</p>
      <button type="submit" class="knopf warn" value="verkauft" formnovalidate>Als verkauft markieren</button></div>`,
    (fd, knopf) => {
      if(knopf && knopf.value === "verkauft"){
        if(!confirm(`„${r.name}“ als verkauft markieren?`)) return false;
        AUSR.verkaufe("rute", r.id);
        toastFn("Ins Archiv verschoben");
        geheZuFn("rutenwand", null);
        return null;
      }
      const { d, fehler } = leseRute(fd); if(fehler) return fehler;
      AUSR.aendereRute(r.id, d);
      toastFn("Rute gespeichert");
      return null;
    });
}

export function neueRute(){
  const frei = freieRollenVoll();
  blatt("Neue Rute", ruteFelder({}, {}, true) + `
    ${frei.length ? auswahl("rolle", "Gleich eine freie Rolle montieren?", [["", "– noch keine –"], ...frei.map(r => [r.id, r.name])], "", { breit: true }) : ""}
    <div class="blatt-akt"><button type="submit" class="knopf prim">Rute anlegen</button></div>`,
    fd => {
      const { d, fehler } = leseRute(fd); if(fehler) return fehler;
      const key = AUSR.neueRute(d);
      const rolle = fd.get("rolle");
      if(rolle) montiere(key, rolle, true);
      toastFn("Rute angelegt");
      geheZuFn("rutenwand", key);
      return null;
    });
}

/* ---------- Rolle ---------- */
function freieRollenVoll(){
  const s = AUSR.stand();
  const montiert = new Set(Object.values(s.setups).filter(x => s.ruten.some(r => r.id === x.ruteId && r.status !== "verkauft")).map(x => x.rolleId).filter(Boolean));
  return s.rollen.filter(r => r.status !== "verkauft" && !montiert.has(r.id));
}
function schnurFelder(info, mitDatum){
  return `<div class="feld-raster">
    ${feld("sbez", "Schnur", info.bezeichnung, { breit: true, ph: "z. B. J-Braid X8 Expedition" })}
    ${auswahl("sart", "Art", ART_OPT, info.art || "")}
    ${feld("sdm", "Ø (mm)", info.dm, { im: "decimal", ph: "0,12" })}
    ${feld("slaenge", "Länge (m)", info.laenge ?? "", { im: "numeric", ph: "150" })}
    ${mitDatum ? feld("sseit", "Aufgespult am", info.seit || heuteISO(), { typ: "date" }) : ""}
  </div>`;
}
function leseSchnur(fd){
  let dm = String(fd.get("sdm") || "").trim().replace(".", ",");
  if(dm && !/^0,\d{2,3}$/.test(dm)){
    const n = zahl(dm); if(n === null || n <= 0 || n >= 2) return { fehler: "Den Durchmesser bitte wie 0,12 eintragen." };
    dm = komma(n.toFixed(n * 1000 % 10 ? 3 : 2));
  }
  const laenge = fd.get("slaenge") ? Math.round(zahl(fd.get("slaenge"))) : null;
  const seit = fd.get("sseit") || null;
  if(seit && seit > heuteISO()) return { fehler: "Das Datum liegt in der Zukunft." };
  return { info: { bezeichnung: String(fd.get("sbez") || "").trim(), art: fd.get("sart") || "", dm, laenge: laenge || null, seit } };
}
function rolleFelder(r){
  return `<div class="feld-raster">
    ${feld("name", "Name der Rolle", r.name, { pflicht: true, breit: true, ph: "z. B. Daiwa Fuego LT 2500" })}
    ${feld("groesse", "Größe", r.groesse ?? "", { im: "numeric", ph: "2500" })}
    <label class="feld haken"><input type="checkbox" name="freilauf" id="f-freilauf"${r.freilauf ? " checked" : ""}><span>Freilauf (Baitrunner)</span></label>
    ${feld("details", "Weitere Angaben", r.details ?? details(r.text, r.name), { breit: true, ph: "z. B. Frontbremse · Übersetzung 5,2:1" })}
  </div>`;
}
function leseRolle(fd){
  const name = String(fd.get("name") || "").trim();
  if(!name) return { fehler: "Bitte einen Namen für die Rolle eintragen." };
  const g = zahl(fd.get("groesse"));
  if(g === null || g < 100 || g > 30000) return { fehler: "Die Größe bitte als Zahl eintragen, z. B. 2500." };
  return { d: { name, groesse: Math.round(g), freilauf: fd.get("freilauf") === "on", details: String(fd.get("details") || "").trim() } };
}

export function rolleBearbeiten(rolleId){
  const r = AUSR.stand().rollen.find(x => x.id === rolleId); if(!r) return;
  const auf = setupMitRolle(rolleId);
  blatt("Rolle bearbeiten", rolleFelder(r) + `
    <div class="blatt-akt"><button type="submit" class="knopf prim" value="speichern">Speichern</button></div>
    <div class="gefahr"><p>Rolle verkauft oder ausgemustert? Sie wandert ins Archiv.${auf ? ` Die Rute „${esc(ersterTeil(auf.name))}“ steht danach ohne Rolle da.` : ""}</p>
      <button type="submit" class="knopf warn" value="verkauft" formnovalidate>Als verkauft markieren</button></div>`,
    (fd, knopf) => {
      if(knopf && knopf.value === "verkauft"){
        if(!confirm(`„${r.name}“ als verkauft markieren?`)) return false;
        AUSR.verkaufe("rolle", r.id);
        if(auf) setzePflege("schnur", auf.key, null);
        toastFn("Ins Archiv verschoben");
        return null;
      }
      const { d, fehler } = leseRolle(fd); if(fehler) return fehler;
      AUSR.aendereRolle(r.id, d);
      toastFn("Rolle gespeichert");
      return null;
    });
}

export function neueRolle(zielSetup){
  const s = AUSR.stand();
  const ohne = Object.values(s.setups).filter(x => !x.rolleId && x.kategorie !== "stippe" && s.ruten.some(r => r.id === x.ruteId && r.status !== "verkauft"));
  blatt("Neue Rolle", rolleFelder({}) + `<h3 class="blatt-zwischen">Schnur darauf</h3>` + schnurFelder({}, true) +
    auswahl("auf", "Montieren auf", [["", "– frei lassen –"], ...ohne.map(x => [x.key, x.name])], zielSetup || "", { breit: true }) + `
    <div class="blatt-akt"><button type="submit" class="knopf prim">Rolle anlegen</button></div>`,
    fd => {
      const { d, fehler } = leseRolle(fd); if(fehler) return fehler;
      const sch = leseSchnur(fd); if(sch.fehler) return sch.fehler;
      if(!sch.info.bezeichnung && !sch.info.dm) sch.info.seit = null;
      const id = AUSR.neueRolle({ ...d, schnur: sch.info });
      const auf = fd.get("auf");
      if(auf) montiere(auf, id, true);
      toastFn(auf ? "Rolle angelegt und montiert" : "Rolle angelegt");
      return null;
    });
}

/* Wo sitzt die Rolle gerade? */
function setupMitRolle(rolleId){
  return Object.values(AKTUELL).find(x => x.rolleId === rolleId) || null;
}

/* ---------- Umbauen ---------- */
export function montiere(setupKey, rolleId, still){
  const auf = rolleId ? setupMitRolle(rolleId) : null;
  const ziel = AKTUELL[setupKey];
  if(!ziel) return;
  if(!still && auf && auf.key !== setupKey){
    if(!confirm(`Die Rolle sitzt gerade auf „${ersterTeil(auf.name)}“.\n\nUmsetzen? Diese Rute steht danach ohne Rolle da.`)) return;
  }
  const alteRolle = ziel.rolleId;
  /* Schnurdatum der alten App (am Setup gespeichert) wandert mit der Rolle */
  const datumDerRolle = rolleId ? ((AUSR.rolleVoll(rolleId)?.schnurInfo?.seit) || (auf ? pflege.schnur[auf.key] : null)) : null;
  AUSR.montiere(setupKey, rolleId);
  setzePflege("schnur", setupKey, datumDerRolle || null);
  if(auf && auf.key !== setupKey) setzePflege("schnur", auf.key, null);
  if(!still) toastFn(rolleId ? "Rolle montiert" : (alteRolle ? "Rolle abgenommen, sie liegt jetzt bei den freien Rollen" : "Keine Rolle montiert"));
}

/* ---------- Schnur ---------- */
export function schnurWechseln(rolleId, setupKey){
  const r = AUSR.rolleVoll(rolleId); if(!r) return;
  const info = { ...(r.schnurInfo || AUSR.parseSchnur(r.schnur)), seit: heuteISO() };
  blatt("Schnur wechseln", `<p class="hinweis-klein">Auf <b>${esc(r.name)}</b>. Die bisherige Schnur kommt in den Verlauf.</p>` + schnurFelder(info, true) + `
    <div class="blatt-akt"><button type="submit" class="knopf prim">Neue Schnur speichern</button></div>`,
    fd => {
      const { info: neu, fehler } = leseSchnur(fd); if(fehler) return fehler;
      if(!neu.bezeichnung && !neu.dm) return "Bitte mindestens die Schnur oder ihren Durchmesser eintragen.";
      AUSR.wechsleSchnur(rolleId, neu);
      if(setupKey) setzePflege("schnur", setupKey, neu.seit);
      toastFn("Neue Schnur gespeichert");
      return null;
    });
}

/* Gleiche Schnur, nur das Datum (frisch aufgespult oder korrigiert) */
export function schnurDatum(rolleId, setupKey, datum){
  AUSR.setzeSchnurDatum(rolleId, datum);
  setzePflege("schnur", setupKey, datum);
}

export function zurueckholen(art, id){
  AUSR.zurueckholen(art, id);
  toastFn(art === "rute" ? "Rute ist zurück auf der Rutenwand" : "Rolle ist zurück bei den freien Rollen");
}

export { datumDE };
