/* ============================================================
   Schaubild einer Montage (SVG)
   Zeichnet den Aufbau von der Rutenspitze (oben) bis zum Köder (unten).
   Jedes Teil ist ein kleines Symbol auf der Schnur, rechts beschriftet.
   Farben kommen aus den CSS-Variablen der App (hell/dunkel automatisch).
   Typen: rute schnur vorfach knoten stopper perle pose sbiro tremarella
          laufblei birnenblei wirbel snap schrot schlauch schlaufe haken
          drilling koeder wurm teig koederfisch jig spoon wobbler blinker
          seitenhaken dropshotblei method korb haar paternoster krallenblei pilker
   ============================================================ */
const CX = 64, LX = 128, W = 380;
const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;" }[c]));

/* Beschriftung, bei Bedarf zweizeilig */
function label(text, cy, vonX){
  const t = String(text || "");
  let zeilen = [t];
  if(t.length > 27){
    const i = t.lastIndexOf(" ", 27);
    const j = t.indexOf(" · ") > 0 && t.indexOf(" · ") < 29 ? t.indexOf(" · ") : -1;
    const cut = j > 0 ? j : (i > 10 ? i : 27);
    zeilen = [t.slice(0, cut).trim(), t.slice(cut).replace(/^ ?· ?/, "").trim()];
  }
  const y0 = cy + 5 - (zeilen.length - 1) * 8;
  return `<line class="sb-leader" x1="${vonX}" y1="${cy}" x2="${LX - 6}" y2="${cy}"/>` +
    `<text class="sb-text" x="${LX}" y="${y0}">${zeilen.map((z, k) => `<tspan x="${LX}" dy="${k ? 16 : 0}">${esc(z)}</tspan>`).join("")}</text>`;
}

/* Linienstile der Schnur */
const STIL = { geflecht: "sb-geflecht", mono: "sb-mono", fc: "sb-fc", stahl: "sb-stahl" };
function linie(y1, y2, stil, x){ return y2 > y1 ? `<line class="${STIL[stil] || "sb-mono"}" x1="${x ?? CX}" y1="${y1}" x2="${x ?? CX}" y2="${y2}"/>` : ""; }

/* Hakenform um (x, y) = Öse oben */
function haken(x, y, gross){
  const k = gross ? 1.25 : 1;
  return `<circle class="sb-draht" cx="${x}" cy="${y}" r="${2.2 * k}"/>
    <path class="sb-draht" d="M${x} ${y + 2} L${x} ${y + 18 * k} A${6 * k} ${6 * k} 0 0 1 ${x - 12 * k} ${y + 18 * k} L${x - 12 * k} ${y + 12 * k} L${x - 9 * k} ${y + 15 * k}"/>`;
}

