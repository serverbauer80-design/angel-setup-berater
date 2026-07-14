/* ================= Angel-Setup-Berater — Logik ================= */

const $ = (s) => document.querySelector(s);
const fischSel = $("#fisch");
const gwSel    = $("#gewaesser");
const hintEl   = $("#hint");
const ergEl    = $("#ergebnis");

// Muss ganz oben stehen: einige speichere*()-Funktionen (z. B. speichereFaenge)
// werden schon beim allerersten Laden weiter unten aufgerufen und referenzieren
// fsSyncDocRef über fsSyncPushDebounced() – ohne diese frühe Deklaration gäbe es
// einen "Cannot access before initialization"-Fehler (temporal dead zone).
let fsSyncUser = null, fsSyncDocRef = null, fsSyncUnsub = null, fsSyncPushTimer = null, fsSyncReady = false;

/* ---------- Eigene Ergänzungen zum Inventar (im Browser gespeichert) ---------- */
const ZUSATZ_KEY = "mein_inventar_v1";
function ladeZusatz(){
  try { const z = JSON.parse(localStorage.getItem(ZUSATZ_KEY)); return (z && z.setups && z.zubehoer) ? z : {setups:[], zubehoer:[]}; }
  catch(e){ return {setups:[], zubehoer:[]}; }
}
function speichereZusatz(){ try { localStorage.setItem(ZUSATZ_KEY, JSON.stringify(ZUSATZ)); } catch(e){} fsSyncPushDebounced(); }
let ZUSATZ = ladeZusatz();
function escAttr(s){ return String(s).replace(/"/g,"&quot;").replace(/</g,"&lt;").replace(/>/g,"&gt;"); }

/* ---------- Fänge & Spots (im Browser gespeichert) ----------
   Vereint zwei frühere Datenquellen: die schnelle "Fang eintragen"-Funktion
   im Berater (Fisch/Methode-Bezug) und das eigenständige Angeltagebuch
   (GPS-Spots auf Karte). Ein Fang kann optional einen Spot referenzieren
   und/oder eine Methode aus dem Berater. ---------- */
const FAENGE_KEY = "meine_faenge_v1";
function genId(){ return Date.now().toString(36) + Math.random().toString(36).slice(2,7); }
function heuteISO(){ return new Date().toISOString().slice(0,10); }

function ladeFaengeDaten(){
  let raw;
  try { raw = JSON.parse(localStorage.getItem(FAENGE_KEY)); } catch(e){ raw = null; }

  // Migration: alte Version war ein reines Array von Fang-Einträgen ohne Spots
  if(Array.isArray(raw)){
    return { spots: [], catches: raw.map(c => ({ ...c, spotId: c.spotId || null })) };
  }
  if(raw && Array.isArray(raw.spots) && Array.isArray(raw.catches)){
    return raw;
  }

  // Allererster Start: Spot-Datenbank aus dem bisherigen Angeltagebuch vorbefüllen
  const seedSpots = (typeof SPOTS_SEED !== "undefined" ? SPOTS_SEED : []).map(s => ({
    ...s, id: genId(), rating: 0, visited: false, created: new Date().toISOString()
  }));
  return { spots: seedSpots, catches: [] };
}
function speichereFaenge(){ try { localStorage.setItem(FAENGE_KEY, JSON.stringify(FAENGE)); } catch(e){} fsSyncPushDebounced(); }
let FAENGE = ladeFaengeDaten();

/* Nachträglich in data.js ergänzte SPOTS_SEED-Einträge (z. B. neue Gewässer)
   auch bei bereits bestehenden Nutzern nachladen – per Namensabgleich, damit
   eigene/bereits vorhandene Spots nicht verändert oder dupliziert werden.
   Zusätzlich: fünf ursprünglich falsch als "Schleswig-Holstein"/"See" statt
   "Dänemark"/"Forellensee" eingetragene Spots bei Bestandsnutzern korrigieren. */
(function migriereSpotsSeed(){
  if(typeof SPOTS_SEED === "undefined") return;
  const FALSCH_MARKIERT_DK = new Set([
    "Arrild Fiskesø", "Rødekro Fiskepark", "Mjøls Lystfiskersø",
    "Tinglev Sønderby Put & Take", "Oxriver Put & Take"
  ]);
  let geaendert = false;
  FAENGE.spots.forEach(s => {
    if(FALSCH_MARKIERT_DK.has(s.name) && (s.region !== "dk" || s.type !== "forellensee")){
      s.region = "dk"; s.type = "forellensee"; geaendert = true;
    }
  });
  const bekannteNamen = new Set(FAENGE.spots.map(s => s.name));
  SPOTS_SEED.forEach(s => {
    if(bekannteNamen.has(s.name)) return;
    FAENGE.spots.push({ ...s, id: genId(), rating: 0, visited: false, created: new Date().toISOString() });
    bekannteNamen.add(s.name);
    geaendert = true;
  });
  if(geaendert) speichereFaenge();
})();

speichereFaenge();

/* ---------- Wartungserinnerung (Setup-Pflege, im Browser gespeichert) ---------- */
const WARTUNG_KEY = "wartung_v1";
function ladeWartung(){
  try { return JSON.parse(localStorage.getItem(WARTUNG_KEY)) || {}; }
  catch(e){ return {}; }
}
function speichereWartung(){ try { localStorage.setItem(WARTUNG_KEY, JSON.stringify(WARTUNG)); } catch(e){} fsSyncPushDebounced(); }
let WARTUNG = ladeWartung();
function tageSeit(datumStr){
  const then = new Date(datumStr + "T00:00:00");
  return Math.floor((Date.now() - then.getTime()) / (1000*60*60*24));
}

/* ---------- Packliste fürs Wochenende (im Browser gespeichert) ----------
   Abgehakte Punkte pro Ansatz (Fisch+Methode), damit man zu Hause vorbereiten
   und die Häkchen dann als "eingepackt" stehen lassen kann, bis man sie
   selbst zurücksetzt (kein automatisches Reset nach dem Trip). ---------- */
const PACKLISTE_KEY = "packliste_check_v1";
function ladePackliste(){
  try { return JSON.parse(localStorage.getItem(PACKLISTE_KEY)) || {}; }
  catch(e){ return {}; }
}
function speicherePackliste(){ try { localStorage.setItem(PACKLISTE_KEY, JSON.stringify(PACKLISTE)); } catch(e){} fsSyncPushDebounced(); }
let PACKLISTE = ladePackliste();

/* ---------- Geräte-Synchronisation (Firebase, optional) ----------
   Alle "speichere*"-Funktionen rufen fsSyncPushDebounced() auf, sobald sich
   etwas ändert. Ohne Login passiert das einfach nichts (fsSyncDocRef ist
   dann null) – die App funktioniert weiterhin komplett offline/lokal.
   (Die let-Deklarationen dafür stehen ganz oben in der Datei, siehe Kommentar dort.) */

function fsSyncCollectState(){
  // Fotos NIE mit hochladen: sie sind bewusst rein lokal (siehe Kommentar bei
  // fsResizeBild) und würden das 1MB-Limit des Sync-Dokuments sprengen.
  const faengeOhneFotos = { ...FAENGE, catches: FAENGE.catches.map(c => {
    if(!c.foto) return c;
    const { foto, ...rest } = c;
    return rest;
  }) };
  return {
    zusatz: ZUSATZ, faenge: faengeOhneFotos, manuell: MANUELL, wartung: WARTUNG, packliste: PACKLISTE,
    osmCache: typeof OSM_CACHE !== "undefined" ? OSM_CACHE : [],
    flussCache: typeof FLUSS_CACHE !== "undefined" ? FLUSS_CACHE : [],
    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
  };
}

function fsSyncApplyState(data){
  if(data.zusatz){ ZUSATZ = data.zusatz; try{localStorage.setItem(ZUSATZ_KEY, JSON.stringify(ZUSATZ));}catch(e){} }
  if(data.faenge){
    // Fotos sind rein lokal und werden nie synchronisiert (siehe fsSyncCollectState) -
    // beim Anwenden der Cloud-Daten die lokal vorhandenen Fotos je Fang wieder anheften,
    // sonst würden sie hier durch die fotolose Cloud-Version überschrieben/gelöscht.
    const fotosNachId = new Map(FAENGE.catches.filter(c => c.foto).map(c => [c.id, c.foto]));
    FAENGE = data.faenge;
    FAENGE.catches.forEach(c => { if(!c.foto && fotosNachId.has(c.id)) c.foto = fotosNachId.get(c.id); });
    try{localStorage.setItem(FAENGE_KEY, JSON.stringify(FAENGE));}catch(e){}
  }
  if(data.manuell){ MANUELL = data.manuell; try{localStorage.setItem(MANUAL_KEY, JSON.stringify(MANUELL));}catch(e){} }
  if(data.wartung){ WARTUNG = data.wartung; try{localStorage.setItem(WARTUNG_KEY, JSON.stringify(WARTUNG));}catch(e){} }
  if(data.packliste){ PACKLISTE = data.packliste; try{localStorage.setItem(PACKLISTE_KEY, JSON.stringify(PACKLISTE));}catch(e){} }
  if(data.osmCache){ OSM_CACHE = data.osmCache; try{localStorage.setItem(OSM_CACHE_KEY, JSON.stringify(OSM_CACHE));}catch(e){} }
  if(data.flussCache){ FLUSS_CACHE = data.flussCache; try{localStorage.setItem(FLUSS_CACHE_KEY, JSON.stringify(FLUSS_CACHE));}catch(e){} }

  // Alles neu rendern, was von den synchronisierten Daten abhängt
  if(document.getElementById("inventar")) renderInventar();
  if(document.getElementById("checkliste")) renderCheckliste();
  if(typeof renderFaengeTop === "function" && document.getElementById("faenge-top")) renderFaengeTop();
  if(document.getElementById("ergebnis") && fischSel.value) berechne();
  if(document.getElementById("wochenende") && typeof renderWochenende === "function") renderWochenende();
  if(typeof fsMap !== "undefined" && fsMap){
    fsRenderMarkers();
    if(typeof fsRenderOsmMarkers === "function") fsRenderOsmMarkers();
    if(typeof fsFlussLayer !== "undefined" && fsFlussLayer && typeof fsRenderFlussnamen === "function") fsRenderFlussnamen();
  }
}

function fsSyncPushDebounced(){
  if(!fsSyncDocRef || !fsSyncReady) return;
  clearTimeout(fsSyncPushTimer);
  fsSyncPushTimer = setTimeout(() => {
    fsSyncDocRef.set(fsSyncCollectState(), { merge: true })
      .catch(err => console.warn("Sync-Push fehlgeschlagen:", err));
  }, 1500);
}

async function fsSyncOnLogin(user){
  fsSyncUser = user;
  fsSyncDocRef = firebase.firestore().collection("sync").doc(user.uid);
  const statusBtn = document.getElementById("sync-status-btn");
  if(statusBtn) statusBtn.textContent = "☁️ Synchronisiert";
  const emailDisplay = document.getElementById("sync-email-display");
  if(emailDisplay) emailDisplay.textContent = user.email;
  const loginForm = document.getElementById("sync-login-form");
  if(loginForm) loginForm.style.display = "none";
  const loggedInBox = document.getElementById("sync-loggedin-box");
  if(loggedInBox) loggedInBox.style.display = "block";

  try {
    const snap = await fsSyncDocRef.get();
    if(snap.exists) fsSyncApplyState(snap.data());
    else await fsSyncDocRef.set(fsSyncCollectState());
  } catch(e){
    const errEl = document.getElementById("sync-error");
    if(errEl){ errEl.textContent = "Erstsynchronisation fehlgeschlagen: " + e.message; errEl.style.display = "block"; }
  }
  fsSyncReady = true;

  if(fsSyncUnsub) fsSyncUnsub();
  fsSyncUnsub = fsSyncDocRef.onSnapshot(snap => {
    if(!snap.exists || snap.metadata.hasPendingWrites) return; // eigener, noch unbestätigter Schreibvorgang
    fsSyncApplyState(snap.data());
  });
}

function fsSyncOnLogout(){
  fsSyncUser = null; fsSyncDocRef = null; fsSyncReady = false;
  if(fsSyncUnsub){ fsSyncUnsub(); fsSyncUnsub = null; }
  const statusBtn = document.getElementById("sync-status-btn");
  if(statusBtn) statusBtn.textContent = "☁️ Nicht angemeldet";
  const loginForm = document.getElementById("sync-login-form");
  if(loginForm) loginForm.style.display = "block";
  const loggedInBox = document.getElementById("sync-loggedin-box");
  if(loggedInBox) loggedInBox.style.display = "none";
}

// Die komplette Sync-Initialisierung ist bewusst in try/catch gekapselt: geht hier
// irgendetwas schief (z. B. Firebase nicht erreichbar, Konfigurationsfehler), darf
// das NIE die restliche App (Berater, Knotenkunde, …) lahmlegen – die App muss
// immer auch komplett offline/ohne Sync funktionieren.
try {
  if(typeof firebase === "undefined") throw new Error("Firebase-SDK nicht geladen");

  firebase.auth().onAuthStateChanged(user => { user ? fsSyncOnLogin(user) : fsSyncOnLogout(); });

  document.getElementById("sync-status-btn").addEventListener("click", () => {
    document.getElementById("sync-modal").style.display = "flex";
  });
  document.getElementById("sync-modal-close").addEventListener("click", () => {
    document.getElementById("sync-modal").style.display = "none";
  });
  document.getElementById("sync-modal").addEventListener("click", (e) => {
    if(e.target.id === "sync-modal") document.getElementById("sync-modal").style.display = "none";
  });
  document.getElementById("sync-login-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const errEl = document.getElementById("sync-error");
    errEl.style.display = "none";
    const email = document.getElementById("sync-email").value.trim();
    const pass = document.getElementById("sync-pass").value;
    try {
      await firebase.auth().signInWithEmailAndPassword(email, pass);
      document.getElementById("sync-modal").style.display = "none";
    } catch(err){
      errEl.textContent = "Anmeldung fehlgeschlagen: " + err.message;
      errEl.style.display = "block";
    }
  });
  document.getElementById("sync-logout-btn").addEventListener("click", () => { firebase.auth().signOut(); });
} catch(e){
  console.warn("Sync-Initialisierung fehlgeschlagen – App läuft weiter ohne Cloud-Sync:", e);
  const statusBtn = document.getElementById("sync-status-btn");
  if(statusBtn){ statusBtn.textContent = "☁️ Sync nicht verfügbar"; statusBtn.disabled = true; }
}

/* ---------- Dropdowns füllen ---------- */
function initFischDropdown(){
  // nach Typ gruppieren
  const typen = {};
  FISCHE.forEach(f => { (typen[f.typ] ||= []).push(f); });
  Object.keys(typen).forEach(typ => {
    const og = document.createElement("optgroup");
    og.label = typ;
    typen[typ].forEach(f => {
      const o = document.createElement("option");
      o.value = f.id; o.textContent = `${f.emoji}  ${f.name}`;
      og.appendChild(o);
    });
    fischSel.appendChild(og);
  });
}

function fuelleGewaesser(fischId){
  const vorher = gwSel.value;
  gwSel.innerHTML = '<option value="">– bitte wählen –</option>';
  const fisch = FISCHE.find(f => f.id === fischId);
  const keys = fisch ? fisch.gewaesser : Object.keys(GEWAESSER);
  keys.forEach(k => {
    const g = GEWAESSER[k]; if(!g) return;
    const o = document.createElement("option");
    o.value = g.key; o.textContent = `${g.name} (${g.typ})`;
    gwSel.appendChild(o);
  });
  // vorherige Auswahl beibehalten, wenn noch gültig
  if([...gwSel.options].some(o => o.value === vorher)) gwSel.value = vorher;
}

/* ---------- Rendern ---------- */
function rechtHTML(fischId){
  if(typeof RECHT_SH === "undefined") return "";
  const r = RECHT_SH[fischId];
  if(!r) return "";
  return `<div class="recht-box${r.schutz ? " schutz" : ""}">
    <div class="recht-head">⚖️ Schonzeit &amp; Mindestmaß (Schleswig-Holstein)</div>
    <div class="recht-row"><span class="k">Schonzeit</span><span>${r.schonzeit}</span></div>
    <div class="recht-row"><span class="k">Mindestmaß</span><span>${r.mindestmass}</span></div>
    ${r.hinweis ? `<div class="recht-hinweis">${r.hinweis}</div>` : ""}
    <div class="recht-disclaimer">${RECHT_SH_META.disclaimer} <i>(${RECHT_SH_META.stand})</i></div>
  </div>`;
}

function statusLabel(s){
  return s === "machbar" ? "✅ Machbar mit deinem Setup"
       : s === "bedingt" ? "🟡 Bedingt machbar"
       : "❌ Nicht mit aktuellem Gerät";
}

function setupLineHTML(setup){
  const s = AKTUELL[setup];
  if(!s) return "";
  return `<div class="setup-line">
    <span><span class="lbl">Setup</span><b>${s.name}</b></span>
    <span><span class="lbl">Rute</span>${s.rute}</span>
    <span><span class="lbl">Rolle</span>${s.rolle}</span>
    <span><span class="lbl">Schnur</span>${s.schnur}</span>
  </div>`;
}

function montageHTML(montage){
  const glieder = montage.map(m => `
    <div class="glied">
      <span class="dot"></span>
      <span class="g-txt"><span class="g-k">${m.k}</span><br><span class="g-v">${m.v}</span></span>
    </div>`).join("");
  return `<div class="montage"><h4>Montage-Aufbau (von der Rute zum Köder)</h4>
    <div class="chain">${glieder}</div></div>`;
}

// Alle "pflicht"-Positionen aus der Zubehör-Checkliste, dedupliziert – dieselbe
// Quelle (ZUBEHOER_CHECK) und derselbe Speicher (MANUELL) wie im Tab "Zubehör-Check",
// damit ein Häkchen hier auch dort (und umgekehrt) übernommen wird.
function pflichtZubehoerListe(){
  const gesehen = new Set();
  const liste = [];
  ZUBEHOER_CHECK.forEach(k => k.items.forEach(it => {
    if(it.stufe !== "pflicht" || gesehen.has(it.name)) return;
    gesehen.add(it.name);
    liste.push(it);
  }));
  return liste;
}

function packlisteHTML(fisch, ansatz){
  if(!ansatz.setup || !AKTUELL[ansatz.setup]) return ""; // nur packen, was du wirklich besitzt
  const prefix = fisch.id + "__" + ansatz.methode;
  const s = AKTUELL[ansatz.setup];
  const items = [{ key: prefix + "::setup", label: `${s.name} (Rute + Rolle)` }];
  (ansatz.montage || []).forEach(m => items.push({ key: prefix + "::" + m.k, label: `${m.k}: ${m.v}` }));

  const done = items.filter(it => PACKLISTE[it.key]).length;
  const rows = items.map(it => {
    const ok = !!PACKLISTE[it.key];
    return `<div class="pack-item ${ok ? "have manuell" : "miss"} clickable" data-pack="${escAttr(it.key)}" role="button" tabindex="0">
      <span class="chk-box">${ok ? "✅" : "⬜"}</span>
      <div class="chk-txt"><div class="chk-name">${it.label}</div></div>
    </div>`;
  }).join("");

  const bestand = besitzText();
  const pflicht = pflichtZubehoerListe();
  const pflichtOffen = pflicht.filter(it => !(besitztAuto(it, bestand) || MANUELL[it.name] === true)).length;
  const pflichtRows = pflicht.map(it => {
    const auto = besitztAuto(it, bestand);
    const man = MANUELL[it.name] === true;
    const ok = auto || man;
    const cls = auto ? "have auto" : (man ? "have manuell clickable" : "miss clickable");
    const tag = auto ? `<span class="stufe have-tag">aus Inventar</span>` : (man ? `<span class="stufe have-tag">abgehakt ✓</span>` : "");
    return `<div class="chk-item ${cls}" ${auto ? "" : `data-item="${escAttr(it.name)}"`} ${auto ? "" : 'role="button" tabindex="0"'}>
      <span class="chk-box">${ok ? "✅" : "⬜"}</span>
      <div class="chk-txt"><div class="chk-name">${it.name} ${tag}</div></div>
    </div>`;
  }).join("");

  return `<details class="pack-details">
    <summary>🎒 Packliste zum Vorbereiten <span class="pack-count">(${done}/${items.length})</span></summary>
    <div class="chk-list pack-list">${rows}</div>
    <button class="reset-btn" type="button" data-pack-reset="${escAttr(prefix)}">↺ Diese Packliste zurücksetzen</button>
    <div class="pack-subhead">📄 Pflicht-Ausrüstung <span class="pack-count">(${pflicht.length - pflichtOffen}/${pflicht.length})</span></div>
    <p class="pack-subhint">Aus der Zubehör-Checkliste – ein Häkchen gilt überall, auch im Tab „Zubehör-Check".</p>
    <div class="chk-list pack-list">${pflichtRows}</div>
  </details>`;
}

// Klick auf eine Packlisten-Position → abhaken, ohne die ganze Karte neu zu rendern
// (sonst würde ein offenes <details> beim Abhaken sofort wieder zuklappen).
function togglePack(el){
  const key = el.dataset.pack;
  if(PACKLISTE[key]) delete PACKLISTE[key]; else PACKLISTE[key] = true;
  speicherePackliste();
  const ok = !!PACKLISTE[key];
  el.classList.toggle("have", ok);
  el.classList.toggle("manuell", ok);
  el.classList.toggle("miss", !ok);
  el.querySelector(".chk-box").textContent = ok ? "✅" : "⬜";
  const details = el.closest(".pack-details");
  if(details){
    const all = details.querySelectorAll(".pack-item");
    const doneNow = details.querySelectorAll(".pack-item.have").length;
    details.querySelector(".pack-count").textContent = `(${doneNow}/${all.length})`;
  }
}
document.addEventListener("click", (e) => {
  const item = e.target.closest(".pack-item.clickable");
  if(item && item.dataset.pack){ togglePack(item); return; }
  const resetBtn = e.target.closest("[data-pack-reset]");
  if(resetBtn){
    const prefix = resetBtn.dataset.packReset;
    Object.keys(PACKLISTE).forEach(k => { if(k.startsWith(prefix + "::")) delete PACKLISTE[k]; });
    speicherePackliste();
    if(fischSel.value) berechne();
    if(typeof renderWochenende === "function" && document.getElementById("wochenende")) renderWochenende();
  }
});
document.addEventListener("keydown", (e) => {
  if(e.key !== "Enter" && e.key !== " ") return;
  const item = e.target.closest && e.target.closest(".pack-item.clickable");
  if(item && item.dataset.pack){ e.preventDefault(); togglePack(item); }
});

function linksHTML(links){
  if(!links || links.length === 0) return "";
  const items = links.map(l => `<a class="shop-link" href="${l.url}" target="_blank" rel="noopener noreferrer">🔗 ${l.label}</a>`).join("");
  return `<div class="shop-links">${items}</div>`;
}

function getSetupRef(key){
  if(typeof WUNSCH !== "undefined" && WUNSCH[key]) return {w:WUNSCH[key], empf:false};
  if(typeof EMPFEHLUNG !== "undefined" && EMPFEHLUNG.setups && EMPFEHLUNG.setups[key]) return {w:EMPFEHLUNG.setups[key], empf:true};
  return null;
}

function needHTML(braucht){
  const ref = getSetupRef(braucht);
  if(!ref) return "";
  const w = ref.w;
  const titel = ref.empf
    ? "🌟 Dafür empfehle ich (optionale Ergänzung):"
    : "🛒 Dafür brauchst du (aus deiner Wunschliste):";
  let stufen = "";
  if(w.stufen){
    stufen = `<div class="stufen">` + w.stufen.map(s => `
      <div class="stufe-row">
        <div class="stufe-label">${s.label}</div>
        <div class="stufe-detail"><span class="k">Rute</span> ${s.rute}</div>
        <div class="stufe-detail"><span class="k">Rolle</span> ${s.rolle}</div>
        <div class="stufe-detail"><span class="k">Schnur</span> ${s.schnur}</div>
      </div>`).join("") + `</div>`;
  }
  const hinweis = w.hinweis ? `<div class="need-hinweis">${w.hinweis}</div>` : "";
  return `<div class="need${ref.empf ? " need-empf" : ""}">
    <div class="n-title">${titel}</div>
    <div class="n-name"><b>${w.name}</b></div>
    ${stufen || `<table>
      <tr><td class="k">Rute</td><td>${w.rute}</td></tr>
      <tr><td class="k">Rolle</td><td>${w.rolle}</td></tr>
      <tr><td class="k">Schnur</td><td>${w.schnur}</td></tr>
    </table>`}
    <table><tr><td class="k">Dazu</td><td>${w.dazu}</td></tr></table>
    <div class="preis">💶 ${w.preis}</div>
    ${linksHTML(w.links)}
    ${hinweis}
  </div>`;
}

/* Empfohlene Knoten für ein Setup ableiten (nur wenn eigenes Gerät genutzt wird) */
function knotenEmpfehlungHTML(a){
  const s = AKTUELL[a.setup];
  if(!s) return ""; // reines Wunschliste-Setup: keine Knotenempfehlung
  const recs = [];
  const braid = /geflochten|J-Braid/i.test(s.schnur);
  const mono  = /Monofil/i.test(s.schnur);
  const hasStahl = a.montage.some(m => /Stahlvorfach/i.test(m.k));
  const hasVorfach = a.montage.some(m => /Vorfach/i.test(m.k) && /Fluorocarbon|Mono|FC/i.test(m.v));
  const hasWobbler = a.montage.some(m => /Wobbler/i.test(m.v));

  if(braid) recs.push(["palomar","Hauptschnur → Wirbel / Snap / Öhr"]);
  if(mono)  recs.push(["clinch","Hauptschnur → Wirbel / Sbirolino"]);
  if(hasVorfach) recs.push(["clinch","Vorfach → Haken / Köder"]);
  if(braid && hasVorfach && !hasStahl) recs.push(["grinner","Hauptschnur → Vorfach (falls ohne Wirbel)"]);
  if(hasWobbler) recs.push(["rapala","Wobbler direkt anbinden (freies Spiel)"]);

  // Duplikate (gleicher Knoten) zusammenfassen: ersten Verwendungszweck behalten
  const seen = new Set(); const uniq = [];
  recs.forEach(r => { if(!seen.has(r[0])){ seen.add(r[0]); uniq.push(r); } });

  let rows = uniq.map(([id,zweck]) =>
    `<li><button class="knot-link" data-knot="${id}">🪢 ${KNOTEN_KURZ[id]}</button><span>${zweck}</span></li>`
  ).join("");

  let stahlHinweis = hasStahl
    ? `<li class="stahl">🔗 <b>Stahlvorfach Perca:</b> ist fertig mit Einhängern – einfach ein­clipsen, kein Knoten nötig.</li>`
    : "";

  return `<div class="knoten-emp">
    <h4>🪢 Welche Knoten für dieses Setup?</h4>
    <ul>${rows}${stahlHinweis}</ul>
    <p class="k-hint">Tipp für den Anfang: Binde die Schnur einmal an deinen <b>Snap/Karabiner</b> (Palomar) – dann kannst du Köder ohne neues Knoten wechseln.</p>
  </div>`;
}

function ansatzHTML(a, fisch){
  let body = "";
  if(a.status === "machbar" || a.status === "bedingt"){
    body += setupLineHTML(a.setup);
  }
  body += montageHTML(a.montage);
  body += packlisteHTML(fisch, a);
  body += knotenEmpfehlungHTML(a);
  if(a.tipp){
    body += `<div class="tipp"><h4>💡 Tipp</h4><p>${a.tipp}</p></div>`;
  }
  if(a.gezeiten){
    body += `<div class="tipp gezeiten"><h4>🌊 Gezeiten-Hinweis</h4><p>${a.gezeiten}</p></div>`;
  }
  if(a.braucht && (a.status === "wunsch" || a.status === "bedingt")){
    body += needHTML(a.braucht);
  }
  body += fangEintragenHTML(fisch, a.methode);
  return `<article class="ansatz">
    <div class="ansatz-head">
      <span class="badge ${a.status}">${statusLabel(a.status)}</span>
      <span class="m-name">${a.methode}</span>
    </div>
    <div class="ansatz-body">${body}</div>
  </article>`;
}

function fangEintragenHTML(fisch, methode){
  const bisher = FAENGE.catches.filter(f => f.fischId === fisch.id && f.methode === methode).length;
  const uid = "f_" + Math.random().toString(36).slice(2,8);
  const spotOptions = `<option value="">– kein Spot –</option>` +
    FAENGE.spots.map(s => `<option value="${s.id}">${escAttr(s.name)}</option>`).join("");
  return `<div class="fang-box">
    ${bisher > 0 ? `<div class="fang-erfolg">✅ Diese Methode hat bei dir schon <b>${bisher}×</b> geklappt.</div>` : ""}
    <details class="fang-add">
      <summary>🎣 Fang mit dieser Methode eintragen</summary>
      <div class="add-grid">
        <input type="date" id="${uid}-datum" value="${heuteISO()}">
        <select id="${uid}-spot">${spotOptions}</select>
        <select id="${uid}-zeit">
          <option value="">Tageszeit (optional)</option>
          <option value="daemmerung_morgen">Morgendämmerung</option>
          <option value="vormittag">Vormittag</option>
          <option value="mittag">Mittag</option>
          <option value="nachmittag">Nachmittag</option>
          <option value="daemmerung_abend">Abenddämmerung</option>
          <option value="nacht">Nacht</option>
        </select>
        <input id="${uid}-laenge" placeholder="Länge (cm, optional)" inputmode="numeric">
        <input id="${uid}-notiz" placeholder="Notiz (optional)">
      </div>
      <button class="add-btn" data-fang-save="${uid}" data-fisch="${fisch.id}" data-methode="${escAttr(methode)}">Fang speichern</button>
    </details>
  </div>`;
}

document.addEventListener("click", (e) => {
  const btn = e.target.closest("[data-fang-save]");
  if(!btn) return;
  const uid = btn.dataset.fangSave;
  const fischId = btn.dataset.fisch;
  const methode = btn.dataset.methode;
  const fisch = FISCHE.find(f => f.id === fischId);
  const datum = document.getElementById(uid + "-datum").value || heuteISO();
  const spotId = document.getElementById(uid + "-spot").value || null;
  const zeit = document.getElementById(uid + "-zeit").value || null;
  const laenge = document.getElementById(uid + "-laenge").value.trim();
  const notiz = document.getElementById(uid + "-notiz").value.trim();
  FAENGE.catches.push({
    id: genId(), datum, spotId, fischId, fischName: fisch ? fisch.name : fischId,
    methode, gewicht: null, laenge, zeit, weather: null, cost: null, notiz
  });
  speichereFaenge();
  berechne(); // Ansatz-Karte neu rendern → Erfolgszähler aktualisiert sich sofort
  if(typeof renderFaengeTop === "function") renderFaengeTop();
});

function berechne(){
  const fisch = FISCHE.find(f => f.id === fischSel.value);
  const gwKey = gwSel.value;

  if(!fisch){
    ergEl.innerHTML = "";
    hintEl.style.display = "block";
    return;
  }
  hintEl.style.display = "none";

  const gw = GEWAESSER[gwKey];
  // passende Ansätze für dieses Gewässer (oder alle, wenn kein Gewässer gewählt)
  let ansaetze = fisch.ansaetze;
  if(gwKey) ansaetze = ansaetze.filter(a => !a.gewaesser || a.gewaesser.includes(gwKey));

  // Kopf
  let html = `<div class="fisch-head">
    <span class="fe">${fisch.emoji}</span>
    <div>
      <h2>${fisch.name}</h2>
      <div class="meta">${fisch.typ}${gw ? " · " + gw.name : ""}</div>
      <div class="info">${fisch.info}</div>
      ${gw ? `<span class="gw-badge">🌊 ${gw.name}: ${gw.hinweis}</span>` : ""}
    </div>
  </div>`;

  html += rechtHTML(fisch.id);

  if(ansaetze.length === 0){
    html += `<div class="empty">Für <b>${fisch.name}</b> ist am Gewässer <b>${gw ? gw.name : ""}</b> keine passende Methode hinterlegt.
      Wähle ein anderes Gewässer aus der Liste.</div>`;
  } else {
    // sortieren: machbar → bedingt → wunsch
    const rang = {machbar:0, bedingt:1, wunsch:2};
    ansaetze = [...ansaetze].sort((a,b) => rang[a.status] - rang[b.status]);
    html += ansaetze.map(a => ansatzHTML(a, fisch)).join("");
  }

  ergEl.innerHTML = html;
}

/* ---------- Inventar-Ansicht ---------- */
function renderInventar(){
  const el = $("#inventar");
  let html = `<h2>🎒 Mein aktuelles Equipment</h2><div class="inv-grid">`;
  Object.values(AKTUELL).forEach(s => {
    const letzteWartung = WARTUNG[s.key];
    const tage = letzteWartung ? tageSeit(letzteWartung) : null;
    const faellig = tage === null || tage > 180; // > 6 Monate ohne Eintrag = Erinnerung
    html += `<div class="inv-card">
      <h3>${s.name}</h3>
      <div class="row"><span class="k">Rute</span><span>${s.rute}</span></div>
      <div class="row"><span class="k">Rolle</span><span>${s.rolle}</span></div>
      <div class="row"><span class="k">Schnur</span><span>${s.schnur}</span></div>
      <div class="row"><span class="k">Vorfach</span><span>${s.vorfach}</span></div>
      <div class="row"><span class="k">Extra</span><span>${s.extra}</span></div>
      ${s.einsatz ? `<div class="row"><span class="k">Einsatz</span><span>${s.einsatz}</span></div>` : ""}
      ${s.tippKompakt ? `<div class="tipp"><h4>💡 Tipp</h4><p>${s.tippKompakt}</p></div>` : ""}
      <div class="wartung-box${faellig ? " faellig" : ""}">
        <span>🔧 ${letzteWartung ? `Zuletzt gewartet: ${letzteWartung} (vor ${tage} Tagen)` : "Noch keine Wartung eingetragen"}</span>
        <button type="button" class="fs-chip" data-wartung="${s.key}">Heute gewartet</button>
      </div>
    </div>`;
  });
  // eigene Setups
  ZUSATZ.setups.forEach((s,i) => {
    html += `<div class="inv-card eigen">
      <button class="del-btn" data-del="setup" data-idx="${i}" title="Entfernen">🗑</button>
      <h3>${s.name || "Eigenes Setup"} <span class="eigen-tag">selbst hinzugefügt</span></h3>
      ${s.rute ? `<div class="row"><span class="k">Rute</span><span>${s.rute}</span></div>`:""}
      ${s.rolle ? `<div class="row"><span class="k">Rolle</span><span>${s.rolle}</span></div>`:""}
      ${s.schnur ? `<div class="row"><span class="k">Schnur</span><span>${s.schnur}</span></div>`:""}
      ${s.vorfach ? `<div class="row"><span class="k">Vorfach</span><span>${s.vorfach}</span></div>`:""}
      ${s.extra ? `<div class="row"><span class="k">Extra</span><span>${s.extra}</span></div>`:""}
    </div>`;
  });
  html += `</div>`;

  // Formular: eigenes Setup hinzufügen
  html += `<details class="add-setup">
    <summary>➕ Eigenes Setup hinzufügen (Rute/Rolle/…)</summary>
    <div class="add-grid">
      <input id="su-name" placeholder="Name (z. B. Setup 4 – Küste)">
      <input id="su-rute" placeholder="Rute (z. B. Sportex Air Spin Seatrout 3,05 m)">
      <input id="su-rolle" placeholder="Rolle (z. B. Daiwa Fuego LT 4000-C)">
      <input id="su-schnur" placeholder="Schnur (z. B. J-Braid 0,10 mm)">
      <input id="su-vorfach" placeholder="Vorfach (optional)">
      <input id="su-extra" placeholder="Extra / Köder (optional)">
    </div>
    <button id="su-add" class="add-btn">Setup speichern</button>
  </details>`;

  html += `<h2>🧰 Zubehör &amp; Kleinteile</h2><div class="chips">`;
  html += ZUBEHOER.map(z => `<span class="chip">${z}</span>`).join("");
  ZUSATZ.zubehoer.forEach((z,i) => {
    html += `<span class="chip eigen">${z}<button class="del-btn-mini" data-del="zub" data-idx="${i}" title="Entfernen">✕</button></span>`;
  });
  html += `</div>`;
  html += `<div class="add-box">
    <input id="zub-input" placeholder="Neues Zubehör – z. B. Polbrille, Kopflampe …">
    <button id="zub-add" class="add-btn">➕ Hinzufügen</button>
  </div>
  <p class="k-hint">Neu hinzugefügtes Zubehör hakt sich automatisch in der <b>Zubehör-Checkliste</b> ab. Deine Ergänzungen werden im Browser gespeichert.</p>`;

  html += `<h2>🛒 Wunschliste – geplante Setups</h2><div class="inv-grid">`;
  Object.values(WUNSCH).forEach(w => {
    html += `<div class="inv-card wunsch">
      <h3>${w.name}</h3>
      <div class="row"><span class="k">Rute</span><span>${w.rute}</span></div>
      <div class="row"><span class="k">Rolle</span><span>${w.rolle}</span></div>
      <div class="row"><span class="k">Schnur</span><span>${w.schnur}</span></div>
      <div class="row"><span class="k">Dazu</span><span>${w.dazu}</span></div>
      <div class="preis">💶 ${w.preis}</div>
      ${linksHTML(w.links)}
      ${w.hinweis ? `<div class="need-hinweis">${w.hinweis}</div>` : ""}
    </div>`;
  });
  html += `</div>`;

  html += empfehlungHTML();
  el.innerHTML = html;

  // ----- Handler: Zubehör hinzufügen -----
  const zubInput = $("#zub-input"), zubAdd = $("#zub-add");
  function addZub(){
    const v = (zubInput.value || "").trim();
    if(!v) return;
    ZUSATZ.zubehoer.push(v);
    speichereZusatz();
    renderInventar();
    renderCheckliste(); // Checkliste sofort neu abgleichen
  }
  if(zubAdd) zubAdd.addEventListener("click", addZub);
  if(zubInput) zubInput.addEventListener("keydown", e => { if(e.key === "Enter") addZub(); });

  // ----- Handler: Setup hinzufügen -----
  const suAdd = $("#su-add");
  if(suAdd) suAdd.addEventListener("click", () => {
    const g = id => ($("#"+id).value || "").trim();
    const s = { name:g("su-name"), rute:g("su-rute"), rolle:g("su-rolle"), schnur:g("su-schnur"), vorfach:g("su-vorfach"), extra:g("su-extra") };
    if(!s.name && !s.rute && !s.rolle){ return; } // leer -> nichts tun
    ZUSATZ.setups.push(s);
    speichereZusatz();
    renderInventar();
    renderCheckliste();
  });

  // ----- Handler: Entfernen (Setup / Zubehör) -----
  el.querySelectorAll("[data-del]").forEach(btn => {
    btn.addEventListener("click", () => {
      const typ = btn.dataset.del, idx = parseInt(btn.dataset.idx, 10);
      if(typ === "setup") ZUSATZ.setups.splice(idx, 1);
      else if(typ === "zub") ZUSATZ.zubehoer.splice(idx, 1);
      speichereZusatz();
      renderInventar();
      renderCheckliste();
    });
  });

  // ----- Handler: Wartung eintragen -----
  el.querySelectorAll("[data-wartung]").forEach(btn => {
    btn.addEventListener("click", () => {
      WARTUNG[btn.dataset.wartung] = heuteISO();
      speichereWartung();
      renderInventar();
    });
  });
}

function empfehlungHTML(){
  if(typeof EMPFEHLUNG === "undefined") return "";
  const E = EMPFEHLUNG;

  let html = `<div class="empf-banner">
    <h2>💡 Meine Empfehlung <span class="opt">optional – ergänzt deine Liste, ohne sie zu ändern</span></h2>
  </div>`;

  // Kaufreihenfolge
  html += `<div class="empf-card"><h3>📋 Empfohlene Reihenfolge</h3><ol class="empf-order">`;
  html += E.reihenfolge.map(s => `<li>${s}</li>`).join("");
  html += `</ol></div>`;

  // Zusätzliches Setup (Küstenspinnen) – mit konkreten Modellen in 3 Preisstufen
  html += `<h3 class="empf-sub">🎯 Zusätzliches Setup (echte Lücke) – konkrete Modelle</h3>`;
  Object.values(E.setups).forEach(s => {
    let stufen = "";
    if(s.stufen){
      stufen = `<div class="stufen">` + s.stufen.map(st => `
        <div class="stufe-row">
          <div class="stufe-label">${st.label}</div>
          <div class="stufe-detail"><span class="k">Rute</span> ${st.rute}</div>
          <div class="stufe-detail"><span class="k">Rolle</span> ${st.rolle}</div>
          <div class="stufe-detail"><span class="k">Schnur</span> ${st.schnur}</div>
        </div>`).join("") + `</div>`;
    }
    html += `<div class="empf-card">
      <h3>${s.name}</h3>
      <div class="empf-warum" style="margin-top:0;margin-bottom:12px">${s.warum}</div>
      ${stufen}
      <div class="stufe-detail" style="margin-top:10px"><span class="k">Dazu</span> ${s.dazu}</div>
      ${s.hinweis ? `<div class="need-hinweis">${s.hinweis}</div>` : ""}
    </div>`;
  });

  // Zubehör
  html += `<h3 class="empf-sub">🧰 Zubehör, das oft mehr bringt als eine 4. Rute</h3><div class="inv-grid">`;
  E.zubehoer.forEach(z => {
    html += `<div class="inv-card empf">
      <h3>${z.name}</h3>
      <div class="empf-warum">${z.warum}</div>
      <div class="preis">💶 ${z.preis}</div>
    </div>`;
  });
  html += `</div>`;

  // Aufschieben
  html += `<div class="empf-card defer"><h3>⏳ Was ich aufschieben würde</h3><ul>`;
  html += E.aufschieben.map(s => `<li>${s}</li>`).join("");
  html += `</ul></div>`;

  return html;
}

/* ---------- Zubehör-Checkliste ---------- */
// Text aus dem gesamten Bestand (Setups + Zubehör) zum Abgleich
function besitzText(){
  let t = ZUBEHOER.join(" ");
  Object.values(AKTUELL).forEach(s => { t += " " + s.rute + " " + s.rolle + " " + s.schnur + " " + s.vorfach + " " + s.extra; });
  // angeltagebuch.html existiert im Projekt → Fangbuch als vorhanden werten
  t += " angeltagebuch fangbuch";
  // Fischereischein wurde gemacht → als vorhanden werten
  t += " fischereischein";
  // eigene Ergänzungen (Neuzugänge) mit einbeziehen
  ZUSATZ.zubehoer.forEach(z => { t += " " + z; });
  ZUSATZ.setups.forEach(s => { t += " " + [s.name,s.rute,s.rolle,s.schnur,s.vorfach,s.extra].filter(Boolean).join(" "); });
  return t.toLowerCase();
}

function besitztAuto(item, bestand){
  if(!item.match || item.match.length === 0) return false;
  return item.match.some(m => bestand.includes(m.toLowerCase()));
}

// Manuell abgehakte Positionen (im Browser gespeichert)
const MANUAL_KEY = "zubehoer_check_v1";
function ladeManuell(){
  try { return JSON.parse(localStorage.getItem(MANUAL_KEY)) || {}; }
  catch(e){ return {}; }
}
function speichereManuell(obj){
  try { localStorage.setItem(MANUAL_KEY, JSON.stringify(obj)); } catch(e){}
  fsSyncPushDebounced();
}
let MANUELL = ladeManuell();

const STUFE_LABEL = { pflicht:"Pflicht", wichtig:"Wichtig", nice:"Nice-to-have" };

function renderCheckliste(){
  const el = $("#checkliste");
  const bestand = besitzText();

  // Zählung
  let gesamt = 0, haben = 0, fehltPflicht = 0, manuellAnz = 0;
  ZUBEHOER_CHECK.forEach(k => k.items.forEach(it => {
    gesamt++;
    const auto = besitztAuto(it, bestand);
    const man  = MANUELL[it.name] === true;
    if(auto || man){ haben++; if(man && !auto) manuellAnz++; }
    else if(it.stufe === "pflicht") fehltPflicht++;
  }));

  let html = `<div class="k-intro card">
    <h2>🧰 Zubehör-Checkliste</h2>
    <p><b>${haben} von ${gesamt}</b> Positionen hast du schon.
    ${fehltPflicht > 0 ? `<span class="warn-pill">⚠️ ${fehltPflicht} Pflicht-Position(en) fehlen noch</span>` : `<span class="ok-pill">✅ Alle Pflicht-Positionen abgedeckt</span>`}</p>
    <p class="k-hint">👉 <b>Zum Abhaken einfach auf eine Zeile tippen.</b> Deine Haken werden im Browser gespeichert und bleiben erhalten.<br>
    ✅ <b>aus Inventar</b> = automatisch aus deiner Ausrüstung erkannt · ✅ <b>abgehakt</b> = von dir selbst markiert · ⬜ = noch offen.</p>
    ${manuellAnz > 0 ? `<button class="reset-btn" id="resetCheck">↺ Meine Haken zurücksetzen (${manuellAnz})</button>` : ""}
  </div>`;

  ZUBEHOER_CHECK.forEach(k => {
    const rows = k.items.map(it => {
      const auto = besitztAuto(it, bestand);
      const man  = MANUELL[it.name] === true;
      const ok = auto || man;
      const cls = auto ? "have auto" : (man ? "have manuell clickable" : "miss clickable");
      const box = ok ? "✅" : "⬜";
      let tag = "";
      if(auto) tag = `<span class="stufe have-tag">aus Inventar</span>`;
      else if(man) tag = `<span class="stufe have-tag">abgehakt ✓</span>`;
      return `<div class="chk-item ${cls}" ${auto ? "" : `data-item="${it.name.replace(/"/g,'&quot;')}"`} ${auto ? "" : 'role="button" tabindex="0"'}>
        <span class="chk-box">${box}</span>
        <div class="chk-txt">
          <div class="chk-name">${it.name}
            <span class="stufe ${it.stufe}">${STUFE_LABEL[it.stufe]}</span>
            ${tag}
          </div>
          <div class="chk-warum">${it.warum}</div>
        </div>
      </div>`;
    }).join("");
    html += `<div class="chk-cat card">
      <h3>${k.icon} ${k.kategorie}</h3>
      <div class="chk-list">${rows}</div>
    </div>`;
  });

  el.innerHTML = html;

  // Reset-Button
  const rb = document.getElementById("resetCheck");
  if(rb) rb.addEventListener("click", () => { MANUELL = {}; speichereManuell(MANUELL); renderCheckliste(); });
}

// Klick auf eine Position → abhaken / Haken entfernen
function toggleCheck(name){
  if(MANUELL[name]) delete MANUELL[name];
  else MANUELL[name] = true;
  speichereManuell(MANUELL);
  if(document.getElementById("checkliste")) renderCheckliste();
  // Dieselbe Position kann gleichzeitig in einer offenen Packliste stehen (Wochenende/
  // Berater) – dort nicht die ganze Karte neu rendern (würde <details> zuklappen),
  // sondern nur die betroffenen Zeilen optisch nachziehen.
  const ok = MANUELL[name] === true;
  document.querySelectorAll(`.pack-list .chk-item[data-item="${name.replace(/"/g,'\\"')}"]`).forEach(el => {
    el.classList.toggle("have", ok);
    el.classList.toggle("manuell", ok);
    el.classList.toggle("miss", !ok);
    const box = el.querySelector(".chk-box");
    if(box) box.textContent = ok ? "✅" : "⬜";
    const tag = el.querySelector(".have-tag");
    if(tag) tag.textContent = ok ? "abgehakt ✓" : "";
    const details = el.closest(".pack-details");
    if(details){
      const list = details.querySelectorAll(".pack-subhead ~ .pack-list .chk-item");
      const doneNow = details.querySelectorAll(".pack-subhead ~ .pack-list .chk-item.have").length;
      const subCount = details.querySelector(".pack-subhead .pack-count");
      if(subCount) subCount.textContent = `(${doneNow}/${list.length})`;
    }
  });
}
document.addEventListener("click", (e) => {
  const item = e.target.closest(".chk-item.clickable");
  if(item && item.dataset.item) toggleCheck(item.dataset.item);
});
document.addEventListener("keydown", (e) => {
  if(e.key !== "Enter" && e.key !== " ") return;
  const item = e.target.closest && e.target.closest(".chk-item.clickable");
  if(item && item.dataset.item){ e.preventDefault(); toggleCheck(item.dataset.item); }
});

