/* ============================================================
   Setup-Modell
   Liest die gemeinsame data.js (RUTEN, ROLLEN, AKTUELL, FISCHE …) und
   bereitet daraus das auf, was die Rutenwand braucht: Kennzahlen,
   Schnurart, Zustand, baugleiche Setups als eine Karte (×2).
   ============================================================ */
import { pflege } from "./store.js";

const rById  = Object.fromEntries(RUTEN.map(r => [r.id, r]));
const roById = Object.fromEntries(ROLLEN.map(r => [r.id, r]));

export const KATEGORIEN = SETUP_KATEGORIEN;
export const katByKey = Object.fromEntries(SETUP_KATEGORIEN.map(k => [k.key, k]));

export const WARTUNG_TAGE = 180;
export const SCHNUR_TAGE  = 120;

export function tageSeit(iso){
  if(!iso) return null;
  const t = new Date(iso + "T00:00:00").getTime();
  if(isNaN(t)) return null;
  return Math.floor((Date.now() - t) / 86400000);
}
export function heuteISO(){
  const d = new Date();
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
}
export function datumDE(iso){
  if(!iso) return "";
  const [y, m, d] = iso.split("-");
  return `${+d}.${+m}.${y}`;
}
export const komma = v => String(v).replace(".", ",");

/* "Daiwa Ninja LT 4000-C · Frontbremse" -> "Daiwa Ninja LT 4000-C" */
export const ersterTeil = t => String(t || "").split(" · ")[0].trim();

/* Schnurart aus dem Freitext der Rolle ablesen */
export function schnurArt(text, kategorie){
  const t = String(text || "").toLowerCase();
  if(kategorie === "stippe") return "fest";
  if(/vorbespult/.test(t)) return "ab Werk";
  if(/fluoro|\bfc\b/.test(t) && !/geflocht|braid/.test(t)) return "fc";
  if(/geflocht|braid|x8/.test(t)) return "geflecht";
  if(/mono|gtm/.test(t)) return "mono";
  if(/vorbespult/.test(t)) return "ab Werk";
  return "";
}
export const ART_LABEL = { geflecht:"Geflecht", mono:"Mono", fc:"Fluoro", fest:"fest an der Spitze", "ab Werk":"ab Werk" };

export function schnurDurchmesser(text){
  const m = String(text || "").match(/0,\d{2,3}/);
  return m ? m[0] : "";
}

/* Bezeichnung in Klammern, z. B. "(Grundangeln 1)" oder "(wird verkauft)" */
function zusatz(name){
  const m = String(name).match(/\(([^)]+)\)\s*$/);
  return m ? m[1] : "";
}

function zustandVon(s, rolle){
  if(/verkauf/i.test(s.name) || /verkauf/i.test(s.rolleText || "")) return "verkauf";
  if(s.unvollstaendig) return "offen";
  if(!rolle && s.kategorie !== "stippe") return "ohneRolle";
  return "bereit";
}
export const ZUSTAND_LABEL = { bereit:"bereit", verkauf:"wird verkauft", offen:"unvollständig", ohneRolle:"ohne Rolle" };

function baue(s){
  const rute  = rById[s.ruteId] || null;
  const rolle = s.rolleId ? roById[s.rolleId] || null : null;
  const schnurText = rolle ? rolle.schnur : (s.schnurText || "");
  return {
    key: s.key,
    roh: s,
    kategorie: s.kategorie,
    rute, rolle,
    titel: rute ? rute.name : s.name.split(" · ")[0],
    zusatz: zusatz(s.name),
    laenge: rute && rute.laenge ? rute.laenge : null,
    wg: rute && rute.wg ? rute.wg : null,
    rolleName: rolle ? rolle.name : ersterTeil(s.rolleText || ""),
    schnurText,
    art: schnurArt(schnurText, s.kategorie),
    dm: schnurDurchmesser(schnurText),
    zustand: zustandVon(s, rolle)
  };
}

/* Alle Setups, in der Reihenfolge der Kategorien */
export function alleSetups(){
  const liste = Object.values(AKTUELL).map(baue);
  const rang = Object.fromEntries(SETUP_KATEGORIEN.map((k, i) => [k.key, i]));
  return liste.sort((a, b) => (rang[a.kategorie] ?? 99) - (rang[b.kategorie] ?? 99));
}

/* Jedes Setup ist eine eigene Karte – auch baugleiche (z. B. die zwei
   Berkley Flex), damit eine Änderung an einer Rute nicht beide betrifft.
   Die Gruppen-Struktur (glieder) bleibt, falls später wieder gebündelt
   werden soll. */
export function gruppiere(setups){
  return setups.map(s => ({ id: s.key, glieder: [s], kopf: s }));
}

