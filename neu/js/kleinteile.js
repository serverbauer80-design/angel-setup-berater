/* ============================================================
   Kleinteile-Box – ohne Zählen
   Jedes Teil hat nur einen Füllstand: genug · knapp · leer. Ein Tipp,
   wenn dir am Wasser auffällt, dass etwas zur Neige geht – knapp und
   leer landen auf der Einkaufsliste.
   Dazu deine echten Köderboxen mit Foto und Fach: Die Suche „Wo ist …?“
   sagt, in welcher Box ein Teil liegt. Fotos bleiben auf dem Gerät
   (IndexedDB), Teile und Boxen werden mit der Cloud abgeglichen.
   Alte Einträge mit Stückzahl werden automatisch umgerechnet.
   ============================================================ */
import { lese, kleinteileSetzen, KT_KEY } from "./store.js";
import { ANGELARTEN } from "./angelarten.js";

const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[c]));

/* Reihenfolge = Prüfreihenfolge beim Zuordnen (Gummiperle vor Gummiköder, Vorfachhaken vor Vorfach) */
export const KATS = [
  { id: "perlen",  name: "Perlen, Stopper & Schlauch", re: /perle|stopper|schlauch|anti.?tangle|boom/i },
  { id: "jig",     name: "Jigköpfe",                   re: /jig/i },
  { id: "haken",   name: "Haken & Drillinge",          re: /haken|drilling/i },
  { id: "vorfach", name: "Vorfächer & Systeme",        re: /vorfach|stahl|titan|fluoro|schlagschnur|paternoster|system|rig\b/i },
  { id: "wirbel",  name: "Wirbel & Snaps",             re: /wirbel|snap|karabiner|sprengring/i },
  { id: "blei",    name: "Bleie & Körbe",              re: /blei|schrot|tungsten|korb|feeder|method/i },
  { id: "posen",   name: "Posen & Sbirolinos",         re: /pose|sbiro|tremarella|wasserkugel|spirolino/i },
  { id: "gummi",   name: "Gummiköder",                 re: /gummi|shad|twister|creature|wurm.*(gummi|kunst)|finesse|master worm/i },
  { id: "kunst",   name: "Wobbler, Blinker & Spoons",  re: /wobbler|blinker|spoon|spinner|pilker|popper|küstenköder|jerk/i },
  { id: "natur",   name: "Naturköder & Futter",        re: /teig|powerbait|mais|made|wurm|boilie|pellet|futter|köderfisch|paste|hering|garnele/i },
  { id: "sonst",   name: "Sonstiges",                  re: /$^/ }
];
const KAT = Object.fromEntries(KATS.map(k => [k.id, k]));
export function kategorieVon(text){ return (KATS.find(k => k.id !== "sonst" && k.re.test(String(text || ""))) || KAT.sonst).id; }

/* ---------- Füllstand ---------- */
const STAENDE = [["voll", "genug"], ["knapp", "knapp"], ["leer", "leer"]];
const STAND_TEXT = { voll: "genug", knapp: "knapp", leer: "leer" };
/* Stand eines Teils – alte Einträge mit Stückzahl umrechnen */
export function standVon(t){
  if(t.stand) return t.stand;
  if(t.n === 0) return "leer";
  if(t.n != null && t.n <= (t.min ?? 0)) return "knapp";
  return "voll";
}
const knapp = t => standVon(t) !== "voll";

export function box(){
  const b = lese(KT_KEY, null) || { teile: [], geaendert: "" };
  b.teile = b.teile || []; b.boxen = b.boxen || [];
  return b;
}
function speichere(b){
  b.teile.forEach(t => { t.stand = standVon(t); delete t.n; delete t.min; });
  b.geaendert = new Date().toISOString(); kleinteileSetzen(b);
}
const neueId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
function aendere(fn){ const b = box(); fn(b); speichere(b); }

/* einen Schritt leerer (Abriss im Live-Modus): liefert das Teil mit neuem Stand */
export function teilVerbraucht(name){
  const q = String(name || "").trim().toLowerCase(); if(!q) return null;
  let treffer = null;
  aendere(b => {
    const t = b.teile.find(x => x.name.toLowerCase() === q) || b.teile.find(x => q.includes(x.name.toLowerCase()) || x.name.toLowerCase().includes(q));
    if(!t) return;
    const s = standVon(t);
    t.stand = s === "voll" ? "knapp" : "leer";
    treffer = { name: t.name, stand: t.stand };
  });
  return treffer;
}