/* ---------- Tages-Check: "Lohnt sich heute?" ---------- */
function jahreszeitVonMonat(m){
  if([12,1,2].includes(m)) return "Winter";
  if([3,4,5].includes(m)) return "Frühling";
  if([6,7,8].includes(m)) return "Sommer";
  return "Herbst";
}

function renderTagescheck(){
  const el = $("#tagescheck");
  const heute = new Date();
  const heuteStr = heute.toISOString().slice(0,10);

  let fischOptions = `<option value="">– allgemein (kein bestimmter Fisch) –</option>`;
  FISCHE.forEach(f => { fischOptions += `<option value="${f.id}">${f.emoji} ${f.name}</option>`; });

  el.innerHTML = `<div class="k-intro card">
    <h2>📅 Lohnt sich heute?</h2>
    <p>Kein Wetterdienst, sondern <b>Erfahrungswissen zum Selbst-Einschätzen</b>: Trag ein, was du gerade siehst/weißt
    (Luftdruck z. B. per Wetter-App oder Barometer), und du bekommst eine Einschätzung <b>mit Begründung</b> – damit du
    nach und nach selbst ein Gefühl dafür entwickelst, statt nur eine Zahl zu bekommen.</p>
  </div>
  <div class="tc-card card">
    <div class="tc-grid">
      <div class="field"><label>Zielfisch</label><select id="tc-fisch">${fischOptions}</select></div>
      <div class="field"><label>Datum</label><input type="date" id="tc-datum" value="${heuteStr}"></div>
      <div class="field"><label>Tageszeit</label><select id="tc-zeit">
        <option value="daemmerung_morgen">Morgendämmerung</option>
        <option value="vormittag">Vormittag</option>
        <option value="mittag">Mittag</option>
        <option value="nachmittag">Nachmittag</option>
        <option value="daemmerung_abend">Abenddämmerung</option>
        <option value="nacht">Nacht</option>
      </select></div>
      <div class="field"><label>Luftdrucktendenz</label><select id="tc-druck">
        <option value="fallend">Fällt gerade (Wetterwechsel im Anzug)</option>
        <option value="stabil">Stabil / weiß ich nicht</option>
        <option value="steigend">Steigt (nach Hoch, Schönwetter)</option>
      </select></div>
      <div class="field"><label>Himmel</label><select id="tc-himmel">
        <option value="bedeckt">Bedeckt / trüb</option>
        <option value="wechselhaft">Wechselhaft</option>
        <option value="klar">Klarer Himmel, Sonne</option>
      </select></div>
      <div class="field"><label>Wind</label><select id="tc-wind">
        <option value="still">Windstill</option>
        <option value="leicht">Leichte Brise</option>
        <option value="kraeftig">Kräftiger Wind</option>
        <option value="sturm">Sturm</option>
      </select></div>
    </div>
  </div>
  <div id="tc-result"></div>`;

  ["tc-fisch","tc-datum","tc-zeit","tc-druck","tc-himmel","tc-wind"].forEach(id => {
    document.getElementById(id).addEventListener("change", tagescheckBerechnen);
  });
  tagescheckBerechnen();
}

