/* ============================================================
   Ausgaben & Jahreskarten-Rechner (Fangbuch, Reiter „Kosten“)
   Was kostet dich das Angeln pro Jahr? Eigene Einträge (Köder, Gerät,
   Tageskarten, Abgabe …) plus die Preise deiner Erlaubnisscheine.
   Rechner: Für jeden Spot mit Tagespreis zählt die App deine Angeltage
   dort (Fänge + Ausflüge) und vergleicht Tageskarten mit einer
   Jahreskarte – ab wie vielen Tagen lohnt sie sich?
   Einträge werden mit der Cloud abgeglichen.
   ============================================================ */
import { extras, extrasSetzen, ladeFaengeDaten } from "./store.js";
import { ausfluege } from "./tagebuch.js";
import { scheine } from "./scheine.js";

const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[c]));
const euro = n => (Math.round(n * 100) / 100).toLocaleString("de-DE", { minimumFractionDigits: n % 1 ? 2 : 0, maximumFractionDigits: 2 }) + " €";
const zahl = v => { const n = parseFloat(String(v ?? "").replace(",", ".")); return isNaN(n) ? null : n; };
const genId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
const datumDE = iso => iso ? new Date(iso + "T12:00:00").toLocaleDateString("de-DE", { day: "numeric", month: "short" }) : "";
export const KAT_A = [["karte", "Angelkarten & Abgabe"], ["koeder", "Köder & Kleinteile"], ["geraet", "Ruten, Rollen, Schnur"], ["kleidung", "Kleidung & Zubehör"], ["fahrt", "Fahrt & Unterkunft"], ["sonst", "Sonstiges"]];
const KAT_N = Object.fromEntries(KAT_A);

let jahrGewaehlt = null, formOffen = false;

/* alle Posten eines Jahres: eigene + Scheine mit Preis */
function posten(jahr){
  const eigene = (extras().ausgaben || []).filter(a => String(a.datum).startsWith(jahr)).map(a => ({ ...a, quelle: "eigen" }));
  const sch = scheine().filter(s => s.preis && String(s.von || s.bis || "").startsWith(jahr))
    .map(s => ({ id: "sch:" + s.id, datum: s.von || s.bis, kat: "karte", betrag: s.preis, text: s.name, quelle: "schein" }));
  return [...eigene, ...sch].sort((a, b) => String(b.datum).localeCompare(String(a.datum)));
}

/* Angeltage je Spot im Jahr (Fänge + Ausflüge, je Datum einmal) */
function angeltage(jahr){
  const tage = {};
  const plus = (spotId, datum) => { if(!spotId || !String(datum).startsWith(jahr)) return; (tage[spotId] = tage[spotId] || new Set()).add(datum); };
  ladeFaengeDaten().catches.forEach(c => plus(c.spotId, c.datum));
  ausfluege().forEach(a => plus(a.spotId, a.datum));
  return tage;
}

function rechnerHTML(jahr){
  const tage = angeltage(jahr);
  const spots = ladeFaengeDaten().spots.filter(s => s.price > 0 && tage[s.id]);
  const jk = extras().jahreskarten || {};
  if(!spots.length) return `<p class="hinweis-klein">Sobald du an Spots mit Tagespreis (im Spot-Steckbrief) angelst, rechnet die App hier aus, ob sich eine Jahreskarte lohnt.</p>`;
  return `<ul class="ag-rechner">${spots.map(s => {
    const n = tage[s.id].size, tag = n * s.price, j = zahl(jk[s.id]);
    const ab = j ? Math.ceil(j / s.price) : null;
    const urteil = j == null ? "" : tag > j ? `<b class="ag-gut">Jahreskarte hätte ${euro(tag - j)} gespart</b>` : tag === j ? "<b>gleich teuer</b>" : `Tageskarten noch ${euro(j - tag)} günstiger`;
    return `<li><b>${esc(s.name)}</b>
      <span>${n} Angeltag${n > 1 ? "e" : ""} × ${euro(s.price)} = <b>${euro(tag)}</b> mit Tageskarten</span>
      <label class="ag-jk">Jahreskarte kostet <input type="text" inputmode="decimal" data-ag-jk="${esc(s.id)}" value="${j != null ? String(j).replace(".", ",") : ""}" placeholder="€"></label>
      ${j ? `<small>lohnt sich ab ${ab} Angeltagen · ${urteil}</small>` : `<small>Preis der Jahreskarte eintragen, dann rechnet die App.</small>`}</li>`;
  }).join("")}</ul>`;
}

