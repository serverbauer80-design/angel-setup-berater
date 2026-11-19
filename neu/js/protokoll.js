/* ============================================================
   Prüfprotokoll: Wie rechnet der Berater?
   Alle Regeln, alle Gerätedaten und alle Empfehlungen je Gewässer auf
   einer Seite – zum Gegenlesen mit erfahrenen Anglern (Verein, Händler).
   ============================================================ */
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[c]));
const komma = v => String(v).replace(".", ",");
const gwName = k => GEWAESSER[k] ? GEWAESSER[k].name : k;
const ART = { geflecht: "Geflecht", mono: "Mono", fc: "Fluoro" };
const AKT = { schnell: "schnell", mittel: "mittel", parabolisch: "parabolisch" };
const AMP = ["g", "y", "r"];
const kurzName = s => String(s.name || "").split(" · ")[0] + (String(s.name).match(/\(([^)]+)\)\s*$/) ? ` (${s.name.match(/\(([^)]+)\)\s*$/)[1]})` : "");

function anfZeilen(anf){
  const z = [];
  if(anf.stippe) z.push(["Gerät", `nur Stippruten, ideal ${komma(anf.laenge[0])}–${komma(anf.laenge[1])} m`]);
  if(anf.koeder){
    const k = Object.entries(anf.koeder).map(([gw, [a, b]]) => `${gw === "alle" ? "allgemein" : gwName(gw)} ${komma(a)}–${komma(b)} g`).join(" · ");
    z.push(["Gesamtgewicht am Wurf", k]);
  }
  if(anf.schnur) z.push(["Schnur (Tragkraft)", Object.entries(anf.schnur).map(([art, [a, b]]) => `${ART[art]} ${komma(a)}–${komma(b)} kg`).join(" oder ")]);
  if(anf.laenge && !anf.stippe) z.push(["Rutenlänge", `${komma(anf.laenge[0])}–${komma(anf.laenge[1])} m${anf.laengeHart ? " (Pflicht)" : ""}`]);
  if(anf.aktion) z.push(["Rutenaktion", anf.aktion.map(a => AKT[a]).join(" oder ")]);
  if(anf.spitze === "feeder") z.push(["Spitze", "Bibberspitze nötig"]);
  if(anf.freilauf) z.push(["Freilauf", { pflicht: "Pflicht", gut: "von Vorteil", nein: "nicht nötig (aktives Führen)" }[anf.freilauf]]);
  if(anf.rolleMin) z.push(["Rolle", `mindestens Größe ${anf.rolleMin}`]);
  if(anf.passiv) z.push(["Angelart", "passiv (Rute im Halter)"]);
  if(anf.kueste) z.push(["Wasser", "Salzwasser"]);
  if(anf.maxStatus) z.push(["Höchstens", anf.maxStatus === "bedingt" ? "„bedingt“ – es fehlt Zubehör" : anf.maxStatus]);
  return z;
}

function geraetTabelle(){
  const zeilen = Object.values(AKTUELL).map(s => {
    const rute = RUTEN.find(r => r.id === s.ruteId) || {};
    const rolle = s.rolleId ? ROLLEN.find(r => r.id === s.rolleId) : null;
    const tk = rolle ? AUSR.tragkraft(rolle) : null;
    const i = rolle ? (rolle.schnurInfo || AUSR.parseSchnur(rolle.schnur)) : null;
    const bal = BERATER.balance(rute, rolle);
    return `<tr>
      <td><a href="#rutenwand/${s.key}">${esc(kurzName(s))}</a></td>
      <td class="num">${rute.laenge ? komma(rute.laenge.toFixed(2)) + " m" : "–"}</td>
      <td class="num">${rute.wg ? komma(rute.wg[0]) + "–" + komma(rute.wg[1]) + " g" : "–"}</td>
      <td>${rute.aktion ? AKT[rute.aktion] + (rute.aktionQuelle === "geschätzt" ? ' <em class="gesch">geschätzt</em>' : "") : (s.kategorie === "stippe" ? "–" : '<em class="gesch">fehlt</em>')}${rute.feederspitze ? " · Bibberspitze" : ""}</td>
      <td>${rolle ? esc(rolle.name) + " · " + rolle.groesse + (rolle.freilauf ? " · Freilauf" : "") : "–"}</td>
      <td>${i && i.art ? ART[i.art] + (i.dm ? " " + i.dm : "") : "–"}</td>
      <td class="num">${tk ? "ca. " + komma(tk.kg) + " kg" + (tk.quelle === "geschätzt" ? ' <em class="gesch">geschätzt</em>' : "") : "–"}</td>
      <td>${bal ? `<span class="amp ${AMP[bal.stufe]}"></span>` : "–"}</td>
    </tr>`;
  }).join("");
  return `<div class="tab-scroll"><table class="proto-tab">
    <thead><tr><th>Setup</th><th>Länge</th><th>WG</th><th>Aktion</th><th>Rolle</th><th>Schnur</th><th>Tragkraft</th><th>Balance</th></tr></thead>
    <tbody>${zeilen}</tbody></table></div>`;
}

