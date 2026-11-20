/* ============================================================
   Pegel & Wassertemperatur (Etappe 7)
   Für Flüsse und Kanäle sucht die App die nächste amtliche Messstelle
   am selben Gewässer (PEGELONLINE der WSV – Bundeswasserstraßen,
   frei, ohne Anmeldung) und zeigt im Steckbrief:
   Wasserstand mit 24-h-Verlauf, Einordnung (niedrig/normal/hoch nach
   den amtlichen Kennwerten), Wassertemperatur und was das fürs
   Angeln heißt. Bei Tidegewässern zählt auflaufend/ablaufend.
   ============================================================ */
import { flussName } from "./flusslauf.js";

const API = "https://www.pegelonline.wsv.de/webservices/rest-api/v2";
const MAX_KM = 25;
const FRISCH_MS = 15 * 60e3;
/* Gewässer, deren Messstellen unter anderem Namen laufen */
const PEGEL_ALIAS = { "Norderelbe": "Elbe" };

const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[c]));
const norm = s => String(s || "").toUpperCase().replace(/[^A-ZÄÖÜ]/g, "");
const km = (a, b, c, d) => 6371 * Math.hypot((c - a) * Math.PI / 180, (d - b) * Math.PI / 180 * Math.cos(a * Math.PI / 180));
const zahl = v => String(Math.round(v * 10) / 10).replace(".", ",");
const uhr = ts => new Date(ts).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" });
/* „LÜNEBURG UW“ -> „Lüneburg UW“; Kürzel (NOK, UP, OW …) bleiben groß */
const schoen = s => String(s).split(/(\s+|-|\/)/).map(w => /^(NOK|ESK|ELK|UP|OP|UW|OW|AP|BP)$/.test(w) ? w : w.charAt(0) + w.slice(1).toLowerCase()).join("");

const daten = new Map();      /* schlüssel -> { t, html } */
const laeuft = new Set();

const schluessel = e => e.lat.toFixed(3) + "|" + e.lng.toFixed(3) + "|" + flussName(e.name);
const istKanal = e => e.roh.type === "kanal" || /kanal/i.test(e.roh.typ || "");

/* Einordnung des Wassertemperatur-Werts – grobe Faustregeln für Süßwasser */
function wtText(t){
  if(t < 4) return "Sehr kalt: Fische stehen tief und träge. Langsam und grundnah fischen, Hecht und Zander an tiefen Stellen.";
  if(t < 8) return "Kalt: Köder langsam führen. Hecht, Zander und Barsch noch gut, Friedfische meist schwach.";
  if(t < 12) return "Kühl: Zander und Barsch werden aktiver, Friedfische kommen langsam in Gang.";
  if(t < 19) return "Angenehm: Für die meisten Arten gute Aktivität.";
  if(t < 23) return "Warm: Karpfen, Schleie und Aal aktiv, Raubfisch eher früh morgens und abends.";
  return "Sehr warm: Sauerstoff wird knapp. Früh oder spät angeln und Fische schonend behandeln.";
}

function sparkline(werte){
  if(werte.length < 3) return "";
  const step = Math.max(1, Math.floor(werte.length / 60));
  const p = werte.filter((_, i) => i % step === 0 || i === werte.length - 1);
  const min = Math.min(...p), max = Math.max(...p), sp = Math.max(max - min, 4);
  const pts = p.map((v, i) => `${(i / (p.length - 1) * 100).toFixed(1)},${(28 - (v - min) / sp * 24).toFixed(1)}`).join(" ");
  return `<svg class="pg-linie" viewBox="0 0 100 30" preserveAspectRatio="none" aria-hidden="true"><polyline points="${pts}" vector-effect="non-scaling-stroke"/></svg>`;
}

async function json(url){
  const res = await fetch(url);
  if(!res.ok) throw new Error("HTTP " + res.status);
  return res.json();
}

