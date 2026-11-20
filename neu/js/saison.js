/* ============================================================
   Saisonbilanz (Fangbuch, Reiter „Saison“)
   Ein Jahr auf einen Blick: Fänge, Ausflüge, Erfolgsquote, neue Arten,
   persönliche Rekorde, bester Monat/Spot/Setup/Köder/Tageszeit, unter
   welchen Bedingungen es lief – und der Vergleich zum Vorjahr.
   ============================================================ */
import { alleFaenge } from "./fangbuch.js";
import { ausfluege } from "./tagebuch.js";
import { ladeFaengeDaten } from "./store.js";
import { alleSetups } from "./setups.js";

const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[c]));
const MON = ["Januar", "Februar", "März", "April", "Mai", "Juni", "Juli", "August", "September", "Oktober", "November", "Dezember"];
const MON_K = ["Jan", "Feb", "Mär", "Apr", "Mai", "Jun", "Jul", "Aug", "Sep", "Okt", "Nov", "Dez"];
const TZ = { daemmerung_morgen: "Morgendämmerung", vormittag: "Vormittag", mittag: "Mittag", nachmittag: "Nachmittag", daemmerung_abend: "Abenddämmerung", nacht: "Nacht" };
const zahl = v => { const n = parseFloat(String(v ?? "").replace(",", ".")); return isNaN(n) ? null : n; };
const cm = v => String(v).replace(".", ",") + " cm";
const fischName = (id, fallback) => ((FISCHE.find(f => f.id === id) || {}).name || fallback || id || "").split(" (")[0];
const artVon = c => c.fischId || (c.fischName ? "x:" + c.fischName.toLowerCase() : null);
const artName = (k, l) => k && k.startsWith("x:") ? (l[0].fischName || k.slice(2)) : fischName(k);
const haeufig = (liste, fn) => { const m = new Map(); liste.forEach(x => { const k = fn(x); if(k) m.set(k, (m.get(k) || []).concat([x])); }); return [...m.entries()].sort((a, b) => b[1].length - a[1].length); };

let jahrGewaehlt = null;
export function saisonKlick(e){
  const j = e.target.closest("[data-sb-jahr]");
  if(j){ jahrGewaehlt = j.dataset.sbJahr; return true; }
  if(e.target.closest("[data-sb-teilen]")){ teilen(); return false; }
  return false;
}

function jahresDaten(jahr, alle, trips){
  const f = alle.filter(c => String(c.datum || "").startsWith(jahr));
  const a = trips.filter(t => String(t.datum || "").startsWith(jahr));
  const mitFangIds = new Set(f.map(c => c.ausflugId).filter(Boolean));
  const erfolgreich = a.filter(t => mitFangIds.has(t.id) || (t.faenge || []).some(x => x.art));
  /* Angeltage: Tage mit Ausflug oder Fang */
  const tage = new Set([...f.map(c => c.datum), ...a.map(t => t.datum)].filter(Boolean));
  const tageMitFang = new Set(f.map(c => c.datum).filter(Boolean));
  return { f, a, erfolgreich, tage, tageMitFang };
}

function teilenText(){ return document.querySelector(".sb")?.dataset.text || ""; }
function teilen(){
  const text = teilenText();
  if(!text) return;
  if(navigator.share) navigator.share({ title: "Meine Angelsaison", text }).catch(() => {});
  else if(navigator.clipboard) navigator.clipboard.writeText(text);
}

