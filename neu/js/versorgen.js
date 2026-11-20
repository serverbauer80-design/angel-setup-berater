/* ============================================================
   Fisch versorgen und verwerten (Wissen)
   Waidgerecht betäuben und töten (Tierschutz – Prüfungsstoff und
   Pflicht), schonend zurücksetzen, ausnehmen, kühlen, einfrieren.
   Dazu je Fischgruppe: vorbereiten (filetieren, schuppen, Gräten)
   und zwei einfache Rezepte.
   ============================================================ */
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[c]));

export const GRUNDLAGEN = [
  { id: "toeten", titel: "Betäuben und töten", kurz: "Sofort nach dem Landen – erst betäuben, dann töten. Immer in dieser Reihenfolge.",
    schritte: [
      "Fisch mit einem nassen Tuch festhalten, auf eine feste Unterlage legen (Abhakmatte, Boden).",
      "Betäuben: ein bis zwei kräftige Schläge mit dem Fischtöter (Priest) auf den Hinterkopf, direkt hinter den Augen. Der Fisch muss sofort still sein.",
      "Töten, solange er betäubt ist: Herzstich (Messer hinter den Kiemen von unten ins Herz) oder Kiemenrundschnitt (Kiemenbögen auf beiden Seiten durchtrennen) – der Fisch blutet aus, das verbessert auch den Geschmack.",
      "Erst wenn der Fisch tot ist: Haken lösen, ausnehmen, kühlen."
    ],
    hinweise: [
      "Pflicht nach Tierschutzgesetz und Tierschutz-Schlachtverordnung: Wirbeltiere nur unter Betäubung töten. Ohne Betäubung ist es eine Straftat.",
      "Aal: besonders lebenszäh – Kopfschlag, dann sofort Rückenmark direkt hinter dem Kopf durchtrennen oder Herzstich. Niemals lebend in Salz legen (verboten). In Nord- und Ostsee ist Aalangeln ganzjährig verboten.",
      "Plattfische: Kopfschlag auf den Kopf oberhalb der Augen, dann Herzstich.",
      "Immer dabei: Fischtöter, scharfes Messer, Lösezange, Maßband, nasses Tuch."
    ] },
  { id: "zuruecksetzen", titel: "Schonend zurücksetzen", kurz: "Untermaßig, in der Schonzeit oder einfach zu schön? So überlebt der Fisch.",
    schritte: [
      "Fisch möglichst im Wasser lassen oder nur kurz herausheben – jede Sekunde an der Luft zählt.",
      "Nur mit nassen Händen oder im gummierten Kescher anfassen, nie mit trockenem Tuch – das zerstört die Schleimhaut.",
      "Nicht in die Kiemen greifen. Großen Fisch waagerecht stützen (Bauch und Schwanzwurzel), nicht senkrecht am Kiefer hängen lassen.",
      "Haken mit Lösezange oder Hakenlöser entfernen. Tief geschluckt: Vorfach knapp abschneiden, der Haken löst sich oft von selbst.",
      "Im Wasser mit dem Kopf gegen die Strömung halten, bis er von allein wegschwimmt."
    ],
    hinweise: [
      "Fische mit Mindestmaß, in der Schonzeit oder ganzjährig geschützt: sofort und schonend zurück – Pflicht, auch wenn der Fisch verletzt wirkt.",
      "Schonhaken (ohne Widerhaken oder angedrückt) machen das Lösen viel leichter.",
      "Fisch, den du mitnehmen willst: nicht im Setzkescher lebend hältern, sondern direkt versorgen."
    ] },
  { id: "kuehlen", titel: "Ausnehmen, kühlen, einfrieren", kurz: "Wie der Fang frisch nach Hause kommt.",
    schritte: [
      "Ausnehmen bald nach dem Töten: Bauch vom After Richtung Kopf aufschneiden – flach, damit der Darm nicht verletzt wird.",
      "Innereien herausziehen, Kiemen entfernen (die verderben am schnellsten).",
      "Den dunklen Blutstreifen (Niere) an der Wirbelsäule mit dem Daumennagel oder einem Löffel auskratzen.",
      "Kurz mit kaltem, sauberem Wasser ausspülen und trocken tupfen.",
      "Sofort kühlen: Kühltasche mit Kühlakkus oder Eis. Nicht in der Sonne liegen lassen, nicht in Plastiktüte im warmen Auto."
    ],
    hinweise: [
      "Im Kühlschrank (0–4 °C): ganz ausgenommen 1–2 Tage, Filets am besten am selben oder nächsten Tag.",
      "Einfrieren: magere Fische (Zander, Barsch, Hecht, Plattfisch) bis etwa 6 Monate, fette (Forelle, Meerforelle, Hering, Makrele, Aal) 2–3 Monate.",
      "Luftdicht verpacken (Vakuum oder Gefrierbeutel, Luft raus) und mit Art und Datum beschriften.",
      "Langsam im Kühlschrank auftauen, nicht bei Raumtemperatur.",
      "Innereien und Reste nicht am Ufer liegen lassen – in den Restmüll."
    ] }
];