function tagescheckBerechnen(){
  const fischId = $("#tc-fisch").value;
  const datumVal = $("#tc-datum").value;
  const datum = datumVal ? new Date(datumVal + "T12:00:00") : new Date();
  const monat = datum.getMonth() + 1;
  const saison = jahreszeitVonMonat(monat);
  const zeit = $("#tc-zeit").value;
  const druck = $("#tc-druck").value;
  const himmel = $("#tc-himmel").value;
  const wind = $("#tc-wind").value;

  const fisch = fischId ? FISCHE.find(f => f.id === fischId) : null;
  const hint = fischId ? (TAGESCHECK_HINT[fischId] || {}) : {};

  let score = 0;
  const gruende = [];

  // Tageszeit
  if(zeit === "daemmerung_morgen" || zeit === "daemmerung_abend"){
    score += 2; gruende.push(["+2","Dämmerung ist für die meisten Fische die aktivste Zeit."]);
  } else if(zeit === "nacht"){
    if(hint.nachtaktiv){ score += 2; gruende.push(["+2","Dein Zielfisch ist nachtaktiv – genau die richtige Zeit."]); }
    else { gruende.push(["±0","Nachts sind nicht alle Fische aktiv – für Dämmerungsjäger wie Aal/Wels/Quappe top, für Tagfische eher schwächer."]); }
  } else if(zeit === "mittag"){
    score -= 1; gruende.push(["−1","Mittags ist bei vollem Licht oft Beißflaute."]);
  } else {
    gruende.push(["±0","Vormittag/Nachmittag ist solide, aber nicht die Prime-Time."]);
  }

  // Luftdruck
  if(druck === "fallend"){ score += 2; gruende.push(["+2","Fallender Luftdruck vor einem Wetterwechsel bringt oft eine Beißphase."]); }
  else if(druck === "steigend"){ score -= 1; gruende.push(["−1","Nach einem Hoch mit steigendem Druck sind Fische oft träger."]); }
  else { score += 1; gruende.push(["+1","Stabile Bedingungen sind meist ordentlich fangbar."]); }

  // Himmel
  if(himmel === "bedeckt"){ score += 1; gruende.push(["+1","Bedeckter Himmel = weniger Schreckreaktion, Fische stehen oft aktiver."]); }
  else if(himmel === "klar"){ score -= 1; gruende.push(["−1","Klarer Himmel & viel Licht drückt bei vielen Fischen die Beißlaune, besonders tagsüber."]); }

  // Wind
  if(wind === "leicht"){ score += 1; gruende.push(["+1","Leichte Brise kräuselt die Oberfläche – Fische werden weniger vorsichtig."]); }
  else if(wind === "kraeftig"){ score -= 1; gruende.push(["−1","Kräftiger Wind erschwert Wurf & Bisserkennung."]); }
  else if(wind === "sturm"){ score -= 2; gruende.push(["−2","Sturm ist eher ein Sicherheitsthema als ein Angeltag."]); }

  // Saison
  if(hint.topSaison && hint.topSaison.includes(saison)){
    score += 2; gruende.push(["+2", `${saison} ist Hauptsaison für diesen Fisch.`]);
  } else if(fischId){
    gruende.push(["±0", `${saison} ist nicht die Hauptsaison für diesen Fisch, schließt einen Fang aber nicht aus.`]);
  }

  let ampel, label;
  if(score >= 5){ ampel = "gruen"; label = "🟢 Richtig gute Bedingungen"; }
  else if(score >= 2){ ampel = "gelb"; label = "🟡 Ok, ein Versuch lohnt sich"; }
  else { ampel = "rot"; label = "🔴 Eher schwierig heute"; }

  const list = gruende.map(([pts,text]) => `<li><span class="tc-pts">${pts}</span> ${text}</li>`).join("");

  $("#tc-result").innerHTML = schonzeitWarnungHTML(fischId, monat) + `<div class="tc-result ${ampel}">
    <div class="tc-label">${label}</div>
    <div class="tc-fisch-name">${fisch ? fisch.emoji + " " + fisch.name : "Allgemein"} · ${saison}</div>
    <ul class="tc-list">${list}</ul>
    <p class="tc-hint">Erfahrungswissen, keine Garantie – aber ein guter Anhaltspunkt für Entscheidungen wie „eher morgens losfahren statt mittags".</p>
  </div>` + tcErfahrungHTML(fischId, zeit, saison);
}

