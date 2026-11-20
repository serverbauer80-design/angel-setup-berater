/* ============================================================
   Knoten Schritt für Schritt
   Zu jedem Knoten, den die Montagen und der Berater nennen, eine
   gezeichnete Anleitung (offline, SVG). Farben:
     Hauptschnur = dunkel, Ende das du bewegst = orange,
     zweite Schnur (Vorfach) = blau, Pfeil = grün.
   knotenLinks(text) macht aus Knotennamen in Texten Links hierher.
   ============================================================ */
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[c]));

/* ---------- Zeichen-Bausteine (viewBox 240 × 100) ---------- */
const P = (cls, d) => `<path class="${cls}" d="${d}"/>`;
const T = (x, y, t, anker = "middle") => `<text class="kn-txt" x="${x}" y="${y}" text-anchor="${anker}">${esc(t)}</text>`;
/* Haken liegend, Öse bei (x, y), Bogen nach links unten */
const haken = (x, y) => `<path class="kn-metall-l" d="M${x - 6} ${y} L${x - 52} ${y} A11 11 0 0 0 ${x - 52} ${y + 22} L${x - 36} ${y + 22} L${x - 41} ${y + 16}"/><circle class="kn-oese" cx="${x}" cy="${y}" r="6"/>`;
/* Wirbel liegend, Öse bei (x, y) */
const wirbel = (x, y) => `<rect class="kn-metall" x="${x - 26}" y="${y - 4.5}" width="14" height="9" rx="3"/><circle class="kn-oese" cx="${x - 33}" cy="${y}" r="5"/><circle class="kn-oese" cx="${x}" cy="${y}" r="6"/>`;
/* Windungen um eine waagrechte Schnur: hinten (blass) und vorne */
function wind(x1, x2, y, n, amp = 8, cls = "kn-b"){
  const d = (x2 - x1) / n; let v = "", h = "";
  for(let i = 0; i < n; i++){ const a = x1 + i * d; v += `M${a} ${y - amp} L${a + d * .55} ${y + amp} `; h += `M${a + d * .55} ${y + amp} L${a + d} ${y - amp} `; }
  return { hinten: P(cls + " kn-hinten", h), vorn: P(cls, v) };
}
function pfeil(x1, y1, x2, y2){
  const w = Math.atan2(y2 - y1, x2 - x1), l = 8;
  const a = [x2 - l * Math.cos(w - .45), y2 - l * Math.sin(w - .45)], b = [x2 - l * Math.cos(w + .45), y2 - l * Math.sin(w + .45)];
  return `<line class="kn-pfeil" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"/><path class="kn-pfeilkopf" d="M${x2} ${y2} L${a[0].toFixed(1)} ${a[1].toFixed(1)} L${b[0].toFixed(1)} ${b[1].toFixed(1)}Z"/>`;
}
const markier = (cx, cy, rx, ry) => `<ellipse class="kn-markier" cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}"/>`;
const svg = (inhalt, titel) => `<svg class="kn-bild" viewBox="0 0 240 100" role="img" aria-label="${esc(titel)}">${inhalt}</svg>`;