/* ---------- Fotos der Boxen: nur auf diesem Gerät (IndexedDB) ---------- */
const fotoCache = {};
function db(){
  return new Promise((ok, fehler) => {
    const r = indexedDB.open("rutenwand_fotos", 1);
    r.onupgradeneeded = () => r.result.createObjectStore("boxen");
    r.onsuccess = () => ok(r.result); r.onerror = () => fehler(r.error);
  });
}
async function fotoLesen(id){
  if(id in fotoCache) return fotoCache[id];
  try {
    const d = await db();
    const v = await new Promise(ok => { const q = d.transaction("boxen").objectStore("boxen").get(id); q.onsuccess = () => ok(q.result || null); q.onerror = () => ok(null); });
    fotoCache[id] = v; return v;
  } catch(e){ return null; }
}
async function fotoSchreiben(id, daten){
  fotoCache[id] = daten;
  try {
    const d = await db();
    await new Promise(ok => { const tx = d.transaction("boxen", "readwrite"); const s = tx.objectStore("boxen"); daten ? s.put(daten, id) : s.delete(id); tx.oncomplete = ok; tx.onerror = ok; });
  } catch(e){}
}
/* Foto verkleinern (lange Seite 1280 px, JPEG) – reicht zum Erkennen der Fächer */
function verkleinern(datei){
  return new Promise((ok, fehler) => {
    const url = URL.createObjectURL(datei), img = new Image();
    img.onload = () => {
      const f = Math.min(1, 1280 / Math.max(img.width, img.height));
      const c = document.createElement("canvas"); c.width = Math.round(img.width * f); c.height = Math.round(img.height * f);
      c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url); ok(c.toDataURL("image/jpeg", 0.72));
    };
    img.onerror = () => { URL.revokeObjectURL(url); fehler(new Error("Bild nicht lesbar")); };
    img.src = url;
  });
}
/* nach dem Zeichnen: Bilder in alle <img data-kt-foto> einsetzen */
export function kleinteileFotosLaden(){
  document.querySelectorAll("img[data-kt-foto]").forEach(async img => {
    const v = await fotoLesen(img.dataset.ktFoto);
    if(v){ img.src = v; img.hidden = false; const p = img.nextElementSibling; if(p && p.classList.contains("kt-foto-leer")) p.hidden = true; }
  });
}

/* ---------- Für Packliste und Köderwahl ---------- */
/* Was liegt zu einem Montage-Teil in der Box? null = Box wird (noch) nicht gepflegt */
export function boxInfo(teilName){
  const b = box();
  if(!b.teile.length) return null;
  const kat = kategorieVon(teilName);
  if(kat === "sonst") return null;
  const liste = b.teile.filter(t => t.kat === kat);
  if(!liste.length) return { text: `nicht in deiner Box (${KAT[kat].name})`, knapp: true };
  const leer = liste.filter(t => standVon(t) === "leer"), wenig = liste.filter(t => standVon(t) === "knapp");
  const wo = [...new Set(liste.filter(t => standVon(t) !== "leer").map(t => boxName(b, t.boxId)).filter(Boolean))];
  if(leer.length === liste.length) return { text: "Box: alles aufgebraucht – nachkaufen", knapp: true };
  if(wenig.length || leer.length) return { text: `Box: ${[...wenig.map(t => `${t.name} knapp`), ...leer.map(t => `${t.name} leer`)].slice(0, 2).join(", ")}`, knapp: true };
  return { text: `Box: ${liste.length} Sorte${liste.length > 1 ? "n" : ""}${wo.length ? " · in " + wo.slice(0, 2).join(", ") : ""}`, knapp: false };
}
export function nachkaufListe(){ return box().teile.filter(knapp).sort((a, b) => (standVon(a) === "leer" ? 0 : 1) - (standVon(b) === "leer" ? 0 : 1) || a.name.localeCompare(b.name, "de")); }
export const teilVorhanden = t => standVon(t) !== "leer";
function boxName(b, id){ const x = id && b.boxen.find(y => y.id === id); return x ? x.name : ""; }