export const ARTEN_V = [
  { id: "forelle", titel: "Forelle & Saibling", arten: "Regenbogenforelle, Lachsforelle, Bachforelle, Saibling",
    vorbereiten: ["Schuppen nicht nötig – die Haut ist fein.", "Ganz zubereiten (ausgenommen, Kiemen raus) oder filetieren: hinter den Kiemen bis zur Mittelgräte schneiden, flach entlang der Gräte zum Schwanz.", "Bauchgräten mit flachem Messer abschneiden, Stehgräten mit Pinzette ziehen."],
    rezepte: [
      { name: "Forelle Müllerin", zutaten: "Forelle ganz, Mehl, Butter, Zitrone, Petersilie, Salz", schritte: ["Innen und außen salzen, in Mehl wenden.", "In reichlich Butter bei mittlerer Hitze 5–6 Minuten je Seite braten.", "Mit Zitrone und Petersilie servieren. Gar, wenn sich die Rückenflosse leicht ziehen lässt."] },
      { name: "Forelle räuchern (Tischräucherofen)", zutaten: "Forellen ausgenommen, 1 l Wasser, 60–80 g Salz, Räuchermehl (Buche/Erle)", schritte: ["Forellen 8–12 Stunden in der Salzlake im Kühlschrank ziehen lassen.", "Abspülen, trocknen lassen, bis die Haut nicht mehr klebt (ca. 1 Stunde).", "Im Räucherofen bei 80–90 °C etwa 30–40 Minuten garen und räuchern, bis sich die Rückenflosse löst."] }
    ] },
  { id: "meerforelle", titel: "Meerforelle", arten: "Meerforelle (auch Lachs)",
    vorbereiten: ["Schuppen mit Messerrücken gegen den Strich abschaben.", "Filetieren wie Forelle, Gräten ziehen.", "Sehr frisch roh oder gebeizt ein Genuss – nur ganz frischen, gut gekühlten Fisch verwenden und vorher 24 h bei −20 °C einfrieren (Parasiten)."],
    rezepte: [
      { name: "Gebeizte Meerforelle (Gravad)", zutaten: "Filet mit Haut, je 2 EL Salz und Zucker, Dill, Pfeffer", schritte: ["Salz, Zucker und Pfeffer mischen, Filet damit einreiben, dick mit Dill belegen.", "In Folie wickeln, beschweren, 36–48 Stunden im Kühlschrank ziehen lassen, einmal wenden.", "Gewürze abstreifen, schräg in dünne Scheiben schneiden."] },
      { name: "Meerforellenfilet auf der Haut", zutaten: "Filet mit Haut, Öl, Salz, Butter", schritte: ["Haut trocken tupfen, salzen.", "In heißem Öl auf der Hautseite 4–5 Minuten kross braten, Filet dabei leicht andrücken.", "Wenden, Butter dazu, 1 Minute ziehen lassen – innen glasig ist perfekt."] }
    ] },
  { id: "zander", titel: "Zander & Barsch", arten: "Zander, Flussbarsch",
    vorbereiten: ["Zander: Schuppen mit Messerrücken abschaben oder Filet häuten.", "Barsch: Schuppen sitzen fest – am einfachsten filetieren und häuten (Filet auf Haut, Messer flach zwischen Haut und Fleisch führen).", "Filetieren entlang der Mittelgräte, Bauchgräten abschneiden. Achtung Stacheln der Rückenflosse."],
    rezepte: [
      { name: "Zanderfilet auf der Haut", zutaten: "Filet geschuppt mit Haut, Öl, Butter, Salz, Zitrone", schritte: ["Haut zwei-, dreimal leicht einschneiden, damit sie sich nicht wölbt.", "Auf der Haut in heißem Öl 4 Minuten braten, wenden, Butter dazu, 1–2 Minuten.", "Salzen, mit Zitrone. Passt zu Kartoffeln und Rahmspinat."] },
      { name: "Barschfilets in Bierteig", zutaten: "Filets gehäutet, 150 g Mehl, 200 ml Bier, 1 Ei, Salz, Öl zum Frittieren", schritte: ["Mehl, Bier, Ei und Salz zu dickem Teig rühren.", "Filets trocken tupfen, durch den Teig ziehen.", "In 170 °C heißem Öl 3–4 Minuten goldbraun backen – Fish & Chips."] }
    ] },
  { id: "hecht", titel: "Hecht", arten: "Hecht",
    vorbereiten: ["Hechtschleim mit Küchenpapier und Salz abreiben, Schuppen sind klein.", "Hecht hat Y-Gräten: Filet längs in Rücken- und Bauchstreifen teilen und die Y-Gräten als Streifen herausschneiden – oder das Fleisch fein wolfen.", "Ideal für Frikadellen, Klößchen und Fischsuppe."],
    rezepte: [
      { name: "Hechtfrikadellen", zutaten: "500 g Hechtfilet, 1 Brötchen eingeweicht, 1 Ei, 1 Zwiebel, Dill, Salz, Pfeffer, Zitrone", schritte: ["Fisch durch den Fleischwolf drehen oder sehr fein hacken – Gräten werden zerkleinert.", "Mit ausgedrücktem Brötchen, Ei, Zwiebel, Dill und Gewürzen verkneten.", "Flache Frikadellen formen, in Öl je Seite 4 Minuten braten."] },
      { name: "Hecht im Ofen", zutaten: "Hecht ganz oder in Stücken, Zwiebeln, Speck, Sahne, Zitrone", schritte: ["Hecht salzen, mit Zitrone beträufeln, auf Zwiebeln in eine Form legen.", "Mit Speckscheiben belegen, etwas Sahne angießen.", "Bei 180 °C etwa 25–35 Minuten garen (je nach Dicke)."] }
    ] },
  { id: "plattfisch", titel: "Plattfische", arten: "Flunder, Scholle, Kliesche",
    vorbereiten: ["Kopf schräg hinter den Kiemen abschneiden, dabei die Innereien mit herausziehen.", "Flossensaum mit der Schere abschneiden.", "Flunder: dunkle Haut ist rau – ganz braten oder die dunkle Seite abziehen. Scholle mit Haut braten."],
    rezepte: [
      { name: "Gebratene Flunder Finkenwerder Art", zutaten: "Flunder/Scholle ganz, Mehl, Speckwürfel, Butter, Salz, Zitrone", schritte: ["Fisch salzen, mehlieren.", "Speckwürfel auslassen, herausnehmen; Fisch im Fett mit Butter je Seite 5–6 Minuten braten.", "Mit Speck bestreuen, Zitrone dazu, Bratkartoffeln."] },
      { name: "Schollenfilet in Butter", zutaten: "Filets, Butter, Salz, Petersilie", schritte: ["Filets vom Rückgrat ablösen (zwei je Seite).", "In schäumender Butter 1–2 Minuten je Seite.", "Salzen, Petersilie darüber."] }
    ] },
  { id: "hering", titel: "Hering, Hornhecht & Makrele", arten: "Hering, Hornhecht, Makrele",
    vorbereiten: ["Hering: Schuppen abstreifen, Kopf ab, ausnehmen. Für Bratheringe ganz lassen.", "Hornhecht: Die grünen Gräten sind harmlos (Farbstoff). In Stücke schneiden, die Mittelgräte löst sich nach dem Garen leicht.", "Makrele: nur ausnehmen, Haut bleibt dran. Schnell verarbeiten – verdirbt rasch."],
    rezepte: [
      { name: "Bratheringe (eingelegt)", zutaten: "Heringe ausgenommen, Mehl, 500 ml Wasser, 250 ml Essig, 2 EL Zucker, Salz, Zwiebeln, Lorbeer, Senfkörner", schritte: ["Heringe salzen, mehlieren, in Öl knusprig braten, abkühlen lassen.", "Wasser, Essig, Zucker, Salz und Gewürze aufkochen, Zwiebelringe kurz mitkochen, abkühlen.", "Heringe in ein Glas schichten, Sud darüber – 2 Tage im Kühlschrank ziehen lassen, hält gut eine Woche."] },
      { name: "Gebratener Hornhecht", zutaten: "Hornhecht in 8-cm-Stücken, Mehl, Butter, Salz, Zitrone", schritte: ["Stücke salzen, in Mehl wenden.", "In Butter rundherum 6–8 Minuten braten.", "Mit Zitrone, dazu Kartoffelsalat. Gräte am Teller einfach herausziehen."] }
    ] },
  { id: "karpfen", titel: "Karpfen & Schleie", arten: "Karpfen, Schleie, Brassen",
    vorbereiten: ["Schuppen abschaben (Spiegelkarpfen hat wenige). Fische aus schlammigen Gewässern können muffig schmecken – Fische aus klarem Wasser verwerten und die Haut entfernen hilft.", "Grätenschnitt: Filet auf der Haut alle 3–4 mm quer bis knapp auf die Haut einschneiden – beim Braten zerfallen die feinen Gräten.", "Karpfen blau: Schleimhaut nicht verletzen, nicht schuppen."],
    rezepte: [
      { name: "Gebackener Karpfen", zutaten: "Karpfenfilet mit Grätenschnitt, Mehl, Ei, Semmelbrösel, Salz, Zitrone", schritte: ["Filet in Portionen schneiden, salzen.", "Mehl, Ei, Brösel panieren.", "In reichlich Fett je Seite 4–5 Minuten goldbraun backen."] },
      { name: "Schleie in Kräutersud", zutaten: "Schleie in Stücken, Wasser, Weißwein, Essig, Lorbeer, Pfefferkörner, Wurzelgemüse, Salz", schritte: ["Sud aus Wasser, Wein, Schuss Essig, Gemüse und Gewürzen 15 Minuten kochen.", "Fischstücke einlegen, nur ziehen lassen, nicht kochen – 10–12 Minuten.", "Mit zerlassener Butter und Salzkartoffeln."] }
    ] },
  { id: "wolfsbarsch", titel: "Wolfsbarsch", arten: "Wolfsbarsch",
    vorbereiten: ["Vorsicht: Kiemendeckel und Rückenflosse sind scharf.", "Schuppen abschaben, ausnehmen, Kiemen raus.", "Ganz zubereiten oder filetieren wie Zander."],
    rezepte: [
      { name: "Wolfsbarsch in Salzkruste", zutaten: "Wolfsbarsch ganz (nicht geschuppt nötig), 2 kg grobes Meersalz, 2 Eiweiß, Zitrone, Kräuter", schritte: ["Bauch mit Zitrone und Kräutern füllen.", "Salz mit Eiweiß und etwas Wasser mischen, Fisch auf Salzbett legen und komplett ummanteln.", "Bei 200 °C ca. 25 Minuten (für 1 kg) backen, Kruste aufschlagen, Haut abziehen."] },
      { name: "Wolfsbarschfilet mit Zitronenbutter", zutaten: "Filets, Butter, Zitrone, Kapern, Salz", schritte: ["Filets auf der Haut kross braten, 3–4 Minuten, wenden.", "Butter, Zitronensaft und Kapern in die Pfanne.", "Fisch damit übergießen, salzen."] }
    ] }
];

