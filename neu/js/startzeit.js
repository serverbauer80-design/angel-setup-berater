/* ============================================================
   Wann losfahren?
   Bewertet den Tag in halben Stunden: Dämmerung (je nach Zielfisch),
   Nacht für Nachtaktive, Gezeiten (erste zwei Stunden nach dem
   Wechsel), Wind und Regen. Daraus das beste Zeitfenster am Wasser –
   und mit gespeichertem Startpunkt die Abfahrtszeit (Fahrzeit aus der
   Luftlinie geschätzt). Der Startpunkt bleibt nur auf diesem Gerät.
   ============================================================ */
import { lese, schreibe } from "./store.js";

const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[c]));
const START_KEY = "neu_startpunkt_v1";
const km = (a, b, c, d) => 6371 * Math.hypot((c - a) * Math.PI / 180, (d - b) * Math.PI / 180 * Math.cos(a * Math.PI / 180));
const min = hhmm => { const [h, m] = String(hhmm).split(":").map(Number); return h * 60 + (m || 0); };
const hhmm = m => { m = ((Math.round(m / 5) * 5) % 1440 + 1440) % 1440; return String(Math.floor(m / 60)).padStart(2, "0") + ":" + String(m % 60).padStart(2, "0"); };
const VON = 4 * 60, BIS = 24 * 60, SCHRITT = 30;

export const startpunkt = () => lese(START_KEY, null);
export function startpunktSetzen(p){ if(p) schreibe(START_KEY, { lat: Math.round(p.lat * 1000) / 1000, lng: Math.round(p.lng * 1000) / 1000 }); else { try { localStorage.removeItem(START_KEY); } catch(e){} } }

/* Fahrzeit grob: Luftlinie × 1,35 (Straßen) bei ⌀ 60 km/h, plus 10 Minuten Parken und Laufen */
export function fahrzeit(ort){
  const s = startpunkt();
  if(!s || !ort) return null;
  const d = km(s.lat, s.lng, ort.lat, ort.lng);
  if(d < 1) return { min: 5, km: d };
  return { min: Math.round((d * 1.35 + 10) / 5) * 5, km: d };
}

/* w: Rohdaten Open-Meteo, iso: Tag, lage: tagesLage, tiden: [{typ, zeit}], fische: [fischId] (die stärksten des Tages) */
export function startPlan(w, iso, ort, lage, tiden, fische, heute){
  if(!w || !lage || !lage.aufgang) return null;
  const hint = id => (typeof TAGESCHECK_HINT !== "undefined" && TAGESCHECK_HINT[id]) || {};
  const daemmerung = fische.some(id => hint(id).daemmerung), nacht = fische.some(id => hint(id).nachtaktiv);
  const auf = min(lage.aufgang), unter = min(lage.untergang);
  const h = w.hourly;
  const wert = (feld, t) => { const i = h.time.indexOf(iso + "T" + String(Math.floor(t / 60) % 24).padStart(2, "0") + ":00"); return i >= 0 ? h[feld][i] : null; };
  const jetzt = new Date(), jetztMin = jetzt.getHours() * 60 + jetzt.getMinutes();
  const wechsel = (tiden || []).map(x => ({ typ: x.typ, t: min(x.zeit) }));
  const slots = [];
  for(let t = VON; t < BIS; t += SCHRITT){
    const m = t + SCHRITT / 2;
    let p = 0; const g = [];
    /* Licht */
    if(m >= auf - 60 && m <= auf + 90){ p += daemmerung ? 3 : 1; g.push("Morgendämmerung"); }
    else if(m >= unter - 90 && m <= unter + 60){ p += daemmerung ? 3 : 1; g.push("Abenddämmerung"); }
    else if(m < auf - 60 || m > unter + 60){ if(nacht){ p += 1; g.push("Nacht"); } else p -= 2; }
    else if(daemmerung && (wert("cloud_cover", m) ?? 50) < 30){ p -= 1; g.push("grelles Tageslicht"); }
    /* Gezeiten: die ersten zwei Stunden nach dem Wechsel bringen Bewegung */
    const tw = wechsel.find(x => m >= x.t && m <= x.t + 120);
    if(tw){ p += 2; g.push(tw.typ === "Niedrigwasser" ? "auflaufendes Wasser" : "ablaufendes Wasser"); }
    else if(wechsel.some(x => Math.abs(m - x.t) <= 30)){ p -= 1; g.push("Stillwasser"); }
    /* Wetter */
    const wind = wert("wind_speed_10m", m), boe = wert("wind_gusts_10m", m), regen = wert("precipitation_probability", m);
    if(boe != null && boe > 55){ p -= 3; g.push(`Böen ${Math.round(boe)} km/h`); }
    else if(wind != null && wind > 35){ p -= 2; g.push(`Wind ${Math.round(wind)} km/h`); }
    if(regen != null && regen >= 70){ p -= 1; g.push(`Regen ${regen} %`); }
    slots.push({ t, p, g, vorbei: heute && t + SCHRITT <= jetztMin });
  }
  /* Bestes Fenster: 2–3 Stunden mit der höchsten Summe (nur Zukunft) */
  const offen = slots.filter(s => !s.vorbei);
  const fenster = [];
  [6, 5, 4].forEach(len => {
    for(let i = 0; i + len <= offen.length; i++){
      const teil = offen.slice(i, i + len);
      if(teil.some((s, k) => k && s.t - teil[k - 1].t !== SCHRITT)) continue;
      const summe = teil.reduce((a, s) => a + s.p, 0);
      fenster.push({ von: teil[0].t, bis: teil[teil.length - 1].t + SCHRITT, p: summe / len, teil });
    }
  });
  fenster.sort((a, b) => b.p - a.p || (b.bis - b.von) - (a.bis - a.von));
  const bestes = fenster[0];
  /* zweites Fenster, das sich nicht überschneidet */
  const zweites = bestes ? fenster.find(f => f.p > 0.5 && (f.bis <= bestes.von || f.von >= bestes.bis)) : null;
  return { slots, bestes: bestes && bestes.p > 0 ? bestes : null, zweites, fahrt: fahrzeit(ort), daemmerung, nacht };
}

