/* ============================================================
   Angel-Setup-Berater  —  Datengrundlage
   Basiert auf deiner Inventurliste (Stand 04.07.2026)
   und deiner Setup-Erweiterung (Wunschliste).
   ============================================================ */

/* ---------- 1) DEIN AKTUELLES EQUIPMENT ---------- */
const AKTUELL = {
  setup1: {
    key: "setup1",
    name: "Setup 1 – Raubfisch (Spinnen)",
    rute: "Daiwa Prorex S Spin · 2,70 m · WG 15-50 g",
    rolle: "Freams LT4000-P",
    schnur: "J-Braid X8 Expedition 0,16 mm (geflochten) · 150 m",
    vorfach: "Fluorocarbon 0,298 mm",
    extra: "Stahlvorfach Perca (72 St.), Motor Snap Wirbel 18 kg, Easy Shiner 5\"",
    einsatz: "Aktives Spinnfischen auf Hecht, Zander, Barsch, Rapfen – auch Grund-/Posenansitz auf Raubfisch."
  },
  setup2: {
    key: "setup2",
    name: "Setup 2 – Forelle (Trout Area)",
    rute: "Daiwa Presso Imprimi ST · 2,15 m · WG 0,5-6 g",
    rolle: "Abu Garcia Cardinal X 2000",
    schnur: "J-Braid X8 Expedition 0,06 mm (geflochten)",
    vorfach: "Fluorocarbon 0,298 mm (für Forelle feiner ausziehen, s. Montage)",
    extra: "Spoon-Tasche Zite Fishing, Trout Attack Set",
    einsatz: "Ultraleichtes Spinnen mit Spoons/Mini-Ködern auf Forelle und Barsch."
  },
  setup3: {
    key: "setup3",
    name: "Setup 3 – Sbirolino (Forellensee)",
    rute: "SPRO Tactical Lake Sbiro · 3,9 m · WG 3-25 g",
    rolle: "SPRO Trout Master TT3 · Übersetzung 5:1 · 6 Kugellager · 301 g",
    schnur: "Monofil 0,25 mm · 170 m Fassung",
    vorfach: "Fluorocarbon, ca. 1,5–2,5 m",
    extra: "Sbirolinos Paladin, Posen Troutmaster Pilot, Schrotblei, Haken Gamakatsu Gr. 6, Berkley PowerBait",
    einsatz: "Weit auswerfen am Forellensee, Köder langsam absinken lassen (Sbirolino oder Pose)."
  },
  setup4: {
    key: "setup4",
    name: "Setup 4 – Stippe (Weißfisch)",
    rute: "Shimano Hyperloop 7,00 m · 7 Segmente",
    rolle: "keine Rolle nötig – Schnur fest an der Rutenspitze über Gummizug",
    schnur: "Feste Vorfachschnur 0,10–0,14 mm, am Gummizug geknotet, Länge ca. 1,5–2 m (deutlich kürzer als die 7 m Rute – zum Reinschwingen des Fischs)",
    vorfach: "optional: kleine Wirbel (Gr. 16–18) falls gewünscht",
    extra: "Posen 1–3 g, Haken Gr. 16–18, Schrotblei gemischt, Made/Wurm",
    einsatz: "Feines Stippen auf Rotauge, Schleie, Brasse an Eider, NOK, See – sehr entspannt, maximale Feinfühligkeit. Fisch landen: Rute im Bogen zu dir heranschwingen, bei wenig Platz stattdessen Segmente einschieben.",
    tippKompakt: "Bei sehr engen Spots (Bäume, schmaler Steg, dichte Ufervegetation) ist eine kurze 3–4 m Kompakt-Stippe die entspanntere Alternative zur 7-m-Rute: kein Schwingen/Einschieben nötig, die Spitze bleibt praktisch immer in Reichweite. Dafür deutlich weniger Reichweite – nur für nahes Ufer-Fischen, nicht über Schilf/Seerosen hinweg."
  },
  setup5: {
    key: "setup5",
    name: "Setup 5 – Light Game (Barsch/Döbel)",
    rute: "Savage Gear Revenge SG2 Light Game · 2,21 m · WG 5-18 g · 9 Ringe · 121 g · 2-teilig",
    rolle: "Daiwa 23 Ninja LT2500 · 4 Kugellager · Übersetzung 5,3:1 · 230 g · Frontbremse",
    schnur: "J-Braid X8 Expedition 0,10 mm (geflochten) – schließt die Lücke zwischen deiner 0,06 mm (Setup 2) und 0,16 mm (Setup 1)",
    vorfach: "Fluorocarbon 0,20–0,25 mm · ca. 60–100 cm",
    extra: "",
    einsatz: "Leichtes, aktives Spinnfischen mit kleinen Gummifischen/Spinnern/Wobblern auf Barsch, Döbel, kleinen Zander – auch gut für Hornhecht/Meerforelle zum Reinschnuppern."
  },
  setup6: {
    key: "setup6",
    name: "Setup 6 – Grund-/Feederangel (Friedfisch)",
    rute: "Crivit Multi-X Feeder 300-5 · 3,00 m Teleskoprute (HMGF-Glasfaser) · WG bis 100 g · Kork-Handteil",
    rolle: "Crivit Stationärrolle Gr. 50 · 4 Kugellager · Übersetzung 5,2:1 · Heckbremse, bereits fachgerecht bespult",
    schnur: "vorbespult ab Werk (Stärke laut Rolle) – für gezielte Ansätze ggf. auf passende Mono-/Fluorocarbon-Vorfachschnur umspulen",
    vorfach: "je nach Zielfisch, z. B. 0,16–0,20 mm für Brasse/Karpfen",
    extra: "Inkl. Tragetasche und abgestimmtem Zielfisch-Zubehör (Köderbox, Haken, Bleie) – Geschenk-Set, komplett angelfertig",
    einsatz: "Grund- und Feederangeln auf Karpfen und andere Friedfische (Brasse, Schleie, Rotauge) – ruhiger Ansitz mit Futterkorb/Grundblei an See, Kanal oder ruhigem Fluss."
  }
};

const ZUBEHOER = [
  "Kescher Shirasu Shot Net XL", "Messer Morakniv Companion S", "Fischtöter FTM Messingkopf",
  "Zange Amazon Basics 28,5 cm", "Maulspreizer NEUSID Edelstahl", "Seitenschneider KNIPEX 125 mm",
  "Handschuhe Xynovate (bissfest)", "Stahlvorfächer Perca (72 St.)", "Gerätetasche Berkley",
  "Rucksackbox Kogha Premium", "Abhakmatte Kogha Eco", "Köder-Sets Kogha Hecht / Trout Attack",
  "Spoon-Tasche Zite Fishing"
];

/* ---------- 2) WUNSCHLISTE (zukünftige Setups) ---------- */
const WUNSCH = {
  brandung: {
    key: "brandung", name: "Brandungs-/Grundangel-Setup (Küste)",
    rute: "Daiwa Windcast Surf 4,20 m, WG 100–200 g", rolle: "Shimano Ultegra 8000–12000, Weitwurfspule",
    schnur: "Geflochten 0,18–0,25 mm + mono Schlagschnur 0,40–0,50 mm (10–15 m)",
    preis: "ca. 220–330 € (gehobene Mittelklasse)",
    dazu: "Brandungsvorfächer (2–3 Haken), Krallenbleie 100–150 g, Dreibein/Rutenhalter, Wattwurm"
  },
  bolognese: {
    key: "bolognese", name: "Bolognese-/Posenrute (Stippen, Fließwasser)",
    rute: "Browning/Daiwa Bolognese 6,00–7,00 m, WG 5–25 g", rolle: "Shimano/Daiwa 2500er",
    schnur: "Monofil 0,14–0,18 mm",
    preis: "ca. 250–400 € gehoben (Einsteiger ca. 60–100 €)",
    dazu: "Posen-Sortiment 2–8 g, feine Haken Gr. 14–18, Made/Wurm"
  },
  kompaktstippe: {
    key: "kompaktstippe", name: "Kompakt-Stippe 3–4 m (enge Spots)",
    rute: "Günstige Teleskop-Kopfrute 3,00–4,00 m (z. B. Shimano/Browning Einsteigerklasse)", rolle: "keine Rolle nötig – wie Setup 4",
    schnur: "Feste Vorfachschnur 0,10–0,14 mm, am Gummizug – Montage ca. 1–1,5 m",
    preis: "ca. 25–50 € (Einsteiger-Kopfrute)",
    dazu: "Keine Extra-Kleinteile nötig – Posen/Haken/Schrotblei von Setup 4 passen 1:1",
    hinweis: "Keine neue Geräteklasse, nur eine kürzere Ergänzung zu Setup 4: für sehr enge Spots (Bäume, schmaler Steg, dichte Ufervegetation), wo Schwingen/Einschieben mit der 7-m-Rute unpraktisch ist."
  },
  pilk: {
    key: "pilk", name: "Hochsee-/Kutter-Setup (Pilken)",
    rute: "WFT Never Crack Senso Pilk 2,70 m, WG 50–160 g", rolle: "Shimano Speedmaster/Daiwa Saltist (Multi) oder 6000–8000er Stationär",
    schnur: "Geflochten 0,20–0,25 mm",
    preis: "ca. 180–300 €",
    dazu: "Pilker 60–120 g (Ostsee) / bis 200 g (Nordsee), Beifänger-Systeme, mono Vorfach 50–70 cm"
  },
  paternoster: {
    key: "paternoster", name: "Heringspaternoster (saisonal, Mole/Küste)",
    rute: "Reicht mit Setup 1 (Prorex) – kein neues Gerät zwingend nötig", rolle: "Freams LT4000 (vorhanden)",
    schnur: "vorhandene J-Braid 0,16 mm",
    preis: "nur fertiges Paternoster ca. 5–10 €",
    dazu: "Heringspaternoster (5–10 Haken), Paternosterblei 30–60 g"
  },
  ansitz: {
    key: "ansitz", name: "Ansitz-Allround (Karpfen, Aal, Quappe, Schleie)",
    rute: "Daiwa Black Widow / Balzer Matze Koch 3,60 m, 3 lb", rolle: "Shimano Baitrunner ST 6000 (Freilauf)",
    schnur: "Monofil 0,30–0,35 mm",
    preis: "ca. 170–270 € pro Rute (Doppelansitz üblich → 2×)",
    dazu: "Rod-Pod/Rutenhalter, elektr. Bissanzeiger, Boilies/Pellets/Mais/Wurm, Selbsthak-/Method-Feeder-Montage"
  },
  wels: {
    key: "wels", name: "Wels-Setup (bis ca. 1,5 m)",
    rute: "Wallerrute 2,70–3,00 m, WG 150–300 g", rolle: "Große Stationär 8000–10000 oder Multi, Bremse ≥ 15 kg",
    schnur: "Geflochten 0,40–0,45 mm + mono Schlagschnur 0,8–1 mm",
    preis: "ca. 300–500 €",
    dazu: "Große Einzelhaken/Drillinge, Köderfisch/Tauwurmbündel, robuster Kescher/Abhakmatte"
  },
  grosswels: {
    key: "grosswels", name: "Großwels-Spezialgerät (Elbe, 2 m+)",
    rute: "Spezial-Großwallerrute 2,40–2,80 m, WG 300–500 g", rolle: "Große Multi, Vollmetall, Bremse 20 kg+",
    schnur: "Geflochten 0,50–0,60 mm (Tragkraft 60 kg+)",
    preis: "ca. 600–1000 € + Boot/Guide",
    dazu: "⚠️ Eigene Geräteklasse – nur mit Erfahrung & Sicherung (Boot, Abspann/Boje, Guide)"
  }
};

/* ---------- 3) GEWÄSSER ---------- */
const GEWAESSER = {
  eider:       { key:"eider",       name:"Eider",              typ:"Fluss / Brackwasser", hinweis:"Leichte bis mittlere Strömung, Brackwasser-Einfluss. (In deiner Notiz auch \"Ida\".)" },
  nok:         { key:"nok",         name:"Nord-Ostsee-Kanal",  typ:"Kanal",               hinweis:"Ruhiger, tiefer Kanal – gute Kanten & Uferstrukturen." },
  elbe:        { key:"elbe",        name:"Elbe",               typ:"Großer Strom",        hinweis:"Starke Strömung, Buhnen, Tidenhub – schwerere Gewichte nötig." },
  see:         { key:"see",         name:"See / Teich",        typ:"Stillwasser",         hinweis:"Keine Strömung – leichte Gewichte reichen." },
  forellensee: { key:"forellensee", name:"Forellensee (Put & Take)", typ:"Stillwasser",   hinweis:"Besatzforellen, oft klares Wasser." },
  ostsee:      { key:"ostsee",      name:"Ostsee (Küste)",     typ:"Brandung / Mole",     hinweis:"Salzwasser – salzwasserfestes Gerät, Wurfweite zählt." },
  nordsee:     { key:"nordsee",     name:"Nordsee (Küste)",    typ:"Brandung",            hinweis:"Mehr Wellen/Strömung – schwerere Bleie." },
  kutter:      { key:"kutter",      name:"Kutter / Hochsee",   typ:"Boot",                hinweis:"Senkrecht angeln (Pilken) statt werfen." }
};

