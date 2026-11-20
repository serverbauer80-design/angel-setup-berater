/* ============================================================
   Fisch bestimmen – Verwechslungen, die rechtlich zählen
   Je Gruppe ähnlicher Arten die Unterscheidungsmerkmale, das
   sicherste Merkmal hervorgehoben, dazu Schonzeit und Mindestmaß
   (RECHT_SH). #wissen/bestimmen, #wissen/bestimmen-<gruppe>
   ============================================================ */
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[c]));

export const GRUPPEN_BEST = [
  { id: "salmoniden", titel: "Meerforelle, Lachs oder Forelle?", warum: "Meerforelle hat Schonzeit und 40 cm Mindestmaß, der Lachs ist eine Wiederansiedlungsart – Verwechslung kann teuer werden.",
    arten: [
      { name: "Meerforelle", id: "meerforelle", sicher: "Oberkiefer reicht deutlich hinter das Auge, Schwanzflosse gerade abgeschnitten",
        merkmale: ["silbrig-blank (frisch aus dem Meer), später bräunlich", "viele schwarze, oft x-förmige Punkte – auch unterhalb der Seitenlinie", "kräftiger Schwanzstiel: lässt sich nicht wie ein Griff fassen"] },
      { name: "Lachs", sicher: "schlanker Schwanzstiel (wie ein Griff zu fassen), Schwanzflosse leicht gegabelt",
        merkmale: ["Oberkiefer endet etwa unter dem hinteren Augenrand", "kaum Punkte unterhalb der Seitenlinie", "kleinerer Kopf im Verhältnis zum Körper"],
        recht: "Wiederansiedlungsart – in Schleswig-Holstein in der Regel zurücksetzen. Landesverordnung und Erlaubnisschein prüfen." },
      { name: "Bachforelle", id: "forelle", sicher: "rote Punkte mit hellem Hof",
        merkmale: ["gelblich-braun mit dunklem Rücken", "schwarze und rote Punkte", "lebt im Süßwasser (Bäche, Flüsse)"] },
      { name: "Regenbogenforelle", sicher: "rosa-violettes Band entlang der Seite, Punkte auch auf der Schwanzflosse",
        merkmale: ["viele kleine schwarze Punkte auf Körper, Rücken- und Schwanzflosse", "typisch am Forellensee (Besatz)"],
        recht: "Am Forellensee gilt die Gewässerordnung der Anlage." }
    ] },
  { id: "barsche", titel: "Zander, Barsch oder Kaulbarsch?", warum: "Zander hat Schonzeit und Mindestmaß, der Barsch meist nicht.",
    arten: [
      { name: "Zander", id: "zander", sicher: "lange Fangzähne (Hundszähne) im Maul",
        merkmale: ["lang gestreckter Körper", "große, glasig schimmernde Augen", "zwei getrennte Rückenflossen mit Punktreihen", "Bauchflossen blass, nicht rot"] },
      { name: "Flussbarsch", id: "barsch", sicher: "schwarzer Fleck am Ende der ersten Rückenflosse, rote Bauch- und Afterflossen",
        merkmale: ["hochrückig", "5–9 dunkle Querbinden", "die beiden Rückenflossen berühren sich", "keine Fangzähne"] },
      { name: "Kaulbarsch", sicher: "beide Rückenflossen zu einer verwachsen",
        merkmale: ["klein (selten über 20 cm), schleimig", "feine dunkle Punkte statt Querbinden", "große Schleimgruben am Kopf"] }
    ] },
  { id: "doebel", titel: "Döbel, Aland oder Rapfen?", warum: "Der Rapfen ist ganzjährig geschützt – er muss sofort zurück.",
    arten: [
      { name: "Döbel", id: "doebel", sicher: "Afterflosse nach außen gewölbt (rund)",
        merkmale: ["breiter, massiger Kopf, großes Maul", "Schuppen dunkel gerandet (Netzmuster)", "44–46 Schuppen entlang der Seitenlinie"] },
      { name: "Aland", sicher: "Afterflosse nach innen gewölbt (eingebuchtet)",
        merkmale: ["höherer Rücken, kleineres Maul als der Döbel", "kleinere Schuppen (56–61 entlang der Seitenlinie)", "Flossen oft rötlich"],
        recht: "Gewässerordnung prüfen – manche Vereine setzen Schonmaß oder -zeit." },
      { name: "Rapfen", id: "rapfen", sicher: "Höcker am Unterkiefer greift in eine Kerbe im Oberkiefer",
        merkmale: ["oberständiges Maul, Maulspalte bis unter das Auge", "lang gestreckt, silbrig", "lange, eingebuchtete Afterflosse", "jagt an der Oberfläche (Wasserexplosionen)"] }
    ] },
  { id: "rotauge", titel: "Rotauge oder Rotfeder?", warum: "Beide ohne gesetzliche Schonzeit – aber gut für die Fangstatistik und als Köderfisch-Regeln im Verein.",
    arten: [
      { name: "Rotauge", id: "rotauge", sicher: "Rückenflosse beginnt genau über dem Ansatz der Bauchflossen",
        merkmale: ["rotes Auge", "Maul endständig", "Flossen blassrot"] },
      { name: "Rotfeder", sicher: "Rückenflosse beginnt deutlich hinter dem Ansatz der Bauchflossen",
        merkmale: ["Maul leicht oberständig (schräg nach oben)", "Flossen kräftig blutrot", "Bauch zwischen Bauch- und Afterflosse gekielt und beschuppt", "Auge eher goldgelb"] }
    ] },
  { id: "brassen", titel: "Brassen oder Güster?", warum: "Für Fangmeldung und Statistik – viele „kleine Brassen“ sind Güstern.",
    arten: [
      { name: "Brassen (Blei)", sicher: "kleines Auge, graue Flossen",
        merkmale: ["Afterflosse lang", "51–60 Schuppen entlang der Seitenlinie", "ältere Fische bronzefarben"] },
      { name: "Güster", sicher: "großes Auge (mindestens so groß wie die Schnauzenlänge), Brust- und Bauchflossen am Ansatz rötlich",
        merkmale: ["silbrig", "weniger, größere Schuppen (44–50)", "selten über 30 cm"] }
    ] },
  { id: "karpfen", titel: "Karpfen, Karausche oder Giebel?", warum: "Die Karausche ist vielerorts selten und geschützt; Giebel verdrängen sie.",
    arten: [
      { name: "Karpfen", id: "karpfen", sicher: "vier Barteln am Maul (zwei lange, zwei kurze)",
        merkmale: ["Schuppen-, Spiegel- oder Lederkarpfen", "lange Rückenflosse mit gezacktem Hartstrahl"] },
      { name: "Karausche", sicher: "keine Barteln, Rückenflosse nach außen gewölbt",
        merkmale: ["hochrückig, goldbraun", "Bauchfell innen hell", "junge Fische mit dunklem Fleck am Schwanzstiel"],
        recht: "In vielen Gewässern selten – Gewässerordnung prüfen, im Zweifel zurücksetzen." },
      { name: "Giebel", sicher: "keine Barteln, Rückenflosse gerade bis eingebuchtet",
        merkmale: ["silbriger als die Karausche", "Bauchfell innen schwarz", "oft in Massen in kleinen Gewässern"] }
    ] },
  { id: "plattfisch", titel: "Flunder, Scholle oder Kliesche?", warum: "Mindestmaß 25 cm bei Flunder und Scholle – und unterschiedliche Regeln je Gebiet.",
    arten: [
      { name: "Scholle", id: "flunder", sicher: "leuchtend orange-rote Flecken, Reihe von 4–7 Knochenhöckern hinter den Augen",
        merkmale: ["glatte Haut", "rechtsäugig"] },
      { name: "Flunder", id: "flunder", sicher: "raue Hautwarzen an der Basis von Rücken- und Afterflosse und entlang der Seitenlinie",
        merkmale: ["Flecken blass oder fehlend", "kommt bis ins Brackwasser und in Flussmündungen", "auch linksäugige Tiere"] },
      { name: "Kliesche", sicher: "Seitenlinie mit deutlichem Bogen über der Brustflosse",
        merkmale: ["Haut rau, wenn man vom Schwanz zum Kopf streicht", "eher klein, hellbraun"] }
    ] },
  { id: "hering", titel: "Hering oder Sprotte?", warum: "Hering ist für Freizeitangler in der westlichen Ostsee stark eingeschränkt.",
    arten: [
      { name: "Hering", id: "hering", sicher: "Bauchflossen beginnen unter der Rückenflosse",
        merkmale: ["Bauchkante kaum gesägt", "größer, bis über 30 cm"] },
      { name: "Sprotte", sicher: "Bauchflossen beginnen vor der Rückenflosse, Bauchkante scharf gesägt (mit dem Finger fühlbar)",
        merkmale: ["klein, selten über 15 cm"] }
    ] }
];

