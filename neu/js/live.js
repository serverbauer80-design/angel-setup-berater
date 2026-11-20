/* ============================================================
   Live-Modus am Wasser
   Starten, wenn du angelst: Spot, Setup und Köder sind gesetzt.
   „Fang!“ öffnet den Fang mit allem vorbelegt (nur noch die Art
   wählen), dazu Biss, Fehlbiss und Köderwechsel mit einem Tipp.
   Beim Beenden entsteht daraus ein Ausflug mit Wetter, Dauer und
   Zusammenfassung – auch die Zeit ohne Fang zählt so für die
   Auswertung. Stand liegt im Browser (überlebt Neustart/Offline).
   ============================================================ */
import { lese, schreibe, ladeFaengeDaten } from "./store.js";
import { fangBearbeiten } from "./fangbuch.js";
import { speichereAusflug } from "./tagebuch.js";
import { orteListe, tagesLage, windRichtung } from "./lage.js";
import { alleSetups, heuteISO } from "./setups.js";
import { tasche } from "./tasche.js";
import { box } from "./kleinteile.js";
import { limitStand } from "./scheine.js";

const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[c]));
const KEY = "neu_live_v1";
const jetzt = () => new Date().toTimeString().slice(0, 5);
const genId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

export const live = () => lese(KEY, null);
const speichere = l => schreibe(KEY, l);

function setupName(key){ const s = alleSetups().find(x => x.key === key); return s ? s.titel + (s.zusatz ? " (" + s.zusatz + ")" : "") : ""; }
function faengeDerSitzung(l){ return ladeFaengeDaten().catches.filter(c => c.ausflugId === l.id); }

export function liveStarten(ortId){
  const spotId = ortId && String(ortId).startsWith("spot_") ? ortId.slice(5) : null;
  const ort = orteListe().find(o => o.id === ortId);
  const t = tasche();
  const l = { id: genId(), datum: heuteISO(), von: jetzt(), ortId: ortId || null, spotId, ortName: ort ? ort.name : "", setup: t.setups[0] || "", koeder: "", ereignisse: [] };
  speichere(l);
  return l;
}
function ereignis(typ, text){
  const l = live(); if(!l) return;
  l.ereignisse.push({ z: jetzt(), typ, text: text || "" });
  speichere(l);
}

/* Zusammenfassung für den Ausflug */
function zusammenfassung(l){
  const n = typ => l.ereignisse.filter(e => e.typ === typ).length;
  const koeder = [...new Set(l.ereignisse.filter(e => e.typ === "koeder").map(e => e.text).concat(l.koeder ? [l.koeder] : []))];
  const zeilen = l.ereignisse.map(e => `${e.z} ${({ biss: "Biss", fehlbiss: "Fehlbiss", koeder: "Köder: ", setup: "Setup: ", notiz: "" })[e.typ] ?? ""}${e.typ === "biss" || e.typ === "fehlbiss" ? (e.text ? " – " + e.text : "") : e.text}`);
  return { bisse: n("biss"), fehlbisse: n("fehlbiss"), koeder, text: [`Live-Protokoll: ${n("biss")} ${n("biss") === 1 ? "Biss" : "Bisse"}, ${n("fehlbiss")} ${n("fehlbiss") === 1 ? "Fehlbiss" : "Fehlbisse"}.`, ...zeilen].join("\n") };
}

export function liveBeenden(wetterRoh){
  const l = live(); if(!l) return Promise.resolve(null);
  const z = zusammenfassung(l);
  let wetter = {};
  if(wetterRoh){
    const lg = tagesLage(wetterRoh, 0);
    if(lg){
      const himmel = (lg.regenMax || 0) >= 60 ? "Regen" : lg.wolken < 20 ? "klar / sonnig" : lg.wolken < 50 ? "leicht bewölkt" : lg.wolken < 85 ? "stark bewölkt" : "bedeckt";
      wetter = { temp: Math.round(lg.temp), wind: `${windRichtung(lg.richtung)} ${Math.round(lg.wind)} km/h`, bewoelkung: himmel, luftdruck: /fallend/.test(lg.trend) ? "fallend" : /steigend/.test(lg.trend) ? "steigend" : "stabil" };
    }
  }
  const a = { id: l.id, datum: l.datum, von: l.von, bis: jetzt(), spotId: l.spotId, wetter, wassertemp: null, methode: "", koeder: z.koeder.join(", "),
    setup: l.setup || "", bewertung: 0, notizen: z.text, faenge: [], foto: null, bisse: z.bisse, fehlbisse: z.fehlbisse, ereignisse: l.ereignisse, live: true };
  try { localStorage.removeItem(KEY); } catch(e){}
  return speichereAusflug(a).then(() => a);
}