/* ---------- Schnellstart: Teile aus den Montagen deiner Methoden ---------- */
function vorschlaege(){
  const b = box(), da = new Set(b.teile.map(t => t.name.toLowerCase()));
  const out = new Map();
  ANGELARTEN.forEach(art => {
    const nutzbar = art.ansaetze.some(([fid, i]) => {
      const f = FISCHE.find(x => x.id === fid), a = f && f.ansaetze[i];
      const r = a && BERATER.bewerte(a, null);
      return r && r.status !== "wunsch";
    });
    if(!nutzbar) return;
    art.montagen.forEach(m => m.teile.forEach(t => {
      if(/hauptschnur/i.test(t.n)) return;
      const kat = kategorieVon(t.n + " " + t.d);
      const basis = t.n.replace(/\s*\(.*\)$/, "");
      const name = t.d && t.d.length <= 22 ? `${basis} ${t.d}` : basis;
      if(da.has(name.toLowerCase()) || out.has(name)) return;
      out.set(name, { name, info: t.d, kat });
    }));
  });
  return [...out.values()];
}

/* ---------- Kurz-Check nach dem Angeln ---------- */
const CHECK_KEY = "neu_kt_check_v1";
export function checkMerken(koederNamen){
  const b = box(); if(!b.teile.length) return;
  const kats = new Set(["wirbel", "vorfach"]);
  (koederNamen || []).forEach(k => { const t = b.teile.find(x => x.name.toLowerCase() === String(k).toLowerCase()); kats.add(t ? t.kat : kategorieVon(k)); });
  if([...kats].some(k => ["gummi", "kunst"].includes(k))) kats.add("jig");
  try { localStorage.setItem(CHECK_KEY, JSON.stringify({ kats: [...kats].filter(k => k !== "sonst"), datum: new Date().toISOString().slice(0, 10) })); } catch(e){}
}
export function checkHTML(){
  let c = null; try { c = JSON.parse(localStorage.getItem(CHECK_KEY) || "null"); } catch(e){}
  if(!c) return "";
  const b = box();
  const teile = b.teile.filter(t => c.kats.includes(t.kat)).sort((x, y) => c.kats.indexOf(x.kat) - c.kats.indexOf(y.kat)).slice(0, 8);
  if(!teile.length){ try { localStorage.removeItem(CHECK_KEY); } catch(e){} return ""; }
  return `<div class="h-karte kt-check"><h3>Kurz-Check nach dem Angeln</h3>
    <p class="hinweis-klein">Ist von dem, was du heute gebraucht hast, noch genug da? Nur antippen, was sich geändert hat.</p>
    <ul class="kt-liste">${teile.map(t => `<li class="kt-teil"><span class="kt-name"><b>${esc(t.name)}</b>${t.boxId ? `<small>${esc(boxName(b, t.boxId))}${t.fach ? " · " + esc(t.fach) : ""}</small>` : ""}</span>${standKnoepfe(t)}</li>`).join("")}</ul>
    <button type="button" class="knopf klein" data-kt-check-fertig>Passt so</button></div>`;
}

/* ---------- Ansicht ---------- */
let bearbeite = null;      /* id des Teils im Bearbeiten-Formular, "neu" oder null */
let schnell = false;       /* Schnellstart-Liste offen */
let offeneBox = null;      /* id der geöffneten Box, "neu" oder null */
let suche = "";

function standKnoepfe(t){
  const s = standVon(t);
  return `<span class="kt-stand" role="group" aria-label="Füllstand ${esc(t.name)}">${STAENDE.map(([v, l]) => `<button type="button" class="kt-st ${v}${s === v ? " on" : ""}" data-kt-stand="${esc(t.id)}|${v}" aria-pressed="${s === v}">${l}</button>`).join("")}</span>`;
}
function ortText(b, t){ const n = boxName(b, t.boxId); return n ? n + (t.fach ? " · " + t.fach : "") : (t.fach || ""); }