/* ---------- Die Knoten ---------- */
export const KNOTEN = [
  {
    id: "clinch", name: "Verbesserter Clinch-Knoten", kurz: "Wirbel, Snap oder Haken an Mono und Fluorocarbon",
    schnur: "Mono, Fluorocarbon (nicht für Geflecht)", kraft: "ca. 85–95 %",
    muster: /clinch/i,
    schritte: [
      ["Schnurende etwa 15 cm durch die Öse fädeln.", () =>
        P("kn-a", "M236 40 L66 40") + P("kn-b", "M66 40 C52 40 52 52 66 52 L170 52") + haken(66, 46) + pfeil(176, 52, 206, 52)],
      ["Das Ende 5–7× um die Hauptschnur wickeln – bei dicker Schnur (ab 0,35 mm) reichen 4–5.", () => {
        const w = wind(86, 170, 40, 6, 9);
        return w.hinten + P("kn-a", "M236 40 L66 40") + P("kn-b", "M66 40 C52 40 52 52 66 52 L86 49") + w.vorn + P("kn-b", "M170 31 Q184 24 190 34") + haken(66, 46) + T(128, 18, "5–7 Windungen");
      }],
      ["Ende zurückführen und durch die kleine Schlaufe direkt an der Öse stecken.", () => {
        const w = wind(86, 170, 40, 6, 9);
        return w.hinten + P("kn-a", "M236 40 L66 40") + P("kn-b", "M66 40 C52 40 52 52 66 52 L86 49") + w.vorn + markier(77, 46, 9, 9) +
          P("kn-b", "M170 31 C192 6 90 0 78 26 L78 48") + haken(66, 46) + pfeil(78, 36, 78, 56);
      }],
      ["Verbessert: das Ende danach noch durch die große Schlaufe zurückstecken, die dabei entstanden ist.", () => {
        const w = wind(86, 170, 40, 6, 9);
        return w.hinten + P("kn-a", "M236 40 L66 40") + P("kn-b", "M66 40 C52 40 52 52 66 52 L86 49") + w.vorn +
          P("kn-b", "M170 31 C192 6 90 0 78 26 L78 62 C80 80 120 80 124 64 L126 22") + markier(128, 16, 44, 12) + haken(66, 46) + pfeil(126, 40, 127, 14);
      }],
      ["Anfeuchten (Spucke), Ende festhalten und langsam an der Hauptschnur zuziehen. Ende auf 2–3 mm kürzen.", () => {
        const w = wind(74, 106, 46, 6, 6);
        return w.hinten + P("kn-a", "M236 46 L68 46") + w.vorn + P("kn-b", "M106 40 L112 33") + haken(66, 46) + pfeil(170, 46, 222, 46) + T(196, 32, "langsam ziehen") + T(112, 80, "Ende 2–3 mm stehen lassen");
      }]
    ],
    tipps: ["Nie trocken zuziehen – die Reibungshitze schwächt Mono um bis zu ein Drittel.", "Nach dem Zuziehen die Windungen ansehen: liegen sie sauber nebeneinander, hält er. Überkreuzte Windungen: neu binden."]
  },
  {
    id: "palomar", name: "Palomar-Knoten", kurz: "Haken, Wirbel oder Snap an Geflecht – und der Dropshot-Haken",
    schnur: "Geflecht, Mono, Fluorocarbon", kraft: "ca. 90–95 %",
    muster: /palomar/i,
    schritte: [
      ["Schnur auf 15 cm doppelt legen und die Schlaufe durch die Öse stecken.", () =>
        P("kn-a", "M236 42 L56 42 C38 42 38 54 56 54 L200 54") + haken(120, 48) + pfeil(52, 48, 30, 48) + T(56, 24, "Schlaufe 15 cm")],
      ["Mit der doppelten Schnur einen lockeren einfachen Knoten (Überhandknoten) binden – der Haken hängt darunter.", () =>
        P("kn-a", "M236 42 L150 42 C120 42 96 20 74 28 C52 36 60 70 84 64 C104 58 98 36 80 34 C66 32 46 40 40 52 C36 64 50 70 62 66") +
        P("kn-a", "M236 54 L150 54 C126 54 112 66 96 70") + haken(150, 48) + markier(80, 48, 26, 24) + T(80, 94, "lockerer Überhandknoten")],
      ["Die Schlaufe über den ganzen Haken (bzw. Wirbel) ziehen.", () =>
        P("kn-a", "M236 42 L150 42 C136 42 130 46 128 50 M236 54 L150 54 C138 54 132 52 128 50") + `<circle class="kn-knoten" cx="124" cy="50" r="7"/>` +
        P("kn-b", "M118 46 C90 30 40 24 30 46 C22 66 70 84 110 76") + haken(150, 48) + pfeil(60, 30, 84, 26) + T(60, 96, "Schlaufe über den Haken")],
      ["Anfeuchten, an beiden Strängen gleichzeitig zuziehen, das kurze Ende auf 3 mm kürzen.", () =>
        P("kn-a", "M236 48 L158 48") + `<circle class="kn-knoten" cx="152" cy="48" r="6"/>` + P("kn-b", "M156 42 L162 34") + haken(146, 48) + pfeil(180, 48, 224, 48) + T(186, 32, "beide Stränge ziehen")]
    ],
    tipps: ["Bei Geflecht der sicherste Knoten am Wirbel – rutscht nicht durch.", "Beim Dropshot das lange Ende stehen lassen: es wird zur Bleischnur. Haken dann noch einmal von oben durch die Öse stecken, damit die Spitze nach oben zeigt."]
  },
  {
    id: "uni", name: "Uni-Knoten (Grinner)", kurz: "Der Allrounder für Haken, Wirbel und Spule",
    schnur: "Mono, Fluorocarbon, Geflecht (Geflecht 2× durch die Öse)", kraft: "ca. 85–90 %",
    muster: /(?<!doppelte[nr]? )uni-knoten|grinner/i,
    schritte: [
      ["Ende durch die Öse (bei Geflecht zweimal) und 15 cm parallel zur Hauptschnur zurücklegen.", () =>
        P("kn-a", "M236 40 L66 40") + P("kn-b", "M66 40 C52 40 52 52 66 52 L190 52") + haken(66, 46) + pfeil(194, 52, 220, 52)],
      ["Ende zur Öse zurückbiegen, sodass über beiden Schnüren eine Schlaufe liegt.", () =>
        P("kn-a", "M236 40 L66 40") + P("kn-b", "M66 40 C52 40 52 52 66 52 L180 52 C210 52 210 18 180 18 L100 18 C88 18 88 30 96 36") + haken(66, 46) + markier(150, 35, 40, 21)],
      ["Ende 5–6× durch die Schlaufe um beide Schnüre wickeln (Geflecht 7–8×).", () => {
        const w = wind(92, 170, 46, 6, 12);
        return w.hinten + P("kn-a", "M236 40 L66 40") + P("kn-b", "M66 40 C52 40 52 52 66 52 L180 52 C210 52 210 18 180 18 L174 22") + w.vorn + P("kn-b", "M92 34 L84 28") + haken(66, 46) + T(130, 92, "5–6 Windungen");
      }],
      ["Am Ende zuziehen, bis die Windungen eng liegen. Dann an der Hauptschnur den Knoten an die Öse schieben und kürzen.", () => {
        const w = wind(76, 104, 44, 5, 7);
        return w.hinten + P("kn-a", "M236 44 L68 44") + w.vorn + P("kn-b", "M76 37 L70 30") + haken(66, 44) + pfeil(170, 44, 222, 44) + pfeil(130, 70, 96, 70) + T(130, 88, "Knoten an die Öse schieben");
      }]
    ],
    tipps: ["Der Uni-Knoten lässt sich auch zum Aufspulen nutzen: Schnur um den Spulenkern legen, Uni binden, zuziehen.", "Mit zwei Uni-Knoten verbindest du zwei Schnüre – siehe Doppelter Uni-Knoten."]
  },
  {
    id: "doppeluni", name: "Doppelter Uni-Knoten", kurz: "Zwei Schnüre verbinden: Schlagschnur, Mono an Geflecht",
    schnur: "Mono an Mono, Mono/FC an Geflecht", kraft: "ca. 80–90 %",
    muster: /doppelte[nr]? uni|uni-to-uni|verbindungsknoten/i,
    schritte: [
      ["Beide Schnüre 20 cm überlappend nebeneinanderlegen.", () =>
        P("kn-a", "M236 44 L40 44") + P("kn-c", "M4 56 L200 56") + T(210, 34, "Hauptschnur", "end") + T(30, 80, "Vorfach / Schlagschnur", "start")],
      ["Mit dem Ende der Hauptschnur einen Uni-Knoten um die andere Schnur binden: Mono 5×, Geflecht 8–10×.", () => {
        const w = wind(54, 110, 50, 6, 11);
        return w.hinten + P("kn-c", "M4 56 L200 56") + P("kn-a", "M236 44 L110 44") + w.vorn + P("kn-a", "M54 39 L46 32") + T(82, 92, "1. Uni");
      }],
      ["Mit dem Ende der zweiten Schnur genauso einen Uni-Knoten um die Hauptschnur binden.", () => {
        const a = wind(54, 100, 50, 5, 11), b = wind(140, 186, 50, 5, 11, "kn-c");
        return a.hinten + b.hinten + P("kn-c", "M4 56 L140 56") + P("kn-a", "M236 44 L100 44") + a.vorn + b.vorn + P("kn-a", "M54 38 L46 32") + P("kn-c", "M186 62 L194 68") + T(77, 92, "1. Uni") + T(163, 92, "2. Uni");
      }],
      ["Beide Knoten einzeln anfeuchten und zuziehen, dann an den Hauptschnüren zusammenziehen, bis sie aneinanderstoßen. Enden kürzen.", () => {
        const a = wind(100, 118, 50, 4, 7), b = wind(122, 140, 50, 4, 7, "kn-c");
        return a.hinten + b.hinten + P("kn-c", "M4 50 L120 50") + P("kn-a", "M236 50 L120 50") + a.vorn + b.vorn + pfeil(60, 50, 14, 50) + pfeil(180, 50, 226, 50);
      }]
    ],
    tipps: ["Bei Geflecht deutlich mehr Windungen als bei Mono – sonst rutscht er.", "Für die Schlagschnur beim Brandungsangeln: dicke Schnur nur 3–4 Windungen, dünne 6–7."]
  },
  {
    id: "fg", name: "FG-Knoten", kurz: "Geflecht an Fluorocarbon – der flachste Verbinder, gleitet durch alle Ringe",
    schnur: "Geflecht an Fluorocarbon oder Mono", kraft: "ca. 95 %",
    muster: /\bFG\b/,
    schritte: [
      ["Geflecht straff spannen (z. B. Rute festklemmen, Geflecht-Ende zwischen den Zähnen) und das Fluorocarbon quer darüberlegen.", () =>
        P("kn-c", "M4 50 L200 50") + P("kn-a", "M236 62 L150 50") + P("kn-b", "M150 50 L70 26") + T(30, 80, "Fluorocarbon", "start") + T(226, 86, "Geflecht (straff)", "end")],
      ["Geflecht abwechselnd vor und hinter dem Fluorocarbon kreuzen lassen – 16–20 Kreuzungen, eng nebeneinander. Das Geflecht bleibt dabei straff.", () => {
        const w = wind(60, 180, 50, 10, 9);
        return w.hinten + P("kn-c", "M4 50 L200 50") + P("kn-a", "M236 50 L180 50") + w.vorn + P("kn-b", "M60 41 L44 30") + T(120, 90, "16–20 Kreuzungen");
      }],
      ["Mit dem Geflecht-Ende zwei halbe Schläge um beide Schnüre legen, kräftig zuziehen (anfeuchten). Das Fluorocarbon-Ende abschneiden.", () => {
        const w = wind(70, 150, 50, 10, 6);
        return w.hinten + P("kn-c", "M4 50 L156 50") + P("kn-a", "M236 50 L150 50") + w.vorn + P("kn-b", "M70 44 C60 30 150 26 158 42 C150 60 172 60 166 42") + T(160, 24, "2 halbe Schläge") + pfeil(40, 74, 14, 74) + pfeil(200, 74, 226, 74);
      }],
      ["Mit 4–6 halben Schlägen nur um das Geflecht abschließen, Geflecht-Ende kürzen. Fertig: flach, ohne Verdickung.", () => {
        const w = wind(60, 120, 50, 10, 5);
        return w.hinten + P("kn-c", "M4 50 L122 50") + P("kn-a", "M236 50 L120 50") + w.vorn + P("kn-b", "M128 45 L132 55 M138 45 L142 55 M148 45 L152 55 M158 45 L162 55") + T(146, 30, "4–6 halbe Schläge ums Geflecht");
      }]
    ],
    tipps: ["Probezug: Nach dem Binden kräftig an beiden Schnüren ziehen. Rutscht nichts, hält er auch im Drill.", "Wenn er im Wasser nicht klappen will: der Albright ist leichter und fast so gut."]
  },
  {
    id: "albright", name: "Albright-Knoten", kurz: "Geflecht an Fluorocarbon oder Mono – leichter als der FG",
    schnur: "Geflecht an Fluorocarbon/Mono, auch dünn an dick", kraft: "ca. 85–90 %",
    muster: /albright/i,
    schritte: [
      ["Im Fluorocarbon eine Schlaufe von etwa 8 cm legen.", () =>
        P("kn-c", "M236 40 L80 40 C56 40 56 60 80 60 L180 60") + T(80, 22, "Schlaufe im Fluorocarbon")],
      ["Geflecht 20 cm von hinten durch die Schlaufe stecken.", () =>
        P("kn-c", "M236 40 L80 40 C56 40 56 60 80 60 L180 60") + P("kn-a", "M4 50 L150 50") + pfeil(110, 50, 150, 50)],
      ["Geflecht 10–12× um beide Stränge der Schlaufe wickeln – in Richtung Schlaufenende (nach links).", () => {
        const w = wind(76, 150, 50, 10, 14, "kn-b");
        return P("kn-c", "M236 40 L80 40 C56 40 56 60 80 60 L180 60") + w.hinten + P("kn-a", "M4 50 L150 50") + w.vorn + pfeil(110, 84, 76, 84) + T(112, 98, "10–12 Windungen");
      }],
      ["Ende auf derselben Seite durch die Schlaufe zurück hinaus, Windungen zum Schlaufenende schieben, an allen vier Enden zuziehen, kürzen.", () => {
        const w = wind(80, 130, 50, 10, 11, "kn-b");
        return P("kn-c", "M236 40 L80 40 C60 40 60 60 80 60 L140 60") + w.hinten + P("kn-a", "M4 50 L80 50") + w.vorn + P("kn-b", "M80 44 C70 34 64 30 58 26") + pfeil(40, 70, 12, 70) + pfeil(190, 70, 226, 70);
      }]
    ],
    tipps: ["Wichtig: Das Geflecht muss auf derselben Seite der Schlaufe wieder heraus, auf der es hineinging – sonst zieht er sich schief.", "Bei sehr dünnem Geflecht 2–3 Windungen mehr."]
  },
  {
    id: "schlaufe", name: "Schlaufenknoten (Rapala/Non-Slip)", kurz: "Wobbler und Gummifisch frei an einer festen Schlaufe",
    schnur: "Mono, Fluorocarbon", kraft: "ca. 85–95 %",
    muster: /schlaufenknoten|non-slip/i,
    schritte: [
      ["10 cm vor dem Ende einen lockeren Überhandknoten in die Schnur machen.", () =>
        P("kn-a", "M236 50 L160 50 C136 50 124 30 110 34 C94 38 96 62 112 62 C126 62 128 44 118 40 C104 34 96 50 60 50 L20 50") + markier(114, 48, 22, 20)],
      ["Ende durch die Öse des Köders und zurück durch den Überhandknoten.", () =>
        P("kn-a", "M236 46 L160 46 C140 46 134 36 120 38 C108 40 108 54 120 56 C130 56 132 46 126 42") +
        P("kn-b", "M126 42 L60 46 C44 46 44 58 60 58 L118 52 C140 50 150 62 180 64") + `<circle class="kn-oese" cx="54" cy="52" r="6"/><path class="kn-metall" d="M48 52 L18 52 L22 60Z"/>` + pfeil(150, 62, 180, 66)],
      ["Ende 4–5× um die Hauptschnur wickeln.", () => {
        const w = wind(160, 210, 46, 5, 8);
        return w.hinten + P("kn-a", "M236 46 L160 46 C140 46 134 36 120 38 C108 40 108 54 120 56 C130 56 132 46 126 42") +
          P("kn-b", "M126 42 L60 46 C44 46 44 58 60 58 L118 52 C140 50 150 56 160 54") + w.vorn + P("kn-b", "M210 38 L216 32") + `<circle class="kn-oese" cx="54" cy="52" r="6"/><path class="kn-metall" d="M48 52 L18 52 L22 60Z"/>` + T(186, 24, "4–5×");
      }],
      ["Ende zurück durch den Überhandknoten (gleiche Seite, auf der es heraus kam), anfeuchten, zuziehen. Die Schlaufe bleibt offen – der Köder spielt frei.", () =>
        P("kn-a", "M236 50 L106 50") + `<circle class="kn-knoten" cx="100" cy="50" r="7"/>` + P("kn-b", "M96 44 C80 34 64 40 60 50 C64 60 80 66 96 56 M104 44 L110 36") + `<circle class="kn-oese" cx="58" cy="50" r="6"/><path class="kn-metall" d="M52 50 L20 50 L24 58Z"/>` + markier(78, 50, 24, 16) + T(78, 88, "offene Schlaufe")]
    ],
    tipps: ["Bei Wobblern ohne Sprengring bringt die Schlaufe deutlich mehr Laufaktion als ein fester Knoten.", "Schlaufe klein halten (5–8 mm), sonst verhakt sich der Drilling darin."]
  },
  {
    id: "chirurg", name: "Chirurgenschlaufe", kurz: "Schnelle feste Schlaufe für Vorfach, Seitenarme und Paternoster",
    schnur: "Mono, Fluorocarbon, Geflecht", kraft: "ca. 80–90 %",
    muster: /chirurg|endschlaufe|schlaufe einbinden/i,
    schritte: [
      ["Das Schnurende doppelt legen – die Schlaufe wird etwas kleiner als dieser Bogen.", () =>
        P("kn-a", "M236 44 L70 44 C46 44 46 56 70 56 L180 56") + T(60, 24, "doppelt legen")],
      ["Mit der Doppelschnur einen Überhandknoten machen und die Schlaufe ein zweites Mal hindurchführen.", () =>
        P("kn-a", "M236 44 L150 44 C120 44 108 24 92 30 C74 36 78 66 96 66 C112 66 114 42 98 38 C86 36 80 46 86 54 C94 62 108 60 110 52") +
        P("kn-a", "M236 56 L150 56 C132 56 120 66 104 68") + P("kn-b", "M86 54 C70 64 40 62 30 50 C24 40 40 32 56 36") + pfeil(40, 40, 58, 34) + T(150, 90, "Schlaufe 2× durchführen")],
      ["Anfeuchten, Schlaufe und Schnur auseinanderziehen, Ende kürzen.", () =>
        P("kn-a", "M236 50 L120 50") + `<circle class="kn-knoten" cx="112" cy="50" r="8"/>` + P("kn-a", "M104 44 C70 30 40 40 40 50 C40 60 70 70 104 56") + P("kn-b", "M118 42 L124 34") + pfeil(52, 50, 20, 50) + pfeil(160, 50, 222, 50)]
    ],
    tipps: ["Dreimal statt zweimal durchgeführt (Dreifach-Chirurg) hält er auch in Geflecht.", "Für Loop-to-Loop: Vorfachschlaufe und Hauptschnurschlaufe ineinanderstecken – Vorfach wechselt in Sekunden."]
  },
  {
    id: "stopper", name: "Stopperknoten", kurz: "Verschiebbarer Stopper für Laufpose und Tiefe",
    schnur: "Stopperschnur (Dacron/Mono) auf der Hauptschnur", kraft: "–",
    muster: /stopperknoten|stopper-knoten|schnurstopper/i,
    schritte: [
      ["Ein 15 cm langes Stück Stopperschnur parallel an die Hauptschnur legen und eine Schlaufe bilden.", () =>
        P("kn-a", "M4 50 L236 50") + P("kn-b", "M40 56 L180 56 C206 56 206 26 180 26 L110 26 C96 26 96 40 106 46") + markier(150, 42, 42, 20)],
      ["Ende 4–5× durch die Schlaufe um beide Schnüre wickeln.", () => {
        const w = wind(110, 170, 52, 5, 12);
        return w.hinten + P("kn-a", "M4 50 L236 50") + P("kn-b", "M40 56 L180 56 C206 56 206 26 180 26 L176 30") + w.vorn + P("kn-b", "M110 40 L104 34");
      }],
      ["Beide Enden kräftig zuziehen und 1–2 cm lang lassen – so läuft er durch die Ringe und lässt sich zum Einstellen der Tiefe verschieben.", () => {
        const w = wind(110, 130, 50, 4, 6);
        return w.hinten + P("kn-a", "M4 50 L236 50") + w.vorn + P("kn-b", "M110 44 L100 36 M130 56 L140 64") + pfeil(150, 80, 190, 80) + pfeil(90, 80, 50, 80) + T(120, 96, "verschiebbar = Tiefe einstellen");
      }]
    ],
    tipps: ["Unter den Stopper eine kleine Perle, dann die Pose – sonst rutscht die Posenöse über den Knoten.", "Lässt er sich zu leicht schieben, noch einmal nachziehen. Zu schwer: Schnur anfeuchten, dann schieben."]
  }
];

