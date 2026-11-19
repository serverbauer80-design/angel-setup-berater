/* ============================================================
   Wissen: Angelarten mit Montagen
   Jede Angelart: Beschreibung, Ablauf, Profi-Tipps, typische Fehler,
   empfohlenes Gerät und eine oder mehrere Montagen.

   Montage:
     teile:  [{ n: Name, d: Detail, s: Suchwort(e) für „hast du schon“ (Regex-Text) }]
     bild:   Aufbau von oben (Rutenspitze) nach unten (Köder) für das Schaubild:
             [typ, Beschriftung, Zusatz]  – Typen siehe schaubild.js
     schritte: Aufbau in der richtigen Reihenfolge
   ansaetze: [fischId, Index] – Verknüpfung zum Berater (deine passenden Setups)
   ============================================================ */
export const GRUPPEN = [
  { key: "raubfisch", titel: "Raubfisch aktiv", text: "Mit Kunstködern werfen und führen" },
  { key: "forelle",   titel: "Forellensee",     text: "Spoon, Tremarella, Sbirolino" },
  { key: "pose",      titel: "Pose & Stippe",   text: "Bisse an der Pose sehen" },
  { key: "grund",     titel: "Grund & Ansitz",  text: "Köder liegt am Grund, Rute im Halter" },
  { key: "kueste",    titel: "Küste & Meer",    text: "Salzwasser, Wurfweite, schwere Bleie" }
];