function formHTML(t, b){
  const neu = !t;
  t = t || { kat: "jig", name: "", stand: "voll", boxId: offeneBox && offeneBox !== "neu" ? offeneBox : "" };
  return `<div class="kt-form" data-kt-form>
    <label class="feld"><span>Was?</span><input type="text" data-kt-feld="name" value="${esc(t.name)}" placeholder="z. B. Snaps Gr. 2, Jigkopf 14 g" autocomplete="off"></label>
    <div class="kt-form-reihe">
      <label class="feld"><span>Box</span><select data-kt-feld="boxId"><option value="">–</option>${b.boxen.map(x => `<option value="${esc(x.id)}"${x.id === t.boxId ? " selected" : ""}>${esc(x.name)}</option>`).join("")}</select></label>
      <label class="feld"><span>Fach (optional)</span><input type="text" data-kt-feld="fach" value="${esc(t.fach || "")}" placeholder="z. B. links oben" autocomplete="off"></label>
    </div>
    <label class="feld"><span>Art</span><select data-kt-feld="kat">${KATS.map(k => `<option value="${k.id}"${k.id === t.kat ? " selected" : ""}>${esc(k.name)}</option>`).join("")}</select></label>
    <label class="feld"><span>Füllstand</span><select data-kt-feld="stand">${STAENDE.map(([v, l]) => `<option value="${v}"${standVon(t) === v ? " selected" : ""}>${l}</option>`).join("")}</select></label>
    <div class="akt-zeile"><button type="button" class="knopf prim klein" data-kt-speichern="${neu ? "neu" : esc(t.id)}">Speichern</button>
      <button type="button" class="knopf klein leise" data-kt-abbrechen>Abbrechen</button>
      ${neu ? "" : `<button type="button" class="knopf klein leise kt-weg" data-kt-weg="${esc(t.id)}">Entfernen</button>`}</div>
  </div>`;
}
function teilZeile(b, t, mitOrt = true){
  if(bearbeite === t.id) return `<li class="kt-teil offen">${formHTML(t, b)}</li>`;
  const o = mitOrt ? ortText(b, t) : (t.fach || "");
  return `<li class="kt-teil ${standVon(t)}">
    <button type="button" class="kt-name" data-kt-edit="${esc(t.id)}"><b>${esc(t.name)}</b>${o ? `<small>${esc(o)}</small>` : ""}</button>
    ${standKnoepfe(t)}</li>`;
}
function trefferHTML(b){
  const q = suche.toLowerCase();
  if(!q) return "";
  const teile = b.teile.filter(t => (t.name + " " + KAT[t.kat].name + " " + (t.fach || "")).toLowerCase().includes(q));
  const boxen = b.boxen.filter(x => (x.name + " " + (x.notiz || "")).toLowerCase().includes(q));
  if(!teile.length && !boxen.length) return `<p class="hinweis-klein">Nichts gefunden – vielleicht noch nicht eingetragen?</p>`;
  return `<ul class="kt-treffer">${teile.slice(0, 12).map(t => `<li><button type="button" class="kt-treffer-zeile" ${t.boxId ? `data-kt-box-auf="${esc(t.boxId)}"` : `data-kt-edit="${esc(t.id)}"`}>
      ${t.boxId ? `<img data-kt-foto="${esc(t.boxId)}" alt="" hidden><span class="kt-foto-leer klein">📦</span>` : ""}
      <span><b>${esc(t.name)}</b><small>${t.boxId ? "liegt in " + esc(ortText(b, t)) : "keine Box zugeordnet"} · ${STAND_TEXT[standVon(t)]}</small></span></button></li>`).join("")}
    ${boxen.map(x => `<li><button type="button" class="kt-treffer-zeile" data-kt-box-auf="${esc(x.id)}"><img data-kt-foto="${esc(x.id)}" alt="" hidden><span class="kt-foto-leer klein">📦</span><span><b>${esc(x.name)}</b><small>Box${x.notiz ? " · " + esc(x.notiz) : ""}</small></span></button></li>`).join("")}</ul>`;
}
function boxDetailHTML(b){
  if(offeneBox === "neu") return `<div class="kt-box-detail kt-form" data-kt-boxform>
      <label class="feld"><span>Name der Box</span><input type="text" data-kt-feld="bname" placeholder="z. B. Zanderbox, Kleinteile klein" autocomplete="off"></label>
      <label class="feld"><span>Notiz (optional)</span><input type="text" data-kt-feld="bnotiz" placeholder="z. B. blaue Plano, im Rucksack" autocomplete="off"></label>
      <div class="akt-zeile"><button type="button" class="knopf prim klein" data-kt-box-speichern="neu">Box anlegen</button><button type="button" class="knopf klein leise" data-kt-box-zu>Abbrechen</button></div></div>`;
  const x = b.boxen.find(y => y.id === offeneBox); if(!x) return "";
  const teile = b.teile.filter(t => t.boxId === x.id).sort((p, q) => p.name.localeCompare(q.name, "de"));
  return `<div class="kt-box-detail">
    <div class="kt-box-kopf"><b>${esc(x.name)}</b><button type="button" class="rund" data-kt-box-zu aria-label="Box schließen">✕</button></div>
    ${x.notiz ? `<p class="hinweis-klein">${esc(x.notiz)}</p>` : ""}
    <label class="kt-foto-gross"><img data-kt-foto="${esc(x.id)}" alt="Foto der Box ${esc(x.name)}" hidden><span class="kt-foto-leer">📷 Foto der offenen Box aufnehmen</span>
      <input type="file" accept="image/*" capture="environment" data-kt-foto-neu="${esc(x.id)}" class="vh"></label>
    <p class="hinweis-klein">Antippen = neues Foto. Das Foto bleibt auf diesem Gerät.</p>
    <ul class="kt-liste">${teile.map(t => teilZeile(b, t, false)).join("") || `<li class="hinweis-klein">Noch keine Teile in dieser Box.</li>`}</ul>
    ${bearbeite === "neu" ? formHTML(null, b) : `<div class="akt-zeile"><button type="button" class="knopf klein" data-kt-neu>+ Teil in diese Box</button>
      <button type="button" class="knopf klein leise kt-weg" data-kt-box-weg="${esc(x.id)}">Box löschen</button></div>`}
  </div>`;
}

