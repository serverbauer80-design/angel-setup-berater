/* ============================================================
   Erlaubnisscheine (Etappe 10)
   Jahres-/Tageskarten, Vereinsmitgliedschaft, Fischereischein-Abgabe,
   Fisketegn – mit Foto, Gültigkeit und den Spots, für die sie gelten.
   Ablage: im Browser (neu_scheine_v1) und mit Login in der Cloud –
   in derselben Sammlung wie die „Unterlagen“ der bisherigen App
   (unterlagen/{uid}/docs, Dokument „schein_<id>“, typ "schein").
   Hinweise erscheinen in der App (keine Push-Nachrichten).
   ============================================================ */
import { lese, sync, ladeFaengeDaten } from "./store.js";
import { blatt, feld, auswahl } from "./edit.js";
import { heuteISO, datumDE } from "./setups.js";

const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[c]));
const genId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const km = (a, b, c, d) => 6371 * Math.hypot((c - a) * Math.PI / 180, (d - b) * Math.PI / 180 * Math.cos(a * Math.PI / 180));
const KEY = "neu_scheine_v1", WEG_KEY = "neu_scheine_weg_v1";
export const ARTEN = [["jahr", "Jahreskarte"], ["tag", "Tages-/Wochenkarte"], ["verein", "Vereinsmitgliedschaft"], ["fischereischein", "Fischereischein / Abgabemarke"], ["dk", "Fisketegn (Dänemark)"], ["sonst", "Sonstiges"]];
const ART_NAME = Object.fromEntries(ARTEN);

let liste = lese(KEY, []) || [];
const hoerer = new Set();
export function beiScheinAenderung(fn){ hoerer.add(fn); }
const melde = () => hoerer.forEach(fn => { try { fn(); } catch(e){ console.error(e); } });
let toastFn = () => {};
export function initScheine({ toast }){ toastFn = toast; }

export function scheine(){ return liste; }
function lokalSpeichern(){
  try { localStorage.setItem(KEY, JSON.stringify(liste)); return true; }
  catch(e){ toastFn("Speicher voll – Foto bitte kleiner aufnehmen"); return false; }
}

/* ---------- Cloud ---------- */
function col(){
  if(!sync.user || typeof firebase === "undefined") return null;
  return firebase.firestore().collection("unterlagen").doc(sync.user.uid).collection("docs");
}
const docId = id => "schein_" + id;
async function hoch(s){
  const c = col(); if(!c) return false;
  try {
    s.inCloud = true;
    await c.doc(docId(s.id)).set({ typ: "schein", name: s.name, created: s.erstellt || new Date().toISOString(), schein: s });
    return true;
  } catch(e){ s.inCloud = false; return false; }
}
let letzterUser = null, abgleich = null;
/* Beim Anmelden (und danach bei jedem Sync-Wechsel) einmal abgleichen: neuere Fassung gewinnt */
export function scheineNachSync(){
  const uid = sync.user ? sync.user.uid : null;
  if(uid === letzterUser || abgleich) return;
  letzterUser = uid;
  if(uid) abgleich = abgleichen().finally(() => { abgleich = null; });
}
async function abgleichen(){
  const c = col(); if(!c) return;
  let cloud;
  try { cloud = (await c.where("typ", "==", "schein").get()).docs.map(d => d.data().schein).filter(Boolean); }
  catch(e){ return; }
  const weg = new Set(lese(WEG_KEY, []) || []);
  for(const id of weg){ try { await c.doc(docId(id)).delete(); } catch(e){} }
  try { localStorage.setItem(WEG_KEY, "[]"); } catch(e){}
  const lokal = new Map(liste.map(s => [s.id, s]));
  const out = [], cloudIds = new Set();
  for(const cs of cloud){
    if(weg.has(cs.id)) continue;
    cloudIds.add(cs.id);
    const l = lokal.get(cs.id);
    if(l && (l.geaendert || "") > (cs.geaendert || "")){ out.push(l); await hoch(l); }
    else out.push(cs);
  }
  for(const l of liste){
    if(cloudIds.has(l.id)) continue;
    if(l.inCloud) continue;                 /* war schon in der Cloud, dort gelöscht -> hier auch weg */
    out.push(l); await hoch(l);
  }
  liste = out; lokalSpeichern(); melde();
}
async function speichere(s){
  s.geaendert = new Date().toISOString();
  const i = liste.findIndex(x => x.id === s.id);
  if(i >= 0) liste[i] = s; else liste.push(s);
  if(!lokalSpeichern()) return "fehler";
  melde();
  const ok = await hoch(s);
  lokalSpeichern();
  return ok ? "cloud" : "lokal";
}
async function loesche(id){
  liste = liste.filter(s => s.id !== id);
  lokalSpeichern(); melde();
  const c = col();
  if(c){ try { await c.doc(docId(id)).delete(); return; } catch(e){} }
  const weg = lese(WEG_KEY, []) || []; weg.push(id);
  try { localStorage.setItem(WEG_KEY, JSON.stringify(weg)); } catch(e){}
}

