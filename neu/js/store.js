/* ============================================================
   Speicher + Geräte-Sync
   Die neue Oberfläche liegt auf derselben Domain wie die bisherige App
   und teilt deshalb deren localStorage. Wartung und Schnurwechsel stehen
   unter denselben Schlüsseln, damit beide Apps denselben Stand zeigen.

   Sync: dasselbe Firestore-Dokument sync/{uid} wie die alte App. Die neue
   App schreibt nur die Felder, die sie selbst ändert (wartung, schnur) –
   per merge, alle anderen Felder (Fänge, Spots …) bleiben unberührt.
   ============================================================ */

export const KEYS = {
  wartung: "wartung_v1",
  schnur:  "schnur_v1",
  faenge:  "meine_faenge_v1",
  theme:   "neu_theme_v1",
  filter:  "neu_rutenwand_filter_v1"
};

export function lese(key, fallback){
  try {
    const raw = localStorage.getItem(key);
    if(raw === null) return fallback;
    return JSON.parse(raw);
  } catch(e){ return fallback; }
}
export function schreibe(key, wert){
  try { localStorage.setItem(key, JSON.stringify(wert)); } catch(e){}
}
export function leseText(key, fallback){
  try { const v = localStorage.getItem(key); return v === null ? fallback : v; } catch(e){ return fallback; }
}
export function schreibeText(key, wert){
  try { localStorage.setItem(key, wert); } catch(e){}
}

/* ---------- Pflege-Daten (Wartung, Schnur) ---------- */
export const pflege = {
  wartung: lese(KEYS.wartung, {}) || {},
  schnur:  lese(KEYS.schnur, {}) || {}
};

const hoerer = new Set();
export function beiAenderung(fn){ hoerer.add(fn); }
function melde(){ hoerer.forEach(fn => { try { fn(); } catch(e){ console.error(e); } }); }

/* Setzt ein Datum (ISO yyyy-mm-dd) oder löscht es mit null */
export function setzePflege(art, setupKey, datum){
  const ziel = pflege[art];
  if(datum) ziel[setupKey] = datum; else delete ziel[setupKey];
  schreibe(KEYS[art], ziel);
  pushDebounced();
  melde();
}

/* Ausrüstung geändert (hier, in einem anderen Tab oder vom anderen Gerät) */
AUSR.beiAenderung(quelle => { if(quelle === "lokal") pushDebounced(); melde(); });

/* ---------- Spots & Dänemark-Notizen (Etappe 5) ----------
   Spots stehen im selben Fangbuch-Objekt wie in der alten App
   (meine_faenge_v1 / Firestore-Feld "faenge"). Fotos bleiben lokal. */
export function ladeFaengeDaten(){
  const d = lese(KEYS.faenge, null);
  const out = d && typeof d === "object" ? { spots: d.spots || [], catches: d.catches || [], ...d } : { spots: [], catches: [] };
  /* Vorbelegter Spot „Elbe (Lauenburg)“ lag versehentlich bei Bremen */
  out.spots.forEach(s => { if(s.name === "Elbe (Lauenburg)" && Math.abs(s.lng - 8.4752) < 0.001){ s.lat = 53.371; s.lng = 10.565; } });
  return out;
}
let faengeGeaendert = false, dkGeaendert = false;
export function speichereFaengeDaten(d){
  schreibe(KEYS.faenge, d);
  faengeGeaendert = true;
  pushDebounced();
  melde();
}
export const DK_KEY = "dk_puttake_notizen_v1";
export function dkNotizen(){ return lese(DK_KEY, {}) || {}; }
export function setzeDkNotiz(nr, text){
  const n = dkNotizen();
  if(text) n[nr] = text; else delete n[nr];
  schreibe(DK_KEY, n);
  dkGeaendert = true;
  pushDebounced();
  melde();
}

/* ---------- Tasche für heute (Etappe 4) ---------- */
const TASCHE_KEY = "neu_tasche_v1";
export function tascheSetzen(t){
  schreibe(TASCHE_KEY, t);
  pushDebounced();
  melde();
}

/* ---------- Kleinteile-Box ---------- */
export const KT_KEY = "neu_kleinteile_v1";
export function kleinteileSetzen(b){
  schreibe(KT_KEY, b);
  pushDebounced();
  melde();
}

/* Andere Tabs (z. B. die alte App parallel offen) */
window.addEventListener("storage", e => {
  if(e.key === KEYS.wartung){ pflege.wartung = lese(KEYS.wartung, {}) || {}; melde(); }
  if(e.key === KEYS.schnur){  pflege.schnur  = lese(KEYS.schnur, {})  || {}; melde(); }
});

/* Fänge nur lesen – gepflegt werden sie (noch) in der alten App */
export function ladeFaenge(){
  const d = lese(KEYS.faenge, null);
  return (d && Array.isArray(d.catches)) ? d.catches : [];
}

/* ---------- Firestore ---------- */
export const sync = { user: null, status: "aus", fehler: "" };
let docRef = null, bereit = false, unsub = null, timer = null;

