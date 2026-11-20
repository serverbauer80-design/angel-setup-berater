/* ============================================================
   Einkaufsplanung (Etappe 11)
   Welches Teil der Wunschliste bringt dir am meisten? Jeder Ansatz im
   Berater, der heute nur „mit Abstrichen“ oder gar nicht geht, nennt in
   data.js das Wunsch-Setup, das ihn lösen würde (braucht). Daraus:
   wie viele Methoden werden grün, welche Fischarten kommen neu dazu,
   wann ist deren Saison, was ist rechtlich eingeschränkt – und der Preis.
   Gerechnet wird mit deinem aktuellen Gerät (BERATER), nicht mit dem
   Stand in data.js: was du inzwischen abdeckst, zählt nicht mehr.
   ============================================================ */
import { TOPMONATE, rechtFuer } from "./lage.js";
import { alleFaenge } from "./fangbuch.js";

const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[c]));
const MONATE = ["Januar", "Februar", "März", "April", "Mai", "Juni", "Juli", "August", "September", "Oktober", "November", "Dezember"];
const GW = { ostsee: "Ostsee", nordsee: "Nordsee", see: "See", nok: "Kanal", eider: "Eider", elbe: "Elbe", forellensee: "Forellensee", kutter: "Kutter" };
const kurz = n => String(n || "").split(" (")[0];

function katalog(){
  const w = typeof WUNSCH !== "undefined" ? WUNSCH : {};
  const e = typeof EMPFEHLUNG !== "undefined" && EMPFEHLUNG.setups ? EMPFEHLUNG.setups : {};
  return { ...w, ...e };
}
/* niedrigster Preis aus „ca. 220–330 €“ bzw. „nur … ca. 5–10 €“ */
function preisAb(t){ const m = String(t || "").match(/(\d[\d.]*)\s*(?:–|-|€)/); return m ? +m[1].replace(".", "") : null; }
/* Saison: jetzt oder in wie vielen Monaten beginnt die Top-Zeit? Monate in der Schonzeit zählen nicht */
function saison(fischId){
  const top = TOPMONATE[fischId];
  if(!top) return null;
  const m = new Date().getMonth() + 1;
  for(let d = 0; d < 12; d++){ const x = (m - 1 + d) % 12 + 1; if(top.includes(x) && rechtFuer(fischId, x).status !== "schonzeit") return { in: d, monat: x }; }
  return null;
}

export function einkaufsplan(){
  const kat = katalog();
  const gefangen = new Set(alleFaenge().map(c => c.fischId).filter(Boolean));
  const monat = new Date().getMonth() + 1;
  const proKey = {};
  FISCHE.forEach(f => {
    /* Hat der Fisch schon irgendwo eine grüne Methode? Dann ist er nicht „neu“ */
    const stati = f.ansaetze.map(a => { const b = BERATER.bewerte(a, null); return b ? b.status : a.status; });
    const schonGruen = stati.includes("machbar");
    f.ansaetze.forEach((a, i) => {
      if(!a.braucht || !kat[a.braucht]) return;
      const st = stati[i];
      if(st === "machbar") return;
      const e = proKey[a.braucht] = proKey[a.braucht] || { key: a.braucht, ansaetze: [], neueFische: new Set(), fische: new Set(), gw: new Set() };
      e.ansaetze.push({ fisch: f, a, st });
      e.fische.add(f.id);
      if(!schonGruen) e.neueFische.add(f.id);
      (a.gewaesser || f.gewaesser || []).forEach(g => e.gw.add(g));
    });
  });

  const ergebnis = Object.keys(kat).map(key => {
    const w = kat[key], e = proKey[key];
    const preis = preisAb(w.preis);
    if(!e) return { key, w, preis, punkte: -1, gruende: [], ohne: true };
    let p = 0; const gruende = [], warn = [];
    e.ansaetze.forEach(x => { p += x.st === "wunsch" ? 3 : 1.5; });
    const neu = [...e.neueFische];
    if(neu.length){ p += 4 * neu.length; gruende.push(`neue Fischart${neu.length > 1 ? "en" : ""}: ${neu.map(id => kurz(FISCHE.find(f => f.id === id).name)).join(", ")}`); }
    const besser = e.ansaetze.filter(x => !neu.includes(x.fisch.id));
    if(besser.length) gruende.push(`besser statt „mit Abstrichen“: ${besser.map(x => kurz(x.fisch.name) + " – " + x.a.methode.split(" – ")[0]).join(", ")}`);
    /* Saison */
    const sais = [...e.fische].map(id => ({ id, s: saison(id) })).filter(x => x.s).sort((a, b) => a.s.in - b.s.in);
    if(sais.length){
      const n = sais[0];
      if(n.s.in === 0){ p += 2; gruende.push(`${kurz(FISCHE.find(f => f.id === n.id).name)} hat jetzt Saison`); }
      else if(n.s.in <= 3){ p += 1; gruende.push(`Saison für ${kurz(FISCHE.find(f => f.id === n.id).name)} ab ${MONATE[n.s.monat - 1]} – Zeit zum Vorbereiten`); }
      else gruende.push(`Saison für ${kurz(FISCHE.find(f => f.id === n.id).name)} erst ab ${MONATE[n.s.monat - 1]} – kein Grund zur Eile`);
    }
    /* Recht: stark eingeschränkte Arten zählen weniger */
    [...e.fische].forEach(id => {
      const r = rechtFuer(id, monat);
      if(r.status === "geschuetzt" || (r.r && r.r.schutz && /eingeschränkt|verboten|quote/i.test(r.r.schonzeit))){ p -= 3; warn.push(`${kurz(FISCHE.find(f => f.id === id).name)}: ${String(r.r.schonzeit).replace(/&amp;/g, "&")}`); }
    });
    /* schon mal gefangen -> du willst die Art offenbar */
    const bekannt = [...e.fische].filter(id => gefangen.has(id));
    if(bekannt.length){ p += 1; gruende.push(`du hast schon ${bekannt.map(id => kurz(FISCHE.find(f => f.id === id).name)).join(", ")} gefangen`); }
    if(/Eigene Geräteklasse|Fernziel/i.test((w.dazu || "") + (w.hinweis || ""))) p -= 5;
    return { key, w, preis, punkte: p, gruende, warn, gw: [...e.gw].map(g => GW[g] || g), anzahl: e.ansaetze.length, neu: neu.length };
  });
  return ergebnis.sort((a, b) => b.punkte - a.punkte || (a.preis ?? 1e9) - (b.preis ?? 1e9));
}

