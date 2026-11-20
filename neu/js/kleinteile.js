/* ============================================================
   Kleinteile-Box mit Bestand
   Haken, Jigköpfe, Bleie, Wirbel, Gummis … mit Stückzahl und
   Mindestbestand. Die Packliste zeigt, was davon in der Box ist und
   was knapp wird; was unter den Mindestbestand fällt, landet auf der
   Nachkaufliste. Wird wie die Tasche mit der Cloud abgeglichen.
   ============================================================ */
import { lese, kleinteileSetzen, KT_KEY } from "./store.js";
import { ANGELARTEN } from "./angelarten.js";

const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[c]));

/* Reihenfolge = Prüfreihenfolge beim Zuordnen (Gummiperle vor Gummiköder, Vorfachhaken vor Vorfach) */
export const KATS = [
  { id: "perlen",  name: "Perlen, Stopper & Schlauch", re: /perle|stopper|schlauch|anti.?tangle|boom/i, min: 10 },
  { id: "jig",     name: "Jigköpfe",                   re: /jig/i, min: 5 },
  { id: "haken",   name: "Haken & Drillinge",          re: /haken|drilling/i, min: 10 },
  { id: "vorfach", name: "Vorfächer & Systeme",        re: /vorfach|stahl|titan|fluoro|schlagschnur|paternoster|system|rig\b/i, min: 3 },
  { id: "wirbel",  name: "Wirbel & Snaps",             re: /wirbel|snap|karabiner|sprengring/i, min: 10 },
  { id: "blei",    name: "Bleie & Körbe",              re: /blei|schrot|tungsten|korb|feeder|method/i, min: 5 },
  { id: "posen",   name: "Posen & Sbirolinos",         re: /pose|sbiro|tremarella|wasserkugel|spirolino/i, min: 2 },
  { id: "gummi",   name: "Gummiköder",                 re: /gummi|shad|twister|creature|wurm.*(gummi|kunst)|finesse|master worm/i, min: 5 },
  { id: "kunst",   name: "Wobbler, Blinker & Spoons",  re: /wobbler|blinker|spoon|spinner|pilker|popper|küstenköder|jerk/i, min: 2 },
  { id: "natur",   name: "Naturköder & Futter",        re: /teig|powerbait|mais|made|wurm|boilie|pellet|futter|köderfisch|paste|hering|garnele/i, min: 1 },
  { id: "sonst",   name: "Sonstiges",                  re: /$^/, min: 1 }
];
const KAT = Object.fromEntries(KATS.map(k => [k.id, k]));
export function kategorieVon(text){ return (KATS.find(k => k.id !== "sonst" && k.re.test(String(text || ""))) || KAT.sonst).id; }

export function box(){ return lese(KT_KEY, null) || { teile: [], geaendert: "" }; }
function speichere(b){ b.geaendert = new Date().toISOString(); kleinteileSetzen(b); }
const neueId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
const knapp = t => t.n != null && t.n <= (t.min ?? 0);

/* ---------- Für die Packliste ---------- */
/* Was liegt zu einem Montage-Teil in der Box? null = Box wird (noch) nicht gepflegt */
export function boxInfo(teilName){
  const b = box();
  if(!b.teile.length) return null;
  const kat = kategorieVon(teilName);
  if(kat === "sonst") return null;
  const liste = b.teile.filter(t => t.kat === kat);
  if(!liste.length) return { text: `nicht in deiner Box (${KAT[kat].name})`, knapp: true };
  const leer = liste.filter(t => t.n === 0), wenig = liste.filter(t => t.n > 0 && knapp(t));
  const summe = liste.reduce((s, t) => s + (t.n || 0), 0);
  if(leer.length === liste.length) return { text: "Box: alles aufgebraucht – nachkaufen", knapp: true };
  if(wenig.length || leer.length) return { text: `Box: ${[...wenig.map(t => `${t.name} nur ${t.n}`), ...leer.map(t => `${t.name} leer`)].slice(0, 2).join(", ")}`, knapp: true };
  return { text: `Box: ${summe ? summe + " Stück" : liste.length + " Sorte" + (liste.length > 1 ? "n" : "")}`, knapp: false };
}
export function nachkaufListe(){ return box().teile.filter(knapp).sort((a, b) => (a.n - b.n)); }

/* ---------- Schnellstart: Teile aus den Montagen deiner Methoden ---------- */
function vorschlaege(){
  const b = box(), da = new Set(b.teile.map(t => t.name.toLowerCase()));
  const out = new Map();
  ANGELARTEN.forEach(art => {
    const nutzbar = art.ansaetze.some(([fid, i]) => {
      const f = FISCHE.find(x => x.id === fid), a = f && f.ansaetze[i];
      const r = a && BERATER.bewerte(a, null);
      return r && r.status !== "wunsch";
    });
    if(!nutzbar) return;
    art.montagen.forEach(m => m.teile.forEach(t => {
      if(/hauptschnur/i.test(t.n)) return;
      const kat = kategorieVon(t.n + " " + t.d);
      const basis = t.n.replace(/\s*\(.*\)$/, "");
      const name = t.d && t.d.length <= 22 ? `${basis} ${t.d}` : basis;
      if(da.has(name.toLowerCase()) || out.has(name)) return;
      out.set(name, { name, info: t.d, kat });
    }));
  });
  return [...out.values()];
}