/* ---------- Gültigkeit ---------- */
const tageBis = iso => Math.round((new Date(iso + "T12:00:00") - new Date(heuteISO() + "T12:00:00")) / 864e5);
export function gueltig(s){
  if(s.von && s.von > heuteISO()) return { st: "spaeter", text: `gilt ab ${datumDE(s.von)}` };
  if(!s.bis) return { st: "ok", text: "unbefristet" };
  const t = tageBis(s.bis);
  if(t < 0) return { st: "ab", text: `abgelaufen am ${datumDE(s.bis)}`, tage: t };
  if(t <= 30) return { st: "bald", text: t === 0 ? "läuft heute ab" : `läuft in ${t} Tag${t > 1 ? "en" : ""} ab (${datumDE(s.bis)})`, tage: t };
  return { st: "ok", text: `gültig bis ${datumDE(s.bis)}`, tage: t };
}
/* Fangmeldung fällig? (Abgabedatum in ≤ 30 Tagen oder bis zu 90 Tage überfällig, noch nicht abgegeben) */
export function fmFaellig(s){
  if(!s.fmBis || s.fmAbgegeben) return null;
  const t = tageBis(s.fmBis);
  if(t > 30 || t < -90) return null;
  return { tage: t, text: t < 0 ? `Fangmeldung war bis ${datumDE(s.fmBis)} fällig` : t === 0 ? "Fangmeldung heute abgeben" : `Fangmeldung bis ${datumDE(s.fmBis)} abgeben` };
}
function fmOeffnen(s){
  import("./fangmeldung.js").then(m => m.fangmeldungOeffnen(s, {
    toast: toastFn,
    zurueck: () => scheinBearbeiten(s.id),
    abgegeben: () => { const x = liste.find(y => y.id === s.id); if(x) speichere({ ...x, fmAbgegeben: heuteISO() }).then(() => toastFn("Fangmeldung als abgegeben markiert")); }
  }));
}
export function scheineFuerSpot(spotId){ return liste.filter(s => (s.spotIds || []).includes(spotId)); }
/* Für einen Ort aus „Heute“: eigener Spot direkt, sonst Spots im Umkreis von 5 km */
export function scheineFuerOrt(ort){
  if(!ort) return [];
  if(String(ort.id).startsWith("spot_")) return scheineFuerSpot(ort.id.slice(5));
  const nah = ladeFaengeDaten().spots.filter(s => typeof s.lat === "number" && km(s.lat, s.lng, ort.lat, ort.lng) < 5).map(s => s.id);
  const dk = /Dänemark/.test(ort.name);
  return liste.filter(s => (s.spotIds || []).some(id => nah.includes(id)) || (dk && s.art === "dk"));
}
/* Für die Packliste: Info zum Erlaubnisschein-Punkt */
export function scheinInfo(ort){
  const l = scheineFuerOrt(ort);
  if(!l.length) return liste.length ? "für diesen Ort keiner hinterlegt – im Bereich Gewässer eintragen" : "";
  const best = l.map(s => ({ s, g: gueltig(s) })).sort((a, b) => ({ ok: 0, bald: 1, spaeter: 2, ab: 3 })[a.g.st] - ({ ok: 0, bald: 1, spaeter: 2, ab: 3 })[b.g.st])[0];
  return `${best.s.name} · ${best.g.text}${best.g.st === "ab" ? " ⚠" : ""}`;
}

