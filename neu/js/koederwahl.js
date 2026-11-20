/* ============================================================
   Köderwahl für heute
   Farbe, Größe und Führung je Zielfisch – aus Wassertrübung (von dir
   gewählt oder geschätzt), Licht (Bewölkung, Dämmerung) und
   Wassertemperatur (Küste gemessen, sonst Monats-Richtwert).
   Faustregeln erfahrener Angler, keine Garantie – Köder wechseln,
   wenn es nicht läuft. Passende Teile aus der Kleinteile-Box.
   ============================================================ */
import { lese, schreibe } from "./store.js";
import { box, teilVorhanden } from "./kleinteile.js";

const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[c]));
const KEY = "neu_truebung_v1";
/* Richtwert Wassertemperatur Binnengewässer SH je Monat (°C) */
const WT_MONAT = [3, 3, 5, 9, 14, 18, 20, 20, 16, 12, 7, 4];
const TRUEB = [["klar", "klar"], ["leicht", "leicht trüb"], ["trueb", "trüb"]];

export function truebungSetzen(ortId, iso, wert){
  const m = lese(KEY, {}) || {};
  m[ortId] = { iso, wert };
  schreibe(KEY, m);
}
function truebung(ort, iso, kt){
  const m = (lese(KEY, {}) || {})[ort.id];
  if(m && m.iso === iso) return { wert: m.wert, quelle: "du" };
  if(kt && kt.welle != null){
    const auf = kt.rel && kt.rel.art !== "ablandig";
    return { wert: auf && kt.welle >= 0.5 ? "trueb" : auf && kt.welle >= 0.25 ? "leicht" : "klar", quelle: "Welle" };
  }
  const g = ort.gw;
  return { wert: ["elbe", "eider", "nok"].includes(g) ? "leicht" : g === "forellensee" || g === "see" ? "klar" : "leicht", quelle: "geschätzt" };
}

/* Farbe aus Trübung + Licht */
function farbe(tr, licht, fisch){
  if(licht === "nacht") return { text: "dunkel (Schwarz, Dunkelblau) – die Silhouette zählt", grund: "nachts" };
  if(fisch === "forelle"){
    if(tr === "trueb") return { text: "Gelb, Orange, Weiß – auffällig", grund: "trübes Wasser" };
    return licht === "hell" ? { text: "gedeckt: Braun, Oliv, Schwarz", grund: "klar und hell – Forellen werden vorsichtig" } : { text: "hell: Gelb, Weiß, Neon-Orange", grund: "bedeckt / Dämmerung" };
  }
  if(fisch === "meerforelle"){
    if(tr === "trueb") return { text: "Kupfer, Orange, Rot-Gold", grund: "angetrübtes Wasser" };
    return licht === "hell" ? { text: "Silber, Blau-Silber, Grün-Silber – natürlich", grund: "klares Wasser bei Licht" } : { text: "Silber-Schwarz mit Kontrast, Rosa als Garnelenfarbe", grund: "wenig Licht" };
  }
  if(tr === "trueb") return { text: "Schockfarben: Chartreuse, Firetiger, Orange – dazu Köder mit Druck (Schaufelschwanz, rasselnd)", grund: "trübes Wasser" };
  if(tr === "leicht") return { text: licht === "hell" ? "Kontrast: Motoroil-Glitter, Perlweiß, Grün-Weiß" : "hell mit Kontrast: Weiß, Perlmutt, UV-aktiv", grund: "leicht trüb" };
  return { text: licht === "hell" ? "natürlich: Weißfisch-, Barsch-Dekor, Silber, Grün-Gold – dezent" : "natürlich mit Kontrast: Silber mit dunklem Rücken, UV", grund: "klares Wasser" };
}
function fuehrung(wt, fisch){
  if(["quappe", "aal", "karpfen", "schleie", "rotauge", "wels"].includes(fisch)) return null;
  if(wt < 8) return "langsam und grundnah, lange Pausen – kalte Fische verfolgen nicht weit";
  if(wt < 14) return "normal, mit Spinstops und Tempowechseln";
  return "zügig, auch im Mittelwasser und an der Oberfläche";
}
/* Größe/Ködertyp je Fisch */
function koeder(fisch, wt, tr){
  const kalt = wt < 8;
  switch(fisch){
    case "zander": return { typ: `Gummifisch ${kalt ? "7–10 cm, schlank (No-Action/Finesse)" : "10–13 cm, Shad"} am Jigkopf`, kat: ["gummi", "jig"] };
    case "hecht": return { typ: `${kalt ? "großer Gummifisch oder Jerkbait 15–20 cm – langsam" : "Gummifisch, Spinnerbait oder Wobbler 12–18 cm"}${tr === "trueb" ? ", mit viel Druck" : ""}`, kat: ["gummi", "kunst"] };
    case "barsch": return { typ: kalt ? "kleine Gummis 3–5 cm am Dropshot oder leichten Jig" : "Gummi 5–8 cm, Spinner Gr. 2–3, kleine Wobbler", kat: ["gummi", "kunst", "jig"] };
    case "forelle": return { typ: kalt ? "Spoon 1,5–2 g langsam, Teig/Bienenmade am Sbirolino" : "Spoon 2–3 g, Tremarella, Teig", kat: ["kunst", "natur"] };
    case "meerforelle": return { typ: kalt ? "Wobbler/Garnelenimitat langsam, Blinker 15–18 g" : "Blinker 18–25 g für Weite, Küstenwobbler", kat: ["kunst"] };
    case "dorsch": return { typ: "Pilker 40–80 g, darüber Beifänger (Twister/Gummimakk) in Rot/Orange", kat: ["kunst", "gummi"] };
    case "wolfsbarsch": return { typ: "Gummifisch 10–14 cm Weiß/Silber, Popper bei ruhiger See", kat: ["gummi", "kunst"] };
    case "hornhecht": return { typ: "schlanker Blinker 10–20 g Silber/Grün mit Hornhechtseide statt Drilling", kat: ["kunst"] };
    case "rapfen": return { typ: "schlanker Blinker oder Jigspinner – schnell an der Oberfläche", kat: ["kunst"] };
    case "quappe": return { typ: "Tauwurm-Bündel oder Fischfetzen am Grund, nachts", kat: ["natur"] };
    case "aal": return { typ: "Tauwurm oder kleiner Köderfisch am Grund", kat: ["natur"] };
    case "karpfen": return { typ: "Mais, Boilie, Pellets – im Kalten kleine Happen", kat: ["natur"] };
    case "schleie": return { typ: "Mais, Wurm, Made an feiner Pose", kat: ["natur"] };
    case "rotauge": return { typ: "Made, Mais, Brotflocke", kat: ["natur"] };
    case "flunder": return { typ: "Wattwurm/Seeringelwurm, Lockperlen in Rot", kat: ["natur", "perlen"] };
    default: return null;
  }
}

