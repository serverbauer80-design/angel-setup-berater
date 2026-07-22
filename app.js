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

/* Einmalige Migration: Setup 4/5/6/7 wurden umnummeriert (Stippruten in eigene
   Gruppe verschoben, Rest rutscht nach: alt4->neu7, alt5->neu4, alt6->neu5,
   alt7->neu6). Wartungsdaten sind unter dem alten setup.key gespeichert und
   müssen einmalig mitwandern, sonst zeigt die App das Wartungsdatum am
   falschen (neuen) Setup an. Flag verhindert mehrfaches/falsches Verschieben
   bei jedem künftigen Laden. */
(function migriereSetupNummerierungV1(){
  const FLAG = "setup_renumber_v1_done";
  if(localStorage.getItem(FLAG)) return;
  const mapping = { setup4:"setup7", setup5:"setup4", setup6:"setup5", setup7:"setup6" };
  if(Object.keys(WARTUNG).some(k => mapping[k])){
    const neu = {};
    Object.keys(WARTUNG).forEach(k => { neu[mapping[k] || k] = WARTUNG[k]; });
    WARTUNG = neu;
    speichereWartung();
  }
  try { localStorage.setItem(FLAG, "1"); } catch(e){}
})();
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
  if(typeof renderUnterlagen === "function") renderUnterlagen();

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
  if(typeof renderUnterlagen === "function") renderUnterlagen();
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
    ${montageDiagramHTML(montage)}
    <div class="chain">${glieder}</div></div>`;
}

/* ---------- Montage-Diagramm-Illustrationen ---------- */
function detectMontagenTyp(montage){
  const t = montage.map(m => m.k + " " + m.v).join(" ").toLowerCase();
  if(t.includes("sbirolino")) return "sbirolino";
  if(t.includes("dropshot")) return "dropshot";
  if(t.includes("paternoster")) return "paternoster";
  if(t.includes("pilker")) return "pilker";
  if(t.includes("schlagschnur") || t.includes("krallenblei")) return "brandung";
  if(t.includes("futterkorb")) return "feeder";
  if(t.includes("feste vorfachschnur")) return "stippe";
  if(t.includes("stahlvorfach") && t.includes("pose")) return "pose-stahl";
  if(t.includes("laufpose")) return "laufpose";
  if(t.includes("laufblei")) return "laufblei";
  if(t.includes("jigkopf")) return "jigkopf";
  return null;
}

function montageDiagramHTML(montage){
  const typ = detectMontagenTyp(montage);
  if(!typ) return "";

  const SVG = {
    jigkopf: `<svg viewBox="0 0 560 148" xmlns="http://www.w3.org/2000/svg" width="100%" aria-label="Jigkopf-Montage">
      <rect x="6" y="64" width="36" height="10" rx="3" fill="#8ab0c0"/>
      <polygon points="6,60 6,78 0,69" fill="#8ab0c0"/>
      <line x1="42" y1="69" x2="192" y2="69" stroke="#33c3a6" stroke-width="3"/>
      <rect x="192" y="62" width="14" height="14" rx="3" fill="#8ab0c0"/>
      <line x1="206" y1="69" x2="360" y2="69" stroke="#d4a84b" stroke-width="2.5" stroke-dasharray="6,3"/>
      <circle cx="372" cy="69" r="11" fill="#8ab0c0"/>
      <path d="M372 80 Q373 103 390 105 Q408 105 408 90" fill="none" stroke="#8ab0c0" stroke-width="3"/>
      <line x1="406" y1="93" x2="412" y2="100" stroke="#8ab0c0" stroke-width="2"/>
      <path d="M372 69 C394 53 428 53 458 67 C486 79 508 75 530 67 C546 61 554 64 560 67" fill="none" stroke="#33c3a6" stroke-width="5" stroke-linecap="round"/>
      <path d="M557 65 L568 56 M557 67 L568 75" fill="none" stroke="#33c3a6" stroke-width="3" stroke-linecap="round"/>
      <text x="114" y="53" text-anchor="middle" fill="#9db6c4" font-size="10" font-family="sans-serif">Braid</text>
      <text x="281" y="53" text-anchor="middle" fill="#9db6c4" font-size="10" font-family="sans-serif">FC-Vorfach</text>
      <text x="470" y="53" text-anchor="middle" fill="#9db6c4" font-size="10" font-family="sans-serif">Gummifisch</text>
      <text x="199" y="90" text-anchor="middle" fill="#9db6c4" font-size="9" font-family="sans-serif">Wirbel</text>
      <text x="372" y="126" text-anchor="middle" fill="#9db6c4" font-size="9" font-family="sans-serif">Jigkopf + Haken</text>
    </svg>`,

    dropshot: `<svg viewBox="0 0 420 224" xmlns="http://www.w3.org/2000/svg" width="100%" aria-label="Dropshot-Montage">
      <rect x="6" y="46" width="36" height="10" rx="3" fill="#8ab0c0"/>
      <polygon points="6,42 6,60 0,51" fill="#8ab0c0"/>
      <line x1="42" y1="51" x2="174" y2="51" stroke="#33c3a6" stroke-width="3"/>
      <rect x="174" y="44" width="14" height="14" rx="3" fill="#8ab0c0"/>
      <line x1="181" y1="58" x2="181" y2="200" stroke="#d4a84b" stroke-width="2.5" stroke-dasharray="5,3"/>
      <circle cx="181" cy="118" r="5" fill="#d4a84b"/>
      <line x1="181" y1="118" x2="232" y2="118" stroke="#d4a84b" stroke-width="2"/>
      <path d="M232 111 Q233 135 250 137 Q268 137 268 122" fill="none" stroke="#8ab0c0" stroke-width="3"/>
      <line x1="266" y1="125" x2="272" y2="132" stroke="#8ab0c0" stroke-width="2"/>
      <path d="M228 105 C244 94 264 94 274 104" fill="none" stroke="#33c3a6" stroke-width="5" stroke-linecap="round"/>
      <path d="M272 102 L280 96 M272 104 L280 110" fill="none" stroke="#33c3a6" stroke-width="2.5" stroke-linecap="round"/>
      <line x1="176" y1="118" x2="176" y2="198" stroke="#9db6c4" stroke-width="1" stroke-dasharray="2,3"/>
      <ellipse cx="181" cy="210" rx="10" ry="13" fill="#5a7d8e"/>
      <text x="105" y="36" text-anchor="middle" fill="#9db6c4" font-size="10" font-family="sans-serif">Braid</text>
      <text x="181" y="36" text-anchor="middle" fill="#9db6c4" font-size="9" font-family="sans-serif">Wirbel</text>
      <text x="155" y="88" fill="#9db6c4" font-size="10" font-family="sans-serif">FC-Vorfach</text>
      <text x="252" y="92" text-anchor="middle" fill="#9db6c4" font-size="9" font-family="sans-serif">Gummifisch</text>
      <text x="287" y="132" fill="#9db6c4" font-size="9" font-family="sans-serif">DS-Haken</text>
      <text x="160" y="162" fill="#9db6c4" font-size="9" font-family="sans-serif">~40 cm</text>
      <text x="181" y="224" text-anchor="middle" fill="#9db6c4" font-size="9" font-family="sans-serif">DS-Gewicht</text>
    </svg>`,

    laufblei: `<svg viewBox="0 0 560 158" xmlns="http://www.w3.org/2000/svg" width="100%" aria-label="Laufblei-Grundmontage">
      <rect x="6" y="62" width="36" height="10" rx="3" fill="#8ab0c0"/>
      <polygon points="6,58 6,76 0,67" fill="#8ab0c0"/>
      <line x1="42" y1="67" x2="560" y2="67" stroke="#33c3a6" stroke-width="2.5"/>
      <ellipse cx="158" cy="87" rx="18" ry="11" fill="#5a7d8e"/>
      <line x1="140" y1="67" x2="140" y2="87" stroke="#33c3a6" stroke-width="1.5" stroke-dasharray="3,2"/>
      <line x1="176" y1="67" x2="176" y2="87" stroke="#33c3a6" stroke-width="1.5" stroke-dasharray="3,2"/>
      <circle cx="194" cy="67" r="5" fill="#d4a84b"/>
      <text x="194" y="82" text-anchor="middle" fill="#9db6c4" font-size="8" font-family="sans-serif">Gummiperle</text>
      <rect x="210" y="62" width="6" height="10" rx="2" fill="#8ab0c0"/>
      <rect x="218" y="60" width="14" height="14" rx="3" fill="#8ab0c0"/>
      <line x1="232" y1="67" x2="390" y2="67" stroke="#d4a84b" stroke-width="2.5" stroke-dasharray="6,3"/>
      <path d="M390 60 Q391 83 408 85 Q426 85 426 70" fill="none" stroke="#8ab0c0" stroke-width="3"/>
      <line x1="424" y1="73" x2="430" y2="80" stroke="#8ab0c0" stroke-width="2"/>
      <path d="M403 60 C416 46 430 50 435 60 C440 68 448 67 452 62" fill="none" stroke="#8ab0c0" stroke-width="3" stroke-linecap="round"/>
      <text x="158" y="111" text-anchor="middle" fill="#9db6c4" font-size="9" font-family="sans-serif">Laufblei (gleitet)</text>
      <text x="213" y="53" text-anchor="middle" fill="#9db6c4" font-size="9" font-family="sans-serif">Stopper</text>
      <text x="225" y="90" text-anchor="middle" fill="#9db6c4" font-size="9" font-family="sans-serif">Wirbel</text>
      <text x="310" y="53" text-anchor="middle" fill="#9db6c4" font-size="10" font-family="sans-serif">FC-Vorfach</text>
      <text x="415" y="104" text-anchor="middle" fill="#9db6c4" font-size="9" font-family="sans-serif">Haken + Köder</text>
      <text x="100" y="53" text-anchor="middle" fill="#9db6c4" font-size="10" font-family="sans-serif">Braid/Mono</text>
    </svg>`,

    "pose-stahl": `<svg viewBox="0 0 420 255" xmlns="http://www.w3.org/2000/svg" width="100%" aria-label="Posenansitz Öderfisch">
      <text x="210" y="31" text-anchor="middle" fill="#9db6c4" font-size="10" font-family="sans-serif">~ Wasseroberfläche ~</text>
      <line x1="0" y1="39" x2="420" y2="39" stroke="#2aa0d8" stroke-width="1" stroke-dasharray="8,4" opacity=".5"/>
      <rect x="6" y="33" width="36" height="10" rx="3" fill="#8ab0c0"/>
      <polygon points="6,29 6,47 0,38" fill="#8ab0c0"/>
      <line x1="42" y1="38" x2="160" y2="38" stroke="#33c3a6" stroke-width="2.5"/>
      <rect x="167" y="3" width="6" height="8" rx="2" fill="#8ab0c0"/>
      <circle cx="170" cy="13" r="5" fill="#d4a84b"/>
      <ellipse cx="170" cy="29" rx="10" ry="16" fill="#e8763a"/>
      <ellipse cx="170" cy="47" rx="10" ry="16" fill="#e0edf2"/>
      <circle cx="170" cy="65" r="5" fill="#d4a84b"/>
      <line x1="170" y1="70" x2="170" y2="107" stroke="#33c3a6" stroke-width="2.5"/>
      <rect x="163" y="107" width="14" height="14" rx="3" fill="#8ab0c0"/>
      <line x1="170" y1="121" x2="170" y2="171" stroke="#9db6c4" stroke-width="2.5"/>
      <path d="M170 171 Q171 195 188 197 Q206 197 206 182" fill="none" stroke="#8ab0c0" stroke-width="3"/>
      <line x1="204" y1="185" x2="210" y2="192" stroke="#8ab0c0" stroke-width="2"/>
      <ellipse cx="224" cy="183" rx="22" ry="10" fill="#e85c5c" opacity=".7"/>
      <path d="M244 180 L256 173 M244 183 L256 189" fill="none" stroke="#e85c5c" stroke-width="2.5" stroke-linecap="round"/>
      <text x="198" y="36" fill="#9db6c4" font-size="10" font-family="sans-serif">Laufpose</text>
      <text x="182" y="10" fill="#9db6c4" font-size="8" font-family="sans-serif">Stopper</text>
      <text x="182" y="20" fill="#9db6c4" font-size="8" font-family="sans-serif">Prellperle</text>
      <text x="182" y="67" fill="#9db6c4" font-size="8" font-family="sans-serif">Prellperle</text>
      <text x="166" y="127" text-anchor="middle" fill="#9db6c4" font-size="9" font-family="sans-serif">Wirbel</text>
      <text x="118" y="151" fill="#9db6c4" font-size="10" font-family="sans-serif">Stahlvorfach</text>
      <text x="265" y="187" fill="#9db6c4" font-size="9" font-family="sans-serif">Öderfisch</text>
      <text x="210" y="213" text-anchor="middle" fill="#9db6c4" font-size="9" font-family="sans-serif">Haken (Drilling)</text>
    </svg>`,

    sbirolino: `<svg viewBox="0 0 560 148" xmlns="http://www.w3.org/2000/svg" width="100%" aria-label="Sbirolino-Montage">
      <rect x="6" y="64" width="36" height="10" rx="3" fill="#8ab0c0"/>
      <polygon points="6,60 6,78 0,69" fill="#8ab0c0"/>
      <line x1="42" y1="69" x2="148" y2="69" stroke="#d4a84b" stroke-width="2.5"/>
      <ellipse cx="188" cy="69" rx="40" ry="16" fill="#2aa0d8" opacity=".75"/>
      <ellipse cx="148" cy="69" rx="6" ry="4" fill="#8ab0c0"/>
      <ellipse cx="228" cy="69" rx="6" ry="4" fill="#8ab0c0"/>
      <rect x="230" y="62" width="14" height="14" rx="3" fill="#8ab0c0"/>
      <line x1="244" y1="69" x2="440" y2="69" stroke="#d4a84b" stroke-width="2.5" stroke-dasharray="6,3"/>
      <path d="M440 62 Q441 85 458 87 Q476 87 476 72" fill="none" stroke="#8ab0c0" stroke-width="3"/>
      <line x1="474" y1="75" x2="480" y2="82" stroke="#8ab0c0" stroke-width="2"/>
      <circle cx="492" cy="64" r="9" fill="#33c3a6" opacity=".8"/>
      <text x="93" y="53" text-anchor="middle" fill="#9db6c4" font-size="10" font-family="sans-serif">Monofil</text>
      <text x="188" y="96" text-anchor="middle" fill="#9db6c4" font-size="10" font-family="sans-serif">Sbirolino</text>
      <text x="237" y="90" text-anchor="middle" fill="#9db6c4" font-size="9" font-family="sans-serif">Wirbel</text>
      <text x="342" y="53" text-anchor="middle" fill="#9db6c4" font-size="10" font-family="sans-serif">FC-Vorfach 1,5–2,5 m</text>
      <text x="492" y="53" text-anchor="middle" fill="#9db6c4" font-size="9" font-family="sans-serif">PowerBait</text>
      <text x="460" y="104" text-anchor="middle" fill="#9db6c4" font-size="9" font-family="sans-serif">Haken Gr. 6</text>
    </svg>`,

    laufpose: `<svg viewBox="0 0 420 240" xmlns="http://www.w3.org/2000/svg" width="100%" aria-label="Laufpose-Montage">
      <text x="210" y="16" text-anchor="middle" fill="#9db6c4" font-size="10" font-family="sans-serif">~ Wasseroberfläche ~</text>
      <line x1="0" y1="24" x2="420" y2="24" stroke="#2aa0d8" stroke-width="1" stroke-dasharray="8,4" opacity=".5"/>
      <rect x="6" y="18" width="36" height="10" rx="3" fill="#8ab0c0"/>
      <polygon points="6,14 6,32 0,23" fill="#8ab0c0"/>
      <line x1="42" y1="23" x2="144" y2="23" stroke="#d4a84b" stroke-width="2.5"/>
      <rect x="144" y="19" width="6" height="8" rx="2" fill="#8ab0c0"/>
      <circle cx="153" cy="23" r="4" fill="#8ab0c0"/>
      <ellipse cx="166" cy="14" rx="10" ry="16" fill="#e8763a"/>
      <ellipse cx="166" cy="32" rx="10" ry="16" fill="#e0edf2"/>
      <circle cx="179" cy="23" r="4" fill="#8ab0c0"/>
      <rect x="182" y="19" width="14" height="8" rx="3" fill="#8ab0c0"/>
      <line x1="196" y1="23" x2="196" y2="130" stroke="#d4a84b" stroke-width="2.5" stroke-dasharray="5,3"/>
      <path d="M196 130 Q197 154 214 156 Q232 156 232 141" fill="none" stroke="#8ab0c0" stroke-width="3"/>
      <line x1="230" y1="144" x2="236" y2="151" stroke="#8ab0c0" stroke-width="2"/>
      <ellipse cx="218" cy="120" rx="12" ry="6" fill="#33c3a6" opacity=".8"/>
      <text x="153" y="53" fill="#9db6c4" font-size="9" font-family="sans-serif">Stopper + Pose</text>
      <text x="207" y="19" fill="#9db6c4" font-size="9" font-family="sans-serif">Wirbel</text>
      <text x="148" y="88" fill="#9db6c4" font-size="10" font-family="sans-serif">FC-Vorfach</text>
      <text x="246" y="123" fill="#9db6c4" font-size="9" font-family="sans-serif">Köder</text>
      <text x="222" y="170" text-anchor="middle" fill="#9db6c4" font-size="9" font-family="sans-serif">Haken Gr. 6</text>
      <text x="60" y="53" text-anchor="middle" fill="#9db6c4" font-size="10" font-family="sans-serif">Monofil</text>
    </svg>`,

    feeder: `<svg viewBox="0 0 520 190" xmlns="http://www.w3.org/2000/svg" width="100%" aria-label="Feeder-Montage">
      <rect x="6" y="62" width="36" height="10" rx="3" fill="#8ab0c0"/>
      <polygon points="6,58 6,76 0,67" fill="#8ab0c0"/>
      <line x1="42" y1="67" x2="196" y2="67" stroke="#d4a84b" stroke-width="2.5"/>
      <rect x="196" y="48" width="52" height="38" rx="4" fill="none" stroke="#d4a84b" stroke-width="2.5"/>
      <line x1="196" y1="58" x2="248" y2="58" stroke="#d4a84b" stroke-width="1" opacity=".5"/>
      <line x1="196" y1="68" x2="248" y2="68" stroke="#d4a84b" stroke-width="1" opacity=".5"/>
      <line x1="196" y1="78" x2="248" y2="78" stroke="#d4a84b" stroke-width="1" opacity=".5"/>
      <line x1="212" y1="48" x2="212" y2="86" stroke="#d4a84b" stroke-width="1" opacity=".5"/>
      <line x1="228" y1="48" x2="228" y2="86" stroke="#d4a84b" stroke-width="1" opacity=".5"/>
      <circle cx="200" cy="52" r="5" fill="#8ab0c0"/>
      <circle cx="244" cy="52" r="5" fill="#8ab0c0"/>
      <line x1="248" y1="67" x2="320" y2="67" stroke="#d4a84b" stroke-width="2.5"/>
      <line x1="320" y1="67" x2="320" y2="130" stroke="#8ab0c0" stroke-width="2"/>
      <path d="M320 130 Q321 154 338 156 Q356 156 356 141" fill="none" stroke="#8ab0c0" stroke-width="3"/>
      <line x1="354" y1="144" x2="360" y2="151" stroke="#8ab0c0" stroke-width="2"/>
      <circle cx="338" cy="120" r="10" fill="#d4a84b" opacity=".9"/>
      <text x="110" y="53" text-anchor="middle" fill="#9db6c4" font-size="10" font-family="sans-serif">Monofil</text>
      <text x="222" y="102" text-anchor="middle" fill="#9db6c4" font-size="10" font-family="sans-serif">Futterkorb</text>
      <text x="222" y="114" text-anchor="middle" fill="#9db6c4" font-size="9" font-family="sans-serif">(mit Futter befüllt)</text>
      <text x="290" y="53" fill="#9db6c4" font-size="9" font-family="sans-serif">Mono-Vorfach</text>
      <text x="370" y="124" fill="#9db6c4" font-size="9" font-family="sans-serif">Boilie/Mais</text>
      <text x="348" y="170" text-anchor="middle" fill="#9db6c4" font-size="9" font-family="sans-serif">Karpfenhaken am Haar</text>
    </svg>`,

    stippe: `<svg viewBox="0 0 360 264" xmlns="http://www.w3.org/2000/svg" width="100%" aria-label="Stipp-Montage">
      <rect x="6" y="22" width="310" height="8" rx="3" fill="#8ab0c0"/>
      <polygon points="316,18 316,34 326,26" fill="#8ab0c0"/>
      <text x="160" y="16" text-anchor="middle" fill="#9db6c4" font-size="10" font-family="sans-serif">Shimano Hyperloop 7 m (Stipprute, keine Rolle)</text>
      <line x1="316" y1="26" x2="316" y2="60" stroke="#d4a84b" stroke-width="2.5"/>
      <ellipse cx="316" cy="50" rx="8" ry="18" fill="#e8763a"/>
      <ellipse cx="316" cy="75" rx="8" ry="18" fill="#e0edf2"/>
      <line x1="316" y1="93" x2="316" y2="126" stroke="#d4a84b" stroke-width="2.5"/>
      <circle cx="316" cy="128" r="5" fill="#5a7d8e"/>
      <line x1="316" y1="133" x2="316" y2="158" stroke="#d4a84b" stroke-width="2.5"/>
      <circle cx="316" cy="160" r="4" fill="#5a7d8e"/>
      <line x1="316" y1="164" x2="316" y2="194" stroke="#d4a84b" stroke-width="2.5"/>
      <path d="M316 194 Q317 218 333 220 Q351 220 351 205" fill="none" stroke="#8ab0c0" stroke-width="3"/>
      <line x1="349" y1="208" x2="355" y2="215" stroke="#8ab0c0" stroke-width="2"/>
      <path d="M312 190 C318 182 328 180 334 186 C340 192 342 200 338 204" fill="none" stroke="#d4a84b" stroke-width="3" stroke-linecap="round"/>
      <text x="295" y="50" text-anchor="end" fill="#9db6c4" font-size="9" font-family="sans-serif">Feste</text>
      <text x="295" y="62" text-anchor="end" fill="#9db6c4" font-size="9" font-family="sans-serif">Schnur</text>
      <text x="295" y="76" text-anchor="end" fill="#9db6c4" font-size="9" font-family="sans-serif">Stipp-Pose</text>
      <text x="295" y="132" text-anchor="end" fill="#9db6c4" font-size="9" font-family="sans-serif">Schrot</text>
      <text x="295" y="163" text-anchor="end" fill="#9db6c4" font-size="9" font-family="sans-serif">Schrot</text>
      <text x="295" y="210" text-anchor="end" fill="#9db6c4" font-size="9" font-family="sans-serif">Haken</text>
      <text x="295" y="224" text-anchor="end" fill="#9db6c4" font-size="9" font-family="sans-serif">Made/Wurm</text>
    </svg>`,

    pilker: `<svg viewBox="0 0 320 258" xmlns="http://www.w3.org/2000/svg" width="100%" aria-label="Pilker-Montage">
      <line x1="160" y1="0" x2="160" y2="38" stroke="#33c3a6" stroke-width="3"/>
      <rect x="150" y="38" width="20" height="12" rx="3" fill="#8ab0c0"/>
      <line x1="160" y1="50" x2="160" y2="66" stroke="#d4a84b" stroke-width="2.5"/>
      <ellipse cx="160" cy="116" rx="18" ry="50" fill="#8ab0c0"/>
      <ellipse cx="160" cy="116" rx="10" ry="42" fill="#9db6c4" opacity=".4"/>
      <line x1="160" y1="166" x2="160" y2="188" stroke="#d4a84b" stroke-width="2.5"/>
      <path d="M160 188 Q170 198 178 195 Q186 192 182 184" fill="none" stroke="#8ab0c0" stroke-width="3"/>
      <line x1="160" y1="120" x2="210" y2="130" stroke="#d4a84b" stroke-width="1.5" stroke-dasharray="4,2"/>
      <path d="M210 124 Q211 142 226 144 Q240 144 240 131" fill="none" stroke="#8ab0c0" stroke-width="2.5"/>
      <path d="M208 120 C220 110 235 112 240 122 C243 130 238 136 234 134" fill="none" stroke="#33c3a6" stroke-width="3.5" stroke-linecap="round"/>
      <text x="160" y="14" text-anchor="middle" fill="#9db6c4" font-size="10" font-family="sans-serif">Braid</text>
      <text x="184" y="47" fill="#9db6c4" font-size="9" font-family="sans-serif">Mono-Vorfach</text>
      <text x="160" y="226" text-anchor="middle" fill="#9db6c4" font-size="9" font-family="sans-serif">Pilker (60–200 g)</text>
      <text x="258" y="125" fill="#9db6c4" font-size="9" font-family="sans-serif">Dropper</text>
      <text x="258" y="137" fill="#9db6c4" font-size="9" font-family="sans-serif">+ Twister</text>
      <text x="184" y="47" fill="#9db6c4" font-size="9" font-family="sans-serif">Wirbel</text>
    </svg>`,

    brandung: `<svg viewBox="0 0 560 196" xmlns="http://www.w3.org/2000/svg" width="100%" aria-label="Brandungsmontage">
      <rect x="6" y="62" width="36" height="10" rx="3" fill="#8ab0c0"/>
      <polygon points="6,58 6,76 0,67" fill="#8ab0c0"/>
      <line x1="42" y1="67" x2="184" y2="67" stroke="#33c3a6" stroke-width="3"/>
      <circle cx="190" cy="67" r="7" fill="none" stroke="#8ab0c0" stroke-width="2.5"/>
      <text x="190" y="53" text-anchor="middle" fill="#9db6c4" font-size="9" font-family="sans-serif">Schlaufenknoten</text>
      <line x1="197" y1="67" x2="360" y2="67" stroke="#d4a84b" stroke-width="3"/>
      <text x="110" y="53" text-anchor="middle" fill="#9db6c4" font-size="10" font-family="sans-serif">Braid</text>
      <text x="278" y="53" text-anchor="middle" fill="#9db6c4" font-size="10" font-family="sans-serif">Schlagschnur (Mono 0,40–0,50)</text>
      <ellipse cx="378" cy="88" rx="18" ry="28" fill="#5a7d8e"/>
      <path d="M366" y1="67" stroke="#d4a84b" stroke-width="2"/>
      <line x1="360" y1="67" x2="374" y2="72" stroke="#d4a84b" stroke-width="2.5"/>
      <line x1="374" y1="72" x2="378" y2="60" stroke="#5a7d8e" stroke-width="2"/>
      <text x="402" y="92" fill="#9db6c4" font-size="9" font-family="sans-serif">Krallen-</text>
      <text x="402" y="104" fill="#9db6c4" font-size="9" font-family="sans-serif">blei</text>
      <line x1="300" y1="67" x2="300" y2="40" stroke="#d4a84b" stroke-width="1.5" stroke-dasharray="3,2"/>
      <path d="M300 36 Q301 24 314 23 Q326 23 326 35" fill="none" stroke="#8ab0c0" stroke-width="2.5"/>
      <line x1="324" y1="37" x2="328" y2="43" stroke="#8ab0c0" stroke-width="2"/>
      <ellipse cx="314" cy="17" rx="12" ry="5" fill="#d4a84b" opacity=".8"/>
      <line x1="330" y1="67" x2="330" y2="38" stroke="#d4a84b" stroke-width="1.5" stroke-dasharray="3,2"/>
      <path d="M330 34 Q331 22 344 21 Q357 21 357 33" fill="none" stroke="#8ab0c0" stroke-width="2.5"/>
      <line x1="355" y1="36" x2="359" y2="42" stroke="#8ab0c0" stroke-width="2"/>
      <ellipse cx="344" cy="15" rx="12" ry="5" fill="#d4a84b" opacity=".8"/>
      <text x="290" y="160" fill="#9db6c4" font-size="9" font-family="sans-serif">Paternoster-Arme mit Wattwurm</text>
    </svg>`,

    paternoster: `<svg viewBox="0 0 320 264" xmlns="http://www.w3.org/2000/svg" width="100%" aria-label="Heringspaternoster">
      <line x1="160" y1="0" x2="160" y2="36" stroke="#33c3a6" stroke-width="3"/>
      <text x="160" y="14" text-anchor="middle" fill="#9db6c4" font-size="10" font-family="sans-serif">Braid / Mono</text>
      <line x1="160" y1="36" x2="160" y2="230" stroke="#d4a84b" stroke-width="2.5"/>
      ${[56,88,120,152,184].map((y, i) => `
        <line x1="160" y1="${y}" x2="220" y2="${y}" stroke="#d4a84b" stroke-width="1.5"/>
        <path d="M220 ${y-8} Q221 ${y+14} ${i%2===0?233:236} ${y+16} Q${i%2===0?247:250} ${y+16} ${i%2===0?247:250} ${y+3}" fill="none" stroke="#8ab0c0" stroke-width="2.5"/>
        <line x1="${i%2===0?245:248}" y1="${y+6}" x2="${i%2===0?251:254}" y2="${y+13}" stroke="#8ab0c0" stroke-width="1.5"/>
        <ellipse cx="240" cy="${y-13}" rx="10" ry="4" fill="#e85c5c" opacity=".7"/>
      `).join("")}
      <ellipse cx="160" cy="240" rx="12" ry="16" fill="#5a7d8e"/>
      <text x="278" y="56" fill="#9db6c4" font-size="9" font-family="sans-serif">Lametta-Haken</text>
      <text x="278" y="90" fill="#9db6c4" font-size="9" font-family="sans-serif">× 5–7 Stück</text>
      <text x="160" y="260" text-anchor="middle" fill="#9db6c4" font-size="9" font-family="sans-serif">Abschlussblei (30–60 g)</text>
    </svg>`,
  };

  const svg = SVG[typ];
  if(!svg) return "";
  return `<details class="montage-diagram" open>
    <summary>📐 Montage-Illustration</summary>
    ${svg}
  </details>`;
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
  const perf = a.setup ? TB_STATS_CACHE[a.setup] : null;
  const perfBadge = perf ? `<div class="setup-perf-badge">🎒 ${perf.ausfluge} Ausflug${perf.ausfluge!==1?"e":""} · ${perf.faenge} Fang${perf.faenge!==1?"e":""}</div>` : "";
  return `<article class="ansatz">
    <div class="ansatz-head">
      <span class="badge ${a.status}">${statusLabel(a.status)}</span>
      <span class="m-name">${a.methode}</span>
    </div>
    ${perfBadge}
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
  // "Heute dabei"-Filter: nur Setups zeigen, die du gerade dabei hast
  if(HEUTE_DABEI.size > 0) ansaetze = ansaetze.filter(a => !a.setup || HEUTE_DABEI.has(a.setup));

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
function inventarKarteHTML(s){
  const letzteWartung = WARTUNG[s.key];
  const tage = letzteWartung ? tageSeit(letzteWartung) : null;
  const faellig = tage === null || tage > 180; // > 6 Monate ohne Eintrag = Erinnerung
  return `<div class="inv-card">
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
}

function renderInventar(){
  const el = $("#inventar");
  const alleSetups = Object.values(AKTUELL);
  const stippen = alleSetups.filter(s => s.kategorie === "stippe");
  const mitRolle = alleSetups.filter(s => s.kategorie !== "stippe");

  let html = `<h2>🎒 Mein aktuelles Equipment</h2>`;
  html += `<h3 class="inv-gruppe-titel">🎣 Ruten mit Rolle <span class="inv-gruppe-count">${mitRolle.length}</span></h3>`;
  html += `<div class="inv-grid">` + mitRolle.map(inventarKarteHTML).join("") + `</div>`;
  if(stippen.length > 0){
    html += `<h3 class="inv-gruppe-titel">🪁 Stippruten (ohne Rolle) <span class="inv-gruppe-count">${stippen.length}</span></h3>`;
    html += `<div class="inv-grid">` + stippen.map(inventarKarteHTML).join("") + `</div>`;
  }
  html += `<div class="inv-grid">`;
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

/* ---------- Echter Gezeiten-Rechner (worldtides.info) ----------
   Der API-Key ist zwangsläufig im öffentlichen Quellcode sichtbar (statische
   Seite, kein Backend) - bewusste Nutzer-Entscheidung, da nur die kostenlose
   Stufe genutzt wird. Bei Missbrauch/Kontingent-Erschöpfung kann der Key auf
   worldtides.info jederzeit neu generiert werden. */
const WORLDTIDES_KEY = "eab6216f-7a71-4cc8-aa13-92ca98e77b87";
const GEZEITEN_ORTE = [
  { id:"ostsee_sh", name:"Ostsee SH (Kiel/Eckernförde)", lat:54.47, lng:10.18 },
  { id:"nordsee_sh", name:"Nordsee SH (St. Peter-Ording)", lat:54.30, lng:8.63 },
  { id:"eider", name:"Eider-Mündung (Tönning)", lat:54.31, lng:8.90 },
  { id:"hvidesande", name:"Hvide Sande (Dänemark)", lat:56.0011, lng:8.1281 },
  { id:"blaavand", name:"Blåvand (Dänemark)", lat:55.56, lng:8.12 },
  { id:"soendervig", name:"Søndervig (Dänemark)", lat:56.09, lng:8.15 }
];
const gezeitenCache = {};
async function ladeGezeiten(ort, datum){
  const cacheKey = ort.id + "_" + datum;
  if(gezeitenCache[cacheKey]) return gezeitenCache[cacheKey];
  const url = `https://www.worldtides.info/api/v3?extremes&date=${datum}&days=1&lat=${ort.lat}&lon=${ort.lng}&key=${WORLDTIDES_KEY}`;
  const res = await fetch(url);
  if(!res.ok) throw new Error("HTTP " + res.status);
  const data = await res.json();
  if(data.status !== 200) throw new Error(data.error || ("Status " + data.status));
  gezeitenCache[cacheKey] = data.extremes || [];
  return gezeitenCache[cacheKey];
}
async function tagescheckLadeGezeiten(){
  const ortId = $("#tc-gezeiten-ort").value;
  const container = $("#tc-gezeiten-result");
  if(!container) return;
  if(!ortId){ container.innerHTML = ""; return; }
  const ort = GEZEITEN_ORTE.find(o => o.id === ortId);
  const datum = $("#tc-datum").value || heuteISO();
  container.innerHTML = `<div class="card fs-stats-block"><p class="k-hint">⏳ Lade Gezeiten für ${escAttr(ort.name)} …</p></div>`;
  try {
    const extremes = await ladeGezeiten(ort, datum);
    if(!extremes || extremes.length === 0){
      container.innerHTML = `<div class="card fs-stats-block"><p class="k-hint">Keine Gezeitendaten für dieses Datum gefunden.</p></div>`;
      return;
    }
    const rows = extremes.map(e => {
      const t = new Date(e.date);
      const zeit = t.toLocaleTimeString("de-DE", { hour:"2-digit", minute:"2-digit", timeZone:"Europe/Berlin" });
      const label = e.type === "High" ? "🔼 Hochwasser" : "🔽 Niedrigwasser";
      return `<div class="row"><span>${label}</span><span>${zeit} Uhr</span></div>`;
    }).join("");
    container.innerHTML = `<div class="card fs-stats-block">
      <h3>🌊 Gezeiten – ${escAttr(ort.name)}</h3>
      ${rows}
      <p class="k-hint" style="margin-top:8px">Zeiten in Ortszeit (Europe/Berlin) · Daten von worldtides.info</p>
    </div>`;
  } catch(err){
    container.innerHTML = `<div class="card fs-stats-block"><p class="k-hint">⚠️ Gezeiten konnten nicht geladen werden (${escAttr(err.message)}). Internetverbindung oder API-Kontingent prüfen.</p></div>`;
  }
}