export function kleinteileHTML(){
  const b = box();
  const nk = nachkaufListe();
  const proKat = KATS.map(k => ({ k, teile: b.teile.filter(t => t.kat === k.id).sort((x, y) => x.name.localeCompare(y.name, "de")) })).filter(x => x.teile.length);
  const v = schnell ? vorschlaege() : [];
  setTimeout(kleinteileFotosLaden, 0);
  return `<section class="kleinteile" id="kleinteile"><h2 class="gruppe-titel">Kleinteile & Köder</h2>
    <p class="gruppe-hinweis">${b.teile.length ? `${b.teile.length} ${b.teile.length === 1 ? "Teil" : "Teile"}${b.boxen.length ? ` in ${b.boxen.length} ${b.boxen.length === 1 ? "Box" : "Boxen"}` : ", noch keine Box angelegt"}${nk.length ? ` · <b class="kt-warn">${nk.length} knapp</b>` : " · alles genug da"}. Kein Zählen: nur antippen, wenn etwas knapp wird.` : "Leg deine Köderboxen an, mach ein Foto davon und trag ein, was drin ist. Statt zu zählen tippst du nur an, wenn etwas knapp wird."}</p>
    <label class="such kt-suche"><span class="vh">Wo ist …?</span><input type="search" data-kt-suche placeholder="Wo ist …? z. B. Snap, Jigkopf 10 g" value="${esc(suche)}" autocomplete="off"></label>
    <div id="kt-treffer">${trefferHTML(b)}</div>
    <div class="kt-boxen">${b.boxen.map(x => `<button type="button" class="kt-box${offeneBox === x.id ? " on" : ""}" data-kt-box-auf="${esc(x.id)}">
        <img data-kt-foto="${esc(x.id)}" alt="" hidden><span class="kt-foto-leer">📦</span><b>${esc(x.name)}</b><small>${(n => n === 1 ? "1 Teil" : n + " Teile")(b.teile.filter(t => t.boxId === x.id).length)}</small></button>`).join("")}
      <button type="button" class="kt-box neu" data-kt-box-neu><span class="kt-foto-leer">+</span><b>Box anlegen</b></button></div>
    ${offeneBox ? boxDetailHTML(b) : ""}
    ${nk.length ? `<div class="kt-nachkauf"><h3>Einkaufsliste</h3><ul>${nk.map(t => `<li><span>${esc(t.name)}</span><small>${STAND_TEXT[standVon(t)]}${t.boxId ? " · " + esc(boxName(b, t.boxId)) : ""}</small></li>`).join("")}</ul>
      <button type="button" class="knopf klein" data-kt-kopieren>Liste teilen</button></div>` : ""}
    ${proKat.map(({ k, teile }) => `<details class="kt-fach"${teile.some(knapp) || proKat.length <= 3 || teile.some(t => t.id === bearbeite) ? " open" : ""}>
      <summary><span>${esc(k.name)}</span><small>${teile.length} Sorte${teile.length > 1 ? "n" : ""}${teile.some(knapp) ? " · knapp" : ""}</small></summary>
      <ul class="kt-liste">${teile.map(t => offeneBox && offeneBox !== "neu" && t.boxId === offeneBox && bearbeite === t.id ? "" : teilZeile(b, t)).join("")}</ul></details>`).join("")}
    ${bearbeite === "neu" && !(offeneBox && offeneBox !== "neu") ? formHTML(null, b) : `<div class="akt-zeile"><button type="button" class="knopf klein" data-kt-neu>+ Teil hinzufügen</button>
      <button type="button" class="knopf klein leise" data-kt-schnell>${schnell ? "Vorschläge schließen" : "Vorschläge aus deinen Montagen"}</button></div>`}
    ${schnell ? (v.length ? `<div class="kt-schnell"><p class="hinweis-klein">Teile aus den Montagen, die du mit deinem Gerät fischen kannst. Antippen übernimmt sie (Füllstand „genug“).</p>
      <ul>${v.map(x => `<li><button type="button" class="knopf klein leise" data-kt-vorschlag="${esc(x.name)}" data-kt-kat="${x.kat}">+ ${esc(x.name)} <small>${esc(x.info)}</small></button></li>`).join("")}</ul>
      <button type="button" class="knopf klein" data-kt-alle>Alle übernehmen</button></div>` : `<p class="hinweis-klein">Alle Teile aus deinen Montagen stehen schon in der Box.</p>`) : ""}
  </section>`;
}