/* Warnt im Tagescheck, wenn der gewählte Fisch am gewählten Datum in der
   gesetzlichen Schonzeit steckt oder besonders geschützt ist – nutzt dieselben
   RECHT_SH-Daten wie die Berater-Anzeige und denselben Monats-Parser wie der
   Saisonkalender (parseSchonzeitMonate), keine doppelte Datenhaltung. */
function schonzeitWarnungHTML(fischId, monat){
  if(!fischId || typeof RECHT_SH === "undefined") return "";
  const r = RECHT_SH[fischId];
  if(!r) return "";

  if(r.schutz){
    return `<div class="schonzeit-warnung"><b>⚠️ Besonderer Schutzstatus:</b> ${r.hinweis || "Für diesen Fisch gelten besondere Schutz-/Fangregeln – vor dem Angeln aktuellen Stand prüfen."}</div>`;
  }
  const monate = parseSchonzeitMonate(r.schonzeit);
  if(monate && monate.includes(monat)){
    return `<div class="schonzeit-warnung"><b>⚠️ Schonzeit am gewählten Datum:</b> ${r.schonzeit} – <b>Entnahme verboten</b>, ein Fang muss schonend zurückgesetzt werden. Mindestmaß: ${r.mindestmass}.</div>`;
  }
  return "";
}

/* Eigene Erfahrung: gleicht die Tagescheck-Einschätzung mit tatsächlich
   eingetragenen Fängen (Tageszeit-Feld) ab – wird über Zeit persönlicher. */
function tcErfahrungHTML(fischId, aktuelleZeit, aktuelleSaison){
  if(!fischId || typeof FAENGE === "undefined") return "";
  const treffer = FAENGE.catches.filter(c => c.fischId === fischId);
  if(treffer.length === 0){
    return `<div class="tc-erfahrung card"><p class="k-hint">Noch keine eigenen Fänge für diesen Fisch eingetragen – trag beim Angeln die Tageszeit mit ein, dann lernt dieser Check aus deinen echten Erfolgen.</p></div>`;
  }
  const zeitLabel = { daemmerung_morgen:"Morgendämmerung", vormittag:"Vormittag", mittag:"Mittag", nachmittag:"Nachmittag", daemmerung_abend:"Abenddämmerung", nacht:"Nacht" };
  const zeitCounts = {};
  treffer.forEach(c => { if(c.zeit) zeitCounts[c.zeit] = (zeitCounts[c.zeit]||0) + 1; });
  const mitZeit = Object.values(zeitCounts).reduce((a,b)=>a+b,0);

  const saisonCounts = {};
  treffer.forEach(c => {
    const m = parseInt((c.datum||"").split("-")[1], 10);
    if(m) { const s = jahreszeitVonMonat(m); saisonCounts[s] = (saisonCounts[s]||0)+1; }
  });
  const topSaisonEntry = Object.entries(saisonCounts).sort((a,b)=>b[1]-a[1])[0];

  let html = `<div class="tc-erfahrung card"><h4>📊 Deine Erfahrung mit diesem Fisch</h4>
    <p><b>${treffer.length}</b> eigene${treffer.length===1?"r Fang":" Fänge"} eingetragen.`;

  if(aktuelleZeit && zeitCounts[aktuelleZeit]){
    html += ` Davon <b>${zeitCounts[aktuelleZeit]}</b> zur gewählten Tageszeit „${zeitLabel[aktuelleZeit]}" – passt zu deiner Auswahl oben.`;
  } else if(aktuelleZeit && mitZeit > 0){
    html += ` Zur gewählten Tageszeit „${zeitLabel[aktuelleZeit]}" hast du bisher noch keinen Fang notiert.`;
  }
  if(topSaisonEntry){
    const passtZurSaison = topSaisonEntry[0] === aktuelleSaison;
    html += ` Die meisten deiner Fänge (${topSaisonEntry[1]}) waren im ${topSaisonEntry[0]}${passtZurSaison ? " – genau wie heute." : "."}`;
  }
  html += `</p>`;

  if(mitZeit > 0){
    const rows = Object.entries(zeitCounts).sort((a,b)=>b[1]-a[1]).map(([z,n]) =>
      `<div class="fs-bar-row"><div class="fs-bar-label"><span>${zeitLabel[z]||z}</span><span>${n}×</span></div>
      <div class="fs-bar-track"><div class="fs-bar-fill" style="width:${(n/mitZeit*100)}%"></div></div></div>`
    ).join("");
    html += rows;
  }
  html += `</div>`;
  return html;
}

/* ---------- Saisonkalender ---------- */
const MONATE_KURZ = ["Jan","Feb","Mär","Apr","Mai","Jun","Jul","Aug","Sep","Okt","Nov","Dez"];
const MONAT_NAME_ZU_NR = {
  januar:1, februar:2, "märz":3, marz:3, april:4, mai:5, juni:6, juli:7,
  august:8, september:9, oktober:10, november:11, dezember:12
};
const SAISON_MONATE = {
  Frühling:[3,4,5], Sommer:[6,7,8], Herbst:[9,10,11], Winter:[12,1,2]
};

/* Parst Texte wie "15. Februar – 30. April" in eine Liste betroffener Monate (1–12).
   Gibt null zurück, wenn kein klarer Zeitraum erkennbar ist (z. B. "keine Schonzeit",
   "jährlich per EU-Quote festgelegt") – dann wird im Kalender nichts schraffiert. */
function parseSchonzeitMonate(text){
  if(!text) return null;
  const re = /(\d{1,2})\.\s*([A-Za-zäöüÄÖÜ]+)/g;
  const treffer = [];
  let m;
  while((m = re.exec(text)) !== null){
    const monatNr = MONAT_NAME_ZU_NR[m[2].toLowerCase()];
    if(monatNr) treffer.push(monatNr);
  }
  if(treffer.length < 2) return null;
  const [start, ende] = treffer;
  const monate = [];
  if(start <= ende){
    for(let x = start; x <= ende; x++) monate.push(x);
  } else {
    for(let x = start; x <= 12; x++) monate.push(x);
    for(let x = 1; x <= ende; x++) monate.push(x);
  }
  return monate;
}

function renderSaison(){
  const el = $("#saison");
  let html = `<div class="k-intro card">
    <h2>📅 Saisonkalender</h2>
    <p>Auf einen Blick: <b>Hauptsaison</b> (🟢 grün) und <b>gesetzliche Schonzeit</b> (🔴 rot schraffiert) pro Fisch.
    Fische ohne markierte Hauptsaison sind ganzjährig ungefähr gleich gut fangbar.</p>
    <p class="k-hint">⚠️ Schonzeiten sind Orientierungswerte (Stand 2026) – vor jedem Angeltag Gewässerordnung/Erlaubnisschein prüfen. Details siehe „Berater"-Tab pro Fisch.</p>
  </div>`;

  html += `<div class="saison-scroll"><table class="saison-table">
    <thead><tr><th class="saison-fisch-col">Fisch</th>${MONATE_KURZ.map(m => `<th>${m}</th>`).join("")}</tr></thead>
    <tbody>`;

  FISCHE.forEach(f => {
    const hint = TAGESCHECK_HINT[f.id] || {};
    const topMonate = new Set();
    (hint.topSaison || []).forEach(saison => (SAISON_MONATE[saison] || []).forEach(m => topMonate.add(m)));

    const recht = RECHT_SH[f.id];
    const schonMonate = new Set(recht ? (parseSchonzeitMonate(recht.schonzeit) || []) : []);

    const zellen = [];
    for(let mo = 1; mo <= 12; mo++){
      const istTop = topMonate.has(mo);
      const istSchon = schonMonate.has(mo);
      let cls = "sm-frei";
      if(istTop && istSchon) cls = "sm-top sm-schon";
      else if(istSchon) cls = "sm-schon";
      else if(istTop) cls = "sm-top";
      zellen.push(`<td class="${cls}"></td>`);
    }

    html += `<tr>
      <td class="saison-fisch-col"><span class="sf-emoji">${f.emoji}</span> ${f.name}${recht && recht.schutz ? ' <span class="sf-schutz" title="Besonders geschützt/gefährdet">⚠️</span>' : ""}</td>
      ${zellen.join("")}
    </tr>`;
  });

  html += `</tbody></table></div>
  <div class="saison-legende">
    <span><span class="sm-swatch sm-top"></span> Hauptsaison</span>
    <span><span class="sm-swatch sm-schon"></span> Schonzeit (nicht entnehmen)</span>
    <span><span class="sm-swatch sm-top sm-schon"></span> Saison, aber geschont</span>
    <span><span class="sm-swatch sm-frei"></span> ganzjährig neutral</span>
  </div>`;

  el.innerHTML = html;
}

/* ================= Fänge & Spots (Karte + Fangbuch, vereint) ================= */
const FS_TYPE_LABEL = { see:"See", fluss:"Fluss", kanal:"Kanal", kueste:"Küste/Meer", forellensee:"Forellensee", teich:"Teich" };
const FS_TYPE_COLOR = { see:"#16a085", fluss:"#2980b9", kanal:"#2c3e50", kueste:"#8e44ad", forellensee:"#e67e22", teich:"#27ae60" };
const FS_REGION_LABEL = { sh:"Schleswig-Holstein", hh:"Hamburg", ni:"Niedersachsen", mv:"Mecklenburg-Vorpommern", dk:"Dänemark" };

let fsMap = null, fsMarkers = {}, fsMapTypeFilters = [], fsFilterAlle = true, fsAddingSpot = false, fsCurrentSpotId = null, fsRating = 0;
let fsOsmLayer = null, fsOsmLoading = false, fsOsmVisible = true;

/* ---------- OSM-Spot-Cache (dauerhaft, im Browser gespeichert) ----------
   Einmal geladene OSM-Angelspots bleiben über Sitzungen hinweg gespeichert –
   kein erneutes Reinzoomen/Nachladen nötig. Neue Kartenausschnitte ergänzen
   den Cache, statt ihn zu ersetzen. */
const OSM_CACHE_KEY = "osm_spots_cache_v1";
function ladeOsmCache(){
  try { const c = JSON.parse(localStorage.getItem(OSM_CACHE_KEY)); return Array.isArray(c) ? c : []; }
  catch(e){ return []; }
}
function speichereOsmCache(){ try { localStorage.setItem(OSM_CACHE_KEY, JSON.stringify(OSM_CACHE)); } catch(e){} fsSyncPushDebounced(); }
let OSM_CACHE = ladeOsmCache();

function fsToast(msg){
  let t = document.getElementById("fs-toast");
  if(!t){
    t = document.createElement("div");
    t.id = "fs-toast"; t.className = "fs-toast";
    document.body.appendChild(t);
  }
  t.textContent = msg;
  t.classList.add("show");
  clearTimeout(fsToast._tm);
  fsToast._tm = setTimeout(() => t.classList.remove("show"), 2200);
}

/* ---------- Sub-Tabs (Karte / Spots / Liste / Statistik) ---------- */
function fsSwitchView(view){
  document.querySelectorAll(".fs-tab").forEach(t => t.classList.toggle("active", t.dataset.fsview === view));
  ["karte","spots","liste","stats","detail"].forEach(v => {
    const el = document.getElementById("fs-view-" + v);
    if(el) el.classList.toggle("active", v === view);
  });
  if(view === "karte"){ fsEnsureMap(); fsInvalidateSizeSoon(); }
  if(view === "spots") fsRenderSpotsList();
  if(view === "liste") fsRenderListe();
  if(view === "stats") fsRenderStats();
}
document.querySelectorAll(".fs-tab").forEach(t => {
  t.addEventListener("click", () => fsSwitchView(t.dataset.fsview));
});

/* Wird vom Haupt-Tab-Handler aufgerufen, sobald der "Fänge & Spots"-Tab geöffnet wird */
function fsOnTabShown(){
  renderFaengeTop();
  const activeSub = document.querySelector(".fs-tab.active");
  fsSwitchView(activeSub ? activeSub.dataset.fsview : "karte");
}

