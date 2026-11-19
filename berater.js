/* ============================================================
   Berater mit Regeln (Etappe 3) – gemeinsam für alte und neue App

   Statt "Zander faulenzen -> setup1" beschreibt jeder Ansatz, was er
   BRAUCHT (Gesamt-Wurfgewicht je Gewässer, Schnurart/-stärke,
   Rutenlänge, Freilauf, Rollengröße). Jedes deiner Setups wird dagegen
   geprüft – neue Ruten tauchen damit automatisch überall auf, wo sie
   passen, und die Montage nennt immer die Schnur, die wirklich drauf ist.

   Ampel je Setup:  0 = passt (grün) · 1 = geht (gelb) · 2 = passt nicht (rot)
   Status je Ansatz: bestes Setup grün -> machbar, gelb -> bedingt, sonst wunsch.

   Wurfgewicht = GESAMTgewicht am Wurf (Blei/Jigkopf + Köder/Futter),
   nicht nur das Blei. Deshalb sind die Werte unten höher als in der Montage.

   Muss nach data.js und ausruestung.js geladen werden.
   ============================================================ */
const BERATER = (function(){

  /* ---------- Anforderungen ----------
     [fischId, Index im Fisch, Anfang des Methodennamens (Kontrolle), Anforderung]
     koeder: { alle:[min,max], <gewässer>:[min,max] } in g (gesamt)
     schnur: { geflecht:[dmMin,dmMax], mono:[..], fc:[..] } – erlaubte Arten
     laenge: [min,max] m · laengeHart: außerhalb = rot statt gelb
     freilauf: "pflicht" | "gut" | "nein" · rolleMin: Mindestgröße
     stippe: true = nur Stippruten (laenge gilt), sonst nie Stippruten
     kat: bevorzugte Setup-Gruppen (nur Reihenfolge)
     spezial: Rute ist genau dafür gebaut (Name), kommt bei Gleichstand nach vorn
     maxStatus: höchstens dieser Status (z. B. wenn Zubehör fehlt)
     hinweis: Zusatzsatz für die Begründung */
  const STROEMUNG = ["eider", "elbe"];
  const A = [
    ["zander", 0, "Spinnfischen – Gummifisch", { koeder:{ alle:[15,37], see:[15,24], nok:[15,24], eider:[20,28], elbe:[24,37] },
      schnur:{ geflecht:[0.10,0.18] }, laenge:[2.2,3.0], freilauf:"nein", kat:["raubfisch"], spezial:/zander/i }],
    ["zander", 1, "Ansitz – Köderfisch am Grund", { koeder:{ alle:[30,75], see:[30,45], nok:[30,45], eider:[50,75], elbe:[50,75] },
      schnur:{ mono:[0.28,0.40], geflecht:[0.14,0.25] }, laenge:[2.7,3.9], freilauf:"gut", kat:["ansitz"] }],
    ["hecht", 0, "Spinnfischen – Gummifisch/Wobbler", { koeder:{ alle:[18,45] },
      schnur:{ geflecht:[0.14,0.25] }, laenge:[2.2,3.0], freilauf:"nein", kat:["raubfisch"], hinweis:"Stahlvorfach ist Pflicht." }],
    ["hecht", 1, "Ansitz – Köderfisch unter Pose", { koeder:{ alle:[25,50] },
      schnur:{ geflecht:[0.14,0.25], mono:[0.30,0.40] }, laenge:[2.7,3.9], freilauf:"gut", kat:["ansitz","raubfisch"], hinweis:"Stahlvorfach ist Pflicht." }],
    ["barsch", 0, "Dropshot", { koeder:{ alle:[5,16], see:[5,10], nok:[5,10], eider:[9,16], elbe:[9,16] },
      schnur:{ geflecht:[0.04,0.12], fc:[0.16,0.25] }, laenge:[1.8,2.6], freilauf:"nein", kat:["raubfisch","forelle"] }],
    ["barsch", 1, "Spinnfischen – kleiner Gummifisch", { koeder:{ alle:[6,18] },
      schnur:{ geflecht:[0.06,0.16] }, laenge:[1.9,2.8], freilauf:"nein", kat:["raubfisch"] }],
    ["barsch", 2, "Light Game", { koeder:{ alle:[4,13] },
      schnur:{ geflecht:[0.04,0.12] }, laenge:[1.8,2.4], freilauf:"nein", kat:["raubfisch"] }],
    ["forelle", 0, "Trout Area – Spoons", { koeder:{ alle:[1.5,4] },
      schnur:{ geflecht:[0.04,0.10], mono:[0.12,0.20], fc:[0.12,0.20] }, laenge:[1.8,2.6], freilauf:"nein", kat:["forelle"] }],
    ["forelle", 1, "Trout Area – Spoons (FTM", { koeder:{ alle:[1.5,4] },
      schnur:{ mono:[0.12,0.20], fc:[0.12,0.20], geflecht:[0.04,0.10] }, laenge:[3.3,4.2], freilauf:"nein", kat:["forelle"] }],
    ["forelle", 2, "Sbirolino / Pose", { koeder:{ alle:[10,25] },
      schnur:{ mono:[0.18,0.28] }, laenge:[3.3,4.2], kat:["forelle"], spezial:/sbiro/i }],
    ["forelle", 3, "Passive Zweitangel", { koeder:{ alle:[6,15] },
      schnur:{ mono:[0.16,0.28] }, laenge:[3.0,4.2], freilauf:"gut", kat:["forelle"] }],
    ["rapfen", 0, "Spinnfischen – weite Würfe", { koeder:{ alle:[15,30] },
      schnur:{ geflecht:[0.10,0.18] }, laenge:[2.4,3.0], freilauf:"nein", kat:["raubfisch"] }],
    ["doebel", 0, "Leichtes Spinnen", { koeder:{ alle:[2,7] },
      schnur:{ geflecht:[0.04,0.12], mono:[0.14,0.20] }, laenge:[1.8,2.5], freilauf:"nein", kat:["forelle","raubfisch"] }],
    ["aal", 0, "Grundangeln – Tauwurm", { koeder:{ alle:[17,53], see:[17,28], nok:[17,28], eider:[32,53], elbe:[32,53] },
      schnur:{ mono:[0.25,0.40], geflecht:[0.12,0.25] }, laenge:[2.7,3.9], freilauf:"gut", kat:["ansitz"] }],
    ["quappe", 0, "Grundangeln – Fisch", { koeder:{ alle:[32,65] },
      schnur:{ mono:[0.25,0.40], geflecht:[0.12,0.25] }, laenge:[2.7,3.9], freilauf:"gut", kat:["ansitz"] }],
    ["karpfen", 0, "Ansitz – Selbsthak", { koeder:{ alle:[60,125] },
      schnur:{ mono:[0.30,0.40], geflecht:[0.18,0.30] }, laenge:[3.3,3.9], freilauf:"pflicht", rolleMin:3500, kat:["ansitz"] }],
    ["karpfen", 1, "Feederangeln", { koeder:{ alle:[45,85] },
      schnur:{ mono:[0.20,0.28], geflecht:[0.10,0.16] }, laenge:[3.3,4.0], kat:["feeder"] }],
    ["schleie", 0, "Stippen", { stippe:true, laenge:[3.5,8] }],
    ["schleie", 1, "Feederangeln", { koeder:{ alle:[35,55] },
      schnur:{ mono:[0.18,0.26], geflecht:[0.08,0.14] }, laenge:[3.3,4.0], kat:["feeder"] }],
    ["schleie", 2, "Ansitz (Dämmerung)", { koeder:{ alle:[4,12] },
      schnur:{ mono:[0.18,0.30] }, laenge:[3.0,4.2], freilauf:"gut", kat:["forelle","ansitz"] }],
    ["rotauge", 0, "Stippen", { stippe:true, laenge:[2.5,8] }],
    ["rotauge", 1, "Grund-/Feederangeln", { koeder:{ alle:[35,55] },
      schnur:{ mono:[0.16,0.24], geflecht:[0.08,0.14] }, laenge:[3.3,4.0], kat:["feeder"] }],
    ["wels", 0, "Ansitz – Köderfisch", { koeder:{ alle:[80,200] },
      schnur:{ geflecht:[0.35,0.55] }, laenge:[2.7,3.3], rolleMin:6000, kat:["ansitz"] }],
    ["dorsch", 0, "Pilken", { koeder:{ alle:[60,150] },
      schnur:{ geflecht:[0.17,0.28] }, laenge:[2.1,2.7], laengeHart:true, rolleMin:4000, kat:["raubfisch"], hinweis:"Nach dem Salzwasser alles mit Süßwasser abspülen." }],
    ["hering", 0, "Heringspaternoster", { koeder:{ alle:[35,55] },
      schnur:{ geflecht:[0.12,0.20], mono:[0.25,0.35] }, laenge:[2.7,4.2], freilauf:"nein", kat:["raubfisch"], maxStatus:"bedingt", hinweis:"Dazu brauchst du ein fertiges Heringspaternoster." }],
    ["wolfsbarsch", 0, "Spinnfischen an der Küste", { koeder:{ alle:[10,25] },
      schnur:{ geflecht:[0.10,0.18] }, laenge:[2.7,3.3], freilauf:"nein", kat:["raubfisch"], hinweis:"Nach dem Salzwasser alles mit Süßwasser abspülen." }],
    ["flunder", 0, "Brandungsangeln", { koeder:{ alle:[100,200] },
      schnur:{ geflecht:[0.18,0.25], mono:[0.30,0.40] }, laenge:[3.9,4.5], laengeHart:true, rolleMin:5000, kat:["ansitz"] }],
    ["meerforelle", 0, "Küstenspinnen", { koeder:{ alle:[12,28] },
      schnur:{ geflecht:[0.10,0.17] }, laenge:[2.9,3.4], freilauf:"nein", kat:["raubfisch"], hinweis:"An der Küste zählt Wurfweite – ideal sind 3,00–3,30 m. Nach dem Salzwasser abspülen." }],
    ["hornhecht", 0, "Küstenspinnen – kleiner Blinker", { koeder:{ alle:[10,22] },
      schnur:{ geflecht:[0.10,0.17] }, laenge:[2.9,3.4], freilauf:"nein", kat:["raubfisch"], hinweis:"An der Küste zählt Wurfweite. Nach dem Salzwasser abspülen." }]
  ];

  const ANF = new Map();   // Ansatz-Objekt -> Anforderung
  A.forEach(([fid, i, anfang, anf]) => {
    const f = FISCHE.find(x => x.id === fid);
    const a = f && f.ansaetze[i];
    if(a && a.methode.startsWith(anfang)) ANF.set(a, anf);
    else console.warn("Berater-Regel passt nicht mehr:", fid, i, anfang);
  });

  /* Ursprüngliche Werte aus data.js merken (werden beim Anwenden überschrieben) */
  FISCHE.forEach(f => f.ansaetze.forEach(a => {
    a._orig = { setup: a.setup || null, status: a.status, montage: a.montage };
  }));

  const komma = v => String(v).replace(".", ",");
  const g = v => komma(Math.round(v * 10) / 10) + " g";
  const ART = { geflecht: "Geflecht", mono: "Mono", fc: "Fluoro" };

  function koederFuer(anf, gw){
    if(!anf.koeder) return null;
    return (gw && anf.koeder[gw]) || anf.koeder.alle;
  }
  function schnurVon(rolle){
    if(!rolle) return null;
    const i = rolle.schnurInfo || AUSR.parseSchnur(rolle.schnur);
    const art = i.art || AUSR.schnurArt(rolle.schnur);
    const dm = i.dm ? parseFloat(i.dm.replace(",", ".")) : null;
    return { art, dm };
  }
  const log = v => Math.log(v);

  /* ---------- Ein Setup gegen einen Ansatz prüfen ---------- */
  function pruefe(set, anf, gw){
    const gruende = [], plus = [];
    let stufe = 0, score = 100;
    const gelb = (t, abzug) => { gruende.push(t); stufe = Math.max(stufe, 1); score -= abzug || 15; };
    const rot = t => { gruende.push(t); stufe = 2; score -= 100; };
    const rute = RUTEN.find(r => r.id === set.ruteId);
    const rolle = set.rolleId ? ROLLEN.find(r => r.id === set.rolleId) : null;
    const istStippe = set.kategorie === "stippe";

    if(/verkauf/i.test(set.name || "")) rot("wird verkauft");

    if(anf.stippe){
      if(!istStippe){ rot("keine Stipprute"); return { stufe, gruende, plus, score }; }
      const L = rute && rute.laenge;
      if(L && anf.laenge){
        if(L < anf.laenge[0]) gelb(`mit ${komma(L)} m eher kurz (ideal ab ${komma(anf.laenge[0])} m)`);
        else plus.push(`${komma(L)} m Stippe`);
      }
      if(L) score += Math.min(10, L);   // längere Stippe = mehr Reichweite
      return { stufe, gruende, plus, score };
    }
    if(istStippe){ rot("Stipprute ohne Rolle"); return { stufe, gruende, plus, score }; }
    if(!rolle){ rot("keine Rolle montiert"); return { stufe, gruende, plus, score }; }

    /* Wurfgewicht gegen Gesamtgewicht */
    const k = koederFuer(anf, gw);
    if(k && rute && rute.wg){
      const [w1, w2] = rute.wg, [a, b] = k;
      if(a > w2 * 1.1 || b > w2 * 1.5) rot(`Köder ${komma(a)}–${g(b)} zu schwer für WG ${komma(w1)}–${komma(w2)} g`);
      else if(b > w2 * 1.1) gelb(`obere Gewichte (bis ${g(b)}) über dem WG von ${komma(w2)} g`, 12);
      else if(b < w1 * 0.5) rot(`Köder ${komma(a)}–${g(b)} viel zu leicht für WG ${komma(w1)}–${komma(w2)} g`);
      else if(b < w1) gelb(`Köder (${komma(a)}–${g(b)}) leichter als das WG ab ${komma(w1)} g – die Rute lädt kaum`, 12);
      else plus.push(`Köder ${komma(a)}–${g(b)} im WG ${komma(w1)}–${komma(w2)} g`);
      /* Nähe zur Mitte des Wurfgewichts: lieber passend als gerade noch */
      const mk = (log(a) + log(b)) / 2, mw = (log(w1) + log(w2)) / 2, span = Math.max(0.3, log(w2) - log(w1));
      score -= Math.min(12, Math.abs(mk - mw) / span * 12);
    } else if(k && rute && !rute.wg){
      gelb("kein Wurfgewicht hinterlegt", 8);
    }

    /* Schnur */
    if(anf.schnur){
      const sc = schnurVon(rolle);
      if(!sc || !sc.art) gelb("Schnurart unbekannt", 8);
      else if(!anf.schnur[sc.art]){
        const erlaubt = Object.keys(anf.schnur).map(x => ART[x]).join(" oder ");
        gelb(`${ART[sc.art]} drauf, hier besser ${erlaubt}`);
      } else if(sc.dm){
        const [d1, d2] = anf.schnur[sc.art];
        if(sc.dm < d1 * 0.9) gelb(`${ART[sc.art]} ${komma(sc.dm)} mm eher zu dünn (ab ${komma(d1)})`);
        else if(sc.dm > d2 * 1.1) gelb(`${ART[sc.art]} ${komma(sc.dm)} mm eher zu dick (bis ${komma(d2)})`, 10);
        else plus.push(`${ART[sc.art]} ${komma(sc.dm)} mm passt`);
      }
    }

    /* Länge */
    if(anf.laenge && rute && rute.laenge){
      const L = rute.laenge, [l1, l2] = anf.laenge;
      const raus = L < l1 - 0.05 ? `mit ${komma(L)} m kürzer als ideal (${komma(l1)}–${komma(l2)} m)` :
                   L > l2 + 0.05 ? `mit ${komma(L)} m länger als ideal (${komma(l1)}–${komma(l2)} m)` : "";
      if(raus){ if(anf.laengeHart) rot(raus); else gelb(raus, 10); }
    }

    /* Freilauf */
    if(anf.freilauf === "pflicht" && !rolle.freilauf) gelb("ohne Freilauf – Bügel offen lassen oder Schnurclip", 18);
    else if(anf.freilauf === "gut" && rolle.freilauf){ plus.push("Freilauf"); score += 8; }
    else if(anf.freilauf === "nein" && rolle.freilauf) gelb("Freilaufrolle bringt beim aktiven Führen nichts", 8);

    /* Rollengröße */
    if(anf.rolleMin && rolle.groesse && rolle.groesse < anf.rolleMin) rot(`Rolle ${rolle.groesse} zu klein (ab ${anf.rolleMin})`);

    /* Vorlieben */
    if(anf.kat && anf.kat.includes(set.kategorie)) score += 6;
    if(set.kategorie === "backup") score -= 10;
    if(anf.spezial && rute && anf.spezial.test(rute.name)){ score += 6; plus.push("genau dafür gebaut"); }

    return { stufe, gruende, plus, score };
  }

  /* Alle Setups für einen Ansatz, beste zuerst. erlaubt: Set von Setup-Keys (z. B. "Heute dabei") */
  function rangliste(a, gw, erlaubt){
    const anf = ANF.get(a);
    if(!anf) return null;
    return Object.values(AKTUELL)
      .filter(s => !erlaubt || !erlaubt.size || erlaubt.has(s.key))
      .map(s => ({ setup: s, ...pruefe(s, anf, gw) }))
      .sort((x, y) => x.stufe - y.stufe || y.score - x.score);
  }

  /* Montage mit der echten Hauptschnur des Setups */
  function montageFuer(a, set){
    const orig = a._orig.montage || [];
    if(!set || !set.rolleId) return orig;
    return orig.map(m => /^hauptschnur$/i.test(m.k) ? { k: m.k, v: (set.schnur || m.v).split(" – ")[0] } : m);
  }

  const STATUS = ["machbar", "bedingt", "wunsch"];
  const RANG = { machbar: 0, bedingt: 1, wunsch: 2 };

  /* Status eines Ansatzes an einem Gewässer: bestes Setup + Rangliste */
  function bewerte(a, gw, erlaubt){
    const liste = rangliste(a, gw || null, erlaubt);
    if(!liste) return null;
    const anf = ANF.get(a);
    let st = liste[0] ? liste[0].stufe : 2;
    if(anf.maxStatus) st = Math.max(st, RANG[anf.maxStatus]);
    return { status: STATUS[st], liste, bester: liste[0] && liste[0].stufe < 2 ? liste[0] : null };
  }

  /* Für ein Gewässer (oder alle) jedem Ansatz das beste Setup zuweisen.
     Setzt a.setup, a.status, a.montage und a.regel – der übrige Code
     beider Apps arbeitet unverändert mit diesen Feldern. */
  function wendeAn(gw, erlaubt){
    FISCHE.forEach(f => f.ansaetze.forEach(a => {
      const b = bewerte(a, gw, erlaubt);
      if(!b){ a.setup = a._orig.setup; a.status = a._orig.status; a.montage = a._orig.montage; a.regel = null; return; }
      const anf = ANF.get(a);
      const liste = b.liste, bester = liste[0];
      a.status = b.status;
      a.setup = b.bester ? b.bester.setup.key : null;
      a.montage = montageFuer(a, a.setup ? AKTUELL[a.setup] : null);
      a.regel = {
        koeder: koederFuer(anf, gw),
        gruende: bester ? bester.gruende : [],
        plus: bester ? bester.plus : [],
        hinweis: anf.hinweis || "",
        alternativen: liste.slice(1).filter(x => x.stufe <= (bester ? bester.stufe : 0) && x.stufe < 2).slice(0, 3).map(x => ({ key: x.setup.key, stufe: x.stufe })),
        gw: gw || null
      };
    }));
  }

  /* Für die Rutenwand: wofür taugt dieses Setup? Je Ansatz die Gewässer mit grün/gelb */
  function fuerSetup(key){
    const set = AKTUELL[key];
    if(!set) return [];
    const out = [];
    FISCHE.forEach(f => f.ansaetze.forEach(a => {
      const anf = ANF.get(a);
      if(!anf) return;
      const gws = (a.gewaesser || f.gewaesser || []);
      const jeGw = gws.map(gw => ({ gw, ...pruefe(set, anf, gw) }));
      const besteStufe = Math.min(...jeGw.map(x => x.stufe));
      if(besteStufe >= 2) return;
      /* Ist dieses Setup für den Ansatz auch das beste? (über alle Gewässer gerechnet) */
      const rl = rangliste(a, null);
      const platz = rl.findIndex(x => x.setup.key === key) + 1;
      const besser = rl.filter(x => x.stufe < 2 && x.setup.key !== key).slice(0, platz - 1).map(x => x.setup);
      out.push({
        fisch: f, ansatz: a, stufe: besteStufe,
        gwGruen: jeGw.filter(x => x.stufe === 0).map(x => x.gw),
        gwGelb: jeGw.filter(x => x.stufe === 1).map(x => x.gw),
        gruende: jeGw.find(x => x.stufe === besteStufe).gruende,
        plus: jeGw.find(x => x.stufe === besteStufe).plus,
        platz, besser, hinweis: anf.hinweis || "",
        maxStatus: anf.maxStatus || null
      });
    }));
    return out.sort((x, y) => x.stufe - y.stufe || x.platz - y.platz);
  }

  /* Startzustand: über alle Gewässer gerechnet; nach jeder Ausrüstungsänderung neu */
  wendeAn(null);
  if(typeof AUSR !== "undefined") AUSR.beiAenderung(() => wendeAn(null));

  return { bewerte, pruefe: (set, a, gw) => ANF.get(a) ? pruefe(set, ANF.get(a), gw) : null, rangliste, wendeAn, fuerSetup, montageFuer,
    hatRegel: a => ANF.has(a), koederFuer: (a, gw) => ANF.get(a) ? koederFuer(ANF.get(a), gw) : null };
})();