/* ---------- Ansicht ---------- */
let bearbeite = null;      /* id des Teils im Bearbeiten-Formular, "neu" oder null */
let schnell = false;       /* Schnellstart-Liste offen */

function formHTML(t){
  const neu = !t;
  t = t || { kat: "jig", name: "", n: "", min: "" };
  return `<div class="kt-form" data-kt-form>
    <label class="feld"><span>Was?</span><input type="text" data-kt-feld="name" value="${esc(t.name)}" placeholder="z. B. Jigkopf 14 g, Haken 3/0" autocomplete="off"></label>
    <div class="kt-form-reihe">
      <label class="feld"><span>Anzahl</span><input type="number" inputmode="numeric" min="0" data-kt-feld="n" value="${t.n ?? ""}"></label>
      <label class="feld"><span>Nachkaufen ab</span><input type="number" inputmode="numeric" min="0" data-kt-feld="min" value="${t.min ?? ""}" placeholder="${KAT[t.kat] ? KAT[t.kat].min : 3}"></label>
    </div>
    <label class="feld"><span>Fach</span><select data-kt-feld="kat">${KATS.map(k => `<option value="${k.id}"${k.id === t.kat ? " selected" : ""}>${esc(k.name)}</option>`).join("")}</select></label>
    <div class="akt-zeile"><button type="button" class="knopf prim klein" data-kt-speichern="${neu ? "neu" : esc(t.id)}">Speichern</button>
      <button type="button" class="knopf klein leise" data-kt-abbrechen>Abbrechen</button>
      ${neu ? "" : `<button type="button" class="knopf klein leise kt-weg" data-kt-weg="${esc(t.id)}">Entfernen</button>`}</div>
  </div>`;
}

export function kleinteileHTML(){
  const b = box();
  const nk = nachkaufListe();
  const proKat = KATS.map(k => ({ k, teile: b.teile.filter(t => t.kat === k.id).sort((x, y) => x.name.localeCompare(y.name, "de")) })).filter(x => x.teile.length);
  const zeile = t => bearbeite === t.id ? `<li class="kt-teil offen">${formHTML(t)}</li>` : `<li class="kt-teil${knapp(t) ? " knapp" : ""}">
      <button type="button" class="kt-name" data-kt-edit="${esc(t.id)}"><b>${esc(t.name)}</b>${knapp(t) ? `<small>${t.n === 0 ? "leer" : "knapp"} – nachkaufen ab ${t.min}</small>` : t.n == null ? `<small>Anzahl eintragen</small>` : ""}</button>
      <span class="kt-zahl"><button type="button" class="kt-pm" data-kt-pm="-1" data-kt-id="${esc(t.id)}" aria-label="eins weniger"${!t.n ? " disabled" : ""}>−</button>
        <b class="mono">${t.n ?? "?"}</b>
        <button type="button" class="kt-pm" data-kt-pm="1" data-kt-id="${esc(t.id)}" aria-label="eins mehr">+</button></span></li>`;
  const v = schnell ? vorschlaege() : [];
  return `<section class="kleinteile" id="kleinteile"><h2 class="gruppe-titel">Kleinteile-Box</h2>
    <p class="gruppe-hinweis">${b.teile.length ? `${b.teile.length} Teile${nk.length ? ` · <b class="kt-warn">${nk.length} knapp</b>` : " · alles ausreichend da"}. Am Wasser verloren? Einfach auf − tippen.` : "Trag ein, was in deinen Köderboxen liegt – mit Anzahl. Die Packliste zeigt dann, was da ist, und was knapp wird, landet auf der Nachkaufliste."}</p>
    ${nk.length ? `<div class="kt-nachkauf"><h3>Nachkaufen</h3><ul>${nk.map(t => `<li><span>${esc(t.name)}</span><small>${t.n === 0 ? "leer" : "noch " + t.n} · Ziel ${Math.max(t.min * 2, t.min + 3)}</small></li>`).join("")}</ul>
      <button type="button" class="knopf klein" data-kt-kopieren>Liste kopieren</button></div>` : ""}
    ${proKat.map(({ k, teile }) => `<details class="kt-fach"${teile.some(knapp) || proKat.length <= 3 || teile.some(t => t.id === bearbeite) ? " open" : ""}>
      <summary><span>${esc(k.name)}</span><small>${teile.length} Sorte${teile.length > 1 ? "n" : ""}${teile.some(knapp) ? " · knapp" : ""}</small></summary>
      <ul class="kt-liste">${teile.map(zeile).join("")}</ul></details>`).join("")}
    ${bearbeite === "neu" ? formHTML(null) : `<div class="akt-zeile"><button type="button" class="knopf klein" data-kt-neu>+ Teil hinzufügen</button>
      <button type="button" class="knopf klein leise" data-kt-schnell>${schnell ? "Vorschläge schließen" : "Vorschläge aus deinen Montagen"}</button></div>`}
    ${schnell ? (v.length ? `<div class="kt-schnell"><p class="hinweis-klein">Teile aus den Montagen, die du mit deinem Gerät fischen kannst. Antippen übernimmt sie in die Box (Anzahl trägst du danach ein).</p>
      <ul>${v.map(x => `<li><button type="button" class="knopf klein leise" data-kt-vorschlag="${esc(x.name)}" data-kt-kat="${x.kat}">+ ${esc(x.name)} <small>${esc(x.info)}</small></button></li>`).join("")}</ul>
      <button type="button" class="knopf klein" data-kt-alle>Alle übernehmen</button></div>` : `<p class="hinweis-klein">Alle Teile aus deinen Montagen stehen schon in der Box.</p>`) : ""}
  </section>`;
}