/* ---------- 4) FISCHE + ANSÄTZE ----------
   status:  "machbar" (✅ mit aktuellem Setup)
            "bedingt" (🟡 geht mit vorhandenem Gerät, ideal wäre Wunschliste)
            "wunsch"  (❌ braucht Wunschliste-Setup)
   setup:   Schlüssel aus AKTUELL (setup1..3)
   braucht: Schlüssel aus WUNSCH (bei "bedingt"/"wunsch")
   montage: geordnete Kette der Montage (Komponente → Detail, mit Gewichten)
------------------------------------------------------------ */
const FISCHE = [
  {
    id:"zander", name:"Zander", typ:"Raubfisch", emoji:"🎣",
    gewaesser:["eider","nok","elbe","see"],
    info:"Scheuer Dämmerungsjäger. Steht an Kanten, Löchern, Buhnen und harten Strukturen. Feiner Biss – oft nur ein Zupfen.",
    ansaetze:[
      {
        methode:"Spinnfischen – Gummifisch am Jigkopf (Faulenzen)", status:"machbar", setup:"setup1",
        gewaesser:["eider","nok","elbe","see"],
        montage:[
          {k:"Hauptschnur", v:"J-Braid X8 0,16 mm (geflochten)"},
          {k:"Vorfach", v:"Fluorocarbon 0,26–0,30 mm · ca. 80–100 cm (FG-Knoten)"},
          {k:"Jigkopf", v:"See/NOK 7–12 g · Eider (Strömung) 12–16 g · Elbe 16–25 g"},
          {k:"Köder", v:"schlanker Gummifisch 10–13 cm (z. B. Easy Shiner 5\")"}
        ],
        tipp:"Faulenzen: 1–2 Kurbelumdrehungen, absinken lassen, Kontakt halten. Biss kommt meist beim Absinken – sofort anschlagen."
      },
      {
        methode:"Ansitz – Köderfisch am Grund (Dämmerung/Nacht)", status:"bedingt", setup:"setup1", braucht:"ansitz",
        gewaesser:["eider","nok","elbe","see"],
        montage:[
          {k:"Hauptschnur", v:"J-Braid 0,16 mm"},
          {k:"Laufblei", v:"See 20–30 g · Strömung (Eider/Elbe) 40–60 g"},
          {k:"Wirbel", v:"Motor Snap 18 kg (Prellperle davor)"},
          {k:"Vorfach", v:"Fluorocarbon 0,30–0,35 mm · 60–80 cm"},
          {k:"Haken", v:"Einzelhaken Gr. 1–1/0 · toter Köderfisch 8–12 cm"}
        ],
        tipp:"Geht mit Setup 1, aber ohne Freilaufrolle/Bissanzeiger ungemütlich. Für echte Nachtansitze lohnt das Ansitz-Setup."
      }
    ]
  },
  {
    id:"hecht", name:"Hecht", typ:"Raubfisch", emoji:"🐊",
    gewaesser:["eider","nok","elbe","see"],
    info:"Aggressiver Räuber im Hinterhalt an Kraut, Seerosen, Totholz und Kanten. Stahlvorfach Pflicht!",
    ansaetze:[
      {
        methode:"Spinnfischen – Gummifisch/Wobbler", status:"machbar", setup:"setup1",
        gewaesser:["eider","nok","elbe","see"],
        montage:[
          {k:"Hauptschnur", v:"J-Braid X8 0,16 mm"},
          {k:"Stahlvorfach", v:"Perca 30–40 cm (zwingend – scharfe Zähne!)"},
          {k:"Jigkopf/Köder", v:"Gummifisch 12–15 cm am Jigkopf 10–20 g · oder Wobbler 10–14 cm"}
        ],
        tipp:"Führung variieren (Stopps, Tempowechsel). Attacken kommen oft direkt beim Wiederanlaufen."
      },
      {
        methode:"Ansitz – Köderfisch unter Pose", status:"machbar", setup:"setup1",
        gewaesser:["eider","nok","see"],
        montage:[
          {k:"Hauptschnur", v:"J-Braid 0,16 mm"},
          {k:"Pose", v:"Laufpose 15–30 g (Tragkraft an Köderfischgröße anpassen)"},
          {k:"Stahlvorfach", v:"Perca 30–40 cm"},
          {k:"Haken", v:"Drilling/Einzel Gr. 1/0 · Köderfisch 10–15 cm"}
        ],
        tipp:"Auftrieb so wählen, dass der Köderfisch die Pose nicht selbst versenkt. Beim Biss kurz Zeit geben, dann anschlagen."
      }
    ]
  },
  {
    id:"barsch", name:"Flussbarsch", typ:"Raubfisch", emoji:"🐟",
    gewaesser:["eider","nok","elbe","see"],
    info:"Geselliger Schwarmräuber – ideal für aktives Leichtangeln. Findest du einen, sind meist mehr da.",
    ansaetze:[
      {
        methode:"Dropshot / UL-Spinnen", status:"machbar", setup:"setup2",
        gewaesser:["eider","nok","elbe","see"],
        montage:[
          {k:"Hauptschnur", v:"J-Braid 0,06 mm"},
          {k:"Vorfach", v:"Fluorocarbon 0,18–0,22 mm · ca. 1 m"},
          {k:"Dropshot-Blei", v:"See 3–6 g · Strömung 7–12 g (unten angeknotet)"},
          {k:"Haken", v:"Dropshot-Haken Gr. 6–4 · Gummiköder 5–8 cm"}
        ],
        tipp:"Setup 2 (Presso) ist perfekt fein dafür. Köder auf der Stelle zittern lassen – Barsch mag das Reizen."
      },
      {
        methode:"Spinnfischen – kleiner Gummifisch/Spinner", status:"machbar", setup:"setup1",
        gewaesser:["eider","nok","elbe","see"],
        montage:[
          {k:"Hauptschnur", v:"J-Braid 0,16 mm"},
          {k:"Vorfach", v:"Fluorocarbon 0,22–0,26 mm · 60–80 cm"},
          {k:"Köder", v:"Gummifisch 7–10 cm am Jigkopf 5–12 g · oder Spinner Gr. 2–3"}
        ],
        tipp:"Für große Barsche (>35 cm) die kräftigere Setup 1 nehmen – da ist oft auch der Zander nicht weit."
      },
      {
        methode:"Light Game – kleiner Gummifisch/Spinner (aktiv)", status:"machbar", setup:"setup5",
        gewaesser:["eider","nok","elbe","see"],
        montage:[
          {k:"Hauptschnur", v:"J-Braid X8 0,10 mm"},
          {k:"Vorfach", v:"Fluorocarbon 0,20–0,25 mm · 60–100 cm"},
          {k:"Köder", v:"Mini-Gummifisch 5–8 cm am Jigkopf 3–10 g · oder kleiner Spinner"}
        ],
        tipp:"Genau der Einsatzzweck von Setup 5 – aktiv laufen, an Kanten und Strukturen jiggen, viele Fühlungskontakte spüren."
      }
    ]
  },
  {
    id:"forelle", name:"Forelle (Regenbogen/Bach)", typ:"Raubfisch", emoji:"🐠",
    gewaesser:["forellensee","eider","see"],
    info:"Sauerstoff- und strömungsliebend. Am Forellensee nach Besatz und bei bedecktem Himmel top.",
    ansaetze:[
      {
        methode:"Trout Area – Spoons", status:"machbar", setup:"setup2",
        gewaesser:["forellensee","see"],
        montage:[
          {k:"Hauptschnur", v:"J-Braid 0,06 mm"},
          {k:"Vorfach", v:"Fluorocarbon 0,16–0,20 mm · ca. 1–1,5 m"},
          {k:"Köder", v:"Spoon 1,5–4 g (aus deiner Zite Spoon-Tasche)"}
        ],
        tipp:"Farben & Einholtempo durchprobieren, bis eine Kombi läuft. Langsam und gleichmäßig führen."
      },
      {
        methode:"Sbirolino / Pose (Forellensee)", status:"machbar", setup:"setup3",
        gewaesser:["forellensee","see"],
        montage:[
          {k:"Hauptschnur", v:"Monofil 0,25 mm"},
          {k:"Sbirolino", v:"schwimmend/langsam sinkend 10–25 g (Paladin)"},
          {k:"Perle + Wirbel", v:"Prellperle, dann Wirbel"},
          {k:"Vorfach", v:"Fluorocarbon 1,5–2,5 m"},
          {k:"Haken", v:"Gamakatsu Gr. 6 · Berkley PowerBait (auftreibend)"}
        ],
        tipp:"PowerBait so viel, dass der Köder knapp über Grund schwebt. Nach dem Wurf absinken lassen, dann langsam einholen."
      }
    ]
  },
  {
    id:"rapfen", name:"Rapfen", typ:"Raubfisch", emoji:"🐡",
    gewaesser:["eider","nok","elbe"],
    info:"„Süßwasser-Barrakuda\" – jagt Kleinfisch laut an der Oberfläche (Rapfenschlag) an Strömungskanten & Buhnen.",
    ansaetze:[
      {
        methode:"Spinnfischen – weite Würfe, schnelle Führung", status:"machbar", setup:"setup1",
        gewaesser:["eider","nok","elbe"],
        montage:[
          {k:"Hauptschnur", v:"J-Braid 0,16 mm (dünn = Wurfweite)"},
          {k:"Vorfach", v:"Fluorocarbon 0,28–0,30 mm · 80–100 cm"},
          {k:"Köder", v:"Casting-Jig / schlanker Blinker 15–28 g · oder Oberflächen-Wobbler"}
        ],
        tipp:"Köder mitten in die Jagd werfen und zügig knapp unter der Oberfläche führen – imitiert flüchtenden Beutefisch."
      }
    ]
  },
  {
    id:"doebel", name:"Döbel", typ:"Friedfisch (Allesfresser)", emoji:"🐟",
    gewaesser:["eider","nok","elbe"],
    info:"Vorsichtiger Allesfresser der Fließgewässer, oft knapp unter der Oberfläche. Sehr scheu.",
    ansaetze:[
      {
        methode:"Leichtes Spinnen auf große Döbel", status:"bedingt", setup:"setup2", braucht:"bolognese",
        gewaesser:["eider","nok","elbe"],
        montage:[
          {k:"Hauptschnur", v:"J-Braid 0,06 mm"},
          {k:"Vorfach", v:"Fluorocarbon 0,20–0,24 mm · 1 m"},
          {k:"Köder", v:"kleiner Spinner Gr. 1–2 · Mini-Wobbler 3–5 cm"}
        ],
        tipp:"Räuberische Döbel gehen aufs Spinnen. Zum gezielten Ansitz mit Brot/Käse ist aber eine Bolognese (Wunschliste) die richtige Wahl."
      }
    ]
  },
  {
    id:"aal", name:"Aal", typ:"Raubfisch", emoji:"🐍",
    gewaesser:["eider","nok","elbe","see"],
    info:"Nachtaktiver Schlängler mit feiner Nase. Warme Sommernächte, besonders bei Gewitterstimmung.",
    ansaetze:[
      {
        methode:"Grundangeln – Tauwurm (Nachtansitz)", status:"bedingt", setup:"setup1", braucht:"ansitz",
        gewaesser:["eider","nok","elbe","see"],
        montage:[
          {k:"Hauptschnur", v:"J-Braid 0,16 mm"},
          {k:"Laufblei", v:"See 15–25 g · Strömung 30–50 g"},
          {k:"Wirbel", v:"Motor Snap 18 kg"},
          {k:"Vorfach", v:"Mono/FC 0,30 mm · 40–60 cm"},
          {k:"Haken", v:"Aalhaken (langer Schenkel) Gr. 4–1 · Tauwurm"}
        ],
        tipp:"Geht mit Setup 1 + Glöckchen/Bissanzeiger. Für regelmäßige Nachtansitze ist eine Freilaufrolle (Ansitz-Setup) deutlich komfortabler."
      }
    ]
  },
  {
    id:"quappe", name:"Quappe (Rutte)", typ:"Raubfisch", emoji:"🐟",
    gewaesser:["elbe","eider"],
    info:"Einziger heimischer Dorschartiger im Süßwasser – winteraktiv, geht in kalten Nächten am Grund auf Nahrungssuche.",
    ansaetze:[
      {
        methode:"Grundangeln – Fisch-/Wurmköder (Winternacht)", status:"bedingt", setup:"setup1", braucht:"ansitz",
        gewaesser:["elbe","eider"],
        montage:[
          {k:"Hauptschnur", v:"J-Braid 0,16 mm"},
          {k:"Laufblei", v:"30–60 g (Strömung halten)"},
          {k:"Vorfach", v:"Mono 0,30 mm · 40 cm"},
          {k:"Haken", v:"Gr. 1–1/0 · Tauwurmbündel oder Fischfetzen"}
        ],
        tipp:"Kalte, dunkle Nächte (Nov–Feb) sind die Zeit. Köder direkt am Grund anbieten. Machbar mit Setup 1, Ansitz-Setup ist komfortabler."
      }
    ]
  },
  {
    id:"karpfen", name:"Karpfen", typ:"Friedfisch", emoji:"🎏",
    gewaesser:["see","nok","eider"],
    info:"Kräftiger Kämpfer, der Anfüttern und Geduld belohnt. Braucht kräftiges Ansitzgerät + Selbsthakmontage.",
    ansaetze:[
      {
        methode:"Grund-/Feederangeln – Futterkorb mit Boilie/Mais", status:"machbar", setup:"setup6",
        gewaesser:["see","nok","eider"],
        montage:[
          {k:"Hauptschnur", v:"vorbespult (Setup 6) bzw. Monofil 0,25–0,30 mm"},
          {k:"Futterkorb/Grundblei", v:"30–80 g je nach Wurfweite und Strömung"},
          {k:"Vorfach", v:"Boiliehaar oder Haarmontage 10–15 cm"},
          {k:"Haken", v:"Karpfenhaken Gr. 6–2 · Boilie/Mais am Haar"}
        ],
        tipp:"Genau der Einsatzzweck von Setup 6 (Crivit Feeder-Set). Ruhiger Ansitz, Futterkorb regelmäßig nachfüttern, Rutenspitze auf feine Bisse beobachten."
      }
    ]
  },
  {
    id:"schleie", name:"Schleie", typ:"Friedfisch", emoji:"🐟",
    gewaesser:["see","nok"],
    info:"Heimlicher Schlammbewohner mit vorsichtigem Biss. Aufsteigende Blasen verraten fressende Schleien.",
    ansaetze:[
      {
        methode:"Stippen an der Krautkante", status:"machbar", setup:"setup4",
        gewaesser:["see","nok"],
        montage:[
          {k:"Feste Vorfachschnur", v:"0,10–0,14 mm, am Gummizug, Länge ca. 1,5–2 m (kürzer als die Rute – zum Reinschwingen)"},
          {k:"Pose", v:"feine Stipp-Pose 1–3 g"},
          {k:"Schrotblei", v:"aufgeteilt, fein ausgebleit"},
          {k:"Haken", v:"Gr. 8–12 · Wurm/Mais/Made"}
        ],
        tipp:"Genau der Einsatzzweck von Setup 4 (Stippe) – maximale Feinfühligkeit direkt an der Krautkante, aufsteigende Blasen verraten die Fressstelle. Fisch landen: Rute in einem Bogen zu dir heranschwingen (nicht senkrecht hochziehen!), dabei kommt die Spitze samt Montage in deine Reichweite. Wenig Platz zum Schwingen (Bäume/Steg)? Dann die Segmente einschieben, bis die Spitze erreichbar ist."
      }
    ]
  },
  {
    id:"rotauge", name:"Rotauge / Weißfisch", typ:"Friedfisch", emoji:"🐟",
    gewaesser:["eider","nok","see","elbe"],
    info:"Häufigster Schwarmfisch, ganzjährig fangbar – der klassische Posenfisch (auch Rotfeder, Brasse, Aland).",
    ansaetze:[
      {
        methode:"Stippen (Posenangeln)", status:"machbar", setup:"setup4",
        gewaesser:["eider","nok","see","elbe"],
        montage:[
          {k:"Feste Vorfachschnur", v:"0,10–0,14 mm, am Gummizug, Länge ca. 1,5–2 m (kürzer als die Rute – zum Reinschwingen)"},
          {k:"Pose", v:"1–3 g je nach Strömung"},
          {k:"Schrotblei", v:"fein ausgebleit, ein Fühlerblei am Grund"},
          {k:"Haken", v:"Gr. 14–18 · Made/Mais/Teig"}
        ],
        tipp:"Klassischer Fall für Setup 4 (Stippe) – entspanntes Posenangeln mit maximaler Feinfühligkeit. Fisch landen: Rute in einem Bogen zu dir heranschwingen (nicht senkrecht hochziehen!), dabei kommt die Spitze samt Montage in deine Reichweite. Wenig Platz zum Schwingen? Dann die Segmente einschieben, bis die Spitze erreichbar ist."
      },
      {
        methode:"Grund-/Feederangeln (weitere Distanz)", status:"machbar", setup:"setup6",
        gewaesser:["eider","nok","see","elbe"],
        montage:[
          {k:"Hauptschnur", v:"vorbespult (Setup 6) bzw. Monofil 0,16–0,20 mm"},
          {k:"Futterkorb/Grundblei", v:"20–40 g"},
          {k:"Vorfach", v:"0,14–0,16 mm · ca. 40–60 cm"},
          {k:"Haken", v:"Gr. 14–18 · Made/Mais/Teig"}
        ],
        tipp:"Wenn's weiter raus oder mit Futterkorb gehen soll statt Stippe – Setup 6 deckt größere Distanzen ab."
      }
    ]
  },
  {
    id:"wels", name:"Wels (Waller)", typ:"Raubfisch", emoji:"🐋",
    gewaesser:["elbe","nok","see"],
    info:"Europas größter Süßwasserfisch. Kräftiges Spezialgerät zwingend – Sicherheit geht vor.",
    ansaetze:[
      {
        methode:"Ansitz – Köderfisch/Tauwurmbündel", status:"wunsch", braucht:"wels",
        gewaesser:["nok","see"],
        montage:[
          {k:"Hauptschnur", v:"Geflochten 0,40–0,45 mm"},
          {k:"Schlagschnur", v:"Monofil 0,8–1 mm"},
          {k:"Blei/Unterwasserpose", v:"nach Methode, 60–150 g"},
          {k:"Haken", v:"großer Einzelhaken/Drilling · Köderfisch od. Tauwurmbündel"}
        ],
        tipp:"Mit deinem aktuellen Gerät nicht machbar. Dafür das Wels-Setup. Großwels in der Elbe (2 m+) ist nochmal eine eigene Liga (Spezialgerät + Boot/Guide)."
      }
    ]
  },
  {
    id:"dorsch", name:"Dorsch", typ:"Meeresfisch", emoji:"🐟",
    gewaesser:["kutter","ostsee"],
    info:"Klassischer Kutterfisch der Ostsee. Senkrecht gepilkt vom Boot – oder von der Küste in der kalten Jahreszeit.",
    ansaetze:[
      {
        methode:"Pilken vom Kutter", status:"wunsch", braucht:"pilk",
        gewaesser:["kutter"],
        montage:[
          {k:"Hauptschnur", v:"Geflochten 0,20–0,25 mm"},
          {k:"Pilker", v:"Ostsee 60–120 g · Nordsee bis 200 g"},
          {k:"Beifänger", v:"1–2 Twister (rot/schwarz) über dem Pilker"},
          {k:"Vorfach", v:"Monofil 50–70 cm"}
        ],
        tipp:"Braucht die kompakte Pilkrute (Wunschliste) – senkrecht ablassen/anheben. Deine langen Spinn-/Sbiro-Ruten passen dafür nicht."
      }
    ]
  },
  {
    id:"hering", name:"Hering / Makrele", typ:"Meeresfisch", emoji:"🐟",
    gewaesser:["ostsee","nok","kutter"],
    info:"Saisonaler Schwarmfisch – im Frühjahr/Herbst von Molen und Häfen mit Mehrhaken-Paternoster.",
    ansaetze:[
      {
        methode:"Heringspaternoster von der Mole", status:"bedingt", setup:"setup1", braucht:"paternoster",
        gewaesser:["ostsee","nok"],
        montage:[
          {k:"Hauptschnur", v:"J-Braid 0,16 mm (vorhanden)"},
          {k:"Paternoster", v:"fertiges System mit 5–7 Haken (Lametta)"},
          {k:"Abschlussblei", v:"30–60 g je nach Wurfweite/Strömung"}
        ],
        tipp:"Genau hier reicht dein Setup 1 (Prorex + Freams) laut deiner eigenen Liste völlig aus – nur ein fertiges Paternoster (5–10 €) dazu."
      }
    ]
  },
  {
    id:"wolfsbarsch", name:"Wolfsbarsch", typ:"Meeresfisch", emoji:"🐟",
    gewaesser:["ostsee","nordsee","eider"],
    info:"Kämpferischer Küstenräuber – wird an Molen, Stränden und Brackwasser aktiv beangelt.",
    ansaetze:[
      {
        methode:"Spinnfischen an der Küste", status:"bedingt", setup:"setup1", braucht:"brandung",
        gewaesser:["ostsee","nordsee","eider"],
        montage:[
          {k:"Hauptschnur", v:"J-Braid 0,16 mm (nach Salzwasser gut spülen!)"},
          {k:"Vorfach", v:"Fluorocarbon 0,30–0,35 mm · 1 m"},
          {k:"Köder", v:"Gummifisch/Wobbler/Blinker 10–20 g"}
        ],
        tipp:"Aktiv gespinnt geht der Wolfsbarsch mit Setup 1. Fürs klassische Grundangeln an der Brandung brauchst du das Brandungs-Setup.",
        gezeiten:"An der Nordsee/Eider (echter Tidenhub): am produktivsten ca. 1–2 h vor bis nach Niedrigwasser – die Strömung konzentriert Kleinfisch, den der Wolfsbarsch jagt. An der Ostsee sind Gezeiten minimal (~20 cm) – hier zählt Wind/Wellengang mehr als die Tide."
      }
    ]
  },
  {
    id:"flunder", name:"Flunder / Scholle", typ:"Meeresfisch", emoji:"🐟",
    gewaesser:["ostsee","nordsee","eider"],
    info:"Plattfische am sandigen Grund – klassisch mit Wattwurm an der Brandung (Ost- & Nordsee).",
    ansaetze:[
      {
        methode:"Brandungsangeln – Grundmontage mit Wattwurm", status:"wunsch", braucht:"brandung",
        gewaesser:["ostsee","nordsee","eider"],
        montage:[
          {k:"Hauptschnur", v:"Geflochten 0,18–0,25 mm + mono Schlagschnur 0,40–0,50 mm"},
          {k:"Krallenblei", v:"Ostsee 100–150 g · Nordsee 150–200 g (hält im Sand/Strömung)"},
          {k:"Vorfach", v:"Brandungsvorfach mit 2–3 Haken (Perlen/Auftrieb)"},
          {k:"Haken", v:"Gr. 2–1/0 · Watt-/Seeringelwurm"}
        ],
        tipp:"Braucht die lange Brandungsrute + Weitwurfrolle (Wunschliste). Deine Süßwasser-Setups reichen für Wurfweite & Salzwasser nicht.",
        gezeiten:"Nordsee/Wattenmeer: klassisch mit der auflaufenden Flut werfen – Plattfische ziehen dann mit dem Wasser Richtung Ufer/Watt zum Fressen. Ostsee: kaum Tideneinfluss, hier zählt eher Wetter/Wind als die Gezeiten."
      }
    ]
  },
  {
    id:"meerforelle", name:"Meerforelle", typ:"Meeresfisch", emoji:"🐟",
    gewaesser:["ostsee","eider"],
    info:"Der Küsten-Klassiker in SH. Silberblanke Kämpferin – vom Ufer der Ostsee und im Brackwasser der Eider blank gefischt. Frühjahr & Herbst top.",
    ansaetze:[
      {
        methode:"Küstenspinnen – Blinker/Küstenwobbler", status:"bedingt", setup:"setup1", braucht:"kuestenspinn",
        gewaesser:["ostsee","eider"],
        montage:[
          {k:"Hauptschnur", v:"J-Braid 0,16 mm (nach Salzwasser gründlich spülen!)"},
          {k:"Vorfach", v:"Fluorocarbon 0,28–0,35 mm · ca. 1–1,5 m"},
          {k:"Köder", v:"Küstenblinker/-wobbler 12–28 g (weit werfen)"}
        ],
        tipp:"Zum Reinschnuppern geht Setup 1 – aber 2,70 m sind kurz und die Rolle nicht salzwasserfest. Fürs ernsthafte Küstenspinnen ist die Küstenrute (Empfehlung) der richtige Weg. Wurfweite & Wathose sind hier Gold wert.",
        gezeiten:"Ostsee: kaum Tideneinfluss (~20 cm) – wichtiger ist bewegtes Wasser durch Wind/Strömung. Eider (Brackwasser): hier gibt's echten Tidenhub – am besten 2 h vor bis 2 h nach Niedrigwasser, wenn die Forellen in der ablaufenden Strömung jagen."
      }
    ]
  },
  {
    id:"hornhecht", name:"Hornhecht", typ:"Meeresfisch", emoji:"🐟",
    gewaesser:["ostsee"],
    info:"Kommt im Frühjahr (etwa Mai) in Schwärmen an die Ostseeküste. Spaßiger, grätiger Fisch – ideal, um Küstenspinnen zu lernen.",
    ansaetze:[
      {
        methode:"Küstenspinnen – kleiner Blinker (mit Wollfaden)", status:"bedingt", setup:"setup1", braucht:"kuestenspinn",
        gewaesser:["ostsee"],
        montage:[
          {k:"Hauptschnur", v:"J-Braid 0,16 mm (Salzwasser abspülen)"},
          {k:"Vorfach", v:"Fluorocarbon 0,28 mm · 1 m"},
          {k:"Köder", v:"kleiner Blinker 10–20 g, oft mit rotem Wollfaden dahinter"}
        ],
        tipp:"Der schmale Knochenschnabel hakt schlecht – ein Stück rote Wolle hinter dem Blinker verfängt sich in den Zähnen und erhöht die Hakquote. Perfekter Übungsfisch.",
        gezeiten:"Kaum Tideneinfluss an der Ostsee – wichtiger als die Gezeiten ist die Schwarmpräsenz im Frühjahr (Mai), oft tagsüber bei ruhigem, klarem Wasser."
      }
    ]
  }
];