async function hole(e){
  const name = norm(PEGEL_ALIAS[flussName(e.name)] || flussName(e.name));
  const st = await json(`${API}/stations.json?latitude=${e.lat}&longitude=${e.lng}&radius=${MAX_KM}&includeTimeseries=true&includeCurrentMeasurement=true&includeCharacteristicValues=true`);
  const passend = st.filter(s => norm(s.water && s.water.longname) === name && s.latitude)
    .map(s => ({ s, d: km(e.lat, e.lng, s.latitude, s.longitude) })).sort((a, b) => a.d - b.d);
  const mitW = passend.find(x => x.s.timeseries.some(t => t.shortname === "W" && t.currentMeasurement));
  const mitWT = passend.find(x => x.s.timeseries.some(t => t.shortname === "WT" && t.currentMeasurement));
  if(!mitW && !mitWT) return `<p class="hinweis-klein">Kein amtlicher Pegel an diesem Gewässer in der Nähe. PEGELONLINE deckt nur Bundeswasserstraßen ab (Elbe, Weser, Kanäle …).</p>`;

  let teile = [];
  if(mitW){
    const s = mitW.s, ts = s.timeseries.find(t => t.shortname === "W");
    const cur = ts.currentMeasurement, kv = Object.fromEntries((ts.characteristicValues || []).map(c => [c.shortname, c.value]));
    const tide = "MThw" in kv || "MTnw" in kv;
    let verlauf = [];
    try { verlauf = (await json(`${API}/stations/${s.uuid}/W/measurements.json?start=P1D`)).map(m => m.value); } catch(err){}
    let trend = "", rat = "";
    if(tide){
      /* Tide: Richtung der letzten Stunde */
      const pro = verlauf.length > 1 ? verlauf.length / 24 : 0;
      const vor = pro ? verlauf[Math.max(0, verlauf.length - 1 - Math.round(pro))] : null;
      const d = vor != null ? cur.value - vor : 0;
      trend = vor == null ? "" : Math.abs(d) < 5 ? "Stauwasser (Kentern)" : d > 0 ? `auflaufend (+${Math.round(d)} cm/h)` : `ablaufend (${Math.round(d)} cm/h)`;
      rat = "Tidegewässer: Der Wasserstand folgt Ebbe und Flut. Viele Fische beißen am besten bei auflaufendem Wasser und rund ums Kentern. Bei starker Strömung brauchst du schwerere Bleie.";
    } else {
      const d24 = verlauf.length > 1 ? cur.value - verlauf[0] : null;
      trend = d24 == null ? "" : Math.abs(d24) < 5 ? "gleichbleibend (24 h)" : d24 > 0 ? `steigt (+${Math.round(d24)} cm in 24 h)` : `fällt (${Math.round(d24)} cm in 24 h)`;
      const lage = cur.stateMnwMhw;
      if(istKanal(e) && (lage === "unknown" || !kv.MW || (kv.MHW - kv.MNW) < 40))
        rat = "Kanal mit geregeltem Wasserstand: Der Pegel spielt kaum eine Rolle. Wichtiger sind Wind, Schiffsverkehr und Trübung.";
      else if(lage === "high" || (d24 != null && d24 >= 15))
        rat = "Steigendes oder hohes Wasser bringt Trübung und Strömung. Fische suchen ruhige Bereiche: Kehrwasser, Buhnenfelder, Hafeneinfahrten, ufernah. Nimm kräftige, auffällige Köder und eine schwerere Montage.";
      else if(d24 != null && d24 <= -10)
        rat = "Fallendes Wasser: Fische ziehen sich von den Ufern an Kanten und Rinnen zurück. Dort gezielt suchen.";
      else if(lage === "low")
        rat = "Niedrigwasser: Fische sammeln sich in tiefen Rinnen und Kolken. Feiner fischen und leise anpirschen.";
      else rat = "Stabile Verhältnisse: Gewohnte Stellen befischen.";
    }
    const lageTxt = { low: "niedrig", normal: "normal", high: "hoch" }[cur.stateMnwMhw];
    teile.push(`<div class="pg-zeile">
        <div><span><span class="pg-wert">${cur.value} cm</span>${lageTxt ? ` <span class="pg-lage ${cur.stateMnwMhw}">${lageTxt}</span>` : ""}</span>
          <small>${esc(trend)}</small></div>
        ${sparkline(verlauf)}
      </div>
      <p class="pg-rat">${esc(rat)}</p>
      <small class="hinweis-klein">Pegel ${esc(schoen(s.longname))} · ${zahl(mitW.d)} km entfernt · Stand ${uhr(cur.timestamp)}</small>`);
  }
  if(mitWT){
    const s = mitWT.s, cur = s.timeseries.find(t => t.shortname === "WT").currentMeasurement;
    teile.push(`<div class="pg-wt"><span class="pg-wert">${zahl(cur.value)} °C</span> <small>Wassertemperatur</small></div>
      <p class="pg-rat">${esc(wtText(cur.value))}</p>
      ${!mitW || mitW.s.uuid !== s.uuid ? `<small class="hinweis-klein">Gemessen in ${esc(schoen(s.longname))} · ${zahl(mitWT.d)} km entfernt · Stand ${uhr(cur.timestamp)}</small>` : ""}`);
  }
  return teile.join("");
}

function fuelle(k, html){
  const el = document.getElementById("gw-pegel");
  if(el && el.dataset.k === k) el.innerHTML = html;
}

/* Kasten für den Steckbrief – sofort aus dem Speicher oder Platzhalter; lädt im Hintergrund nach */
export function pegelHTML(e){
  const k = schluessel(e);
  const d = daten.get(k);
  if(!d || Date.now() - d.t > FRISCH_MS){
    if(!laeuft.has(k)){
      laeuft.add(k);
      hole(e).then(html => { daten.set(k, { t: Date.now(), html }); fuelle(k, html); })
        .catch(() => { if(!d) fuelle(k, `<p class="hinweis-klein">Pegeldaten gerade nicht abrufbar – bist du offline?</p>`); })
        .finally(() => laeuft.delete(k));
    }
  }
  return `<section class="gw-pegel" aria-label="Pegel und Wassertemperatur"><h3>Wasser heute</h3>
    <div id="gw-pegel" data-k="${esc(k)}">${d ? d.html : `<p class="hinweis-klein">Pegel wird geladen …</p>`}</div></section>`;
}