/* ---------- Ansichten ---------- */
const PILL = { ok: "frei", bald: "warnung", ab: "alarm", spaeter: "" };
function zeile(s){
  const g = gueltig(s);
  const spots = ladeFaengeDaten().spots;
  const fuer = (s.spotIds || []).map(id => (spots.find(x => x.id === id) || {}).name).filter(Boolean);
  return `<li><button type="button" class="sch-zeile" data-schein="${esc(s.id)}">
    ${s.foto ? `<img src="${s.foto}" alt="" class="sch-mini">` : `<span class="sch-mini leer" aria-hidden="true">📄</span>`}
    <span class="sch-txt"><b>${esc(s.name)}</b><small>${esc([ART_NAME[s.art] || "", fuer.length ? "für " + fuer.join(", ") : s.gilt || ""].filter(Boolean).join(" · "))}</small>${fmFaellig(s) ? `<small class="sch-fm-faellig">${esc(fmFaellig(s).text)}</small>` : ""}</span>
    <span class="sch-status ${g.st}">${esc(g.text)}</span></button></li>`;
}
export function scheineHTML(){
  const sortiert = liste.slice().sort((a, b) => ({ ab: 1, bald: 0, ok: 2, spaeter: 3 })[gueltig(a).st] - ({ ab: 1, bald: 0, ok: 2, spaeter: 3 })[gueltig(b).st] || String(a.name).localeCompare(b.name, "de"));
  return `<section class="sch-bereich" aria-label="Erlaubnisscheine">
    <div class="sch-kopf"><h3>Deine Erlaubnisscheine${liste.length ? ` <small>(${liste.length})</small>` : ""}</h3><button type="button" class="knopf klein" data-schein-neu>+ Schein</button></div>
    ${liste.length ? `<ul class="sch-liste">${sortiert.map(zeile).join("")}</ul>`
      : `<p class="hinweis-klein">Hinterlege hier Jahreskarte, Tageskarte, Vereinsausweis oder die Abgabemarke zum Fischereischein, gern mit Foto. Dann hast du sie am Wasser dabei, siehst im Steckbrief, welcher Schein für den Spot gilt, und bekommst rechtzeitig einen Hinweis, bevor einer abläuft.</p>`}
    <p class="hinweis-klein">${sync.user ? "Wird mit deinem Konto in der Cloud gesichert." : "Ohne Anmeldung nur auf diesem Gerät gespeichert."}</p>
  </section>`;
}
/* Für den Spot-Steckbrief */
export function scheineSpotHTML(spotId){
  const l = scheineFuerSpot(spotId);
  if(!l.length) return `<p class="sch-spot"><button type="button" class="knopf leise klein" data-schein-neu="${esc(spotId)}">+ Erlaubnisschein für diesen Spot</button></p>`;
  return `<div class="sch-spot">${l.map(s => { const g = gueltig(s); return `<button type="button" class="sch-spot-zeile ${g.st}" data-schein="${esc(s.id)}"><b>${esc(s.name)}</b><span>${esc(g.text)}</span></button>`; }).join("")}</div>`;
}
/* Hinweis in „Heute“: was läuft bald ab oder ist gerade abgelaufen */
export function scheinHinweisHTML(){
  const l = liste.map(s => ({ s, g: gueltig(s) })).filter(x => x.g.st === "bald" || (x.g.st === "ab" && x.g.tage >= -30));
  const fm = liste.map(s => ({ s, f: fmFaellig(s) })).filter(x => x.f);
  if(!l.length && !fm.length) return "";
  return `<div class="h-karte sch-hinweis"><h3>Erlaubnisscheine</h3><ul>${l.map(x => `<li class="${x.g.st}"><button type="button" data-schein="${esc(x.s.id)}"><b>${esc(x.s.name)}</b><span>${esc(x.g.text)}</span></button></li>`).join("")}
    ${fm.map(x => `<li class="${x.f.tage < 0 ? "ab" : "bald"}"><button type="button" data-schein-fm="${esc(x.s.id)}"><b>${esc(x.s.name)}</b><span>${esc(x.f.text)} – Liste ist fertig</span></button></li>`).join("")}</ul>
    ${l.length ? `<p class="hinweis-klein">Verlängern und dann im Schein das neue Ablaufdatum eintragen.</p>` : ""}</div>`;
}

