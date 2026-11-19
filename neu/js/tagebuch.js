/* ============================================================
   Ausflüge (früher „Angeltagebuch“) – Etappe 6
   Gleiche Ablage wie die bisherige App: IndexedDB „angeltagebuch_db“
   im Browser, mit Login zusätzlich Firestore tagebuch/{uid}/eintraege.
   Fotos bleiben nur auf dem Gerät.
   ============================================================ */
import { sync } from "./store.js";

const DB = "angeltagebuch_db", STORE = "eintraege";
let liste = [];            // zuletzt geladener Stand (für synchrones Zeichnen)
let geladen = false, laeuft = null;
const hoerer = new Set();
export function beiAusflugAenderung(fn){ hoerer.add(fn); }
const melde = () => hoerer.forEach(fn => { try { fn(); } catch(e){ console.error(e); } });

function oeffne(){
  return new Promise((res, rej) => {
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = e => e.target.result.createObjectStore(STORE, { keyPath: "id" });
    req.onsuccess = e => res(e.target.result);
    req.onerror = e => rej(e.target.error);
  });
}
async function idb(modus, fn){
  const db = await oeffne();
  return new Promise((res, rej) => {
    const tx = db.transaction(STORE, modus);
    const r = fn(tx.objectStore(STORE));
    tx.oncomplete = () => res(r && r.result);
    tx.onerror = () => rej(tx.error);
  });
}
const lokalAlle = () => idb("readonly", s => s.getAll()).then(r => r || []);
const lokalPut = e => idb("readwrite", s => s.put(e));
const lokalWeg = id => idb("readwrite", s => s.delete(id));

function wolke(){
  if(!sync.user || typeof firebase === "undefined") return null;
  return firebase.firestore().collection("tagebuch").doc(sync.user.uid).collection("eintraege");
}
const ohneFoto = e => { const { foto, ...rest } = e; return rest; };

export function ausfluege(){ return liste; }
export function ausfluegeGeladen(){ return geladen; }

/* Lokal und Cloud zusammenführen: Cloud gewinnt bei gleicher id,
   nur lokal vorhandene Einträge (offline angelegt) gehen hoch. */
export function ladeAusfluege(){
  if(laeuft) return laeuft;
  laeuft = (async () => {
    let lokal = [];
    try { lokal = await lokalAlle(); } catch(e){}
    let alle = lokal;
    const col = wolke();
    if(col){
      try {
        const snap = await col.get();
        const cloud = snap.docs.map(d => d.data());
        const fotos = new Map(lokal.filter(e => e.foto).map(e => [e.id, e.foto]));
        const ids = new Set(cloud.map(e => e.id));
        const nurLokal = lokal.filter(e => !ids.has(e.id));
        alle = cloud.map(e => ({ ...e, foto: fotos.get(e.id) || null })).concat(nurLokal);
        for(const e of alle) { try { await lokalPut(e); } catch(err){} }
        for(const e of nurLokal) { try { await col.doc(e.id).set(ohneFoto(e)); } catch(err){} }
      } catch(e){ /* offline: lokaler Stand */ }
    }
    liste = alle.sort((a, b) => String(b.datum).localeCompare(String(a.datum)) || String(b.von || "").localeCompare(String(a.von || "")));
    geladen = true;
    laeuft = null;
    melde();
    return liste;
  })();
  return laeuft;
}

export async function speichereAusflug(e){
  await lokalPut(e);
  const i = liste.findIndex(x => x.id === e.id);
  if(i >= 0) liste[i] = e; else liste.unshift(e);
  liste.sort((a, b) => String(b.datum).localeCompare(String(a.datum)));
  melde();
  const col = wolke();
  if(col){ try { await col.doc(e.id).set(ohneFoto(e)); } catch(err){ return "lokal"; } }
  return col ? "cloud" : "lokal";
}

export async function loescheAusflug(id){
  await lokalWeg(id);
  liste = liste.filter(x => x.id !== id);
  melde();
  const col = wolke();
  if(col){ try { await col.doc(id).delete(); } catch(err){} }
}

/* Nach Login/Logout neu laden */
let letzterUser = undefined;
export function ausfluegeNachSync(){
  const uid = sync.user ? sync.user.uid : null;
  if(uid === letzterUser) return;
  letzterUser = uid;
  if(geladen || uid) ladeAusfluege();
}
