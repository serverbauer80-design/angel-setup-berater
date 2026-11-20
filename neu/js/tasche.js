/* ============================================================
   Tasche für heute (Etappe 4)
   Du legst Setups in die Tasche – die Packliste ergibt sich aus den
   Montagen, für die diese Setups am gewählten Ort die beste Wahl sind,
   plus Pflicht-Dingen, Wetter und Tageszeit. Abgehakt bleibt abgehakt,
   für den Tag (am nächsten Tag ist die Liste frisch). Wird synchronisiert.
   ============================================================ */
import { lese, schreibe, beiAenderung, pushDebounced, tascheSetzen } from "./store.js";
import { angelartFuer } from "./angelarten.js";

export const TASCHE_KEY = "neu_tasche_v1";
export function tasche(){ return lese(TASCHE_KEY, null) || { setups: [], abgehakt: {}, geaendert: "" }; }
function speichere(t){ t.geaendert = new Date().toISOString(); tascheSetzen(t); }

export function inTasche(key){ return tasche().setups.includes(key); }
/* zweck = "fischId#index" (aus dem Berater) – dann packt die Liste nur dafür.
   Ohne Zweck (aus der Rutenwand) gilt alles, wofür das Setup am Ort das beste ist. */
export function umschalten(key, zweck){
  const t = tasche();
  t.zwecke = t.zwecke || {};
  if(t.setups.includes(key) && !zweck){ t.setups = t.setups.filter(k => k !== key); delete t.zwecke[key]; }
  else if(t.setups.includes(key) && zweck){
    const z = t.zwecke[key] || [];
    if(z.includes(zweck)){ t.zwecke[key] = z.filter(x => x !== zweck); if(!t.zwecke[key].length){ t.setups = t.setups.filter(k => k !== key); delete t.zwecke[key]; } }
    else t.zwecke[key] = [...z, zweck];
  } else { t.setups = [...t.setups, key]; if(zweck) t.zwecke[key] = [zweck]; }
  speichere(t);
  return t.setups.includes(key);
}
export function inTascheFuer(key, zweck){
  const t = tasche();
  if(!t.setups.includes(key)) return false;
  const z = (t.zwecke || {})[key];
  return !zweck || !z || z.includes(zweck);
}
/* Häkchen gelten für einen Angeltag – am nächsten Tag ist die Liste wieder frisch */
const heuteTag = () => { const d = new Date(); return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10); };
export function haken(t){ return (!t.hakenTag || t.hakenTag === heuteTag()) ? (t.abgehakt || {}) : {}; }
export function abhaken(text){
  const t = tasche();
  if(t.hakenTag && t.hakenTag !== heuteTag()) t.abgehakt = {};
  t.hakenTag = heuteTag();
  if(t.abgehakt[text]) delete t.abgehakt[text]; else t.abgehakt[text] = true;
  speichere(t);
}
export function leeren(){ speichere({ setups: [], abgehakt: {} }); }
export function nurHakenWeg(){ const t = tasche(); t.abgehakt = {}; speichere(t); }

