/* ============================================================
   Mit Freunden teilen – per Link, ohne Konto
   Spot, Fang oder Angeltag-Plan werden in den Link selbst gepackt
   (#teilen/…). Wer ihn öffnet, sieht eine Karte mit Route, „Als Spot
   speichern“ und beim Plan „In den Kalender“. Nichts liegt auf einem
   Server. Fänge werden bewusst ohne Ort geteilt.
   ============================================================ */
import { ladeFaengeDaten, speichereFaengeDaten } from "./store.js";
import { blatt, feld } from "./edit.js";

const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[c]));
const genId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const datumDE = iso => iso ? new Date(iso + "T12:00:00").toLocaleDateString("de-DE", { weekday: "long", day: "numeric", month: "long" }) : "";

/* JSON <-> base64url (UTF-8) */
function kodieren(obj){
  const b = new TextEncoder().encode(JSON.stringify(obj));
  let s = ""; b.forEach(x => s += String.fromCharCode(x));
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function dekodieren(code){
  try {
    const s = atob(String(code).replace(/-/g, "+").replace(/_/g, "/"));
    return JSON.parse(new TextDecoder().decode(Uint8Array.from(s, c => c.charCodeAt(0))));
  } catch(e){ return null; }
}
const linkFuer = obj => location.origin + location.pathname + "#teilen/" + kodieren(obj);

function senden(titel, text, obj, toast){
  const url = linkFuer(obj);
  if(navigator.share) navigator.share({ title: titel, text, url }).catch(() => {});
  else if(navigator.clipboard) navigator.clipboard.writeText(text + "\n" + url).then(() => toast && toast("Link kopiert – jetzt z. B. in WhatsApp einfügen"));
  else prompt("Link kopieren:", url);
}

/* ---------- Teilen auslösen ---------- */
export function spotTeilen(e, toast){
  const r = e.roh || {};
  const obj = { t: "spot", n: e.name, la: +e.lat.toFixed(5), lo: +e.lng.toFixed(5), ty: r.type || r.art || "", p: r.price || null, i: r.fische || "" };
  senden(e.name, `Angelspot: ${e.name}`, obj, toast);
}
export function fangTeilen(c, toast){
  const f = c.fischId && typeof FISCHE !== "undefined" ? FISCHE.find(x => x.id === c.fischId) : null;
  const art = String(f ? f.name : c.fischName || "Fisch").split(" (")[0];
  const obj = { t: "fang", a: art, l: c.laenge || null, d: c.datum || "", k: c.koeder || "", u: c.uhrzeit || "" };
  senden(`${art}${c.laenge ? " " + c.laenge + " cm" : ""}`, `Petri Heil! ${art}${c.laenge ? ", " + c.laenge + " cm" : ""}${c.koeder ? " auf " + c.koeder : ""}`, obj, toast);
}
/* Angeltag planen: Formular, dann teilen */
export function planTeilen(vorgabe, toast){
  const spots = ladeFaengeDaten().spots.filter(s => typeof s.lat === "number").sort((a, b) => (b.visited ? 1 : 0) - (a.visited ? 1 : 0) || a.name.localeCompare(b.name, "de"));
  const morgen = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
  const v = vorgabe || {};
  blatt("Angeltag planen & teilen", `<div class="feld-raster">
      ${feld("datum", "Tag", v.datum || morgen, { typ: "date" })}
      ${feld("zeit", "Treffen um", v.zeit || "06:00", { typ: "time" })}
      <label class="feld breit"><span>Wo</span><select name="ort">${v.ort ? `<option value="vorgabe" selected>${esc(v.ort.n)}</option>` : ""}${spots.map(s => `<option value="${esc(s.id)}">${esc(s.name)}</option>`).join("")}<option value="">anderer Ort (Text unten)</option></select></label>
      ${feld("ortText", "Treffpunkt / Notiz zum Ort", "", { breit: true, ph: "z. B. Parkplatz am Leuchtturm" })}
      ${feld("mit", "Ich bringe mit / bitte mitbringen", "", { breit: true, ph: "z. B. Wathose, Blinker 20 g, Kaffee" })}
      ${feld("ziel", "Zielfisch", v.ziel || "", { ph: "z. B. Meerforelle" })}
    </div>
    <div class="blatt-akt"><button type="submit" class="knopf prim">Teilen</button></div>`, fd => {
    const ortId = fd.get("ort");
    const s = ortId && ortId !== "vorgabe" ? spots.find(x => x.id === ortId) : null;
    const o = ortId === "vorgabe" ? v.ort : s ? { n: s.name, la: +s.lat.toFixed(5), lo: +s.lng.toFixed(5) } : null;
    const obj = { t: "plan", d: fd.get("datum"), z: fd.get("zeit"), o, ot: String(fd.get("ortText") || "").trim(), m: String(fd.get("mit") || "").trim(), f: String(fd.get("ziel") || "").trim() };
    if(!obj.d) return "Bitte einen Tag wählen.";
    const wo = o ? o.n : obj.ot || "noch offen";
    senden("Angeltag", `Angeln am ${datumDE(obj.d)}, ${obj.z} Uhr – ${wo}${obj.f ? ` (auf ${obj.f})` : ""}${obj.m ? `. Mitbringen: ${obj.m}` : ""}`, obj, toast);
  });
}

/* ---------- Empfangen: #teilen/<code> ---------- */
let zuletzt = null;
export function teilenSeiteHTML(code){
  const x = dekodieren(code); zuletzt = x;
  const kopf = `<a class="zurueck sichtbar" href="#heute">‹ Zur App</a><p class="eyebrow">Geteilt mit dir</p>`;
  if(!x) return `<section class="wissen">${kopf}<p class="leer">Der Link ist unvollständig – vielleicht beim Kopieren abgeschnitten?</p></section>`;
  const ort = x.t === "spot" ? { n: x.n, la: x.la, lo: x.lo } : x.o;
  const route = ort && ort.la ? `<a class="knopf prim" href="https://www.google.com/maps/dir/?api=1&destination=${ort.la},${ort.lo}&travelmode=driving" target="_blank" rel="noopener">Navigieren</a>` : "";
  const speichern = ort && ort.la ? `<button type="button" class="knopf" data-teilen-speichern>Als Spot speichern</button>` : "";
  if(x.t === "spot") return `<section class="wissen tl">${kopf}<h2>${esc(x.n)}</h2>
    <dl class="reihen">${x.ty ? `<div class="reihe"><dt>Art</dt><dd>${esc(x.ty)}</dd></div>` : ""}${x.p ? `<div class="reihe"><dt>Tageskarte</dt><dd>${esc(String(x.p).replace(".", ","))} €</dd></div>` : ""}${x.i ? `<div class="reihe"><dt>Fische</dt><dd>${esc(x.i)}</dd></div>` : ""}</dl>
    <div class="akt-zeile">${route}${speichern}</div></section>`;
  if(x.t === "fang") return `<section class="wissen tl">${kopf}<h2>Petri Heil! ${esc(x.a)}</h2>
    <dl class="reihen">${x.l ? `<div class="reihe"><dt>Länge</dt><dd>${esc(String(x.l).replace(".", ","))} cm</dd></div>` : ""}${x.d ? `<div class="reihe"><dt>Wann</dt><dd>${esc(datumDE(x.d))}${x.u ? ", " + esc(x.u) + " Uhr" : ""}</dd></div>` : ""}${x.k ? `<div class="reihe"><dt>Köder</dt><dd>${esc(x.k)}</dd></div>` : ""}</dl></section>`;
  if(x.t === "plan"){
    const ics = icsLink(x);
    return `<section class="wissen tl">${kopf}<h2>Angeltag ${esc(datumDE(x.d))}</h2>
      <dl class="reihen"><div class="reihe"><dt>Treffen</dt><dd>${esc(x.z || "")} Uhr</dd></div>
        <div class="reihe"><dt>Wo</dt><dd>${esc(ort ? ort.n : "noch offen")}${x.ot ? ` – ${esc(x.ot)}` : ""}</dd></div>
        ${x.f ? `<div class="reihe"><dt>Zielfisch</dt><dd>${esc(x.f)}</dd></div>` : ""}
        ${x.m ? `<div class="reihe"><dt>Mitbringen</dt><dd>${esc(x.m)}</dd></div>` : ""}</dl>
      <div class="akt-zeile"><a class="knopf" href="${ics}" download="angeltag.ics">In den Kalender</a>${route}${speichern}</div>
      <p class="hinweis-klein">Vergiss Fischereischein und Abgabe-Nachweis nicht.</p></section>`;
  }
  return `<section class="wissen">${kopf}<p class="leer">Unbekannter Inhalt.</p></section>`;
}
function icsLink(x){
  const [h, m] = String(x.z || "06:00").split(":");
  const start = x.d.replace(/-/g, "") + "T" + h.padStart(2, "0") + m.padStart(2, "0") + "00";
  const endeH = String(Math.min(23, +h + 4)).padStart(2, "0");
  const ende = x.d.replace(/-/g, "") + "T" + endeH + m.padStart(2, "0") + "00";
  const ort = x.o ? x.o.n : x.ot || "";
  const txt = s => String(s || "").replace(/[,;\\]/g, m => "\\" + m).replace(/\n/g, "\\n");
  const ics = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Rutenwand//DE", "BEGIN:VEVENT", "UID:" + genId() + "@rutenwand", "DTSTART:" + start, "DTEND:" + ende,
    "SUMMARY:" + txt("Angeln" + (x.f ? " – " + x.f : "")), "LOCATION:" + txt(ort + (x.ot && x.o ? " – " + x.ot : "")), "DESCRIPTION:" + txt(x.m ? "Mitbringen: " + x.m : ""), "END:VEVENT", "END:VCALENDAR"].join("\r\n");
  return "data:text/calendar;charset=utf-8," + encodeURIComponent(ics);
}
/* true = verarbeitet */
export function teilenKlick(e, toast){
  if(!e.target.closest("[data-teilen-speichern]") || !zuletzt) return false;
  const ort = zuletzt.t === "spot" ? { n: zuletzt.n, la: zuletzt.la, lo: zuletzt.lo } : zuletzt.o;
  if(!ort) return true;
  const d = ladeFaengeDaten();
  if(d.spots.some(s => s.name === ort.n && Math.abs(s.lat - ort.la) < 0.001)){ toast("Diesen Spot hast du schon"); return true; }
  const TYP = { kueste: "kueste", see: "see", fluss: "fluss", kanal: "kanal", forellensee: "forellensee", teich: "teich" };
  d.spots.push({ id: genId(), name: ort.n, type: TYP[zuletzt.ty] || "see", region: "sh", lat: ort.la, lng: ort.lo, price: zuletzt.p || 0, rating: 0, visited: false, notes: zuletzt.i ? zuletzt.i + " | geteilt" : "geteilt", created: new Date().toISOString() });
  speichereFaengeDaten(d);
  toast("Spot gespeichert – zu finden unter Gewässer");
  return true;
}
