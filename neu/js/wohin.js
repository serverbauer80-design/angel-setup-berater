/* ============================================================
   „Wo heute?“ – alle Orte und Spots für die nächsten 3 Tage
   Für jeden Ort aus „Heute“ (feste Gewässer + deine besuchten Spots)
   rechnet die App dieselbe Bewertung wie bei „Passt heute“ – mit
   Wetter, Küste (Wind zur Küste, Welle) und Fangbuch-Erfahrung – und
   zeigt die stärksten Kombinationen aus Ort, Tag und Fisch.
   Wetter für alle Orte in einer Anfrage (Open-Meteo).
   ============================================================ */
import { orteListe, ladeWetterViele, tagesLage, fischBewertung, urteil, tagISO } from "./lage.js";
import { ladeKueste, kuesteTag } from "./kueste.js";
import { erfahrung } from "./erfahrung.js";

const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[c]));
const TAG = ["Heute", "Morgen", "Übermorgen"];
const kurz = n => String(n || "").split(" (")[0];

let ergebnis = null;      /* { t, liste } */
let laeuft = null;

export function wohinStand(){ return { ergebnis, laeuft: !!laeuft }; }

export function wohinBerechnen(fortschritt){
  if(laeuft) return laeuft;
  laeuft = (async () => {
    const orte = orteListe();
    fortschritt && fortschritt("Wetter für " + orte.length + " Orte …");
    const wetter = await ladeWetterViele(orte);
    const kueste = {};
    const kOrte = orte.filter(o => o.kueste);
    for(let i = 0; i < kOrte.length; i++){
      fortschritt && fortschritt(`Küste ${i + 1}/${kOrte.length} …`);
      try { kueste[kOrte[i].id] = await ladeKueste(kOrte[i]); } catch(e){}
    }
    const liste = [];
    orte.forEach(ort => {
      const w = wetter[ort.id]; if(!w) return;
      for(let tag = 0; tag < 3; tag++){
        const lage = tagesLage(w, tag);
        if(!lage) continue;
        if(ort.kueste && kueste[ort.id]) lage.kueste = kuesteTag(kueste[ort.id], lage.iso, tag === 0, lage);
        const iso = tagISO(tag);
        const b = fischBewertung(ort, lage, +iso.slice(5, 7), iso, erfahrung(ort, lage, iso).map);
        const top = b.passt.filter(x => x.besteStatus === "machbar")[0] || b.passt[0];
        if(!top) continue;
        liste.push({ ort, tag, iso, top, zweit: b.passt.filter(x => x !== top && x.punkte >= 2).slice(0, 2), lage });
      }
    });
    /* stärkster Fisch zählt; bei Gleichstand der nähere Tag */
    const breite = x => x.zweit.reduce((s, z) => s + z.punkte, 0);
    liste.sort((a, b) => b.top.punkte - a.top.punkte || breite(b) - breite(a) || a.tag - b.tag);
    ergebnis = { t: Date.now(), liste };
    return ergebnis;
  })().finally(() => { laeuft = null; });
  return laeuft;
}

export function wohinHTML(){
  const st = ergebnis;
  if(!st || Date.now() - st.t > 30 * 60e3){
    return `<div class="h-karte h-wohin"><div class="wo-kopf"><h3>Wo lohnt es sich?</h3>
      <button type="button" class="knopf klein" data-wohin>${laeuft ? "Rechne …" : "Alle Spots vergleichen"}</button></div>
      <p class="hinweis-klein" id="wo-status">Vergleicht alle Gewässer und deine besuchten Spots für heute, morgen und übermorgen – mit Wetter, Wind zur Küste und deiner Fangbuch-Erfahrung.</p></div>`;
  }
  /* je Ort nur der beste Tag, damit die Liste nicht von einem Ort voll ist */
  const gesehen = new Set(), top = [];
  st.liste.forEach(x => { if(!gesehen.has(x.ort.id) && top.length < 6){ gesehen.add(x.ort.id); top.push(x); } });
  return `<div class="h-karte h-wohin"><div class="wo-kopf"><h3>Wo lohnt es sich?</h3>
      <button type="button" class="knopf klein leise" data-wohin>Neu rechnen</button></div>
    <ol class="wo-liste">${top.map((x, i) => {
      const [farbe, text] = urteil(x.top.punkte);
      return `<li><button type="button" class="wo-zeile" data-wohin-ort="${esc(x.ort.id)}" data-wohin-tag="${x.tag}">
        <span class="wo-rang">${i + 1}</span>
        <span class="wo-txt"><b>${esc(x.ort.name)}</b>
          <small>${TAG[x.tag]} · <span class="amp ${farbe}"></span>${esc(kurz(x.top.fisch.name))} ${esc(text)}${x.zweit.length ? ` · auch ${esc(x.zweit.map(z => kurz(z.fisch.name)).join(", "))}` : ""}</small>
          ${x.top.plus.length ? `<small class="wo-grund">${esc(x.top.plus.slice(0, 2).join(" · "))}</small>` : ""}</span>
        <span class="wo-pfeil">›</span></button></li>`;
    }).join("")}</ol>
    <p class="hinweis-klein">Je Ort der beste der nächsten drei Tage. Antippen öffnet ihn in „Heute“. Gezeiten und Pegel siehst du dort im Detail.</p></div>`;
}
