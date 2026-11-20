/* ============================================================
   Köder-Bilanz (Fangbuch, Reiter „Köder“)
   Welche Köder fangen bei dir wirklich – auf welche Arten, an welchen
   Spots, wie oft eingesetzt (Ausflüge, Live-Köderwechsel), wie oft
   abgerissen. Dazu die Ladenhüter: Köder aus deiner Box, die in den
   letzten zwölf Monaten nie im Einsatz waren.
   bewaehrteKoeder() liefert „Köder heute“ deine Favoriten je Fischart.
   ============================================================ */
import { alleFaenge } from "./fangbuch.js";
import { ausfluege } from "./tagebuch.js";
import { box, standVon } from "./kleinteile.js";
import { ladeFaengeDaten } from "./store.js";

const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[c]));
const norm = s => String(s || "").trim().toLowerCase().replace(/\s+/g, " ");
const fischName = (id, fb) => ((FISCHE.find(f => f.id === id) || {}).name || fb || id || "").split(" (")[0];
const KOEDER_KATS = ["gummi", "kunst", "natur", "jig"];

/* Köder-Texte eines Ausflugs: Feld „koeder“ (mit Komma getrennt) + Live-Köderwechsel */
function koederDesAusflugs(a){
  const s = new Set(String(a.koeder || "").split(/\s*,\s*/).map(norm).filter(Boolean));
  (a.ereignisse || []).filter(e => e.typ === "koeder" && e.text).forEach(e => s.add(norm(e.text)));
  return [...s];
}

export function bilanz(){
  const faenge = alleFaenge().filter(c => c.koeder);
  const aus = ausfluege();
  const alle = ladeFaengeDaten().catches;
  const m = new Map();
  const eintrag = k => { if(!m.has(k)) m.set(k, { name: k, faenge: [], ausfluege: new Set(), mitFang: new Set(), abrisse: 0 }); return m.get(k); };
  faenge.forEach(c => String(c.koeder).split(/\s*,\s*/).map(norm).filter(Boolean).forEach(k => { const e = eintrag(k); e.faenge.push(c); if(c.ausflugId) { e.ausfluege.add(c.ausflugId); e.mitFang.add(c.ausflugId); } }));
  aus.forEach(a => {
    const hatteFang = (a.faenge || []).some(x => x.art) || alle.some(c => c.ausflugId === a.id);
    koederDesAusflugs(a).forEach(k => { const e = eintrag(k); e.ausfluege.add(a.id); if(hatteFang && e.faenge.some(c => c.ausflugId === a.id || c.datum === a.datum)) e.mitFang.add(a.id); });
    (a.ereignisse || []).filter(e => e.typ === "abriss" && e.text).forEach(e => eintrag(norm(e.text)).abrisse++);
  });
  /* schönen Namen nehmen: so wie zuletzt geschrieben */
  const anzeige = new Map();
  faenge.forEach(c => String(c.koeder).split(/\s*,\s*/).forEach(t => { if(t.trim()) anzeige.set(norm(t), t.trim()); }));
  return [...m.values()].map(e => ({ ...e, anzeige: anzeige.get(e.name) || e.name, einsaetze: e.ausfluege.size })).sort((a, b) => b.faenge.length - a.faenge.length || b.einsaetze - a.einsaetze);
}

/* Für „Köder heute“: deine Top-Köder für eine Art (mind. 2 Fänge) */
export function bewaehrteKoeder(fischId){
  return bilanz().map(e => ({ name: e.anzeige, n: e.faenge.filter(c => c.fischId === fischId).length })).filter(x => x.n >= 2).sort((a, b) => b.n - a.n).slice(0, 2);
}