const BY = Object.fromEntries(KNOTEN.map(k => [k.id, k]));
export const knotenVon = id => BY[id] || null;

/* Welche Knoten kommen in einem Text vor? */
export function knotenIn(text){ return KNOTEN.filter(k => k.muster.test(String(text || ""))); }

/* Knotennamen in bereits escaptem Text verlinken */
const LINK_RE = /(Verbesserte[nr]? Clinch-Knoten|Clinch-Knoten|Clinch|Palomar-Knoten|Palomar|Doppelte[nr]? Uni-Knoten|Uni-to-Uni|Uni-Knoten|Grinner-Knoten|Grinner|FG-Knoten|FG|Albright-Knoten|Albright|Rapala-Schlaufenknoten|Schlaufenknoten|Chirurgenschlaufe|Chirurgenknoten|Stopperknoten|Stopper-Knoten|Verbindungsknoten)/g;
export function knotenLinks(html){
  return String(html).replace(LINK_RE, (m, _x, pos, s) => {
    if(m === "FG" && /[A-Za-zÄÖÜäöü]/.test(s[pos + 2] || "")) return m;
    /* nicht innerhalb eines Tags oder Links ersetzen */
    const davor = s.slice(0, pos);
    if(davor.lastIndexOf("<") > davor.lastIndexOf(">")) return m;
    if(davor.lastIndexOf("<a ") > davor.lastIndexOf("</a>")) return m;
    if(m === "FG" && /[A-Za-zÄÖÜäöü]/.test(s[pos - 1] || "")) return m;
    const k = KNOTEN.find(k => k.muster.test(m));
    return k ? `<a class="kn-link" href="#wissen/knoten-${k.id}">${m}</a>` : m;
  });
}