function feld(form, n){ const el = form.querySelector(`[data-kt-feld="${n}"]`); return el ? el.value.trim() : ""; }

/* true = Klick verarbeitet (Liste neu zeichnen) */
export function kleinteileKlick(e, toast){
  const el = e.target.closest("[data-kt-stand],[data-kt-edit],[data-kt-neu],[data-kt-abbrechen],[data-kt-speichern],[data-kt-weg],[data-kt-schnell],[data-kt-vorschlag],[data-kt-alle],[data-kt-kopieren],[data-kt-box-auf],[data-kt-box-neu],[data-kt-box-zu],[data-kt-box-speichern],[data-kt-box-weg],[data-kt-check-fertig]");
  if(!el) return false;
  const d = el.dataset;
  if(d.ktStand){
    const [id, v] = d.ktStand.split("|");
    aendere(b => { const t = b.teile.find(x => x.id === id); if(t) t.stand = v; });
    if(v !== "voll") toast && toast(v === "leer" ? "Leer – steht auf der Einkaufsliste" : "Knapp – steht auf der Einkaufsliste");
    return true;
  }
  if(d.ktCheckFertig !== undefined){ try { localStorage.removeItem(CHECK_KEY); } catch(err){} toast && toast("Danke – Box ist aktuell"); return true; }
  if(d.ktBoxAuf){ offeneBox = offeneBox === d.ktBoxAuf && !el.classList.contains("kt-treffer-zeile") ? null : d.ktBoxAuf; bearbeite = null; return true; }
  if(d.ktBoxNeu !== undefined){ offeneBox = "neu"; setTimeout(() => { const i = document.querySelector('[data-kt-feld="bname"]'); if(i) i.focus(); }, 0); return true; }
  if(d.ktBoxZu !== undefined){ offeneBox = null; bearbeite = null; return true; }
  if(d.ktBoxSpeichern){
    const f = el.closest("[data-kt-boxform]"); const name = feld(f, "bname");
    if(!name){ toast && toast("Bitte einen Namen für die Box eintragen"); return true; }
    const id = neueId();
    aendere(b => b.boxen.push({ id, name, notiz: feld(f, "bnotiz") }));
    offeneBox = id; toast && toast("Box angelegt – jetzt ein Foto machen");
    return true;
  }
  if(d.ktBoxWeg){
    if(!confirm("Box löschen? Die Teile bleiben erhalten, nur ohne Box.")) return false;
    aendere(b => { b.boxen = b.boxen.filter(x => x.id !== d.ktBoxWeg); b.teile.forEach(t => { if(t.boxId === d.ktBoxWeg) t.boxId = ""; }); });
    fotoSchreiben(d.ktBoxWeg, null); offeneBox = null; return true;
  }
  if(d.ktEdit !== undefined){ bearbeite = d.ktEdit; return true; }
  if(d.ktNeu !== undefined){ bearbeite = "neu"; setTimeout(() => { const i = document.querySelector('[data-kt-form] [data-kt-feld="name"]'); if(i) i.focus(); }, 0); return true; }
  if(d.ktAbbrechen !== undefined){ bearbeite = null; return true; }
  if(d.ktSpeichern){
    const form = el.closest("[data-kt-form]");
    const name = feld(form, "name");
    if(!name){ toast && toast("Bitte einen Namen eintragen"); return true; }
    let kat = feld(form, "kat");
    aendere(b => {
      let t = d.ktSpeichern === "neu" ? null : b.teile.find(x => x.id === d.ktSpeichern);
      /* Art automatisch, wenn beim neuen Teil nichts verstellt wurde */
      if(!t && kat === "jig" && kategorieVon(name) !== "sonst") kat = kategorieVon(name);
      if(!t){ t = { id: neueId() }; b.teile.push(t); }
      Object.assign(t, { name, kat, stand: feld(form, "stand") || "voll", boxId: feld(form, "boxId"), fach: feld(form, "fach") });
    });
    bearbeite = null;
    toast && toast("Gespeichert");
    return true;
  }
  if(d.ktWeg){ aendere(b => { b.teile = b.teile.filter(x => x.id !== d.ktWeg); }); bearbeite = null; return true; }
  if(d.ktSchnell !== undefined){ schnell = !schnell; return true; }
  if(d.ktVorschlag){ aendere(b => { b.teile.push({ id: neueId(), name: d.ktVorschlag, kat: d.ktKat, stand: "voll" }); }); return true; }
  if(d.ktAlle !== undefined){ const v = vorschlaege(); aendere(b => v.forEach(x => b.teile.push({ id: neueId(), name: x.name, kat: x.kat, stand: "voll" }))); schnell = false; toast && toast(`${v.length} Teile übernommen`); return true; }
  if(d.ktKopieren !== undefined){
    const text = "Einkaufsliste Angeln:\n" + nachkaufListe().map(t => `- ${t.name} (${STAND_TEXT[standVon(t)]})`).join("\n");
    if(navigator.share) navigator.share({ title: "Einkaufsliste", text }).catch(() => {});
    else if(navigator.clipboard) navigator.clipboard.writeText(text).then(() => toast && toast("Einkaufsliste kopiert"));
    return false;
  }
  return false;
}

/* Suche „Wo ist …?“ – nur die Trefferliste neu zeichnen, damit die Tastatur offen bleibt */
export function kleinteileEingabe(e){
  if(!e.target.matches("[data-kt-suche]")) return false;
  suche = e.target.value.trim();
  const z = document.getElementById("kt-treffer");
  if(z){ z.innerHTML = trefferHTML(box()); kleinteileFotosLaden(); }
  return true;
}
/* Foto aufnehmen; fertig() zeichnet neu */
export function kleinteileAenderung(e, toast, fertig){
  const inp = e.target.closest("[data-kt-foto-neu]");
  if(!inp || !inp.files || !inp.files[0]) return false;
  const id = inp.dataset.ktFotoNeu;
  verkleinern(inp.files[0]).then(daten => fotoSchreiben(id, daten)).then(() => { toast && toast("Foto gespeichert"); fertig && fertig(); })
    .catch(() => toast && toast("Das Foto konnte nicht gelesen werden"));
  return true;
}