function aendere(fn){ const b = box(); fn(b); speichere(b); }
function feld(form, n){ const el = form.querySelector(`[data-kt-feld="${n}"]`); return el ? el.value.trim() : ""; }

/* true = Klick verarbeitet (Liste neu zeichnen) */
export function kleinteileKlick(e, toast){
  const el = e.target.closest("[data-kt-pm],[data-kt-edit],[data-kt-neu],[data-kt-abbrechen],[data-kt-speichern],[data-kt-weg],[data-kt-schnell],[data-kt-vorschlag],[data-kt-alle],[data-kt-kopieren]");
  if(!el) return false;
  const d = el.dataset;
  if(d.ktPm){ aendere(b => { const t = b.teile.find(x => x.id === d.ktId); if(t) t.n = Math.max(0, (t.n || 0) + +d.ktPm); }); return true; }
  if(d.ktEdit !== undefined){ bearbeite = d.ktEdit; return true; }
  if(d.ktNeu !== undefined){ bearbeite = "neu"; setTimeout(() => { const i = document.querySelector('[data-kt-form] [data-kt-feld="name"]'); if(i) i.focus(); }, 0); return true; }
  if(d.ktAbbrechen !== undefined){ bearbeite = null; return true; }
  if(d.ktSpeichern){
    const form = el.closest("[data-kt-form]");
    const name = feld(form, "name");
    if(!name){ toast && toast("Bitte einen Namen eintragen"); return true; }
    const n = feld(form, "n"), min = feld(form, "min");
    let kat = feld(form, "kat");
    aendere(b => {
      let t = d.ktSpeichern === "neu" ? null : b.teile.find(x => x.id === d.ktSpeichern);
      /* Fach automatisch, wenn beim neuen Teil nichts verstellt wurde */
      if(!t && kat === "jig" && kategorieVon(name) !== "sonst") kat = kategorieVon(name);
      if(!t){ t = { id: neueId() }; b.teile.push(t); }
      Object.assign(t, { name, kat, n: n === "" ? null : Math.max(0, +n), min: min === "" ? KAT[kat].min : Math.max(0, +min) });
    });
    bearbeite = null;
    toast && toast("In der Box gespeichert");
    return true;
  }
  if(d.ktWeg){ aendere(b => { b.teile = b.teile.filter(x => x.id !== d.ktWeg); }); bearbeite = null; return true; }
  if(d.ktSchnell !== undefined){ schnell = !schnell; return true; }
  if(d.ktVorschlag){ aendere(b => { b.teile.push({ id: neueId(), name: d.ktVorschlag, kat: d.ktKat, n: null, min: KAT[d.ktKat].min }); }); return true; }
  if(d.ktAlle !== undefined){ const v = vorschlaege(); aendere(b => v.forEach(x => b.teile.push({ id: neueId(), name: x.name, kat: x.kat, n: null, min: KAT[x.kat].min }))); schnell = false; toast && toast(`${v.length} Teile übernommen – jetzt die Anzahl eintragen`); return true; }
  if(d.ktKopieren !== undefined){
    const text = "Nachkaufen:\n" + nachkaufListe().map(t => `- ${t.name} (${t.n === 0 ? "leer" : "noch " + t.n})`).join("\n");
    if(navigator.share) navigator.share({ title: "Nachkaufliste", text }).catch(() => {});
    else if(navigator.clipboard) navigator.clipboard.writeText(text).then(() => toast && toast("Nachkaufliste kopiert"));
    return false;
  }
  return false;
}