export const ANGELARTEN = [
  /* ================= RAUBFISCH ================= */
  {
    id: "faulenzen", gruppe: "raubfisch", name: "Gummifisch am Jigkopf (Faulenzen)",
    kurz: "Der Klassiker auf Zander, auch auf Hecht und Barsch: Gummifisch springt über den Grund.",
    fische: "Zander, Hecht, Barsch",
    beschreibung: [
      "Ein Gummifisch sitzt auf einem Jigkopf – einem Haken mit angegossenem Bleikopf. Du wirfst aus, lässt den Köder bis zum Grund sinken und holst ihn in Sprüngen wieder ein. Jeder Sprung sieht aus wie ein kranker Fisch, der kurz vom Boden abhebt und wieder absinkt.",
      "Beim Faulenzen springt der Köder nicht durch die Rute, sondern durch die Rolle: zwei, drei schnelle Kurbelumdrehungen, dann Pause. In der Pause sinkt der Köder zum Grund – und genau dann beißt der Zander fast immer."
    ],
    ablauf: [
      "Auswerfen, Bügel schließen, Rute auf etwa „10 Uhr“ halten.",
      "Schnur beobachten: Wenn sie erschlafft, liegt der Köder am Grund. Die Zeit bis dahin zählen – das sagt dir die Tiefe.",
      "2–3 zügige Kurbelumdrehungen, dann stoppen. Der Köder sinkt wieder ab.",
      "Jeder Tock, jedes Zupfen oder eine Schnur, die plötzlich seitlich wandert: sofort kräftig anschlagen.",
      "Ab der Kante (dort, wo es flach wird) langsamer werden – dort stehen die Fische."
    ],
    tipps: [
      "Jigkopf so schwer wie nötig, so leicht wie möglich: Der Köder soll 2–3 Sekunden sinken. Sinkt er schneller, ist der Kopf zu schwer.",
      "Geflochtene Schnur ist Pflicht – nur mit ihr spürst du den feinen Biss auf 30 m Entfernung.",
      "In der Dämmerung und bei trübem Wasser ziehen Zander oft flach an die Kante – dann lohnt es sich, ufernah zu fischen.",
      "Beim Hecht immer ein Stahl- oder Titanvorfach vorschalten."
    ],
    fehler: [
      "Zu spät anschlagen – der Zander spuckt den Köder in Sekundenbruchteilen wieder aus.",
      "Ohne Grundkontakt fischen: Wenn du den Grund nicht spürst, ist der Kopf zu leicht oder die Strömung zu stark.",
      "Rute in der Absinkphase zu hoch halten – dann siehst du den Biss in der Schnur nicht."
    ],
    geraet: { rute: "2,40–2,70 m, Wurfgewicht ca. 10–50 g (je nach Gewässer), straffe Spitze", rolle: "Größe 2500–4000", schnur: "Geflecht 0,10–0,16 mm (ca. 6–12 kg)" },
    ansaetze: [["zander", 0], ["hecht", 0], ["barsch", 1]],
    montagen: [
      {
        name: "Zander-Faulenzmontage", wofuer: "Zander und Barsch an Kanal, See und Fluss",
        teile: [
          { n: "Geflochtene Hauptschnur", d: "0,10–0,16 mm", s: "braid|geflecht" },
          { n: "Fluorocarbon-Vorfach", d: "0,26–0,30 mm, 80–100 cm", s: "fluoro" },
          { n: "Snap ohne Wirbel", d: "Größe 1–2, mind. 15 kg", s: "snap" },
          { n: "Jigköpfe", d: "7–12 g See/Kanal · 12–20 g Fluss · 20–30 g Elbe", s: "jigk" },
          { n: "Gummifische", d: "10–13 cm, schlanke Form (Shad)", s: "shiner|gummifisch|kogha hecht" }
        ],
        bild: [
          ["rute", "Rutenspitze"],
          ["schnur", "Geflecht 0,12 mm", "geflecht"],
          ["knoten", "FG-Knoten"],
          ["vorfach", "Fluorocarbon 0,28 mm · 80–100 cm", "fc"],
          ["knoten", "Clinch-Knoten"],
          ["snap", "Snap (ohne Wirbel)"],
          ["jig", "Jigkopf 12 g + Gummifisch 12 cm"]
        ],
        schritte: [
          "Geflochtene und Fluorocarbon mit dem FG- oder Albright-Knoten verbinden – flach, damit er durch die Ringe gleitet.",
          "Snap mit einem Clinch-Knoten (5–6 Windungen) ans Vorfach binden, Knoten vor dem Festziehen anfeuchten.",
          "Gummifisch gerade auf den Jigkopf ziehen: Haken an der Bauchmitte austreten lassen, der Köder darf nicht krumm sitzen.",
          "Jigkopf in den Snap hängen – so wechselst du Gewicht und Köder in Sekunden."
        ]
      },
      {
        name: "Hecht-Variante mit Stahlvorfach", wofuer: "Hecht – wo Hechte vorkommen immer mit Stahl",
        teile: [
          { n: "Geflochtene Hauptschnur", d: "0,14–0,18 mm", s: "braid|geflecht" },
          { n: "Stahl- oder Titanvorfach", d: "30–40 cm, 10–15 kg, mit Snap", s: "stahl|titan" },
          { n: "Jigköpfe", d: "10–20 g, Hakengröße 4/0–6/0", s: "jigk" },
          { n: "Gummifische", d: "12–18 cm", s: "shiner|gummifisch|kogha hecht" }
        ],
        bild: [
          ["rute", "Rutenspitze"],
          ["schnur", "Geflecht 0,16 mm", "geflecht"],
          ["knoten", "Palomar-Knoten"],
          ["wirbel", "Wirbel"],
          ["vorfach", "Stahlvorfach 30–40 cm", "stahl"],
          ["snap", "Snap"],
          ["jig", "Jigkopf 15 g + Gummifisch 15 cm"]
        ],
        schritte: [
          "Geflochtene mit dem Palomar-Knoten an den Wirbel des Stahlvorfachs binden.",
          "Jigkopf in den Snap hängen und Snap schließen – Snap vor jedem Wurf kontrollieren.",
          "Abhakzange und Handschuh griffbereit legen, bevor du den ersten Wurf machst."
        ]
      }
    ]
  },
  {
    id: "spinnfischen", gruppe: "raubfisch", name: "Spinnfischen mit Wobbler, Blinker & Spinner",
    kurz: "Köder auswerfen und gleichmäßig oder mit Pausen einholen – aktiv das Wasser absuchen.",
    fische: "Hecht, Barsch, Rapfen, Döbel, Forelle",
    beschreibung: [
      "Beim Spinnfischen arbeitet der Köder selbst: Der Wobbler taumelt durch seine Tauchschaufel, der Blinker flankt, das Spinnerblatt dreht sich. Du suchst damit große Flächen ab und findest aktive Fische.",
      "Entscheidend sind Tiefe und Tempo. Ein Profi wählt den Köder so, dass er knapp über Kraut oder Grund läuft, und variiert das Tempo, bis die Fische reagieren."
    ],
    ablauf: [
      "Fächerförmig werfen: erst ufernah, dann in Etappen weiter hinaus.",
      "Gleichmäßig einholen, zwischendurch kurze Stopps oder Tempowechsel einbauen – der Biss kommt oft genau beim Wiederanlaufen.",
      "Am Ende des Wurfs den Köder nicht sofort herausreißen: Hechte folgen oft bis vor die Füße.",
      "Nach 10–15 Würfen ohne Kontakt die Stelle oder die Ködertiefe wechseln."
    ],
    tipps: [
      "Trübes Wasser: auffällige Farben und Köder mit Druck (breiter Spinner, laut rasselnder Wobbler). Klares Wasser: natürliche Farben, schlanke Köder.",
      "Spinner drehen die Schnur ein – immer mit Wirbel fischen, beim Blinker und Wobbler reicht ein Snap.",
      "Im Herbst und Winter langsamer und tiefer fischen, im Sommer schneller und flacher."
    ],
    fehler: [
      "Zu schnell einholen – vor allem bei kaltem Wasser.",
      "Ohne Stahlvorfach fischen, wo Hechte vorkommen.",
      "Immer an derselben Stelle stehen bleiben."
    ],
    geraet: { rute: "2,10–2,70 m, Wurfgewicht passend zum Köder (Barsch 5–20 g, Hecht 20–60 g)", rolle: "Größe 2000–4000", schnur: "Geflecht 0,08–0,16 mm" },
    ansaetze: [["hecht", 0], ["barsch", 2], ["rapfen", 0], ["doebel", 0]],
    montagen: [
      {
        name: "Wobbler- / Blinkermontage", wofuer: "Barsch, Rapfen, Döbel (ohne Hecht im Gewässer)",
        teile: [
          { n: "Geflochtene Hauptschnur", d: "0,08–0,14 mm", s: "braid|geflecht" },
          { n: "Fluorocarbon-Vorfach", d: "0,22–0,30 mm, 60–100 cm", s: "fluoro" },
          { n: "Snap", d: "klein, ohne Wirbel (Wobbler) bzw. mit Wirbel (Spinner)", s: "snap|wirbel" },
          { n: "Wobbler, Blinker oder Spinner", d: "5–25 g passend zur Rute", s: "wobbler|blinker|spinner" }
        ],
        bild: [
          ["rute", "Rutenspitze"],
          ["schnur", "Geflecht 0,10 mm", "geflecht"],
          ["knoten", "FG-Knoten"],
          ["vorfach", "Fluorocarbon 0,25 mm · 80 cm", "fc"],
          ["snap", "Snap"],
          ["wobbler", "Wobbler 7–10 cm"]
        ],
        schritte: [
          "Fluorocarbon-Vorfach mit FG- oder Albright-Knoten an die Geflochtene.",
          "Snap mit Clinch-Knoten anbinden.",
          "Köder einhängen; beim Spinner einen kleinen Wirbel statt des einfachen Snaps nehmen."
        ]
      }
    ]
  },
  {
    id: "dropshot", gruppe: "raubfisch", name: "Dropshot",
    kurz: "Blei unten, Köder darüber: Der Köder zittert auf der Stelle vor dem Fischmaul.",
    fische: "Barsch, Zander",
    beschreibung: [
      "Beim Dropshot sitzt das Blei ganz unten am Ende der Schnur, der Haken mit dem Köder 20–60 cm darüber. Das Blei bleibt am Grund liegen, und du lässt den Köder mit leichten Bewegungen der Rutenspitze auf der Stelle tanzen.",
      "Die Methode ist ideal, wenn die Fische träge sind, an Spundwänden, Steganlagen, Brückenpfeilern oder vom Boot senkrecht."
    ],
    ablauf: [
      "Auswerfen oder senkrecht ablassen, bis das Blei am Grund liegt.",
      "Schnur leicht spannen – nicht straff. Mit der Rutenspitze kleine Zitterbewegungen machen, das Blei bleibt liegen.",
      "Ein paar Sekunden Pause, dann das Blei 30–50 cm weiterziehen und wiederholen.",
      "Biss: oft nur ein leichtes Gewicht in der Spitze – Rute anheben statt hart anzuschlagen."
    ],
    tipps: [
      "Der Abstand Haken–Blei bestimmt, wie hoch der Köder steht: 20–30 cm bei Barschen am Grund, 50–80 cm bei Kraut.",
      "Der Haken sitzt am besten mit dem Palomar-Knoten so, dass die Spitze nach oben zeigt.",
      "Kleine Gummiköder (5–8 cm) quer im Maul (Nose-Hooking) haken – so bewegen sie sich am natürlichsten."
    ],
    fehler: [
      "Zu viel Bewegung – der Köder soll zittern, nicht springen.",
      "Zu schwere Bleie: Das Blei soll gerade eben liegen bleiben."
    ],
    geraet: { rute: "2,10–2,40 m, Wurfgewicht 3–15 g, schnelle Spitze", rolle: "Größe 1000–2500", schnur: "Geflecht 0,06–0,10 mm + Fluorocarbon" },
    ansaetze: [["barsch", 0]],
    montagen: [
      {
        name: "Dropshot-Montage", wofuer: "Barsch an Spundwand, Kante und Steg",
        teile: [
          { n: "Geflochtene Hauptschnur", d: "0,06–0,10 mm", s: "braid|geflecht" },
          { n: "Fluorocarbon", d: "0,20–0,25 mm, ca. 1 m", s: "fluoro" },
          { n: "Dropshot-Haken", d: "Größe 4–1", s: "dropshot" },
          { n: "Dropshot-Blei", d: "3–7 g See · 7–14 g Strömung", s: "dropshot" },
          { n: "Gummiköder", d: "5–8 cm (Shad, Wurm, Krebs)", s: "gummiköder|micro-köder|shiner" }
        ],
        bild: [
          ["rute", "Rutenspitze"],
          ["schnur", "Geflecht 0,08 mm", "geflecht"],
          ["knoten", "FG-Knoten"],
          ["vorfach", "Fluorocarbon 0,22 mm", "fc"],
          ["seitenhaken", "Haken mit Palomar-Knoten · Köder quer gehakt"],
          ["vorfach", "30–50 cm Abstand", "fc"],
          ["dropshotblei", "Dropshot-Blei 5 g (klemmt in der Öse)"]
        ],
        schritte: [
          "Fluorocarbon an die Geflochtene knoten.",
          "Haken mit dem Palomar-Knoten binden und das lange Ende NICHT abschneiden – es wird zur Bleischnur.",
          "Das lange Ende durch die Hakenöse von oben zurückführen, damit die Hakenspitze nach oben zeigt.",
          "Blei 30–50 cm tiefer in die Klemmöse einhängen, Köder quer durch die Nase haken."
        ]
      }
    ]
  },

  /* ================= FORELLENSEE ================= */
  {
    id: "troutarea", gruppe: "forelle", name: "Trout Area (Spoon-Fischen)",
    kurz: "Kleine Metallspoons ganz langsam führen – die feinste Art, Forellen zu fangen.",
    fische: "Regenbogenforelle, Bachforelle, Saibling",
    beschreibung: [
      "Spoons sind kleine, leichte Blinker (1–4 g), die mit ultraleichtem Gerät geführt werden. Am Forellensee ist das die erfolgreichste aktive Methode, weil Besatzforellen auf kleine, gleichmäßig taumelnde Köder reagieren.",
      "Die Kunst liegt im Tempo und in der Farbe: Sobald eine Farbe nicht mehr fängt, wechselt der Profi – oft im 10-Minuten-Takt."
    ],
    ablauf: [
      "Weit auswerfen, Köder auf die gewünschte Tiefe absinken lassen (zählen!).",
      "Sehr gleichmäßig und langsam einholen – der Spoon soll gerade eben taumeln.",
      "Nachläufer? Tempo minimal erhöhen oder kurz stoppen.",
      "Biss: Weiterkurbeln, nicht anschlagen! Die Forelle hakt sich selbst, ein harter Anhieb reißt den kleinen Haken aus."
    ],
    tipps: [
      "Farbwechsel ist wichtiger als Köderwechsel: von gedeckt (oliv, braun) zu grell (orange, pink) und zurück.",
      "Schonhaken (ohne Widerhaken) sind an vielen Anlagen Pflicht – und schonen untermaßige Fische.",
      "Morgens oft oberflächennah, mittags tiefer fischen."
    ],
    fehler: ["Zu schnell einholen.", "Anschlagen wie beim Zander.", "Bremse zu fest – dünne Schnur und kleine Haken brauchen eine weiche Bremse."],
    geraet: { rute: "1,80–2,40 m, Wurfgewicht ca. 0,5–6 g, weiche Aktion", rolle: "Größe 1000–2000", schnur: "Mono 0,14–0,18 mm oder Geflecht 0,04–0,08 mm + Fluorocarbon" },
    ansaetze: [["forelle", 0], ["forelle", 1]],
    montagen: [
      {
        name: "Spoon-Montage", wofuer: "Forellensee, aktive Forellen",
        teile: [
          { n: "Hauptschnur", d: "Mono 0,16 mm oder Geflecht 0,06 mm", s: "mono|gtm|braid|geflecht" },
          { n: "Fluorocarbon-Vorfach", d: "0,16–0,18 mm, 1–1,5 m (nur bei Geflecht)", s: "fluoro" },
          { n: "Micro-Snap ohne Wirbel", d: "Größe 00–0", s: "snap" },
          { n: "Spoons", d: "1,5–3,5 g in mehreren Farben", s: "spoon" }
        ],
        bild: [
          ["rute", "Rutenspitze"],
          ["schnur", "Geflecht 0,06 mm", "geflecht"],
          ["knoten", "FG-Knoten"],
          ["vorfach", "Fluorocarbon 0,16 mm · 1–1,5 m", "fc"],
          ["snap", "Micro-Snap (ohne Wirbel)"],
          ["spoon", "Spoon 2,5 g"]
        ],
        schritte: [
          "Bei Geflecht: langes Fluorocarbon-Vorfach mit FG- oder Albright-Knoten anbinden. Bei Mono kann die Schnur direkt zum Snap.",
          "Micro-Snap mit Clinch-Knoten binden – KEIN Wirbel, er stört das Taumeln.",
          "Spoon einhängen, Bremse so einstellen, dass sie bei kräftigem Zug an der Schnur gerade nachgibt."
        ]
      }
    ]
  },
  {
    id: "tremarella", gruppe: "forelle", name: "Tremarella",
    kurz: "Lange, weiche Rute in ständiger Vibration – die Larve zittert langsam durchs Wasser.",
    fische: "Forelle am Forellensee",
    beschreibung: [
      "Tremarella kommt aus Italien. Ein spezielles, länglich-gewelltes Blei (Bombarde- oder Tremarella-Blei) sitzt auf der Hauptschnur, dahinter folgt ein langes Fluorocarbon-Vorfach mit Haken und Köder (Bienenmade, Teigwurm oder Gummilarve).",
      "Beim Einholen wird die lange Rute mit kleinen Handbewegungen in Schwingung versetzt. Das Blei taumelt, und der Köder zittert hinterher – sehr langsam, wie ein Insekt."
    ],
    ablauf: [
      "Auswerfen und bis zur gewünschten Tiefe absinken lassen.",
      "Rute schräg nach oben halten und mit dem Handgelenk in gleichmäßige Vibration versetzen, dabei sehr langsam kurbeln.",
      "Biss: Die Spitze stoppt oder zieht – Rute anheben, nicht hart anschlagen."
    ],
    tipps: [
      "Mehrere Ruten mit unterschiedlich schweren Bleien vorbereiten – Tiefe wechselst du durch Rutenwechsel statt Umbauen.",
      "Langes, feines Vorfach (1,5–3 m) bringt mehr Bisse."
    ],
    fehler: ["Zu schnell kurbeln – Tremarella ist die langsamste Methode am See.", "Zu kurzes Vorfach."],
    geraet: { rute: "3,60–4,20 m, Wurfgewicht ca. 1–8 g, parabolisch", rolle: "Größe 1000–2500", schnur: "Mono 0,14–0,18 mm" },
    ansaetze: [["forelle", 1]],
    montagen: [
      {
        name: "Tremarella-Montage", wofuer: "Forellensee",
        teile: [
          { n: "Monofile Hauptschnur", d: "0,14–0,18 mm", s: "mono|gtm" },
          { n: "Tremarella-Blei", d: "1–6 g", s: "tremarella" },
          { n: "Gummiperle", d: "3–4 mm", s: "perle" },
          { n: "Kleiner Wirbel", d: "Größe 14–18", s: "wirbel" },
          { n: "Fluorocarbon-Vorfach", d: "0,12–0,16 mm, 1,5–3 m", s: "fluoro" },
          { n: "Haken", d: "Größe 8–12", s: "\\bhaken\\b" },
          { n: "Köder", d: "Bienenmade, Teigwurm, Gummilarve", s: "master worm|larve|\\bmade\\b" }
        ],
        bild: [
          ["rute", "Rutenspitze"],
          ["schnur", "Mono 0,16 mm", "mono"],
          ["tremarella", "Tremarella-Blei 3 g (läuft frei)"],
          ["perle", "Gummiperle"],
          ["wirbel", "Wirbel Gr. 16"],
          ["vorfach", "Fluorocarbon 0,14 mm · 2 m", "fc"],
          ["haken", "Haken Gr. 10"],
          ["koeder", "Bienenmade / Teigwurm"]
        ],
        schritte: [
          "Blei auf die Hauptschnur fädeln, dann die Gummiperle (schützt den Knoten).",
          "Wirbel mit Clinch-Knoten anbinden.",
          "Langes Fluorocarbon-Vorfach mit Haken in den Wirbel knoten.",
          "Köder so aufziehen, dass die Hakenspitze gerade eben frei liegt."
        ]
      }
    ]
  },
  {
    id: "sbirolino", gruppe: "forelle", name: "Sbirolino",
    kurz: "Ein Schwimmkörper als Wurfgewicht bringt leichte Köder weit hinaus und langsam zurück.",
    fische: "Forelle (Forellensee), auch Meerforelle",
    beschreibung: [
      "Der Sbirolino ist ein länglicher Kunststoffkörper, der als Wurfgewicht dient. Er kann schwimmen, langsam oder schnell sinken. Dahinter folgt ein sehr langes Vorfach mit auftreibendem Teig, Bienenmade oder Fliege.",
      "So präsentierst du einen fast schwerelosen Köder in genau der Tiefe, in der die Forellen stehen – und das auf 40 m Entfernung."
    ],
    ablauf: [
      "Weit auswerfen, Sbirolino je nach Typ absinken lassen.",
      "Sehr langsam einholen, gern mit kurzen Zupfern und Pausen.",
      "Biss: Weiterkurbeln, bis die Rute sich krümmt – erst dann leicht anheben."
    ],
    tipps: [
      "Schwimmender Sbiro: Köder oben. Sinkender Sbiro: Zählmethode wie beim Spoon.",
      "Vorfach 1,5–2,5 m – je klarer das Wasser, desto länger.",
      "Gute Wahl, wenn die Forellen auf Spoons nicht mehr reagieren."
    ],
    fehler: ["Vorfach zu kurz.", "Zu schnelles Einholen.", "Knoten ohne Perle – der Sbiro schlägt ihn beim Wurf kaputt."],
    geraet: { rute: "3,60–4,20 m, Wurfgewicht ca. 5–30 g, weiche Aktion", rolle: "Größe 2500–3000", schnur: "Mono 0,20–0,25 mm" },
    ansaetze: [["forelle", 2]],
    montagen: [
      {
        name: "Sbirolino-Montage", wofuer: "Forellensee",
        teile: [
          { n: "Monofile Hauptschnur", d: "0,20–0,25 mm", s: "mono|gtm" },
          { n: "Sbirolino", d: "10–25 g, schwimmend oder sinkend", s: "sbiro" },
          { n: "Gummiperle", d: "4–6 mm", s: "perle" },
          { n: "Wirbel", d: "Größe 12–14", s: "wirbel" },
          { n: "Fluorocarbon-Vorfach", d: "0,16–0,20 mm, 1,5–2,5 m", s: "fluoro" },
          { n: "Haken", d: "Größe 6–10", s: "\\bhaken\\b" },
          { n: "Forellenteig (auftreibend)", d: "z. B. PowerBait", s: "powerbait|forellenteig\\b" }
        ],
        bild: [
          ["rute", "Rutenspitze"],
          ["schnur", "Mono 0,22 mm", "mono"],
          ["sbiro", "Sbirolino 15 g (läuft frei)"],
          ["perle", "Gummiperle"],
          ["wirbel", "Wirbel"],
          ["vorfach", "Fluorocarbon 0,18 mm · 2 m", "fc"],
          ["haken", "Haken Gr. 8"],
          ["teig", "auftreibender Forellenteig"]
        ],
        schritte: [
          "Sbirolino mit der dünnen Seite nach vorn (Richtung Köder) auf die Hauptschnur fädeln.",
          "Gummiperle aufziehen, dann den Wirbel anknoten.",
          "Langes Vorfach mit Haken einhängen, Teig zu einer Kugel um den Haken formen."
        ]
      }
    ]
  },

  /* ================= POSE & STIPPE ================= */
  {
    id: "laufpose", gruppe: "pose", name: "Laufpose",
    kurz: "Pose mit Stopper – die Tiefe ist frei einstellbar, auch tiefer als die Rute lang ist.",
    fische: "Forelle, Schleie, Barsch, Hecht (Köderfisch), Zander",
    beschreibung: [
      "Bei der Laufpose gleitet die Pose frei auf der Schnur und wird von einem Stopper auf der gewünschten Tiefe gestoppt. So kannst du in 5 m Tiefe angeln und trotzdem bequem werfen.",
      "Die Pose zeigt dir jeden Biss: Sie zuckt, wandert oder taucht ab. Die Tragkraft der Pose muss genau zum Blei passen – dann reagiert sie auf den feinsten Zupfer."
    ],
    ablauf: [
      "Wassertiefe ausloten (Lotblei am Haken), Stopper so setzen, dass der Köder knapp über Grund schwebt.",
      "Werfen, Schnur straffen, Rute ablegen oder halten.",
      "Biss: Warten, bis die Pose abtaucht oder zügig wegzieht, dann anschlagen. Beim Hecht mit Köderfisch nicht zu lange warten."
    ],
    tipps: [
      "Pose so ausbleien, dass nur die Antenne aus dem Wasser schaut.",
      "Bei Wind die Schnur nach dem Wurf unter Wasser ziehen (Rutenspitze eintauchen), damit die Pose nicht treibt.",
      "Ein Fühlerblei (kleinstes Schrot ganz unten) zeigt auch Heber-Bisse an: Die Pose steigt dann statt abzutauchen."
    ],
    fehler: ["Pose zu schwer bebleit oder zu wenig – sie liegt flach oder geht von allein unter.", "Tiefe nicht ausgelotet."],
    geraet: { rute: "3,00–4,20 m, Wurfgewicht 5–30 g", rolle: "Größe 2500–4000, gern mit Freilauf", schnur: "Mono 0,18–0,30 mm" },
    ansaetze: [["forelle", 3], ["schleie", 2], ["hecht", 1]],
    montagen: [
      {
        name: "Laufpose für Forelle & Schleie", wofuer: "Forellensee, Schleie an der Krautkante",
        teile: [
          { n: "Monofile Hauptschnur", d: "0,18–0,25 mm", s: "mono|gtm" },
          { n: "Schnurstopper", d: "Silikon, passend zur Schnur", s: "stopper" },
          { n: "Gummiperle", d: "3–4 mm", s: "perle" },
          { n: "Laufpose", d: "3–8 g Tragkraft", s: "laufpose" },
          { n: "Bleischrot", d: "passend zur Posen-Tragkraft", s: "schrot" },
          { n: "Wirbel", d: "Größe 12–16", s: "wirbel" },
          { n: "Vorfach mit Haken", d: "0,16–0,20 mm, 40–80 cm, Haken Gr. 6–12", s: "vorfachset" },
          { n: "Köder", d: "Forellenteig, Wurm, Made, Mais", s: "powerbait|forellenteig\\b|master worm|\\bmade\\b" }
        ],
        bild: [
          ["rute", "Rutenspitze"],
          ["schnur", "Mono 0,20 mm", "mono"],
          ["stopper", "Stopper = Tiefe"],
          ["perle", "Perle"],
          ["pose", "Laufpose 4 g"],
          ["schrot", "Bleischrot (Hauptlast)"],
          ["wirbel", "Wirbel"],
          ["vorfach", "Vorfach 0,18 mm · 60 cm", "mono"],
          ["schrot", "Fühlerblei", "klein"],
          ["haken", "Haken Gr. 8"],
          ["koeder", "Wurm / Teig / Mais"]
        ],
        schritte: [
          "Stopper auf die Hauptschnur schieben, dann Perle, dann die Pose durch ihre Öse fädeln.",
          "Wirbel anknoten, die Hauptlast des Bleis direkt über dem Wirbel anklemmen.",
          "Vorfach einhängen, ein kleines Fühlerblei 10–15 cm über dem Haken.",
          "Tiefe ausloten und den Stopper verschieben, bis der Köder knapp über Grund steht."
        ]
      },
      {
        name: "Hecht-Köderfischpose", wofuer: "Hecht im Herbst und Winter",
        teile: [
          { n: "Hauptschnur", d: "Mono 0,30–0,35 mm oder Geflecht 0,16–0,20 mm", s: "mono|braid|geflecht" },
          { n: "Schnurstopper + 2 Perlen", d: "", s: "stopper|perle" },
          { n: "Hechtpose", d: "10–25 g Tragkraft", s: "hechtpose" },
          { n: "Laufblei / Olive", d: "passend zur Pose", s: "laufblei|olive" },
          { n: "Stahlvorfach", d: "40–50 cm, mit Wirbel", s: "stahl" },
          { n: "Drilling oder Einzelhaken", d: "Gr. 4–1/0", s: "drilling|\\bhaken\\b" },
          { n: "Toter Köderfisch", d: "10–15 cm (lebender Köderfisch ist verboten)", s: "" }
        ],
        bild: [
          ["rute", "Rutenspitze"],
          ["schnur", "Mono 0,30 mm", "mono"],
          ["stopper", "Stopper"],
          ["perle", "Perle"],
          ["pose", "Hechtpose 15 g", "gross"],
          ["perle", "Perle"],
          ["laufblei", "Olive 10 g"],
          ["wirbel", "Wirbel"],
          ["vorfach", "Stahlvorfach 40 cm", "stahl"],
          ["drilling", "Drilling Gr. 2"],
          ["koederfisch", "toter Köderfisch"]
        ],
        schritte: [
          "Stopper, Perle, Pose, Perle und Olive auf die Hauptschnur fädeln.",
          "Wirbel anknoten, Stahlvorfach einhängen.",
          "Köderfisch am Rücken anködern, Tiefe so wählen, dass er etwa einen halben Meter über Grund oder Kraut schwebt.",
          "Bei Biss nicht zu lange warten (ca. 30–60 Sekunden), damit der Hecht nicht tief schluckt."
        ]
      }
    ]
  },
  {
    id: "stippen", gruppe: "pose", name: "Stippen",
    kurz: "Feine Pose an fester Schnur, ganz ohne Rolle – die präziseste Art, Weißfische zu fangen.",
    fische: "Rotauge, Rotfeder, Brasse, Schleie, Köderfische",
    beschreibung: [
      "Beim Stippen ist die Schnur fest an der Rutenspitze (oft über einen Gummizug) befestigt. Die Rute ist lang (4–8 m), der Köder wird genau an der gefütterten Stelle angeboten.",
      "Weil Pose und Bleie sehr fein abgestimmt werden, siehst du auch winzige Bisse. Stippen ist die Grundschule des Angelns."
    ],
    ablauf: [
      "Tiefe ausloten, die Pose so einstellen, dass der Köder knapp über oder auf dem Grund liegt.",
      "Ein paar Futterballen an die Stelle werfen.",
      "Montage über dem Futter ablegen, die Pose beobachten.",
      "Biss: kurzer Anhieb aus dem Handgelenk, Fisch über den Gummizug ausdrillen und reinschwingen."
    ],
    tipps: [
      "Die Schnur sollte etwas kürzer als die Rute sein, damit du den Fisch zu dir schwingen kannst.",
      "Ständig wenig nachfüttern statt einmal viel.",
      "Feine Haken (Gr. 14–18) und dünne Vorfächer bringen deutlich mehr Bisse."
    ],
    fehler: ["Grobes Gerät.", "Zu viel Futter auf einmal."],
    geraet: { rute: "Stipprute 4–8 m", rolle: "keine", schnur: "Mono 0,10–0,14 mm, Gummizug" },
    ansaetze: [["rotauge", 0], ["schleie", 0]],
    montagen: [
      {
        name: "Stippmontage", wofuer: "Rotauge und Schleie",
        teile: [
          { n: "Gummizug / Schnurverbinder", d: "an der Rutenspitze", s: "gummizug" },
          { n: "Hauptschnur", d: "Mono 0,10–0,14 mm", s: "mono|fertigmontage" },
          { n: "Stipp-Pose", d: "0,5–3 g", s: "fertigmontage|stipp-pose" },
          { n: "Bleischrot", d: "fein, 0,1–0,4 g", s: "schrot" },
          { n: "Vorfach mit Haken", d: "0,08–0,12 mm, Haken Gr. 14–18", s: "vorfachset" },
          { n: "Köder", d: "Made, Mais, Teig", s: "\\bmade\\b|powerbait" }
        ],
        bild: [
          ["rute", "Stipprute (ohne Rolle)"],
          ["schnur", "Mono 0,12 mm · fest an der Spitze", "mono"],
          ["pose", "Stipp-Pose 1 g", "fein"],
          ["schrot", "Bleikette"],
          ["schlaufe", "Schlaufe-in-Schlaufe"],
          ["vorfach", "Vorfach 0,10 mm · 25 cm", "mono"],
          ["schrot", "Fühlerblei", "klein"],
          ["haken", "Haken Gr. 16"],
          ["koeder", "Made"]
        ],
        schritte: [
          "Schnur über Schlaufe am Gummizug bzw. an der Spitze einhängen.",
          "Pose aufziehen (oben und unten mit Silikonschlauch fixiert).",
          "Bleischrot als Kette unter die Pose klemmen, bis nur die Antenne herausschaut.",
          "Vorfach per Schlaufe-in-Schlaufe anhängen, Fühlerblei kurz über dem Vorfach."
        ]
      }
    ]
  },

  /* ================= GRUND & ANSITZ ================= */
  {
    id: "feeder", gruppe: "grund", name: "Feederangeln & Method-Feeder",
    kurz: "Futterkorb bringt Futter und Köder an dieselbe Stelle – Bisse zeigt die Bibberspitze.",
    fische: "Brasse, Rotauge, Schleie, Karpfen",
    beschreibung: [
      "Beim Feedern ersetzt ein Futterkorb das Blei. Bei jedem Wurf landet frisches Futter genau neben dem Hakenköder. Der Biss wird an der feinen, farbigen Spitze der Rute (Bibber- oder Quivertip) angezeigt.",
      "Der Method-Feeder ist eine Sonderform: Das Futter wird um einen flachen Korb gepresst, der Köder steckt direkt im Futter. Der Fisch hakt sich am Gewicht des Korbs oft selbst – perfekt für Karpfen und Schleien."
    ],
    ablauf: [
      "Einen festen Punkt am anderen Ufer anpeilen und die Schnur im Clip der Rolle fixieren – so triffst du immer dieselbe Stelle.",
      "Die ersten 8–10 Würfe in kurzen Abständen zum Anfüttern.",
      "Rute im Halter fast waagerecht, Schnur leicht gespannt, Spitze leicht gebogen.",
      "Biss: Spitze zittert oder schlägt aus – kurz anheben, nicht weit ausholen."
    ],
    tipps: [
      "Die Spitze nach Strömung und Wind wählen: so weich wie möglich, so hart wie nötig.",
      "Beim Method-Feeder kurze Vorfächer (8–12 cm) – dann hakt sich der Fisch selbst.",
      "Ruhig auf jeden Wurf achten: Der erste Biss kommt oft schon nach wenigen Minuten."
    ],
    fehler: ["Ohne Schnurclip werfen – das Futter verteilt sich über den ganzen See.", "Zu lange Vorfächer am Method-Feeder."],
    geraet: { rute: "Feeder-Rute 3,30–3,90 m mit Wechselspitzen", rolle: "Größe 3000–4000", schnur: "Mono 0,20–0,25 mm oder Geflecht 0,10–0,12 mm" },
    ansaetze: [["karpfen", 1], ["schleie", 1], ["rotauge", 1]],
    montagen: [
      {
        name: "Method-Feeder (Inline)", wofuer: "Karpfen und Schleie",
        teile: [
          { n: "Hauptschnur", d: "Mono 0,22–0,25 mm", s: "mono|gtm" },
          { n: "Method-Feeder inline", d: "30–60 g", s: "method" },
          { n: "Gummi-Stopper / Schnellwechselwirbel", d: "steckt im Korb", s: "wirbel|stopper" },
          { n: "Haar-Vorfach", d: "8–12 cm, Haken Gr. 10–14", s: "haar" },
          { n: "Method-Futter", d: "Pellets oder Futtermix", s: "futter|pellet" },
          { n: "Köder", d: "Pellet, Mais oder kleiner Boilie am Haar", s: "mais|pellet|boilie" }
        ],
        bild: [
          ["rute", "Feeder-Rute mit Bibberspitze"],
          ["schnur", "Mono 0,22 mm", "mono"],
          ["method", "Method-Feeder 40 g · Futter angepresst"],
          ["wirbel", "Schnellwechsel-Wirbel (im Korb)"],
          ["vorfach", "Vorfach 10 cm", "mono"],
          ["haar", "Haken + Haar mit Pellet"]
        ],
        schritte: [
          "Hauptschnur durch den Method-Feeder fädeln, Schnellwechsel-Wirbel anknoten und in den Korb ziehen.",
          "Haar-Vorfach in den Wirbel einhängen.",
          "Futter mit der Form um den Korb pressen und den Köder in das Futter drücken."
        ]
      },
      {
        name: "Klassischer Futterkorb (Laufmontage)", wofuer: "Brasse und Rotauge auf Distanz",
        teile: [
          { n: "Hauptschnur", d: "Mono 0,20 mm oder Geflecht 0,10 mm", s: "mono|braid|geflecht" },
          { n: "Feeder-Boom oder Seitenarm", d: "", s: "\\bboom" },
          { n: "Futterkorb", d: "20–60 g", s: "futterkorb" },
          { n: "Gummiperle + Wirbel", d: "", s: "perle|wirbel" },
          { n: "Vorfach mit Haken", d: "0,14–0,16 mm, 50–80 cm, Gr. 12–16", s: "vorfachset" },
          { n: "Köder", d: "Made, Mais, Wurm", s: "\\bmade\\b|mais\\b|tauwurm" }
        ],
        bild: [
          ["rute", "Feeder-Rute mit Bibberspitze"],
          ["schnur", "Mono 0,20 mm", "mono"],
          ["korb", "Futterkorb 30 g am Seitenarm (läuft frei)"],
          ["perle", "Gummiperle"],
          ["wirbel", "Wirbel"],
          ["vorfach", "Vorfach 0,14 mm · 60 cm", "mono"],
          ["haken", "Haken Gr. 14"],
          ["koeder", "Made / Mais"]
        ],
        schritte: [
          "Seitenarm (Boom) mit Korb auf die Hauptschnur fädeln, dann eine Perle.",
          "Wirbel anknoten, Vorfach einhängen.",
          "Korb mit Futter füllen, nicht zu fest pressen, damit es am Grund herausfällt."
        ]
      }
    ]
  },
  {
    id: "grundangeln", gruppe: "grund", name: "Grundangeln mit Laufblei",
    kurz: "Der Köder liegt am Grund, der Fisch zieht Schnur durch das Blei, ohne Widerstand zu spüren.",
    fische: "Aal, Zander (Köderfisch), Quappe, Brasse",
    beschreibung: [
      "Beim Grundangeln liegt der Köder bewegungslos am Grund – dort, wo Aal, Quappe und Zander nachts auf Nahrungssuche gehen. Das Laufblei gleitet frei auf der Schnur, sodass der Fisch beim Biss keinen Widerstand spürt.",
      "Bissanzeige über Bissanzeiger, Glöckchen oder Knicklicht an der Rutenspitze. Die Rolle steht mit geöffnetem Freilauf, damit der Fisch Schnur nehmen kann."
    ],
    ablauf: [
      "Auswerfen, Schnur straffen, Rute im Halter ablegen, Freilauf öffnen.",
      "Bissanzeiger einhängen.",
      "Biss: Der Fisch zieht Schnur. Beim Aal kurz warten, bis er stetig abzieht, dann Freilauf schließen und anschlagen.",
      "Zander mit Köderfisch: anschlagen, sobald er nach dem ersten Stopp wieder anzieht."
    ],
    tipps: [
      "Laufblei so leicht, dass es gerade eben liegen bleibt – in der Strömung entsprechend schwerer.",
      "Nachts mit Kopflampe auf Rotlicht: weißes Licht verscheucht Fische und blendet Nachbarn.",
      "Aalhaken mit langem Schenkel lassen sich leichter lösen."
    ],
    fehler: ["Freilauf vergessen – der Fisch spürt Widerstand und lässt los.", "Zu schweres Blei im stehenden Wasser."],
    geraet: { rute: "Grund- oder Karpfenrute 2,70–3,60 m, Wurfgewicht 30–120 g", rolle: "Größe 3000–5000 mit Freilauf", schnur: "Mono 0,30–0,35 mm" },
    ansaetze: [["aal", 0], ["zander", 1], ["quappe", 0]],
    montagen: [
      {
        name: "Laufbleimontage", wofuer: "Aal, Quappe und Zander mit Köderfisch",
        teile: [
          { n: "Monofile Hauptschnur", d: "0,30–0,35 mm", s: "mono" },
          { n: "Laufblei oder Seitenarm-Boom", d: "20–60 g (See) · 60–120 g (Strömung)", s: "laufblei|\\bboom" },
          { n: "Gummiperle", d: "6–8 mm, schützt den Knoten", s: "perle" },
          { n: "Wirbel mit Karabiner", d: "Größe 6–10", s: "wirbel|snap" },
          { n: "Vorfach", d: "Mono/FC 0,30 mm, 40–60 cm", s: "fluoro|vorfachset" },
          { n: "Haken", d: "Aalhaken Gr. 4–1 bzw. Einzelhaken 1–1/0", s: "\\bhaken\\b" },
          { n: "Bissanzeiger / Glöckchen", d: "", s: "bissanzeiger|glöckchen" }
        ],
        bild: [
          ["rute", "Rute im Halter · Freilauf offen"],
          ["schnur", "Mono 0,35 mm", "mono"],
          ["laufblei", "Laufblei 40 g (läuft frei)", "gross"],
          ["perle", "Gummiperle"],
          ["wirbel", "Karabinerwirbel"],
          ["vorfach", "Vorfach 0,30 mm · 50 cm", "fc"],
          ["haken", "Aalhaken Gr. 2"],
          ["wurm", "Tauwurm"]
        ],
        schritte: [
          "Laufblei (oder Seitenarm mit Blei) auf die Hauptschnur fädeln.",
          "Gummiperle aufziehen – sie schützt den Knoten vor dem Blei.",
          "Karabinerwirbel mit Clinch-Knoten anbinden, Vorfach mit Haken einhängen.",
          "Tauwurm ganz auf den Haken ziehen, sodass die Spitze frei liegt."
        ]
      }
    ]
  },
  {
    id: "karpfen", gruppe: "grund", name: "Karpfenangeln (Selbsthakmontage)",
    kurz: "Köder am Haar, festes Blei: Der Karpfen hakt sich beim Wegschwimmen selbst.",
    fische: "Karpfen, große Schleien",
    beschreibung: [
      "Moderne Karpfenmontagen arbeiten mit dem Selbsthak-Prinzip: Der Köder (Boilie, Mais, Pellet) hängt an einem kurzen Haar unter dem Haken. Der Karpfen saugt den Köder ein, der Haken dreht sich in die Unterlippe, und das schwere Blei treibt ihn beim Wegschwimmen hinein.",
      "Die Rute liegt im Halter, der Freilauf ist offen, ein Bissanzeiger meldet den Run."
    ],
    ablauf: [
      "Stelle ausloten, Futter einbringen (Boilies per Wurfrohr oder Futterboot, wo erlaubt).",
      "Montage exakt auf die Futterstelle werfen, Schnur mit Backlead absenken (optional).",
      "Freilauf öffnen, Bissanzeiger einstellen.",
      "Run: Rute aufnehmen, Freilauf schließen, Rute anheben – kein harter Anschlag nötig."
    ],
    tipps: [
      "Haarlänge: Der Köder sollte etwa 1 cm unter dem Hakenbogen hängen.",
      "Pop-ups (auftreibende Boilies) über Kraut oder Schlamm.",
      "Großen Kescher und Abhakmatte bereithalten – der Fisch gehört schonend behandelt."
    ],
    fehler: ["Blei zu leicht – dann wirkt der Selbsthakeffekt nicht.", "Bremse zu fest bei offenem Freilauf vergessen."],
    geraet: { rute: "Karpfenrute 3,60 m, 2,75–3,5 lb", rolle: "Freilaufrolle Größe 4000–6000", schnur: "Mono 0,30–0,35 mm" },
    ansaetze: [["karpfen", 0]],
    montagen: [
      {
        name: "Safety-Clip-Selbsthakmontage", wofuer: "Karpfen am See und Kanal",
        teile: [
          { n: "Monofile Hauptschnur", d: "0,30–0,35 mm", s: "mono" },
          { n: "Anti-Tangle-Sleeve / Schlauch", d: "", s: "sleeve|schlauch" },
          { n: "Safety-Clip mit Wirbel", d: "Blei fällt bei Schnurbruch ab", s: "safety|clip" },
          { n: "Karpfenblei", d: "Birne oder Inline 80–120 g", s: "karpfenblei|birnenblei|inline-blei" },
          { n: "Haar-Vorfach", d: "15–20 cm, geflochten (Coated), Haken Gr. 4–6", s: "haar" },
          { n: "Boilies oder Mais", d: "", s: "boilie|mais" },
          { n: "Bissanzeiger", d: "elektronisch", s: "bissanzeiger" }
        ],
        bild: [
          ["rute", "Rute im Halter · Freilauf offen"],
          ["schnur", "Mono 0,35 mm", "mono"],
          ["schlauch", "Anti-Tangle-Schlauch"],
          ["birnenblei", "Blei 100 g am Safety-Clip"],
          ["wirbel", "Wirbel (im Clip)"],
          ["vorfach", "Haar-Vorfach 18 cm", "geflecht"],
          ["haar", "Haken Gr. 4 + Haar mit Boilie"]
        ],
        schritte: [
          "Schlauch und Safety-Clip auf die Hauptschnur fädeln, Wirbel anknoten und in den Clip drücken.",
          "Blei in den Clip hängen, Gummihülse fest aufschieben.",
          "Haar-Vorfach in den Wirbel einhängen, Boilie mit der Ködernadel aufs Haar ziehen und mit Stopper sichern."
        ]
      }
    ]
  },

  /* ================= KÜSTE ================= */
  {
    id: "kuestenspinnen", gruppe: "kueste", name: "Küstenspinnen",
    kurz: "Vom Ufer oder in der Wathose: weite Würfe mit Blinker und Küstenwobbler auf Meerforelle und Hornhecht.",
    fische: "Meerforelle, Hornhecht, Wolfsbarsch, Dorsch",
    beschreibung: [
      "An der Ostseeküste jagen Meerforellen das ganze Jahr in Ufernähe, im Frühjahr und Herbst besonders gut. Gefischt wird mit schlanken Küstenblinkern und -wobblern, die sich weit werfen lassen.",
      "Wichtig sind Wurfweite, Geduld und die richtige Stelle: steinige Abschnitte mit Muschelbänken und Seegras, wo Krebse und Kleinfische leben – an der Grenze zwischen hellem Sand und dunklem Grund."
    ],
    ablauf: [
      "Fächerförmig werfen, zügig und gleichmäßig einholen, ab und zu kurze Spinnstopps.",
      "Nach einigen Würfen ein paar Meter weitergehen – Küstenspinnen heißt Strecke machen.",
      "Biss: Weiterkurbeln und Rute anheben, Meerforellen springen oft – Schnur dabei stramm halten."
    ],
    tipps: [
      "Ideal sind 3,00–3,30 m lange Ruten mit 10–40 g Wurfgewicht.",
      "Leichter auflandiger Wind und trübes Wasser bringen oft die besten Fänge.",
      "Für Hornhechte einen kurzen roten Wollfaden hinter den Blinker binden – die Zähne verhaken sich darin.",
      "Schonzeiten und Mindestmaße an der Küste beachten, viele Strände haben Schutzzonen an Bachmündungen."
    ],
    fehler: ["An einer Stelle stehen bleiben.", "Gerät nach dem Angeln nicht mit Süßwasser abspülen."],
    geraet: { rute: "3,00–3,30 m, Wurfgewicht 10–40 g", rolle: "Größe 3000–4000, möglichst salzwasserfest", schnur: "Geflecht 0,10–0,15 mm" },
    ansaetze: [["meerforelle", 0], ["hornhecht", 0], ["wolfsbarsch", 0]],
    montagen: [
      {
        name: "Küstenspinnmontage", wofuer: "Meerforelle, Hornhecht",
        teile: [
          { n: "Geflochtene Hauptschnur", d: "0,10–0,15 mm", s: "braid|geflecht" },
          { n: "Fluorocarbon-Vorfach", d: "0,28–0,35 mm, 1–1,5 m", s: "fluoro" },
          { n: "Snap", d: "salzwasserfest", s: "snap" },
          { n: "Küstenblinker / -wobbler", d: "12–28 g", s: "blinker|wobbler" },
          { n: "Wollfaden (Hornhecht)", d: "rot, 5–8 cm", s: "wolle" }
        ],
        bild: [
          ["rute", "Rutenspitze"],
          ["schnur", "Geflecht 0,12 mm", "geflecht"],
          ["knoten", "FG-Knoten"],
          ["vorfach", "Fluorocarbon 0,30 mm · 1,2 m", "fc"],
          ["snap", "Snap"],
          ["blinker", "Küstenblinker 20 g"]
        ],
        schritte: [
          "Langes Fluorocarbon-Vorfach mit FG-Knoten an die Geflochtene – es schützt an Steinen und Muscheln.",
          "Snap anbinden, Blinker einhängen.",
          "Für Hornhechte: Drilling entfernen und kurzen Wollfaden an den Sprengring binden."
        ]
      }
    ]
  },
  {
    id: "paternoster", gruppe: "kueste", name: "Heringspaternoster",
    kurz: "Mehrere kleine Glitzerhaken an einem System – in der Heringssaison oft mehrere Fische pro Wurf.",
    fische: "Hering, Makrele",
    beschreibung: [
      "Im Frühjahr ziehen Heringe in großen Schwärmen in Häfen und Förden. Gefischt wird mit fertigen Paternostern: 5–7 kleine Haken mit Glitzer oder Fischhaut an kurzen Seitenarmen, unten ein Blei.",
      "Das System wird ausgeworfen, abgesunken und mit leichten Zupfern eingeholt. Sobald der Schwarm da ist, beißt es oft bei jedem Wurf."
    ],
    ablauf: [
      "Auswerfen, auf die Tiefe des Schwarms absinken lassen (zählen).",
      "In ruhigen Zügen einholen, zwischendurch zupfen.",
      "Bei Biss langsam weiterkurbeln – oft hängen sich weitere Heringe an."
    ],
    tipps: ["Wo andere fangen, ist der Schwarm: Tiefe und Tempo abschauen.", "Fänge sofort kühlen."],
    fehler: ["Zu schweres Blei für ruhiges Hafenwasser.", "Bei mehreren Fischen am System zu hart drillen."],
    geraet: { rute: "2,70–3,60 m, Wurfgewicht 30–80 g", rolle: "Größe 3000–4000", schnur: "Geflecht 0,12–0,16 mm oder Mono 0,30 mm" },
    ansaetze: [["hering", 0]],
    montagen: [
      {
        name: "Heringspaternoster", wofuer: "Hafen, Mole, Förde",
        teile: [
          { n: "Hauptschnur", d: "Geflecht 0,14 mm oder Mono 0,30 mm", s: "braid|geflecht|mono" },
          { n: "Wirbel mit Karabiner", d: "", s: "wirbel|snap" },
          { n: "Fertiges Heringspaternoster", d: "5–7 Haken Gr. 8–10", s: "paternoster" },
          { n: "Abschlussblei", d: "30–60 g", s: "abschlussblei|birnenblei" }
        ],
        bild: [
          ["rute", "Rutenspitze"],
          ["schnur", "Geflecht 0,14 mm", "geflecht"],
          ["wirbel", "Karabinerwirbel"],
          ["paternoster", "Paternoster mit 5 Glitzerhaken"],
          ["birnenblei", "Abschlussblei 40 g"]
        ],
        schritte: [
          "Karabinerwirbel an die Hauptschnur.",
          "Paternoster aus der Verpackung abwickeln (nicht ziehen, sonst verheddert es) und einhängen.",
          "Blei unten in die Schlaufe oder den Karabiner hängen."
        ]
      }
    ]
  },
  {
    id: "brandung", gruppe: "kueste", name: "Brandungsangeln",
    kurz: "Weite Würfe mit schwerem Krallenblei und Wattwurm – auf Plattfisch und Dorsch.",
    fische: "Flunder, Scholle, Dorsch, Wittling",
    beschreibung: [
      "Beim Brandungsangeln wird mit langen Ruten (4–4,5 m) und schweren Krallenbleien (100–200 g) weit hinter die Brandung geworfen. Die Krallen halten das Blei im Sand fest, die Montage liegt mit 2–3 Haken am Grund.",
      "Beste Zeit sind Herbst und Winter, gern in der Dämmerung und bei leicht auflandigem Wind."
    ],
    ablauf: [
      "Krallenblei und Haken bestücken, mit Pendelwurf weit auswerfen.",
      "Rute steil in den Dreibein-Rutenständer stellen, Schnur straffen.",
      "Biss: Spitze nickt oder die Schnur wird schlaff (Fisch schwimmt Richtung Ufer) – Schnur aufnehmen und anheben."
    ],
    tipps: ["Schlagschnur (dicke Mono vorgeschaltet) ist beim Werfen schwerer Bleie Pflicht.", "Frische Wattwürmer sind der wichtigste Erfolgsfaktor."],
    fehler: ["Ohne Schlagschnur werfen – Abriss- und Verletzungsgefahr.", "Zu leichte Bleie bei Strömung."],
    geraet: { rute: "Brandungsrute 4,00–4,50 m, Wurfgewicht 100–250 g", rolle: "Weitwurfrolle Größe 5000–8000", schnur: "Geflecht 0,18–0,25 mm + Schlagschnur 0,50–0,60 mm" },
    ansaetze: [["flunder", 0]],
    montagen: [
      {
        name: "Brandungsvorfach mit 2 Haken", wofuer: "Plattfisch und Dorsch",
        teile: [
          { n: "Hauptschnur", d: "Geflecht 0,18–0,25 mm", s: "braid|geflecht" },
          { n: "Schlagschnur", d: "Mono 0,50–0,60 mm, ca. 10 m", s: "schlagschnur" },
          { n: "Brandungsvorfach", d: "2 Haken Gr. 1–2, mit Perlen", s: "brandung" },
          { n: "Krallenblei", d: "100–200 g", s: "kralle|krallenblei" },
          { n: "Köder", d: "Watt- oder Seeringelwurm", s: "wattwurm" }
        ],
        bild: [
          ["rute", "Brandungsrute im Dreibein"],
          ["schnur", "Geflecht 0,20 mm", "geflecht"],
          ["knoten", "Verbindungsknoten"],
          ["schnur", "Schlagschnur 0,55 mm · 10 m", "mono"],
          ["wirbel", "Wirbel"],
          ["seitenhaken", "Seitenarm mit Perlen + Wattwurm"],
          ["seitenhaken", "Seitenarm mit Perlen + Wattwurm"],
          ["krallenblei", "Krallenblei 150 g"]
        ],
        schritte: [
          "Schlagschnur mit einem Verbindungsknoten an die Hauptschnur, so lang, dass noch 5–6 Windungen auf der Spule liegen.",
          "Brandungsvorfach einhängen, Krallenblei unten anclipsen.",
          "Wattwürmer mit der Ködernadel auf Haken und Vorfach ziehen."
        ]
      }
    ]
  },
  {
    id: "pilken", gruppe: "kueste", name: "Pilken vom Kutter",
    kurz: "Schwerer Metallköder senkrecht unter dem Boot – der Klassiker auf Dorsch.",
    fische: "Dorsch, Wittling, Makrele",
    beschreibung: [
      "Vom Kutter aus wird der Pilker senkrecht abgelassen, bis er den Grund berührt. Dann wird er mit Rutenbewegungen angehoben und wieder fallen gelassen. Über dem Pilker sitzen oft 1–2 Beifänger (Twister oder Gummimakks).",
      "Die meisten Bisse kommen in der Absinkphase – deshalb die Schnur beim Fallenlassen immer leicht auf Spannung halten."
    ],
    ablauf: [
      "Pilker ablassen, bis er am Grund aufschlägt, sofort 1–2 Kurbelumdrehungen hoch.",
      "Rute zügig anheben und kontrolliert absenken.",
      "Biss: Ruck oder plötzliches Gewicht – Rute anheben, gleichmäßig pumpen."
    ],
    tipps: ["Pilkergewicht nach Drift und Tiefe wählen: so leicht wie möglich, Hauptsache am Grund.", "Beifänger in Rot/Schwarz sind an der Ostsee bewährt."],
    fehler: ["Pilker zu lange am Grund liegen lassen – Hänger.", "Zu weiche Rute für schwere Pilker."],
    geraet: { rute: "Pilkrute 2,10–2,70 m, Wurfgewicht 60–200 g", rolle: "Größe 4000–6000, salzwasserfest", schnur: "Geflecht 0,17–0,25 mm" },
    ansaetze: [["dorsch", 0]],
    montagen: [
      {
        name: "Pilker mit Beifänger", wofuer: "Dorsch vom Kutter",
        teile: [
          { n: "Geflochtene Hauptschnur", d: "0,17–0,25 mm", s: "braid|geflecht" },
          { n: "Monofile Schlagschnur", d: "0,50 mm, 2–3 m", s: "mono|schlagschnur" },
          { n: "Beifänger-System", d: "1–2 Twister oder Gummimakks", s: "beifänger|twister" },
          { n: "Pilker", d: "60–150 g", s: "pilker" }
        ],
        bild: [
          ["rute", "Pilkrute"],
          ["schnur", "Geflecht 0,20 mm", "geflecht"],
          ["knoten", "Verbindungsknoten"],
          ["schnur", "Mono-Schlagschnur 0,50 mm", "mono"],
          ["seitenhaken", "Beifänger (Twister rot)"],
          ["wirbel", "Wirbel"],
          ["pilker", "Pilker 80 g"]
        ],
        schritte: [
          "Mono-Schlagschnur an die Geflochtene knoten – sie puffert harte Schläge und schützt an Wracks.",
          "Beifänger-System mit Wirbel anbinden, Pilker unten einhängen.",
          "Drilling am Pilker auf Schärfe prüfen."
        ]
      }
    ]
  }
];

/* Welche Angelart passt zu einem Berater-Ansatz? */
export function angelartFuer(fischId, index){
  return ANGELARTEN.find(a => a.ansaetze.some(([f, i]) => f === fischId && i === index)) || null;
}