export function einkaufHTML(){
  const plan = einkaufsplan();
  if(!plan.length) return "";
  const mit = plan.filter(x => !x.ohne), ohne = plan.filter(x => x.ohne);
  const karte = (x, i) => `<li class="ek-karte${i === 0 ? " top" : ""}">
    <div class="ek-kopf"><span class="ek-rang">${i + 1}</span><div><b>${esc(x.w.name)}</b>
      <small>${x.anzahl} Methode${x.anzahl > 1 ? "n" : ""} grün${x.neu ? ` · ${x.neu} neue Art${x.neu > 1 ? "en" : ""}` : ""}${x.gw.length ? " · " + esc(x.gw.join(", ")) : ""}</small></div>
      ${x.preis ? `<span class="ek-preis">ab ${x.preis} €</span>` : ""}</div>
    <ul class="ek-gruende">${x.gruende.map(g => `<li>${esc(g)}</li>`).join("")}${x.warn.map(g => `<li class="warn">${esc(g)}</li>`).join("")}</ul>
    <details class="ek-details"><summary>Was genau?</summary>
      <dl class="reihen">${[["Rute", x.w.rute], ["Rolle", x.w.rolle], ["Schnur", x.w.schnur], ["Dazu", x.w.dazu], ["Preis", x.w.preis]].filter(([, v]) => v).map(([k, v]) => `<div class="reihe"><dt>${k}</dt><dd>${esc(v)}</dd></div>`).join("")}</dl>
      ${x.w.warum ? `<p class="hinweis-klein">${esc(x.w.warum)}</p>` : ""}${x.w.hinweis ? `<p class="hinweis-klein">${esc(x.w.hinweis)}</p>` : ""}
    </details></li>`;
  return `<section class="einkauf"><h2 class="gruppe-titel">Was lohnt sich als Nächstes?</h2>
    <p class="gruppe-hinweis">Deine Wunschliste, gerechnet mit deinem jetzigen Gerät: Wie viele Methoden im Berater werden damit grün, welche Fischarten kommen neu dazu, wann ist Saison, was ist rechtlich eingeschränkt.</p>
    ${mit.length ? `<ol class="ek-liste">${mit.map(karte).join("")}</ol>` : `<p class="leer">Alles auf der Wunschliste deckt dein Gerät inzwischen ab.</p>`}
    ${ohne.length ? `<p class="hinweis-klein">Bringt im Berater gerade keine zusätzliche Methode (schon abgedeckt, reine Technik oder Fernziel): ${ohne.map(x => esc(kurz(x.w.name))).join(", ")}.</p>` : ""}
  </section>`;
}