const gruendeVon = f => { const z = {}; f.teil.forEach(s => s.g.forEach(x => { if(!/grell|Stillwasser|Böen|Wind|Regen/.test(x)) z[x] = (z[x] || 0) + 1; })); return Object.keys(z).sort((a, b) => z[b] - z[a]).slice(0, 2); };

export function startHTML(plan, ort, heute, tagWort = "heute"){
  if(!plan) return "";
  const { bestes, zweites, fahrt, slots } = plan;
  const max = Math.max(1, ...slots.map(s => Math.abs(s.p)));
  const leiste = `<div class="sz-leiste" role="img" aria-label="Eignung über den Tag">${slots.map(s => `<span class="${s.vorbei ? "vorbei" : s.p > 0 ? "gut" : s.p < 0 ? "schlecht" : ""}${bestes && s.t >= bestes.von && s.t < bestes.bis ? " best" : ""}" style="--st:${Math.min(1, Math.abs(s.p) / max).toFixed(2)}" title="${hhmm(s.t)}: ${esc(s.g.join(", ") || "neutral")}"></span>`).join("")}</div>
    <div class="sz-skala">${[4, 8, 12, 16, 20, 24].map(x => `<span>${x === 24 ? "0" : x}</span>`).join("")}</div>`;
  const abfahrt = f => {
    if(!fahrt) return "";
    const ab = f.von - fahrt.min;
    const jetzt = new Date(); const jm = jetzt.getHours() * 60 + jetzt.getMinutes();
    return heute && ab <= jm ? `<b>jetzt losfahren</b> (ca. ${fahrt.min} min Fahrt)` : `losfahren um <b>${hhmm(ab)}</b> (ca. ${fahrt.min} min Fahrt)`;
  };
  return `<div class="h-karte h-start"><h3>Wann losfahren?</h3>
    ${bestes ? `<div class="sz-best"><span class="sz-zeit">${hhmm(bestes.von)}–${hhmm(bestes.bis)}</span>
        <span>am Wasser${gruendeVon(bestes).length ? ": " + esc(gruendeVon(bestes).join(" + ")) : ""}</span>
        ${fahrt ? `<span class="sz-ab">${abfahrt(bestes)}</span>` : ""}</div>
      ${zweites ? `<p class="sz-zweit">Auch gut: ${hhmm(zweites.von)}–${hhmm(zweites.bis)}${gruendeVon(zweites).length ? " (" + esc(gruendeVon(zweites).join(" + ")) + ")" : ""}${fahrt ? ` · ${abfahrt(zweites)}` : ""}</p>` : ""}`
      : `<p class="hinweis-klein">${heute ? "Für den Rest des Tages" : "An diesem Tag"} gibt es kein wirklich gutes Fenster – Wind oder Regen überwiegen.</p>`}
    ${leiste}
    <p class="hinweis-klein">${plan.daemmerung ? `Deine stärksten Fische ${tagWort} beißen vor allem in der Dämmerung` : `Dämmerung bringt etwas, ist für deine stärksten Fische ${tagWort} aber kein Muss`}${plan.nacht ? ", nachts geht auch was" : ""}${ort.tides ? "; Gezeiten: die ersten zwei Stunden nach dem Wechsel zählen" : ""}.
      ${fahrt ? `Fahrzeit aus der Luftlinie (${Math.round(fahrt.km)} km) geschätzt. <button type="button" class="link-knopf" data-start-weg>Startpunkt löschen</button>` : `<button type="button" class="link-knopf" data-start-setzen>Aktuellen Standort als Startpunkt speichern</button> – dann rechnet die App die Abfahrtszeit aus (bleibt nur auf diesem Gerät).`}</p>
  </div>`;
}
