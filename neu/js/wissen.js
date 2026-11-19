/* ============================================================
   Bereich „Wissen“: Angelarten mit Montagen, Schaubild und Teileliste
   #wissen            -> Übersicht nach Gruppen
   #wissen/<id>       -> eine Angelart im Detail
   ============================================================ */
import { GRUPPEN, ANGELARTEN } from "./angelarten.js";
import { schaubildSVG } from "./schaubild.js";
import { lese } from "./store.js";

const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[c]));
const STATUS = { machbar: ["g", "Passt"], bedingt: ["y", "Geht mit Abstrichen"], wunsch: ["r", "Gerät fehlt"] };
const kurzName = s => esc(String(s.name || "").split(" · ")[0]) + (String(s.name).match(/\(([^)]+)\)\s*$/) ? ` <small>(${esc(s.name.match(/\(([^)]+)\)\s*$/)[1])})</small>` : "");

/* Was hast du schon? Zubehörliste + eigene Ergänzungen + Schnüre auf deinen Rollen */
function bestand(){
  const zus = (lese("mein_inventar_v1", {}) || {}).zubehoer || [];
  const schnuere = ROLLEN.map(r => r.schnur || "");
  return [...(typeof ZUBEHOER !== "undefined" ? ZUBEHOER : []), ...zus, ...schnuere];
}
/* Gezielter Treffer zuerst; ein Sammel-Eintrag wie „Kleinteile-Grundsortiment“ zählt nur als „vielleicht“ */
function treffer(suche, liste){
  if(!suche) return null;
  let re; try { re = new RegExp(suche, "i"); } catch(e){ return null; }
  const sammel = x => /sortiment|set/i.test(x) && /kleinteile/i.test(x);
  const genau = liste.find(x => re.test(x) && !sammel(x));
  if(genau) return { text: genau, sicher: true };
  const evtl = liste.find(x => re.test(x));
  return evtl ? { text: evtl, sicher: false } : null;
}

export function wissenHTML(id){
  const art = id ? ANGELARTEN.find(a => a.id === id) : null;
  return art ? detailHTML(art) : uebersichtHTML();
}

function uebersichtHTML(){
  return `<section class="wissen">
    <p class="eyebrow">Wissen</p>
    <h2>Angelarten</h2>
    <p class="lead-klein">Wie jede Methode funktioniert, welche Montage du brauchst, aus welchen Teilen sie besteht – und welches deiner Setups dafür passt.</p>
    ${GRUPPEN.map(g => {
      const arten = ANGELARTEN.filter(a => a.gruppe === g.key);
      if(!arten.length) return "";
      return `<div class="w-gruppe"><h3>${esc(g.titel)} <span>${esc(g.text)}</span></h3>
        <div class="w-karten">${arten.map(a => `<a class="w-karte" href="#wissen/${a.id}">
          <b>${esc(a.name)}</b><span>${esc(a.kurz)}</span><small>${esc(a.fische)} · ${a.montagen.length} Montage${a.montagen.length > 1 ? "n" : ""}</small></a>`).join("")}</div></div>`;
    }).join("")}
  </section>`;
}

function setupsHTML(art){
  const zeilen = art.ansaetze.map(([fid, i]) => {
    const f = FISCHE.find(x => x.id === fid);
    const a = f && f.ansaetze[i];
    if(!a) return "";
    const b = BERATER.bewerte(a, null);
    if(!b) return "";
    const [farbe, label] = STATUS[b.status];
    const gruen = b.liste.filter(x => x.stufe === 0);
    const gelb = b.liste.filter(x => x.stufe === 1).slice(0, gruen.length ? 2 : 3);
    const link = x => `<a href="#rutenwand/${x.setup.key}"><span class="amp ${x.stufe ? "y" : "g"}"></span>${kurzName(x.setup)}</a>`;
    return `<li><span class="status ${farbe}">${label}</span>
      <span class="w-ans"><b>${esc(f.name)}</b> · ${esc(a.methode.split(" – ").slice(-1)[0])}</span>
      <span class="w-alle">${gruen.length || gelb.length ? [...gruen, ...gelb].map(link).join("") : `<span class="hinweis-klein">kein passendes Setup</span>`}</span></li>`;
  }).join("");
  return zeilen ? `<div class="w-box"><h3>Deine Setups dafür</h3><ul class="w-setups">${zeilen}</ul>
    <p class="hinweis-klein">Grün = passt, gelb = geht mit Abstrichen – das beste zuerst. Bewertet über alle Gewässer; für ein bestimmtes Gewässer nutze den Berater unter „Heute“.</p></div>` : "";
}