export function protokollHTML(){
  let h = `<section class="protokoll">
    <a class="zurueck sichtbar" href="#heute">‹ Zurück zum Berater</a>
    <p class="eyebrow">Prüfprotokoll · Stand ${new Date().toLocaleDateString("de-DE")}</p>
    <h2>Wie rechnet der Berater?</h2>
    <div class="proto-text">
      <p>Diese Seite zeigt alle Regeln und Daten, aus denen der Berater seine Empfehlungen macht. Sie ist zum <b>Gegenlesen</b> gedacht – zum Beispiel mit einem erfahrenen Kollegen aus dem LAV oder im Angelladen. Was dort als falsch auffällt, lässt sich gezielt korrigieren.</p>
      <h3>So wird jedes Setup bewertet</h3>
      <ul>
        <li><b>Gesamtgewicht am Wurf</b> (Blei bzw. Jigkopf plus Köder) gegen das Wurfgewicht der Rute. Mehr als 10 % über dem WG: gelb; deutlich darüber (über 150 %): rot. Viel leichter als das WG: gelb, weil die Rute nicht lädt und du wenig spürst – außer beim passiven Ansitz.</li>
        <li><b>Schnur</b>: erlaubte Art und Tragkraft in kg. Ist keine Tragkraft eingetragen, wird sie aus dem Durchmesser geschätzt (Geflecht ≈ 75 kg × mm, Mono ≈ 90 kg × mm²) – bei Geflecht sind diese Schätzungen unsicher.</li>
        <li><b>Rutenlänge</b>, <b>Aktion</b> (schnell / mittel / parabolisch), <b>Bibberspitze</b> beim Feedern, <b>Freilauf</b> beim Ansitz.</li>
        <li><b>Balance</b> von Rute und Rolle (Rollengröße passend zum WG, lange Ruten brauchen Gegengewicht).</li>
        <li><b>Zustand der Schnur</b> (Mono/FC nach 6, Geflecht nach 12 Monaten) und <b>Salzwasser</b> erzeugen Hinweise, schließen aber nichts aus.</li>
      </ul>
      <p>Grün = alles passt, gelb = geht mit Abstrichen, rot = ungeeignet. Unter den passenden Setups gewinnt das, dessen Wurfgewicht am besten zur Methode passt, das zur richtigen Gruppe gehört und – bei Gleichstand – genau dafür gebaut ist.</p>
      <p class="hinweis-klein">Die Grenzwerte sind Erfahrungswerte, keine Normen. Schonzeiten, Mindestmaße und Gewässerordnung prüft der Berater (noch) nicht.</p>
    </div>
    <h3>Deine Gerätedaten</h3>
    <p class="hinweis-klein">„geschätzt“ = nicht aus deinen Angaben, sondern abgeleitet. Ein Blick auf Rute bzw. Schnurspule macht den Berater genauer.</p>
    ${geraetTabelle()}
    <h3>Alle Methoden</h3>`;

  FISCHE.forEach(f => {
    const bloecke = f.ansaetze.map(a => {
      const anf = BERATER.anforderung(a);
      if(!anf) return `<div class="proto-ansatz"><h4>${esc(a.methode)}</h4><p class="hinweis-klein">Ohne Regel – feste Zuordnung aus data.js.</p></div>`;
      const gws = a.gewaesser || f.gewaesser || [];
      const zeilen = gws.map(gw => {
        const b = BERATER.bewerte(a, gw);
        const top = b.liste.filter(x => x.stufe < 2).slice(0, 3);
        const erste = top[0];
        return `<tr><td>${esc(gwName(gw))}</td>
          <td><span class="status ${AMP[{ machbar: 0, bedingt: 1, wunsch: 2 }[b.status]]}">${{ machbar: "passt", bedingt: "mit Abstrichen", wunsch: "Gerät fehlt" }[b.status]}</span></td>
          <td>${top.length ? top.map((x, i) => `<span class="amp ${AMP[x.stufe]}"></span> ${i === 0 ? "<b>" : ""}${esc(kurzName(x.setup))}${i === 0 ? "</b>" : ""}`).join("<br>") : "—"}</td>
          <td class="klein">${erste ? [...erste.plus.map(t => "✓ " + esc(t)), ...erste.gruende.map(t => "! " + esc(t))].join("<br>") : "Keins deiner Setups ist geeignet."}</td></tr>`;
      }).join("");
      return `<div class="proto-ansatz">
        <h4>${esc(a.methode)}</h4>
        <dl class="proto-anf">${anfZeilen(anf).map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join("")}</dl>
        ${anf.hinweis ? `<p class="hinweis-klein">${esc(anf.hinweis)}</p>` : ""}
        <div class="tab-scroll"><table class="proto-tab"><thead><tr><th>Gewässer</th><th>Status</th><th>Empfehlung (beste zuerst)</th><th>Begründung für die erste</th></tr></thead><tbody>${zeilen}</tbody></table></div>
      </div>`;
    }).join("");
    h += `<details class="proto-fisch"><summary>${esc(f.name)} <span>${f.ansaetze.length} Methode${f.ansaetze.length > 1 ? "n" : ""}</span></summary>${bloecke}</details>`;
  });
  return h + `</section>`;
}