/* ---------- Intro-Karte mit Statistik-Kurzfassung ---------- */
function renderFaengeTop(){
  const el = $("#faenge-top");
  const n = FAENGE.catches.length, s = FAENGE.spots.length;
  el.innerHTML = `<div class="k-intro card">
    <h2>🎣 Fänge &amp; Spots</h2>
    <p>Deine komplette Angel-Historie an einem Ort: <b>${s}</b> Spots auf der Karte, <b>${n}</b> eingetragene Fänge.
    Verknüpfe Fänge optional mit einem Spot (GPS) und/oder einer Methode aus dem Berater.</p>
    <div class="fs-toolbar-mini">
      <button id="fs-export-btn" type="button" class="fs-chip">⬇️ Backup exportieren</button>
      <button id="fs-import-btn" type="button" class="fs-chip">⬆️ Backup importieren</button>
      <input type="file" id="fs-import-file" accept=".json" style="display:none">
    </div>
  </div>`;
  $("#fs-export-btn").addEventListener("click", fsExportData);
  $("#fs-import-btn").addEventListener("click", () => $("#fs-import-file").click());
  $("#fs-import-file").addEventListener("change", fsImportData);
}

/* ---------- Karte ---------- */
function fsEnsureMap(){
  if(fsMap) return;
  fsMap = L.map("fs-map", { zoomControl: true, attributionControl: false }).setView([54.2, 10.0], 8);
  // Hinweis: tile.openstreetmap.org blockiert Anfragen OHNE Referer-Header (403) –
  // genau das passiert bei file:// (Doppelklick auf index.html). Über App-starten.bat
  // (http://localhost) und über die Live-Seite (https://…github.io) wird immer ein
  // echter Referer mitgeschickt, dort funktioniert der Standard-Server einwandfrei.
  // (Wikimedia Maps wurde zwischenzeitlich als Alternative genutzt, blockiert laut
  // eigener Nutzungsrichtlinie inzwischen aber explizit alle fremden Domains außer
  // localhost – deshalb zurück zum Standard-OSM-Server.)
  L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19, attribution: "© OpenStreetMap-Mitwirkende"
  }).addTo(fsMap);
  L.control.attribution({ position: "bottomleft", prefix: false }).addAttribution("© OpenStreetMap-Mitwirkende").addTo(fsMap);
  fsMap.on("click", (e) => {
    if(fsAddingSpot){ fsAddingSpot = false; fsOpenSpotModal(null, e.latlng.lat, e.latlng.lng); }
  });
  fsRenderMarkers();
  $("#fs-add-spot-btn").addEventListener("click", () => { fsAddingSpot = true; fsToast("Tippe auf die Karte, um den Spot zu platzieren"); });

  fsOsmLayer = L.layerGroup().addTo(fsMap);
  fsRenderOsmMarkers(); // zeigt sofort alle schon früher geladenen (gecachten) OSM-Spots
  $("#fs-osm-load-btn").addEventListener("click", fsLoadOsmSpots);
  $("#fs-osm-toggle-btn").addEventListener("click", fsToggleOsmLayer);
  $("#fs-kueste-toggle-btn").addEventListener("click", fsToggleKuesteLayer);
  $("#fs-fluss-toggle-btn").addEventListener("click", fsToggleFlussLayer);

  // #fs-map hat eine dynamische Höhe (75vh) statt fester Pixelmaße. Beim allerersten
  // L.map(...)-Aufruf hat der Browser das Layout evtl. noch nicht fertig berechnet,
  // wodurch Leaflet sich eine falsche (zu kleine) Größe "einfriert" – jeder spätere
  // Zoom rechnet dann mit falschen Kachel-Koordinaten. Ein ResizeObserver allein
  // reicht nicht, weil reines Zoomen die Containergröße gar nicht ändert.
  fsInvalidateSizeSoon();

  // Sicherheitsnetz: vor jedem Zoomvorgang die Größe nochmal bestätigen (günstig,
  // wenn sie schon stimmt) und bei echten Größenänderungen des Containers reagieren.
  fsMap.on("zoomstart", () => fsMap.invalidateSize());
  fsMap.on("zoomend", fsUpdateWaterLabels);
  if(window.ResizeObserver){
    new ResizeObserver(() => fsMap && fsMap.invalidateSize()).observe(document.getElementById("fs-map"));
  }
}

/* Ruft invalidateSize() über mehrere Frames verteilt auf, bis das Layout sicher
   fertig ist – robuster als ein fester setTimeout-Wert. */
function fsInvalidateSizeSoon(){
  let versuche = 0;
  function tick(){
    if(!fsMap) return;
    fsMap.invalidateSize();
    versuche++;
    if(versuche < 6) requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}

/* ---------- OSM-Angelspots (Overpass API) nachladen ---------- */
/* Fluss/Kanal → Linie, See/Teich/Reservoir (und alles ohne genauere Angabe) → Fähnchen. */
function fsOsmKlassifizieren(el){
  if(el.type === "node") return "point";
  const t = el.tags || {};
  if(t.waterway) return "line";
  if(t.water === "river" || t.water === "canal" || t.water === "stream") return "line";
  return "point";
}
function fsOsmCenter(el){
  if(el.lat !== undefined && el.lon !== undefined) return [el.lat, el.lon];
  if(el.center) return [el.center.lat, el.center.lon];
  if(el.bounds) return [(el.bounds.minlat+el.bounds.maxlat)/2, (el.bounds.minlon+el.bounds.maxlon)/2];
  if(el.geometry){
    const g = el.geometry.find(p => p && p.lat !== undefined);
    if(g) return [g.lat, g.lon];
  }
  return null;
}

function fsMakeOsmIcon(){
  return L.divIcon({
    className: "", iconSize: [22,22], iconAnchor: [11,11], popupAnchor: [0,-11],
    html: `<div style="width:18px;height:18px;border-radius:50%;background:#fff;border:3px solid #f2b23a;box-shadow:0 1px 4px rgba(0,0,0,.4)"></div>`
  });
}

function fsOsmPopupHTML(name, lat, lng, schonVorhanden){
  return `
    <div style="font-weight:700;font-size:14px;margin-bottom:6px;color:var(--text)">${escAttr(name)}</div>
    <div style="font-size:12px;color:var(--muted);margin-bottom:8px">Quelle: OpenStreetMap${schonVorhanden ? " · bereits als eigener Spot gespeichert" : ""}</div>
    ${schonVorhanden ? "" : `<button style="background:var(--warn);color:#052018;border:0;border-radius:6px;padding:6px 14px;font-weight:700;cursor:pointer" data-osm-lat="${lat}" data-osm-lng="${lng}" data-osm-name="${escAttr(name)}">+ Als eigenen Spot übernehmen</button>`}
  `;
}

/* Linienförmige Gewässer (Fluss/Kanal): Fähnchen wären hier irreführend (z. B.
   mitten auf der Elbe) – stattdessen der tatsächliche Verlauf als Linie,
   mit Namen, der sich erst beim Reinzoomen einblendet (weniger Kartenlärm). */
let fsOsmLineLayers = [];
function fsAddOsmLine(spot){
  const line = L.polyline(spot.geometry, { color: "#2aa0d8", weight: 4, opacity: .75 }).addTo(fsOsmLayer);
  line.bindTooltip(spot.name, { permanent: true, direction: "center", className: "fs-water-label" });
  fsOsmLineLayers.push(line);
  line.on("click", (e) => {
    const schonVorhanden = FAENGE.spots.some(s => Math.abs(s.lat-e.latlng.lat) < 0.002 && Math.abs(s.lng-e.latlng.lng) < 0.002);
    L.popup().setLatLng(e.latlng).setContent(fsOsmPopupHTML(spot.name, e.latlng.lat, e.latlng.lng, schonVorhanden)).openOn(fsMap);
  });
}
function fsAddOsmPoint(spot){
  const schonVorhanden = FAENGE.spots.some(s => Math.abs(s.lat-spot.lat) < 0.0005 && Math.abs(s.lng-spot.lng) < 0.0005);
  L.marker([spot.lat, spot.lng], { icon: fsMakeOsmIcon() })
    .bindPopup(fsOsmPopupHTML(spot.name, spot.lat, spot.lng, schonVorhanden))
    .addTo(fsOsmLayer);
}
/* Namen von Flüssen/Kanälen nur bei genug Zoom zeigen, sonst wird's zu voll. */
function fsUpdateWaterLabels(){
  if(!fsMap) return;
  const zeigen = fsMap.getZoom() >= 11;
  fsOsmLineLayers.forEach(line => { zeigen ? line.openTooltip() : line.closeTooltip(); });
  fsFlussLineLayers.forEach(line => { zeigen ? line.openTooltip() : line.closeTooltip(); });
}

/* Zeichnet ALLE gecachten OSM-Spots neu (nicht nur die des letzten Ladevorgangs). */
function fsRenderOsmMarkers(){
  if(!fsOsmLayer) return;
  fsOsmLayer.clearLayers();
  fsOsmLineLayers = [];
  OSM_CACHE.forEach(spot => {
    if(spot.kind === "line" && spot.geometry && spot.geometry.length > 1) fsAddOsmLine(spot);
    else fsAddOsmPoint(spot);
  });
  fsUpdateWaterLabels();
}

function fsToggleOsmLayer(){
  fsOsmVisible = !fsOsmVisible;
  if(fsOsmVisible) fsMap.addLayer(fsOsmLayer);
  else fsMap.removeLayer(fsOsmLayer);
  $("#fs-osm-toggle-btn").textContent = fsOsmVisible ? "👁 OSM-Spots ausblenden" : "👁 OSM-Spots einblenden";
}

/* ---------- Freie Küstengewässer (Schleswig-Holstein) ----------
   Rechtsgrundlage: § 2 Abs. 2, § 4 Abs. 2 und Anlage (zu § 1 Abs. 2) LFischG.
   In Küstengewässern gilt freier Fischfang mit der Handangel (nur Fischereischein,
   KEIN Erlaubnisschein) – mit Ausnahme der Bereiche mit eigenständigen
   Fischereirechten (Schlei, Teile Lübecker Bucht, Eidermündung).
   WICHTIG: grob vereinfachte Darstellung, keine amtliche Grenzkarte – selbst das
   Land SH schreibt, es gebe dafür keine allgemeine Übersicht. Vor Ort/Verein
   prüfen, besonders in den markierten Ausnahmezonen! */
let fsKuesteLayer = null, fsKuesteVisible = false;

const FS_KUESTE_ZONEN = [
  {
    name: "Ostsee-Küstengewässer (SH)",
    farbe: "#e85c5c",
    // grob vereinfachtes Polygon entlang der Ostseeküste, KEINE exakte Seegrenze
    punkte: [[54.83,9.90],[54.85,10.50],[54.60,11.30],[54.30,11.50],[53.95,10.95],[53.90,10.50],[54.10,10.00]]
  },
  {
    name: "Nordsee-Küstengewässer / Wattenmeer (SH)",
    farbe: "#e85c5c",
    punkte: [[54.90,8.20],[55.05,8.55],[54.80,8.90],[54.35,8.85],[54.00,8.75],[53.85,8.60],[53.85,8.30],[54.30,8.10]]
  }
];
const FS_KUESTE_POPUP_TEXT = `
  <div style="font-weight:700;font-size:14px;margin-bottom:6px;color:var(--text)">🔴 Freies Küstengewässer (grobe Darstellung)</div>
  <div style="font-size:12.5px;color:var(--text);line-height:1.5;margin-bottom:8px">
    Hier gilt freier Fischfang mit der Handangel – nur <b>Fischereischein</b> nötig,
    <b>kein Erlaubnisschein</b> (§ 4 Abs. 2 LFischG).
  </div>
  <div style="font-size:11.5px;color:var(--warn)">⚠️ Nur grob vereinfachte Fläche, keine amtliche Grenzkarte (die gibt es laut Land SH nicht). Vor Ort/Verein prüfen.</div>
`;

// Flüsse, in die das Küstengewässer per Gesetz hineinreicht (Anlage zu § 1 Abs. 2 LFischG)
const FS_KUESTE_FLUESSE = [
  { name:"Eider", lat:54.273, lng:8.89, text:"Küstengewässer beginnt flussabwärts der Schleuse Nordfeld (Eider-km 78,280). ⚠️ Zwischen Schleuse Nordfeld und der Brücke Tönning gilt aber die Eidermündungs-Ausnahme – dort trotzdem Erlaubnisschein nötig." },
  { name:"Stör", lat:53.924, lng:9.518, text:"Küstengewässer beginnt flussabwärts der Straßenbrücke B 77 in Itzehoe." },
  { name:"Krückau", lat:53.754, lng:9.653, text:"Küstengewässer beginnt flussabwärts der ehemaligen Wassermühle Piening am Mühlendamm in Elmshorn." },
  { name:"Pinnau", lat:53.680, lng:9.667, text:"Küstengewässer beginnt flussabwärts der Straßenbrücke B 431 in Uetersen." },
  { name:"Trave", lat:53.956, lng:10.871, text:"Küstengewässer beginnt an der Verbindungslinie der Köpfe von Süderinnenmole und Norderaußenmole (Travemünde). ⚠️ Teile der Lübecker Bucht bei Travemünde sind trotzdem Erlaubnisschein-pflichtig (eigenständige Fischereirechte)." },
  { name:"Elbe", lat:53.585, lng:9.696, text:"Küstengewässer beginnt an der Landesgrenze Schleswig-Holstein/Hamburg bei Wedel." }
];

// Bereiche mit eigenständigen Fischereirechten – trotz Küstengewässer-Status
// TROTZDEM Erlaubnisschein nötig.
const FS_KUESTE_AUSNAHMEN = [
  { name:"Schlei", lat:54.65, lng:9.85, text:"Die gesamte Schlei unterliegt eigenständigen Fischereirechten – hier ist trotz Küstengewässer-Status ein Erlaubnisschein nötig." },
  { name:"Lübecker Bucht (Teilbereich)", lat:53.96, lng:10.87, text:"Erlaubnisschein-pflichtig von der Gemeindegrenze Timmendorfer Strand/Lübeck bis zur Nordermole Travemünde, sowie vom Priwall-Strand bis zur Landesgrenze Mecklenburg-Vorpommern." },
  { name:"Eidermündung", lat:54.32, lng:8.94, text:"Zwischen Schleuse Nordfeld und der Straßenbrücke Tönning/Karolinenkoog ist trotz Küstengewässer-Status ein Erlaubnisschein nötig." }
];

function fsMakeFlagIcon(farbe){
  return L.divIcon({
    className: "", iconSize: [20,26], iconAnchor: [10,26], popupAnchor: [0,-24],
    html: `<svg width="20" height="26" viewBox="0 0 20 26"><rect x="9" y="0" width="2" height="26" fill="#333"/><path d="M11 2 L20 6 L11 10 Z" fill="${farbe}"/></svg>`
  });
}

function fsBuildKuesteLayer(){
  const layer = L.layerGroup();
  FS_KUESTE_ZONEN.forEach(zone => {
    L.polygon(zone.punkte, { color: zone.farbe, weight: 1.5, fillColor: zone.farbe, fillOpacity: 0.16 })
      .bindPopup(FS_KUESTE_POPUP_TEXT)
      .addTo(layer);
  });
  FS_KUESTE_FLUESSE.forEach(f => {
    L.marker([f.lat, f.lng], { icon: fsMakeFlagIcon("#3ad07a") })
      .bindPopup(`<div style="font-weight:700;font-size:14px;margin-bottom:6px;color:var(--text)">🟢 ${f.name} – Küstengewässer-Grenze</div><div style="font-size:12.5px;color:var(--text);line-height:1.5">${f.text}</div>`)
      .addTo(layer);
  });
  FS_KUESTE_AUSNAHMEN.forEach(a => {
    L.marker([a.lat, a.lng], { icon: fsMakeFlagIcon("#f2b23a") })
      .bindPopup(`<div style="font-weight:700;font-size:14px;margin-bottom:6px;color:var(--text)">⚠️ ${a.name} – Ausnahme</div><div style="font-size:12.5px;color:var(--text);line-height:1.5">${a.text}</div>`)
      .addTo(layer);
  });
  return layer;
}

function fsToggleKuesteLayer(){
  fsKuesteVisible = !fsKuesteVisible;
  if(fsKuesteVisible){
    if(!fsKuesteLayer) fsKuesteLayer = fsBuildKuesteLayer();
    fsMap.addLayer(fsKuesteLayer);
  } else if(fsKuesteLayer){
    fsMap.removeLayer(fsKuesteLayer);
  }
  $("#fs-kueste-toggle-btn").textContent = fsKuesteVisible ? "🔴 Freie Küstengewässer ausblenden" : "🔴 Freie Küstengewässer (SH) anzeigen";
}

// Der öffentliche Overpass-Server ist oft überlastet (429/504) – bei Fehlschlag
// automatisch weitere, unabhängig betriebene Mirrors versuchen.
// Wichtig: osm.ch wurde getestet und wieder verworfen – der Server antwortet zwar
// sehr schnell mit HTTP 200, liefert aber eine leere/kaputte Datenbank (0 Treffer
// selbst für triviale Testabfragen wie Restaurants in Berlin).
// maps.mail.ru liefert im Server-zu-Server-Test zwar echte, korrekte Treffer,
// wird aber vermutlich von vielen Werbe-/Tracker-Blockern und manchen
// Mobilfunknetzen automatisch blockiert (mail.ru ist eine bekannte
// Tracking-Domain) – die Verbindung hängt dann lautlos bis zum Timeout, statt
// sofort einen Fehler zu liefern. Deshalb steht die offizielle, unverdächtige
// overpass-api.de-Domain zuerst; mail.ru und kumi.systems sind nur Fallbacks.
const OVERPASS_MIRRORS = [
  "https://overpass-api.de/api/interpreter",
  "https://maps.mail.ru/osm/tools/overpass/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter"
];
async function fsOverpassFetch(query){
  let res, lastErr;
  for(const url of OVERPASS_MIRRORS){
    // fetch() hat von sich aus KEIN Timeout – nimmt ein Server die Verbindung an,
    // antwortet aber nie, würde ohne AbortController hier ewig "Lade..." stehen.
    const timeoutMs = 12000;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    try {
      res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded", "Accept": "application/json" },
        body: "data=" + encodeURIComponent(query),
        signal: controller.signal
      });
      if(res.ok) break;
      lastErr = new Error("HTTP " + res.status);
    } catch(e){
      lastErr = e.name === "AbortError" ? new Error(`Zeitüberschreitung (${timeoutMs/1000}s)`) : e;
    } finally {
      clearTimeout(timeoutId);
    }
  }
  if(!res || !res.ok) throw lastErr || new Error("Kein Overpass-Server erreichbar");
  return res.json();
}