/* ---------- 5) KNOTENKUNDE ----------
   Für Einsteiger: so wenige Knoten wie möglich, so sicher wie nötig.
   Mit diesen 4 Knoten deckst du ALLE deine aktuellen Setups ab.
------------------------------------------------------------ */
const KNOTEN_REGELN = [
  { icon:"💧", titel:"Immer anfeuchten", text:"Vor dem Zuziehen den Knoten mit Speichel oder Wasser befeuchten. Trocken zugezogen wird die Schnur heiß und verliert bis zu 50 % Tragkraft." },
  { icon:"🐢", titel:"Langsam zuziehen", text:"Gleichmäßig und ohne Ruck festziehen – an beiden Enden gleichzeitig, damit sich der Knoten sauber legt." },
  { icon:"✂️", titel:"Enden richtig kürzen", text:"Überstand nicht bündig an der Kante abschneiden – 1–2 mm stehen lassen, sonst kann der Knoten aufrutschen." },
  { icon:"🏠", titel:"Trocken üben", text:"Übe jeden Knoten erst zu Hause mit dickerer Schnur, bis er sitzt. Am Wasser mit kalten Fingern ist es schwerer." }
];

const KNOTEN = [
  {
    id:"palomar", name:"Palomar-Knoten", niveau:"Anfänger", sterne:1,
    wofuer:"Schnur an ein Öhr binden: Wirbel, Snap/Karabiner, Haken, Jigkopf. DEIN Standardknoten für die geflochtene J-Braid (Setup 1 & 2).",
    warum:"Der stärkste wirklich einfache Knoten – perfekt für Geflecht, kaum Kraftverlust, schwer falsch zu machen.",
    schritte:[
      "Lege die Schnur zu einer Schlaufe und stecke die DOPPELTE Schnur durch das Öhr (bei sehr kleinen Öhren ggf. zweimal durchführen).",
      "Mache mit der doppelten Schnur einen einfachen Überhandknoten (locker lassen) – Haken/Wirbel hängt in der unteren Schlaufe.",
      "Führe die Schlaufe komplett über den Haken/Wirbel herum.",
      "Anfeuchten, an Hauptschnur und Ende gleichmäßig festziehen. Überstand auf ~2 mm kürzen."
    ],
    sicher:"Sehr sicher, wenn die Schlaufe sauber über den Köder gestülpt wird und du vor dem Zuziehen anfeuchtest.",
    svg:`<svg viewBox="0 0 300 120" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Palomar-Knoten Schema">
      <ellipse cx="238" cy="60" rx="14" ry="20" fill="none" stroke="#9db6c4" stroke-width="3"/>
      <path d="M20 46 C120 46 190 46 224 54" fill="none" stroke="#33c3a6" stroke-width="3"/>
      <path d="M20 74 C120 74 190 74 224 66" fill="none" stroke="#33c3a6" stroke-width="3"/>
      <path d="M252 60 C275 40 275 80 252 60" fill="none" stroke="#33c3a6" stroke-width="3"/>
      <circle cx="90" cy="60" r="15" fill="none" stroke="#eaf3f7" stroke-width="3"/>
      <text x="60" y="105" fill="#9db6c4" font-size="11" font-family="sans-serif">doppelte Schnur → Überhandknoten → Schlaufe über den Haken</text>
    </svg>`
  },
  {
    id:"clinch", name:"Verbesserter Clinch-Knoten", niveau:"Anfänger", sterne:1,
    wofuer:"Schnur an ein Öhr binden – ideal für monofile & Fluorocarbon-Schnur (deine Vorfächer und Setup 3).",
    warum:"Der Klassiker für Mono/FC. „Verbessert“ heißt: das Ende läuft am Schluss noch durch die große Schlaufe – das macht ihn rutschfest.",
    schritte:[
      "Schnur durch das Öhr stecken, ca. 15 cm Ende überstehen lassen.",
      "Das Ende 5–7× um die Hauptschnur wickeln (bei dünner Schnur eher 7×).",
      "Das Ende zurück durch die erste kleine Schlaufe direkt am Öhr führen.",
      "Dann das Ende zusätzlich durch die große Schlaufe führen, die dabei entstanden ist (= „verbessert“).",
      "Anfeuchten, langsam an der Hauptschnur ziehen, bis sich die Wicklungen sauber legen. Kürzen."
    ],
    sicher:"Für geflochtene Schnur NICHT ideal (kann rutschen) – dafür lieber den Palomar. Für Mono/FC top.",
    svg:`<svg viewBox="0 0 300 120" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Clinch-Knoten Schema">
      <ellipse cx="60" cy="60" rx="13" ry="18" fill="none" stroke="#9db6c4" stroke-width="3"/>
      <path d="M280 60 C200 60 150 60 90 60" fill="none" stroke="#33c3a6" stroke-width="3"/>
      <g stroke="#33c3a6" stroke-width="3" fill="none">
        <path d="M95 60 q10 -14 20 0 q10 -14 20 0 q10 -14 20 0 q10 -14 20 0 q10 -14 20 0"/>
      </g>
      <path d="M95 66 C120 80 180 80 210 66" fill="none" stroke="#eaf3f7" stroke-width="2.5" stroke-dasharray="4 3"/>
      <text x="40" y="105" fill="#9db6c4" font-size="11" font-family="sans-serif">durchs Öhr → 5–7× wickeln → zurück durch beide Schlaufen</text>
    </svg>`
  },
  {
    id:"grinner", name:"Doppelter Grinner (Uni-to-Uni)", niveau:"Etwas Übung", sterne:2,
    wofuer:"Schnur an Schnur: Hauptschnur direkt mit dem Vorfach verbinden, wenn du KEINEN Wirbel dazwischen setzt.",
    warum:"Zuverlässige Schnur-an-Schnur-Verbindung, die sich noch gut merken lässt. (Tipp: Am einfachsten ist es, stattdessen einen Wirbel/Snap zu benutzen – dann brauchst du diesen Knoten gar nicht.)",
    schritte:[
      "Beide Schnüre ca. 15 cm überlappen lassen (parallel nebeneinander).",
      "Mit dem Ende der ersten Schnur eine Schlaufe legen und 4–5× um beide Schnüre wickeln, dann durch die Schlaufe – zuziehen. Das ist EIN Grinner.",
      "Jetzt dasselbe mit dem Ende der zweiten Schnur in die andere Richtung – zweiter Grinner.",
      "Beide Knoten anfeuchten, dann an den beiden Hauptschnüren ziehen, bis die zwei Knoten zusammenrutschen.",
      "Enden kurz abschneiden."
    ],
    sicher:"Sicher, wenn beide Grinner gleich viele Wicklungen haben und du sie fest zusammenziehst. Für dickere Sprünge (0,06 an 0,30) lieber den Wirbel nehmen.",
    svg:`<svg viewBox="0 0 300 120" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Doppelter Grinner Schema">
      <path d="M10 60 H150" stroke="#33c3a6" stroke-width="3" fill="none"/>
      <path d="M290 60 H150" stroke="#2aa0d8" stroke-width="3" fill="none"/>
      <g fill="none" stroke-width="3">
        <rect x="95" y="46" width="34" height="28" rx="8" stroke="#33c3a6"/>
        <rect x="171" y="46" width="34" height="28" rx="8" stroke="#2aa0d8"/>
      </g>
      <text x="55" y="105" fill="#9db6c4" font-size="11" font-family="sans-serif">2 Grinner-Knoten, die zusammengezogen werden</text>
    </svg>`
  },
  {
    id:"rapala", name:"Rapala-Schlaufenknoten", niveau:"Etwas Übung", sterne:2,
    wofuer:"Wobbler & harte Kunstköder direkt anbinden – die feste Schlaufe lässt den Köder frei „spielen“ (mehr Aktion).",
    warum:"Wenn du Wobbler ohne Snap direkt anknotest, würde ein fester Knoten die Bewegung dämpfen. Die Schlaufe hält Abstand und der Köder läuft lebendiger.",
    schritte:[
      "Mache einen einfachen Überhandknoten in die Schnur (offen lassen), ca. 12 cm vom Ende.",
      "Das Ende durch das Köder-Öhr und zurück durch den offenen Überhandknoten fädeln.",
      "Das Ende 3× um die Hauptschnur wickeln.",
      "Das Ende zurück durch den Überhandknoten führen und dann durch die dabei entstandene große Schlaufe.",
      "Anfeuchten, vorsichtig zuziehen – es bleibt eine feste Schlaufe am Köder."
    ],
    sicher:"Etwas fummeliger, aber sicher. Wenn dir das (noch) zu viel ist: Einfach deinen Snap/Karabiner benutzen – der macht dasselbe (Köder pendelt frei) ganz ohne Knoten am Köder.",
    svg:`<svg viewBox="0 0 300 120" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Rapala-Schlaufenknoten Schema">
      <ellipse cx="235" cy="60" rx="13" ry="18" fill="none" stroke="#9db6c4" stroke-width="3"/>
      <path d="M10 60 H150" stroke="#33c3a6" stroke-width="3" fill="none"/>
      <circle cx="175" cy="60" r="18" fill="none" stroke="#33c3a6" stroke-width="3"/>
      <path d="M193 60 H222" stroke="#33c3a6" stroke-width="3" fill="none"/>
      <rect x="110" y="50" width="26" height="20" rx="6" fill="none" stroke="#eaf3f7" stroke-width="2.5"/>
      <text x="45" y="105" fill="#9db6c4" font-size="11" font-family="sans-serif">Knoten hält eine feste Schlaufe – Köder spielt frei</text>
    </svg>`
  }
];