/* ---------- Echte Wettervorhersage (Open-Meteo – kostenlos, kein API-Key nötig) ----------
   Füllt Luftdrucktendenz/Himmel/Wind automatisch, bleibt aber jederzeit manuell überschreibbar –
   der Tagescheck funktioniert unverändert auch komplett ohne Internetverbindung. */
const WETTER_ORT_DEFAULT = { name:"Schleswig-Holstein (allgemein)", lat:54.3, lng:9.65 };
const WETTER_STUNDE_JE_ZEIT = {
  daemmerung_morgen: 6, vormittag: 9, mittag: 12, nachmittag: 15, daemmerung_abend: 19, nacht: 23
};
function tagescheckWetterOrt(){
  const ortId = $("#tc-gezeiten-ort").value;
  return GEZEITEN_ORTE.find(o => o.id === ortId) || WETTER_ORT_DEFAULT;
}
async function tagescheckLadeWetter(){
  const status = $("#tc-wetter-status");
  if(!status) return;
  const ort = tagescheckWetterOrt();
  const datum = $("#tc-datum").value || heuteISO();
  const zeit = $("#tc-zeit").value || "vormittag";
  const stunde = WETTER_STUNDE_JE_ZEIT[zeit] ?? 12;

  status.textContent = `⏳ Lade Wetterdaten für ${ort.name} …`;
  try {
    const vortag = new Date(datum + "T12:00:00");
    vortag.setDate(vortag.getDate() - 1);
    const startDatum = vortag.toISOString().slice(0,10);
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${ort.lat}&longitude=${ort.lng}&hourly=surface_pressure,cloud_cover,wind_speed_10m,precipitation_probability&start_date=${startDatum}&end_date=${datum}&timezone=Europe%2FBerlin`;
    const res = await fetch(url);
    if(!res.ok) throw new Error("HTTP " + res.status);
    const data = await res.json();
    if(!data.hourly || !data.hourly.time) throw new Error("Keine Daten erhalten");

    const zielIndex = data.hourly.time.indexOf(`${datum}T${String(stunde).padStart(2,"0")}:00`);
    if(zielIndex === -1) throw new Error("Datum außerhalb des verfügbaren Zeitraums (Open-Meteo deckt ca. 3 Monate Vergangenheit bis 16 Tage Zukunft ab)");
    const vorherIndex = Math.max(0, zielIndex - 6);

    const druckJetzt = data.hourly.surface_pressure[zielIndex];
    const druckVorher = data.hourly.surface_pressure[vorherIndex];
    const wolken = data.hourly.cloud_cover[zielIndex];
    const regenWahrsch = data.hourly.precipitation_probability[zielIndex];
    const wind = data.hourly.wind_speed_10m[zielIndex];

    const druckDelta = druckJetzt - druckVorher;
    const druckWert = druckDelta < -0.5 ? "fallend" : (druckDelta > 0.5 ? "steigend" : "stabil");
    const himmelWert = wolken > 70 ? "bedeckt" : (wolken < 30 ? "klar" : "wechselhaft");
    const windWert = wind > 50 ? "sturm" : (wind > 30 ? "kraeftig" : (wind > 10 ? "leicht" : "still"));
    const regenWert = regenWahrsch > 60 ? "stark" : (regenWahrsch > 20 ? "leicht" : "kaum");

    $("#tc-druck").value = druckWert;
    $("#tc-himmel").value = himmelWert;
    $("#tc-wind").value = windWert;
    $("#tc-regen").value = regenWert;
    status.innerHTML = `✅ Wetter für ${escAttr(ort.name)}, ${String(stunde).padStart(2,"0")}:00 Uhr geladen: ${druckJetzt.toFixed(0)} hPa (${druckWert}), ${wolken.toFixed(0)}% Wolken, ${wind.toFixed(0)} km/h Wind, ${regenWahrsch.toFixed(0)}% Regenwahrscheinlichkeit. <i>Passt das nicht zu dem, was du vor Ort siehst? Einfach oben von Hand korrigieren.</i>`;
    tagescheckBerechnen();
  } catch(err){
    status.textContent = `⚠️ Wetterdaten konnten nicht geladen werden (${err.message}). Bitte manuell eintragen.`;
  }
}

function renderTagescheck(){
  const el = $("#tagescheck");
  const heute = new Date();
  const heuteStr = heute.toISOString().slice(0,10);

  let fischOptions = `<option value="">– allgemein (kein bestimmter Fisch) –</option>`;
  FISCHE.forEach(f => { fischOptions += `<option value="${f.id}">${f.emoji} ${f.name}</option>`; });

  el.innerHTML = `<div class="k-intro card">
    <h2>📅 Lohnt sich heute?</h2>
    <p><b>Erfahrungswissen zum Selbst-Einschätzen</b>, jetzt mit optionaler Wetter-Automatik: Luftdruck/Himmel/Wind werden
    automatisch für Datum + Ort geladen (Open-Meteo) – du kannst sie danach jederzeit von Hand korrigieren, wenn du vor
    Ort etwas anderes siehst. Damit bekommst du eine Einschätzung <b>mit Begründung</b> – kein reines Zahlen-Orakel.</p>
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
      <div class="field"><label>Ort für Wetter/Gezeiten (optional)</label><select id="tc-gezeiten-ort">
        <option value="">– allgemein Schleswig-Holstein –</option>
        ${GEZEITEN_ORTE.map(o => `<option value="${o.id}">${o.name}</option>`).join("")}
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
      <div class="field"><label>Niederschlag</label><select id="tc-regen">
        <option value="kaum">Kaum/kein Regen</option>
        <option value="leicht">Leichter Regen möglich</option>
        <option value="stark">Starker Regen/Gewitter</option>
      </select></div>
    </div>
    <button type="button" class="add-btn" id="tc-wetter-btn" style="margin-top:12px">🌤️ Wetter automatisch laden</button>
    <div id="tc-wetter-status" class="k-hint" style="margin-top:8px"></div>
  </div>
  <div id="tc-gezeiten-result"></div>
  <div id="tc-result"></div>`;

  ["tc-fisch","tc-datum","tc-zeit","tc-druck","tc-himmel","tc-wind","tc-regen"].forEach(id => {
    document.getElementById(id).addEventListener("change", tagescheckBerechnen);
  });
  ["tc-datum","tc-gezeiten-ort"].forEach(id => {
    document.getElementById(id).addEventListener("change", tagescheckLadeGezeiten);
  });
  $("#tc-wetter-btn").addEventListener("click", tagescheckLadeWetter);
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
  const regen = $("#tc-regen").value;

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

  // Niederschlag
  if(regen === "leicht"){ gruende.push(["±0","Leichter Regen trübt die Wasseroberfläche und kann manche Fische aktiver machen – kein Ausschlusskriterium."]); }
  else if(regen === "stark"){ score -= 2; gruende.push(["−2","Starker Regen/Gewitter: schlechte Sicht, unangenehm – und bei Gewitter zusätzlich ein Sicherheitsthema (nicht am offenen Wasser mit langer Rute)."]); }

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

/* ---------- Angelmethoden-Übersicht ----------
   Status wird zur Laufzeit aus AKTUELL/WUNSCH berechnet, nicht in data.js
   fest hinterlegt – bleibt so automatisch aktuell, wenn neue Setups
   dazukommen (z. B. Setup 6/7 in dieser Session). ---------- */
function methodeStatus(methode){
  const setupMachbar = (methode.passendeSetups || []).find(k => AKTUELL[k]);
  if(setupMachbar) return { status:"machbar", setup:setupMachbar };
  const setupBedingt = (methode.bedingtSetups || []).find(k => AKTUELL[k]);
  if(setupBedingt) return { status:"bedingt", setup:setupBedingt };
  return { status:"wunsch", setup:null };
}
function renderAngelmethoden(){
  const el = $("#methoden");
  let html = `<div class="k-intro card">
    <h2>🎣 Angelmethoden im Überblick</h2>
    <p>Alle gängigen Angelmethoden kurz erklärt – und ob du sie mit deinem aktuellen Equipment schon nutzen kannst.</p>
  </div>`;

  const rang = { machbar:0, bedingt:1, wunsch:2 };
  const sortiert = [...ANGELMETHODEN].sort((a,b) => rang[methodeStatus(a).status] - rang[methodeStatus(b).status]);

  sortiert.forEach(m => {
    const { status, setup } = methodeStatus(m);
    let body = "";
    if(status === "machbar" || status === "bedingt"){
      body += setupLineHTML(setup);
    }
    if(status === "wunsch" && m.wunschKey){
      body += needHTML(m.wunschKey);
    } else if(status === "wunsch"){
      body += `<div class="need-hinweis">❌ Aktuell weder mit deinem Equipment machbar noch auf der Wunschliste – wäre eine komplett neue Geräteklasse (und bei Trolling zusätzlich ein Boot nötig).</div>`;
    }
    html += `<article class="ansatz">
      <div class="ansatz-head">
        <span class="badge ${status}">${statusLabel(status)}</span>
        <span class="m-name">${m.emoji} ${m.name}</span>
      </div>
      <div class="ansatz-body">
        <p class="k-hint" style="margin:0 0 10px">${m.beschreibung}</p>
        ${body}
      </div>
    </article>`;
  });

  el.innerHTML = html;
}

/* ---------- LAV Schleswig-Holstein: vergünstigte/kostenlose Mitgliedsgewässer ---------- */
function renderLavGewaesser(){
  const el = $("#lav");
  const kostenlosCount = LAV_GEWAESSER.filter(g => g.kostenlosLav === true).length;

  let html = `<div class="k-intro card">
    <h2>💳 LAV-Gewässer (Schleswig-Holstein)</h2>
    <p>Als LAV-Mitglied kannst du an diesen Gewässern vergünstigt oder sogar kostenlos angeln.
    <b>${kostenlosCount} von ${LAV_GEWAESSER.length}</b> sind für LAV-Mitglieder komplett kostenfrei (Boot meist trotzdem extra) –
    bei den übrigen zahlst du einen reduzierten Erlaubnisschein.</p>
    <p class="k-hint">${LAV_GEWAESSER_META.disclaimer} <i>(${LAV_GEWAESSER_META.stand})</i> Positionen auf der Karte sind Näherungswerte (Ortsmitte), nicht exakt geocodet.</p>
  </div>
  <div id="lav-map"></div>`;

  const sortiert = [...LAV_GEWAESSER].sort((a,b) => (b.kostenlosLav === true) - (a.kostenlosLav === true));

  sortiert.forEach((g,i) => {
    const nr = i + 1;
    const gruppenRows = g.gruppen.map(gr => `<div class="row"><span>${gr.name}</span><span><b>${gr.preise}</b></span></div>`).join("");
    const badge = g.kostenlosLav === true
      ? `<span class="badge machbar">🆓 LAV-Mitglieder kostenlos</span>`
      : (g.unsicher
        ? `<span class="badge bedingt">❓ Nicht eindeutig</span>`
        : `<span class="badge wunsch">💶 Auch für Mitglieder kostenpflichtig</span>`);
    html += `<article class="ansatz">
      <div class="ansatz-head">
        <span class="lav-nr">${nr}</span>
        ${badge}
        <span class="m-name">${g.name}${g.typ ? ` · ${g.typ}` : ""}</span>
      </div>
      <div class="ansatz-body">
        ${gruppenRows}
        ${g.details ? `<ul class="lav-details">${g.details.map(d => `<li>${d}</li>`).join("")}</ul>` : ""}
        ${g.hinweis ? `<div class="need-hinweis" style="margin-top:10px">${g.hinweis}</div>` : ""}
        ${g.url ? `<a class="shop-link" href="${g.url}" target="_blank" rel="noopener noreferrer">🔗 Zur Gewässerseite (lav-sh.de)</a>` : ""}
      </div>
    </article>`;
  });

  el.innerHTML = html;
  // Karte NICHT sofort initialisieren: der Tab ist beim allerersten Laden noch
  // versteckt (display:none), Leaflet würde sich dabei eine 0x0-Größe einfrieren.
  // Stattdessen erst bei tatsächlichem Öffnen des Tabs (siehe lavOnTabShown()).
  lavMapNeuAufbauen = true;
}

/* ---------- Kleine Übersichtskarte mit nummerierten Markern (passend zur
   Liste darunter) ---------- */
let lavMap = null;
let lavMapNeuAufbauen = true;
function lavOnTabShown(){
  if(lavMapNeuAufbauen) lavEnsureMap();
  else if(lavMap) lavMap.invalidateSize();
}
function lavEnsureMap(){
  if(lavMap){ lavMap.remove(); lavMap = null; }
  const container = document.getElementById("lav-map");
  if(!container) return;
  lavMap = L.map("lav-map", { zoomControl: true, attributionControl: false }).setView([54.15, 10.0], 8);
  L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19, attribution: "© OpenStreetMap-Mitwirkende"
  }).addTo(lavMap);
  L.control.attribution({ position: "bottomleft", prefix: false }).addAttribution("© OpenStreetMap-Mitwirkende").addTo(lavMap);

  const sortiert = [...LAV_GEWAESSER].sort((a,b) => (b.kostenlosLav === true) - (a.kostenlosLav === true));
  const punkte = [];
  sortiert.forEach((g, i) => {
    if(g.lat == null || g.lng == null) return;
    const nr = i + 1;
    const farbe = g.kostenlosLav === true ? "#3ad07a" : "#33c3a6";
    const icon = L.divIcon({
      className: "lav-marker",
      html: `<div class="lav-marker-inner" style="background:${farbe}">${nr}</div>`,
      iconSize: [28, 28], iconAnchor: [14, 14]
    });
    L.marker([g.lat, g.lng], { icon }).addTo(lavMap).bindPopup(`<b>${nr}. ${g.name}</b>`);
    punkte.push([g.lat, g.lng]);
  });
  if(punkte.length > 0) lavMap.fitBounds(punkte, { padding: [28, 28] });

  lavMapNeuAufbauen = false;
  requestAnimationFrame(() => lavMap && lavMap.invalidateSize());
  setTimeout(() => {
    if(!lavMap) return;
    lavMap.invalidateSize();
    if(punkte.length > 0) lavMap.fitBounds(punkte, { padding: [28, 28] });
  }, 200);
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

/* ---------- Unterlagen (IndexedDB lokal + Firebase Storage Cloud) ---------- */
const UL_DB_NAME = "angel_unterlagen_v1";
const UL_STORE   = "docs";

// ---- IndexedDB (lokaler Cache, immer aktiv) ----

function ulOpenDB(){
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(UL_DB_NAME, 1);
    req.onupgradeneeded = e => {
      const db = e.target.result;
      if(!db.objectStoreNames.contains(UL_STORE)){
        const store = db.createObjectStore(UL_STORE, { keyPath: "id" });
        store.createIndex("created", "created");
      }
    };
    req.onsuccess = e => resolve(e.target.result);
    req.onerror   = e => reject(e.target.error);
  });
}

async function ulIDBLadeAlle(){
  const db = await ulOpenDB();
  return new Promise((resolve, reject) => {
    const tx  = db.transaction(UL_STORE, "readonly");
    const req = tx.objectStore(UL_STORE).index("created").getAll();
    req.onsuccess = e => resolve(e.target.result || []);
    req.onerror   = e => reject(e.target.error);
  });
}

async function ulIDBSpeichere(doc){
  const db = await ulOpenDB();
  return new Promise((resolve, reject) => {
    const tx  = db.transaction(UL_STORE, "readwrite");
    const req = tx.objectStore(UL_STORE).put(doc);
    req.onsuccess = () => resolve();
    req.onerror   = e => reject(e.target.error);
  });
}

async function ulIDBLoesche(id){
  const db = await ulOpenDB();
  return new Promise((resolve, reject) => {
    const tx  = db.transaction(UL_STORE, "readwrite");
    const req = tx.objectStore(UL_STORE).delete(id);
    req.onsuccess = () => resolve();
    req.onerror   = e => reject(e.target.error);
  });
}

async function ulIDBLadeEins(id){
  const db = await ulOpenDB();
  return new Promise((resolve, reject) => {
    const tx  = db.transaction(UL_STORE, "readonly");
    const req = tx.objectStore(UL_STORE).get(id);
    req.onsuccess = e => resolve(e.target.result);
    req.onerror   = e => reject(e.target.error);
  });
}

// ---- Firebase Storage / Firestore (nur wenn eingeloggt) ----

// ---- Firestore als Cloud-Speicher (base64, kein Storage-Tarif nötig) ----

function ulFirestoreCol(uid){
  return firebase.firestore().collection("unterlagen").doc(uid).collection("docs");
}

function ulToBase64(buffer){
  const bytes = new Uint8Array(buffer);
  let bin = "";
  for(let i = 0; i < bytes.byteLength; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin);
}

function ulFromBase64(b64){
  const bin   = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for(let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes.buffer;
}

async function ulCloudLadeAlle(uid){
  const snap = await ulFirestoreCol(uid).orderBy("created").get();
  // dataB64 beim Listing weglassen – nur Metadaten zurückgeben
  return snap.docs.map(d => {
    const { dataB64, ...meta } = d.data();
    return { id: d.id, ...meta, inCloud: true };
  });
}

async function ulCloudSpeichere(uid, id, name, created, buffer, onProgress){
  if(onProgress) onProgress(0.3);
  const dataB64 = ulToBase64(buffer);
  if(onProgress) onProgress(0.7);
  await ulFirestoreCol(uid).doc(id).set({ name, created, size: buffer.byteLength, dataB64 });
  if(onProgress) onProgress(1);
}

async function ulCloudLoesche(uid, id){
  await ulFirestoreCol(uid).doc(id).delete().catch(() => {});
}

async function ulUmbenennen(id, neuerName){
  const cached = await ulIDBLadeEins(id);
  if(cached){ await ulIDBSpeichere({ ...cached, name: neuerName }); }
  if(fsSyncUser){
    await ulFirestoreCol(fsSyncUser.uid).doc(id).update({ name: neuerName }).catch(() => {});
  }
}

async function ulCloudDownload(uid, id){
  let letzterFehler;
  for(let versuch = 0; versuch < 3; versuch++){
    try {
      const snap = await ulFirestoreCol(uid).doc(id).get();
      if(!snap.exists) throw new Error("Dokument nicht in der Cloud gefunden.");
      return ulFromBase64(snap.data().dataB64);
    } catch(e) {
      letzterFehler = e;
      if(versuch < 2) await new Promise(r => setTimeout(r, 1200 * (versuch + 1)));
    }
  }
  throw letzterFehler;
}

// ---- Hilfsfunktionen ----

function ulFormatSize(bytes){
  if(!bytes) return "";
  if(bytes < 1024) return bytes + " B";
  if(bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / 1024 / 1024).toFixed(1) + " MB";
}

let ulAktuellerObjectURL = null;

function ulSchliesseViewer(){
  if(ulAktuellerObjectURL){ URL.revokeObjectURL(ulAktuellerObjectURL); ulAktuellerObjectURL = null; }
  $("#unterlagen-viewer").style.display = "none";
  $("#unterlagen-list").style.display   = "";
}

const UL_IS_MOBILE = navigator.maxTouchPoints > 0 || /iPhone|iPad|Android/i.test(navigator.userAgent);

async function ulOeffneDoc(id, name){
  const listEl = $("#unterlagen-list");
  let cached = await ulIDBLadeEins(id);
  let buffer;
  if(cached){
    buffer = cached.data;
  } else if(fsSyncUser){
    listEl.querySelector(`[data-ul-open="${id}"] .ul-doc-size`).textContent = "⏬ Wird geladen …";
    try {
      buffer = await ulCloudDownload(fsSyncUser.uid, id);
      await ulIDBSpeichere({ id, name, data: buffer, created: new Date().toISOString() });
    } catch(e) {
      alert("Download fehlgeschlagen: " + e.message);
      return;
    }
  } else {
    alert("Dokument nicht gefunden.");
    return;
  }
  const blob = new Blob([buffer], { type: "application/pdf" });
  if(ulAktuellerObjectURL) URL.revokeObjectURL(ulAktuellerObjectURL);
  ulAktuellerObjectURL = URL.createObjectURL(blob);

  if(UL_IS_MOBILE){
    // iOS/Android: window.open() nach await wird geblockt – stattdessen
    // im selben Tab navigieren; Back-Button bringt die App zurück.
    location.href = ulAktuellerObjectURL;
  } else {
    $("#ul-viewer-name").textContent = name;
    $("#ul-pdf-embed").src = ulAktuellerObjectURL;
    listEl.style.display = "none";
    $("#unterlagen-viewer").style.display = "flex";
  }
}

async function renderUnterlagen(){
  const listEl = $("#unterlagen-list");
  if(!listEl) return;

  const eingeloggt = !!fsSyncUser;
  let docs = [];
  try {
    docs = eingeloggt ? await ulCloudLadeAlle(fsSyncUser.uid) : await ulIDBLadeAlle();
  } catch(e) {
    docs = await ulIDBLadeAlle();
  }

  const syncHinweis = eingeloggt
    ? `<span style="color:var(--ok)">☁️ Cloud-Sync aktiv – auf allen Geräten verfügbar.</span>`
    : `<span style="color:var(--warn)">📱 Nur lokal gespeichert. <a href="#" id="ul-login-link">Anmelden</a> für geräteübergreifenden Zugriff.</span>`;

  let html = `<div class="k-intro card">
    <h2>📄 Meine Unterlagen</h2>
    <p>Angelschein, Fischereiabgaben und andere Dokumente – einmal hochladen, immer dabei.</p>
    <p style="font-size:13px;margin:0">${syncHinweis}</p>
  </div>
  <div id="ul-upload-area">
    <label class="ul-upload-btn" id="ul-upload-label">
      ➕ PDF hinzufügen
      <input type="file" accept="application/pdf" id="ul-file-input" style="display:none">
    </label>
    <div id="ul-name-confirm" class="ul-name-confirm card" style="display:none">
      <div class="ul-name-confirm-label">Bezeichnung für dieses Dokument:</div>
      <input id="ul-name-input" class="ul-name-input" type="text" placeholder="z. B. Angelschein SH 2026">
      <div class="ul-name-confirm-actions">
        <button id="ul-name-ok" class="ul-upload-btn" style="margin:0;padding:10px 18px;font-size:14px">✅ Speichern</button>
        <button id="ul-name-cancel" type="button" class="del-btn-wide">Abbrechen</button>
      </div>
    </div>
    <div id="ul-progress-wrap" style="display:none;margin-top:10px">
      <div class="ul-progress-bar"><div id="ul-progress-fill" class="ul-progress-fill"></div></div>
      <div id="ul-progress-label" style="font-size:12px;color:var(--muted);margin-top:4px">Wird gespeichert …</div>
    </div>
  </div>`;

  if(docs.length === 0){
    html += `<div class="ul-empty card">
      <span class="ul-empty-icon">📂</span>
      Noch keine Unterlagen hinterlegt.<br>
      Tippe auf „PDF hinzufügen" um zu starten.
    </div>`;
  } else {
    html += `<div class="ul-doc-list">`;
    docs.forEach(doc => {
      const size  = doc.size ? ulFormatSize(doc.size) : (doc.data ? ulFormatSize(doc.data.byteLength) : "");
      const datum = doc.created ? doc.created.slice(0,10) : "";
      html += `<div class="ul-doc-item" data-ul-open="${escAttr(doc.id)}" data-ul-name="${escAttr(doc.name)}">
        <span class="ul-doc-icon">📄</span>
        <div class="ul-doc-meta">
          <div class="ul-doc-name">${escAttr(doc.name)}</div>
          <div class="ul-doc-size">${[size, datum].filter(Boolean).join(" · ")}</div>
        </div>
        <button class="ul-doc-rename" data-ul-rename="${escAttr(doc.id)}" data-ul-current="${escAttr(doc.name)}" title="Umbenennen">✏️</button>
        <button class="ul-doc-del" data-ul-del="${escAttr(doc.id)}" title="Löschen">🗑</button>
      </div>
      <div class="ul-inline-rename" id="ul-rename-${escAttr(doc.id)}" style="display:none">
        <input class="ul-name-input" id="ul-rename-input-${escAttr(doc.id)}" value="${escAttr(doc.name)}">
        <button class="ul-upload-btn" style="margin:0;padding:8px 14px;font-size:13px" data-ul-rename-ok="${escAttr(doc.id)}">Speichern</button>
        <button class="del-btn-wide" data-ul-rename-cancel="${escAttr(doc.id)}">Abbrechen</button>
      </div>`;
    });
    html += `</div>`;
  }

  listEl.innerHTML = html;

  // Login-Link
  const loginLink = document.getElementById("ul-login-link");
  if(loginLink) loginLink.addEventListener("click", e => {
    e.preventDefault();
    document.getElementById("sync-modal").style.display = "flex";
  });

  // ---- Datei auswählen → Namens-Bestätigung anzeigen ----
  let ulPendingFile = null;
  const fileInput    = document.getElementById("ul-file-input");
  const uploadLabel  = document.getElementById("ul-upload-label");
  const nameConfirm  = document.getElementById("ul-name-confirm");
  const nameInput    = document.getElementById("ul-name-input");
  const progressWrap = document.getElementById("ul-progress-wrap");
  const progressFill = document.getElementById("ul-progress-fill");
  const progressLabel= document.getElementById("ul-progress-label");

  fileInput.addEventListener("change", function(){
    const file = this.files[0];
    if(!file) return;
    if(file.type !== "application/pdf"){ alert("Nur PDF-Dateien werden unterstützt."); return; }
    ulPendingFile = file;
    // Dateiname ohne Erweiterung als Vorschlag
    nameInput.value = file.name.replace(/\.pdf$/i, "");
    uploadLabel.style.display = "none";
    nameConfirm.style.display = "block";
    setTimeout(() => nameInput.focus(), 50);
  });

  document.getElementById("ul-name-cancel").addEventListener("click", () => {
    ulPendingFile = null;
    fileInput.value = "";
    nameConfirm.style.display = "none";
    uploadLabel.style.display = "";
  });

  document.getElementById("ul-name-ok").addEventListener("click", async () => {
    if(!ulPendingFile) return;
    const name    = nameInput.value.trim() || ulPendingFile.name;
    const id      = genId();
    const created = new Date().toISOString();
    const buffer  = await ulPendingFile.arrayBuffer();

    nameConfirm.style.display = "none";
    uploadLabel.style.display = "";

    await ulIDBSpeichere({ id, name, data: buffer, created });

    if(fsSyncUser){
      progressWrap.style.display = "block";
      progressFill.style.width = "0%";
      progressLabel.textContent = `⬆️ „${name}" wird gespeichert …`;
      try {
        await ulCloudSpeichere(fsSyncUser.uid, id, name, created, buffer, pct => {
          progressFill.style.width = Math.round(pct * 100) + "%";
        });
        progressLabel.textContent = "✅ Fertig";
      } catch(e) {
        progressLabel.textContent = "❌ Fehler: " + e.message;
      }
      setTimeout(() => { progressWrap.style.display = "none"; }, 1800);
    }

    ulPendingFile = null;
    fileInput.value = "";
    renderUnterlagen();
  });

  // ---- Dokument öffnen ----
  listEl.querySelectorAll("[data-ul-open]").forEach(el => {
    el.addEventListener("click", e => {
      if(e.target.closest("[data-ul-del]") || e.target.closest("[data-ul-rename]")) return;
      ulOeffneDoc(el.dataset.ulOpen, el.dataset.ulName);
    });
  });

  // ---- Umbenennen: ✏️ anzeigen/verstecken ----
  listEl.querySelectorAll("[data-ul-rename]").forEach(btn => {
    btn.addEventListener("click", e => {
      e.stopPropagation();
      const id      = btn.dataset.ulRename;
      const renameEl= document.getElementById(`ul-rename-${id}`);
      const isOpen  = renameEl.style.display !== "none";
      // alle anderen schließen
      listEl.querySelectorAll(".ul-inline-rename").forEach(el => { el.style.display = "none"; });
      if(!isOpen){
        renameEl.style.display = "flex";
        document.getElementById(`ul-rename-input-${id}`).focus();
      }
    });
  });

  listEl.querySelectorAll("[data-ul-rename-cancel]").forEach(btn => {
    btn.addEventListener("click", e => {
      e.stopPropagation();
      document.getElementById(`ul-rename-${btn.dataset.ulRenameCancel}`).style.display = "none";
    });
  });

  listEl.querySelectorAll("[data-ul-rename-ok]").forEach(btn => {
    btn.addEventListener("click", async e => {
      e.stopPropagation();
      const id       = btn.dataset.ulRenameOk;
      const neuerName= document.getElementById(`ul-rename-input-${id}`).value.trim();
      if(!neuerName) return;
      await ulUmbenennen(id, neuerName);
      renderUnterlagen();
    });
  });

  // ---- Dokument löschen ----
  listEl.querySelectorAll("[data-ul-del]").forEach(btn => {
    btn.addEventListener("click", async e => {
      e.stopPropagation();
      if(!confirm("Dokument löschen?")) return;
      const id = btn.dataset.ulDel;
      await ulIDBLoesche(id);
      if(fsSyncUser) await ulCloudLoesche(fsSyncUser.uid, id);
      renderUnterlagen();
    });
  });
}