/* Ermittelt die aktuelle Kartenansicht als Overpass-Bbox-String, automatisch auf
   einen sinnvollen Bereich um die Kartenmitte begrenzt (kein Zoom-Zwang für den User). */
function fsGetClampedBbox(maxSpan){
  fsMap.invalidateSize();
  let b = fsMap.getBounds();
  if(b.getWest() === b.getEast() || b.getSouth() === b.getNorth()) return null;
  let eingegrenzt = false;
  const latSpan = b.getNorth() - b.getSouth(), lngSpan = b.getEast() - b.getWest();
  if(latSpan > maxSpan || lngSpan > maxSpan){
    const c = b.getCenter();
    const halfLat = Math.min(latSpan, maxSpan) / 2, halfLng = Math.min(lngSpan, maxSpan) / 2;
    b = L.latLngBounds([c.lat - halfLat, c.lng - halfLng], [c.lat + halfLat, c.lng + halfLng]);
    eingegrenzt = true;
  }
  return { bbox: `${b.getSouth()},${b.getWest()},${b.getNorth()},${b.getEast()}`, eingegrenzt };
}

async function fsLoadOsmSpots(){
  if(fsOsmLoading) return;
  const status = $("#fs-osm-status");
  fsOsmLoading = true;
  status.textContent = "Lade Angelspots aus OpenStreetMap …";

  const geo = fsGetClampedBbox(2.0); // die water/fishing-Abfrage ist teurer, daher etwas vorsichtiger begrenzt
  if(!geo){
    status.textContent = "Karte konnte gerade nicht korrekt gemessen werden – bitte Tab kurz neu anzeigen und erneut versuchen.";
    fsOsmLoading = false;
    return;
  }
  const { bbox, eingegrenzt } = geo;
  // Zwei Arten, wie Angelspots in OSM markiert sind: (1) ein eigener Punkt mit
  // leisure=fishing, (2) viel häufiger in Deutschland – das Gewässer selbst
  // (See/Fluss/Teich) trägt direkt ein fishing=*-Tag (yes/permit/customers/…).
  // Die zweite Variante liefert deutlich mehr Treffer.
  const query = `[out:json][timeout:25];(
    node["leisure"="fishing"](${bbox});
    way["leisure"="fishing"](${bbox});
    node["sport"="fishing"](${bbox});
    node["natural"="water"]["fishing"](${bbox});
    way["natural"="water"]["fishing"](${bbox});
    relation["natural"="water"]["fishing"](${bbox});
    way["water"]["fishing"](${bbox});
    way["waterway"~"river|canal|stream"]["fishing"](${bbox});
  );out geom;`;

  try {
    const data = await fsOverpassFetch(query);

    // Neue Treffer in den dauerhaften Cache einfügen (per OSM-ID dedupliziert,
    // bereits bekannte Spots bleiben unangetastet). Flüsse/Kanäle bekommen ihre
    // volle Linien-Geometrie, alles andere einen einzelnen Punkt.
    const bekannteIds = new Set(OSM_CACHE.map(s => s.osmKey));
    let neu = 0;
    data.elements.forEach(el => {
      const osmKey = el.type + el.id;
      if(bekannteIds.has(osmKey)) return;
      const name = (el.tags && el.tags.name) || "Angelspot (unbenannt)";
      const kind = fsOsmKlassifizieren(el);

      let entry = null;
      if(kind === "line" && el.geometry && el.geometry.length > 1){
        const geometry = el.geometry.filter(g => g && g.lat !== undefined).map(g => [g.lat, g.lon]);
        if(geometry.length > 1){
          const mid = geometry[Math.floor(geometry.length/2)];
          entry = { osmKey, kind: "line", name, geometry, lat: mid[0], lng: mid[1] };
        }
      }
      if(!entry){
        const center = fsOsmCenter(el);
        if(!center) return;
        entry = { osmKey, kind: "point", name, lat: center[0], lng: center[1] };
      }
      OSM_CACHE.push(entry);
      bekannteIds.add(osmKey);
      neu++;
    });
    speichereOsmCache();
    fsRenderOsmMarkers();
    if(!fsOsmVisible) fsToggleOsmLayer(); // beim Nachladen automatisch wieder einblenden

    const eingrenzungsHinweis = eingegrenzt ? " (Ausschnitt automatisch auf einen Bereich um die Kartenmitte begrenzt – für mehr Fläche einfach nochmal an anderer Stelle klicken.)" : "";
    status.innerHTML = (neu > 0
      ? `✅ <b>${neu}</b> neue Angelspots hinzugefügt (insgesamt <b>${OSM_CACHE.length}</b> OSM-Spots gespeichert – Seen/Teiche als gelb-weiße Fähnchen, Flüsse/Kanäle als blaue Linie).`
      : `Keine neuen OSM-Angelspots in diesem Ausschnitt (insgesamt schon <b>${OSM_CACHE.length}</b> gespeichert).`) + eingrenzungsHinweis;
  } catch(err){
    status.textContent = "OSM-Spots konnten nicht geladen werden (Internetverbindung prüfen). " + err.message;
  } finally {
    fsOsmLoading = false;
  }
}

/* ---------- Flussnamen (allgemeiner Kartenkontext, unabhängig von Angelspots) ----------
   Beschriftet ALLE Flüsse/Kanäle im sichtbaren Bereich mit Namen (nicht nur die
   speziell als Angelspot getaggten) – reiner Orientierungs-Layer. */
const FLUSS_CACHE_KEY = "fluss_namen_cache_v1";
function ladeFlussCache(){
  try { const c = JSON.parse(localStorage.getItem(FLUSS_CACHE_KEY)); return Array.isArray(c) ? c : []; }
  catch(e){ return []; }
}
function speichereFlussCache(){ try { localStorage.setItem(FLUSS_CACHE_KEY, JSON.stringify(FLUSS_CACHE)); } catch(e){} fsSyncPushDebounced(); }
let FLUSS_CACHE = ladeFlussCache();
let fsFlussLayer = null, fsFlussVisible = false, fsFlussLoading = false;

let fsFlussLineLayers = [];
function fsRenderFlussnamen(){
  if(!fsFlussLayer) return;
  fsFlussLayer.clearLayers();
  fsFlussLineLayers = [];
  FLUSS_CACHE.forEach(fluss => {
    if(!fluss.geometry || fluss.geometry.length < 2) return;
    const line = L.polyline(fluss.geometry, { color: "#7fa8bd", weight: 3, opacity: .6, dashArray: "2 6" }).addTo(fsFlussLayer);
    line.bindTooltip(fluss.name, { permanent: true, direction: "center", className: "fs-water-label fs-water-label-neutral" });
    fsFlussLineLayers.push(line);
  });
  fsUpdateWaterLabels();
}

async function fsLoadFlussnamen(){
  if(fsFlussLoading) return;
  const status = $("#fs-osm-status");
  fsFlussLoading = true;
  status.textContent = "Lade Flussnamen aus OpenStreetMap …";

  const geo = fsGetClampedBbox(2.5);
  if(!geo){
    status.textContent = "Karte konnte gerade nicht korrekt gemessen werden – bitte Tab kurz neu anzeigen und erneut versuchen.";
    fsFlussLoading = false;
    return;
  }
  const { bbox, eingegrenzt } = geo;
  const query = `[out:json][timeout:25];(
    way["waterway"~"river|canal|stream"]["name"](${bbox});
  );out geom;`;

  try {
    const data = await fsOverpassFetch(query);
    const bekannteIds = new Set(FLUSS_CACHE.map(f => f.osmKey));
    let neu = 0;
    data.elements.forEach(el => {
      const osmKey = el.type + el.id;
      if(bekannteIds.has(osmKey)) return;
      if(!el.tags || !el.tags.name || !el.geometry || el.geometry.length < 2) return;
      const geometry = el.geometry.filter(g => g && g.lat !== undefined).map(g => [g.lat, g.lon]);
      if(geometry.length < 2) return;
      FLUSS_CACHE.push({ osmKey, name: el.tags.name, geometry });
      bekannteIds.add(osmKey);
      neu++;
    });
    speichereFlussCache();
    fsRenderFlussnamen();
    const eingrenzungsHinweis = eingegrenzt ? " (Ausschnitt automatisch begrenzt – für mehr Fläche nochmal an anderer Stelle klicken.)" : "";
    status.innerHTML = (neu > 0
      ? `✅ <b>${neu}</b> neue Flussnamen hinzugefügt (insgesamt <b>${FLUSS_CACHE.length}</b> gespeichert – beim Reinzoomen sichtbar).`
      : `Keine neuen Flussnamen in diesem Ausschnitt (insgesamt schon <b>${FLUSS_CACHE.length}</b> gespeichert).`) + eingrenzungsHinweis;
  } catch(err){
    status.textContent = "Flussnamen konnten nicht geladen werden (Internetverbindung prüfen). " + err.message;
  } finally {
    fsFlussLoading = false;
  }
}

async function fsToggleFlussLayer(){
  if(fsFlussVisible){
    fsFlussVisible = false;
    if(fsFlussLayer) fsMap.removeLayer(fsFlussLayer);
    $("#fs-fluss-toggle-btn").textContent = "🌊 Flussnamen laden/zeigen";
    return;
  }
  if(!fsFlussLayer) fsFlussLayer = L.layerGroup();
  fsFlussVisible = true;
  fsMap.addLayer(fsFlussLayer);
  $("#fs-fluss-toggle-btn").textContent = "🌊 Flussnamen ausblenden";
  fsRenderFlussnamen(); // sofort anzeigen, was schon gecacht ist
  await fsLoadFlussnamen(); // und für den aktuellen Ausschnitt nachladen
}

document.addEventListener("click", (e) => {
  const btn = e.target.closest("[data-osm-lat]");
  if(!btn) return;
  const { osmLat, osmLng, osmName } = btn.dataset;
  fsMap.closePopup();
  fsOpenSpotModal(null, parseFloat(osmLat), parseFloat(osmLng));
  $("#fss-name").value = osmName === "Angelspot (unbenannt)" ? "" : osmName;
});

function fsMakeIcon(type){
  const color = FS_TYPE_COLOR[type] || "#2c3e50";
  return L.divIcon({
    className: "", iconSize: [28,40], iconAnchor: [14,40], popupAnchor: [0,-36],
    html: `<svg width="28" height="40" viewBox="0 0 30 42"><path d="M15 0C6.7 0 0 6.7 0 15c0 10.5 15 27 15 27s15-16.5 15-27C30 6.7 23.3 0 15 0z" fill="${color}"/><circle cx="15" cy="14" r="7" fill="#fff"/></svg>`
  });
}

function fsRenderMarkers(){
  if(!fsMap) return;
  Object.values(fsMarkers).forEach(m => fsMap.removeLayer(m));
  fsMarkers = {};
  FAENGE.spots.forEach(spot => {
    if(!fsFilterAlle && !fsMapTypeFilters.includes(spot.type)) return;
    const catchCount = FAENGE.catches.filter(c => c.spotId === spot.id).length;
    const stars = spot.rating ? "★".repeat(spot.rating) + "☆".repeat(5 - spot.rating) : "";
    const m = L.marker([spot.lat, spot.lng], { icon: fsMakeIcon(spot.type) })
      .bindPopup(`
        <div style="font-weight:700;font-size:14px;margin-bottom:2px;color:var(--text)">${escAttr(spot.name)}</div>
        <div style="font-size:12px;color:var(--muted);margin-bottom:6px">${FS_TYPE_LABEL[spot.type]||spot.type}${spot.price ? " · " + spot.price + "€" : ""}</div>
        ${stars ? `<div style="color:var(--warn);margin-bottom:6px">${stars}</div>` : ""}
        <div style="font-size:12px;color:var(--muted);margin-bottom:10px">${catchCount === 1 ? "1 Fang" : catchCount + " Fänge"}</div>
        <button style="background:var(--accent);color:#052018;border:0;border-radius:6px;padding:6px 14px;font-weight:700;cursor:pointer" data-fs-detail="${spot.id}">Details</button>
      `)
      .addTo(fsMap);
    fsMarkers[spot.id] = m;
  });
  fsRenderMapFilterBar();
}
document.addEventListener("click", (e) => {
  const btn = e.target.closest("[data-fs-detail]");
  if(btn){ fsMap && fsMap.closePopup(); fsOpenSpotDetail(btn.dataset.fsDetail); }
});

function fsRenderMapFilterBar(){
  const types = [...new Set(FAENGE.spots.map(s => s.type))].sort();
  let html = `<button type="button" class="map-filter-chip${fsFilterAlle ? " active" : ""}" data-fs-alle="1">Alle</button>`;
  html += types.map(t =>
    `<button type="button" class="map-filter-chip${(!fsFilterAlle && fsMapTypeFilters.includes(t)) ? " active" : ""}" data-fs-typefilter="${t}">${FS_TYPE_LABEL[t]||t}</button>`
  ).join("");
  $("#fs-map-filter").innerHTML = html;

  $("#fs-map-filter [data-fs-alle]").addEventListener("click", () => {
    fsFilterAlle = true;
    fsMapTypeFilters = [];
    fsRenderMarkers();
  });
  $("#fs-map-filter").querySelectorAll("[data-fs-typefilter]").forEach(btn => {
    btn.addEventListener("click", () => {
      const t = btn.dataset.fsTypefilter;
      fsFilterAlle = false;
      fsMapTypeFilters = fsMapTypeFilters.includes(t) ? fsMapTypeFilters.filter(x => x !== t) : [...fsMapTypeFilters, t];
      fsRenderMarkers();
    });
  });
}

/* ---------- Spot-Formular ---------- */
function fsOpenSpotModal(spotId, lat, lng){
  const form = $("#fs-spot-form");
  form.reset();
  fsRating = 0; fsUpdateRatingUI();
  $("#fss-delete").style.display = "none";
  $("#fss-id").value = "";
  $("#fss-lat").value = ""; $("#fss-lng").value = "";
  $("#fss-lat-display").value = ""; $("#fss-lng-display").value = "";

  if(spotId){
    const s = FAENGE.spots.find(x => x.id === spotId);
    if(!s) return;
    $("#fs-spot-title").textContent = "Spot bearbeiten";
    $("#fss-delete").style.display = "";
    $("#fss-id").value = s.id;
    $("#fss-name").value = s.name;
    $("#fss-type").value = s.type;
    $("#fss-region").value = s.region || "sh";
    $("#fss-price").value = s.price || "";
    $("#fss-notes").value = s.notes || "";
    $("#fss-lat").value = s.lat; $("#fss-lng").value = s.lng;
    $("#fss-lat-display").value = s.lat; $("#fss-lng-display").value = s.lng;
    fsRating = s.rating || 0; fsUpdateRatingUI();
  } else {
    $("#fs-spot-title").textContent = "Neuer Spot";
    if(lat !== undefined){
      $("#fss-lat").value = lat.toFixed(6); $("#fss-lng").value = lng.toFixed(6);
      $("#fss-lat-display").value = lat.toFixed(6); $("#fss-lng-display").value = lng.toFixed(6);
    }
  }
  $("#fs-spot-modal").style.display = "flex";
}
function fsCloseSpotModal(){ $("#fs-spot-modal").style.display = "none"; }
$("#fs-spot-close").addEventListener("click", fsCloseSpotModal);
$("#fs-spot-modal").addEventListener("click", (e) => { if(e.target.id === "fs-spot-modal") fsCloseSpotModal(); });

$("#fss-rating").querySelectorAll("span").forEach(s => {
  s.addEventListener("click", () => { fsRating = parseInt(s.dataset.val, 10); fsUpdateRatingUI(); });
});
function fsUpdateRatingUI(){
  $("#fss-rating").querySelectorAll("span").forEach(s => s.classList.toggle("active", parseInt(s.dataset.val,10) <= fsRating));
}