/* Welcher Knoten ist im Berater für welche Verbindung gemeint? (nur Anzeige) */
const KNOTEN_KURZ = {
  palomar:"Palomar", clinch:"Verb. Clinch", grinner:"Dopp. Grinner", rapala:"Rapala-Schlaufe"
};

/* ---------- 6) MEINE EMPFEHLUNG (optional) ----------
   Ergänzt deine bestehende Wunschliste, ohne sie zu ändern.
   Alles hier ist Vorschlag, kein Ersatz.
------------------------------------------------------------ */
const EMPFEHLUNG = {
  reihenfolge: [
    "Zuerst deine <b>3 vorhandenen Setups</b> sicher beherrschen (Spinnen auf Zander/Barsch, Forelle). Kostet 0 € und bringt den größten Lerneffekt.",
    "<b>Zubehör-Basics</b> vor der 4. Rute: Kopflampe, Kleinteile-Sortiment, Ersatzspule, Wathose.",
    "<b>Bolognese/Pose</b> – der schnellste Weg zum ersten sicheren Fang (Weißfisch beißt zuverlässig, gut für Erfolgserlebnisse).",
    "<b>Küstenspinnen</b> auf Meerforelle/Hornhecht – der natürlichste Schritt aus deinem Spinnen heraus (SH-Küste!).",
    "<b>Ansitz-Allround</b> (Aal, Karpfen, Schleie) als nächste eigenständige Spielart.",
    "<b>Brandung &amp; Pilk</b> erst kurz vor dem tatsächlichen Küsten-/Kuttertermin kaufen (Kutter vermieten oft Gerät).",
    "<b>Reise-Steckrute &amp; Großwels</b>: Fernziele – ganz nach hinten."
  ],
  setups: {
    kuestenspinn: {
      key:"kuestenspinn", name:"Küstenspinn-Setup (Meerforelle / Hornhecht)",
      rute:"Sportex Air Spin Seatrout · 3,05 m · WG 15–40 g",
      rolle:"Daiwa Fuego LT 4000-C (salzwasserfest genug, ATD-Bremse)",
      schnur:"Hauptschnur Daiwa J-Braid Grand X8 0,10 mm · Vorfach Fluorocarbon 0,28–0,30 mm, 1,0–1,5 m",
      preis:"Primär-Setup ca. 300–380 € (Rute ~190 €, Rolle ~110 €, Schnur ~25 €)",
      dazu:"Küstenblinker 12–28 g (Snaps, Møre Silda, Hansen Fight), Wathose, Polbrille – Rolle & Schnur nach jedem Einsatz mit Süßwasser spülen",
      warum:"Die eigentliche Lücke: Du kannst schon spinnen und wohnst an der Küste – Meerforelle/Hornhecht sind der logische nächste Schritt. Deine Setup-1-Rute (2,70 m) geht zum Reinschnuppern, ist aber kurz und die Rolle nicht salzwasserfest.",
      stufen:[
        { label:"💰 Günstiger Einstieg (ca. 180–230 €)", rute:"Savage Gear SGS6 Coastal · 3,00 m · WG 12–36 g (~120 €)", rolle:"Shimano Nasci 4000 XG (~100 €)", schnur:"Daiwa J-Braid X8 0,10 mm + FC-Vorfach 0,28 mm (~20 €)" },
        { label:"⭐ Empfehlung – gehobene Mittelklasse (ca. 300–380 €)", rute:"Sportex Air Spin Seatrout · 3,05 m · WG 15–40 g (~190 €)", rolle:"Daiwa Fuego LT 4000-C (~110 €)", schnur:"Daiwa J-Braid Grand X8 0,10 mm + FC-Vorfach 0,28–0,30 mm (~25 €)" },
        { label:"🏆 Premium (ca. 450–550 €)", rute:"Sportex Kev Spin bzw. HTO Nebula · ~3,00 m · WG bis 40 g (~230–280 €)", rolle:"Shimano Stradic FL 4000 (~180 €)", schnur:"Daiwa J-Braid Grand X8 0,10 mm + Stroft/Seaguar FC-Vorfach (~35 €)" }
      ],
      hinweis:"⚠️ Modelljahre & Preise vor dem Kauf beim Händler (z. B. Moritz) verifizieren – Serien wechseln jährlich, geringe Abweichungen bei Modellbezeichnung/WG möglich."
    }
  },
  zubehoer: [
    { name:"Kopflampe", warum:"Aal, Zander & Quappe sind Nacht-/Dämmerungsfische – ohne Licht kein Nachtansitz.", preis:"ca. 20–40 €" },
    { name:"Wathose / Watstiefel", warum:"Erweitert erreichbare Stellen enorm: Eider-Ufer, Küste, Brandung, Meerforelle.", preis:"ca. 60–150 €" },
    { name:"Kleinteile-Grundsortiment", warum:"Haken, Blei, Wirbel/Snaps, Perlen, Posen, Vorfachmaterial (Mono + FC) – Basis für jede Montage.", preis:"ca. 40–70 €" },
    { name:"Ersatzspule + Ersatzschnur (je Rolle)", warum:"Ein Schnurbruch am Wasser beendet sonst den Angeltag.", preis:"ca. 15–30 € je" },
    { name:"Banksticks/Rutenhalter + Glöckchen/Bissanzeiger", warum:"Schon fürs improvisierte Aal-/Zanderansitzen mit Setup 1 (steht in der App als 🟡).", preis:"ca. 20–50 €" },
    { name:"Sitzmöglichkeit / Schirm", warum:"Für längere Ansitze – Komfort hält dich länger konzentriert am Wasser.", preis:"ca. 30–80 €" }
  ],
  aufschieben: [
    "<b>Reise-Steckrute</b> aufschieben, solange du deine Heimatgewässer lernst – schön, aber Luxus.",
    "<b>Pilk-/Kuttergerät</b> nicht auf Vorrat kaufen: Viele Kutter vermieten Ausrüstung. Erst kaufen, wenn Kutterangeln „dein Ding“ wird.",
    "<b>Großwels (5c)</b> bleibt Fernziel – erst nach Erfahrung mit normalem Welsangeln (Sicherheit)."
  ]
};

