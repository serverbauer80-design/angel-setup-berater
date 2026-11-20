/* ============================================================
   Bestmarken & Saisonziele (Fangbuch, Reiter „Ziele“)
   Bestmarken: dein größter Fisch je Art, wann, wo, womit.
   Ziele: „erster Zander“, „Hecht ab 70 cm“, „10 Barsche in der
   Saison“ – Fortschritt kommt automatisch aus dem Fangbuch, dazu
   Hinweise, wann und womit es bei dir am ehesten klappt.
   Ziele werden mit der Cloud abgeglichen.
   ============================================================ */
import { alleFaenge } from "./fangbuch.js";
import { extras, extrasSetzen, ladeFaengeDaten } from "./store.js";
import { TOPMONATE } from "./lage.js";
import { bewaehrteKoeder } from "./koederbilanz.js";

const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[c]));
const zahl = v => { const n = parseFloat(String(v ?? "").replace(",", ".")); return isNaN(n) ? null : n; };
const kurz = n => String(n || "").split(" (")[0];
const fischName = id => kurz((FISCHE.find(f => f.id === id) || {}).name || id);
const datumDE = iso => iso ? new Date(iso + "T12:00:00").toLocaleDateString("de-DE", { day: "numeric", month: "short", year: "numeric" }) : "";
const MON = ["Januar", "Februar", "März", "April", "Mai", "Juni", "Juli", "August", "September", "Oktober", "November", "Dezember"];
const genId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
const ARTEN_Z = [["erster", "Erster Fang"], ["laenge", "Fisch ab … cm"], ["anzahl", "… Fänge in der Saison"]];

let formOffen = false;

function spotName(id){ const s = id && ladeFaengeDaten().spots.find(x => x.id === id); return s ? s.name : ""; }

/* Fortschritt eines Ziels */
function stand(z, faenge){
  const art = faenge.filter(c => c.fischId === z.fischId);
  const jahr = String(z.jahr || new Date().getFullYear());
  if(z.art === "erster"){
    const erster = art.slice().sort((a, b) => String(a.datum).localeCompare(String(b.datum)))[0];
    return { erreicht: !!erster, wert: erster ? 1 : 0, ziel: 1, am: erster && erster.datum, text: erster ? `gefangen am ${datumDE(erster.datum)}` : "noch offen" };
  }
  if(z.art === "laenge"){
    const imJahr = art.filter(c => String(c.datum || "").startsWith(jahr));
    const g = imJahr.map(c => ({ c, l: zahl(c.laenge) })).filter(x => x.l).sort((a, b) => b.l - a.l)[0];
    const ok = imJahr.map(c => ({ c, l: zahl(c.laenge) })).filter(x => x.l >= z.wert).sort((a, b) => String(a.c.datum).localeCompare(String(b.c.datum)))[0];
    return { erreicht: !!ok, wert: g ? g.l : 0, ziel: z.wert, am: ok && ok.c.datum, text: ok ? `${String(ok.l).replace(".", ",")} cm am ${datumDE(ok.c.datum)}` : g ? `größter ${jahr}: ${String(g.l).replace(".", ",")} cm` : `${jahr} noch keiner` };
  }
  const n = art.filter(c => String(c.datum || "").startsWith(jahr)).length;
  return { erreicht: n >= z.wert, wert: n, ziel: z.wert, text: `${n} von ${z.wert} in ${jahr}` };
}

/* Tipps: Top-Monate, deine bewährten Köder, wo du die Art schon gefangen hast */
function tipps(fischId, faenge){
  const out = [];
  const m = (TOPMONATE[fischId] || []);
  if(m.length) out.push(`Top-Zeit: ${m.map(x => MON[x - 1].slice(0, 3)).join(", ")}`);
  const bw = bewaehrteKoeder(fischId);
  if(bw.length) out.push(`bei dir bewährt: ${bw.map(x => x.name).join(", ")}`);
  const spots = {}; faenge.filter(c => c.fischId === fischId && c.spotId).forEach(c => spots[c.spotId] = (spots[c.spotId] || 0) + 1);
  const best = Object.entries(spots).sort((a, b) => b[1] - a[1])[0];
  if(best && spotName(best[0])) out.push(`bester Spot: ${spotName(best[0])}`);
  return out;
}

function bestmarken(faenge){
  const m = new Map();
  faenge.forEach(c => {
    const k = c.fischId || (c.fischName ? "x:" + c.fischName : null); if(!k) return;
    const e = m.get(k) || { name: c.fischId ? fischName(c.fischId) : c.fischName, n: 0, best: null, schwer: null, erster: null };
    e.n++;
    if(zahl(c.laenge) && (!e.best || zahl(c.laenge) > zahl(e.best.laenge))) e.best = c;
    if(zahl(c.gewicht) && (!e.schwer || zahl(c.gewicht) > zahl(e.schwer.gewicht))) e.schwer = c;
    if(!e.erster || String(c.datum) < String(e.erster.datum)) e.erster = c;
    m.set(k, e);
  });
  return [...m.values()].sort((a, b) => (zahl(b.best && b.best.laenge) || 0) - (zahl(a.best && a.best.laenge) || 0));
}