/* Box-Köder ohne Einsatz in den letzten 12 Monaten */
function ladenhueter(b){
  const grenze = new Date(); grenze.setFullYear(grenze.getFullYear() - 1);
  const g = grenze.toISOString().slice(0, 10);
  const genutzt = new Set();
  alleFaenge().filter(c => c.koeder && c.datum >= g).forEach(c => String(c.koeder).split(/\s*,\s*/).forEach(t => genutzt.add(norm(t))));
  ausfluege().filter(a => a.datum >= g).forEach(a => koederDesAusflugs(a).forEach(k => genutzt.add(k)));
  const passt = n => [...genutzt].some(k => k && (k.includes(n) || n.includes(k)));
  return b.teile.filter(t => KOEDER_KATS.includes(t.kat) && t.kat !== "jig" && standVon(t) !== "leer" && !passt(norm(t.name)));
}

export function koederBilanzHTML(){
  const l = bilanz();
  const b = box();
  const lh = ladenhueter(b);
  if(!l.length && !lh.length) return `<p class="leer">Trag beim Fang oder im Live-Modus den Köder ein – dann siehst du hier, welche Köder bei dir wirklich fangen.</p>`;
  const max = Math.max(1, ...l.map(e => e.faenge.length));
  const zeile = e => {
    const arten = {}; e.faenge.forEach(c => { const n = fischName(c.fischId, c.fischName); arten[n] = (arten[n] || 0) + 1; });
    const g = e.faenge.filter(c => +String(c.laenge || "").replace(",", ".")).sort((x, y) => parseFloat(String(y.laenge).replace(",", ".")) - parseFloat(String(x.laenge).replace(",", ".")))[0];
    const quote = e.einsaetze ? Math.round(e.mitFang.size / e.einsaetze * 100) : null;
    const imBox = b.teile.find(t => norm(t.name) === e.name || e.name.includes(norm(t.name)));
    return `<li><span class="fb-b-label">${esc(e.anzeige)}<small>${[Object.entries(arten).sort((x, y) => y[1] - x[1]).map(([n, k]) => `${k}× ${n}`).join(", "),
      g ? `größter ${String(g.laenge).replace(".", ",")} cm` : "", e.einsaetze ? `${e.einsaetze} Ausflüge${quote != null ? `, ${quote} % mit Fang` : ""}` : "",
      e.abrisse ? `${e.abrisse}× abgerissen` : "", imBox ? `Box: ${{ voll: "genug", knapp: "knapp", leer: "leer" }[standVon(imBox)]}` : ""].filter(Boolean).map(esc).join(" · ")}</small></span>
      <span class="fb-b-spur"><span style="width:${Math.max(e.faenge.length ? 3 : 0, e.faenge.length / max * 100)}%"></span></span>
      <b class="fb-b-wert">${e.faenge.length}</b></li>`;
  };
  const top = l.filter(e => e.faenge.length);
  const ohne = l.filter(e => !e.faenge.length && e.einsaetze >= 2);
  return `${top.length ? `<section class="fb-stat"><h3>Diese Köder fangen bei dir</h3><ul class="fb-balken">${top.slice(0, 12).map(zeile).join("")}</ul>
      <p class="hinweis-klein">Zahl = Fänge. „% mit Fang“ zählt Ausflüge, an denen der Köder dabei war.</p></section>` : ""}
    ${ohne.length ? `<section class="fb-stat"><h3>Oft dabei, noch ohne Fang</h3><ul class="kb-liste">${ohne.slice(0, 8).map(e => `<li><b>${esc(e.anzeige)}</b><small>${e.einsaetze} Ausflüge${e.abrisse ? ` · ${e.abrisse}× abgerissen` : ""}</small></li>`).join("")}</ul>
      <p class="hinweis-klein">Nicht gleich aussortieren: anderer Spot, andere Farbe oder Führung probieren.</p></section>` : ""}
    ${lh.length ? `<section class="fb-stat"><h3>Ladenhüter in deiner Box</h3><ul class="kb-liste">${lh.slice(0, 12).map(t => `<li><b>${esc(t.name)}</b><small>seit 12 Monaten nicht im Einsatz</small></li>`).join("")}</ul>
      <p class="hinweis-klein">Vor dem nächsten Kauf: erst diese ausprobieren – oder bewusst nicht noch mehr davon kaufen.</p></section>` : ""}`;
}
