/* ============================================================
   Fangbuch (Etappe 6)
   Fänge (meine_faenge_v1, wie bisher) und Ausflüge (bisher „Tagebuch“,
   tagebuch.js) in einem Verlauf. Jeder Fang kennt sein Setup, seinen
   Spot und die Uhrzeit – daraus entsteht die Statistik.
   Beim Eintragen zeigt das Fangbuch Mindestmaß und Schonzeit an.
   ============================================================ */
import { ladeFaengeDaten, speichereFaengeDaten, lese, schreibe } from "./store.js";
import { alleSetups, heuteISO, datumDE, komma, katByKey } from "./setups.js";
import { saisonHTML, saisonKlick } from "./saison.js";
import { ausfluege, ausfluegeGeladen, ladeAusfluege, speichereAusflug, loescheAusflug } from "./tagebuch.js";
import { rechtFuer, ladeWetter, tagesLage, windRichtung, orteListe } from "./lage.js";
import { blatt, feld, auswahl } from "./edit.js";
import { hst } from "./heute.js";
import { tasche } from "./tasche.js";
import { limitHTML } from "./scheine.js";

const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[c]));
const zahl = v => { const n = parseFloat(String(v ?? "").replace(",", ".").trim()); return isNaN(n) ? null : n; };
const genId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const jetztZeit = () => new Date().toTimeString().slice(0, 5);
const KEY = "neu_fangbuch_v1";
export const fst = Object.assign({ ansicht: "verlauf", fisch: "", tage: 40 }, lese(KEY, {}) || {});
const merke = () => schreibe(KEY, { ansicht: fst.ansicht, fisch: fst.fisch });

let toastFn = () => {}, renderFn = () => {};
export function initFangbuch({ toast, render }){ toastFn = toast; renderFn = render; }

/* ---------- Tageszeit ---------- */
const TZ = [
  ["daemmerung_morgen", "Morgendämmerung"], ["vormittag", "Vormittag"], ["mittag", "Mittag"],
  ["nachmittag", "Nachmittag"], ["daemmerung_abend", "Abenddämmerung"], ["nacht", "Nacht"]
];
const TZ_NAME = Object.fromEntries(TZ);
/* grob nach Uhrzeit; Dämmerung je nach Monat (Norddeutschland) */
function tageszeitVon(uhr, datum){
  if(!uhr) return null;
  const [h, m] = uhr.split(":").map(Number); const t = h + (m || 0) / 60;
  const mon = datum ? +datum.slice(5, 7) : 6;
  const auf = [8.5, 7.7, 6.8, 6.6, 5.5, 4.9, 5.1, 5.9, 6.9, 7.8, 7.8, 8.6][mon - 1];
  const unter = [16.5, 17.4, 18.4, 20.4, 21.3, 21.9, 21.8, 20.9, 19.7, 18.5, 16.5, 16.0][mon - 1];
  if(t >= auf - 1 && t < auf + 1.5) return "daemmerung_morgen";
  if(t >= unter - 1.5 && t < unter + 1) return "daemmerung_abend";
  if(t < auf - 1 || t >= unter + 1) return "nacht";
  if(t < 11) return "vormittag";
  if(t < 14) return "mittag";
  return "nachmittag";
}

/* ---------- Zuordnung ---------- */
let SETUPS = [], SETUP_BY = {};
function setupsNeu(){ SETUPS = alleSetups(); SETUP_BY = Object.fromEntries(SETUPS.map(s => [s.key, s])); }
const setupName = key => { const s = SETUP_BY[key] || (AKTUELL[key] ? { titel: AKTUELL[key].name.split(" · ")[0] } : null); return s ? s.titel + (s.zusatz ? " (" + s.zusatz + ")" : "") : null; };