export function ausgabenHTML(){
  const jetzt = String(new Date().getFullYear());
  const jahre = [...new Set([jetzt, ...(extras().ausgaben || []).map(a => String(a.datum).slice(0, 4)), ...scheine().filter(s => s.preis).map(s => String(s.von || s.bis || "").slice(0, 4))].filter(j => /^\d{4}$/.test(j)))].sort().reverse();
  const jahr = jahrGewaehlt && jahre.includes(jahrGewaehlt) ? jahrGewaehlt : jetzt;
  const p = posten(jahr);
  const summe = p.reduce((s, x) => s + (x.betrag || 0), 0);
  const proKat = KAT_A.map(([k, l]) => ({ k, l, n: p.filter(x => x.kat === k).reduce((s, x) => s + x.betrag, 0) })).filter(x => x.n);
  const tage = new Set([...ladeFaengeDaten().catches.map(c => c.datum), ...ausfluege().map(a => a.datum)].filter(d => String(d).startsWith(jahr))).size;
  const max = Math.max(1, ...proKat.map(x => x.n));
  return `${jahre.length > 1 ? `<div class="chips">${jahre.map(j => `<button type="button" class="chip${j === jahr ? " on" : ""}" data-ag-jahr="${j}">${j}</button>`).join("")}</div>` : ""}
    <div class="fang-kopf"><div><b>${euro(summe)}</b><span>Ausgaben ${jahr}</span></div>
      <div><b>${tage}</b><span>Angeltage</span></div>
      ${tage && summe ? `<div><b>${euro(summe / tage)}</b><span>pro Angeltag</span></div>` : ""}</div>
    <section class="fb-stat"><h3>Wofür</h3>
      ${proKat.length ? `<ul class="fb-balken">${proKat.map(x => `<li><span class="fb-b-label">${esc(x.l)}</span><span class="fb-b-spur"><span style="width:${x.n / max * 100}%"></span></span><b class="fb-b-wert">${euro(x.n)}</b></li>`).join("")}</ul>` : `<p class="hinweis-klein">Noch nichts eingetragen. Preise deiner Erlaubnisscheine zählen automatisch mit.</p>`}
      ${formOffen ? `<div class="kt-form zl-form" data-ag-form>
          <div class="kt-form-reihe">
            <label class="feld"><span>Betrag (€)</span><input type="text" inputmode="decimal" data-ag-feld="betrag" placeholder="z. B. 24,90"></label>
            <label class="feld"><span>Datum</span><input type="date" data-ag-feld="datum" value="${new Date().toISOString().slice(0, 10)}"></label>
          </div>
          <label class="feld"><span>Wofür</span><select data-ag-feld="kat">${KAT_A.map(([v, l]) => `<option value="${v}">${l}</option>`).join("")}</select></label>
          <label class="feld"><span>Was genau (optional)</span><input type="text" data-ag-feld="text" placeholder="z. B. 5 Gummifische, Fischereiabgabe 2027" autocomplete="off"></label>
          <div class="akt-zeile"><button type="button" class="knopf prim klein" data-ag-speichern>Speichern</button><button type="button" class="knopf klein leise" data-ag-abbrechen>Abbrechen</button></div>
        </div>` : `<button type="button" class="knopf klein" data-ag-neu>+ Ausgabe eintragen</button>`}
    </section>
    <section class="fb-stat"><h3>Jahreskarte oder Tageskarten?</h3>${rechnerHTML(jahr)}</section>
    ${p.length ? `<section class="fb-stat"><h3>Einträge ${jahr}</h3><ul class="kb-liste">${p.map(x => `<li><span><b>${euro(x.betrag)}</b> ${esc(x.text || KAT_N[x.kat])}<small> · ${esc(datumDE(x.datum))}${x.quelle === "schein" ? " · aus Erlaubnisschein" : ""}</small></span>
      ${x.quelle === "eigen" ? `<button type="button" class="knopf klein leise" data-ag-weg="${esc(x.id)}" aria-label="Eintrag löschen">✕</button>` : ""}</li>`).join("")}</ul></section>` : ""}`;
}

/* true = neu zeichnen */
export function ausgabenKlick(e, toast){
  const t = e.target;
  const j = t.closest("[data-ag-jahr]"); if(j){ jahrGewaehlt = j.dataset.agJahr; return true; }
  if(t.closest("[data-ag-neu]")){ formOffen = true; setTimeout(() => { const i = document.querySelector('[data-ag-feld="betrag"]'); if(i) i.focus(); }, 0); return true; }
  if(t.closest("[data-ag-abbrechen]")){ formOffen = false; return true; }
  const w = t.closest("[data-ag-weg]");
  if(w){ extrasSetzen(x => { x.ausgaben = (x.ausgaben || []).filter(a => a.id !== w.dataset.agWeg); }); return true; }
  if(t.closest("[data-ag-speichern]")){
    const f = t.closest("[data-ag-form]");
    const v = n => ((f.querySelector(`[data-ag-feld="${n}"]`) || {}).value || "").trim();
    const betrag = zahl(v("betrag"));
    if(!(betrag > 0)){ toast && toast("Bitte einen Betrag eintragen"); return false; }
    extrasSetzen(x => { x.ausgaben = (x.ausgaben || []).concat([{ id: genId(), datum: v("datum") || new Date().toISOString().slice(0, 10), kat: v("kat"), betrag, text: v("text") }]); });
    formOffen = false; toast && toast("Ausgabe gespeichert");
    return true;
  }
  return false;
}
/* Jahreskarten-Preis je Spot (change) */
export function ausgabenAenderung(e){
  const i = e.target.closest("[data-ag-jk]"); if(!i) return false;
  const v = zahl(i.value);
  extrasSetzen(x => { x.jahreskarten = { ...(x.jahreskarten || {}) }; if(v) x.jahreskarten[i.dataset.agJk] = v; else delete x.jahreskarten[i.dataset.agJk]; });
  return true;
}