document.getElementById("ul-viewer-close").addEventListener("click", ulSchliesseViewer);

/* ---------- Ansitzangeln ---------- */
function renderAnsitzAngeln(){
  const el = $("#ansitz");

  function preisklasse(titel, emoji, items, hinweis){
    const rows = items.map(([label, wert, url]) => {
      const val = url
        ? `<a class="shop-link" href="${url}" target="_blank" rel="noopener noreferrer">${wert}</a>`
        : `<b>${wert}</b>`;
      return `<div class="row"><span>${label}</span><span>${val}</span></div>`;
    }).join("");
    const hinweisHTML = hinweis ? `<div class="need-hinweis" style="margin-top:6px">${hinweis}</div>` : "";
    return `<article class="ansatz" style="margin-bottom:12px">
      <div class="ansatz-head">
        <span class="badge machbar">${emoji} ${titel}</span>
      </div>
      <div class="ansatz-body">
        ${rows}
        ${hinweisHTML}
      </div>
    </article>`;
  }

  const html = `
    <div class="k-intro card">
      <h2>⚓ Ansitzangeln – Setups</h2>
      <p>Karpfen und Aal – die klassischen Ansitzfische. Der entscheidende Unterschied sitzt
      nicht im Preis, sondern in Rutenlänge und Testkurve: Karpfen braucht Wurfweite und
      Rückgrat (3,00 lb), Aal braucht eine weichere Spitze für feine Bisse und kommt meist
      mit kürzeren Distanzen aus (2,25–2,75 lb). Preise sind Richtwerte – vor Kauf immer
      aktuell prüfen.</p>
    </div>

    <div class="k-intro card" style="margin-bottom:8px">
      <h2>🐟 Karpfen</h2>
      <p class="k-hint">Freie Hegehaken, Boilies oder Mais – ruhiger Ansitz an See oder Kanal.
      Freilaufrolle (Baitrunner) ist Pflicht: Karpfen nehmen den Köder, ziehen Schnur ab –
      erst dann anschlagen.</p>
    </div>

    ${preisklasse("Einsteiger · ~100–110 €", "🟢", [
      ["Rute", "Daiwa Black Widow XT Carp · 3,60 m · 3,00 lb · ca. 54 €",
        "https://www.angelsport.de/daiwa-karpfenrute-black-widow-xt-tele-carp-xt-tele-carp_0225557.html"],
      ["Rolle", "DAM Quick 2 FS · Gr. 6000 · ca. 30–40 €",
        "https://www.gerlinger.de/DAM-Rolle-Quick-2-FS-Freilaufrolle-verschiedene-Groessen-Karpfenrolle-Ansitzrolle"],
      ["Schnur", "Cormoran Profiline Karpfen · 0,35 mm / 10 kg · 400 m",
        "https://www.angeljoe.de/Cormoran-Profiline-Schnur-Karpfen-400m-Braun-0-35mm-10kg/110421"]
    ])}

    ${preisklasse("Mittelklasse · ~150–200 €", "🟡", [
      ["Rute", "Sportex Catapult CS-4 Carp · 3,60 m · 3,00 lb – Carbon-Blank, Fuji-Rollenhalter, 10 J. Garantie",
        "https://fischdeal.de/t/karpfenruten/sportex-catapult-cs-4-carp-karpfenrute-12ft-3-00lb"],
      ["Rolle", "Shimano Baitrunner DL 6000 – Referenz im Karpfensegment",
        "https://www.angelsport.de/shimano-freilaufrolle-baitrunner-dl_0120859.html"],
      ["Schnur", "Cormoran Profiline Karpfen 0,35 mm (wie Einsteiger) oder Fox Exocet Fluoro Mono", ""]
    ])}

    ${preisklasse("Gehoben · 250 €+", "🔴", [
      ["Rute", "Fox Horizon X3 · 12 ft · ca. 93 €",
        "https://www.carp-world.de/Fox-Horizon-X3"],
      ["Rolle", "Shimano Baitrunner XT-A Medium · ca. 150–195 € (bei Askari teils ausverkauft)",
        "https://www.angelplatz.de/shimano-medium-baitrunner-xt-a-lc-freilaufrolle--ro0041"],
      ["Schnur", "Geflochtene 0,20 mm + Monofil-Schlagschnur für max. Wurfweite, alternativ Prologic Mimicry Mirage XP", ""]
    ])}

    <div class="k-intro card" style="margin-top:20px;margin-bottom:8px">
      <h2>🐍 Aal</h2>
      <p class="k-hint">Dämmerungs- und Nachtfisch. Weiche Rutenspitze wichtig – Aal zieht
      zögerlich. Fein einstellbarer Freilauf ist hier noch wichtiger als beim Karpfen.</p>
    </div>

    ${preisklasse("Einsteiger · ~50–65 €", "🟢", [
      ["Rute", "Cormoran Topfish Aal · 1,80 m · 50–100 g · mit Knicklichthalter · ca. 20–23 €",
        "https://www.fang-shop.de/angelruten/steckruten/2220/cormoran-topfish-aalrute-2tlg-50-100g-1-80m-2-10m-aal-grundangel-allround-boot"],
      ["Rolle", "DAM Quick 1 FS · Gr. 3000/4000",
        "https://akm-angelgeraete.de/DAM-Quick-1-FS-Freilaufrolle"],
      ["Schnur", "Monofil 0,25–0,30 mm", ""]
    ])}

    ${preisklasse("Mittelklasse · ~150–170 €", "🟡", [
      ["Rute", "Karpfenrute 2,25–2,5 lb · 3,60 m – weicher als Karpfenmodell, mehr Reichweite als Einsteiger-Aalrute",
        "https://www.angelgeraete-bode.de/ruten/karpfenruten/"],
      ["Rolle", "Daiwa Black Widow BR LT 4000-C · ca. 65–77 € – superfein einstellbarer Freilauf für scheue Bisse",
        "https://www.gerlinger.de/Daiwa-Freilaufrolle-Black-Widow-BR-LT"],
      ["Schnur", "Monofil 0,28–0,30 mm", ""]
    ])}

    ${preisklasse("Gehoben · Schätzung", "🔴", [
      ["Rute", "Sportex Catapult oder Fox Horizon (wie Karpfen), aber 2,25–2,75 lb statt 3,00 lb", ""],
      ["Rolle", "Shimano Baitrunner XT-A in kleinerer Größe (4000)", ""],
      ["Schnur", "Monofil, ggf. Fluorocarbon-Vorfach gegen Abrieb an Aal-Verstecken", ""]
    ], "Kein etabliertes Aal-Premiumsegment – die meisten erfahrenen Angler greifen hier ohnehin auf Karpfenruten zurück.")}

    <div class="need-hinweis" style="margin-top:20px;padding:14px 16px;font-size:13.5px">
      💡 <b>Wichtiger Hinweis:</b> Bei Aal „Gehoben" zahlst du im Wesentlichen für
      Freilauf-Feinmechanik drauf – die Rute bringt kaum Mehrwert, weil Aal keine
      Präzisionswürfe verlangt. Das Geld ist beim Karpfen-Setup in der Gehoben-Stufe
      besser investiert.
    </div>
  `;

  el.innerHTML = html;
}

