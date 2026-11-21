/* ============================================================
   Wetter am Spot – heute, morgen, übermorgen
   Im Spot-Steckbrief (Gewässer) per Knopf aufklappbar: Temperatur,
   Wind & Böen, Luftdruck mit Trend, Himmel/Regen, Sonne, Mond,
   Stundenverlauf und welche Fische an dem Tag am ehesten gehen.
   Daten: Open-Meteo (ohne Schlüssel), gleicher Cache wie „Heute“ –
   ohne Netz bleibt der letzte Stand sichtbar.
   ============================================================ */
import { ladeWetter, tagesLage, windRichtung, mondphase, fischBewertung, urteil, tagISO } from "./lage.js";

const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[c]));
const TAGE = ["Heute", "Morgen", "Übermorgen"];
const SPOT_GW = { see: "see", teich: "see", fluss: null, kanal: "nok", forellensee: "forellensee" };

const sw = { offen: null, tag: 0, daten: {}, fehler: {}, laeuft: null };

/* Steckbrief-Eintrag -> „Ort“ für Wetter und Fisch-Bewertung */
function ortVon(e){
  const r = e.roh || {};
  const typ = e.ebene === "spots" ? r.type : e.ebene === "fuehrer" ? r.art : e.ebene === "lav" ? "see" : e.ebene === "dk" ? "forellensee" : e.ebene === "kueste" ? "kueste" : null;
  const kueste = typ === "kueste";
  const gw = kueste ? (e.lng < 9.5 ? "nordsee" : "ostsee") : (SPOT_GW[typ] ?? null);
  return { id: "gw_" + e.id, name: e.name, lat: +(+e.lat).toFixed(3), lng: +(+e.lng).toFixed(3), gw, kueste, tides: false };
}