/* ---------- 7) ZUBEHÖR-CHECKLISTE ----------
   Gleicht automatisch mit deinem Bestand ab (Feld "match" = Stichwörter,
   die in deinem Equipment/Zubehör gesucht werden → dann "hast du schon" ✅).
   stufe: "pflicht" | "wichtig" | "nice"
------------------------------------------------------------ */
const ZUBEHOER_CHECK = [
  {
    kategorie:"Dokumente & Pflicht", icon:"📄",
    items:[
      { name:"Fischereischein", stufe:"pflicht", warum:"Ohne geht gar nichts – immer dabeihaben.", match:["fischereischein"] },
      { name:"Erlaubnisschein / Angelkarte fürs Gewässer", stufe:"pflicht", warum:"Gilt gewässerbezogen (Verein/Pächter). Ohne gültige Karte ist es Schwarzfischen.", match:[] },
      { name:"Fangbuch / Fangkarte", stufe:"wichtig", warum:"An vielen Gewässern Pflicht: Fänge dokumentieren. Auch sonst hilfreich zum Lernen.", match:["angeltagebuch","fangbuch"] }
    ]
  },
  {
    kategorie:"Fisch versorgen & waidgerecht", icon:"🐟",
    items:[
      { name:"Kescher", stufe:"pflicht", warum:"Fisch schonend landen statt am Ufer zu zerren.", match:["kescher"] },
      { name:"Abhakmatte", stufe:"wichtig", warum:"Schützt den Fisch (Schleimhaut) beim Abhaken am Ufer.", match:["abhakmatte"] },
      { name:"Hakenlöser / Lösezange", stufe:"pflicht", warum:"Haken sicher lösen, ohne Fisch (und Finger) zu verletzen.", match:["zange","hakenlöser","lösezange"] },
      { name:"Maulspreizer", stufe:"wichtig", warum:"Bei Raubfischen (Hecht/Zander) das Maul offen halten zum Abhaken.", match:["maulspreizer"] },
      { name:"Fischtöter (Totschläger)", stufe:"pflicht", warum:"Waidgerecht betäuben/töten bei Entnahme.", match:["fischtöter","totschläger"] },
      { name:"Messer (scharf)", stufe:"wichtig", warum:"Kehlschnitt/Ausnehmen, Filetieren.", match:["messer","morakniv"] },
      { name:"Seitenschneider für Drillinge", stufe:"wichtig", warum:"Tief sitzende Haken/Drillinge notfalls durchtrennen – schonender als Reißen.", match:["seitenschneider","knipex"] },
      { name:"Bissfeste Handschuhe", stufe:"nice", warum:"Griff & Schutz beim Landen von Hecht/Zander.", match:["handschuhe"] },
      { name:"Lippgreifer (Fischgreifer)", stufe:"nice", warum:"Raubfisch sicher am Maul greifen zum Fotografieren/Abhaken.", match:["lippgreifer","fischgreifer","boga"] },
      { name:"Maßband / Messlatte", stufe:"pflicht", warum:"Mindestmaß am Wasser prüfen – rechtlich wichtig! Untermaßige sofort zurücksetzen.", match:["maßband","messlatte","messbrett","maßband"] },
      { name:"Kescher-/Digitalwaage", stufe:"nice", warum:"Fanggewicht bestimmen (Fangbuch, eigene Statistik).", match:["waage"] }
    ]
  },
  {
    kategorie:"Schnur, Montage & Kleinteile", icon:"🧵",
    items:[
      { name:"Ersatzspule + Ersatzschnur", stufe:"wichtig", warum:"Schnurbruch/Perücke beendet sonst den Tag.", match:["ersatzspule"] },
      { name:"Vorfachmaterial (Mono + Fluorocarbon)", stufe:"wichtig", warum:"In 2–3 Stärken – Basis fast jeder Montage.", match:["fluorocarbon","vorfachmaterial"] },
      { name:"Haken-Sortiment", stufe:"wichtig", warum:"Verschiedene Größen je Fisch/Köder.", match:["gamakatsu","haken-sort","hakensort"] },
      { name:"Blei-Sortiment (Lauf-, Krallen-, Schrotblei)", stufe:"wichtig", warum:"Gewicht an Strömung/Wurfweite anpassen.", match:["schrotblei","bleisort","blei-sort"] },
      { name:"Wirbel, Snaps & Karabiner", stufe:"wichtig", warum:"Schnellverbindung + verhindert Schnurdrall. Köderwechsel ohne Neuknoten.", match:["wirbel","snap","karabiner"] },
      { name:"Stahl-/Hardmono-Vorfächer (Raubfisch)", stufe:"wichtig", warum:"Pflicht bei Hecht (Zähne). Du hast Perca-Stahlvorfächer.", match:["stahlvorf","stahlvorfach"] },
      { name:"Posen-Sortiment", stufe:"nice", warum:"Für Pose-/Friedfischangeln in verschiedenen Tragkräften.", match:["pose","troutmaster"] },
      { name:"Gummiperlen & Posenstopper", stufe:"nice", warum:"Prellschutz für Knoten, Tiefeneinstellung bei Laufmontagen.", match:["perle","stopper"] },
      { name:"Braid-Schere / Schnurschneider", stufe:"wichtig", warum:"Geflochtene Schnur ist mit normaler Schere kaum sauber zu schneiden.", match:["braid-schere","schnurschneider","schere"] },
      { name:"Rig-/Vorfachbox (Aufbewahrung)", stufe:"nice", warum:"Fertige Montagen & Vorfächer ordentlich & griffbereit.", match:["rig-box","vorfachbox"] }
    ]
  },
  {
    kategorie:"Am Wasser: Sicherheit & Komfort", icon:"🦺",
    items:[
      { name:"Polarisationsbrille (Polbrille)", stufe:"wichtig", warum:"Fisch/Struktur im Wasser erkennen UND Augenschutz vor fliegenden Haken.", match:["polbrille","polarisation"] },
      { name:"Kopflampe", stufe:"wichtig", warum:"Aal, Zander, Quappe sind Nacht-/Dämmerungsfische – ohne Licht kein Nachtansitz.", match:["kopflampe","stirnlampe"] },
      { name:"Erste-Hilfe-Set (inkl. Hakenlösetechnik)", stufe:"pflicht", warum:"Ein Haken im Finger passiert schnell. Pflaster, Desinfektion, Verband.", match:["erste-hilfe","erste hilfe"] },
      { name:"Wathose / Watstiefel", stufe:"nice", warum:"Mehr erreichbare Stellen: Eider-Ufer, Küste, Brandung, Meerforelle.", match:["wathose","watstiefel"] },
      { name:"Regenkleidung / Angeljacke", stufe:"wichtig", warum:"Trocken & warm bleiben – hält dich länger konzentriert am Wasser.", match:["regenkleidung","angeljacke","regenjacke"] },
      { name:"Sitzmöglichkeit / Schirm", stufe:"nice", warum:"Komfort bei längeren Ansitzen.", match:["stuhl","sitz","schirm"] },
      { name:"Rutenhalter / Banksticks + Bissanzeiger", stufe:"wichtig", warum:"Rute sicher ablegen + Biss erkennen (auch improvisiert mit Setup 1).", match:["rutenhalter","bankstick","bissanzeiger","glöckchen"] },
      { name:"Insektenschutz", stufe:"nice", warum:"Mücken am Wasser können den schönsten Ansitz ruinieren.", match:["insektenschutz","mückenschutz"] },
      { name:"Handtuch / Lappen", stufe:"nice", warum:"Hände säubern (Schleim, Köder) – hygienischer & angenehmer.", match:["handtuch","lappen"] },
      { name:"Müllbeutel (Schnurreste!)", stufe:"wichtig", warum:"Schnurreste NIE liegen lassen – tödlich für Vögel. Alles mitnehmen.", match:["müllbeutel"] }
    ]
  },
  {
    kategorie:"Transport & Aufbewahrung", icon:"🎒",
    items:[
      { name:"Gerätetasche / Tackle-Rucksack", stufe:"wichtig", warum:"Alles ordentlich transportieren.", match:["gerätetasche","rucksackbox","tackle"] },
      { name:"Ködertaschen / Köderboxen", stufe:"nice", warum:"Kunstköder sortiert & griffbereit.", match:["spoon-tasche","köder-set","köderbox"] },
      { name:"Rutentasche / Futteral", stufe:"nice", warum:"Ruten geschützt transportieren (Ringe/Spitzen sind empfindlich).", match:["rutentasche","futteral"] },
      { name:"Ködereimer mit Belüftung (Naturköder)", stufe:"nice", warum:"Maden/Würmer/Köderfisch frisch halten.", match:["ködereimer","belüftung"] },
      { name:"Kühltasche für den Fang", stufe:"wichtig", warum:"Entnommenen Fisch kühl & frisch nach Hause bringen.", match:["kühltasche","kühlbox"] }
    ]
  }
];