function fb(){ return (typeof firebase !== "undefined" && !window.FIREBASE_FEHLT) ? firebase : null; }

function uebernimm(data){
  if(!data) return;
  let geaendert = false;
  /* Ausrüstung: neuer Stand aus der Cloud wird übernommen, ist der lokale neuer, geht er hoch */
  if(data.ausruestung){ const r = AUSR.vonRemote(data.ausruestung); if(r === "aelter") pushDebounced(); }
  else if(AUSR.gespeichert()) pushDebounced();
  /* Tasche: neuere gewinnt */
  if(data.tasche && data.tasche.geaendert){
    const lokal = lese(TASCHE_KEY, null);
    if(!lokal || (lokal.geaendert || "") < data.tasche.geaendert){ schreibe(TASCHE_KEY, data.tasche); geaendert = true; }
    else if((lokal.geaendert || "") > data.tasche.geaendert) pushDebounced();
  }
  /* Kleinteile-Box: neuere gewinnt */
  if(data.kleinteile && data.kleinteile.geaendert){
    const lokal = lese(KT_KEY, null);
    if(!lokal || (lokal.geaendert || "") < data.kleinteile.geaendert){ schreibe(KT_KEY, data.kleinteile); geaendert = true; }
    else if((lokal.geaendert || "") > data.kleinteile.geaendert) pushDebounced();
  }
  if(data.wartung && typeof data.wartung === "object"){ pflege.wartung = data.wartung; schreibe(KEYS.wartung, pflege.wartung); geaendert = true; }
  if(data.schnur && typeof data.schnur === "object"){  pflege.schnur  = data.schnur;  schreibe(KEYS.schnur,  pflege.schnur);  geaendert = true; }
  if(data.dkNotizen && typeof data.dkNotizen === "object"){ schreibe(DK_KEY, data.dkNotizen); geaendert = true; }
  if(data.faenge && Array.isArray(data.faenge.catches)){
    /* Fotos sind in der Cloud nie enthalten: lokale Fotos je Fang behalten */
    const lokal = lese(KEYS.faenge, null);
    const fotos = new Map(((lokal && lokal.catches) || []).filter(c => c.foto).map(c => [c.id, c.foto]));
    const neu = { ...data.faenge, catches: data.faenge.catches.map(c => (!c.foto && fotos.has(c.id)) ? { ...c, foto: fotos.get(c.id) } : c) };
    schreibe(KEYS.faenge, neu);
    geaendert = true;
  }
  if(geaendert) melde();
}

export function pushDebounced(){
  if(!docRef || !bereit) return;
  clearTimeout(timer);
  timer = setTimeout(() => {
    const aus = AUSR.gespeichert();
    const ta = lese(TASCHE_KEY, null);
    const kt = lese(KT_KEY, null);
    /* Fänge/Spots und Dänemark-Notizen nur mitschicken, wenn hier geändert –
       sonst bleibt der Stand der alten App unangetastet */
    const extra = {};
    if(faengeGeaendert){
      const f = lese(KEYS.faenge, null);
      if(f) extra.faenge = { ...f, catches: (f.catches || []).map(c => { if(!c.foto) return c; const { foto, ...rest } = c; return rest; }) };
      faengeGeaendert = false;
    }
    if(dkGeaendert){ extra.dkNotizen = dkNotizen(); dkGeaendert = false; }
    docRef.set({
      ...extra,
      ...(ta ? { tasche: ta } : {}),
      ...(kt ? { kleinteile: kt } : {}),
      wartung: pflege.wartung,
      schnur: pflege.schnur,
      ...(aus ? { ausruestung: aus } : {}),
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    }, { merge: true }).catch(err => {
      sync.status = "fehler"; sync.fehler = "Speichern in der Cloud fehlgeschlagen: " + err.message; melde();
    });
  }, 1200);
}

export function startSync(){
  const f = fb();
  if(!f){ sync.status = "offline"; melde(); return; }
  try {
    f.auth().onAuthStateChanged(async user => {
      if(unsub){ unsub(); unsub = null; }
      bereit = false;
      if(!user){ sync.user = null; docRef = null; sync.status = "aus"; melde(); return; }
      sync.user = user; sync.status = "laedt"; melde();
      docRef = f.firestore().collection("sync").doc(user.uid);
      try {
        const snap = await docRef.get();
        if(snap.exists) uebernimm(snap.data());
        sync.status = "an"; sync.fehler = "";
      } catch(e){
        sync.status = "fehler"; sync.fehler = "Erstabgleich fehlgeschlagen: " + e.message;
      }
      bereit = true;
      melde();
      unsub = docRef.onSnapshot(s => {
        if(!s.exists || s.metadata.hasPendingWrites) return;
        uebernimm(s.data());
      }, () => {});
    });
  } catch(e){ sync.status = "offline"; melde(); }
}

export async function anmelden(email, pass){
  const f = fb(); if(!f) throw new Error("Sync ist gerade nicht erreichbar.");
  await f.auth().signInWithEmailAndPassword(email, pass);
}
export async function abmelden(){
  const f = fb(); if(f) await f.auth().signOut();
}