/* ---------- Tabs ---------- */
document.querySelectorAll(".tab").forEach(t => {
  t.addEventListener("click", () => {
    document.querySelectorAll(".tab").forEach(x => x.classList.remove("active"));
    document.querySelectorAll(".view").forEach(v => v.classList.remove("active"));
    t.classList.add("active");
    $("#view-" + t.dataset.view).classList.add("active");
    if(t.dataset.view === "faenge") fsOnTabShown();
    if(t.dataset.view === "lav") lavOnTabShown();
    if(t.dataset.view === "tagebuch"){ TB_VIEW = "list"; TB_DETAIL = null; renderTagebuch(); }
    if(t.dataset.view === "einsteiger") renderEinsteiger();
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
renderAngelmethoden();
renderCheckliste();
renderTagescheck();
renderFaengeTop();
renderSaison();
renderLavGewaesser();
renderWochenende();
renderAnsitzAngeln();
renderUnterlagen();
renderTagebuch();
let EI_SUBVIEW = "start"; // Starthilfe sub-tab
renderEinsteiger();
(async function(){try{const e=await tbIDBLadeAlle();tbUpdateStatsCache(e);}catch(err){}})();

/* ---------- Heute-dabei-Filter (Berater) ---------- */
let HEUTE_DABEI = new Set(); // leer = alle Setups verfügbar

function renderHeuteDabeiUI(){
  const wrap = document.getElementById("heute-dabei-wrap");
  if(!wrap) return;
  const alleSetups = [...Object.values(AKTUELL), ...Object.values(ZUSATZ.setups || {})];
  if(alleSetups.length === 0){ wrap.innerHTML = ""; return; }
  const pills = Object.entries(AKTUELL).map(([key, s]) => {
    const on = HEUTE_DABEI.has(key);
    return `<button class="setup-pill${on ? " on" : ""}" data-hd="${key}" title="${s.name}">${s.name.replace(/^Setup \d+ – /,"")}</button>`;
  }).join("");
  const hatAuswahl = HEUTE_DABEI.size > 0;
  const hintText = hatAuswahl
    ? `${HEUTE_DABEI.size} Setup(s) ausgewählt · Ergebnisse gefiltert`
    : "Nichts ausgewählt → alle Methoden werden angezeigt";
  wrap.innerHTML = `<div class="heute-dabei-wrap">
    <div class="heute-dabei-label">
      <span>🎒 Heute dabei</span>
      ${hatAuswahl ? `<button class="heute-dabei-reset" id="hd-reset-btn">Alle abwählen</button>` : ""}
    </div>
    <div class="heute-dabei-row">${pills}</div>
    <div class="heute-dabei-hint">${hintText}</div>
  </div>`;
  wrap.querySelectorAll(".setup-pill").forEach(btn => {
    btn.addEventListener("click", () => {
      const key = btn.dataset.hd;
      if(HEUTE_DABEI.has(key)) HEUTE_DABEI.delete(key);
      else HEUTE_DABEI.add(key);
      renderHeuteDabeiUI();
      if(fischSel.value) berechne();
    });
  });
  const resetBtn = document.getElementById("hd-reset-btn");
  if(resetBtn) resetBtn.addEventListener("click", () => { HEUTE_DABEI = new Set(); renderHeuteDabeiUI(); if(fischSel.value) berechne(); });
}
renderHeuteDabeiUI();

/* ============================================================
   ANGELTAGEBUCH
   ============================================================ */

/* --- IDB --- */
const TB_DB_NAME = "angeltagebuch_db", TB_STORE = "eintraege";
function tbOpenDB(){
  return new Promise((res,rej) => {
    const req = indexedDB.open(TB_DB_NAME, 1);
    req.onupgradeneeded = e => e.target.result.createObjectStore(TB_STORE, {keyPath:"id"});
    req.onsuccess = e => res(e.target.result);
    req.onerror = e => rej(e.target.error);
  });
}
async function tbIDBLadeAlle(){
  const db = await tbOpenDB();
  return new Promise((res,rej) => {
    const tx = db.transaction(TB_STORE,"readonly");
    const req = tx.objectStore(TB_STORE).getAll();
    req.onsuccess = () => res(req.result || []);
    req.onerror = () => rej(req.error);
  });
}
async function tbIDBSpeichere(entry){
  const db = await tbOpenDB();
  return new Promise((res,rej) => {
    const tx = db.transaction(TB_STORE,"readwrite");
    tx.objectStore(TB_STORE).put(entry);
    tx.oncomplete = res; tx.onerror = () => rej(tx.error);
  });
}
async function tbIDBLoesche(id){
  const db = await tbOpenDB();
  return new Promise((res,rej) => {
    const tx = db.transaction(TB_STORE,"readwrite");
    tx.objectStore(TB_STORE).delete(id);
    tx.oncomplete = res; tx.onerror = () => rej(tx.error);
  });
}

/* --- Firestore --- */
function tbFirestoreCol(uid){
  return firebase.firestore().collection("tagebuch").doc(uid).collection("eintraege");
}
async function tbCloudSpeichere(uid, entry){
  const {foto, ...data} = entry; // Foto bleibt lokal
  await tbFirestoreCol(uid).doc(entry.id).set(data);
}
async function tbCloudLoesche(uid, id){
  await tbFirestoreCol(uid).doc(id).delete();
}
async function tbCloudLadeAlle(uid){
  const snap = await tbFirestoreCol(uid).orderBy("datum","desc").get();
  return snap.docs.map(d => d.data());
}

/* --- State --- */
let TB_VIEW = "list"; // "list" | "form" | "detail"
let TB_EDIT = null;   // entry being edited (null = new)
let TB_DETAIL = null; // entry being viewed
let TB_CATCHES_TMP = []; // catch rows in form
let TB_FOTO_B64 = null;  // base64 photo in form
let TB_SUBVIEW = "liste"; // "liste" | "kalender" | "statistik"
let TB_KAL_YEAR = new Date().getFullYear();
let TB_KAL_MONTH = new Date().getMonth(); // 0-indexed
let TB_KAL_SELECTED = null; // "YYYY-MM-DD"
let TB_KAL_INITIALIZED = false;
let TB_STATS_CACHE = {}; // setupKey → {ausfluge, faenge}

/* --- Hilfsfunktionen --- */
function tbWetterEmoji(bewoelkung, luftdruck){
  const b = (bewoelkung||"").toLowerCase();
  if(b.includes("gewitter")) return "⛈";
  if(b.includes("regen")) return "🌧";
  if(b.includes("stark bewölkt")) return "☁️";
  if(b.includes("leicht bewölkt")) return "⛅";
  if(b.includes("klar") || b.includes("sonnig")) return luftdruck==="steigend" ? "🌤" : "☀️";
  return "🌥";
}
function tbSterneHTML(n, klickbar=false){
  return [1,2,3,4,5].map(i =>
    `<span class="tb-star${i<=n?" on":""}${klickbar?` data-tbstar="${i}"`:""}">★</span>`
  ).join("");
}
function tbDatumAnzeige(iso){
  if(!iso) return "–";
  const d = new Date(iso+"T00:00:00");
  return d.toLocaleDateString("de-DE",{weekday:"short",day:"numeric",month:"short",year:"numeric"});
}
function tbDauerText(von, bis){
  if(!von && !bis) return "";
  if(von && bis) return `${von} – ${bis} Uhr`;
  return von ? `ab ${von} Uhr` : `bis ${bis} Uhr`;
}
function tbFaengeText(faenge){
  if(!faenge || faenge.length === 0) return "Keine Fänge";
  const total = faenge.length;
  const arten = [...new Set(faenge.map(f=>f.art))].join(", ");
  return `${total}× ${arten}`;
}

/* ===== STARTHILFE – Fischbestimmung ===== */
const EI_FISH_ID = [
  { emoji:"🐊", name:"Hecht", lat:"Esox lucius",
    merkmale:["Langgestreckter Körper, entenfömige Schnauze","Grün-gelb mit hellen Flecken","Rücken- und Afterflosse weit hinten, nah beieinander","Maul mit vielen scharfen Zähnen – Vorsicht beim Abhaken!"],
    verwechslung:"Kaum verwechselbar – der Schnabel ist unverwechselbar.", fundort:"Seen, langsame Flüsse, Schilf" },
  { emoji:"🎣", name:"Zander", lat:"Sander lucioperca",
    merkmale:["Langgestreckt, olivgrün mit dunklen Querstreifen","Große glasige Augen (Dämmerungsaktiv)","Zwei Rückenflossen – erste mit Stacheln","Maul klein mit langen Reißzähnen"],
    verwechslung:"Wird oft mit Barsch verwechselt – Zander ist schlanker, blasser, keine Querbänder im Vorderbereich so ausgeprägt.", fundort:"Tiefe Seen, große Flüsse (Elbe, Eider)" },
  { emoji:"🐟", name:"Flussbarsch", lat:"Perca fluviatilis",
    merkmale:["5–9 dunkle Querstreifen auf grün-gelbem Körper","Erste Rückenflosse stachelig, zweite weich","Bauchflossen orange-rot","Relativ kleiner Mund"],
    verwechslung:"Jungzander kann ähnlich aussehen – Barsch hat deutlichere Streifen und rote Bauchflossen.", fundort:"Fast überall – Seen, Flüsse, Kanäle" },
  { emoji:"🐠", name:"Forelle (Bach-/Regenbogen)", lat:"Salmo trutta / Oncorhynchus mykiss",
    merkmale:["Bachforelle: braun-olivgrün, rote Punkte mit blauem Hof","Regenbogenforelle: silbrig mit pinkem Längsstreifen, schwarze Punkte","Fettflosse zwischen Rücken- und Schwanzflosse (kleines Rudiment)","Strömungsliebend"],
    verwechslung:"Bachforelle vs. Regenbogenforelle: Regenb. hat Pinksstreifen, BF hat rote Punkte.", fundort:"Klare, sauerstoffreiche Gewässer, Forellenseen" },
  { emoji:"🐟", name:"Meerforelle", lat:"Salmo trutta trutta",
    merkmale:["Silber wie ein Lachs, schwarze X-förmige Flecken","Dickerer Körper als Bachforelle","Schwanz leicht gegabelt","Fettflosse vorhanden"],
    verwechslung:"Kleiner Lachs – Unterschied: Meerforelle hat mehr Flecken unterhalb der Seitenlinie.", fundort:"Küste SH/Ostsee, Mündungsgewässer, Nov–Jan" },
  { emoji:"🐍", name:"Aal", lat:"Anguilla anguilla",
    merkmale:["Schlangenförmig, dunkelbraun-grün","Schuppenlos wirkend (sehr kleine Schuppen eingebettet)","Lange Rücken-, Schwanz- und Afterflosse verschmelzen","Unterkiefer länger als Oberkiefer"],
    verwechslung:"Unverwechselbar durch Körperform.", fundort:"Alle Gewässer, hauptsächlich nachts aktiv" },
  { emoji:"🎏", name:"Karpfen", lat:"Cyprinus carpio",
    merkmale:["Großer, hochrückiger Körper mit großen Schuppen","Zwei Barteln an jedem Mundwinkel (4 total)","Mundwinkel rüsselartig vorstreckbar","Olive-braun bis goldgelb"],
    verwechslung:"Schleie ähnlich aber kleiner, keine Barteln so ausgeprägt.", fundort:"Seen, Teiche, langsame Flüsse" },
  { emoji:"🐟", name:"Schleie", lat:"Tinca tinca",
    merkmale:["Kleiner Körper, sehr kleine eingebettete Schuppen","Olive-dunkelgrün, Bauch gelblich","Auffällig orange-rote Augen","Sehr kleine Barteln an Mundwinkel, abgerundete Flossen"],
    verwechslung:"Kleiner Karpfen – aber Schleie hat orange Augen und kleinere Schuppen.", fundort:"Krautreiche Stillgewässer, Schilf" },
  { emoji:"🐟", name:"Rotauge", lat:"Rutilus rutilus",
    merkmale:["Silbrig, Bauch weißlich","Rote Iris und rote Flossen (Brustflossen orange)","Schlanker als Güster/Blei","Endständiges Maul"],
    verwechslung:"Rotfeder hat höheren Rücken, rötlichere Flossen und goldgelbe Iris.", fundort:"Fast überall – häufigster Weißfisch" },
  { emoji:"🐟", name:"Döbel (Aitel)", lat:"Squalius cephalus",
    merkmale:["Kräftiger, rundlicher Körper","Große Schuppen mit dunklem Rand (Netzzeichnung)","Bronze-grünlicher Rücken, silberne Flanken","Breiter Kopf, großes Maul"],
    verwechslung:"Hasel ähnlich – Döbel hat breiteren Kopf und ist deutlich kräftiger.", fundort:"Fließgewässer: Eider, Treene, Schwentine" },
  { emoji:"🐟", name:"Dorsch (Kabeljau)", lat:"Gadus morhua",
    merkmale:["Drei Rückenflossen, zwei Afterflossen","Charakteristischer Bartel am Unterkiefer","Mottled braun-grün, weißliche Seitenlinie","Großes Maul"],
    verwechslung:"Wittling ähnlich – Dorsch hat Bartel, Wittling nicht.", fundort:"Ostsee, Nordsee – Bootsangeln und Mole" },
  { emoji:"🐟", name:"Flunder", lat:"Platichthys flesus",
    merkmale:["Flacher Plattfisch – beide Augen auf einer Seite","Beide Seiten braun-grün mit orangen Punkten möglich","Seitenlinie mit knöchernen Höckern entlang Rückenflosse","Maul klein, seitlich"],
    verwechslung:"Scholle hat rote Punkte, Flunder hat Knochenhöcker an Seitenlinie.", fundort:"Küste, Mündungen, Brackwasser (Eider, Elbe)" },
];

function eiRenderBestimmung(){
  return `<div class="ei-best-wrap">
    <div class="ei-best-intro">Klicke auf einen Fisch für Bestimmungsmerkmale und wo du ihn in SH/HH findest.</div>
    <div class="ei-best-grid">${EI_FISH_ID.map((f,i)=>`
      <div class="ei-best-card" data-fishidx="${i}">
        <div class="ei-best-emoji">${f.emoji}</div>
        <div class="ei-best-name">${f.name}</div>
        <div class="ei-best-lat">${f.lat}</div>
      </div>`).join("")}
    </div>
    <div class="ei-best-detail" id="ei-best-detail"></div>
  </div>`;
}

/* ===== STARTHILFE – Filetieren ===== */
const EI_FILET = [
  { name:"Barsch", emoji:"🐟", schwierigkeit:"★☆☆ Einfach",
    hinweis:"Keine Y-Gräten! Ideal zum Üben. Schuppen müssen vor dem Filetieren entfernt werden.",
    schritte:[
      "Schuppen entfernen: Mit Schuppenmesser oder Messerrücken gegen den Strich schuppen (unter Wasser oder in Tüte – Schuppen fliegen!)",
      "Kopf abschneiden: Schräg hinter den Kiemendeckeln, bis zum Rückgrat schneiden",
      "Bauch aufschneiden: Von der Schnittlinie bis zur Schwanzwurzel, Eingeweide herausnehmen",
      "Filet schneiden: Messer flach ans Rückgrat, mit langen Zügen von Kopf zum Schwanz entlangschneiden",
      "Rippen umgehen: Im Bauchbereich Messer leicht schräg führen und über die Rippen gleiten",
      "Haut abziehen (optional): Filet mit Haut nach unten, Messer flach zwischen Haut und Fleisch – leicht sägend ziehen",
      "Zweite Seite genauso – fertiges Filet kontrollieren und Rippengräten ggf. mit Pinzette entfernen",
    ]},
  { name:"Forelle", emoji:"🐠", schwierigkeit:"★☆☆ Einfach",
    hinweis:"Grätenarm, kein Schuppen nötig (Haut ist zart und essbar). Kann auch im Ganzen zubereitet werden.",
    schritte:[
      "Schleimschicht abwaschen: Kurz unter kaltem Wasser abspülen",
      "Bauch öffnen: Von der Kehle bis zur Schwanzwurzel aufschlitzen – Eingeweide herausnehmen",
      "Blutrinne putzen: Die dunkle Rinne entlang des Rückgrats mit Daumennagel oder Löffelrücken ausreiben",
      "Ganz zubereiten (Forelle Müllerin): Fertig – würzen, mehlieren, in Butter braten",
      "Oder filetieren: Messer hinter dem Kopf schräg ansetzen bis auf das Rückgrat",
      "Entlang des Rückgrats nach hinten schneiden – mit langen, ruhigen Zügen",
      "Bauchgräten ggf. mit Pinzette ziehen – fertig",
    ]},
  { name:"Hecht", emoji:"🐊", schwierigkeit:"★★★ Anspruchsvoll",
    hinweis:"Y-Gräten sind das Hauptproblem. Zwei Methoden: Dreieck herausschneiden (weniger Fleisch) oder Pinzette (geduldiger aber mehr Ausbeute). Unter 40 cm kaum lohnenswert.",
    schritte:[
      "Schuppen entfernen: Hecht hat kleine Schuppen – gründlich gegen den Strich",
      "Filets abschneiden: Wie Barsch – seitlich am Rückgrat von Kopf zu Schwanz",
      "Bauchgräten entfernen: Den Y-förmigen Grätenstreifen ertasten – er verläuft von der Mitte schräg nach unten-vorne",
      "Methode 1 – Dreieck: Über und unter den Y-Gräten schneiden → dreieckigen Grätenstreifen herauslösen (Fleischverlust ~20%)",
      "Methode 2 – Pinzette: Filet gegen Licht halten, Y-Gräten sehen, jede einzeln mit Pinzette fassen und herausziehen",
      "Haut abziehen: Wie beim Barsch – Hecht-Haut ist fest, funktioniert gut",
      "Tipp: Hecht ab 60 cm lohnt sich wirklich – kleiner Hecht hat zu viel Grätenaufwand für zu wenig Fleisch",
    ]},
  { name:"Zander", emoji:"🎣", schwierigkeit:"★★☆ Mittel",
    hinweis:"Wenig Gräten, festes weißes Fleisch – das Edelfilet. Ähnlich wie Barsch, aber keine Schuppen-Probleme.",
    schritte:[
      "Schuppen entfernen: Zander hat mittelgroße Schuppen – gründlich schuppen",
      "Kopf abschneiden hinter Kiemendeckeln",
      "Filet abschneiden: Messer flach ans Rückgrat, von Kopf zu Schwanz",
      "Im Bauchbereich leicht schräg über Rippen gleiten",
      "Rippen herausschneiden oder mit Pinzette entfernen",
      "Haut abziehen: Sehr zu empfehlen – Zanderhaut hat starken Eigengeschmack",
      "Ergebnis: Weißes festes Filet, fast grätenfrei – Top-Qualität",
    ]},
];

function eiRenderFiletieren(){
  return `<div class="ei-filet-wrap">
    <div class="ei-best-intro">Schritt-für-Schritt-Anleitungen für die häufigsten Fänge. Immer mit scharfem Messer arbeiten – stumpf ist gefährlicher als scharf.</div>
    ${EI_FILET.map((f,i)=>`
    <div class="ei-filet-block">
      <div class="ei-filet-head" data-filetidx="${i}">
        <span>${f.emoji} ${f.name}</span>
        <span class="ei-filet-schwier">${f.schwierigkeit}</span>
        <span class="ei-filet-chevron">▼</span>
      </div>
      <div class="ei-filet-body" id="ei-filet-${i}" style="display:none">
        <div class="ei-filet-hinweis">💡 ${f.hinweis}</div>
        <div class="ei-steps">
          ${f.schritte.map((s,si)=>`<div class="ei-step">
            <div class="ei-step-num">${si+1}</div>
            <div class="ei-step-body"><div class="ei-step-text">${s}</div></div>
          </div>`).join("")}
        </div>
      </div>
    </div>`).join("")}
  </div>`;
}

/* ===== STARTHILFE – Rezepte ===== */
const EI_REZEPTE = [
  { name:"Gebratenes Barschfilet", emoji:"🍳", fisch:"Barsch", zeit:"15 Min.",
    zutaten:["Barschfilets (mit oder ohne Haut)","Mehl zum Wenden","Butter oder Öl","Salz, Pfeffer","Zitrone","Optional: Knoblauch, frischer Dill"],
    schritte:[
      "Filets trocken tupfen, beidseitig salzen und pfeffern",
      "Mehl auf einen Teller, Filets darin wenden und abklopfen",
      "Pfanne auf mittlere-hohe Hitze, Butter zerlassen bis sie leicht schäumt",
      "Filets einlegen – mit Haut zuerst die Hautseite, 2–3 Min. bis die Haut knusprig ist",
      "Wenden, weitere 1–2 Min. von der anderen Seite – Fisch ist fertig wenn er blättert",
      "Mit Zitronensaft beträufeln, sofort servieren",
      "Beilage: Kartoffeln, Salat oder Brot – was du magst",
    ]},
  { name:"Forelle Müllerin", emoji:"🐠", fisch:"Forelle", zeit:"20 Min.",
    zutaten:["1 ganze Forelle (ausgenommen)","Mehl","Butter (reichlich)","Salz, Pfeffer","Zitrone","Frische Petersilie"],
    schritte:[
      "Forelle innen und außen waschen, trocken tupfen",
      "Innen salzen und pfeffern, optional Zitronenscheiben in den Bauch",
      "Forelle in Mehl wenden, überschuss abschütteln",
      "Butter in großer Pfanne auf mittlerer Hitze zerlassen",
      "Forelle einlegen – 5–6 Min. je Seite bis goldbraun",
      "Fertig wenn Fleisch sich leicht vom Rückgrat löst – mit Gabel testen",
      "Auf dem Teller mit restlicher Bratbutter und Zitrone beträufeln",
      "Tipp: An der Seite das Filet direkt am Tisch vom Rückgrat lösen",
    ]},
  { name:"Hecht paniert", emoji:"🐊", fisch:"Hecht", zeit:"25 Min.",
    zutaten:["Hechtfilets (Y-Gräten entfernt)","Mehl → Ei → Semmelbrösel (Panierstraße)","Öl zum Braten","Salz, Pfeffer, Paprika","Zitrone, Remoulade"],
    schritte:[
      "Filets in mundgerechte Stücke schneiden – Y-Gräten nochmals prüfen",
      "Salzen, pfeffern, etwas Paprika",
      "Panierstraße aufbauen: Teller mit Mehl, Schüssel mit verquirltem Ei, Teller mit Bröseln",
      "Filets nacheinander durch Mehl, Ei, Brösel – gut andrücken",
      "Öl in Pfanne auf mittlere Hitze – genug Öl dass Filets halb drin schwimmen",
      "Ca. 3–4 Min. je Seite bis goldbraun und knusprig",
      "Auf Küchenpapier abtropfen lassen",
      "Mit Remoulade und Zitrone servieren – Hecht paniert ist ein Klassiker",
    ]},
  { name:"Zanderfilet in Zitronenbutter", emoji:"🎣", fisch:"Zander", zeit:"15 Min.",
    zutaten:["Zanderfilets (ohne Haut)","Butter","1 Zitrone (Saft + Schale)","Salz, weißer Pfeffer","Frischer Thymian oder Petersilie","Optional: Kapern"],
    schritte:[
      "Filets trocken tupfen, salzen und pfeffern",
      "Etwas Butter in Pfanne, mittlere Hitze",
      "Filets 2–3 Min. je Seite – Zander gart schnell, nicht zu lange!",
      "Aus der Pfanne nehmen, warm stellen",
      "In gleicher Pfanne restliche Butter aufschäumen lassen",
      "Zitronensaft und -schale dazu, kurz aufkochen, Kräuter rein",
      "Optional: ein paar Kapern mitbraten",
      "Butter-Sauce über Filets geben – Zanderfilet ist die feinste Süßwasser-Küche",
    ]},
];

function eiRenderRezepte(){
  return `<div class="ei-rez-wrap">
    <div class="ei-best-intro">Einfache Grundrezepte für deinen ersten Fang. Kein Kochbuch nötig – alles in unter 25 Minuten.</div>
    ${EI_REZEPTE.map((r,i)=>`
    <div class="ei-filet-block">
      <div class="ei-filet-head" data-rezidx="${i}">
        <span>${r.emoji} ${r.name}</span>
        <span class="ei-filet-schwier">⏱ ${r.zeit}</span>
        <span class="ei-filet-chevron">▼</span>
      </div>
      <div class="ei-filet-body" id="ei-rez-${i}" style="display:none">
        <div class="ei-rez-zutaten">
          <div class="ei-chart-title">🛒 Zutaten</div>
          ${r.zutaten.map(z=>`<div class="ei-check-item">• ${z}</div>`).join("")}
        </div>
        <div class="ei-steps" style="margin-top:10px">
          ${r.schritte.map((s,si)=>`<div class="ei-step">
            <div class="ei-step-num">${si+1}</div>
            <div class="ei-step-body"><div class="ei-step-text">${s}</div></div>
          </div>`).join("")}
        </div>
      </div>
    </div>`).join("")}
  </div>`;
}

/* ===== STARTHILFE – Köder-Guide ===== */
function eiRenderKoeder(){
  const monat = new Date().getMonth(); // 0-indexed
  const jahreszeit = monat>=2&&monat<=4?"Frühling":monat>=5&&monat<=7?"Sommer":monat>=8&&monat<=10?"Herbst":"Winter";
  const wtemp = monat>=5&&monat<=8?"warm (>15°C)":monat>=3&&monat<=4||monat===9?"mittel (8–15°C)":"kalt (<8°C)";
  const KOEDER = [
    { fisch:"🐊 Hecht", aktiv:monat>=2&&monat<=4||monat>=8&&monat<=10,
      top:[
        {name:"Gummifisch (10–20 cm)",wann:"Ganzjährig, an Struktur"},
        {name:"Wobbler (schwimmend/tauchend)",wann:"Sommer früh morgens, Herbst"},
        {name:"Popper / Oberflächenköder",wann:"Sommer Dämmerung – spektakulär!"},
        {name:"Großer Blinker / Spinner",wann:"Herbst, trübes Wasser"},
      ],
      tipp:"Im Sommer früh morgens oder abends – tagsüber sucht Hecht Schatten und tiefen Stellen. Im Herbst ganzjährig aktiv."},
    { fisch:"🎣 Zander", aktiv:monat>=8&&monat<=11||monat<=1,
      top:[
        {name:"Gummifisch (5–10 cm) auf Jig",wann:"Ganzjährig, am Grund!"},
        {name:"Twister in weiß/chartreuse",wann:"Trübes Wasser, Dämmerung"},
        {name:"Wobbler (tief tauchend)",wann:"Herbst/Winter"},
        {name:"Toter Köderfisch auf Jig",wann:"Winter, kalt"},
      ],
      tipp:"Zander beißt am Grund und bei schlechtem Licht (Dämmerung, trübes Wasser, Nacht). Langsame Führung!"},
    { fisch:"🐟 Barsch", aktiv:true,
      top:[
        {name:"Micro-Gummifisch (3–6 cm)",wann:"Ganzjährig, vielseitig"},
        {name:"Spinner / Mini-Blinker",wann:"Sommer, klares Wasser"},
        {name:"Twister / Grub",wann:"Herbst, tiefere Stellen"},
        {name:"Tauwurm / Rotwurm auf Pose",wann:"Ganzjährig, sicher!"},
      ],
      tipp:"Barsch beißt fast immer. Als Anfänger zuerst Barsch üben – schult das Gespür für Bisse und Führung."},
    { fisch:"🐠 Forelle (Fließgewässer)", aktiv:monat>=2&&monat<=9,
      top:[
        {name:"Kleine Spoons (2–5 g, gold/silber)",wann:"Frühjahr/Herbst"},
        {name:"Mini-Wobbler",wann:"Klares Wasser"},
        {name:"Tauwurm (Naturköder)",wann:"Ganzjährig, nach Regen"},
        {name:"Kunstfliege",wann:"Fliegenfischer-Methode, sehr effektiv"},
      ],
      tipp:"Forellen stehen in Strömung – immer von unten anschleichen, Schatten vermeiden. Bei Put&Take: Spoons zuerst."},
    { fisch:"🐟 Rotauge / Weißfisch", aktiv:true,
      top:[
        {name:"Tauwurm / Rotwurm auf Pose",wann:"Sicherste Methode"},
        {name:"Mais (gekocht oder aus Dose)",wann:"Karpfen/Rotauge im Sommer"},
        {name:"Brot / Teig",wann:"Oberflächenangeln im Sommer"},
        {name:"Kleine Schwebpose mit Mückenlarve",wann:"Feines Angeln"},
      ],
      tipp:"Für den ersten garantierten Fang: Pose + Tauwurm an Struktur. Weißfisch ist überall und beißt zuverlässig."},
    { fisch:"🐟 Meerforelle (Küste)", aktiv:monat>=9&&monat<=1||monat===0,
      top:[
        {name:"Wobbler (7–11 cm, schwimmend)",wann:"Früh morgens, Abenddämmerung"},
        {name:"Blinker (gold/silber)",wann:"Trübe See, Wind"},
        {name:"Gummifisch schlank (Sandaal-Imitat)",wann:"Sommer an der Küste"},
        {name:"Streamer (Fliegenfischen)",wann:"Die Königsdisziplin"},
      ],
      tipp:"Meerforelle angelt man an der Küste von Oktober bis Januar. Früh aufstehen lohnt sich – Bisse meist in der ersten Stunde nach Sonnenaufgang."},
  ];

  return `<div class="ei-koeder-wrap">
    <div class="ei-koeder-season">
      <span class="ei-season-badge">📅 ${jahreszeit}</span>
      <span class="ei-season-badge">🌡️ Wasser ${wtemp}</span>
    </div>
    <div class="ei-best-intro">Köder-Empfehlungen nach Zielfisch und aktueller Jahreszeit. Grüner Kopf = jetzt besonders aktiv.</div>
    ${KOEDER.map(k=>`
    <div class="ei-koeder-card${k.aktiv?" ei-koeder-aktiv":""}">
      <div class="ei-koeder-head">${k.fisch}${k.aktiv?` <span class="ei-aktiv-badge">Jetzt aktiv</span>`:""}</div>
      <div class="ei-koeder-items">
        ${k.top.map(t=>`<div class="ei-koeder-item"><b>${t.name}</b><span class="ei-koeder-wann">${t.wann}</span></div>`).join("")}
      </div>
      <div class="ei-koeder-tipp">💡 ${k.tipp}</div>
    </div>`).join("")}
  </div>`;
}

/* ===== STARTHILFE – Knoten-Trainer ===== */
const EI_KNOTEN = [
  { name:"Improved Clinch Knot", emoji:"🪢", einsatz:"Haken oder Wirbel an Mono / Fluorocarbon",
    warum:"Der wichtigste Knoten überhaupt. Schnell zu binden, hält 90–95% der Schnurbruchlast.",
    schritte:[
      "Schnur ca. 15 cm durch das Hakenöhr fädeln",
      "Das lange Ende 5–7× um die stehende Schnur wickeln (bei dickem FC: 4–5×)",
      "Das Schnurende durch die Schlaufe direkt am Hakenöhr führen",
      "Dann durch die große Schlaufe die entstanden ist führen",
      "Feucht machen (Speichel) – dann langsam und gleichmäßig festziehen",
      "Überschuss abschneiden, ~2 mm stehen lassen",
    ],
    tipp:"Immer anfeuchten vor dem Festziehen – trockenes Festziehen schwächt den Knoten durch Reibungshitze um bis zu 30%!"},
  { name:"Albright Knot", emoji:"🔗", einsatz:"Geflochtene Schnur auf Fluorocarbon-Vorfach",
    warum:"Verbindet Braid mit FC – verbindet zwei verschiedene Schnurmaterialien sicher. Schmalerer Knoten als FG, für Anfänger leichter zu binden.",
    schritte:[
      "FC-Vorfach: eine Schlaufe von ~5 cm Durchmesser formen, zwischen Daumen und Zeigefinger halten",
      "Braid-Ende durch die FC-Schlaufe fädeln, ~20 cm durchziehen",
      "Das Braid-Ende 10× fest und dicht um beide FC-Stränge wickeln – von der Schlaufe weg",
      "Braid-Ende zurück durch die FC-Schlaufe führen – auf der gleichen Seite wie es reingekommen ist",
      "Alles anfeuchten, gleichzeitig an allen 4 Enden festziehen",
      "Knoten muss sich gleichmäßig zusammenziehen – bei FC-Ende und Braid-Ende ziehen",
      "Überschuss kürzen – Braid-Ende sehr kurz, FC-Ende ~3 mm",
    ],
    tipp:"Tipp: Am Anfang mit dickerem Material (alte Schnur) üben bis die Abfolge sitzt. Der Knoten sieht kompliziert aus, ist aber nach 3× Üben routiniert."},
  { name:"Palomar Knot", emoji:"⚓", einsatz:"Haken oder Wirbel direkt an Geflochtener Schnur",
    warum:"Einfachster Knoten für Braid direkt am Haken. Hält nahezu 100% der Schnurbruchlast – einer der stärksten Knoten überhaupt.",
    schritte:[
      "Schnur doppelt nehmen: eine Schlaufe (~10 cm) durch das Hakenöhr fädeln",
      "Mit der Doppelschnur einen einfachen Überhandknoten machen (locker lassen!)",
      "Die Schlaufe über den Haken stülpen – komplett über den Hakenschaft",
      "Feucht machen, dann an Schnurende und Haken gleichzeitig festziehen",
      "Knoten sitzt oben am Hakenöhr – überschuss abschneiden",
    ],
    tipp:"Achtung: Bei größeren Haken mit breitem Bogen die Schlaufe groß genug machen, damit sie über den Haken passt. Beim Formen der Schlaufe darauf achten dass sie sauber liegt."},
];

function eiRenderKnoten(){
  return `<div class="ei-knoten-wrap">
    <div class="ei-best-intro">Die 3 Knoten die du als Anfänger wirklich brauchst – kein einziger mehr. Lerne diese drei und du bist für 90% aller Situationen gerüstet.</div>
    ${EI_KNOTEN.map((k,i)=>`
    <div class="ei-filet-block">
      <div class="ei-filet-head" data-knotidx="${i}">
        <span>${k.emoji} ${k.name}</span>
        <span class="ei-filet-schwier" style="font-size:11px">${k.einsatz}</span>
        <span class="ei-filet-chevron">▼</span>
      </div>
      <div class="ei-filet-body" id="ei-knot-${i}" style="display:none">
        <div class="ei-filet-hinweis">🎯 <b>Wann benutzen:</b> ${k.warum}</div>
        <div class="ei-steps">
          ${k.schritte.map((s,si)=>`<div class="ei-step">
            <div class="ei-step-num">${si+1}</div>
            <div class="ei-step-body"><div class="ei-step-text">${s}</div></div>
          </div>`).join("")}
        </div>
        <div class="ei-koeder-tipp">💡 ${k.tipp}</div>
      </div>
    </div>`).join("")}
  </div>`;
}

/* ===== STARTHILFE ===== */
function eiBehaltenCheck(fischId, laenge){
  const r = (typeof RECHT_SH !== "undefined") ? RECHT_SH[fischId] : null;
  const fisch = FISCHE.find(f => f.id === fischId);
  const name = fisch ? `${fisch.emoji} ${fisch.name}` : fischId;
  if(!r) return `<div class="ei-result-box ei-gelb">⚠️ Keine Daten für diesen Fisch – Erlaubnisschein prüfen.</div>`;

  const heute = new Date();
  const monat = heute.getMonth() + 1;

  // Ganzjährig geschützt
  if(r.schutz || r.schonzeit?.toLowerCase().includes("ganzjährig geschont")){
    return `<div class="ei-result-box ei-rot">
      <div class="ei-result-icon">🚫</div>
      <div class="ei-result-titel">Nicht entnehmen – ${name}</div>
      <div class="ei-result-text">${r.hinweis || r.schonzeit}</div>
    </div>`;
  }

  // Schonzeit prüfen
  const monate = parseSchonzeitMonate(r.schonzeit);
  const inSchonzeit = monate && monate.includes(monat);

  // Mindestmaß prüfen
  const mmMatch = r.mindestmass?.match(/(\d+)\s*cm/);
  const mmCm = mmMatch ? parseInt(mmMatch[1]) : null;
  const zuKlein = mmCm !== null && !isNaN(laenge) && laenge < mmCm;

  if(inSchonzeit && zuKlein){
    return `<div class="ei-result-box ei-rot">
      <div class="ei-result-icon">🚫</div>
      <div class="ei-result-titel">Zurücksetzen – Schonzeit UND zu klein</div>
      <div class="ei-result-text">Schonzeit: ${r.schonzeit}<br>Mindestmaß: ${r.mindestmass} – dein Fisch: ${laenge} cm<br>${r.hinweis||""}</div>
    </div>`;
  }
  if(inSchonzeit){
    return `<div class="ei-result-box ei-rot">
      <div class="ei-result-icon">📅</div>
      <div class="ei-result-titel">Zurücksetzen – Schonzeit</div>
      <div class="ei-result-text">Schonzeit für ${name}: ${r.schonzeit}<br>Fisch schonend zurücksetzen. ${r.hinweis||""}</div>
    </div>`;
  }
  if(zuKlein){
    return `<div class="ei-result-box ei-rot">
      <div class="ei-result-icon">📏</div>
      <div class="ei-result-titel">Zurücksetzen – zu klein</div>
      <div class="ei-result-text">Mindestmaß: ${r.mindestmass} – dein Fisch: ${laenge} cm<br>Noch ${mmCm - laenge} cm zu klein. Zurücksetzen und wachsen lassen. ${r.hinweis||""}</div>
    </div>`;
  }

  const hinweisBox = r.hinweis ? `<div class="ei-result-hinweis">💡 ${r.hinweis}</div>` : "";
  return `<div class="ei-result-box ei-gruen">
    <div class="ei-result-icon">✅</div>
    <div class="ei-result-titel">Behalten erlaubt – ${name}${!isNaN(laenge)?", "+laenge+" cm":""}</div>
    <div class="ei-result-text">Keine Schonzeit im ${heute.toLocaleDateString("de-DE",{month:"long"})}. Mindestmaß: ${r.mindestmass}.</div>
    ${hinweisBox}
  </div>`;
}

function renderEinsteiger(){
  const wrap = document.getElementById("einsteiger-main");
  if(!wrap) return;

  const tabs = [
    {k:"start",   icon:"📋", label:"Start"},
    {k:"bestimmung", icon:"🐟", label:"Bestimmung"},
    {k:"filetieren", icon:"🔪", label:"Filetieren"},
    {k:"rezepte", icon:"🍳", label:"Rezepte"},
    {k:"koeder",  icon:"🪱", label:"Köder"},
    {k:"knoten",  icon:"🪢", label:"Knoten"},
  ];
  const subTabsHTML = tabs.map(t=>
    `<button class="tb-subtab${EI_SUBVIEW===t.k?" active":""}" data-eisv="${t.k}">${t.icon} ${t.label}</button>`
  ).join("");

  const fischOptions = FISCHE
    .filter(f => RECHT_SH && RECHT_SH[f.id])
    .map(f => `<option value="${f.id}">${f.emoji} ${f.name}</option>`)
    .join("");

  const startHTML = `<div class="ei-wrap">
    <div class="ei-card">
      <div class="ei-card-header"><span class="ei-card-icon">✅</span><div>
        <div class="ei-card-titel">Darf ich den behalten?</div>
        <div class="ei-card-sub">Fischart + Länge → sofort wissen ob du entnehmen darfst</div>
      </div></div>
      <div class="ei-check-row">
        <select class="tb-select" id="ei-fisch" style="flex:2">${fischOptions}</select>
        <input class="tb-input" id="ei-laenge" type="number" min="0" max="200" placeholder="Länge cm" style="flex:1;min-width:90px">
        <button class="go ei-check-btn" id="ei-check-btn">Prüfen</button>
      </div>
      <div id="ei-result"></div>
      <div class="ei-disclaimer">Angaben nach Binnenfischereiordnung SH 2026. Gilt nicht für Hamburg – Erlaubnisschein prüfen. Kein Ersatz für offizielle Quellen.</div>
    </div>
    <div class="ei-card">
      <div class="ei-card-header"><span class="ei-card-icon">🗺️</span><div>
        <div class="ei-card-titel">Wo darf ich angeln?</div>
        <div class="ei-card-sub">Was du brauchst und wo du in HH und SH loslegst</div>
      </div></div>
      <div class="ei-info-block"><div class="ei-info-titel">📋 Was du immer dabei haben musst</div><div class="ei-check-items">
        <div class="ei-check-item">🪪 <b>Fischereischein</b> (deine bestandene Prüfung – Dokument mitnehmen)</div>
        <div class="ei-check-item">💳 <b>Fischereiabgabemarke</b> für das jeweilige Bundesland (SH oder HH)</div>
        <div class="ei-check-item">🎫 <b>Erlaubnisschein / Tageskarte</b> für das konkrete Gewässer</div>
        <div class="ei-check-item">📐 <b>Maßband</b> zum Messen (Pflicht!)</div>
        <div class="ei-check-item">🔪 <b>Priest + Messer</b> wenn du Fische entnehmen willst</div>
      </div></div>
      <div class="ei-info-block"><div class="ei-info-titel">🏞️ Schleswig-Holstein</div><div class="ei-gwtext">
        <p><b>LAV-Gewässer</b> – Mit LAV-Erlaubnisschein an über 100 Gewässern. → Tab „💳 LAV-Gewässer"</p>
        <p><b>Freie Fließgewässer</b> – Eider, Treene, Stör – immer Erlaubnisschein prüfen!</p>
        <p><b>Forellenseen (Put &amp; Take)</b> – Ideal zum Einsteigen. → Tab „Fänge &amp; Spots"</p>
        <p><b>Küste</b> – Viele Strände/Molen frei zugänglich. Meerforelle, Dorsch, Flunder.</p>
      </div></div>
      <div class="ei-info-block"><div class="ei-info-titel">🏙️ Hamburg</div><div class="ei-gwtext">
        <p><b>HAV (Hamburger Angler-Verband)</b> – Mitgliedschaft ~80–130 €/Jahr, über 40 Vereinsgewässer. → <a href="https://www.hamburger-angler-verband.de" target="_blank" rel="noopener" class="ei-link">hamburger-angler-verband.de</a></p>
        <p><b>Alster/Elbe</b> – nur mit HAV-Erlaubnis oder Tageskarte. Nicht einfach ranstellen!</p>
      </div></div>
      <div class="ei-info-block"><div class="ei-info-titel">💡 Goldene Regel</div>
        <p class="ei-gwtext" style="margin:0">Immer <b>vorher</b> Erlaubnisschein kaufen und lesen. Ohne Erlaubnis: Bußgeld bis 5.000 €.</p>
      </div>
    </div>
    <div class="ei-card">
      <div class="ei-card-header"><span class="ei-card-icon">🐟</span><div>
        <div class="ei-card-titel">Ich habe was gefangen – was jetzt?</div>
        <div class="ei-card-sub">Schritt für Schritt, damit nichts schiefgeht</div>
      </div></div>
      <div class="ei-steps">
        <div class="ei-step"><div class="ei-step-num">1</div><div class="ei-step-body"><div class="ei-step-titel">Ruhe &amp; Drill beenden</div><div class="ei-step-text">Rute hochhalten, Fisch ausdrillen lassen. Nicht reißen.</div></div></div>
        <div class="ei-step"><div class="ei-step-num">2</div><div class="ei-step-body"><div class="ei-step-titel">Mit Kescher landen</div><div class="ei-step-text">Fisch über den Kescher führen und heben. Kleine Fische (&lt;20 cm) direkt mit Hand.</div></div></div>
        <div class="ei-step"><div class="ei-step-num">3</div><div class="ei-step-body"><div class="ei-step-titel">Hände anfeuchten</div><div class="ei-step-text">Trockene Hände zerstören die Schleimhaut. Immer vorher ins Wasser tauchen.</div></div></div>
        <div class="ei-step"><div class="ei-step-num">4</div><div class="ei-step-body"><div class="ei-step-titel">Haken lösen</div><div class="ei-step-text">Zange um den Hakenbogen, rückwärts aus Einstichrichtung drehen. Tief geschluckt → Schnur durchtrennen.</div></div></div>
        <div class="ei-step"><div class="ei-step-num">5</div><div class="ei-step-body"><div class="ei-step-titel">Messen – Schnauze bis Schwanzspitze</div><div class="ei-step-text">Flach aufs Maßband. Dann „Behalten?"-Check oben nutzen.</div></div></div>
        <div class="ei-step"><div class="ei-step-num">6</div><div class="ei-step-body"><div class="ei-step-titel">Entscheiden</div><div class="ei-step-text"><b>Zurücksetzen:</b> Kopfüber ins Wasser halten bis er schwimmt.<br><b>Behalten:</b> Priest kräftig auf Schädelknochen hinter den Augen → sofort bewusstlos.</div></div></div>
        <div class="ei-step"><div class="ei-step-num">7</div><div class="ei-step-body"><div class="ei-step-titel">Foto</div><div class="ei-step-text">Fisch waagerecht halten, nicht am Unterkiefer hängen lassen.</div></div></div>
        <div class="ei-step"><div class="ei-step-num">8</div><div class="ei-step-body"><div class="ei-step-titel">📔 Tagebuch eintragen</div><div class="ei-step-text">Fischart, Länge, Gewässer, Köder – alles frisch im Gedächtnis festhalten.</div></div></div>
      </div>
    </div>
  </div>`;

  let contentHTML = "";
  if(EI_SUBVIEW==="start")         contentHTML = startHTML;
  else if(EI_SUBVIEW==="bestimmung") contentHTML = eiRenderBestimmung();
  else if(EI_SUBVIEW==="filetieren") contentHTML = eiRenderFiletieren();
  else if(EI_SUBVIEW==="rezepte")    contentHTML = eiRenderRezepte();
  else if(EI_SUBVIEW==="koeder")     contentHTML = eiRenderKoeder();
  else if(EI_SUBVIEW==="knoten")     contentHTML = eiRenderKnoten();

  wrap.innerHTML = `<div class="tb-subtabs">${subTabsHTML}</div>${contentHTML}`;

  // Sub-Tab-Klicks
  wrap.querySelectorAll(".tb-subtab").forEach(btn=>{
    btn.addEventListener("click",()=>{ EI_SUBVIEW=btn.dataset.eisv; renderEinsteiger(); });
  });

  // Behalten-Check
  document.getElementById("ei-check-btn")?.addEventListener("click",()=>{
    const fischId = document.getElementById("ei-fisch")?.value;
    const laenge = parseFloat(document.getElementById("ei-laenge")?.value);
    document.getElementById("ei-result").innerHTML = eiBehaltenCheck(fischId, laenge);
  });
  document.getElementById("ei-laenge")?.addEventListener("keydown",e=>{
    if(e.key==="Enter") document.getElementById("ei-check-btn")?.click();
  });

  // Fisch-Bestimmung Klicks
  wrap.querySelectorAll(".ei-best-card").forEach(card=>{
    card.addEventListener("click",()=>{
      const f = EI_FISH_ID[+card.dataset.fishidx];
      const det = document.getElementById("ei-best-detail");
      if(!det||!f) return;
      det.innerHTML = `<div class="ei-best-detailbox">
        <div class="ei-best-detail-head">${f.emoji} ${f.name} <span class="ei-best-lat">${f.lat}</span></div>
        <div class="ei-info-block">
          <div class="ei-info-titel">🔍 Bestimmungsmerkmale</div>
          ${f.merkmale.map(m=>`<div class="ei-check-item">• ${m}</div>`).join("")}
        </div>
        <div class="ei-info-block" style="margin-top:8px">
          <div class="ei-check-item">⚠️ <b>Verwechslung:</b> ${f.verwechslung}</div>
          <div class="ei-check-item">📍 <b>Fundort:</b> ${f.fundort}</div>
        </div>
      </div>`;
      det.scrollIntoView({behavior:"smooth",block:"nearest"});
    });
  });

  // Filetier-Akkordeon
  wrap.querySelectorAll("[data-filetidx]").forEach(head=>{
    head.addEventListener("click",()=>{
      const body = document.getElementById("ei-filet-"+head.dataset.filetidx);
      const chev = head.querySelector(".ei-filet-chevron");
      if(!body) return;
      const open = body.style.display!=="none";
      body.style.display = open?"none":"block";
      if(chev) chev.textContent = open?"▼":"▲";
    });
  });

  // Rezept-Akkordeon
  wrap.querySelectorAll("[data-rezidx]").forEach(head=>{
    head.addEventListener("click",()=>{
      const body = document.getElementById("ei-rez-"+head.dataset.rezidx);
      const chev = head.querySelector(".ei-filet-chevron");
      if(!body) return;
      const open = body.style.display!=="none";
      body.style.display = open?"none":"block";
      if(chev) chev.textContent = open?"▼":"▲";
    });
  });

  // Knoten-Akkordeon
  wrap.querySelectorAll("[data-knotidx]").forEach(head=>{
    head.addEventListener("click",()=>{
      const body = document.getElementById("ei-knot-"+head.dataset.knotidx);
      const chev = head.querySelector(".ei-filet-chevron");
      if(!body) return;
      const open = body.style.display!=="none";
      body.style.display = open?"none":"block";
      if(chev) chev.textContent = open?"▼":"▲";
    });
  });
}

/* --- Stats-Cache für Berater-Badge --- */
function tbUpdateStatsCache(entries){
  const c={};
  entries.forEach(e=>{
    if(!e.setup)return;
    if(!c[e.setup])c[e.setup]={ausfluge:0,faenge:0};
    c[e.setup].ausfluge++;
    c[e.setup].faenge+=(e.faenge||[]).length;
  });
  TB_STATS_CACHE=c;
}

/* --- SVG-Balkendiagramm --- */
function tbSvgBarChart(values,labels,color="#33c3a6"){
  const W=400,H=88,padL=8,padB=18,padT=14;
  const n=values.length,max=Math.max(...values,1);
  const slotW=(W-padL*2)/n,barW=Math.floor(slotW*0.65);
  const bars=values.map((v,i)=>{
    const x=padL+i*slotW+(slotW-barW)/2;
    const h=v?Math.max(v/max*(H-padB-padT),3):0;
    const y=H-padB-h;
    return `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${barW}" height="${h.toFixed(1)}" rx="3" fill="${color}" opacity="${v?0.85:0.12}"/>
${v?`<text x="${(x+barW/2).toFixed(1)}" y="${(y-3).toFixed(1)}" text-anchor="middle" fill="${color}" font-size="9" font-family="sans-serif" font-weight="700">${v}</text>`:""}
<text x="${(x+barW/2).toFixed(1)}" y="${H-3}" text-anchor="middle" fill="#9db6c4" font-size="8" font-family="sans-serif">${labels[i]}</text>`;
  }).join("");
  return `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" width="100%" style="display:block">${bars}</svg>`;
}

/* --- Kalender-Subview --- */
function tbRenderKalender(entries){
  const year=TB_KAL_YEAR,month=TB_KAL_MONTH;
  const today=new Date().toISOString().slice(0,10);
  const entryMap={};
  entries.forEach(e=>{if(!entryMap[e.datum])entryMap[e.datum]=[];entryMap[e.datum].push(e);});
  const firstDay=new Date(year,month,1);
  const lastDay=new Date(year,month+1,0);
  const monthName=firstDay.toLocaleDateString("de-DE",{month:"long",year:"numeric"});
  const startDow=(firstDay.getDay()+6)%7;
  const dowHTML=["Mo","Di","Mi","Do","Fr","Sa","So"].map(d=>`<div class="tb-kal-dow">${d}</div>`).join("");
  let cells=Array(startDow).fill(`<div class="tb-kal-day tb-kal-empty"></div>`);
  for(let day=1;day<=lastDay.getDate();day++){
    const iso=`${year}-${String(month+1).padStart(2,"0")}-${String(day).padStart(2,"0")}`;
    const es=entryMap[iso]||[];
    const hasEntry=es.length>0,hasCatch=es.some(e=>e.faenge?.length>0);
    const isToday=iso===today,isSel=iso===TB_KAL_SELECTED;
    let cls="tb-kal-day"+(hasEntry?" tb-kal-has":"")+(isToday?" tb-kal-today":"")+(isSel?" tb-kal-sel":"");
    const dot=hasEntry?`<div class="tb-kal-dot${hasCatch?" tb-kal-dot-catch":""}"></div>`:"";
    cells.push(`<div class="${cls}"${hasEntry?` data-kaldate="${iso}"`:""}>${day}${dot}</div>`);
  }
  let detailHTML="";
  if(TB_KAL_SELECTED&&entryMap[TB_KAL_SELECTED]){
    const es=entryMap[TB_KAL_SELECTED];
    detailHTML=`<div class="tb-kal-detail">`+es.map(e=>`<div class="tb-kal-detail-row">
      <div><div class="tb-kal-detail-loc">${e.gewaesser||"Gewässer unbekannt"}</div>
      <div class="tb-kal-detail-meta">${tbWetterEmoji(e.wetter?.bewoelkung,e.wetter?.luftdruck)} ${e.methode||""} ${e.faenge?.length>0?"· 🐟 "+e.faenge.length+"×":""}</div></div>
      <div>${tbSterneHTML(e.bewertung||0)}</div></div>`).join("")+`</div>`;
  }
  return `<div class="tb-kal-wrap">
    <div class="tb-kal-nav">
      <button class="tb-kal-nav-btn" id="tb-kal-prev">◀</button>
      <span class="tb-kal-month-label">${monthName}</span>
      <button class="tb-kal-nav-btn" id="tb-kal-next">▶</button>
    </div>
    <div class="tb-kal-grid">${dowHTML}${cells.join("")}</div>
    ${detailHTML}</div>`;
}

/* --- Statistik-Subview --- */
function tbRenderStatistik(entries){
  if(!entries.length)return`<div class="tb-empty"><span class="tb-empty-icon">📊</span><p>Noch keine Einträge für Statistiken.</p></div>`;
  const totalA=entries.length;
  const totalF=entries.reduce((s,e)=>s+(e.faenge?.length||0),0);
  const avg=(totalA>0?(totalF/totalA).toFixed(1):"0");
  const gewMap={};entries.forEach(e=>{const g=e.gewaesser||"?";gewMap[g]=(gewMap[g]||0)+1;});
  const topGew=Object.entries(gewMap).sort((a,b)=>b[1]-a[1])[0];
  const koederMap={};entries.forEach(e=>{if(e.koeder)koederMap[e.koeder]=(koederMap[e.koeder]||0)+1;});
  const topKoeder=Object.entries(koederMap).sort((a,b)=>b[1]-a[1])[0];
  const monatsLabels=["Jan","Feb","Mär","Apr","Mai","Jun","Jul","Aug","Sep","Okt","Nov","Dez"];
  const monatsVals=Array(12).fill(0);
  entries.forEach(e=>{if(e.datum)monatsVals[parseInt(e.datum.slice(5,7))-1]++;});
  const uhrzeitLabels=["0h","3h","6h","9h","12h","15h","18h","21h"];
  const uhrzeitVals=Array(8).fill(0);
  entries.forEach(e=>{if(!e.von||!e.faenge?.length)return;const h=parseInt(e.von.split(":")[0]);uhrzeitVals[Math.min(Math.floor(h/3),7)]+=e.faenge.length;});
  const hasUhr=uhrzeitVals.some(v=>v>0);
  const tiles=[
    {val:totalA,label:"Ausflüge"},
    {val:totalF,label:"Fänge gesamt"},
    {val:avg,label:"Ø Fänge / Ausflug"},
    {val:topGew?topGew[0]:"–",label:"Lieblingsgewässer"},
  ];
  return `<div class="tb-stats-wrap">
    <div class="tb-stat-tiles">${tiles.map(t=>`<div class="tb-stat-tile"><div class="tb-stat-tile-val">${t.val}</div><div class="tb-stat-tile-label">${t.label}</div></div>`).join("")}</div>
    <div class="tb-chart-wrap"><div class="tb-chart-title">📅 Ausflüge nach Monat</div>${tbSvgBarChart(monatsVals,monatsLabels)}</div>
    ${hasUhr?`<div class="tb-chart-wrap"><div class="tb-chart-title">🕐 Fänge nach Angelzeit</div>${tbSvgBarChart(uhrzeitVals,uhrzeitLabels,"#d4a84b")}</div>`:`<div class="tb-chart-wrap"><div class="tb-chart-title">🕐 Fänge nach Angelzeit</div><p style="font-size:13px;color:var(--muted)">Einträge mit Von-Uhrzeit und Fängen nötig.</p></div>`}
    ${topKoeder?`<div class="tb-chart-wrap"><div class="tb-chart-title">🪱 Meistgenutzter Köder</div><div style="font-size:20px;font-weight:800;color:var(--accent);margin:4px 0">${topKoeder[0]}</div><div style="font-size:13px;color:var(--muted)">${topKoeder[1]}× eingesetzt</div></div>`:""}
  </div>`;
}

/* --- Rendern --- */
async function renderTagebuch(){
  const wrap = document.getElementById("tagebuch-main");
  if(!wrap) return;

  if(TB_VIEW === "form"){
    wrap.innerHTML = tbFormHTML();
    tbFormBind();
    return;
  }

  let entries;
  try {
    if(fsSyncUser){
      entries = await tbCloudLadeAlle(fsSyncUser.uid);
      const lokal = await tbIDBLadeAlle();
      const fotoMap = Object.fromEntries(lokal.map(e => [e.id, e.foto]));
      entries = entries.map(e => ({...e, foto: fotoMap[e.id]||null}));
      for(const e of entries) await tbIDBSpeichere(e);
    } else {
      entries = await tbIDBLadeAlle();
    }
  } catch(err){
    entries = await tbIDBLadeAlle();
  }
  entries.sort((a,b) => b.datum.localeCompare(a.datum));
  tbUpdateStatsCache(entries);

  if(TB_VIEW === "detail" && TB_DETAIL){
    const e = entries.find(x => x.id === TB_DETAIL) || TB_DETAIL;
    wrap.innerHTML = tbDetailHTML(e);
    return;
  }

  // Kalender-Starmonat: beim ersten Besuch zum letzten Eintrag springen
  if(!TB_KAL_INITIALIZED && entries.length){
    const lastDate = new Date(entries[0].datum+"T00:00:00");
    TB_KAL_YEAR = lastDate.getFullYear();
    TB_KAL_MONTH = lastDate.getMonth();
    TB_KAL_INITIALIZED = true;
  }

  const syncHint = fsSyncUser
    ? `<div class="tb-sync-hint">☁️ Synced mit ${fsSyncUser.email}</div>`
    : `<div class="tb-sync-hint">💡 Melde dich an (☁️-Symbol oben), um das Tagebuch auf allen Geräten zu haben.</div>`;

  const subTabs = ["liste","kalender","statistik"].map((k,i)=>{
    const icons=["📋","📅","📊"], labels=["Einträge","Kalender","Statistik"];
    return `<button class="tb-subtab${TB_SUBVIEW===k?" active":""}" data-sv="${k}">${icons[i]} ${labels[i]}</button>`;
  }).join("");

  let contentHTML="";
  if(TB_SUBVIEW==="liste"){
    contentHTML = entries.length===0
      ? `<div class="tb-empty"><span class="tb-empty-icon">📔</span><p>Noch keine Ausflüge eingetragen.</p><p style="font-size:13px;margin-top:6px">Tippe auf „Neuer Ausflug" um deinen ersten Eintrag zu erstellen.</p></div>`
      : `<div class="tb-list">${entries.map(e=>tbEntryCardHTML(e)).join("")}</div>`;
  } else if(TB_SUBVIEW==="kalender"){
    contentHTML = tbRenderKalender(entries);
  } else {
    contentHTML = tbRenderStatistik(entries);
  }

  wrap.innerHTML = `
    <div class="tb-topbar">
      <h2>📔 Angeltagebuch</h2>
      <button class="tb-new-btn" id="tb-new-btn">+ Neuer Ausflug</button>
    </div>
    ${syncHint}
    <div class="tb-subtabs">${subTabs}</div>
    ${contentHTML}`;

  document.getElementById("tb-new-btn")?.addEventListener("click",()=>{
    TB_VIEW="form"; TB_EDIT=null; TB_CATCHES_TMP=[]; TB_FOTO_B64=null;
    renderTagebuch();
  });

  wrap.querySelectorAll(".tb-subtab").forEach(btn=>{
    btn.addEventListener("click",()=>{ TB_SUBVIEW=btn.dataset.sv; renderTagebuch(); });
  });

  if(TB_SUBVIEW==="liste"){
    wrap.querySelectorAll(".tb-entry").forEach(card=>{
      card.addEventListener("click",()=>{ TB_VIEW="detail"; TB_DETAIL=card.dataset.tbid; renderTagebuch(); });
    });
  } else if(TB_SUBVIEW==="kalender"){
    document.getElementById("tb-kal-prev")?.addEventListener("click",()=>{
      TB_KAL_MONTH--; if(TB_KAL_MONTH<0){TB_KAL_MONTH=11;TB_KAL_YEAR--;} TB_KAL_SELECTED=null; renderTagebuch();
    });
    document.getElementById("tb-kal-next")?.addEventListener("click",()=>{
      TB_KAL_MONTH++; if(TB_KAL_MONTH>11){TB_KAL_MONTH=0;TB_KAL_YEAR++;} TB_KAL_SELECTED=null; renderTagebuch();
    });
    wrap.querySelectorAll(".tb-kal-has").forEach(cell=>{
      cell.addEventListener("click",()=>{ TB_KAL_SELECTED=cell.dataset.kaldate; renderTagebuch(); });
    });
  }
}

function tbEntryCardHTML(e){
  const d = new Date((e.datum||"2000-01-01")+"T00:00:00");
  const tag = String(d.getDate()).padStart(2,"0");
  const mon = d.toLocaleDateString("de-DE",{month:"short"});
  const emoji = tbWetterEmoji(e.wetter?.bewoelkung, e.wetter?.luftdruck);
  const catches = e.faenge?.length || 0;
  const dauer = tbDauerText(e.von, e.bis);
  return `<div class="tb-entry" data-tbid="${e.id}">
    <div class="tb-entry-head">
      <div class="tb-date-box">
        <div class="tb-date-day">${tag}</div>
        <div class="tb-date-mo">${mon}</div>
      </div>
      <div class="tb-entry-info">
        <div class="tb-entry-loc">${e.gewaesser || "Gewässer unbekannt"}</div>
        <div class="tb-entry-meta">${emoji} ${e.wetter?.temp != null ? e.wetter.temp+"°C" : ""} ${dauer ? "· "+dauer : ""} ${e.methode ? "· "+e.methode : ""}</div>
      </div>
      <div class="tb-entry-right">
        ${catches > 0 ? `<span class="tb-badge-catches">🐟 ${catches}×</span>` : ""}
        <div class="tb-stars">${tbSterneHTML(e.bewertung||0)}</div>
      </div>
    </div>
  </div>`;
}

function tbDetailHTML(e){
  const emoji = tbWetterEmoji(e.wetter?.bewoelkung, e.wetter?.luftdruck);
  const faenge = e.faenge||[];
  const fotoHtml = e.foto ? `<img class="tb-detail-foto" src="${e.foto}" alt="Foto">` : "";
  const catchHTML = faenge.length === 0
    ? `<p style="font-size:13px;color:var(--muted)">Keine Fänge eingetragen</p>`
    : faenge.map(f => {
        const details = [f.laenge ? f.laenge+"cm" : null, f.gewicht ? f.gewicht+"kg" : null].filter(Boolean).join(", ");
        return `<div class="tb-detail-catch-item">🐟 <b>${f.art}</b>${details ? " · "+details : ""}</div>`;
      }).join("");
  return `<div class="tb-detail-wrap">
    <div class="tb-detail-header">
      <div>
        <div class="tb-detail-title">${e.gewaesser || "Ausflug"}</div>
        <div style="font-size:13px;color:var(--muted);margin-top:4px">${tbDatumAnzeige(e.datum)} ${tbDauerText(e.von,e.bis) ? "· "+tbDauerText(e.von,e.bis) : ""}</div>
        <div class="tb-stars" style="margin-top:6px">${tbSterneHTML(e.bewertung||0)}</div>
      </div>
      <div class="tb-detail-actions">
        <button class="tb-detail-back" id="tb-back-btn">← Zurück</button>
        <button class="tb-detail-edit" id="tb-edit-btn">✏️</button>
        <button class="tb-detail-del" id="tb-del-btn">🗑</button>
      </div>
    </div>
    <div class="tb-detail-grid">
      <div class="tb-detail-item">
        <div class="tb-detail-item-label">Wetter</div>
        <div class="tb-detail-item-value">${emoji} ${e.wetter?.bewoelkung||"–"}</div>
      </div>
      <div class="tb-detail-item">
        <div class="tb-detail-item-label">Temperatur</div>
        <div class="tb-detail-item-value">${e.wetter?.temp != null ? e.wetter.temp+"°C Luft" : "–"}${e.wassertemp != null ? " · "+e.wassertemp+"°C Wasser" : ""}</div>
      </div>
      <div class="tb-detail-item">
        <div class="tb-detail-item-label">Wind</div>
        <div class="tb-detail-item-value">${e.wetter?.wind||"–"}</div>
      </div>
      <div class="tb-detail-item">
        <div class="tb-detail-item-label">Luftdruck</div>
        <div class="tb-detail-item-value">${e.wetter?.luftdruck||"–"}</div>
      </div>
      ${e.methode ? `<div class="tb-detail-item"><div class="tb-detail-item-label">Methode</div><div class="tb-detail-item-value">${e.methode}</div></div>` : ""}
      ${e.koeder ? `<div class="tb-detail-item"><div class="tb-detail-item-label">Köder</div><div class="tb-detail-item-value">${e.koeder}</div></div>` : ""}
      ${e.setup && AKTUELL[e.setup] ? `<div class="tb-detail-item"><div class="tb-detail-item-label">Setup</div><div class="tb-detail-item-value">${AKTUELL[e.setup].name.replace(/^Setup \d+ – /,"")}</div></div>` : ""}
    </div>
    <div class="tb-detail-section">
      <h4>Fänge</h4>
      ${catchHTML}
    </div>
    ${e.notizen ? `<div class="tb-detail-section"><h4>Notizen</h4><p style="font-size:14px;line-height:1.6">${e.notizen}</p></div>` : ""}
    ${fotoHtml}
  </div>`;
}

function tbFormHTML(){
  const e = TB_EDIT || {};
  const heute = new Date().toISOString().slice(0,10);
  const catches = TB_CATCHES_TMP;
  const catchRows = catches.map((c,i) =>
    `<div class="tb-catch-row">
      <input class="tb-input" placeholder="Fischart" value="${c.art||""}" data-ci="${i}" data-cf="art" style="min-width:80px">
      <input class="tb-input" placeholder="Länge cm" type="number" value="${c.laenge||""}" data-ci="${i}" data-cf="laenge" style="width:80px">
      <input class="tb-input" placeholder="kg" type="number" step="0.01" value="${c.gewicht||""}" data-ci="${i}" data-cf="gewicht" style="width:70px">
      <button class="tb-catch-del" data-ci="${i}">✕</button>
    </div>`
  ).join("");
  const sterne = [1,2,3,4,5].map(i =>
    `<span class="tb-star${(e.bewertung||0)>=i?" on":""}" data-tbstar="${i}">★</span>`
  ).join("");
  const fotoPreview = TB_FOTO_B64 || e.foto
    ? `<img class="tb-foto-preview" id="tb-foto-preview" src="${TB_FOTO_B64||e.foto}" style="display:block">`
    : `<img class="tb-foto-preview" id="tb-foto-preview">`;
  return `<div class="tb-form-wrap">
    <div class="tb-form-title">${e.id ? "✏️ Ausflug bearbeiten" : "📔 Neuer Ausflug"}</div>
    <div class="tb-form-grid">
      <div class="full"><label class="tb-label">Gewässer / Ort</label><input class="tb-input" id="tb-f-gew" placeholder="z.B. Eider bei Rendsburg" value="${e.gewaesser||""}"></div>
      <div><label class="tb-label">Datum</label><input class="tb-input" type="date" id="tb-f-datum" value="${e.datum||heute}"></div>
      <div style="display:flex;gap:8px;align-items:flex-end">
        <div style="flex:1"><label class="tb-label">Von</label><input class="tb-input" type="time" id="tb-f-von" value="${e.von||""}"></div>
        <div style="flex:1"><label class="tb-label">Bis</label><input class="tb-input" type="time" id="tb-f-bis" value="${e.bis||""}"></div>
      </div>
    </div>
    <div class="tb-section-label">🌤 Wetter</div>
    <div class="tb-form-grid">
      <div><label class="tb-label">Lufttemperatur (°C)</label><input class="tb-input" type="number" id="tb-f-temp" placeholder="z.B. 18" value="${e.wetter?.temp??""}" min="-20" max="45"></div>
      <div><label class="tb-label">Wassertemperatur (°C)</label><input class="tb-input" type="number" id="tb-f-wtemp" placeholder="optional" value="${e.wassertemp??""}" min="0" max="35"></div>
      <div><label class="tb-label">Wind</label><input class="tb-input" id="tb-f-wind" placeholder="z.B. SW 3 Bft" value="${e.wetter?.wind||""}"></div>
      <div><label class="tb-label">Bewölkung</label>
        <select class="tb-select" id="tb-f-bew">
          ${["klar / sonnig","leicht bewölkt","stark bewölkt","bedeckt","Regen","Gewitter"].map(o =>
            `<option${(e.wetter?.bewoelkung||"")=== o?" selected":""}>${o}</option>`).join("")}
        </select>
      </div>
      <div class="full"><label class="tb-label">Luftdruck-Trend</label>
        <select class="tb-select" id="tb-f-lp">
          ${["stabil","steigend","fallend"].map(o =>
            `<option${(e.wetter?.luftdruck||"stabil")===o?" selected":""}>${o}</option>`).join("")}
        </select>
      </div>
    </div>
    <div class="tb-section-label">🎣 Angeln</div>
    <div class="tb-form-grid">
      <div><label class="tb-label">Methode</label><input class="tb-input" id="tb-f-methode" placeholder="z.B. Spinnfischen" value="${e.methode||""}"></div>
      <div><label class="tb-label">Köder</label><input class="tb-input" id="tb-f-koeder" placeholder="z.B. Easy Shiner 5&quot;" value="${e.koeder||""}"></div>
      <div class="full"><label class="tb-label">Setup (optional)</label>
        <select class="tb-select" id="tb-f-setup">
          <option value="">– kein / nicht relevant –</option>
          ${Object.entries(AKTUELL).map(([k,s])=>`<option value="${k}"${(e.setup||"")===k?" selected":""}>${s.name.replace(/^Setup \d+ – /,"")}</option>`).join("")}
        </select>
      </div>
    </div>
    <div class="tb-section-label">🐟 Fänge</div>
    <div class="tb-catch-list" id="tb-catch-list">${catchRows}</div>
    <button class="tb-add-catch-btn" id="tb-add-catch-btn">+ Fang hinzufügen</button>
    <div class="tb-section-label">⭐ Bewertung</div>
    <div class="tb-star-row" id="tb-star-row">${sterne}</div>
    <div class="tb-section-label">📝 Notizen</div>
    <textarea class="tb-textarea full" id="tb-f-notizen" placeholder="Besonderheiten, Tipps, Beobachtungen…">${e.notizen||""}</textarea>
    <div class="tb-section-label">📷 Foto</div>
    <label class="tb-foto-label" for="tb-f-foto">📷 Foto auswählen</label>
    <input type="file" id="tb-f-foto" accept="image/*" capture="environment" style="display:none">
    ${fotoPreview}
    <div class="tb-form-actions">
      <button class="tb-save-btn" id="tb-save-btn">💾 Speichern</button>
      <button class="tb-cancel-btn" id="tb-cancel-btn">Abbrechen</button>
      ${e.id ? `<button class="tb-del-btn" id="tb-del-inline-btn">🗑 Löschen</button>` : ""}
    </div>
  </div>`;
}

function tbCaptureDraft(){
  const f = id => document.getElementById(id)?.value ?? "";
  TB_EDIT = {
    ...(TB_EDIT || {}),
    datum: f("tb-f-datum"),
    von: f("tb-f-von"),
    bis: f("tb-f-bis"),
    gewaesser: f("tb-f-gew"),
    wetter: {
      temp: f("tb-f-temp"),
      wind: f("tb-f-wind"),
      bewoelkung: f("tb-f-bew"),
      luftdruck: f("tb-f-lp")
    },
    wassertemp: f("tb-f-wtemp"),
    methode: f("tb-f-methode"),
    koeder: f("tb-f-koeder"),
    setup: f("tb-f-setup"),
    bewertung: typeof TB_EDIT?.bewertung === "number" ? TB_EDIT.bewertung : 0,
    notizen: f("tb-f-notizen")
  };
}

function tbFormBind(){
  // Sterne
  const starRow = document.getElementById("tb-star-row");
  if(starRow) starRow.querySelectorAll(".tb-star").forEach(s => {
    s.addEventListener("click", () => {
      const n = +s.dataset.tbstar;
      if(!TB_EDIT) TB_EDIT = {};
      TB_EDIT.bewertung = n;
      starRow.querySelectorAll(".tb-star").forEach((x,i) => x.classList.toggle("on", i<n));
    });
  });
  // Catch-Liste
  const catchList = document.getElementById("tb-catch-list");
  if(catchList){
    catchList.addEventListener("input", e => {
      const ci = +e.target.dataset.ci, cf = e.target.dataset.cf;
      if(TB_CATCHES_TMP[ci] !== undefined) TB_CATCHES_TMP[ci][cf] = e.target.value;
    });
    catchList.addEventListener("click", e => {
      const btn = e.target.closest(".tb-catch-del");
      if(!btn) return;
      tbCaptureDraft();
      TB_CATCHES_TMP.splice(+btn.dataset.ci, 1);
      renderTagebuch();
    });
  }
  document.getElementById("tb-add-catch-btn")?.addEventListener("click", () => {
    tbCaptureDraft();
    TB_CATCHES_TMP.push({art:"",laenge:"",gewicht:""});
    renderTagebuch();
  });
  // Foto
  document.getElementById("tb-f-foto")?.addEventListener("change", e => {
    const file = e.target.files[0]; if(!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      TB_FOTO_B64 = ev.target.result;
      const prev = document.getElementById("tb-foto-preview");
      if(prev){ prev.src = TB_FOTO_B64; prev.style.display = "block"; }
    };
    reader.readAsDataURL(file);
  });
  // Speichern
  document.getElementById("tb-save-btn")?.addEventListener("click", async () => {
    const id = (TB_EDIT && TB_EDIT.id) || (Date.now().toString(36) + Math.random().toString(36).slice(2,7));
    const entry = {
      id,
      datum: document.getElementById("tb-f-datum")?.value || new Date().toISOString().slice(0,10),
      von: document.getElementById("tb-f-von")?.value || "",
      bis: document.getElementById("tb-f-bis")?.value || "",
      gewaesser: document.getElementById("tb-f-gew")?.value || "",
      wetter: {
        temp: parseFloat(document.getElementById("tb-f-temp")?.value)||null,
        wind: document.getElementById("tb-f-wind")?.value||"",
        bewoelkung: document.getElementById("tb-f-bew")?.value||"",
        luftdruck: document.getElementById("tb-f-lp")?.value||"stabil",
      },
      wassertemp: parseFloat(document.getElementById("tb-f-wtemp")?.value)||null,
      methode: document.getElementById("tb-f-methode")?.value||"",
      koeder: document.getElementById("tb-f-koeder")?.value||"",
      setup: document.getElementById("tb-f-setup")?.value||"",
      faenge: TB_CATCHES_TMP.filter(c => c.art).map(c => ({
        art: c.art,
        laenge: c.laenge ? parseFloat(c.laenge) : null,
        gewicht: c.gewicht ? parseFloat(c.gewicht) : null,
      })),
      bewertung: TB_EDIT?.bewertung || 0,
      notizen: document.getElementById("tb-f-notizen")?.value||"",
      foto: TB_FOTO_B64 || (TB_EDIT?.foto||null),
    };
    await tbIDBSpeichere(entry);
    if(fsSyncUser){ try{ await tbCloudSpeichere(fsSyncUser.uid, entry); }catch(e){} }
    TB_VIEW = "list"; TB_EDIT = null; TB_CATCHES_TMP = []; TB_FOTO_B64 = null;
    renderTagebuch();
  });
  // Abbrechen
  document.getElementById("tb-cancel-btn")?.addEventListener("click", () => {
    TB_VIEW = "list"; TB_EDIT = null; TB_CATCHES_TMP = []; TB_FOTO_B64 = null;
    renderTagebuch();
  });
  // Löschen (inline im Formular)
  document.getElementById("tb-del-inline-btn")?.addEventListener("click", async () => {
    if(!confirm("Diesen Ausflug wirklich löschen?")) return;
    const id = TB_EDIT.id;
    await tbIDBLoesche(id);
    if(fsSyncUser){ try{ await tbCloudLoesche(fsSyncUser.uid, id); }catch(e){} }
    TB_VIEW = "list"; TB_EDIT = null; TB_CATCHES_TMP = []; TB_FOTO_B64 = null;
    renderTagebuch();
  });
}

// Detail-View Event-Delegation
document.addEventListener("click", async e => {
  if(e.target.closest("#tb-back-btn")){ TB_VIEW = "list"; TB_DETAIL = null; renderTagebuch(); return; }
  if(e.target.closest("#tb-edit-btn")){
    const entries = await tbIDBLadeAlle();
    TB_EDIT = entries.find(x => x.id === TB_DETAIL) || {};
    TB_CATCHES_TMP = (TB_EDIT.faenge || []).map(f => ({...f}));
    TB_FOTO_B64 = null;
    TB_VIEW = "form"; renderTagebuch(); return;
  }
  if(e.target.closest("#tb-del-btn")){
    if(!confirm("Diesen Ausflug wirklich löschen?")) return;
    const id = TB_DETAIL;
    await tbIDBLoesche(id);
    if(fsSyncUser){ try{ await tbCloudLoesche(fsSyncUser.uid, id); }catch(e){} }
    TB_VIEW = "list"; TB_DETAIL = null; renderTagebuch(); return;
  }
});

/* ---------- Auto-Update-Check ---------- */
(function(){
  const VERSION_KEY = "app_version_known";
  let letzteVersion = null;

  function zeigeUpdateBanner(version){
    if(document.getElementById("update-banner")) return;
    const div = document.createElement("div");
    div.id = "update-banner";
    div.innerHTML = `🔄 Update verfügbar – <b>Antippen zum Aktualisieren</b>`;
    div.style.cssText = [
      "position:fixed","bottom:0","left:0","right:0","z-index:9999",
      "background:var(--accent)","color:#0e1b24","text-align:center",
      "padding:14px 16px","font-size:15px","font-weight:700","cursor:pointer",
      "box-shadow:0 -2px 12px rgba(0,0,0,.4)"
    ].join(";");
    div.addEventListener("click", () => {
      localStorage.setItem(VERSION_KEY, version);
      location.href = location.pathname + "?r=" + Date.now();
    });
    document.body.appendChild(div);
  }

  async function pruefeVersion(){
    try {
      const resp = await fetch("version.txt?r=" + Date.now(), { cache: "no-store" });
      if(!resp.ok) return;
      const version = (await resp.text()).trim();
      if(!letzteVersion) letzteVersion = version;
      const bekannt = localStorage.getItem(VERSION_KEY);
      if(bekannt && bekannt !== version) zeigeUpdateBanner(version);
      else if(!bekannt) localStorage.setItem(VERSION_KEY, version);
    } catch(e) {}
  }

  pruefeVersion();
  setInterval(pruefeVersion, 5 * 60 * 1000); // alle 5 Minuten
})();