/* ---------- 8) SCHONZEITEN & MINDESTMASSE (Schleswig-Holstein) ----------
   Orientierungswerte, Recherche-Stand 2026. Diese Angaben ändern sich z. T.
   jährlich (v. a. EU-Quoten für Meeresfische) und je nach Gewässer/Verein.
   VOR JEDEM ANGELTAG die aktuelle Binnenfischereiordnung SH bzw. den
   eigenen Erlaubnisschein/Gewässerordnung prüfen!
------------------------------------------------------------ */
const RECHT_SH = {
  hecht:       { schonzeit:"15. Februar – 30. April",  mindestmass:"45 cm", hinweis:"Viele Vereinsgewässer setzen 50 cm – im Erlaubnisschein prüfen." },
  zander:      { schonzeit:"15. Februar – 31. Mai",     mindestmass:"45 cm", hinweis:"Vereinsgewässer setzen teils 50 cm." },
  barsch:      { schonzeit:"keine gesetzliche Schonzeit", mindestmass:"kein gesetzl. Mindestmaß", hinweis:"Manche Vereine setzen ~20 cm." },
  forelle:     { schonzeit:"16. Oktober – 15. Februar (Laichzeit Bachforelle)", mindestmass:"25 cm", hinweis:"An Forellenseen (Put &amp; Take) gilt meist die Gewässerordnung statt der gesetzlichen Schonzeit." },
  rapfen:      { schonzeit:"ganzjährig geschont", mindestmass:"–", hinweis:"⚠️ Rapfen ist eine besonders geschützte Art (FFH-Richtlinie) – einen gefangenen Rapfen sofort schonend zurücksetzen, keine Entnahme.", schutz:true },
  doebel:      { schonzeit:"keine gesetzliche Schonzeit", mindestmass:"kein gesetzl. Mindestmaß", hinweis:"" },
  aal:         { schonzeit:"keine landesweite Schonzeit", mindestmass:"kein gesetzl. Mindestmaß (vereinsseitig oft 35 cm empfohlen)", hinweis:"⚠️ Bestand stark gefährdet. Die EU-Aalverordnung schränkt Fangmengen/Zeiten regional ein – aktuellen Stand beim Verein/Fischereiamt erfragen.", schutz:true },
  quappe:      { schonzeit:"1. Dezember – 28./29. Februar (Laichzeit)", mindestmass:"35 cm", hinweis:"⚠️ In manchen Gewässern ganzjährig geschont (Rote Liste) – Gewässerordnung unbedingt prüfen.", schutz:true },
  karpfen:     { schonzeit:"keine gesetzliche Schonzeit", mindestmass:"kein gesetzl. Mindestmaß (vereinsseitig oft 35 cm)", hinweis:"" },
  schleie:     { schonzeit:"oft 1.–31. Mai (gewässerabhängig)", mindestmass:"25 cm", hinweis:"Schonzeit ist häufig vereinsspezifisch geregelt." },
  rotauge:     { schonzeit:"keine gesetzliche Schonzeit", mindestmass:"kein gesetzl. Mindestmaß", hinweis:"" },
  wels:        { schonzeit:"keine gesetzliche Schonzeit", mindestmass:"kein gesetzl. Mindestmaß", hinweis:"Bei großen Welsen wird Catch &amp; Release zum Bestandsschutz empfohlen." },
  dorsch:      { schonzeit:"jährlich per EU-Quote festgelegt (oft Jan./Feb. eingeschränkt)", mindestmass:"35 cm (westliche Ostsee)", hinweis:"⚠️ Der Dorschbestand in der westlichen Ostsee ist stark eingebrochen – die EU legt Schonzeiten &amp; Tageslimits jährlich neu fest. Vor jeder Kuttertour aktuelle Regelung prüfen (Thünen-Institut/Fischereiamt SH)!", schutz:true },
  hering:      { schonzeit:"seit 2024 für Freizeitangler in der westlichen Ostsee stark eingeschränkt/zeitweise verboten", mindestmass:"–", hinweis:"⚠️ Wegen Bestandskrise gelten seit 2024 verschärfte EU-Regeln für die Freizeitfischerei auf Hering – unbedingt aktuellen Stand prüfen, bevor du ein Paternoster einpackst.", schutz:true },
  wolfsbarsch: { schonzeit:"gewässer-/gebietsabhängig (EU-Regelung)", mindestmass:"42 cm", hinweis:"Tageslimit für Freizeitangler meist auf wenige Fische begrenzt (EU-Bag-Limit) – aktuelle Zahl vor dem Angeln prüfen." },
  flunder:     { schonzeit:"keine landesweite Schonzeit", mindestmass:"25 cm", hinweis:"" },
  meerforelle: { schonzeit:"1. November – 15. Januar (Laichzeit)", mindestmass:"40 cm", hinweis:"" },
  hornhecht:   { schonzeit:"keine gesetzliche Schonzeit", mindestmass:"kein gesetzl. Mindestmaß", hinweis:"" }
};
const RECHT_SH_META = {
  stand:"Recherche-Stand 2026 – nur Orientierungswerte!",
  disclaimer:"Diese Werte ersetzen NICHT die aktuelle Binnenfischereiordnung Schleswig-Holstein, EU-Fangquoten für Meeresfische oder deinen Erlaubnisschein/Gewässerordnung. Schonzeiten, Mindestmaße und Tageslimits ändern sich – vor JEDEM Angeltag selbst prüfen (z. B. beim Verein, Fischereiamt SH oder auf schleswig-holstein.de)."
};