function rechtText(a){
  if(a.recht) return a.recht;
  const r = a.id && typeof RECHT_SH !== "undefined" ? RECHT_SH[a.id] : null;
  if(!r) return "";
  return `Schonzeit: ${r.schonzeit} · Mindestmaß: ${r.mindestmass}`.replace(/&amp;/g, "&");
}

export function bestimmenUebersichtHTML(){
  return `<div class="w-gruppe" id="bestimmen"><h3>Fische bestimmen <span>Verwechslungen, die rechtlich zählen</span></h3>
    <div class="w-karten">${GRUPPEN_BEST.map(g => `<a class="w-karte" href="#wissen/bestimmen-${g.id}"><b>${esc(g.titel)}</b><span>${esc(g.warum)}</span><small>${g.arten.map(a => esc(a.name)).join(" · ")}</small></a>`).join("")}</div></div>`;
}

export function bestimmenDetailHTML(id){
  const g = GRUPPEN_BEST.find(x => x.id === id);
  if(!g) return `<section class="wissen"><a class="zurueck sichtbar" href="#wissen">‹ Wissen</a><p class="leer">Nicht gefunden.</p></section>`;
  return `<section class="wissen best">
    <a class="zurueck sichtbar" href="#wissen">‹ Wissen</a>
    <p class="eyebrow">Fische bestimmen</p>
    <h2>${esc(g.titel)}</h2>
    <p class="lead-klein">${esc(g.warum)}</p>
    <div class="best-arten">${g.arten.map(a => `<article class="best-art">
      <h3>${esc(a.name)}</h3>
      <p class="best-sicher"><span>Sicherstes Merkmal</span>${esc(a.sicher)}</p>
      <ul>${a.merkmale.map(m => `<li>${esc(m)}</li>`).join("")}</ul>
      ${rechtText(a) ? `<p class="best-recht">${esc(rechtText(a))}</p>` : ""}
    </article>`).join("")}</div>
    <p class="hinweis-klein">Im Zweifel: Foto machen, Fisch schonend zurücksetzen. Rechtliche Angaben sind Orientierungswerte für Schleswig-Holstein – Gewässerordnung und Erlaubnisschein gehen vor.</p>
    <p><a href="#wissen/bestimmen">Alle Verwechslungsgruppen ›</a></p>
  </section>`;
}