export function saisonHTML(){
  const alle = alleFaenge();
  const trips = ausfluege();
  const jahre = [...new Set([...alle.map(c => String(c.datum || "").slice(0, 4)), ...trips.map(t => String(t.datum || "").slice(0, 4))].filter(j => /^\d{4}$/.test(j)))].sort().reverse();
  if(!jahre.length) return `<p class="leer">Sobald du Fänge oder Ausflüge einträgst, entsteht hier deine Saisonbilanz.</p>`;
  const jahr = jahre.includes(jahrGewaehlt) ? jahrGewaehlt : jahre[0];
  const d = jahresDaten(jahr, alle, trips);
  const v = jahresDaten(String(+jahr - 1), alle, trips);
  const hatVorjahr = v.f.length || v.a.length;
  const { f, a } = d;

  /* Arten, neue Arten, Rekorde */
  const vorher = alle.filter(c => String(c.datum || "") < jahr + "-01-01");
  const bekannt = new Set(vorher.map(artVon).filter(Boolean));
  const arten = haeufig(f, artVon);
  const neu = arten.filter(([k]) => !bekannt.has(k)).map(([k, l]) => artName(k, l));
  const rekorde = [];
  arten.forEach(([k, l]) => {
    const g = l.filter(c => zahl(c.laenge)).sort((x, y) => zahl(y.laenge) - zahl(x.laenge))[0];
    if(!g) return;
    const alt = vorher.filter(c => artVon(c) === k && zahl(c.laenge)).sort((x, y) => zahl(y.laenge) - zahl(x.laenge))[0];
    rekorde.push({ name: artName(k, l), c: g, neu: !alt || zahl(g.laenge) > zahl(alt.laenge), alt });
  });
  rekorde.sort((x, y) => (y.neu - x.neu) || zahl(y.c.laenge) - zahl(x.c.laenge));

  /* Bestwerte */
  const proMonat = MON_K.map((m, i) => ({ m, i, n: f.filter(c => +String(c.datum).slice(5, 7) === i + 1).length, t: a.filter(t => +String(t.datum).slice(5, 7) === i + 1).length }));
  const besterMonat = [...proMonat].sort((x, y) => y.n - x.n)[0];
  const spots = Object.fromEntries(ladeFaengeDaten().spots.map(s => [s.id, s.name]));
  const setups = Object.fromEntries(alleSetups().map(s => [s.key, s.titel + (s.zusatz ? " (" + s.zusatz + ")" : "")]));
  const top = (fn, namen) => { const h = haeufig(f, fn)[0]; return h ? { name: namen ? namen(h[0]) : h[0], n: h[1].length } : null; };
  const topSpot = top(c => c.spotId, k => spots[k] || "unbekannter Spot");
  const topSetup = top(c => c.setup, k => setups[k] || (typeof AKTUELL !== "undefined" && AKTUELL[k] ? AKTUELL[k].name.split(" · ")[0] : k));
  const topKoeder = top(c => c.koeder && String(c.koeder).trim());
  const topTz = top(c => c.tz, k => TZ[k] || k);

  /* Bedingungen: Erfolgsquote je Luftdrucktrend (nur mit genug Ausflügen) */
  const druck = ["fallend", "stabil", "steigend"].map(t => {
    const l = a.filter(x => x.wetter && x.wetter.luftdruck === t);
    const ok = l.filter(x => d.erfolgreich.includes(x)).length;
    return { t, n: l.length, ok, q: l.length ? ok / l.length : 0 };
  }).filter(x => x.n >= 2);
  const besterDruck = druck.length >= 2 ? [...druck].sort((x, y) => y.q - x.q)[0] : null;

  /* Fazit in Sätzen */
  const fazit = [];
  if(besterMonat && besterMonat.n) fazit.push(`Bester Monat war der ${MON[besterMonat.i]} mit ${besterMonat.n} ${besterMonat.n > 1 ? "Fängen" : "Fang"}.`);
  arten.slice(0, 2).forEach(([k, l]) => {
    if(l.length < 2) return;
    const tz = haeufig(l, c => c.tz)[0], kd = haeufig(l, c => c.koeder && String(c.koeder).trim())[0];
    const teile = [tz && tz[1].length >= 2 ? `meist in der ${TZ[tz[0]] || tz[0]}`.replace("in der Vormittag", "vormittags").replace("in der Mittag", "mittags").replace("in der Nachmittag", "nachmittags").replace("in der Nacht", "nachts") : "", kd && kd[1].length >= 2 ? `am häufigsten auf ${kd[0]}` : ""].filter(Boolean);
    if(teile.length) fazit.push(`${artName(k, l)}: ${teile.join(", ")}.`);
  });
  if(besterDruck && besterDruck.q > 0) fazit.push(`Am erfolgreichsten warst du bei ${besterDruck.t}em Luftdruck (${besterDruck.ok} von ${besterDruck.n} Ausflügen mit Fang).`);
  if(neu.length) fazit.push(`Neu in deiner Liste: ${neu.join(", ")}.`);

  const quote = a.length ? Math.round(d.erfolgreich.length / a.length * 100) : null;
  const delta = (n, alt) => !hatVorjahr ? "" : n > alt ? `<i class="sb-plus">+${n - alt} zum Vorjahr</i>` : n < alt ? `<i class="sb-minus">${n - alt} zum Vorjahr</i>` : `<i>wie im Vorjahr</i>`;
  const maxN = Math.max(1, ...proMonat.map(x => Math.max(x.n, x.t)));

  const text = [`Meine Angelsaison ${jahr}: ${f.length} Fänge an ${d.tage.size} Angeltagen${arten.length ? `, ${arten.length} Arten` : ""}.`,
    ...rekorde.filter(r => r.neu).slice(0, 3).map(r => `Rekord ${r.name}: ${cm(r.c.laenge)}`), ...fazit].join("\n");

  return `<div class="sb" data-text="${esc(text)}">
    ${jahre.length > 1 ? `<div class="chips sb-jahre" role="group" aria-label="Jahr">${jahre.map(j => `<button type="button" class="chip${j === jahr ? " on" : ""}" data-sb-jahr="${j}" aria-pressed="${j === jahr}">${j}</button>`).join("")}</div>` : ""}
    <div class="sb-zahlen">
      <div><b>${f.length}</b><span>Fänge</span>${delta(f.length, v.f.length)}</div>
      <div><b>${d.tage.size}</b><span>Angeltage${d.tage.size ? `, ${d.tageMitFang.size} mit Fang` : ""}</span>${delta(d.tage.size, v.tage.size)}</div>
      <div><b>${arten.length}</b><span>Arten${neu.length ? `, ${neu.length} neu` : ""}</span></div>
      ${quote != null ? `<div><b>${quote} %</b><span>der Ausflüge mit Fang (${d.erfolgreich.length}/${a.length})</span></div>` : ""}
    </div>
    ${fazit.length ? `<section class="fb-stat sb-fazit"><h3>Deine Saison in Kürze</h3><ul>${fazit.map(t => `<li>${esc(t)}</li>`).join("")}</ul></section>` : ""}
    ${rekorde.length ? `<section class="fb-stat"><h3>Größte Fische ${jahr}</h3><ul class="sb-rekorde">${rekorde.slice(0, 8).map(r => `<li class="${r.neu ? "neu" : ""}">
      <span><b>${esc(r.name)}</b><small>${esc(new Date(r.c.datum + "T12:00:00").toLocaleDateString("de-DE", { day: "numeric", month: "long" }))}${r.c.spotId && spots[r.c.spotId] ? " · " + esc(spots[r.c.spotId]) : ""}</small></span>
      <span class="sb-mass">${esc(cm(r.c.laenge))}${r.neu ? `<i>${r.alt ? `Rekord, vorher ${esc(cm(r.alt.laenge))}` : "erster Fang"}</i>` : ""}</span></li>`).join("")}</ul></section>` : ""}
    <section class="fb-stat"><h3>Monat für Monat</h3>
      <div class="sb-monate" role="img" aria-label="Fänge und Ausflüge je Monat">${proMonat.map(x => `<div class="sb-m" title="${MON[x.i]}: ${x.n} Fänge, ${x.t} Ausflüge">
        <div class="sb-saeulen"><span class="sb-s-f" style="height:${x.n / maxN * 100}%"></span><span class="sb-s-a" style="height:${x.t / maxN * 100}%"></span></div>
        <b>${x.n || ""}</b><small>${x.m}</small></div>`).join("")}</div>
      <p class="sb-legende"><span class="sb-l-f"></span>Fänge <span class="sb-l-a"></span>Ausflüge</p></section>
    ${[topSpot && ["Bester Spot", topSpot], topSetup && ["Bestes Setup", topSetup], topKoeder && ["Bester Köder", topKoeder], topTz && ["Beste Tageszeit", topTz]].filter(Boolean).length ? `<section class="fb-stat"><h3>Was ${jahr} funktioniert hat</h3><dl class="sb-top">
      ${[topSpot && ["Bester Spot", topSpot], topSetup && ["Bestes Setup", topSetup], topKoeder && ["Bester Köder", topKoeder], topTz && ["Beste Tageszeit", topTz]].filter(Boolean).map(([k, x]) => `<div><dt>${k}</dt><dd>${esc(x.name)} <small>${x.n}×</small></dd></div>`).join("")}</dl></section>` : ""}
    ${hatVorjahr ? `<p class="hinweis-klein">Vorjahr ${+jahr - 1}: ${v.f.length} Fänge an ${v.tage.size} Angeltagen${v.a.length ? `, ${Math.round(v.erfolgreich.length / v.a.length * 100)} % der Ausflüge mit Fang` : ""}.</p>` : ""}
    <p><button type="button" class="knopf klein" data-sb-teilen>Bilanz teilen</button></p>
  </div>`;
}