/* Alte Fänge ohne Setup: über Fischart + Berater-Methode (eindeutig) */
function methodenKarte(){
  const m = {};
  FISCHE.forEach(f => (f.ansaetze || []).forEach(a => { const k = f.id + "::" + a.methode; if(a.setup) (m[k] = m[k] || new Set()).add(a.setup); }));
  return m;
}
function fischIdAus(name){
  const n = String(name || "").toLowerCase().trim();
  if(!n) return null;
  const f = FISCHE.find(x => x.name.toLowerCase() === n) || FISCHE.find(x => n.includes(x.name.toLowerCase().split(/[ (/]/)[0]) || x.name.toLowerCase().includes(n));
  return f ? f.id : null;
}
const fischName = id => (FISCHE.find(f => f.id === id) || {}).name || id;

/* Alle Fänge in einer Liste: eigene Fang-Einträge + Fänge, die in alten
   Ausflügen (Tagebuch) eingebettet sind */
export function alleFaenge(){
  const mk = methodenKarte();
  const d = ladeFaengeDaten();
  const out = d.catches.map(c => {
    let setup = c.setup || null, geraten = false;
    if(!setup && c.fischId && c.methode){ const s = mk[c.fischId + "::" + c.methode]; if(s && s.size === 1){ setup = [...s][0]; geraten = true; } }
    return { ...c, fischId: c.fischId || fischIdAus(c.fischName), setup, setupGeraten: geraten,
      tz: c.uhrzeit ? tageszeitVon(c.uhrzeit, c.datum) : (c.zeit || null), quelle: "fang" };
  });
  ausfluege().forEach(a => (a.faenge || []).forEach((f, i) => {
    if(!f.art) return;
    out.push({ id: a.id + "#" + i, quelle: "ausflug", ausflugId: a.id, datum: a.datum, fischName: f.art, fischId: fischIdAus(f.art),
      laenge: f.laenge, gewicht: f.gewicht, spotId: a.spotId || null, setup: a.setup || null, methode: a.methode || null,
      koeder: a.koeder || null, tz: a.von ? tageszeitVon(a.von, a.datum) : null });
  }));
  return out;
}
export function faengeZuSetup(keys){
  const ks = new Set(keys);
  return alleFaenge().filter(c => c.setup && ks.has(c.setup)).sort((a, b) => String(b.datum).localeCompare(String(a.datum)) || String(b.uhrzeit || "").localeCompare(String(a.uhrzeit || "")));
}

/* ---------- Spots ---------- */
function spots(){
  const d = ladeFaengeDaten();
  const n = {}; d.catches.forEach(c => { if(c.spotId) n[c.spotId] = (n[c.spotId] || 0) + 1; });
  return d.spots.slice().sort((a, b) => ((n[b.id] || 0) + (b.visited ? 1 : 0)) - ((n[a.id] || 0) + (a.visited ? 1 : 0)) || a.name.localeCompare(b.name, "de"));
}
const spotName = id => { const s = ladeFaengeDaten().spots.find(x => x.id === id); return s ? s.name : null; };
function spotVorschlag(){
  if(hst.ort && String(hst.ort).startsWith("spot_")) return hst.ort.slice(5);
  const d = ladeFaengeDaten();
  const letzte = d.catches.filter(c => c.spotId).sort((a, b) => String(b.datum).localeCompare(String(a.datum)))[0];
  return letzte ? letzte.spotId : "";
}

/* ---------- Recht: Mindestmaß + Schonzeit ---------- */
function rechtHTML(fischId, datum, laenge){
  if(!fischId) return "";
  const monat = datum ? +datum.slice(5, 7) : new Date().getMonth() + 1;
  const r = rechtFuer(fischId, monat, datum || undefined);
  if(r.status === "unbekannt") return `<p class="fb-recht">Für diese Art sind keine Schonzeit und kein Mindestmaß hinterlegt. Bitte im Erlaubnisschein nachsehen.</p>`;
  const mm = /^(\d+)\s*cm/.exec(r.r.mindestmass || "");
  const zuKlein = mm && laenge !== null && laenge < +mm[1];
  const warn = r.status === "geschuetzt" ? "Ganzjährig geschützt: sofort schonend zurücksetzen."
    : r.status === "schonzeit" ? "Am gewählten Tag ist Schonzeit: zurücksetzen."
    : zuKlein ? `Untermaßig (Mindestmaß ${mm[1]} cm): zurücksetzen.` : "";
  return `<div class="fb-recht${warn ? " warn" : ""}">
    ${warn ? `<b>${warn}</b>` : `<b>${mm && laenge !== null ? "Maßig" : "Gut zu wissen"}</b>`}
    <span>Mindestmaß: ${esc(r.r.mindestmass || "–")} · Schonzeit: ${esc(r.r.schonzeit || "–")}</span>
    ${r.r.hinweis ? `<span class="hinweis-klein">${r.r.hinweis}</span>` : ""}
  </div>`;
}

/* ---------- Foto (nur auf diesem Gerät) ---------- */
function verkleinere(file){
  return new Promise((res, rej) => {
    const rd = new FileReader();
    rd.onload = e => {
      const img = new Image();
      img.onload = () => {
        const max = 900, f = Math.min(1, max / Math.max(img.width, img.height));
        const c = document.createElement("canvas"); c.width = Math.round(img.width * f); c.height = Math.round(img.height * f);
        c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
        res(c.toDataURL("image/jpeg", 0.7));
      };
      img.onerror = rej; img.src = e.target.result;
    };
    rd.onerror = rej; rd.readAsDataURL(file);
  });
}

/* ---------- Auswahllisten ---------- */
function setupOptionen(wert){
  setupsNeu();
  const gruppen = SETUP_KATEGORIEN.map(k => {
    const s = SETUPS.filter(x => x.kategorie === k.key);
    return s.length ? `<optgroup label="${esc(k.titel)}">${s.map(x => `<option value="${esc(x.key)}"${x.key === wert ? " selected" : ""}>${esc(setupName(x.key))}</option>`).join("")}</optgroup>` : "";
  }).join("");
  return `<option value="">– ohne / weiß nicht –</option>${gruppen}`;
}
function spotOptionen(wert){
  return `<option value="">– kein Spot –</option>` + spots().map(s => `<option value="${esc(s.id)}"${s.id === wert ? " selected" : ""}>${esc(s.name)}</option>`).join("");
}
function methodeOptionen(fischId, wert){
  const f = FISCHE.find(x => x.id === fischId);
  const m = f ? f.ansaetze.map(a => a.methode) : [];
  if(wert && !m.includes(wert)) m.unshift(wert);
  return `<option value="">– keine Angabe –</option>` + m.map(x => `<option value="${esc(x)}"${x === wert ? " selected" : ""}>${esc(x)}</option>`).join("");
}
/* Bestes Setup als Vorschlag: zuletzt für diesen Fisch, sonst aus der Tasche */
function setupVorschlag(fischId){
  const f = alleFaenge().filter(c => c.quelle === "fang" && c.setup && (!fischId || c.fischId === fischId)).sort((a, b) => String(b.datum).localeCompare(String(a.datum)))[0];
  if(f && AKTUELL[f.setup]) return f.setup;
  const t = tasche().setups.filter(k => AKTUELL[k]);
  const fisch = FISCHE.find(x => x.id === fischId);
  const passt = fisch ? t.find(k => fisch.ansaetze.some(a => a.setup === k)) : null;
  return passt || t[0] || "";
}

/* ---------- Fang-Formular ---------- */
export function fangBearbeiten(id, vorgabe = {}){
  const d = ladeFaengeDaten();
  const c = id ? d.catches.find(x => x.id === id) : null;
  if(id && !c) return;
  const v = c || {
    datum: vorgabe.datum || heuteISO(), uhrzeit: vorgabe.datum && vorgabe.datum !== heuteISO() ? "" : jetztZeit(),
    fischId: vorgabe.fischId || "", spotId: vorgabe.spotId ?? spotVorschlag(), setup: vorgabe.setup ?? setupVorschlag(vorgabe.fischId),
    methode: vorgabe.methode || "", ausflugId: vorgabe.ausflugId || null, koeder: vorgabe.koeder || ""
  };
  const fid = v.fischId || (c ? fischIdAus(c.fischName) : "");
  const andere = c && !fid ? c.fischName : "";
  let foto = c ? c.foto || null : null;
  const fischOpt = [["", "– Fischart wählen –"], ...FISCHE.map(f => [f.id, f.name]), ["_andere", "Andere Art …"]];
  const dlg = blatt(c ? "Fang bearbeiten" : "Fang eintragen", `
    <div class="feld-raster">
      ${auswahl("fisch", "Fischart", fischOpt, andere ? "_andere" : fid, { breit: true })}
      <p class="breit fb-bestimmen"><a href="#wissen/bestimmen" data-blatt-weg>Unsicher, welcher Fisch? Bestimmen ›</a></p>
      <div class="breit" id="fb-andere"${andere ? "" : " hidden"}>${feld("andere", "Welche Art?", andere, { ph: "z. B. Brasse" })}</div>
      ${feld("laenge", "Länge (cm)", v.laenge ?? "", { im: "decimal", ph: "z. B. 52" })}
      ${feld("gewicht", "Gewicht (kg)", v.gewicht != null ? komma(v.gewicht) : "", { im: "decimal", ph: "optional" })}
      <div class="breit" id="fb-recht-platz">${rechtHTML(fid, v.datum, zahl(v.laenge))}</div>
      <div class="breit" id="fb-limit-platz">${limitHTML(v.spotId, v.datum, fid, c ? c.id : null, !v.zurueck)}</div>
      <label class="feld haken breit"><input type="checkbox" name="zurueck" id="f-zurueck"${v.zurueck ? " checked" : ""}><span>Zurückgesetzt</span></label>
      ${feld("datum", "Datum", v.datum, { typ: "date" })}
      ${feld("uhrzeit", "Uhrzeit", v.uhrzeit || "", { typ: "time" })}
      <label class="feld breit"><span>Spot</span><select name="spot" id="f-spot">${spotOptionen(v.spotId || "")}</select></label>
      <label class="feld breit"><span>Setup</span><select name="setup" id="f-setup">${setupOptionen(v.setup || "")}</select></label>
      <label class="feld breit"><span>Methode</span><select name="methode" id="f-methode">${methodeOptionen(fid, v.methode || "")}</select></label>
      ${feld("koeder", "Köder", v.koeder || "", { breit: true, ph: "z. B. Gummifisch 10 cm, Motoroil" })}
      ${feld("notiz", "Notiz", v.notiz || "", { breit: true, textarea: true, rows: 2, ph: "Tiefe, Stelle, Wasserfarbe …" })}
      <label class="feld breit"><span>Foto (bleibt nur auf diesem Gerät)</span><input type="file" name="foto" id="f-foto" accept="image/*"></label>
      <div class="breit" id="fb-foto-vorschau">${foto ? `<img class="fb-foto" src="${foto}" alt="Foto vom Fang">` : ""}</div>
    </div>
    <datalist id="fb-koeder-liste">${[...new Set(alleFaenge().map(x => x.koeder).filter(Boolean))].slice(0, 40).map(k => `<option value="${esc(k)}">`).join("")}</datalist>
    <div class="blatt-akt"><button type="submit" class="knopf prim" value="speichern">Speichern</button></div>
    ${c ? `<div class="gefahr"><button type="submit" class="knopf warn" value="loeschen" formnovalidate>Fang löschen</button></div>` : ""}`,
    (fd, knopf) => {
      if(knopf && knopf.value === "loeschen"){
        if(!confirm("Diesen Fang löschen?")) return false;
        const dd = ladeFaengeDaten(); dd.catches = dd.catches.filter(x => x.id !== c.id); speichereFaengeDaten(dd);
        toastFn("Fang gelöscht"); return null;
      }
      const wahl = fd.get("fisch");
      const name = wahl === "_andere" ? String(fd.get("andere") || "").trim() : wahl ? fischName(wahl) : "";
      if(!name) return "Bitte die Fischart wählen.";
      const laenge = zahl(fd.get("laenge")), gewicht = zahl(fd.get("gewicht"));
      if(laenge !== null && (laenge <= 0 || laenge > 300)) return "Die Länge bitte in Zentimetern eintragen.";
      if(gewicht !== null && (gewicht <= 0 || gewicht > 100)) return "Das Gewicht bitte in Kilogramm eintragen, z. B. 1,2.";
      const datum = fd.get("datum") || heuteISO();
      if(datum > heuteISO()) return "Das Datum liegt in der Zukunft.";
      const uhr = fd.get("uhrzeit") || "";
      const neu = {
        ...(c || {}), id: c ? c.id : genId(), datum, uhrzeit: uhr, zeit: uhr ? tageszeitVon(uhr, datum) : (c ? c.zeit || null : null),
        fischId: wahl && wahl !== "_andere" ? wahl : fischIdAus(name), fischName: name,
        laenge: laenge !== null ? String(laenge) : null, gewicht, zurueck: fd.get("zurueck") === "on",
        spotId: fd.get("spot") || null, setup: fd.get("setup") || null, methode: fd.get("methode") || null,
        koeder: String(fd.get("koeder") || "").trim() || null, notiz: String(fd.get("notiz") || "").trim(),
        ausflugId: c ? c.ausflugId || null : v.ausflugId, foto: foto || null,
        weather: c ? c.weather ?? null : null, cost: c ? c.cost ?? null : null
      };
      const dd = ladeFaengeDaten();
      const i = dd.catches.findIndex(x => x.id === neu.id);
      if(i >= 0) dd.catches[i] = neu; else dd.catches.push(neu);
      if(neu.spotId){ const s = dd.spots.find(x => x.id === neu.spotId); if(s) s.visited = true; }
      speichereFaengeDaten(dd);
      toastFn(c ? "Fang gespeichert" : "Petri Heil! Fang eingetragen");
      return null;
    });
  const form = dlg.querySelector("form");
  form.querySelector("[data-blatt-weg]")?.addEventListener("click", () => dlg.close());
  const k = form.querySelector("#f-koeder"); if(k) k.setAttribute("list", "fb-koeder-liste");
  const neuLimit = () => {
    const pl = form.querySelector("#fb-limit-platz"); if(!pl) return;
    const fw = form.fisch.value;
    pl.innerHTML = limitHTML(form.spot.value || null, form.datum.value, fw && fw !== "_andere" ? fw : null, c ? c.id : null, !form.zurueck.checked);
  };
  form.addEventListener("change", e => { if(["spot", "zurueck"].includes(e.target.name)) neuLimit(); });
  const neuRecht = () => {
    const w = form.fisch.value;
    form.querySelector("#fb-andere").hidden = w !== "_andere";
    const platz = form.querySelector("#fb-recht-platz");
    platz.innerHTML = rechtHTML(w && w !== "_andere" ? w : null, form.datum.value, zahl(form.laenge.value));
    /* Untermaßig/Schonzeit: „Zurückgesetzt“ vorschlagen, solange du es nicht selbst angefasst hast */
    if(!form.zurueck.dataset.angefasst && platz.querySelector(".warn")) form.zurueck.checked = true;
    neuLimit();
  };
  form.zurueck.addEventListener("change", () => { form.zurueck.dataset.angefasst = "1"; });
  form.addEventListener("input", e => { if(["laenge", "datum"].includes(e.target.name)) neuRecht(); });
  form.addEventListener("change", async e => {
    if(e.target.name === "fisch"){
      neuRecht();
      const w = e.target.value;
      form.methode.innerHTML = methodeOptionen(w, "");
      if(!c && !form.setup.dataset.angefasst){ const s = setupVorschlag(w); if(s) form.setup.value = s; }
      /* Methode vorbelegen, wenn das Setup für genau eine Methode dieses Fischs gedacht ist */
      vorbelegeMethode();
    }
    if(e.target.name === "setup"){ form.setup.dataset.angefasst = "1"; vorbelegeMethode(); }
    if(e.target.name === "foto" && e.target.files[0]){
      try { foto = await verkleinere(e.target.files[0]); form.querySelector("#fb-foto-vorschau").innerHTML = `<img class="fb-foto" src="${foto}" alt="Foto vom Fang">`; }
      catch(err){ toastFn("Foto ließ sich nicht lesen"); }
    }
  });
  function vorbelegeMethode(){
    if(form.methode.value) return;
    const f = FISCHE.find(x => x.id === form.fisch.value); if(!f) return;
    const m = f.ansaetze.filter(a => a.setup === form.setup.value);
    if(m.length === 1) form.methode.value = m[0].methode;
  }
  if(!c) vorbelegeMethode();
}

/* ---------- Ausflug-Formular ---------- */
const HIMMEL = ["klar / sonnig", "leicht bewölkt", "stark bewölkt", "bedeckt", "Regen", "Gewitter"];
const DRUCK = ["stabil", "steigend", "fallend"];
function himmelAus(wolken, regen){ if(regen >= 60) return "Regen"; return wolken < 20 ? "klar / sonnig" : wolken < 50 ? "leicht bewölkt" : wolken < 85 ? "stark bewölkt" : "bedeckt"; }

export function ausflugBearbeiten(id, danachFang){
  const a = id ? ausfluege().find(x => x.id === id) : null;
  if(id && !a) return;
  const v = a || { datum: heuteISO(), von: jetztZeit(), bis: "", spotId: spotVorschlag(), wetter: {}, bewertung: 0, setup: tasche().setups[0] || "" };
  const verknuepft = ladeFaengeDaten().catches.filter(c => a && c.ausflugId === a.id);
  const alte = (a && a.faenge || []).filter(f => f.art);
  const dlg = blatt(a ? "Ausflug bearbeiten" : "Neuer Ausflug", `
    <div class="feld-raster">
      ${feld("datum", "Datum", v.datum, { typ: "date" })}
      <div class="feld-paar">${feld("von", "Von", v.von || "", { typ: "time" })}${feld("bis", "Bis", v.bis || "", { typ: "time" })}</div>
      <label class="feld breit"><span>Spot</span><select name="spot" id="f-spot">${spotOptionen(v.spotId || "")}</select></label>
      ${feld("gewaesser", "Gewässer / Ort (falls kein Spot)", a && !a.spotId ? a.gewaesser : "", { breit: true, ph: "z. B. Eider bei Rendsburg" })}
      <p class="blatt-zwischen breit">Wetter <button type="button" class="knopf leise" id="fb-wetter">Wetter übernehmen</button></p>
      ${feld("temp", "Luft (°C)", v.wetter?.temp ?? "", { im: "decimal" })}
      ${feld("wtemp", "Wasser (°C)", v.wassertemp ?? "", { im: "decimal", ph: "optional" })}
      ${feld("wind", "Wind", v.wetter?.wind || "", { ph: "z. B. SW 15 km/h" })}
      ${auswahl("himmel", "Himmel", HIMMEL.map(x => [x, x]), v.wetter?.bewoelkung || "leicht bewölkt")}
      ${auswahl("druck", "Luftdruck", DRUCK.map(x => [x, x]), v.wetter?.luftdruck || "stabil", { breit: true })}
      <p class="blatt-zwischen breit">Angeln</p>
      <label class="feld breit"><span>Hauptsetup</span><select name="setup" id="f-setup">${setupOptionen(v.setup || "")}</select></label>
      ${feld("methode", "Methode", v.methode || "", { ph: "z. B. Faulenzen" })}
      ${feld("koeder", "Köder", v.koeder || "", { ph: "optional" })}
      ${auswahl("bewertung", "Wie war's?", [[0, "– keine Wertung –"], [1, "★ schlecht"], [2, "★★ mäßig"], [3, "★★★ okay"], [4, "★★★★ gut"], [5, "★★★★★ top"]], v.bewertung || 0, { breit: true })}
      ${feld("notizen", "Notizen", v.notizen || "", { breit: true, textarea: true, rows: 3, ph: "Was hat funktioniert, was nicht? Wasserstand, Beißzeit …" })}
    </div>
    ${a ? `<div class="fb-ausflug-faenge"><b>Fänge an diesem Ausflug</b>${verknuepft.length || alte.length ? `<ul>${verknuepft.map(c => `<li>${esc(c.fischName)}${c.laenge ? " · " + esc(c.laenge) + " cm" : ""}${c.uhrzeit ? " · " + esc(c.uhrzeit) : ""}</li>`).join("")}${alte.map(f => `<li>${esc(f.art)}${f.laenge ? " · " + esc(f.laenge) + " cm" : ""}${f.gewicht ? " · " + komma(f.gewicht) + " kg" : ""}</li>`).join("")}</ul>` : `<p class="hinweis-klein">Noch keiner – auch ein Ausflug ohne Fang ist wertvoll für die Statistik.</p>`}</div>` : ""}
    <div class="blatt-akt">
      <button type="submit" class="knopf" value="fang">Speichern + Fang</button>
      <button type="submit" class="knopf prim" value="speichern">Speichern</button></div>
    ${a ? `<div class="gefahr"><p>Fänge, die du einzeln eingetragen hast, bleiben beim Löschen erhalten.</p><button type="submit" class="knopf warn" value="loeschen" formnovalidate>Ausflug löschen</button></div>` : ""}`,
    (fd, knopf) => {
      if(knopf && knopf.value === "loeschen"){
        if(!confirm("Diesen Ausflug löschen?")) return false;
        const dd = ladeFaengeDaten(); let n = 0;
        dd.catches.forEach(c => { if(c.ausflugId === a.id){ c.ausflugId = null; n++; } });
        if(n) speichereFaengeDaten(dd);
        loescheAusflug(a.id).then(() => toastFn("Ausflug gelöscht"));
        return null;
      }
      const datum = fd.get("datum") || heuteISO();
      if(datum > heuteISO()) return "Das Datum liegt in der Zukunft.";
      const spotId = fd.get("spot") || null;
      const gw = spotId ? spotName(spotId) : String(fd.get("gewaesser") || "").trim();
      const e = {
        ...(a || {}), id: a ? a.id : genId(), datum, von: fd.get("von") || "", bis: fd.get("bis") || "",
        spotId, gewaesser: gw || "",
        wetter: { temp: zahl(fd.get("temp")), wind: String(fd.get("wind") || "").trim(), bewoelkung: fd.get("himmel"), luftdruck: fd.get("druck") },
        wassertemp: zahl(fd.get("wtemp")), methode: String(fd.get("methode") || "").trim(), koeder: String(fd.get("koeder") || "").trim(),
        setup: fd.get("setup") || "", bewertung: +fd.get("bewertung") || 0, notizen: String(fd.get("notizen") || "").trim(),
        faenge: a ? a.faenge || [] : [], foto: a ? a.foto || null : null
      };
      if(spotId){ const dd = ladeFaengeDaten(); const s = dd.spots.find(x => x.id === spotId); if(s && !s.visited){ s.visited = true; speichereFaengeDaten(dd); } }
      speichereAusflug(e).then(wo => toastFn(wo === "cloud" ? "Ausflug gespeichert" : "Ausflug gespeichert (nur auf diesem Gerät)"));
      if(knopf && knopf.value === "fang") setTimeout(() => fangBearbeiten(null, { ausflugId: e.id, datum: e.datum, spotId: e.spotId, setup: e.setup }), 50);
      return null;
    });
  const form = dlg.querySelector("form");
  form.querySelector("#fb-wetter").addEventListener("click", () => wetterUebernehmen(form));
  if(!a) wetterUebernehmen(form, true);
}

async function wetterUebernehmen(form, still){
  if(form.datum.value !== heuteISO()){ if(!still) toastFn("Wetter gibt es nur für heute automatisch"); return; }
  const sid = form.spot.value;
  const s = sid ? ladeFaengeDaten().spots.find(x => x.id === sid) : null;
  let ort = s && typeof s.lat === "number" ? { id: "spot_" + s.id, lat: s.lat, lng: s.lng } : null;
  if(!ort){ const o = orteListe().find(x => x.id === hst.ort); if(o) ort = o; }
  if(!ort){ if(!still) toastFn("Bitte einen Spot wählen"); return; }
  try {
    const l = tagesLage(await ladeWetter(ort), 0);
    if(!l) throw new Error("keine Daten");
    if(!form.isConnected) return;
    form.temp.value = komma(Math.round(l.temp));
    form.wind.value = `${windRichtung(l.richtung)} ${Math.round(l.wind)} km/h`;
    form.himmel.value = himmelAus(l.wolken, l.regenMax || 0);
    form.druck.value = /fallend/.test(l.trend) ? "fallend" : /steigend/.test(l.trend) ? "steigend" : "stabil";
    if(!still) toastFn("Wetter übernommen");
  } catch(e){ if(!still) toastFn("Wetter gerade nicht abrufbar"); }
}

/* ---------- Seite ---------- */
const sterne = n => n ? `<span class="fb-sterne" aria-label="${n} von 5 Sternen">${"★".repeat(n)}<span>${"★".repeat(5 - n)}</span></span>` : "";
const masse = c => [c.laenge ? esc(String(c.laenge).replace(".", ",")) + " cm" : "", c.gewicht ? komma(c.gewicht) + " kg" : ""].filter(Boolean).join(" · ");

function fangZeile(c, mitSpot){
  const info = [c.uhrzeit || (c.tz ? TZ_NAME[c.tz] : ""), c.setup ? setupName(c.setup) : "", c.koeder || "", mitSpot && c.spotId ? spotName(c.spotId) : ""].filter(Boolean);
  const attr = c.quelle === "ausflug" ? `data-fb-ausflug="${esc(c.ausflugId)}"` : `data-fb-fang="${esc(c.id)}"`;
  return `<li><button type="button" class="fb-fang" ${attr}>
    ${c.foto ? `<img src="${c.foto}" alt="" class="fb-mini">` : ""}
    <span class="fb-fang-txt"><b>${esc(c.fischName || fischName(c.fischId))}${masse(c) ? ` <em>${masse(c)}</em>` : ""}</b>
      <small>${esc(info.join(" · "))}</small></span>
    ${c.zurueck ? `<span class="fb-tag">zurückgesetzt</span>` : ""}</button></li>`;
}

function verlaufHTML(faenge){
  const aus = ausfluege();
  const passt = c => !fst.fisch || c.fischId === fst.fisch;
  const tage = new Map();
  const tag = d => { if(!tages(d)) tage.set(d, { ausfluege: [], faenge: [] }); return tage.get(d); };
  const tages = d => tage.has(d);
  aus.forEach(a => {
    const fa = faenge.filter(c => c.ausflugId === a.id && (c.quelle === "ausflug" || c.datum === a.datum));
    if(fst.fisch && !fa.some(passt)) return;
    tag(a.datum).ausfluege.push({ a, fa: fa.filter(passt) });
  });
  const inAusflug = new Set(); tage.forEach(t => t.ausfluege.forEach(x => x.fa.forEach(c => inAusflug.add(c.id))));
  faenge.filter(c => c.quelle === "fang" && passt(c) && !inAusflug.has(c.id) && !(c.ausflugId && aus.some(a => a.id === c.ausflugId && a.datum === c.datum))).forEach(c => tag(c.datum || "0000-00-00").faenge.push(c));
  const keys = [...tage.keys()].sort().reverse();
  if(!keys.length) return `<p class="leer">${fst.fisch ? "Mit dieser Fischart ist noch nichts eingetragen." : "Noch nichts eingetragen. Leg los mit „+ Fang“ am Wasser – oder „+ Ausflug“, wenn du auch Wetter und Dauer festhalten willst."}</p>`;
  const sortZeit = l => l.sort((x, y) => String(y.uhrzeit || "").localeCompare(String(x.uhrzeit || "")));
  const html = keys.slice(0, fst.tage).map(d => {
    const t = tage.get(d);
    const dt = d === "0000-00-00" ? "ohne Datum" : new Date(d + "T12:00:00").toLocaleDateString("de-DE", { weekday: "short", day: "numeric", month: "long", year: "numeric" });
    return `<section class="fb-tag-block"><h3 class="fb-datum">${esc(dt)}</h3>
      ${t.ausfluege.map(({ a, fa }) => {
        const w = a.wetter || {};
        const wetter = [w.temp != null && w.temp !== "" ? komma(w.temp) + "°" : "", w.bewoelkung || "", w.wind || "", w.luftdruck ? "Druck " + w.luftdruck : ""].filter(Boolean).join(" · ");
        return `<article class="fb-ausflug">
          <button type="button" class="fb-ausflug-kopf" data-fb-ausflug="${esc(a.id)}">
            <span><b>${esc(a.gewaesser || spotName(a.spotId) || "Ausflug")}</b>${sterne(a.bewertung)}</span>
            <small>${esc([a.von && a.bis ? `${a.von}–${a.bis} Uhr` : a.von ? `ab ${a.von} Uhr` : "", wetter].filter(Boolean).join(" · "))}</small>
            ${a.notizen ? `<small class="fb-notiz">${esc(a.notizen)}</small>` : ""}
          </button>
          ${fa.length ? `<ul class="fb-faenge">${sortZeit(fa).map(c => fangZeile(c, false)).join("")}</ul>` : `<p class="fb-schneider">Ohne Fang – zählt trotzdem für die Statistik.</p>`}
          <button type="button" class="knopf leise fb-plus" data-fb-neu="fang" data-ausflug="${esc(a.id)}">+ Fang zu diesem Ausflug</button>
        </article>`;
      }).join("")}
      ${t.faenge.length ? `<ul class="fb-faenge lose">${sortZeit(t.faenge).map(c => fangZeile(c, true)).join("")}</ul>` : ""}
    </section>`;
  }).join("");
  return html + (keys.length > fst.tage ? `<button type="button" class="knopf fb-mehr" data-fb-mehr>Ältere anzeigen (${keys.length - fst.tage} Tage)</button>` : "");
}

/* Balken: eine Farbe, Wert steht immer als Zahl daneben */
function balken(zeilen, opt = {}){
  const max = Math.max(1, ...zeilen.map(z => z.n));
  return `<ul class="fb-balken">${zeilen.map(z => `<li title="${esc(z.label)}: ${z.n}">
    <span class="fb-b-label">${z.link ? `<a href="${z.link}">${esc(z.label)}</a>` : esc(z.label)}${z.sub ? `<small>${esc(z.sub)}</small>` : ""}</span>
    <span class="fb-b-spur"><span style="width:${Math.max(z.n ? 3 : 0, z.n / max * 100)}%"></span></span>
    <b class="fb-b-wert">${z.wert ?? z.n}</b></li>`).join("")}</ul>${opt.hinweis ? `<p class="hinweis-klein">${opt.hinweis}</p>` : ""}`;
}
const zaehle = (liste, fn) => { const m = new Map(); liste.forEach(x => { const k = fn(x); if(k) m.set(k, (m.get(k) || []).concat([x])); }); return [...m.entries()].sort((a, b) => b[1].length - a[1].length); };
const groesster = l => l.filter(c => zahl(c.laenge)).sort((a, b) => zahl(b.laenge) - zahl(a.laenge))[0];

function statistikHTML(alle){
  const f = fst.fisch ? alle.filter(c => c.fischId === fst.fisch) : alle;
  const aus = ausfluege();
  if(!f.length && !aus.length) return `<p class="leer">Sobald du Fänge oder Ausflüge einträgst, siehst du hier, was bei dir funktioniert.</p>`;
  const mitFang = aus.filter(a => (a.faenge || []).some(x => x.art) || alle.some(c => c.ausflugId === a.id));
  const block = (titel, inhalt) => `<section class="fb-stat"><h3>${titel}</h3>${inhalt}</section>`;
  const teile = [];

  const proSetup = zaehle(f, c => c.setup);
  if(proSetup.length) teile.push(block("Pro Setup", balken(proSetup.slice(0, 12).map(([k, l]) => {
    const g = groesster(l); const arten = [...new Set(l.map(c => c.fischId ? fischName(c.fischId) : c.fischName))];
    return { label: setupName(k) || k, link: AKTUELL[k] ? `#rutenwand/${k}` : null, n: l.length, sub: [arten.slice(0, 3).join(", ") + (arten.length > 3 ? " …" : ""), g ? `größter ${String(g.laenge).replace(".", ",")} cm` : ""].filter(Boolean).join(" · ") };
  }), { hinweis: f.some(c => !c.setup) ? `${f.filter(c => !c.setup).length} Fänge ohne Setup – trag es nach, dann wird die Auswertung genauer.` : "" })));

  if(!fst.fisch){
    const proFisch = zaehle(f, c => c.fischId ? fischName(c.fischId) : c.fischName);
    if(proFisch.length) teile.push(block("Fischarten", balken(proFisch.slice(0, 12).map(([k, l]) => {
      const g = groesster(l); const m = l.map(c => zahl(c.laenge)).filter(Boolean);
      return { label: k, n: l.length, sub: [g ? `größter ${String(g.laenge).replace(".", ",")} cm` : "", m.length > 1 ? `Ø ${Math.round(m.reduce((a, b) => a + b, 0) / m.length)} cm` : ""].filter(Boolean).join(" · ") };
    }))));
  }

  const proSpot = zaehle(f, c => c.spotId);
  if(proSpot.length) teile.push(block("Spots", balken(proSpot.slice(0, 10).map(([k, l]) => {
    const a = aus.filter(x => x.spotId === k);
    const leer = a.filter(x => !mitFang.includes(x)).length;
    return { label: spotName(k) || "unbekannter Spot", n: l.length, sub: [`zuletzt ${datumDE(l.map(c => c.datum).sort().reverse()[0])}`, a.length ? `${a.length} Ausflüge, ${leer} ohne Fang` : ""].filter(Boolean).join(" · ") };
  }))));

  const mitTz = f.filter(c => c.tz);
  if(mitTz.length) teile.push(block("Tageszeit", balken(TZ.map(([k, l]) => ({ label: l, n: mitTz.filter(c => c.tz === k).length })),
    { hinweis: `Aus ${mitTz.length} Fängen mit Uhrzeit. Dämmerung = etwa eine Stunde vor bis eineinhalb Stunden nach Sonnenauf- bzw. vor -untergang.` })));

  const MON = ["Jan", "Feb", "Mär", "Apr", "Mai", "Jun", "Jul", "Aug", "Sep", "Okt", "Nov", "Dez"];
  const mitDatum = f.filter(c => /^\d{4}-\d\d/.test(c.datum || ""));
  if(mitDatum.length) teile.push(block("Monat", balken(MON.map((m, i) => ({ label: m, n: mitDatum.filter(c => +c.datum.slice(5, 7) === i + 1).length })))));

  const proKoeder = zaehle(f, c => c.koeder);
  if(proKoeder.length) teile.push(block("Köder", balken(proKoeder.slice(0, 8).map(([k, l]) => ({ label: k, n: l.length })))));

  /* Luftdruck: Anteil der Ausflüge mit Fang je Trend */
  const mitDruck = aus.filter(a => a.wetter && a.wetter.luftdruck);
  if(mitDruck.length >= 3 && !fst.fisch) teile.push(block("Luftdruck und Erfolg", balken(DRUCK.map(t => {
    const l = mitDruck.filter(a => a.wetter.luftdruck === t); const ok = l.filter(a => mitFang.includes(a)).length;
    return { label: t, n: l.length ? Math.round(ok / l.length * 100) : 0, wert: l.length ? Math.round(ok / l.length * 100) + " %" : "–", sub: `${ok} von ${l.length} Ausflügen mit Fang` };
  }), { hinweis: "Erst ab etwa zehn Ausflügen je Trend wirklich aussagekräftig." })));

  return teile.join("") || `<p class="leer">Noch zu wenige Angaben für eine Auswertung.</p>`;
}

export function fangbuchHTML(){
  setupsNeu();
  const alle = alleFaenge();
  const aus = ausfluege();
  const arten = zaehle(alle, c => c.fischId);
  if(fst.fisch && !arten.some(([k]) => k === fst.fisch)) fst.fisch = "";
  const g = groesster(alle);
  const jahr = String(new Date().getFullYear());
  const imJahr = alle.filter(c => String(c.datum || "").startsWith(jahr)).length;
  const ohne = aus.filter(a => !(a.faenge || []).some(x => x.art) && !alle.some(c => c.ausflugId === a.id)).length;
  return `<section class="fangbuch">
    <div class="fb-kopf">
      <h2>Deine Fänge</h2>
      <div class="fb-knoepfe">
        <button type="button" class="knopf" data-fb-neu="ausflug">+ Ausflug</button>
        <button type="button" class="knopf prim" data-fb-neu="fang">+ Fang</button>
      </div>
    </div>
    <div class="fang-kopf">
      <div><b>${alle.length}</b><span>Fänge${imJahr !== alle.length ? `, ${imJahr} in ${jahr}` : ""}</span></div>
      <div><b>${aus.length}</b><span>Ausflüge${aus.length ? `, ${ohne} ohne Fang` : ""}</span></div>
      <div><b>${arten.length}</b><span>Arten</span></div>
      ${g ? `<div><b>${esc(String(g.laenge).replace(".", ","))} cm</b><span>größter · ${esc(g.fischName)}</span></div>` : ""}
    </div>
    ${!ausfluegeGeladen() ? `<p class="hinweis-klein">Ausflüge werden geladen …</p>` : ""}
    <div class="seg" role="tablist" aria-label="Fangbuch">
      <button type="button" role="tab" aria-selected="${fst.ansicht === "verlauf"}" class="${fst.ansicht === "verlauf" ? "on" : ""}" data-fb-ansicht="verlauf">Verlauf</button>
      <button type="button" role="tab" aria-selected="${fst.ansicht === "statistik"}" class="${fst.ansicht === "statistik" ? "on" : ""}" data-fb-ansicht="statistik">Was funktioniert?</button>
      <button type="button" role="tab" aria-selected="${fst.ansicht === "saison"}" class="${fst.ansicht === "saison" ? "on" : ""}" data-fb-ansicht="saison">Saison</button>
    </div>
    ${arten.length > 1 && fst.ansicht !== "saison" ? `<div class="chips" role="group" aria-label="Fischart"><button type="button" class="chip${!fst.fisch ? " on" : ""}" data-fb-fisch="">Alle</button>${arten.map(([k, l]) => `<button type="button" class="chip${fst.fisch === k ? " on" : ""}" data-fb-fisch="${esc(k)}" aria-pressed="${fst.fisch === k}">${esc(fischName(k))}<i>${l.length}</i></button>`).join("")}</div>` : ""}
    <div class="fb-inhalt${fst.ansicht !== "verlauf" ? " stat" : ""}">${fst.ansicht === "statistik" ? statistikHTML(alle) : fst.ansicht === "saison" ? saisonHTML() : verlaufHTML(alle)}</div>
  </section>`;
}

export function fangbuchNachladen(){ if(!ausfluegeGeladen()) ladeAusfluege(); }

export function fangbuchKlick(e){
  const n = e.target.closest("[data-fb-neu]");
  if(n){
    if(n.dataset.fbNeu === "ausflug") ausflugBearbeiten(null);
    else {
      const a = n.dataset.ausflug ? ausfluege().find(x => x.id === n.dataset.ausflug) : null;
      fangBearbeiten(null, a ? { ausflugId: a.id, datum: a.datum, spotId: a.spotId, setup: a.setup } : { setup: n.dataset.setup ?? undefined, fischId: n.dataset.fisch || "" });
    }
    return true;
  }
  if(saisonKlick(e)){ renderFn(); return true; }
  const f = e.target.closest("[data-fb-fang]"); if(f){ fangBearbeiten(f.dataset.fbFang); return true; }
  const a = e.target.closest("[data-fb-ausflug]"); if(a){ ausflugBearbeiten(a.dataset.fbAusflug); return true; }
  const v = e.target.closest("[data-fb-ansicht]"); if(v){ fst.ansicht = v.dataset.fbAnsicht; merke(); renderFn(); return true; }
  const c = e.target.closest("[data-fb-fisch]"); if(c){ fst.fisch = c.dataset.fbFisch; merke(); renderFn(); return true; }
  if(e.target.closest("[data-fb-mehr]")){ fst.tage += 40; renderFn(); return true; }
  return false;
}
