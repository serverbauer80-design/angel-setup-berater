/* ============================================================
   Bremse richtig einstellen
   Faustregel: Die Bremse gibt bei etwa einem Viertel bis einem
   Drittel der Tragkraft des schwächsten Glieds nach (Hauptschnur
   oder Vorfach). Einstellen mit Wasserflaschen in einer Tüte
   (1 Liter = 1 kg) oder einer Kofferwaage.
   ============================================================ */
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[c]));
const komma = v => String(Math.round(v * 10) / 10).replace(".", ",");

/* Vorfach aus dem Text: „… 12 kg“ oder „Fluorocarbon 0,28 mm“ */
function vorfachKg(text){
  const t = String(text || "");
  const kg = t.match(/(\d+(?:[.,]\d+)?)\s*kg/i);
  if(kg) return { kg: +kg[1].replace(",", "."), text: t, quelle: "Angabe" };
  const dm = t.match(/0,\d{2,3}/);
  if(dm && typeof AUSR !== "undefined" && AUSR.schaetzeTragkraft){
    const art = /fluoro|\bfc\b/i.test(t) ? "fc" : /geflecht|braid/i.test(t) ? "geflecht" : "mono";
    const k = AUSR.schaetzeTragkraft(art, dm[0]);
    if(k) return { kg: k, text: t, quelle: "geschätzt" };
  }
  return null;
}

export function bremseHTML(s){
  if(!s || s.kategorie === "stippe" || !s.rolle || typeof AUSR === "undefined") return "";
  const tk = AUSR.tragkraft(s.rolle);
  if(!tk) return "";
  const vf = vorfachKg(s.roh && s.roh.vorfach);
  /* Stahl und Titan sind nie das schwächste Glied */
  const vfZaehlt = vf && !/stahl|titan/i.test(vf.text) && vf.kg < tk.kg;
  const basis = vfZaehlt ? vf.kg : tk.kg;
  const fein = s.kategorie === "forelle" || basis < 4;
  const anteil = fein ? 0.25 : 0.3;
  const ziel = basis * anteil;
  const g = Math.round(ziel * 1000 / 50) * 50;
  const flasche = ziel < 1 ? `${g} g – eine Flasche mit ${String(g / 1000).replace(".", ",")} l Wasser` : `${komma(ziel)} kg – ${komma(ziel)} Liter Wasser in Flaschen`;
  return `<div class="absatz bremse"><h3>Bremse einstellen</h3>
    <p><b>Ziel: etwa ${komma(ziel)} kg</b> – ${Math.round(anteil * 100)} % von ${komma(basis)} kg (${vfZaehlt ? `Vorfach, das schwächste Glied${vf.quelle === "geschätzt" ? ", geschätzt" : ""}` : `Hauptschnur${tk.quelle === "geschätzt" ? ", geschätzt" : ""}`}).</p>
    <ol class="bremse-schritte">
      <li>Schnur durch alle Ringe ziehen, an eine Tüte mit Wasserflaschen knoten: ${esc(flasche)} (1 Liter = 1 kg). Genauer geht's mit einer Kofferwaage.</li>
      <li>Rute wie im Drill halten, etwa 45° nach oben, und langsam anheben.</li>
      <li>Bremse so einstellen, dass sie bei diesem Gewicht gerade gleichmäßig Schnur gibt – ohne Ruckeln.</li>
    </ol>
    <p class="hinweis-klein">${fein ? "Feines Gerät: lieber etwas weicher, die Rute federt den Rest ab." : "Bei Hängern am Steinfeld nicht an der Bremse festdrehen, sondern Schnur mit der Hand greifen und ziehen."} Nach dem Angeln die Bremse lockern – das schont die Bremsscheiben.</p>
  </div>`;
}