/* ---------- Packliste ---------- */
export function packliste(ort, lage){
  const t = tasche();
  const gw = ort ? ort.gw : null;
  const setups = t.setups.map(k => AKTUELL[k]).filter(Boolean);
  const gruppen = [];

  /* 1) Ruten */
  if(setups.length) gruppen.push({ titel: "Ruten & Rollen", punkte: setups.map(s => ({ text: String(s.name).split(" (")[0] + (String(s.name).match(/\(([^)]+)\)/) ? " (" + s.name.match(/\(([^)]+)\)/)[1] + ")" : ""), info: String(s.rolle || "").split(" · ")[0] })) });

  /* 2) Montage-Teile: für welche Ansätze ist das Setup hier die beste Wahl? */
  const teile = new Map(), methoden = [], zielfische = new Set();
  setups.forEach(s => {
    FISCHE.forEach(f => {
      if(gw && !f.gewaesser.includes(gw)) return;
      f.ansaetze.forEach((a, i) => {
        if(gw && a.gewaesser && !a.gewaesser.includes(gw)) return;
        const zwecke = (t.zwecke || {})[s.key];
        if(zwecke && zwecke.length){ if(!zwecke.includes(f.id + "#" + i)) return; }
        else {
          const b = BERATER.bewerte(a, gw);
          if(!b || !b.bester || b.bester.setup.key !== s.key) return;
        }
        methoden.push(`${f.name}: ${a.methode.split(" – ")[0]}`);
        zielfische.add(f.id);
        const art = angelartFuer(f.id, i);
        const m = art && art.montagen[0];
        if(m){
          m.teile.forEach(x => {
            if(/hauptschnur/i.test(x.n)) return;            // ist schon auf der Rolle
            if(!teile.has(x.n)) teile.set(x.n, { text: x.n, info: x.d });
          });
        } else (a.montage || []).forEach(x => {
          if(/hauptschnur|schnur$/i.test(x.k)) return;
          if(!teile.has(x.k)) teile.set(x.k, { text: x.k, info: x.v });
        });
      });
    });
  });
  if(teile.size) gruppen.push({ titel: "Montage & Köder", punkte: [...teile.values()], hinweis: methoden.length ? "Für: " + [...new Set(methoden)].join(" · ") : "" });

  /* 3) Pflicht & Fisch versorgen */
  gruppen.push({ titel: "Pflicht & Fisch versorgen", punkte: [
    { text: "Fischereischein + Personalausweis" },
    { text: ort && /Dänemark/.test(ort.name) ? "Dänischer Angelschein (Fisketegn)" : "Erlaubnisschein / Tageskarte fürs Gewässer" },
    { text: "Kescher" }, { text: "Abhakmatte" }, { text: "Lösezange / Hakenlöser" },
    { text: "Maßband", info: mindestmasse(zielfische) }, { text: "Fischtöter + Messer", info: "nur wenn du entnehmen willst" },
    { text: "Eimer / Kühltasche für den Fang" }
  ]});

  /* 4) Wetter, Tageszeit, Ort */
  const extra = [];
  if(lage){
    if(lage.regenMax >= 40) extra.push({ text: "Regenjacke", info: `Regenrisiko bis ${lage.regenMax} %` });
    if(lage.tmin !== null && lage.tmin < 8) extra.push({ text: "Warme Kleidung, Mütze, Handschuhe", info: `bis ${Math.round(lage.tmin)} °C` });
    if(lage.tmax !== null && lage.tmax >= 22) extra.push({ text: "Sonnenschutz, Getränke, Kappe", info: `bis ${Math.round(lage.tmax)} °C` });
    if(lage.wolken < 50) extra.push({ text: "Polbrille", info: "sieht Fische und Struktur unter Wasser" });
  }
  extra.push({ text: "Kopflampe (mit Rotlicht)", info: "Dämmerung kommt früher als gedacht" });
  if(ort && ort.kueste) extra.push({ text: "Süßwasser zum Abspülen der Rollen" }, { text: "Wathose / Watstiefel" });
  if(setups.some(s => s.kategorie === "ansitz" || s.kategorie === "feeder")) extra.push({ text: "Rutenhalter / Rod-Pod", info: "für die Ansitzruten" }, { text: "Bissanzeiger" }, { text: "Stuhl" });
  extra.push({ text: "Handy geladen + Powerbank" }, { text: "Erste-Hilfe-Set" }, { text: "Müllbeutel" });
  gruppen.push({ titel: "Wetter & Komfort", punkte: extra });

  const alle = gruppen.flatMap(g => g.punkte);
  const h = haken(t);
  return { gruppen, gesamt: alle.length, erledigt: alle.filter(p => h[p.text]).length, t, haken: h };
}

/* „Mindestmaß Zander 45 cm · Hecht 45 cm“ für die Zielfische der Tasche */
function mindestmasse(ids){
  if(typeof RECHT_SH === "undefined") return "";
  const l = [...ids].map(id => { const r = RECHT_SH[id]; const m = r && String(r.mindestmass).match(/^(\d+)\s*cm/);
    return m ? `${(FISCHE.find(f => f.id === id) || {}).name.split(" (")[0]} ${m[1]} cm` : null; }).filter(Boolean);
  return l.length ? "Mindestmaß " + l.join(" · ") : "";
}