/* ---------- 9) „LOHNT SICH HEUTE?“ – Erfahrungswissen zum Selbst-Einschätzen ----------
   Kein Wetterdienst, sondern eine transparente Punkte-Heuristik aus
   Angel-Erfahrungswissen (Dämmerung, Luftdruck, Himmel, Wind, Saison).
------------------------------------------------------------ */
/* ---------- 10) SPOT-DATENBANK (Startbefüllung Karte "Fänge & Spots") ----------
   Übernommen aus dem bisherigen Angeltagebuch-Tool. Wird beim allerersten Laden
   (wenn noch keine eigenen Spots gespeichert sind) automatisch importiert.
------------------------------------------------------------ */
const SPOTS_SEED = [
  { name:'Forellensee Nordhackstedt', type:'see', region:'sh', lat:54.7332, lng:9.1674, price:35.00, notes:'Regenbogenforelle, Lachsforelle, Saibling | Grundwasserquellen, Stege | forelle-nord.de' },
  { name:'Forellenhof Wester-Ohrstedt', type:'see', region:'sh', lat:54.5093, lng:9.19, price:30.00, notes:'Lachsforelle, Goldforelle, Stör, Aal | Ferienwohnungen, Kiloteich | forellenhof-wester-ohrstedt.de' },
  { name:'Forellensee Ahrenviöl', type:'see', region:'sh', lat:54.5299, lng:9.2057, price:32.00, notes:'Forellen, Stör, Wels, Afrowels | Artenreich, Verleih vor Ort | forellensee-ahrenvioel.de' },
  { name:'Angelsee Hof Horsbüll', type:'see', region:'sh', lat:54.813, lng:8.7001, price:28.00, notes:'Regenbogenforelle, Aal, Karpfen | Direkt an der Grenze zu DK | forellenseen.de' },
  { name:'Angelsee Idstedt', type:'see', region:'sh', lat:54.5864, lng:9.5112, price:25.00, notes:'Regenbogenforelle, Lachsforelle | Ruhige Waldrandlage | angelsee-idstedt.de' },
  { name:'Arrild Fiskesø', type:'see', region:'sh', lat:55.1516, lng:8.9616, price:32.00, notes:'Großforellen, Bachforellen | Fly-Fishing-Flussstrecke, Spitzenanlage | arrild-fiskesoe.dk' },
  { name:'Rødekro Fiskepark', type:'see', region:'sh', lat:55.0696, lng:9.341, price:30.00, notes:'Regenbogenforelle, Lachsforelle | Sehr große Forellen, saubere Filetierplätze | rodekro-fiskepark.dk' },
  { name:'Mjøls Lystfiskersø', type:'see', region:'sh', lat:55.0696, lng:9.341, price:28.00, notes:'Regenbogenforelle, Goldforelle, Saibling | 3 verbundene Seen | mjoels.dk' },
  { name:'Tinglev Sønderby Put & Take', type:'see', region:'sh', lat:54.9316, lng:9.2482, price:26.00, notes:'Regenbogenforelle, Bachforelle | Dicht an der Grenze (Krusau) | dansee.dk' },
  { name:'Oxriver Put & Take', type:'see', region:'sh', lat:56.1121, lng:8.3179, price:35.00, notes:'Regenbogenforelle, Lachsforelle, Saibling | Künstlich angelegter Flusslauf | oxriver.dk' },
  { name:'Schlei (Kappeln/Schleswig)', type:'see', region:'sh', lat:54.6642, lng:9.9318, price:10.00, notes:'Hering, Barsch, Aal, Meerforelle, Zander | Legendärer Heringslauf im Frühjahr | hejfish.com' },
  { name:'Treene (Schwabstedt)', type:'see', region:'sh', lat:54.3959, lng:9.1895, price:8.00, notes:'Hecht, Zander, Barsch, Aland, Rapfen | Gezeitenstrom spürbar | hejfish.com' },
  { name:'Arenholzer See', type:'see', region:'sh', lat:54.5386, lng:9.4962, price:9.50, notes:'Hecht, Barsch, Karpfen, Aal, Weißfisch | Natursee, Flachzonen | hejfish.com' },
  { name:'Langsee', type:'see', region:'sh', lat:54.5853, lng:9.5857, price:10.00, notes:'Hecht, Zander, Schleie, Karpfen, Barsch | Sehr langgestreckt, Strukturkanten | hejfish.com' },
  { name:'Idstedter See', type:'see', region:'sh', lat:54.5864, lng:9.5112, price:8.00, notes:'Hecht, Karpfen, Barsch, Schleie | Natursee, Uferangeln | lav-sh.de' },
  { name:'Flensburger Förde (Küste Holnis)', type:'kueste', region:'sh', lat:54.8486, lng:9.5685, price:0.00, notes:'Meerforelle, Hornhecht, Dorsch, Plattfisch | Watangeln, Seegraswiesen | meldeportal.schleswig-holstein.de' },
  { name:'Sorge (Abschnitt Hohn)', type:'fluss', region:'sh', lat:54.2982, lng:9.5064, price:7.50, notes:'Hecht, Schleie, Karpfen, Aal, Weißfische | Langsam fließender Niederungsfluss | hejfish.com' },
  { name:'Lüttensee', type:'see', region:'sh', lat:54.3414, lng:9.1991, price:8.00, notes:'Hecht, Zander, Brassen, Barsch | Direkte Verbindung zur Eider | hejfish.com' },
  { name:'Loiter Au', type:'fluss', region:'sh', lat:54.6124, lng:9.7012, price:10.00, notes:'Bachforelle, Meerforelle, Aal | Salmonidengewässer, Fliegenfischen | asv-kappeln.de' },
  { name:'Windebyer Noor', type:'see', region:'sh', lat:54.4716, lng:9.8375, price:12.00, notes:'Hecht, Zander, Große Maräne, Barsch, Aal | Direkt an Eckernförde grenzend | sv-windebyer-noor.de' },
  { name:'Angelsee Alt Duvenstedt', type:'see', region:'sh', lat:54.3586, lng:9.6438, price:30.00, notes:'Lachsforelle, Regenbogenforelle, Stör, Aal | 24h geöffnet, Nachtangeln | angelsee-altduvenstedt.de' },
  { name:'Peters Angelsee', type:'see', region:'sh', lat:54.2435, lng:9.8333, price:35.00, notes:'Großforellen, Saiblinge, Goldforellen | Bis 11m tief, Unterstände | petersangelsee.de' },
  { name:'Forellensee Fang Mehr', type:'see', region:'sh', lat:54.2435, lng:9.8333, price:30.00, notes:'Regenbogenforelle, Lachsforelle | Sehr sauber, Holzhütten | forellenseefangmehr.de' },
  { name:'Forellensee Krogaspe', type:'see', region:'sh', lat:54.1316, lng:9.9288, price:30.00, notes:'Regenbogenforelle, Goldforelle, Bachforelle | Direkt an der A7, guter Parkplatz | forellensee-krogaspe.de' },
  { name:'Angelsee Loop', type:'see', region:'sh', lat:54.1491, lng:9.9502, price:30.00, notes:'Regenbogenforelle, Lachsforelle, Saibling | Quellsee, sehr klares Wasser | forellensee-loop.de' },
  { name:'Angelsee Jevenstedt', type:'see', region:'sh', lat:54.2336, lng:9.6607, price:28.00, notes:'Forellen, Karpfen, Schleie, Aal | Räucherei vor Ort | angelsee-jevenstedt.de' },
  { name:'Angelpark Hof Holm', type:'see', region:'sh', lat:53.6782, lng:10.4318, price:29.00, notes:'Forellen, Afrowels, Stör | Nahe Ostsee, 3 Teiche | hof-holm.de' },
  { name:'Angelsee Warder', type:'see', region:'sh', lat:54.2135, lng:9.8861, price:27.00, notes:'Regenbogenforelle, Lachsforelle | Ruhige, ländliche Lage | forellenseen.de' },
  { name:'Angelsee Bokel', type:'see', region:'sh', lat:54.2158, lng:9.7941, price:26.00, notes:'Forellen, Karpfen, Aal | Naturufer, Bäume | angelsee-bokel.de' },
  { name:'Forellensee Brokenlande', type:'see', region:'sh', lat:53.9738, lng:9.9688, price:30.00, notes:'Regenbogenforelle, Stör, Karpfen | Direkt an Abfahrt A7, Imbiss | brokenlande.de' },
  { name:'Nord-Ostsee-Kanal (NOK Rendsburg)', type:'kanal', region:'sh', lat:54.3003, lng:9.665, price:12.00, notes:'Zander, Barsch, Aal, Hering, Plattfisch | Steinpackungen, Top-Zanderrevier | hejfish.com' },
  { name:'Eider (Rendsburg/Achterwehr)', type:'fluss', region:'sh', lat:54.3003, lng:9.665, price:9.00, notes:'Hecht, Zander, Barsch, Karpfen, Brassen | Keine Gezeiten in der Obereider | hejfish.com' },
  { name:'Großer Plöner See', type:'see', region:'sh', lat:54.1581, lng:10.4177, price:15.00, notes:'Hecht, Barsch, Zander, Maräne, Karpfen | Größter See SHs, Freiwasserhechte | hejfish.com' },
  { name:'Westensee', type:'see', region:'sh', lat:54.2757, lng:9.9021, price:12.50, notes:'Hecht, Zander, Barsch, Wels, Aal, Karpfen | LAV-SH Verbandgewässer | lav-sh.de' },
  { name:'Wittensee', type:'see', region:'sh', lat:54.4055, lng:9.7688, price:13.00, notes:'Hecht, Maräne, Barsch, Aal | Schleppangeln vom Boot beliebt | hejfish.com' },
  { name:'Bistensee', type:'see', region:'sh', lat:54.4039, lng:9.6916, price:10.00, notes:'Hecht, Barsch, Aal, Friedfisch | Windgeschützter als Wittensee | hejfish.com' },
  { name:'Schwentine (Preetz)', type:'fluss', region:'sh', lat:54.2359, lng:10.2818, price:10.00, notes:'Hecht, Barsch, Aal, Bachforelle | Urwüchsig, Spinnfischen | hejfish.com' },
  { name:'Wardersee (Kreis Segeberg)', type:'see', region:'sh', lat:53.9938, lng:10.4195, price:12.00, notes:'Hecht, Zander, Karpfen, Barsch, Aal | Strukturreich, ausgeprägte Kanten | hejfish.com' },
  { name:'Brahmsee', type:'see', region:'sh', lat:54.2117, lng:9.9302, price:11.00, notes:'Hecht, Zander, Barsch, Aal, Weißfisch | Bekannter Hechtsee | hejfish.com' },
  { name:'Schierensee (Großer)', type:'see', region:'sh', lat:54.2566, lng:9.9851, price:10.00, notes:'Hecht, Barsch, Schleie, Karpfen | Sehr klares Wasser | lav-sh.de' },
  { name:'Postsee', type:'see', region:'sh', lat:54.2359, lng:10.2818, price:12.00, notes:'Hecht, Barsch, Zander, Aal, Karpfen | Langgestreckt, gute Uferplätze | hejfish.com' },
  { name:'Einfelder See', type:'see', region:'sh', lat:54.0703, lng:9.9884, price:9.00, notes:'Hecht, Zander, Barsch, Karpfen, Aal | Stadtnahes Top-Barschrevier | asv-neumuenster.de' },
  { name:'Dobersdorfer See', type:'see', region:'sh', lat:54.3182, lng:10.2814, price:11.50, notes:'Hecht, Karpfen, Barsch, Zander, Aal | Ruhiger Natursee | hejfish.com' },
  { name:'Passader See', type:'see', region:'sh', lat:54.3582, lng:10.316, price:12.00, notes:'Hecht, Barsch, Große Maräne, Aal | Maränenbesatz, klares Wasser | hejfish.com' },
  { name:'Kieler Förde (Sartorikai)', type:'kueste', region:'sh', lat:54.3227, lng:10.1356, price:0.00, notes:'Hering, Dorsch, Plattfisch, Makrele | Massenfänge von Hering im Frühjahr | kieler-angler.de' },
  { name:'Angelsee RAB Lentföhrden', type:'see', region:'sh', lat:53.8731, lng:9.8856, price:35.00, notes:'Forellen, Saibling, Stör, Karpfen | Windgeschützte Einzelbuchten | angelseerablentfhrden-wec.de' },
  { name:'Angelteiche Koesterrieth', type:'see', region:'sh', lat:53.5965, lng:10.2821, price:40.00, notes:'Regenbogen-, Lachs-, Bachforelle | Naturbelassen, Nachtangeln | angelteiche-koesterrieth.de' },
  { name:'Fischersee-Forelle (Kronshorst)', type:'see', region:'sh', lat:53.5965, lng:10.2821, price:35.00, notes:'Lachsforelle, Regenbogenforelle, Aal | Gehört zu Koesterrieth | angelteiche-koesterrieth.de' },
  { name:'Forellensee Quickborn', type:'see', region:'sh', lat:54.0111, lng:9.2115, price:35.00, notes:'Regenbogenforelle, Saibling, Hecht | Tiefer Kiessee (12m), klares Wasser | instagram.com/forellensee_quickborn' },
  { name:'Angelsee Rosenweiher', type:'see', region:'sh', lat:53.9495, lng:9.7189, price:32.00, notes:'Lachsforelle, Stör, Wels, Aal | Regelmäßige Großfisch-Events | angelsee-rosenweiher.de' },
  { name:'Angelteich Bargfeld-Stegen', type:'see', region:'sh', lat:53.7667, lng:10.2, price:30.00, notes:'Regenbogenforelle, Goldforelle, Karpfen | Familiäre Anlage, kurze Wege | angel-forellenteich.de' },
  { name:'Großer Ratzeburger See', type:'see', region:'sh', lat:53.7011, lng:10.7743, price:15.00, notes:'Hecht, Zander, Barsch, Maräne, Wels | Große Maränenvorkommen | hejfish.com' },
  { name:'Schaalsee (SH-Anteil)', type:'see', region:'sh', lat:53.6196, lng:10.8673, price:15.00, notes:'Riesenbarsch, Hecht, Maräne, Aal | Bis 72m tief, Biosphärenreservat | hejfish.com' },
  { name:'Elbe-Lübeck-Kanal (ELK)', type:'kanal', region:'sh', lat:53.6289, lng:10.688, price:10.00, notes:'Zander, Barsch, Aal, Karpfen, Quappe | Wenig Schiffsverkehr, Zandertipp | hejfish.com' },
  { name:'Elbe (Lauenburg)', type:'fluss', region:'sh', lat:53.1868, lng:8.4752, price:10.00, notes:'Zander, Rapfen, Wels, Hecht, Aal | Buhnenangeln, harte Strömung | hejfish.com' },
  { name:'Wakenitz', type:'fluss', region:'sh', lat:53.8664, lng:10.6847, price:12.00, notes:'Hecht, Wels, Barsch, Karpfen, Schleie | Amazonas des Nordens, urig | luebecker-anglerverein.de' },
  { name:'Großer Segeberger See', type:'see', region:'sh', lat:53.9369, lng:10.3045, price:12.00, notes:'Hecht, Zander, Barsch, Aal, Karpfen | Bootsvermietung am See | hejfish.com' },
  { name:'Hohendeicher See (Oortkaten)', type:'see', region:'hh', lat:53.5502, lng:10.0013, price:12.00, notes:'Hecht, Zander, Barsch, Regenbogenforelle | Tiefer Grundwassersee, Taucherbereich | asv-hamburg.de' },
  { name:'Hamburg Hafen (Norderelbe)', type:'fluss', region:'hh', lat:53.5502, lng:10.0013, price:0.00, notes:'Zander, Barsch, Aal, Rapfen, Stint | Gezeiten, Spinnfischer-Mekka | elbangler.de' },
  { name:'Dove Elbe (Regattastrecke)', type:'fluss', region:'hh', lat:53.4903, lng:10.1593, price:10.00, notes:'Hecht, Zander, Großbarsch, Karpfen, Schleie | Keine Tide, hervorragendes Stillwasser | asv-hamburg.de' },
  { name:'Gose Elbe', type:'fluss', region:'hh', lat:53.4207, lng:10.1999, price:10.00, notes:'Schleie, Karpfen, Hecht, Barsch | Sehr krautreich im Sommer, Seerosen | asv-hamburg.de' },
  { name:'Bille (Bergedorf)', type:'fluss', region:'hh', lat:53.4898, lng:10.2066, price:9.00, notes:'Hecht, Barsch, Aal, Karpfen, Döbel | Abwechslungsreicher, teils urbaner Fluss | asv-hamburg.de' },
  { name:'Alster (Außenalster)', type:'see', region:'hh', lat:53.5502, lng:10.0013, price:0.00, notes:'Hecht, Zander, Barsch, Karpfen, Aland | Mitten in der Stadt, Streetfishing | hamburg.de/angeln' },
  { name:'Angelsee Fredenbeck', type:'see', region:'ni', lat:53.5227, lng:9.3982, price:35.00, notes:'Lachsforelle, Regenbogenforelle, Saibling | Riesige Anlage, Top-Besatz | angelsee-fredenbeck.de' },
  { name:'Forellensee Meckelfeld', type:'see', region:'ni', lat:53.4197, lng:9.926, price:30.00, notes:'Forellen, Karpfen, Aal | Sehr strukturierter Boden | forellensee-meckelfeld.de' },
  { name:'Angelparadies V d. Ah', type:'see', region:'ni', lat:53.4341, lng:8.8183, price:28.00, notes:'Regenbogenforelle, Stör, Großwels | Mehrere Teiche, Großwelsbesatz | angelparadies-von-der-ah.de' },
  { name:'Angelsee Maschen', type:'see', region:'ni', lat:53.4197, lng:9.926, price:30.00, notes:'Forellen, Saiblinge, Stör | Direkt am Maschener Kreuz | angelsee-maschen.de' },
  { name:'Forellenhof Wedehorn', type:'see', region:'ni', lat:52.8496, lng:8.7284, price:30.00, notes:'Forellen, Lachsforellen, Goldforellen | Idyllisch in der Heide | forellenhof-wedehorn.de' },
  { name:'Angelparadies Herrlichkeit', type:'see', region:'ni', lat:52.8971, lng:8.4364, price:27.00, notes:'Regenbogenforelle, Karpfen, Aal | Ruhig, fließendes Quellwasser | angelparadies-herrlichkeit.de' },
  { name:'Angelsee Klein-Süstedt', type:'see', region:'ni', lat:52.9841, lng:10.5386, price:28.00, notes:'Forelle, Großforelle, Saibling | Gepflegtes Heidegewässer | angelsee-klein-suestedt.de' },
  { name:'Forellensee Heisterende', type:'see', region:'ni', lat:53.4132, lng:9.6111, price:26.00, notes:'Regenbogenforelle, Goldforelle, Aal | Naturteich mit Insel | forellenseen.de' },
  { name:'Angelsee Sandbostel', type:'see', region:'ni', lat:53.4093, lng:9.1333, price:25.00, notes:'Forellen, Karpfen, Weißfisch | Sehr ruhige ländliche Lage | angelsee-sandbostel.de' },
  { name:'Angelsee Immenbeck', type:'see', region:'ni', lat:53.4767, lng:9.7004, price:30.00, notes:'Regenbogenforelle, Lachsforelle, Saibling | Gut gepflegtes, klares Wasser | angelsee-immenbeck.de' },
  { name:'Weser (Bremen-Stadtstrecke)', type:'fluss', region:'ni', lat:53.0758, lng:8.8072, price:10.00, notes:'Zander, Barsch, Aal, Rapfen, Plattfisch | Tidegewässer mitten in Bremen | hejfish.com' },
  { name:'Elbe (Stade/Drochtersen)', type:'fluss', region:'ni', lat:53.5998, lng:9.4754, price:10.00, notes:'Zander, Aal, Finte, Stint, Kaulbarsch | Sandstrände, Buhnenköpfe, extreme Tide | angelsport-stade.de' },
  { name:'Ilmenau (Lüneburg)', type:'fluss', region:'ni', lat:53.2487, lng:10.4079, price:12.00, notes:'Bachforelle, Äsche, Hecht, Barsch, Aal | Traumhaftes Fliegenfischerrevier | av-lueneburg.de' },
  { name:'Elbe-Seitenkanal (Lüneburg)', type:'kanal', region:'ni', lat:53.2929, lng:10.5068, price:8.00, notes:'Zander, Barsch, Aal, Karpfen | Steile Spundwände, Vertikalangeln | hejfish.com' },
  { name:'Oste (Bremervörde)', type:'fluss', region:'ni', lat:53.485, lng:9.1362, price:9.50, notes:'Hecht, Zander, Barsch, Aal, Meerforelle | Lachs- und Meerforellen-Rückkehrprogramm | hejfish.com' },
  { name:'Vörder See', type:'see', region:'ni', lat:53.485, lng:9.1362, price:10.00, notes:'Zander, Hecht, Großkarpfen, Schleie, Barsch | Künstlicher See mit Parkanlage | hejfish.com' },
  { name:'Wümme (Rotenburg)', type:'fluss', region:'ni', lat:53.1109, lng:9.4049, price:10.00, notes:'Hecht, Barsch, Bachforelle, Aal, Karpfen | Stark mäandrierend, Naturschutzzonen | sfv-rotenburg.de' },
  { name:'Luhe', type:'fluss', region:'ni', lat:53.3636, lng:10.2059, price:15.00, notes:'Bachforelle, Meerforelle, Äsche | Klarer Heidefluss, Watangeln | hejfish.com' },
  { name:'Kreidesee Hemmoor', type:'see', region:'ni', lat:53.6887, lng:9.1595, price:25.00, notes:'Lachsforelle, Seesaibling, Regenbogenforelle | Bis 60m tief, glasklar, Taucherparadies | kreidesee.de' },
  { name:'Aller (Verden)', type:'fluss', region:'ni', lat:52.976, lng:9.1808, price:10.00, notes:'Zander, Hecht, Barsch, Wels, Aal, Barbe | Schnelle Strömung, Barbenregion | hejfish.com' },
  { name:'Angelparadies Kritzow', type:'see', region:'mv', lat:53.4459, lng:12.1318, price:30.00, notes:'Lachsforelle, Goldforelle, Stör, Wels | Sehr saubere Steganlagen | angelparadies-kritzow.de' },
  { name:'Forellenanlage Brahlstorf', type:'see', region:'mv', lat:53.3641, lng:10.9501, price:25.00, notes:'Regenbogenforelle, Lachsforelle | Grenznah zu SH/Lauenburg | forellenseen.de' },
  { name:'Angelteiche Goldenbow', type:'see', region:'mv', lat:53.3981, lng:10.9688, price:26.00, notes:'Forellen, Karpfen, Schleie | Ruhiges Waldgebiet | vellahn.de' },
  { name:'Schweriner Innensee', type:'see', region:'mv', lat:53.6288, lng:11.4148, price:12.00, notes:'Barsch, Hecht, Zander, Große Maräne, Aal | Riesiges Raubfischrevier, tiefes Wasser | lav-mv.de' },
  { name:'Schweriner Außensee', type:'see', region:'mv', lat:53.6919, lng:11.4322, price:12.00, notes:'Hecht, Zander, Großbarsch, Maräne, Aal | Flach- und Tiefenzonen, Krautbetten | lav-mv.de' },
  { name:'Schaalsee (Zarrentin-Anteil)', type:'see', region:'mv', lat:53.4917, lng:10.8948, price:15.00, notes:'Maräne, Hecht, Großbarsch, Aal | MV-Seite, Nationalparkregeln beachten | zarrentin.de' },
  { name:'Goldberger See', type:'see', region:'mv', lat:53.5903, lng:12.0883, price:11.00, notes:'Hecht, Zander, Aal, Karpfen, Schleie | Sehr guter Friedfisch- und Hechtbestand | hejfish.com' },
  { name:'Boizenburger Elbe', type:'fluss', region:'mv', lat:53.3751, lng:10.7232, price:10.00, notes:'Zander, Wels, Rapfen, Aal, Quappe | Grenzflusscharakter, Buhnen | lav-mv.de' },
  { name:'Sude', type:'fluss', region:'mv', lat:53.3751, lng:10.7232, price:9.00, notes:'Hecht, Barsch, Döbel, Aal, Meerforelle | Mündet in die Elbe, starker Fischzug | lav-mv.de' },
  { name:'Sternberger See', type:'see', region:'mv', lat:53.7118, lng:11.8288, price:12.00, notes:'Hecht, Barsch, Zander, Karpfen, Schleie | Durchflossen von der Warnow, sauber | hejfish.com' },
  { name:'Pinnower See', type:'see', region:'mv', lat:53.6021, lng:11.5485, price:10.00, notes:'Hecht, Zander, Barsch, Maräne, Aal | Sehr klares Wasser, steile Kanten | lav-mv.de' },
  { name:'Cambser See', type:'see', region:'mv', lat:53.6965, lng:11.5282, price:11.00, notes:'Hecht, Barsch, Aal, Karpfen | Sehr strukturreich, Krautkanten | hejfish.com' },
  { name:'Neumühler See', type:'see', region:'mv', lat:53.6261, lng:11.3623, price:10.00, notes:'Hecht, Barsch, Schleie, Karpfen, Aal | Schmal und waldreich, windgeschützt | hejfish.com' },
  { name:'Barniner See', type:'see', region:'mv', lat:53.5946, lng:11.6963, price:10.00, notes:'Zander, Hecht, Barsch, Brassen, Karpfen | Trüberes Wasser, ideal für Zander | hejfish.com' },
  { name:'Dümmer See (MV)', type:'see', region:'mv', lat:53.5814, lng:11.209, price:11.00, notes:'Hecht, Barsch, Aal, Schleie, Karpfen | Flach auslaufende Uferzonen, Naturpark | hejfish.com' }
];