function montageHTML(m, liste){
  const teile = m.teile.map(t => {
    const hast = treffer(t.s, liste);
    const pill = !hast ? "" : hast.sicher
      ? `<span class="pill frei" title="${esc(hast.text)}">hast du</span>`
      : `<span class="pill" title="${esc(hast.text)}">evtl. im Sortiment</span>`;
    return `<li class="${hast && hast.sicher ? "hast" : ""}"><span class="w-teil"><b>${esc(t.n)}</b>${t.d ? `<span>${esc(t.d)}</span>` : ""}</span>${pill}</li>`;
  }).join("");
  const n = m.teile.filter(t => { const h = treffer(t.s, liste); return h && h.sicher; }).length;
  return `<article class="w-montage">
    <div class="w-montage-kopf"><h3>${esc(m.name)}</h3><span class="hinweis-klein">${esc(m.wofuer)}</span></div>
    <div class="w-montage-raster">
      <figure class="w-bild">${schaubildSVG(m.bild, m.name)}<figcaption>Aufbau von der Rutenspitze (oben) bis zum Köder</figcaption></figure>
      <div class="w-rechts">
        <h4>Das brauchst du <span>${n} von ${m.teile.length} vermutlich vorhanden</span></h4>
        <ul class="w-teile">${teile}</ul>
        <h4>So baust du sie</h4>
        <ol class="w-schritte">${m.schritte.map(s => `<li>${esc(s)}</li>`).join("")}</ol>
      </div>
    </div>
  </article>`;
}

function detailHTML(art){
  const g = GRUPPEN.find(x => x.key === art.gruppe);
  const liste = bestand();
  return `<section class="wissen">
    <a class="zurueck sichtbar" href="#wissen">‹ Alle Angelarten</a>
    <p class="eyebrow">${esc(g ? g.titel : "")}</p>
    <h2>${esc(art.name)}</h2>
    <p class="lead-klein">${esc(art.kurz)}</p>
    <p class="w-fische"><b>Zielfische:</b> ${esc(art.fische)}</p>
    <div class="w-text">${art.beschreibung.map(p => `<p>${esc(p)}</p>`).join("")}</div>
    <div class="w-zwei">
      <div class="w-box"><h3>So geht's</h3><ol class="w-schritte">${art.ablauf.map(s => `<li>${esc(s)}</li>`).join("")}</ol></div>
      <div class="w-box"><h3>Passendes Gerät</h3><dl class="w-geraet">
        <div><dt>Rute</dt><dd>${esc(art.geraet.rute)}</dd></div>
        <div><dt>Rolle</dt><dd>${esc(art.geraet.rolle)}</dd></div>
        <div><dt>Schnur</dt><dd>${esc(art.geraet.schnur)}</dd></div></dl></div>
    </div>
    ${setupsHTML(art)}
    <h3 class="w-zwischen">Montage${art.montagen.length > 1 ? "n" : ""}</h3>
    ${art.montagen.map(m => montageHTML(m, liste)).join("")}
    <div class="w-zwei">
      <div class="w-box tipp"><h3>Profi-Tipps</h3><ul>${art.tipps.map(t => `<li>${esc(t)}</li>`).join("")}</ul></div>
      <div class="w-box fehler-box"><h3>Typische Fehler</h3><ul>${art.fehler.map(t => `<li>${esc(t)}</li>`).join("")}</ul></div>
    </div>
    <p class="hinweis-klein">„hast du“ wird aus deiner Zubehörliste und den Schnüren auf deinen Rollen abgeleitet – bitte im Zweifel nachsehen.</p>
  </section>`;
}