/* ---------- Bearbeiten ---------- */
function verkleinere(file){
  return new Promise((res, rej) => {
    const rd = new FileReader();
    rd.onload = e => {
      const img = new Image();
      img.onload = () => {
        /* Schrift muss lesbar bleiben, das Dokument aber unter 1 MB (Cloud-Grenze) */
        const max = 1400, f = Math.min(1, max / Math.max(img.width, img.height));
        const c = document.createElement("canvas"); c.width = Math.round(img.width * f); c.height = Math.round(img.height * f);
        c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
        res(c.toDataURL("image/jpeg", 0.62));
      };
      img.onerror = rej; img.src = e.target.result;
    };
    rd.onerror = rej; rd.readAsDataURL(file);
  });
}
function spotAuswahl(gewaehlt){
  const d = ladeFaengeDaten();
  const eigen = new Set(d.catches.map(c => c.spotId));
  const sp = d.spots.slice().sort((a, b) => ((gewaehlt.includes(b.id) ? 2 : 0) + (eigen.has(b.id) || b.visited ? 1 : 0)) - ((gewaehlt.includes(a.id) ? 2 : 0) + (eigen.has(a.id) || a.visited ? 1 : 0)) || a.name.localeCompare(b.name, "de"));
  return `<fieldset class="feld breit sch-spots"><legend>Gilt für deine Spots</legend>
    <input type="search" class="sch-spot-filter" placeholder="Spots filtern …" aria-label="Spots filtern">
    <div class="sch-spot-wahl">${sp.map(s => `<label><input type="checkbox" name="spot" value="${esc(s.id)}"${gewaehlt.includes(s.id) ? " checked" : ""}> <span>${esc(s.name)}</span></label>`).join("")}</div></fieldset>`;
}
export function scheinBearbeiten(id, vorgabeSpot){
  const alt = id ? liste.find(s => s.id === id) : null;
  if(id && !alt) return;
  const v = alt || { art: "jahr", spotIds: vorgabeSpot ? [vorgabeSpot] : [], von: "", bis: "" };
  let fotos = [alt && alt.foto || null, alt && alt.foto2 || null];
  const vorschau = () => fotos.map((f, i) => f ? `<figure><img src="${f}" alt="${i ? "Rückseite" : "Vorderseite"}" class="sch-foto" data-sch-gross="${i}"><button type="button" class="knopf leise klein" data-sch-foto-weg="${i}">Foto entfernen</button></figure>` : "").join("");
  const dlg = blatt(alt ? "Erlaubnisschein" : "Neuer Erlaubnisschein", `
    <div class="feld-raster">
      ${feld("name", "Bezeichnung", v.name || "", { pflicht: true, breit: true, ph: "z. B. Jahreskarte ASV Rendsburg" })}
      ${auswahl("art", "Art", ARTEN, v.art || "jahr")}
      ${feld("nr", "Nummer", v.nr || "", { ph: "optional" })}
      ${feld("von", "Gültig ab", v.von || "", { typ: "date" })}
      ${feld("bis", "Gültig bis", v.bis || "", { typ: "date" })}
      ${spotAuswahl(v.spotIds || [])}
      ${feld("gilt", "Gilt außerdem für", v.gilt || "", { breit: true, ph: "z. B. alle Vereinsgewässer, Strecke A–B" })}
      ${feld("notiz", "Notiz", v.notiz || "", { breit: true, textarea: true, rows: 2, ph: "Regeln, Fanglimit …" })}
      ${feld("fmBis", "Fangmeldung abgeben bis", v.fmBis || "", { typ: "date" })}
      ${alt ? `<div class="breit sch-fm"><span><b>Fangmeldung</b><small id="sch-fm-kurz">…</small></span><button type="button" class="knopf klein" data-sch-fm>Ansehen</button></div>` : ""}
      <label class="feld"><span>Foto Vorderseite</span><input type="file" name="foto" data-nr="0" accept="image/*"></label>
      <label class="feld"><span>Foto Rückseite</span><input type="file" name="foto2" data-nr="1" accept="image/*"></label>
      <div class="breit sch-vorschau" id="sch-vorschau">${vorschau()}</div>
    </div>
    <div class="blatt-akt"><button type="submit" class="knopf prim" value="speichern">Speichern</button></div>
    ${alt ? `<div class="gefahr"><button type="submit" class="knopf warn" value="loeschen" formnovalidate>Schein löschen</button></div>` : ""}`,
    (fd, knopf) => {
      if(knopf && knopf.value === "loeschen"){
        if(!confirm("Diesen Erlaubnisschein löschen? Das Foto ist dann auch weg.")) return false;
        loesche(alt.id).then(() => toastFn("Schein gelöscht"));
        return null;
      }
      const name = String(fd.get("name") || "").trim();
      if(!name) return "Bitte eine Bezeichnung eingeben.";
      const von = fd.get("von") || "", bis = fd.get("bis") || "";
      if(von && bis && bis < von) return "„Gültig bis“ liegt vor „Gültig ab“.";
      const s = { ...(alt || {}), id: alt ? alt.id : genId(), erstellt: alt ? alt.erstellt : new Date().toISOString(),
        name, art: fd.get("art"), nr: String(fd.get("nr") || "").trim(), von, bis,
        spotIds: fd.getAll("spot"), gilt: String(fd.get("gilt") || "").trim(), notiz: String(fd.get("notiz") || "").trim(),
        fmBis: fd.get("fmBis") || "", fmAbgegeben: alt && alt.fmBis === (fd.get("fmBis") || "") ? alt.fmAbgegeben || null : null,
        foto: fotos[0], foto2: fotos[1] };
      speichere(s).then(wo => toastFn(wo === "cloud" ? "Schein gespeichert" : wo === "lokal" ? "Schein gespeichert (nur auf diesem Gerät)" : "Nicht gespeichert"));
      return null;
    });
  const form = dlg.querySelector("form");
  if(alt) import("./fangmeldung.js").then(m => { const k = form.querySelector("#sch-fm-kurz"); if(k) k.textContent = m.fangmeldungKurz(alt) + (alt.fmAbgegeben ? ` · abgegeben am ${datumDE(alt.fmAbgegeben)}` : ""); });
  form.addEventListener("change", async e => {
    if(e.target.type === "file" && e.target.files[0]){
      try { fotos[+e.target.dataset.nr] = await verkleinere(e.target.files[0]); form.querySelector("#sch-vorschau").innerHTML = vorschau(); }
      catch(err){ toastFn("Foto konnte nicht gelesen werden"); }
    }
  });
  form.addEventListener("input", e => {
    if(!e.target.classList.contains("sch-spot-filter")) return;
    const q = e.target.value.toLowerCase();
    form.querySelectorAll(".sch-spot-wahl label").forEach(l => { l.hidden = q && !l.textContent.toLowerCase().includes(q) && !l.querySelector("input").checked; });
  });
  form.addEventListener("click", e => {
    if(e.target.closest("[data-sch-fm]")){ fmOeffnen(alt); return; }
    const w = e.target.closest("[data-sch-foto-weg]");
    if(w){ fotos[+w.dataset.schFotoWeg] = null; form.querySelector("#sch-vorschau").innerHTML = vorschau(); return; }
    const g = e.target.closest("[data-sch-gross]");
    if(g){ grossZeigen(g.getAttribute("src"), dlg); return; }
  });
}
/* Foto groß – als Ebene im Blatt, Tippen schließt (Pop-ups sind in der iPhone-App unzuverlässig) */
function grossZeigen(src, wo){
  const o = document.createElement("div");
  o.className = "sch-gross"; o.setAttribute("role", "button"); o.setAttribute("aria-label", "Foto schließen"); o.tabIndex = 0;
  o.innerHTML = `<img src="${src}" alt="Erlaubnisschein"><span>Tippen zum Schließen</span>`;
  const zu = () => o.remove();
  o.addEventListener("click", zu); o.addEventListener("keydown", e => { if(e.key === "Escape" || e.key === "Enter"){ e.preventDefault(); e.stopPropagation(); zu(); } });
  wo.appendChild(o); o.focus();
}

/* Klicks aus Gewässer/Heute */
export function scheineKlick(e){
  const fm = e.target.closest("[data-schein-fm]");
  if(fm){ const s = liste.find(x => x.id === fm.dataset.scheinFm); if(s) fmOeffnen(s); return true; }
  const n = e.target.closest("[data-schein-neu]");
  if(n){ scheinBearbeiten(null, n.dataset.scheinNeu || null); return true; }
  const s = e.target.closest("[data-schein]");
  if(s){ scheinBearbeiten(s.dataset.schein); return true; }
  return false;
}