const zurueck = `<a class="zurueck sichtbar" href="#wissen">‹ Wissen</a>`;

export function versorgenUebersichtHTML(){
  return `<div class="w-gruppe" id="versorgen"><h3>Fisch versorgen & verwerten <span>vom Haken bis auf den Teller</span></h3>
    <div class="w-karten">${GRUNDLAGEN.map(g => `<a class="w-karte" href="#wissen/versorgen-${g.id}"><b>${esc(g.titel)}</b><span>${esc(g.kurz)}</span></a>`).join("")}
    ${ARTEN_V.map(a => `<a class="w-karte" href="#wissen/kueche-${a.id}"><b>${esc(a.titel)}</b><span>Vorbereiten + ${a.rezepte.length} Rezepte</span><small>${a.rezepte.map(r => esc(r.name)).join(" · ")}</small></a>`).join("")}</div></div>`;
}

export function versorgenDetailHTML(id){
  const g = GRUNDLAGEN.find(x => x.id === id);
  if(!g) return `<section class="wissen">${zurueck}<p class="leer">Nicht gefunden.</p></section>`;
  return `<section class="wissen vs">${zurueck}
    <p class="eyebrow">Fisch versorgen</p><h2>${esc(g.titel)}</h2>
    <p class="lead-klein">${esc(g.kurz)}</p>
    <ol class="w-schritte">${g.schritte.map(s => `<li>${esc(s)}</li>`).join("")}</ol>
    <ul class="vs-hinweise">${g.hinweise.map(h => `<li>${esc(h)}</li>`).join("")}</ul>
    <p class="hinweis-klein">Weiter: ${GRUNDLAGEN.filter(x => x.id !== id).map(x => `<a href="#wissen/versorgen-${x.id}">${esc(x.titel)} ›</a>`).join(" · ")}</p>
  </section>`;
}