/* Pflegezustand eines Setups: Tage seit Wartung/Schnurwechsel, fällig? */
export function pflegeVon(key, ohneSchnur){
  const w = pflege.wartung[key] || null;
  const sc = pflege.schnur[key] || null;
  const wt = tageSeit(w), st = tageSeit(sc);
  return {
    wartung: w, wartungTage: wt, wartungFaellig: wt !== null && wt > WARTUNG_TAGE,
    schnur: sc, schnurTage: st, schnurFaellig: !ohneSchnur && st !== null && st > SCHNUR_TAGE
  };
}

/* Rollen, die auf keinem Setup montiert sind */
export function freieRollen(){
  const montiert = new Set(Object.values(AKTUELL).map(s => s.rolleId).filter(Boolean));
  return ROLLEN.filter(r => !montiert.has(r.id));
}

/* Ansätze aus FISCHE, die dieses Setup verwenden */
export function ansaetzeFuer(keys){
  const ks = new Set(keys);
  const out = [];
  FISCHE.forEach(f => (f.ansaetze || []).forEach(a => { if(ks.has(a.setup)) out.push({ fisch: f, ansatz: a }); }));
  return out;
}

/* Fänge einem Setup zuordnen: über Fischart + Berater-Methode.
   Fänge ohne Methode oder mit eigener Methode lassen sich nicht zuordnen. */
export function faengeFuer(keys, catches){
  const ks = new Set(keys);
  const passend = new Set();
  FISCHE.forEach(f => (f.ansaetze || []).forEach(a => { if(ks.has(a.setup)) passend.add(f.id + "::" + a.methode); }));
  return catches.filter(c => passend.has((c.fischId || "") + "::" + (c.methode || "")));
}

/* ---------- Rute + Rolle bewerten ----------
   Dieselben Faustregeln wie in der Werkstatt der bisherigen App
   (bewerteKombo in app.js), damit beide dasselbe Urteil fällen. */
function wgZuGroesse(wgMax){
  if(wgMax <= 6)  return [1000, 2500];
  if(wgMax <= 12) return [1000, 3000];
  if(wgMax <= 25) return [2000, 3500];
  if(wgMax <= 50) return [2500, 4000];
  if(wgMax <= 80) return [3000, 5000];
  return [3500, 6000];
}
export function bewerteKombo(rute, rolle){
  if(!rute || !rolle || !rute.wg || !rolle.groesse) return null;
  const gruende = [];
  let stufe = 0;
  let [min, max] = wgZuGroesse(rute.wg[1]);
  if(rute.laenge >= 3.6){ min += 500; max += 500; gruende.push("lange Rute braucht Gegengewicht"); }
  else if(rute.laenge <= 2.0){ min = Math.max(500, min - 500); max -= 500; gruende.push("kurze Rute will eine leichte Rolle"); }
  const g = rolle.groesse;
  if(g < min){ const w = min - g; stufe = w > 1000 ? 2 : 1; gruende.unshift(`Rolle ${w > 1000 ? "deutlich " : ""}zu klein (passend ${min}–${max})`); }
  else if(g > max){ const w = g - max; stufe = w > 1000 ? 2 : 1; gruende.unshift(`Rolle ${w > 1000 ? "deutlich " : ""}zu groß (passend ${min}–${max})`); }
  else gruende.unshift(`Größe passt zu ${komma(rute.wg[0])}–${komma(rute.wg[1])} g`);
  const passiv = rute.kategorie === "ansitz" || rute.kategorie === "pose";
  if(rolle.freilauf && passiv) gruende.push("Freilauf passt zur Rute im Halter");
  else if(rolle.freilauf && !passiv){ stufe = Math.min(2, stufe + 1); gruende.push("Freilauf bringt beim aktiven Führen nichts"); }
  else if(!rolle.freilauf && passiv) gruende.push("ohne Freilauf: Bügel offen oder Schnurclip");
  const bew = (typeof KOMBO_BEWUSST !== "undefined" ? KOMBO_BEWUSST : []).find(k => k.ruten.includes(rute.id) && k.rollen.includes(rolle.id));
  if(bew && stufe > 0){
    gruende.unshift("Bewusst so gewählt: " + bew.text);
    for(let k = gruende.length - 1; k > 0; k--) if(/^Freilauf bringt/.test(gruende[k])) gruende.splice(k, 1);
    stufe = 0;
  }
  return { stufe, urteil: ["passt", "geht", "passt nicht"][stufe], gruende };
}

/* Wer trägt diese Rolle gerade? */
export function rolleMontiertAuf(rolleId){
  const s = Object.values(AKTUELL).find(x => x.rolleId === rolleId);
  return s ? s : null;
}

/* Wurfgewicht auf gemeinsamer logarithmischer Skala 0,5–150 g (in %) */
const LO = Math.log10(0.5), SPAN = Math.log10(150) - LO;
export function wgPos(v){ return Math.max(0, Math.min(100, (Math.log10(v) - LO) / SPAN * 100)); }
