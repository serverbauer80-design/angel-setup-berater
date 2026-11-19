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
  if(data.wartung && typeof data.wartung === "object"){ pflege.wartung = data.wartung; schreibe(KEYS.wartung, pflege.wartung); geaendert = true; }
  if(data.schnur && typeof data.schnur === "object"){  pflege.schnur  = data.schnur;  schreibe(KEYS.schnur,  pflege.schnur);  geaendert = true; }
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
    docRef.set({
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