$("#fss-gps").addEventListener("click", () => {
  if(!navigator.geolocation){ fsToast("GPS nicht verfügbar"); return; }
  fsToast("GPS-Position wird ermittelt …");
  navigator.geolocation.getCurrentPosition(
    pos => {
      const { latitude, longitude } = pos.coords;
      $("#fss-lat").value = latitude.toFixed(6); $("#fss-lng").value = longitude.toFixed(6);
      $("#fss-lat-display").value = latitude.toFixed(6); $("#fss-lng-display").value = longitude.toFixed(6);
      fsToast("GPS-Position übernommen");
    },
    err => fsToast("GPS-Fehler: " + err.message),
    { enableHighAccuracy: true, timeout: 10000 }
  );
});

$("#fs-spot-form").addEventListener("submit", (e) => {
  e.preventDefault();
  const id = $("#fss-id").value;
  const lat = parseFloat($("#fss-lat").value), lng = parseFloat($("#fss-lng").value);
  if(isNaN(lat) || isNaN(lng)){ fsToast("Bitte Position setzen (Karte klicken oder GPS)"); return; }
  const spotData = {
    id: id || genId(),
    name: $("#fss-name").value.trim(),
    type: $("#fss-type").value,
    region: $("#fss-region").value,
    price: parseFloat($("#fss-price").value) || 0,
    notes: $("#fss-notes").value.trim(),
    rating: fsRating,
    visited: id ? (FAENGE.spots.find(s => s.id === id) || {}).visited || false : false,
    lat, lng,
    created: id ? (FAENGE.spots.find(s => s.id === id) || {}).created || new Date().toISOString() : new Date().toISOString()
  };
  if(id){
    const idx = FAENGE.spots.findIndex(s => s.id === id);
    if(idx >= 0) FAENGE.spots[idx] = spotData;
  } else {
    FAENGE.spots.push(spotData);
  }
  speichereFaenge();
  fsRenderMarkers();
  fsCloseSpotModal();
  fsToast(id ? "Spot aktualisiert" : "Spot gespeichert");
  renderFaengeTop();
});

$("#fss-delete").addEventListener("click", () => {
  const id = $("#fss-id").value;
  if(!id) return;
  if(!confirm("Spot löschen? Zugehörige Fänge bleiben erhalten, verlieren aber den Spot-Bezug.")) return;
  FAENGE.spots = FAENGE.spots.filter(s => s.id !== id);
  FAENGE.catches.forEach(c => { if(c.spotId === id) c.spotId = null; });
  speichereFaenge();
  fsRenderMarkers();
  fsCloseSpotModal();
  fsToast("Spot gelöscht");
  renderFaengeTop();
});

/* ---------- Spot-Liste ---------- */
function fsRenderSpotsList(){
  const el = $("#fs-view-spots");
  if(FAENGE.spots.length === 0){
    el.innerHTML = `<div class="empty">Noch keine Spots. Wechsle zur Karte und tippe auf „Spot hinzufügen".</div>`;
    return;
  }
  const sorted = [...FAENGE.spots].sort((a,b) => (b.rating||0) - (a.rating||0));
  let html = `<div class="fs-spot-grid">`;
  sorted.forEach(s => {
    const catchCount = FAENGE.catches.filter(c => c.spotId === s.id).length;
    const stars = s.rating ? "★".repeat(s.rating) + "☆".repeat(5-s.rating) : "";
    html += `<div class="fs-spot-card card" data-fs-open="${s.id}">
      <div class="fs-spot-card-head">
        <h3>${s.name}${s.visited ? ' <span class="ok-pill">✓ besucht</span>' : ""}</h3>
        <span class="fs-chip" style="border-color:${FS_TYPE_COLOR[s.type]||"#295064"}">${FS_TYPE_LABEL[s.type]||s.type}</span>
      </div>
      <div class="fang-meta">${FS_REGION_LABEL[s.region]||""} · ${catchCount === 1 ? "1 Fang" : catchCount + " Fänge"}${s.price ? " · " + s.price.toFixed(2)+"€" : ""}</div>
      ${stars ? `<div class="fs-stars">${stars}</div>` : ""}
    </div>`;
  });
  html += `</div>`;
  el.innerHTML = html;
  el.querySelectorAll("[data-fs-open]").forEach(card => {
    card.addEventListener("click", () => fsOpenSpotDetail(card.dataset.fsOpen));
  });
}

