/* ============================================================
   Fangmeldung je Erlaubnisschein
   Viele Vereine und Pächter verlangen am Jahresende eine Fangmeldung.
   Aus dem Fangbuch: alle Fänge an den Spots des Scheins im Gültig-
   keitszeitraum, je Art entnommen/zurückgesetzt, Gewicht, Angeltage.
   Zum Abschreiben, Teilen oder Drucken (auch „Als PDF sichern“).
   ============================================================ */
import { alleFaenge } from "./fangbuch.js";
import { ausfluege } from "./tagebuch.js";
import { ladeFaengeDaten } from "./store.js";
import { blatt } from "./edit.js";
import { heuteISO, datumDE } from "./setups.js";

const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[c]));
const zahl = v => { const n = parseFloat(String(v ?? "").replace(",", ".")); return isNaN(n) ? null : n; };
const komma = v => String(v).replace(".", ",");
const fischName = c => ((FISCHE.find(f => f.id === c.fischId) || {}).name || c.fischName || "?").split(" (")[0];

/* Gewicht: Einträge in kg oder g – Werte über 50 gelten als Gramm */
const kg = v => { const n = zahl(v); return n == null ? null : n > 50 ? n / 1000 : n; };

export function zeitraum(s){
  const jahr = (s.bis || s.von || heuteISO()).slice(0, 4);
  const von = s.von || jahr + "-01-01";
  const bis = s.bis && s.bis < heuteISO() ? s.bis : heuteISO();
  return { von, bis, offen: !s.bis || s.bis >= heuteISO() };
}

export function fangmeldung(s){
  const spots = new Set(s.spotIds || []);
  const { von, bis, offen } = zeitraum(s);
  const imZeitraum = d => d && d >= von && d <= bis;
  const faenge = alleFaenge().filter(c => spots.has(c.spotId) && imZeitraum(c.datum)).sort((a, b) => String(a.datum).localeCompare(String(b.datum)) || String(a.uhrzeit || "").localeCompare(String(b.uhrzeit || "")));
  const tage = new Set([...faenge.map(c => c.datum), ...ausfluege().filter(a => spots.has(a.spotId) && imZeitraum(a.datum)).map(a => a.datum)]);
  const proArt = new Map();
  faenge.forEach(c => {
    const k = fischName(c);
    const e = proArt.get(k) || { art: k, ent: 0, zur: 0, kg: 0, mitKg: 0 };
    if(c.zurueck) e.zur++; else { e.ent++; const g = kg(c.gewicht); if(g != null){ e.kg += g; e.mitKg++; } }
    proArt.set(k, e);
  });
  const spotNamen = ladeFaengeDaten().spots.filter(x => spots.has(x.id)).map(x => x.name);
  return { von, bis, offen, faenge, tage: tage.size, proArt: [...proArt.values()].sort((a, b) => b.ent + b.zur - a.ent - a.zur), spotNamen };
}

/* Kurzinfo für den Schein */
export function fangmeldungKurz(s){
  if(!(s.spotIds || []).length) return "Verknüpfe den Schein mit deinen Spots, dann stellt die App die Fangmeldung zusammen.";
  const m = fangmeldung(s);
  return `${m.faenge.length} ${m.faenge.length === 1 ? "Fang" : "Fänge"} an ${m.tage} Angeltag${m.tage === 1 ? "" : "en"} (${datumDE(m.von)} – ${datumDE(m.bis)})`;
}

function berichtHTML(s, m){
  const kgText = e => e.mitKg ? komma(Math.round(e.kg * 10) / 10) + " kg" + (e.mitKg < e.ent ? "*" : "") : "–";
  return `<div class="fm-bericht">
    <h3 class="fm-titel">Fangmeldung</h3>
    <dl class="fm-kopf">
      <div><dt>Erlaubnisschein</dt><dd>${esc(s.name)}${s.nr ? ` · Nr. ${esc(s.nr)}` : ""}</dd></div>
      <div><dt>Zeitraum</dt><dd>${esc(datumDE(m.von))} – ${esc(datumDE(m.bis))}${m.offen ? " (bis heute)" : ""}</dd></div>
      <div><dt>Gewässer / Spots</dt><dd>${esc(m.spotNamen.join(", ") || "–")}${s.gilt ? ` · ${esc(s.gilt)}` : ""}</dd></div>
      <div><dt>Angeltage</dt><dd>${m.tage}</dd></div>
    </dl>
    ${m.proArt.length ? `<table class="fm-tab"><thead><tr><th>Fischart</th><th>entnommen</th><th>Gewicht</th><th>zurückgesetzt</th></tr></thead>
      <tbody>${m.proArt.map(e => `<tr><td>${esc(e.art)}</td><td>${e.ent}</td><td>${kgText(e)}</td><td>${e.zur}</td></tr>`).join("")}</tbody></table>
      ${m.proArt.some(e => e.mitKg && e.mitKg < e.ent) ? `<p class="hinweis-klein">* Nicht bei allen entnommenen Fischen ist ein Gewicht eingetragen.</p>` : ""}
      <h4>Einzelne Fänge</h4>
      <table class="fm-tab fm-einzeln"><thead><tr><th>Datum</th><th>Fischart</th><th>Länge</th><th>Gewicht</th><th></th></tr></thead>
      <tbody>${m.faenge.map(c => `<tr><td>${esc(datumDE(c.datum))}</td><td>${esc(fischName(c))}</td><td>${zahl(c.laenge) ? esc(komma(c.laenge)) + " cm" : "–"}</td><td>${kg(c.gewicht) != null ? esc(komma(Math.round(kg(c.gewicht) * 100) / 100)) + " kg" : "–"}</td><td>${c.zurueck ? "zurückgesetzt" : "entnommen"}</td></tr>`).join("")}</tbody></table>`
      : `<p class="leer">Im Zeitraum keine Fänge an den Spots dieses Scheins. Auch eine Leermeldung ist bei vielen Vereinen Pflicht.</p>`}
  </div>`;
}