/* Jedes Teil: Höhe, Zeichnung, rechte Kante (für die Beschriftung), endet die Schnur hier? */
const TEILE = {
  rute: (y) => ({ h: 38, ende: false, rechts: CX + 8,
    svg: `<path class="sb-rute" d="M${CX - 46} ${y + 4} Q${CX - 20} ${y + 10} ${CX - 4} ${y + 28}"/><circle class="sb-ring" cx="${CX}" cy="${y + 31}" r="4.5"/>`, mitte: y + 18 }),
  schnur: (y) => ({ h: 44, linie: true, rechts: CX + 6 }),
  vorfach: (y) => ({ h: 50, linie: true, rechts: CX + 6 }),
  knoten: (y) => ({ h: 18, rechts: CX + 8, svg: `<circle class="sb-knoten" cx="${CX}" cy="${y + 9}" r="3.4"/><path class="sb-mono" d="M${CX - 5} ${y + 5} L${CX + 5} ${y + 13} M${CX + 5} ${y + 5} L${CX - 5} ${y + 13}"/>` }),
  stopper: (y) => ({ h: 16, rechts: CX + 9, svg: `<rect class="sb-dunkel" x="${CX - 7}" y="${y + 6}" width="14" height="4.5" rx="1.5"/>` }),
  perle: (y) => ({ h: 18, rechts: CX + 8, svg: `<circle class="sb-perle" cx="${CX}" cy="${y + 9}" r="5"/>` }),
  pose: (y, z) => {
    const f = z === "gross" ? 1.3 : z === "fein" ? 0.75 : 1;
    const h = Math.round(76 * f);
    return { h, rechts: CX + 10 * f, mitte: y + h / 2,
      svg: `<rect class="sb-akzent" x="${CX - 1.8}" y="${y + 4}" width="3.6" height="${18 * f}" rx="1"/>
        <ellipse class="sb-posen" cx="${CX}" cy="${y + 4 + 18 * f + 18 * f}" rx="${7.5 * f}" ry="${18 * f}"/>
        <line class="sb-dunkel-linie" x1="${CX}" y1="${y + 4 + 36 * f}" x2="${CX}" y2="${y + h - 4}"/>` };
  },
  sbiro: (y) => ({ h: 64, rechts: CX + 9, mitte: y + 32,
    svg: `<rect class="sb-sbiro" x="${CX - 7}" y="${y + 6}" width="14" height="52" rx="7"/><line class="sb-wasser" x1="${CX}" y1="${y + 14}" x2="${CX}" y2="${y + 50}"/>` }),
  tremarella: (y) => ({ h: 46, rechts: CX + 9, mitte: y + 23,
    svg: `<path class="sb-blei" d="M${CX} ${y + 4} C${CX + 9} ${y + 12} ${CX - 9} ${y + 20} ${CX + 6} ${y + 28} C${CX + 10} ${y + 34} ${CX - 4} ${y + 40} ${CX} ${y + 42} C${CX - 8} ${y + 36} ${CX + 3} ${y + 30} ${CX - 6} ${y + 24} C${CX - 10} ${y + 16} ${CX + 2} ${y + 10} ${CX} ${y + 4}Z"/>` }),
  laufblei: (y, z) => { const g = z === "gross" ? 1.3 : 1; const h = Math.round(32 * g);
    return { h, rechts: CX + 9 * g, mitte: y + h / 2, svg: `<ellipse class="sb-blei" cx="${CX}" cy="${y + h / 2}" rx="${8 * g}" ry="${12 * g}"/><line class="sb-wasser" x1="${CX}" y1="${y + 4}" x2="${CX}" y2="${y + h - 4}"/>` }; },
  birnenblei: (y) => ({ h: 40, rechts: CX + 12, mitte: y + 24,
    svg: `<circle class="sb-ring" cx="${CX}" cy="${y + 5}" r="3"/><path class="sb-blei" d="M${CX} ${y + 8} C${CX + 4} ${y + 14} ${CX + 12} ${y + 22} ${CX + 11} ${y + 30} C${CX + 10} ${y + 38} ${CX - 10} ${y + 38} ${CX - 11} ${y + 30} C${CX - 12} ${y + 22} ${CX - 4} ${y + 14} ${CX} ${y + 8}Z"/>` }),
  wirbel: (y) => ({ h: 26, rechts: CX + 7, mitte: y + 13,
    svg: `<circle class="sb-ring" cx="${CX}" cy="${y + 5}" r="3.4"/><rect class="sb-metall" x="${CX - 3}" y="${y + 9}" width="6" height="8" rx="2"/><circle class="sb-ring" cx="${CX}" cy="${y + 21}" r="3.4"/>` }),
  snap: (y) => ({ h: 26, rechts: CX + 8, mitte: y + 13,
    svg: `<path class="sb-draht" d="M${CX} ${y + 3} L${CX - 5} ${y + 9} L${CX - 5} ${y + 20} Q${CX} ${y + 25} ${CX + 5} ${y + 20} L${CX + 5} ${y + 9} L${CX} ${y + 3}"/>` }),
  schrot: (y, z) => z === "klein"
    ? { h: 14, rechts: CX + 5, svg: `<circle class="sb-blei" cx="${CX}" cy="${y + 7}" r="2.4"/>` }
    : { h: 24, rechts: CX + 6, mitte: y + 12, svg: [5, 12, 19].map(d => `<circle class="sb-blei" cx="${CX}" cy="${y + d}" r="3"/>`).join("") },
  schlauch: (y) => ({ h: 36, rechts: CX + 5, mitte: y + 18, svg: `<rect class="sb-schlauch" x="${CX - 2.5}" y="${y + 4}" width="5" height="28" rx="2"/>` }),
  schlaufe: (y) => ({ h: 22, rechts: CX + 7, mitte: y + 11, svg: `<ellipse class="sb-draht" cx="${CX}" cy="${y + 7}" rx="3.5" ry="5"/><ellipse class="sb-draht" cx="${CX}" cy="${y + 15}" rx="3.5" ry="5"/>` }),
  haken: (y) => ({ h: 36, ende: true, rechts: CX + 6, mitte: y + 14, svg: haken(CX, y + 4) }),
  drilling: (y) => ({ h: 38, ende: true, rechts: CX + 16, mitte: y + 16,
    svg: haken(CX, y + 4) + `<path class="sb-draht" d="M${CX} ${y + 20} A6 6 0 0 0 ${CX + 12} ${y + 20} L${CX + 12} ${y + 14} L${CX + 9} ${y + 17}"/>` }),
  koeder: (y) => ({ h: 22, ende: true, rechts: CX + 12, mitte: y + 10, svg: `<ellipse class="sb-koeder" cx="${CX}" cy="${y + 10}" rx="10" ry="7"/>` }),
  wurm: (y) => ({ h: 34, ende: true, rechts: CX + 12, mitte: y + 16,
    svg: `<path class="sb-wurm" d="M${CX} ${y + 2} C${CX + 12} ${y + 8} ${CX - 12} ${y + 16} ${CX} ${y + 22} C${CX + 10} ${y + 27} ${CX - 4} ${y + 32} ${CX + 6} ${y + 32}"/>` }),
  teig: (y) => ({ h: 24, ende: true, rechts: CX + 10, mitte: y + 10, svg: `<circle class="sb-teig" cx="${CX}" cy="${y + 10}" r="8"/>` }),
  koederfisch: (y) => ({ h: 34, ende: true, rechts: CX + 34, mitte: y + 14,
    svg: `<path class="sb-fisch" d="M${CX - 22} ${y + 14} C${CX - 10} ${y + 2} ${CX + 14} ${y + 4} ${CX + 22} ${y + 14} L${CX + 32} ${y + 6} L${CX + 30} ${y + 14} L${CX + 32} ${y + 22} L${CX + 22} ${y + 14} C${CX + 14} ${y + 24} ${CX - 10} ${y + 26} ${CX - 22} ${y + 14}Z"/><circle class="sb-dunkel" cx="${CX - 14}" cy="${y + 12}" r="1.6"/>` }),
  jig: (y) => ({ h: 42, ende: true, rechts: CX + 50, mitte: y + 18,
    svg: `<path class="sb-koeder" d="M${CX + 4} ${y + 14} C${CX + 18} ${y + 6} ${CX + 34} ${y + 8} ${CX + 42} ${y + 16} L${CX + 50} ${y + 8} L${CX + 50} ${y + 30} L${CX + 42} ${y + 22} C${CX + 34} ${y + 30} ${CX + 18} ${y + 30} ${CX + 4} ${y + 22}Z"/>
      <circle class="sb-blei" cx="${CX}" cy="${y + 18}" r="8"/><circle class="sb-ring" cx="${CX}" cy="${y + 6}" r="2.6"/>
      <path class="sb-draht" d="M${CX + 6} ${y + 18} L${CX + 26} ${y + 18} L${CX + 26} ${y + 10}"/>` }),
  spoon: (y) => ({ h: 46, ende: true, rechts: CX + 11, mitte: y + 22,
    svg: `<circle class="sb-ring" cx="${CX}" cy="${y + 4}" r="2.6"/><path class="sb-spoon" d="M${CX} ${y + 7} C${CX + 9} ${y + 12} ${CX + 11} ${y + 30} ${CX} ${y + 40} C${CX - 11} ${y + 30} ${CX - 9} ${y + 12} ${CX} ${y + 7}Z"/>` + haken(CX, y + 38).replace(/r="2.2"/, 'r="0"') }),
  blinker: (y) => ({ h: 58, ende: true, rechts: CX + 11, mitte: y + 26,
    svg: `<circle class="sb-ring" cx="${CX}" cy="${y + 4}" r="2.6"/><path class="sb-spoon" d="M${CX - 2} ${y + 7} C${CX + 10} ${y + 16} ${CX + 9} ${y + 38} ${CX + 2} ${y + 48} C${CX - 8} ${y + 40} ${CX - 10} ${y + 18} ${CX - 2} ${y + 7}Z"/>
      <path class="sb-draht" d="M${CX + 2} ${y + 48} L${CX + 2} ${y + 54} M${CX - 4} ${y + 56} L${CX + 2} ${y + 54} L${CX + 8} ${y + 56}"/>` }),
  wobbler: (y) => ({ h: 40, ende: true, rechts: CX + 44, mitte: y + 16,
    svg: `<path class="sb-koeder" d="M${CX + 2} ${y + 10} C${CX + 14} ${y + 2} ${CX + 32} ${y + 4} ${CX + 40} ${y + 14} C${CX + 32} ${y + 24} ${CX + 14} ${y + 24} ${CX + 2} ${y + 18}Z"/>
      <path class="sb-lippe" d="M${CX + 2} ${y + 12} L${CX - 6} ${y + 22} L${CX + 1} ${y + 19}Z"/><circle class="sb-ring" cx="${CX}" cy="${y + 6}" r="2.4"/>
      ${haken(CX + 20, y + 24).replace(/r="2.2"/, 'r="0"')}` }),
  seitenhaken: (y) => ({ h: 48, rechts: CX + 44, mitte: y + 22,
    svg: `<path class="sb-fc" d="M${CX} ${y + 14} L${CX + 26} ${y + 20}"/>${haken(CX + 28, y + 20)}<ellipse class="sb-koeder" cx="${CX + 22}" cy="${y + 36}" rx="9" ry="5"/>` }),
  dropshotblei: (y) => ({ h: 30, ende: true, rechts: CX + 7, mitte: y + 14, svg: `<rect class="sb-blei" x="${CX - 4.5}" y="${y + 4}" width="9" height="22" rx="4.5"/>` }),
  method: (y) => ({ h: 46, rechts: CX + 16, mitte: y + 22,
    svg: `<rect class="sb-futter" x="${CX - 14}" y="${y + 4}" width="28" height="36" rx="8"/><rect class="sb-metall" x="${CX - 6}" y="${y + 8}" width="12" height="28" rx="3"/>` }),
  korb: (y) => ({ h: 52, rechts: CX + 52, mitte: y + 26,
    svg: `<path class="sb-mono" d="M${CX} ${y + 10} L${CX + 26} ${y + 14}"/><rect class="sb-korb" x="${CX + 24}" y="${y + 12}" width="24" height="30" rx="3"/>
      ${[20, 28, 36].map(d => `<line class="sb-gitter" x1="${CX + 24}" y1="${y + d}" x2="${CX + 48}" y2="${y + d}"/>`).join("")}
      <line class="sb-gitter" x1="${CX + 32}" y1="${y + 12}" x2="${CX + 32}" y2="${y + 42}"/><line class="sb-gitter" x1="${CX + 40}" y1="${y + 12}" x2="${CX + 40}" y2="${y + 42}"/>` }),
  haar: (y) => ({ h: 52, ende: true, rechts: CX + 10, mitte: y + 20,
    svg: haken(CX, y + 4, true) + `<path class="sb-fc" d="M${CX - 15} ${y + 29} Q${CX - 4} ${y + 34} ${CX} ${y + 38}"/><circle class="sb-boilie" cx="${CX}" cy="${y + 44}" r="7"/>` }),
  paternoster: (y) => ({ h: 104, rechts: CX + 26, mitte: y + 52,
    svg: [14, 40, 66, 92].map(d => `<path class="sb-fc" d="M${CX} ${y + d} L${CX + 14} ${y + d + 4}"/>${haken(CX + 16, y + d + 4).replace(/r="2.2"/, 'r="1.2"')}<rect class="sb-glitzer" x="${CX + 4}" y="${y + d + 12}" width="10" height="4" rx="2"/>`).join("") }),
  krallenblei: (y) => ({ h: 46, ende: true, rechts: CX + 14, mitte: y + 20,
    svg: `<circle class="sb-ring" cx="${CX}" cy="${y + 4}" r="3"/><path class="sb-blei" d="M${CX} ${y + 7} C${CX + 9} ${y + 14} ${CX + 9} ${y + 26} ${CX} ${y + 32} C${CX - 9} ${y + 26} ${CX - 9} ${y + 14} ${CX} ${y + 7}Z"/>
      <path class="sb-draht" d="M${CX - 4} ${y + 28} L${CX - 12} ${y + 40} M${CX + 4} ${y + 28} L${CX + 12} ${y + 40} M${CX - 1} ${y + 31} L${CX - 4} ${y + 44} M${CX + 1} ${y + 31} L${CX + 4} ${y + 44}"/>` }),
  pilker: (y) => ({ h: 72, ende: true, rechts: CX + 14, mitte: y + 30,
    svg: `<circle class="sb-ring" cx="${CX}" cy="${y + 4}" r="3"/><path class="sb-spoon" d="M${CX} ${y + 7} L${CX + 7} ${y + 16} L${CX + 6} ${y + 46} L${CX} ${y + 54} L${CX - 6} ${y + 46} L${CX - 7} ${y + 16}Z"/>` +
      haken(CX, y + 56).replace(/r="2.2"/, 'r="0"') + `<path class="sb-draht" d="M${CX} ${y + 70} A5 5 0 0 0 ${CX + 10} ${y + 70} L${CX + 10} ${y + 65}"/>` })
};

export function schaubildSVG(bild, titel){
  let y = 6, stil = "mono";
  const teile = [];
  bild.forEach(([typ, text, zusatz], i) => {
    const f = TEILE[typ] || TEILE.koeder;
    if(typ === "schnur" || typ === "vorfach") stil = zusatz || (typ === "vorfach" ? "fc" : "mono");
    const t = f(y, zusatz);
    const mitte = t.mitte ?? (y + t.h / 2);
    let svg = "";
    /* Schnur hinter dem Teil (auch durch Pose, Blei, Perle hindurch) */
    if(typ !== "rute"){
      const bis = t.ende ? y + 4 : y + t.h;
      svg += linie(y, bis, stil);
    } else {
      svg += linie(y + 35, y + t.h, stil);   // vom Spitzenring nach unten
    }
    svg += t.svg || "";
    svg += label(text, mitte, t.rechts + 4);
    teile.push(svg);
    y += t.h;
  });
  const h = y + 8;
  return `<svg class="schaubild" viewBox="0 0 ${W} ${h}" role="img" aria-label="${esc("Schaubild: " + (titel || "Montage"))}" preserveAspectRatio="xMinYMin meet">
    <title>${esc(titel || "Montage")}</title>${teile.join("")}</svg>`;
}