/* ---------- Spot-Detail ---------- */
function fsOpenSpotDetail(spotId){
  fsCurrentSpotId = spotId;
  const s = FAENGE.spots.find(x => x.id === spotId);
  if(!s) return;
  const catches = FAENGE.catches.filter(c => c.spotId === spotId).sort((a,b) => b.datum.localeCompare(a.datum));
  const stars = s.rating ? "★".repeat(s.rating) + "☆".repeat(5-s.rating) : "";
  const totalCost = catches.reduce((sum,c) => sum + (c.cost||0), 0);

  let html = `<button type="button" class="fs-chip" id="fs-detail-back">← Zurück</button>
  <div class="card fs-detail-head">
    <h2>${s.name}</h2>
    <div class="fang-meta">${FS_TYPE_LABEL[s.type]||s.type} · ${FS_REGION_LABEL[s.region]||""}${s.price ? " · " + s.price.toFixed(2) + "€ Tageskarte" : ""}</div>
    ${stars ? `<div class="fs-stars">${stars}</div>` : ""}
    ${s.notes ? `<div class="fang-notiz">${linkifySimple(s.notes)}</div>` : ""}
    <div class="fang-meta">📍 ${s.lat.toFixed(4)}, ${s.lng.toFixed(4)}</div>
    <div class="fs-detail-actions">
      <button type="button" class="add-btn" id="fs-detail-edit">✎ Bearbeiten</button>
      <button type="button" class="add-btn" id="fs-detail-visited">${s.visited ? "↩️ Unbesucht" : "✓ Besucht"}</button>
      <button type="button" class="add-btn" id="fs-detail-maps">🗺️ Navigation</button>
      <button type="button" class="add-btn" id="fs-detail-addcatch">+ Fang</button>
    </div>
  </div>
  <h3 class="empf-sub">Fänge hier (${catches.length})${totalCost>0?` · ${totalCost.toFixed(2)}€`:""}</h3>`;

  if(catches.length === 0){
    html += `<div class="empty">Noch keine Fänge an diesem Spot.</div>`;
  } else {
    html += `<div class="fang-liste">`;
    catches.forEach(c => {
      html += `<div class="fang-eintrag two-btns card">
        <button class="del-btn" data-fs-del-catch="${c.id}" title="Entfernen">🗑</button>
        <button class="del-btn" style="right:46px" data-fs-edit-catch="${c.id}" title="Bearbeiten">✎</button>
        ${c.foto ? `<img class="fang-foto" src="${c.foto}" alt="Foto vom Fang">` : ""}
        <div class="fang-titel">🐟 ${c.fischName}${c.gewicht ? " · " + c.gewicht + " kg" : ""}${c.laenge ? " · " + c.laenge + " cm" : ""}</div>
        <div class="fang-meta">${c.datum}${c.methode ? " · " + c.methode : ""}${c.cost ? " · " + c.cost.toFixed(2) + "€" : ""}</div>
        ${c.notiz ? `<div class="fang-notiz">${c.notiz}</div>` : ""}
      </div>`;
    });
    html += `</div>`;
  }

  $("#fs-view-detail").innerHTML = html;
  fsSwitchView("detail");

  $("#fs-detail-back").addEventListener("click", () => fsSwitchView("spots"));
  $("#fs-detail-edit").addEventListener("click", () => fsOpenSpotModal(s.id));
  $("#fs-detail-maps").addEventListener("click", () => window.open(`https://maps.google.com/?q=${s.lat},${s.lng}`, "_blank"));
  $("#fs-detail-addcatch").addEventListener("click", () => fsOpenCatchModal(null, s.id));
  $("#fs-detail-visited").addEventListener("click", () => {
    s.visited = !s.visited; speichereFaenge(); fsRenderMarkers(); fsOpenSpotDetail(s.id);
  });
  $("#fs-view-detail").querySelectorAll("[data-fs-del-catch]").forEach(btn => {
    btn.addEventListener("click", () => {
      if(!confirm("Fang löschen?")) return;
      FAENGE.catches = FAENGE.catches.filter(c => c.id !== btn.dataset.fsDelCatch);
      speichereFaenge(); fsOpenSpotDetail(spotId); renderFaengeTop();
    });
  });
  $("#fs-view-detail").querySelectorAll("[data-fs-edit-catch]").forEach(btn => {
    btn.addEventListener("click", () => fsOpenCatchModal(btn.dataset.fsEditCatch, spotId));
  });
}
function linkifySimple(text){
  const escaped = escAttr(text);
  const re = /((?:https?:\/\/)?(?:www\.)?[a-z0-9](?:[a-z0-9-]*[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)*\.(?:de|com|net|org|eu|info|shop|at|ch|uk|nl|dk|io)(?:\/[^\s"'<>]*)?)/gi;
  return escaped.replace(re, m => `<a href="${/^https?:\/\//i.test(m)?m:"https://"+m}" target="_blank" rel="noopener noreferrer">${m}</a>`);
}

/* ---------- Fang-Formular ---------- */
// Foto wird NUR lokal gespeichert (kein Cloud-Sync für Bilder – der Sync-Speicher
// ist ein einzelnes Firestore-Dokument mit 1MB-Limit, das mit Fotos sofort platzen
// würde). Vor dem Speichern wird jedes Bild client-seitig stark verkleinert
// (Canvas, max. 480px, JPEG ~60%), damit es im localStorage nicht aus dem Ruder läuft.
let fscFotoDataUrl = null;

function fsResizeBild(file, maxDim, callback){
  const reader = new FileReader();
  reader.onload = (e) => {
    const img = new Image();
    img.onload = () => {
      let { width, height } = img;
      if(width > height && width > maxDim){ height = Math.round(height * maxDim / width); width = maxDim; }
      else if(height > maxDim){ width = Math.round(width * maxDim / height); height = maxDim; }
      const canvas = document.createElement("canvas");
      canvas.width = width; canvas.height = height;
      canvas.getContext("2d").drawImage(img, 0, 0, width, height);
      callback(canvas.toDataURL("image/jpeg", 0.6));
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
}

function fsZeigeFotoPreview(dataUrl){
  fscFotoDataUrl = dataUrl;
  const wrap = $("#fsc-foto-preview-wrap");
  if(dataUrl){
    $("#fsc-foto-preview").src = dataUrl;
    wrap.style.display = "flex";
  } else {
    wrap.style.display = "none";
    $("#fsc-foto-preview").src = "";
  }
}
$("#fsc-foto").addEventListener("change", (e) => {
  const file = e.target.files[0];
  if(!file) return;
  fsResizeBild(file, 480, fsZeigeFotoPreview);
});
$("#fsc-foto-remove").addEventListener("click", () => {
  $("#fsc-foto").value = "";
  fsZeigeFotoPreview(null);
});

function fsOpenCatchModal(catchId, spotId){
  const form = $("#fs-catch-form");
  form.reset();
  $("#fsc-datum").value = heuteISO();
  $("#fsc-delete").style.display = "none";
  $("#fsc-id").value = "";
  fsZeigeFotoPreview(null);

  const spotOptions = `<option value="">– kein Spot –</option>` +
    FAENGE.spots.map(s => `<option value="${s.id}">${escAttr(s.name)}</option>`).join("");
  $("#fsc-spot").innerHTML = spotOptions;
  if(spotId) $("#fsc-spot").value = spotId;

  $("#fs-fisch-list").innerHTML = FISCHE.map(f => `<option value="${f.name}">`).join("");

  if(catchId){
    const c = FAENGE.catches.find(x => x.id === catchId);
    if(!c) return;
    $("#fs-catch-title").textContent = "Fang bearbeiten";
    $("#fsc-delete").style.display = "";
    $("#fsc-id").value = c.id;
    $("#fsc-datum").value = c.datum;
    $("#fsc-spot").value = c.spotId || "";
    $("#fsc-fischname").value = c.fischName || "";
    $("#fsc-methode").value = c.methode || "";
    $("#fsc-gewicht").value = c.gewicht || "";
    $("#fsc-laenge").value = c.laenge || "";
    $("#fsc-zeit").value = c.zeit || "";
    $("#fsc-notiz").value = c.notiz || "";
    if(c.foto) fsZeigeFotoPreview(c.foto);
  } else {
    $("#fs-catch-title").textContent = "Fang eintragen";
  }
  $("#fs-catch-modal").style.display = "flex";
}
function fsCloseCatchModal(){ $("#fs-catch-modal").style.display = "none"; }
$("#fs-catch-close").addEventListener("click", fsCloseCatchModal);
$("#fs-catch-modal").addEventListener("click", (e) => { if(e.target.id === "fs-catch-modal") fsCloseCatchModal(); });

$("#fs-catch-form").addEventListener("submit", (e) => {
  e.preventDefault();
  const id = $("#fsc-id").value;
  const fischName = $("#fsc-fischname").value.trim();
  const fisch = FISCHE.find(f => f.name.toLowerCase() === fischName.toLowerCase());
  const catchData = {
    id: id || genId(),
    datum: $("#fsc-datum").value || heuteISO(),
    spotId: $("#fsc-spot").value || null,
    fischId: fisch ? fisch.id : null,
    fischName,
    methode: $("#fsc-methode").value.trim() || null,
    gewicht: parseFloat($("#fsc-gewicht").value) || null,
    laenge: $("#fsc-laenge").value.trim() || null,
    zeit: $("#fsc-zeit").value || null,
    weather: null, cost: null,
    notiz: $("#fsc-notiz").value.trim(),
    foto: fscFotoDataUrl || null
  };
  if(id){
    const idx = FAENGE.catches.findIndex(c => c.id === id);
    if(idx >= 0) FAENGE.catches[idx] = catchData;
  } else {
    FAENGE.catches.push(catchData);
  }
  speichereFaenge();
  fsRenderMarkers();
  fsCloseCatchModal();
  fsToast(id ? "Fang aktualisiert" : "Fang gespeichert");
  renderFaengeTop();
  if(catchData.spotId && document.getElementById("fs-view-detail").classList.contains("active")) fsOpenSpotDetail(catchData.spotId);
  else if(document.querySelector(".fs-tab.active")?.dataset.fsview === "liste") fsRenderListe();
});

$("#fsc-delete").addEventListener("click", () => {
  const id = $("#fsc-id").value;
  if(!id || !confirm("Fang löschen?")) return;
  FAENGE.catches = FAENGE.catches.filter(c => c.id !== id);
  speichereFaenge();
  fsCloseCatchModal();
  renderFaengeTop();
  fsRenderListe();
});

/* ---------- Fänge-Liste (alle, unabhängig vom Spot) ---------- */
function fsRenderListe(){
  const el = $("#fs-view-liste");
  let html = `<div style="margin-bottom:14px"><button type="button" class="add-btn" id="fs-liste-add">+ Fang eintragen</button></div>`;
  if(FAENGE.catches.length === 0){
    html += `<div class="empty">Noch keine Fänge eingetragen.</div>`;
    el.innerHTML = html;
    $("#fs-liste-add").addEventListener("click", () => fsOpenCatchModal(null, null));
    return;
  }
  const sorted = [...FAENGE.catches].sort((a,b) => (b.datum||"").localeCompare(a.datum||""));
  html += `<div class="fang-liste">`;
  sorted.forEach(c => {
    const spot = c.spotId ? FAENGE.spots.find(s => s.id === c.spotId) : null;
    html += `<div class="fang-eintrag card" data-fs-edit-catch="${c.id}" style="cursor:pointer">
      <button class="del-btn" data-fs-del-catch="${c.id}" title="Entfernen">🗑</button>
      ${c.foto ? `<img class="fang-foto" src="${c.foto}" alt="Foto vom Fang">` : ""}
      <div class="fang-titel">🐟 ${c.fischName}${c.gewicht ? " · " + c.gewicht + " kg" : ""}${c.laenge ? " · " + c.laenge + " cm" : ""}</div>
      <div class="fang-meta">${c.datum}${c.methode ? " · " + c.methode : ""}${spot ? " · 📍 " + spot.name : ""}</div>
      ${c.notiz ? `<div class="fang-notiz">${c.notiz}</div>` : ""}
    </div>`;
  });
  html += `</div>`;
  el.innerHTML = html;

  $("#fs-liste-add").addEventListener("click", () => fsOpenCatchModal(null, null));
  el.querySelectorAll("[data-fs-edit-catch]").forEach(card => {
    card.addEventListener("click", (e) => {
      if(e.target.closest("[data-fs-del-catch]")) return;
      fsOpenCatchModal(card.dataset.fsEditCatch, null);
    });
  });
  el.querySelectorAll("[data-fs-del-catch]").forEach(btn => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      if(!confirm("Fang löschen?")) return;
      FAENGE.catches = FAENGE.catches.filter(c => c.id !== btn.dataset.fsDelCatch);
      speichereFaenge(); renderFaengeTop(); fsRenderListe();
    });
  });
}

/* ---------- Statistik ---------- */
function fsRenderStats(){
  const el = $("#fs-view-stats");
  const totalSpots = FAENGE.spots.length, totalCatches = FAENGE.catches.length;
  const totalWeight = FAENGE.catches.reduce((s,c) => s + (c.gewicht||0), 0);

  const fishCounts = {};
  FAENGE.catches.forEach(c => { fishCounts[c.fischName] = (fishCounts[c.fischName]||0)+1; });
  const topFish = Object.entries(fishCounts).sort((a,b)=>b[1]-a[1]).slice(0,5);

  const spotStats = FAENGE.spots.map(s => ({
    name: s.name, count: FAENGE.catches.filter(c => c.spotId === s.id).length, rating: s.rating
  })).filter(s => s.count > 0).sort((a,b) => b.count - a.count);

  // Persönliche Bestleistung je Fischart: größter Fang nach Gewicht, sonst nach Länge
  const pbByFish = {};
  FAENGE.catches.forEach(c => {
    const gewicht = parseFloat(c.gewicht) || 0;
    const laenge = parseFloat(c.laenge) || 0;
    if(!gewicht && !laenge) return;
    const bisher = pbByFish[c.fischName];
    const besser = !bisher || (gewicht && gewicht > (parseFloat(bisher.gewicht)||0)) ||
      (!gewicht && !bisher.gewicht && laenge > (parseFloat(bisher.laenge)||0));
    if(besser) pbByFish[c.fischName] = c;
  });
  const pbListe = Object.entries(pbByFish).sort((a,b) => (parseFloat(b[1].gewicht)||parseFloat(b[1].laenge)||0) - (parseFloat(a[1].gewicht)||parseFloat(a[1].laenge)||0));

  // Erfolgreichste Methode (nur Fänge mit eingetragener Methode)
  const methodeCounts = {};
  FAENGE.catches.forEach(c => { if(c.methode) methodeCounts[c.methode] = (methodeCounts[c.methode]||0)+1; });
  const topMethoden = Object.entries(methodeCounts).sort((a,b)=>b[1]-a[1]).slice(0,5);
  const catchesMitMethode = Object.values(methodeCounts).reduce((a,b)=>a+b,0);

  // Bester Monat (über alle Jahre zusammengefasst, unabhängig vom Fisch)
  const MONATSNAMEN = ["Januar","Februar","März","April","Mai","Juni","Juli","August","September","Oktober","November","Dezember"];
  const monatCounts = {};
  FAENGE.catches.forEach(c => {
    const m = parseInt((c.datum||"").split("-")[1], 10);
    if(m) monatCounts[m] = (monatCounts[m]||0)+1;
  });
  const topMonate = Object.entries(monatCounts).sort((a,b)=>b[1]-a[1]).slice(0,6);
  const catchesMitDatum = Object.values(monatCounts).reduce((a,b)=>a+b,0);

  let html = `<div class="stat-grid">
    <div class="stat-card card"><div class="stat-value">${totalSpots}</div><div class="stat-label">Spots</div></div>
    <div class="stat-card card"><div class="stat-value">${totalCatches}</div><div class="stat-label">Fänge</div></div>
    <div class="stat-card card"><div class="stat-value">${totalWeight.toFixed(1)} kg</div><div class="stat-label">Gesamtgewicht</div></div>
    ${spotStats.length > 0 ? `<div class="stat-card card"><div class="stat-value">🏅</div><div class="stat-label">${spotStats[0].name}<br><span class="stat-sub">bester Spot · ${spotStats[0].count} Fänge</span></div></div>` : ""}
    ${topMethoden.length > 0 ? `<div class="stat-card card"><div class="stat-value">🎣</div><div class="stat-label">${topMethoden[0][0]}<br><span class="stat-sub">beste Methode · ${topMethoden[0][1]}×</span></div></div>` : ""}
    ${topMonate.length > 0 ? `<div class="stat-card card"><div class="stat-value">📅</div><div class="stat-label">${MONATSNAMEN[topMonate[0][0]-1]}<br><span class="stat-sub">bester Monat · ${topMonate[0][1]}×</span></div></div>` : ""}
  </div>`;

  if(topFish.length > 0){
    html += `<div class="card fs-stats-block"><h3>Top Fischarten</h3>`;
    topFish.forEach(([fish,count]) => {
      const pct = totalCatches>0 ? (count/totalCatches*100) : 0;
      html += `<div class="fs-bar-row">
        <div class="fs-bar-label"><span>${fish}</span><span>${count}×</span></div>
        <div class="fs-bar-track"><div class="fs-bar-fill" style="width:${pct}%"></div></div>
      </div>`;
    });
    html += `</div>`;
  }
  if(topMethoden.length > 0){
    html += `<div class="card fs-stats-block"><h3>🎣 Erfolgreichste Methoden</h3>`;
    topMethoden.forEach(([methode,count]) => {
      const pct = catchesMitMethode>0 ? (count/catchesMitMethode*100) : 0;
      html += `<div class="fs-bar-row">
        <div class="fs-bar-label"><span>${methode}</span><span>${count}×</span></div>
        <div class="fs-bar-track"><div class="fs-bar-fill" style="width:${pct}%"></div></div>
      </div>`;
    });
    html += `</div>`;
  }
  if(topMonate.length > 0){
    html += `<div class="card fs-stats-block"><h3>📅 Beste Monate</h3>`;
    topMonate.forEach(([monat,count]) => {
      const pct = catchesMitDatum>0 ? (count/catchesMitDatum*100) : 0;
      html += `<div class="fs-bar-row">
        <div class="fs-bar-label"><span>${MONATSNAMEN[monat-1]}</span><span>${count}×</span></div>
        <div class="fs-bar-track"><div class="fs-bar-fill" style="width:${pct}%"></div></div>
      </div>`;
    });
    html += `</div>`;
  }
  if(pbListe.length > 0){
    html += `<div class="card fs-stats-block"><h3>🏆 Persönliche Bestleistungen</h3>`;
    pbListe.forEach(([fisch,c]) => {
      const masse = [c.gewicht ? c.gewicht+" kg" : null, c.laenge ? c.laenge+" cm" : null].filter(Boolean).join(" · ");
      const spot = c.spotId ? FAENGE.spots.find(s => s.id === c.spotId) : null;
      html += `<div class="row"><span>${fisch}${spot ? " · 📍 "+spot.name : ""}</span><span><b>${masse}</b> · ${c.datum}</span></div>`;
    });
    html += `</div>`;
  }
  if(spotStats.length > 0){
    html += `<div class="card fs-stats-block"><h3>Spots nach Fängen</h3>`;
    spotStats.slice(0,8).forEach(s => {
      html += `<div class="row"><span>${s.name}${s.rating?" "+"★".repeat(s.rating):""}</span><span>${s.count} Fänge</span></div>`;
    });
    html += `</div>`;
  }
  if(totalSpots === 0) html = `<div class="empty">Füge deinen ersten Spot auf der Karte hinzu, um Statistiken zu sehen.</div>`;
  el.innerHTML = html;
}

/* ---------- Export / Import (Backup) ---------- */
function fsExportData(){
  const blob = new Blob([JSON.stringify(FAENGE, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = "faenge_spots_" + heuteISO() + ".json"; a.click();
  URL.revokeObjectURL(url);
  fsToast("Backup heruntergeladen");
}
function fsImportData(e){
  const file = e.target.files[0];
  if(!file) return;
  const reader = new FileReader();
  reader.onload = (ev) => {
    try {
      const imported = JSON.parse(ev.target.result);
      // Akzeptiert sowohl das neue Format {spots,catches} als auch den alten
      // Angeltagebuch-Export (gleiche Struktur, englische Feldnamen bei catches)
      if(!Array.isArray(imported.spots) || !Array.isArray(imported.catches)) throw new Error("Ungültiges Format");
      if(!confirm(`${imported.spots.length} Spots und ${imported.catches.length} Fänge gefunden. Vorhandene Daten werden ERSETZT. Fortfahren?`)) return;
      const spots = imported.spots.map(s => ({
        id: s.id || genId(), name: s.name, type: s.type || "see", region: s.region || "sh",
        lat: s.lat, lng: s.lng, price: s.price || 0, notes: s.notes || "",
        rating: s.rating || 0, visited: !!s.visited, created: s.created || new Date().toISOString()
      }));
      const catches = imported.catches.map(c => ({
        id: c.id || genId(), datum: c.datum || c.date || heuteISO(), spotId: c.spotId || null,
        fischId: c.fischId || null, fischName: c.fischName || c.fish || "Fisch",
        methode: c.methode || c.method || null, gewicht: c.gewicht ?? c.weight ?? null,
        laenge: c.laenge ?? c.length ?? null, weather: c.weather || null, cost: c.cost || null,
        notiz: c.notiz || c.notes || ""
      }));
      FAENGE = { spots, catches };
      speichereFaenge();
      fsRenderMarkers(); renderFaengeTop();
      fsToast("Import erfolgreich");
    } catch(err){ fsToast("Fehler: Ungültige Datei"); }
  };
  reader.readAsText(file);
  e.target.value = "";
}

/* ---------- Knotenkunde-Ansicht ---------- */
function sterne(n){ return "★".repeat(n) + "☆".repeat(3 - n); }

function renderKnoten(){
  const el = $("#knoten");
  let html = `<div class="k-intro card">
    <h2>🪢 Knotenkunde für Einsteiger</h2>
    <p>Mit diesen <b>vier Knoten</b> deckst du <b>alle</b> deine aktuellen Setups ab – so einfach wie möglich, so sicher wie nötig. Im Berater steht bei jedem Setup dabei, welcher Knoten wofür.</p>
    <div class="regeln">`;
  KNOTEN_REGELN.forEach(r => {
    html += `<div class="regel"><span class="r-ico">${r.icon}</span><div><b>${r.titel}</b><p>${r.text}</p></div></div>`;
  });
  html += `</div></div>`;

  KNOTEN.forEach(k => {
    const steps = k.schritte.map((s,i) => `<li>${s}</li>`).join("");
    html += `<article class="knoten-card card" id="knoten-${k.id}">
      <div class="k-head">
        <h3>${k.name}</h3>
        <span class="k-niveau">${k.niveau} · <span class="k-stars">${sterne(k.sterne)}</span></span>
      </div>
      <div class="k-wofuer"><b>Wofür:</b> ${k.wofuer}</div>
      <div class="k-svg">${k.svg}</div>
      <div class="k-warum">${k.warum}</div>
      <h4>Schritt für Schritt</h4>
      <ol class="k-steps">${steps}</ol>
      <div class="k-sicher">🛡️ <b>Sicherheit:</b> ${k.sicher}</div>
    </article>`;
  });
  el.innerHTML = html;
}

/* ---------- Wochenend-Planer ----------
   Zeigt vordefinierte Vorhaben (data.js: VORHABEN) – aufklappen zeigt Setup,
   Montage und eine abhakbare Packliste, aus denselben Ansätzen wie im Berater
   (ansatzHTML wird 1:1 wiederverwendet, keine doppelte Logik). ---------- */
let wochenendeOffenId = null;
function renderWochenende(){
  const el = document.getElementById("wochenende");
  if(!el) return;

  let html = `<div class="k-intro card">
    <h2>🎒 Trip-Planung</h2>
    <p>Wähl aus, was du vorhast – egal ob am Wochenende oder unter der Woche. Du bekommst das passende Setup, die Montage und eine abhakbare Packliste zum Vorbereiten. So kannst du zu Hause alles fertig machen und vor Ort direkt loslegen.</p>
  </div>`;

  html += VORHABEN.map(v => {
    const offen = wochenendeOffenId === v.id;
    let inner = "";
    if(offen){
      inner = v.einsaetze.map(e => {
        const fisch = FISCHE.find(f => f.id === e.fischId);
        const ansatz = fisch && fisch.ansaetze.find(a => a.methode === e.methode);
        if(!fisch || !ansatz) return "";
        return `<div class="vorhaben-fisch-tag">${fisch.emoji} ${fisch.name}</div>` + ansatzHTML(ansatz, fisch);
      }).join("");
      inner += `<button type="button" class="add-btn" data-tagescheck="${v.einsaetze[0].fischId}">📅 Lohnt sich das gerade? Genauer prüfen</button>`;
    }
    return `<article class="vorhaben card">
      <button type="button" class="vorhaben-head" data-vorhaben="${v.id}">
        <span class="ve">${v.emoji}</span>
        <div class="vorhaben-txt">
          <h3>${v.name}</h3>
          <p class="vorhaben-desc">${v.beschreibung}</p>
          ${vorhabenSaisonBadgeHTML(v)}
        </div>
        <span class="vorhaben-chevron">${offen ? "▾" : "▸"}</span>
      </button>
      ${offen ? `<div class="vorhaben-body">${inner}</div>` : ""}
    </article>`;
  }).join("");

  el.innerHTML = html;
}
document.addEventListener("click", (e) => {
  const btn = e.target.closest("[data-vorhaben]");
  if(!btn) return;
  const id = btn.dataset.vorhaben;
  wochenendeOffenId = wochenendeOffenId === id ? null : id;
  renderWochenende();
  if(wochenendeOffenId){
    requestAnimationFrame(() => {
      const card = document.querySelector(`[data-vorhaben="${id}"]`);
      if(card) card.scrollIntoView({behavior:"smooth", block:"start"});
    });
  }
});

/* Zu einem Knoten springen (aus dem Berater heraus) */
function zeigeKnoten(id){
  document.querySelectorAll(".tab").forEach(x => x.classList.remove("active"));
  document.querySelectorAll(".view").forEach(v => v.classList.remove("active"));
  document.querySelector('.tab[data-view="knoten"]').classList.add("active");
  $("#view-knoten").classList.add("active");
  const target = document.getElementById("knoten-" + id);
  if(target){ target.scrollIntoView({behavior:"smooth", block:"start"}); target.classList.add("flash"); setTimeout(()=>target.classList.remove("flash"), 1500); }
}
document.addEventListener("click", (e) => {
  const btn = e.target.closest(".knot-link");
  if(btn) zeigeKnoten(btn.dataset.knot);
});

/* Zum "Lohnt sich heute?"-Check springen, mit vorausgewähltem Zielfisch
   (aus der Trip-Planung heraus). Der Tagescheck selbst braucht Wetter-Eingaben
   (Luftdruck/Himmel/Wind), die sich nicht automatisch ermitteln lassen – daher
   kein stiller Score auf der Trip-Karte, sondern direkter Sprung zum vollen Check. */
function zeigeTagescheck(fischId){
  document.querySelectorAll(".tab").forEach(x => x.classList.remove("active"));
  document.querySelectorAll(".view").forEach(v => v.classList.remove("active"));
  document.querySelector('.tab[data-view="tagescheck"]').classList.add("active");
  $("#view-tagescheck").classList.add("active");
  const sel = document.getElementById("tc-fisch");
  if(sel && fischId){ sel.value = fischId; tagescheckBerechnen(); }
  $("#view-tagescheck").scrollIntoView({behavior:"smooth", block:"start"});
}
document.addEventListener("click", (e) => {
  const btn = e.target.closest("[data-tagescheck]");
  if(btn) zeigeTagescheck(btn.dataset.tagescheck);
});

/* Automatische, eingabefreie Saison-Einschätzung für eine Trip-Karte (Kopfzeile,
   auch ohne Aufklappen sichtbar) – nutzt dieselben TAGESCHECK_HINT-Daten wie der
   volle Tagescheck, aber nur den saisonalen Teil (kein Wetter nötig). */
function vorhabenSaisonBadgeHTML(vorhaben){
  const saisonJetzt = jahreszeitVonMonat(new Date().getMonth() + 1);
  const hints = vorhaben.einsaetze.map(e => TAGESCHECK_HINT[e.fischId]).filter(Boolean);
  const hatTopSaison = hints.some(h => h.topSaison);
  if(!hatTopSaison) return `<span class="saison-badge neutral">⚪ Ganzjährig fangbar</span>`;
  const inSaison = hints.some(h => h.topSaison && h.topSaison.includes(saisonJetzt));
  return inSaison
    ? `<span class="saison-badge gut">🟢 ${saisonJetzt} ist Hauptsaison</span>`
    : `<span class="saison-badge neutral">⚪ Gerade nicht Hauptsaison (${saisonJetzt})</span>`;
}

/* ---------- Tabs ---------- */
document.querySelectorAll(".tab").forEach(t => {
  t.addEventListener("click", () => {
    document.querySelectorAll(".tab").forEach(x => x.classList.remove("active"));
    document.querySelectorAll(".view").forEach(v => v.classList.remove("active"));
    t.classList.add("active");
    $("#view-" + t.dataset.view).classList.add("active");
    if(t.dataset.view === "faenge") fsOnTabShown();
  });
});

/* ---------- Events ---------- */
fischSel.addEventListener("change", () => { fuelleGewaesser(fischSel.value); berechne(); });
gwSel.addEventListener("change", berechne);
$("#losButton").addEventListener("click", berechne);

/* ---------- Init ---------- */
initFischDropdown();
renderInventar();
renderKnoten();
renderCheckliste();
renderTagescheck();
renderFaengeTop();
renderSaison();
renderWochenende();