export function zieleHTML(){
  const faenge = alleFaenge();
  const ziele = extras().ziele || [];
  const jahr = new Date().getFullYear();
  const bm = bestmarken(faenge);
  const zeilen = ziele.map(z => ({ z, s: stand(z, faenge) })).sort((a, b) => a.s.erreicht - b.s.erreicht);
  const arten = FISCHE.slice().sort((a, b) => kurz(a.name).localeCompare(kurz(b.name), "de"));
  return `<section class="fb-stat"><h3>Deine Ziele ${jahr}</h3>
    ${zeilen.length ? `<ul class="zl-liste">${zeilen.map(({ z, s }) => {
      const pct = Math.min(100, Math.round((s.wert / Math.max(1, s.ziel)) * 100));
      const titel = z.art === "erster" ? `Erster Fang: ${fischName(z.fischId)}` : z.art === "laenge" ? `${fischName(z.fischId)} ab ${z.wert} cm` : `${z.wert} × ${fischName(z.fischId)}`;
      const tp = s.erreicht ? [] : tipps(z.fischId, faenge);
      return `<li class="zl${s.erreicht ? " ok" : ""}"><div class="zl-kopf"><b>${s.erreicht ? "✓ " : ""}${esc(titel)}</b><button type="button" class="knopf klein leise" data-zl-weg="${esc(z.id)}" aria-label="Ziel entfernen">✕</button></div>
        <span class="zl-spur"><span style="width:${pct}%"></span></span><small>${esc(s.text)}</small>
        ${tp.length ? `<small class="zl-tipp">${esc(tp.join(" · "))}</small>` : ""}</li>`;
    }).join("")}</ul>` : `<p class="hinweis-klein">Setz dir ein Ziel für die Saison – zum Beispiel die erste Meerforelle oder einen Zander über 50 cm. Der Fortschritt kommt automatisch aus dem Fangbuch.</p>`}
    ${formOffen ? `<div class="kt-form zl-form" data-zl-form>
        <label class="feld"><span>Fischart</span><select data-zl-feld="fisch">${arten.map(f => `<option value="${esc(f.id)}">${esc(kurz(f.name))}</option>`).join("")}</select></label>
        <div class="kt-form-reihe">
          <label class="feld"><span>Ziel</span><select data-zl-feld="art">${ARTEN_Z.map(([v, l]) => `<option value="${v}">${l}</option>`).join("")}</select></label>
          <label class="feld"><span>Wert (cm / Anzahl)</span><input type="number" inputmode="numeric" min="1" data-zl-feld="wert" placeholder="z. B. 50"></label>
        </div>
        <div class="akt-zeile"><button type="button" class="knopf prim klein" data-zl-speichern>Ziel setzen</button><button type="button" class="knopf klein leise" data-zl-abbrechen>Abbrechen</button></div>
      </div>` : `<button type="button" class="knopf klein" data-zl-neu>+ Ziel setzen</button>`}
  </section>
  <section class="fb-stat"><h3>Bestmarken</h3>
    ${bm.length ? `<ul class="zl-bm">${bm.map(e => `<li><b>${esc(e.name)}</b>
      <span>${e.best ? `<b class="mono">${String(e.best.laenge).replace(".", ",")} cm</b> · ${esc(datumDE(e.best.datum))}${spotName(e.best.spotId) ? " · " + esc(spotName(e.best.spotId)) : ""}${e.best.koeder ? " · " + esc(e.best.koeder) : ""}` : "ohne Länge"}</span>
      <small>${e.n} ${e.n === 1 ? "Fang" : "Fänge"}${e.schwer ? ` · schwerster ${String(e.schwer.gewicht).replace(".", ",")} g` : ""} · erster am ${esc(datumDE(e.erster.datum))}</small></li>`).join("")}</ul>`
      : `<p class="hinweis-klein">Noch keine Fänge – deine Bestmarken erscheinen hier automatisch.</p>`}
  </section>`;
}

/* true = neu zeichnen */
export function zieleKlick(e, toast){
  const t = e.target;
  if(t.closest("[data-zl-neu]")){ formOffen = true; return true; }
  if(t.closest("[data-zl-abbrechen]")){ formOffen = false; return true; }
  const w = t.closest("[data-zl-weg]");
  if(w){ extrasSetzen(x => { x.ziele = (x.ziele || []).filter(z => z.id !== w.dataset.zlWeg); }); return true; }
  if(t.closest("[data-zl-speichern]")){
    const f = t.closest("[data-zl-form]");
    const v = n => (f.querySelector(`[data-zl-feld="${n}"]`) || {}).value || "";
    const art = v("art"), wert = parseInt(v("wert"), 10);
    if(art !== "erster" && !(wert > 0)){ toast && toast(art === "laenge" ? "Bitte die Länge in cm eintragen" : "Bitte die Anzahl eintragen"); return false; }
    extrasSetzen(x => { x.ziele = (x.ziele || []).concat([{ id: genId(), fischId: v("fisch"), art, wert: art === "erster" ? 1 : wert, jahr: new Date().getFullYear(), erstellt: new Date().toISOString() }]); });
    formOffen = false; toast && toast("Ziel gesetzt – Petri Heil!");
    return true;
  }
  return false;
}