/* ---------- Ansicht ---------- */
export function liveHTML(ortId){
  const l = live();
  if(!l) return `<div class="h-live-start"><button type="button" class="knopf prim" data-live-start="${esc(ortId || "")}">Am Wasser? Live-Modus starten</button>
    <span class="hinweis-klein">Fang, Biss und Köderwechsel mit einem Tipp festhalten.</span></div>`;
  const f = faengeDerSitzung(l);
  const n = typ => l.ereignisse.filter(e => e.typ === typ).length;
  const setups = alleSetups().filter(s => s.kategorie !== "backup");
  const koederListe = [...new Set(box().teile.filter(t => ["gummi", "kunst", "natur", "jig"].includes(t.kat)).map(t => t.name))];
  return `<div class="h-karte h-live"><div class="live-kopf"><span class="live-punkt"></span><b>Live seit ${esc(l.von)}</b><span>${esc(l.ortName || "")}</span></div>
    <div class="live-zahlen"><div><b>${f.length}</b><span>Fänge</span></div><div><b>${n("biss")}</b><span>Bisse</span></div><div><b>${n("fehlbiss")}</b><span>Fehlbisse</span></div></div>
    ${(() => { const lim = limitStand(l.spotId, l.datum); return lim.length ? `<p class="live-limit">${lim.map(x => `<span class="${x.n >= x.max ? "voll" : ""}">${esc(x.label)} ${x.n}/${x.max}</span>`).join("")}</p>` : ""; })()}
    <button type="button" class="knopf prim live-fang" data-live-fang>Fang!</button>
    <div class="live-knoepfe"><button type="button" class="knopf" data-live-ereignis="biss">Biss</button><button type="button" class="knopf" data-live-ereignis="fehlbiss">Fehlbiss</button></div>
    <div class="live-felder">
      <label class="feld"><span>Setup</span><select data-live-setup><option value="">–</option>${setups.map(s => `<option value="${esc(s.key)}"${s.key === l.setup ? " selected" : ""}>${esc(s.titel + (s.zusatz ? " (" + s.zusatz + ")" : ""))}</option>`).join("")}</select></label>
      <label class="feld"><span>Köder gerade</span><input type="text" data-live-koeder value="${esc(l.koeder)}" list="live-koeder" placeholder="z. B. Gummifisch 10 cm" autocomplete="off"></label>
      <datalist id="live-koeder">${koederListe.map(k => `<option value="${esc(k)}">`).join("")}</datalist>
    </div>
    ${l.ereignisse.length ? `<ul class="live-log">${l.ereignisse.slice(-5).reverse().map(e => `<li><span class="mono">${esc(e.z)}</span>${esc(({ biss: "Biss", fehlbiss: "Fehlbiss", koeder: "Köder: ", setup: "Setup: " })[e.typ] || "")}${e.typ === "koeder" || e.typ === "setup" ? esc(e.text) : ""}</li>`).join("")}</ul>` : ""}
    <div class="akt-zeile"><button type="button" class="knopf" data-live-ende>Beenden &amp; als Ausflug speichern</button><button type="button" class="knopf leise" data-live-abbruch>Verwerfen</button></div>
  </div>`;
}
/* schwebender Fang-Knopf auf allen Seiten */
export function liveFabHTML(){ return live() ? `<button type="button" class="live-fab" data-live-fang aria-label="Fang eintragen">Fang!</button>` : ""; }

/* true = verarbeitet; neuZeichnen() zeichnet die Seite neu */
export function liveKlick(e, { toast, neuZeichnen, wetterFuer }){
  const t = e.target;
  const st = t.closest("[data-live-start]");
  if(st){ liveStarten(st.dataset.liveStart || null); toast("Live-Modus läuft – Petri Heil!"); neuZeichnen(); return true; }
  if(t.closest("[data-live-fang]")){
    const l = live(); if(!l) return true;
    fangBearbeiten(null, { spotId: l.spotId, setup: l.setup || undefined, koeder: l.koeder || "", ausflugId: l.id });
    return true;
  }
  const er = t.closest("[data-live-ereignis]");
  if(er){ ereignis(er.dataset.liveEreignis); toast(er.dataset.liveEreignis === "biss" ? "Biss notiert" : "Fehlbiss notiert"); neuZeichnen(); return true; }
  if(t.closest("[data-live-ende]")){
    const l = live(); if(!l) return true;
    liveBeenden(wetterFuer ? wetterFuer(l) : null).then(a => { toast("Als Ausflug gespeichert"); neuZeichnen(); });
    return true;
  }
  if(t.closest("[data-live-abbruch]")){
    if(!confirm("Live-Protokoll verwerfen? Eingetragene Fänge bleiben im Fangbuch.")) return true;
    try { localStorage.removeItem(KEY); } catch(err){}
    neuZeichnen(); return true;
  }
  return false;
}
/* Änderungen an Setup/Köder */
export function liveAenderung(e){
  const l = live(); if(!l) return false;
  if(e.target.matches("[data-live-setup]")){ l.setup = e.target.value; speichere(l); ereignis("setup", setupName(l.setup)); return true; }
  if(e.target.matches("[data-live-koeder]")){ const k = e.target.value.trim(); if(k && k !== l.koeder){ l.koeder = k; speichere(l); ereignis("koeder", k); } return true; }
  return false;
}