/* ---------- Ansichten ---------- */
export function knotenUebersichtHTML(){
  return `<div class="w-gruppe" id="knoten"><h3>Knoten <span>Schritt für Schritt gezeichnet</span></h3>
    <div class="w-karten">${KNOTEN.map(k => `<a class="w-karte kn-karte" href="#wissen/knoten-${k.id}">
      ${svg(k.schritte[k.schritte.length - 1][1](), k.name)}
      <b>${esc(k.name)}</b><span>${esc(k.kurz)}</span><small>${esc(k.schnur)}</small></a>`).join("")}</div></div>`;
}

export function knotenDetailHTML(id, montagenMit){
  const k = BY[id];
  if(!k) return `<section class="wissen"><a class="zurueck sichtbar" href="#wissen">‹ Wissen</a><p class="leer">Diesen Knoten gibt es nicht.</p></section>`;
  const wo = montagenMit ? montagenMit(k) : [];
  return `<section class="wissen kn">
    <a class="zurueck sichtbar" href="#wissen/knoten">‹ Alle Knoten</a>
    <p class="eyebrow">Knoten</p>
    <h2>${esc(k.name)}</h2>
    <p class="lead-klein">${esc(k.kurz)}</p>
    <dl class="kn-fakten"><div><dt>Schnur</dt><dd>${esc(k.schnur)}</dd></div><div><dt>Tragkraft</dt><dd>${esc(k.kraft)} der Schnur</dd></div></dl>
    <p class="kn-legende"><span class="kn-l-a"></span>Hauptschnur <span class="kn-l-b"></span>Ende, das du bewegst <span class="kn-l-c"></span>zweite Schnur <span class="kn-l-p"></span>Zugrichtung</p>
    <ol class="kn-schritte">${k.schritte.map(([t, f], i) => `<li>${svg(f(), `Schritt ${i + 1}: ${t}`)}<p><b class="kn-nr">${i + 1}</b>${esc(t)}</p></li>`).join("")}</ol>
    <div class="w-box tipp"><h3>Profi-Tipps</h3><ul>${k.tipps.map(t => `<li>${esc(t)}</li>`).join("")}</ul></div>
    ${wo.length ? `<div class="w-box"><h3>Brauchst du für</h3><ul class="kn-wo">${wo.map(x => `<li><a href="#wissen/${x.art.id}">${esc(x.montage.name)}</a> <small>${esc(x.art.name)}</small></li>`).join("")}</ul></div>` : ""}
    <p class="hinweis-klein">Faustregel für jeden Knoten: anfeuchten, langsam zuziehen, Probezug machen. Ein Knoten, der beim Probezug reißt, hätte auch den Fisch gekostet.</p>
  </section>`;
}