export function kuecheDetailHTML(id){
  const a = ARTEN_V.find(x => x.id === id);
  if(!a) return `<section class="wissen">${zurueck}<p class="leer">Nicht gefunden.</p></section>`;
  return `<section class="wissen vs">${zurueck}
    <p class="eyebrow">Fisch verwerten</p><h2>${esc(a.titel)}</h2>
    <p class="lead-klein">${esc(a.arten)}. Erst <a href="#wissen/versorgen-toeten">waidgerecht töten</a>, dann <a href="#wissen/versorgen-kuehlen">ausnehmen und kühlen</a>.</p>
    <h3>Vorbereiten</h3>
    <ul class="vs-hinweise">${a.vorbereiten.map(v => `<li>${esc(v)}</li>`).join("")}</ul>
    ${a.rezepte.map(r => `<article class="vs-rezept"><h3>${esc(r.name)}</h3><p class="hinweis-klein">${esc(r.zutaten)}</p>
      <ol class="w-schritte">${r.schritte.map(s => `<li>${esc(s)}</li>`).join("")}</ol></article>`).join("")}
  </section>`;
}

/* Fischart → Küchen-Seite (für Links aus dem Fangbuch) */
const ZUORDNUNG = { forelle: "forelle", saibling: "forelle", meerforelle: "meerforelle", lachs: "meerforelle", zander: "zander", barsch: "zander", hecht: "hecht",
  flunder: "plattfisch", scholle: "plattfisch", hering: "hering", hornhecht: "hering", makrele: "hering", karpfen: "karpfen", schleie: "karpfen", brassen: "karpfen", wolfsbarsch: "wolfsbarsch" };
export const kuecheFuer = fischId => ZUORDNUNG[fischId] || null;