function alsText(s, m){
  return [`Fangmeldung – ${s.name}${s.nr ? " (Nr. " + s.nr + ")" : ""}`, `Zeitraum: ${datumDE(m.von)} – ${datumDE(m.bis)}`, `Gewässer: ${m.spotNamen.join(", ")}`, `Angeltage: ${m.tage}`, "",
    ...(m.proArt.length ? m.proArt.map(e => `${e.art}: ${e.ent} entnommen${e.mitKg ? " (" + komma(Math.round(e.kg * 10) / 10) + " kg)" : ""}, ${e.zur} zurückgesetzt`) : ["Keine Fänge (Leermeldung)"]),
    ...(m.faenge.length ? ["", "Einzeln:", ...m.faenge.map(c => `${datumDE(c.datum)} · ${fischName(c)}${zahl(c.laenge) ? " · " + komma(c.laenge) + " cm" : ""}${kg(c.gewicht) != null ? " · " + komma(Math.round(kg(c.gewicht) * 100) / 100) + " kg" : ""} · ${c.zurueck ? "zurückgesetzt" : "entnommen"}`)] : [])].join("\n");
}

function drucken(html){
  const d = document.createElement("div");
  d.className = "fm-druck"; d.innerHTML = html;
  document.body.appendChild(d); document.body.classList.add("druck-fm");
  const weg = () => { d.remove(); document.body.classList.remove("druck-fm"); window.removeEventListener("afterprint", weg); };
  window.addEventListener("afterprint", weg);
  setTimeout(() => { window.print(); setTimeout(weg, 1500); }, 50);
}

/* zurueck(): zurück zum Schein; abgegeben(): Meldung als abgegeben markieren */
export function fangmeldungOeffnen(s, { zurueck, abgegeben, toast }){
  const m = fangmeldung(s);
  const html = berichtHTML(s, m);
  const dlg = blatt("Fangmeldung", `${html}
    <div class="blatt-akt fm-akt">
      <button type="button" class="knopf prim" data-fm-teilen>Teilen / kopieren</button>
      <button type="button" class="knopf" data-fm-druck>Drucken / PDF</button>
      ${s.fmAbgegeben ? `<span class="hinweis-klein">Abgegeben am ${esc(datumDE(s.fmAbgegeben))}</span>` : `<button type="button" class="knopf leise" data-fm-ab>Als abgegeben markieren</button>`}
      <button type="button" class="knopf leise" data-fm-zurueck>‹ Zum Schein</button>
    </div>
    <p class="hinweis-klein">Zusammengestellt aus deinem Fangbuch: Fänge an den Spots dieses Scheins. Bitte mit dem Vordruck deines Vereins abgleichen – manche wollen nur entnommene Fische, andere auch die Angeltage.</p>`, () => null);
  dlg.querySelector("form").addEventListener("click", e => {
    if(e.target.closest("[data-fm-teilen]")){
      const text = alsText(s, m);
      if(navigator.share) navigator.share({ title: "Fangmeldung " + s.name, text }).catch(() => {});
      else if(navigator.clipboard) navigator.clipboard.writeText(text).then(() => toast && toast("Fangmeldung kopiert"));
    }
    if(e.target.closest("[data-fm-druck]")) drucken(html);
    if(e.target.closest("[data-fm-ab]")){ abgegeben && abgegeben(); dlg.close(); }
    if(e.target.closest("[data-fm-zurueck]")){ dlg.close(); zurueck && zurueck(); }
  });
}