const TAGESCHECK_HINT = {
  zander:      { daemmerung:true,  nachtaktiv:true,  bevorzugtWetter:"bedeckt/trüb",        topSaison:["Herbst","Winter"] },
  hecht:       { daemmerung:true,                     bevorzugtWetter:"bedeckt",             topSaison:["Herbst","Frühling"] },
  barsch:      { daemmerung:false,                    bevorzugtWetter:"egal, mag Struktur" },
  forelle:     { daemmerung:true,                     bevorzugtWetter:"bedeckt",             topSaison:["Herbst","Winter","Frühling"] },
  rapfen:      { daemmerung:false,                    bevorzugtWetter:"sonnig, warme Monate" },
  doebel:      { daemmerung:false,                    bevorzugtWetter:"warm" },
  aal:         { daemmerung:true,  nachtaktiv:true,   bevorzugtWetter:"warm, Gewitterstimmung", topSaison:["Sommer"] },
  quappe:      { daemmerung:true,  nachtaktiv:true,   bevorzugtWetter:"kalt, dunkel",        topSaison:["Winter"] },
  karpfen:     { daemmerung:true,                     bevorzugtWetter:"warm, stabil",        topSaison:["Sommer"] },
  schleie:     { daemmerung:false,                    bevorzugtWetter:"warm",                topSaison:["Frühling","Sommer"] },
  rotauge:     { daemmerung:false,                    bevorzugtWetter:"egal" },
  wels:        { daemmerung:true,  nachtaktiv:true,   bevorzugtWetter:"warm",                topSaison:["Sommer"] },
  dorsch:      { daemmerung:false,                    bevorzugtWetter:"Strömung wichtiger als Wetter", topSaison:["Herbst","Winter"] },
  hering:      { daemmerung:false,                    bevorzugtWetter:"egal",                topSaison:["Frühling","Herbst"] },
  wolfsbarsch: { daemmerung:true,                      bevorzugtWetter:"bewegtes Wasser",     topSaison:["Frühling","Sommer","Herbst"] },
  flunder:     { daemmerung:false,                    bevorzugtWetter:"egal",                topSaison:["Sommer","Herbst"] },
  meerforelle: { daemmerung:true,                     bevorzugtWetter:"bewegtes Wasser, leicht bedeckt", topSaison:["Frühling","Herbst"] },
  hornhecht:   { daemmerung:false,                    bevorzugtWetter:"sonnig",              topSaison:["Frühling"] }
};

/* ---------- Wochenend-Planer: vordefinierte Vorhaben ----------
   Bündelt typische Ausflüge zu ein oder mehreren Ansätzen aus FISCHE, damit man
   nicht erst Fisch+Gewässer einzeln durchklicken muss. Verweist per fischId +
   exaktem methode-Text auf den jeweiligen Ansatz (keine Datenduplizierung –
   Montage/Setup/Tipp kommen live aus FISCHE). ---------- */
const VORHABEN = [
  {
    id:"forellenteich", name:"Forellenteich-Tag", emoji:"🐠",
    beschreibung:"Besatzforellen am Put & Take – Spoon oder Sbirolino.",
    einsaetze:[
      {fischId:"forelle", methode:"Trout Area – Spoons"},
      {fischId:"forelle", methode:"Sbirolino / Pose (Forellensee)"}
    ]
  },
  {
    id:"ansitz-karpfen", name:"Ruhiger Ansitz auf Karpfen & Co.", emoji:"🎏",
    beschreibung:"Grund-/Feederangeln mit Futterkorb an See/Kanal – Karpfen, Brasse, Schleie.",
    einsaetze:[
      {fischId:"karpfen", methode:"Grund-/Feederangeln – Futterkorb mit Boilie/Mais"}
    ]
  },
  {
    id:"stippen-weissfisch", name:"Entspanntes Stippen (Weißfisch)", emoji:"🐟",
    beschreibung:"Feines Posenangeln an der Krautkante – Rotauge, Schleie, Brasse.",
    einsaetze:[
      {fischId:"rotauge", methode:"Stippen (Posenangeln)"},
      {fischId:"schleie", methode:"Stippen an der Krautkante"}
    ]
  },
  {
    id:"spinnen-raubfisch", name:"Spinnfischen auf Hecht & Zander", emoji:"🐊",
    beschreibung:"Aktives Spinnfischen mit Gummifisch/Wobbler an Fluss/Kanal/See.",
    einsaetze:[
      {fischId:"hecht", methode:"Spinnfischen – Gummifisch/Wobbler"},
      {fischId:"zander", methode:"Spinnfischen – Gummifisch am Jigkopf (Faulenzen)"}
    ]
  },
  {
    id:"light-game-barsch", name:"Light Game auf Barsch", emoji:"🐟",
    beschreibung:"Leichtes, aktives Jiggen an Kanten und Strukturen.",
    einsaetze:[
      {fischId:"barsch", methode:"Light Game – kleiner Gummifisch/Spinner (aktiv)"}
    ]
  },
  {
    id:"kueste-mefo", name:"Küstentag: Meerforelle & Hornhecht", emoji:"🌊",
    beschreibung:"Küstenspinnen an der Ostsee – weit werfen, Wathose lohnt sich.",
    einsaetze:[
      {fischId:"meerforelle", methode:"Küstenspinnen – Blinker/Küstenwobbler"},
      {fischId:"hornhecht", methode:"Küstenspinnen – kleiner Blinker (mit Wollfaden)"}
    ]
  },
  {
    id:"rapfen-jagd", name:"Rapfen-Jagd an der Oberfläche", emoji:"🐡",
    beschreibung:"Weite, schnelle Würfe an Strömungskanten & Buhnen, wenn der Rapfenschlag zu sehen ist.",
    einsaetze:[
      {fischId:"rapfen", methode:"Spinnfischen – weite Würfe, schnelle Führung"}
    ]
  },
  {
    id:"doebel-spinnen", name:"Döbel am Fließwasser", emoji:"🐟",
    beschreibung:"Leichtes Spinnen auf scheue Döbel knapp unter der Oberfläche.",
    einsaetze:[
      {fischId:"doebel", methode:"Leichtes Spinnen auf große Döbel"}
    ]
  },
  {
    id:"nachtansitz-aal", name:"Nachtansitz auf Aal", emoji:"🐍",
    beschreibung:"Grundangeln auf Tauwurm in warmen Sommernächten – Geduld und Bissanzeiger.",
    einsaetze:[
      {fischId:"aal", methode:"Grundangeln – Tauwurm (Nachtansitz)"}
    ]
  },
  {
    id:"winter-quappe", name:"Winter-Ansitz auf Quappe", emoji:"🐟",
    beschreibung:"Kalte, dunkle Nächte (Nov–Feb) – Grundangeln auf den einzigen heimischen Dorschartigen im Süßwasser.",
    einsaetze:[
      {fischId:"quappe", methode:"Grundangeln – Fisch-/Wurmköder (Winternacht)"}
    ]
  },
  {
    id:"hering-mole", name:"Heringssaison von der Mole", emoji:"🐟",
    beschreibung:"Frühjahr/Herbst mit Mehrhaken-Paternoster von Molen und Häfen.",
    einsaetze:[
      {fischId:"hering", methode:"Heringspaternoster von der Mole"}
    ]
  },
  {
    id:"wolfsbarsch-kueste", name:"Wolfsbarsch-Spinnen an der Küste", emoji:"🐟",
    beschreibung:"Aktives Spinnfischen an Molen, Stränden und im Brackwasser der Eider.",
    einsaetze:[
      {fischId:"wolfsbarsch", methode:"Spinnfischen an der Küste"}
    ]
  },
  {
    id:"wels-ansitz", name:"Wels-Ansitz (noch nicht ausgerüstet)", emoji:"🐋",
    beschreibung:"Europas größter Süßwasserfisch – braucht kräftiges Spezialgerät, das du aktuell noch nicht hast.",
    einsaetze:[
      {fischId:"wels", methode:"Ansitz – Köderfisch/Tauwurmbündel"}
    ]
  },
  {
    id:"kutter-pilken", name:"Pilken vom Kutter (noch nicht ausgerüstet)", emoji:"🐟",
    beschreibung:"Senkrecht gepilkter Dorsch auf hoher See – braucht eine kompakte Pilkrute, die du aktuell noch nicht hast.",
    einsaetze:[
      {fischId:"dorsch", methode:"Pilken vom Kutter"}
    ]
  },
  {
    id:"brandung-flunder", name:"Brandungsangeln auf Flunder (noch nicht ausgerüstet)", emoji:"🐟",
    beschreibung:"Grundmontage mit Wattwurm an Ost-/Nordseestrand – braucht Brandungsrute + Weitwurfrolle, die du aktuell noch nicht hast.",
    einsaetze:[
      {fischId:"flunder", methode:"Brandungsangeln – Grundmontage mit Wattwurm"}
    ]
  }
];