export function koederKarteHTML(ort, lage, fische, kt, tagWort = "heute"){
  if(!lage || !fische.length) return "";
  const iso = lage.iso;
  const tr = truebung(ort, iso, kt);
  const monat = +lage.iso.slice(5, 7);
  const wt = kt && kt.sst != null ? { wert: kt.sst, quelle: "gemessen" } : { wert: WT_MONAT[monat - 1], quelle: "Richtwert" };
  const licht = (lage.wolken ?? 50) < 40 ? "hell" : "trueb";
  const b = box();
  const zeilen = fische.slice(0, 3).map(f => {
    const k = koeder(f.id, wt.wert, tr.wert);
    if(!k) return "";
    const kunst = !k.kat.every(x => x === "natur" || x === "perlen");
    const fa = kunst ? farbe(tr.wert, licht, f.id) : null;
    const fa2 = kunst && f.zeitTipp && /dämmerung|nacht/i.test(f.zeitTipp) ? farbe(tr.wert, "nacht", f.id) : null;
    const fu = fuehrung(wt.wert, f.id);
    const ausBox = b.teile.filter(t => k.kat.includes(t.kat) && teilVorhanden(t)).slice(0, 4).map(t => t.name);
    return `<li class="kw-fisch"><b>${esc(f.name.split(" (")[0])}</b>
      <dl class="reihen">
        <div class="reihe"><dt>Köder</dt><dd>${esc(k.typ)}</dd></div>
        ${fa ? `<div class="reihe"><dt>Farbe</dt><dd>${esc(fa.text)}${fa2 && /nacht/.test(fa2.grund) ? ` · <small>nachts: ${esc(fa2.text.split(" – ")[0])}</small>` : ""}</dd></div>` : ""}
        ${fu ? `<div class="reihe"><dt>Führung</dt><dd>${esc(fu)}</dd></div>` : ""}
        ${ausBox.length ? `<div class="reihe"><dt>Aus deiner Box</dt><dd>${esc(ausBox.join(", "))}</dd></div>` : ""}
      </dl></li>`;
  }).filter(Boolean);
  if(!zeilen.length) return "";
  return `<div class="h-karte h-koeder"><h3>Köder ${tagWort === "heute" ? "heute" : "für " + tagWort}</h3>
    <div class="kw-lage">
      <div class="chips" role="group" aria-label="Wassertrübung">${TRUEB.map(([v, l]) => `<button type="button" class="chip${tr.wert === v ? " on" : ""}" data-truebung="${v}" aria-pressed="${tr.wert === v}">${l}</button>`).join("")}</div>
      <span class="hinweis-klein">Wasser ${tr.quelle === "du" ? "laut dir" : tr.quelle === "Welle" ? "aus der Welle geschätzt" : "geschätzt – tippe, wie es aussieht"} · ${Math.round(wt.wert)} °C ${wt.quelle === "gemessen" ? "gemessen" : "(Richtwert für den Monat)"} · ${licht === "hell" ? "viel Licht" : "bedeckt"}</span>
    </div>
    <ul class="kw-liste">${zeilen.join("")}</ul>
    <p class="hinweis-klein">Faustregeln: klares Wasser natürlich, trübes Wasser auffällig, nachts dunkel. Läuft nach 20 Minuten nichts, Farbe oder Größe wechseln.</p></div>`;
}