export function spotWetterHTML(e, neuZeichnen){
  if(sw.offen !== e.id) return `<button type="button" class="knopf gw-wetter-knopf" data-sw-auf="${esc(e.id)}">Wetter & Angelbedingungen · 3 Tage</button>`;
  const ort = ortVon(e);
  const w = sw.daten[ort.id];
  if(!w){
    if(sw.fehler[ort.id]) return `<div class="h-karte sw"><p class="hinweis-klein">Wetter konnte nicht geladen werden – bist du online?</p><button type="button" class="knopf klein" data-sw-auf="${esc(e.id)}">Nochmal versuchen</button></div>`;
    if(sw.laeuft !== ort.id){
      sw.laeuft = ort.id;
      ladeWetter(ort).then(d => { sw.daten[ort.id] = d; }).catch(() => { sw.fehler[ort.id] = true; })
        .finally(() => { sw.laeuft = null; if(sw.offen === e.id) neuZeichnen(); });
    }
    return `<div class="h-karte sw"><p class="hinweis-klein">Lade Wetter für ${esc(e.name)} …</p></div>`;
  }
  const l = tagesLage(w, sw.tag);
  const chips = `<div class="chips sw-tage">${TAGE.map((t, i) => `<button type="button" class="chip${i === sw.tag ? " on" : ""}" data-sw-tag="${i}">${t}<small>${new Date(tagISO(i) + "T12:00:00").toLocaleDateString("de-DE", { weekday: "short", day: "numeric", month: "numeric" })}</small></button>`).join("")}</div>`;
  if(!l) return `<div class="h-karte sw"><div class="sw-kopf"><h3>Wetter am Spot</h3><button type="button" class="knopf klein leise" data-sw-zu aria-label="Wetter schließen">✕</button></div>${chips}<p class="hinweis-klein">Für diesen Tag liegen noch keine Wetterdaten vor.</p></div>`;
  const mond = mondphase(l.iso);
  const pfeil = /fallend/.test(l.trend) ? "↘" : /steigend/.test(l.trend) ? "↗" : "→";
  const stand = new Date(l.stand).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" });
  const druckText = /fallend/.test(l.trend) ? "fällt – Raubfische oft beißfreudig" : /steigend/.test(l.trend) ? "steigt – Fische oft vorsichtiger, fein fischen" : "stabil – gleichmäßige Beißlaune";
  const windText = l.wind < 8 ? "kaum Wind – Fische scheu, weit werfen" : l.wind <= 25 ? "leichte Welle – gut, Wasser trüber, Fische mutiger" : l.wind <= 40 ? "kräftiger Wind – Windkante befischen, schwerere Köder" : "sehr windig – Werfen schwierig";
  const b = fischBewertung(ort, l, +l.iso.slice(5, 7), l.iso, null);
  const top = b.passt.filter(x => x.punkte >= 1).slice(0, 4);
  return `<div class="h-karte sw">
    <div class="sw-kopf"><h3>Wetter am Spot</h3><button type="button" class="knopf klein leise" data-sw-zu aria-label="Wetter schließen">✕</button></div>
    ${chips}
    <div class="h-kacheln">
      <div><small>${sw.tag ? "Mittags" : "Jetzt"}</small><b>${Math.round(l.temp)}°</b><span>${l.tmin !== null ? `${Math.round(l.tmin)}–${Math.round(l.tmax)}°` : ""}</span></div>
      <div><small>Wind</small><b>${Math.round(l.wind)} <i>km/h</i></b><span>${windRichtung(l.richtung)} · Böen ${Math.round(l.boenMax)}</span></div>
      <div class="${/fallend/.test(l.trend) ? "akzent" : ""}"><small>Luftdruck</small><b>${Math.round(l.druck)} ${pfeil}</b><span>hPa · ${esc(l.trend)}</span></div>
      <div><small>Himmel</small><b>${Math.round(l.wolken)} %</b><span>Regen bis ${l.regenMax ?? "–"} %</span></div>
    </div>
    <ul class="sw-angel">
      <li><b>Luftdruck</b> ${esc(druckText)}</li>
      <li><b>Wind</b> ${esc(windText)}</li>
      <li><b>Beste Zeit</b> Dämmerung: Sonne ${l.aufgang}–${l.untergang} · Mond: ${esc(mond.name)}</li>
    </ul>
    ${l.boenMax > 55 ? `<p class="h-warn">Böen bis ${Math.round(l.boenMax)} km/h – am Wasser vorsichtig sein, an der Küste nicht waten.</p>` : ""}
    ${l.stunden.length ? `<div class="h-stunden">${l.stunden.map(s => `<div><b>${s.zeit}</b><span>${Math.round(s.temp)}°</span><span>${Math.round(s.wind)}</span><span>${s.regen ?? 0}%</span></div>`).join("")}</div>
      <p class="h-legende">Uhrzeit · Temperatur · Wind km/h · Regenrisiko</p>` : ""}
    ${top.length ? `<div class="sw-fische"><b>Gute Chancen ${sw.tag ? TAGE[sw.tag].toLowerCase() : "heute"}</b>${top.map(x => { const [f, t] = urteil(x.punkte); return `<span><i class="amp ${f}"></i>${esc(x.fisch.name.split(" (")[0])} <small>${t}</small></span>`; }).join("")}</div>` : ""}
    <p class="hinweis-klein">${l.ausCache ? `Ohne Netz – letzter Stand von ${stand} Uhr.` : `Open-Meteo · Stand ${stand} Uhr`}${ort.gw ? "" : " · Fischauswahl ohne Gewässertyp, daher allgemein."}</p>
  </div>`;
}

/* true = neu zeichnen */
export function spotWetterKlick(ev){
  const t = ev.target;
  const auf = t.closest("[data-sw-auf]");
  if(auf){ sw.offen = auf.dataset.swAuf; sw.tag = 0; Object.keys(sw.fehler).forEach(k => delete sw.fehler[k]); return true; }
  if(t.closest("[data-sw-zu]")){ sw.offen = null; return true; }
  const tag = t.closest("[data-sw-tag]");
  if(tag){ sw.tag = +tag.dataset.swTag; return true; }
  return false;
}
