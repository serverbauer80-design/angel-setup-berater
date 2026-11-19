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
     schnur: { geflecht:[kgMin,kgMax], mono:[..], fc:[..] } – erlaubte Arten mit
             Tragkraft in kg (eingetragen oder aus dem Durchmesser geschätzt).
             kgMax ist bei feinen Methoden wichtig (zu dicke Schnur = weniger Bisse)
     aktion: passende Rutenaktionen ("schnell" | "mittel" | "parabolisch")
     spitze: "feeder" = Bibberspitze nötig
     kueste: Salzwasser – Hinweis zur Rolle
     schnurWichtig: kräftige Fische, eine alte Schnur zählt stärker
     passiv: Rute liegt im Halter (Ansitz/Pose) – eine kräftigere Rute schadet nicht
     laenge: [min,max] m · laengeHart: außerhalb = rot statt gelb
     freilauf: "pflicht" | "gut" | "nein" · rolleMin: Mindestgröße
     stippe: true = nur Stippruten (laenge gilt), sonst nie Stippruten
     kat: bevorzugte Setup-Gruppen (nur Reihenfolge)
     spezial: Rute ist genau dafür gebaut (Name), kommt bei Gleichstand nach vorn
     maxStatus: höchstens dieser Status (z. B. wenn Zubehör fehlt)
     hinweis: Zusatzsatz für die Begründung */
  const STROEMUNG = ["eider", "elbe"];
  const A = [
    /* ---- Raubfisch ---- */
    ["zander", 0, "Spinnfischen – Gummifisch", { koeder:{ alle:[15,45], see:[15,24], nok:[15,26], eider:[20,30], elbe:[28,45] },
      schnur:{ geflecht:[6,14] }, laenge:[2.2,3.0], aktion:["schnell"], freilauf:"nein", kat:["raubfisch"], spezial:/zander/i, schnurWichtig:true,
      hinweis:"Faulenzen braucht eine straffe Spitze: Der Biss kommt meist in der Absinkphase als feiner Tock." }],
    ["zander", 1, "Ansitz – Köderfisch am Grund", { koeder:{ alle:[30,80], see:[30,45], nok:[35,55], eider:[50,80], elbe:[70,130] },
      schnur:{ mono:[7,14], geflecht:[7,18] }, laenge:[2.7,3.9], aktion:["mittel","parabolisch"], freilauf:"gut", kat:["ansitz"], schnurWichtig:true,
      hinweis:"Zander lassen den Köder bei Widerstand sofort los – Freilauf oder offener Bügel ist hier entscheidend. In der Elbe im Buhnenfeld leichter, im Strom deutlich schwerer." , passiv:true }],
    ["hecht", 0, "Spinnfischen – Gummifisch/Wobbler", { koeder:{ alle:[18,45] },
      schnur:{ geflecht:[8,20] }, laenge:[2.2,3.0], aktion:["schnell","mittel"], freilauf:"nein", kat:["raubfisch"], schnurWichtig:true,
      hinweis:"Stahl- oder Titanvorfach ist Pflicht – Hechtzähne durchtrennen jede Schnur." }],
    ["hecht", 1, "Ansitz – Köderfisch unter Pose", { koeder:{ alle:[25,55] },
      schnur:{ geflecht:[8,20], mono:[8,14] }, laenge:[2.7,3.9], aktion:["mittel","parabolisch"], freilauf:"gut", kat:["ansitz","raubfisch"], schnurWichtig:true,
      hinweis:"Stahlvorfach ist Pflicht. Zügig anschlagen, damit der Hecht den Köder nicht tief schluckt." , passiv:true }],
    ["barsch", 0, "Dropshot", { koeder:{ alle:[5,18], see:[5,10], nok:[6,12], eider:[9,16], elbe:[10,18] },
      schnur:{ geflecht:[3,8], fc:[2,5] }, laenge:[1.8,2.6], aktion:["schnell"], freilauf:"nein", kat:["raubfisch","forelle"] }],
    ["barsch", 1, "Spinnfischen – kleiner Gummifisch", { koeder:{ alle:[6,18] },
      schnur:{ geflecht:[4,12] }, laenge:[1.9,2.8], aktion:["schnell","mittel"], freilauf:"nein", kat:["raubfisch"] }],
    ["barsch", 2, "Light Game", { koeder:{ alle:[4,13] },
      schnur:{ geflecht:[3,8] }, laenge:[1.8,2.4], aktion:["schnell"], freilauf:"nein", kat:["raubfisch"] }],
    ["rapfen", 0, "Spinnfischen – weite Würfe", { koeder:{ alle:[15,32] },
      schnur:{ geflecht:[6,14] }, laenge:[2.4,3.0], aktion:["schnell","mittel"], freilauf:"nein", kat:["raubfisch"], schnurWichtig:true,
      hinweis:"Rapfen jagen an der Oberfläche: dünne Geflochtene für Wurfweite, Köder schnell führen." }],
    ["doebel", 0, "Leichtes Spinnen", { koeder:{ alle:[2,7] },
      schnur:{ geflecht:[3,8], mono:[2,5] }, laenge:[1.8,2.5], aktion:["mittel","schnell"], freilauf:"nein", kat:["forelle","raubfisch"] }],

    /* ---- Forelle ---- */
    ["forelle", 0, "Trout Area – Spoons", { koeder:{ alle:[1.5,4] },
      schnur:{ geflecht:[2.5,6], mono:[1.5,4.5], fc:[1.5,4.5] }, laenge:[1.8,2.6], aktion:["mittel","parabolisch"], freilauf:"nein", kat:["forelle"],
      hinweis:"Eine weichere Rute puffert die Kopfstöße – Forellen schlitzen an zu straffem Gerät leicht aus." }],
    ["forelle", 1, "Trout Area – Spoons (FTM", { koeder:{ alle:[1.5,4] },
      schnur:{ mono:[1.5,4.5], fc:[1.5,4.5], geflecht:[2.5,6] }, laenge:[3.3,4.2], aktion:["parabolisch","mittel"], freilauf:"nein", kat:["forelle"] }],
    ["forelle", 2, "Sbirolino / Pose", { koeder:{ alle:[10,25] },
      schnur:{ mono:[2.5,7] }, laenge:[3.3,4.2], aktion:["parabolisch","mittel"], kat:["forelle"], spezial:/sbiro/i,
      hinweis:"Mono dehnt sich und verzeiht – beim langsamen Einholen des Sbirolinos ideal." }],
    ["forelle", 3, "Passive Zweitangel", { koeder:{ alle:[6,15] },
      schnur:{ mono:[2.5,7] }, laenge:[3.0,4.2], aktion:["parabolisch","mittel"], freilauf:"gut", kat:["forelle"] , passiv:true }],

    /* ---- Ansitz / Friedfisch ---- */
    ["aal", 0, "Grundangeln – Tauwurm", { koeder:{ alle:[17,60], see:[17,30], nok:[25,45], eider:[35,60], elbe:[60,110] },
      schnur:{ mono:[6,14], geflecht:[7,18] }, laenge:[2.7,3.9], aktion:["mittel","parabolisch"], freilauf:"gut", kat:["ansitz"],
      hinweis:"Aale ziehen sich ins Hindernis – kräftige Schnur und nicht zu lange warten mit dem Anhieb." , passiv:true }],
    ["quappe", 0, "Grundangeln – Fisch", { koeder:{ alle:[35,65], eider:[35,65], elbe:[60,110] },
      schnur:{ mono:[6,14], geflecht:[7,18] }, laenge:[2.7,3.9], aktion:["mittel","parabolisch"], freilauf:"gut", kat:["ansitz"] , passiv:true }],
    ["karpfen", 0, "Ansitz – Selbsthak", { koeder:{ alle:[60,125] },
      schnur:{ mono:[8,16], geflecht:[12,25] }, laenge:[3.3,3.9], aktion:["mittel","parabolisch"], freilauf:"pflicht", rolleMin:3500, kat:["ansitz"], schnurWichtig:true,
      hinweis:"Rute im Halter mit offenem Freilauf, Bissanzeiger an – der Karpfen hakt sich am Blei selbst." , passiv:true }],
    ["karpfen", 1, "Feederangeln", { koeder:{ alle:[45,85] },
      schnur:{ mono:[4,8], geflecht:[6,12] }, laenge:[3.3,4.0], spitze:"feeder", kat:["feeder"], schnurWichtig:true }],
    ["schleie", 0, "Stippen", { stippe:true, laenge:[3.5,8] }],
    ["schleie", 1, "Feederangeln", { koeder:{ alle:[35,55] },
      schnur:{ mono:[3.5,7], geflecht:[5,10] }, laenge:[3.3,4.0], spitze:"feeder", kat:["feeder"] }],
    ["schleie", 2, "Ansitz (Dämmerung)", { koeder:{ alle:[4,12] },
      schnur:{ mono:[3,8] }, laenge:[3.0,4.2], aktion:["parabolisch","mittel"], freilauf:"gut", kat:["forelle","ansitz"] , passiv:true }],
    ["rotauge", 0, "Stippen", { stippe:true, laenge:[2.5,8] }],
    ["rotauge", 1, "Grund-/Feederangeln", { koeder:{ alle:[35,55] },
      schnur:{ mono:[3,6], geflecht:[5,10] }, laenge:[3.3,4.0], spitze:"feeder", kat:["feeder"] }],
    ["wels", 0, "Ansitz – Köderfisch", { koeder:{ alle:[80,200] },
      schnur:{ geflecht:[30,60] }, laenge:[2.7,3.3], rolleMin:6000, kat:["ansitz"], schnurWichtig:true , passiv:true }],

    /* ---- Küste / Meer ---- */
    ["dorsch", 0, "Pilken", { koeder:{ alle:[60,150] },
      schnur:{ geflecht:[12,25] }, laenge:[2.1,2.7], laengeHart:true, rolleMin:4000, kat:["raubfisch"], kueste:true, schnurWichtig:true }],
    ["hering", 0, "Heringspaternoster", { koeder:{ alle:[35,55] },
      schnur:{ geflecht:[6,14], mono:[6,12] }, laenge:[2.7,4.2], freilauf:"nein", kat:["raubfisch"], maxStatus:"bedingt", kueste:true,
      hinweis:"Dazu brauchst du ein fertiges Heringspaternoster." }],
    ["wolfsbarsch", 0, "Spinnfischen an der Küste", { koeder:{ alle:[10,25] },
      schnur:{ geflecht:[6,14] }, laenge:[2.7,3.3], aktion:["schnell","mittel"], freilauf:"nein", kat:["raubfisch"], kueste:true }],
    ["flunder", 0, "Brandungsangeln", { koeder:{ alle:[100,200] },
      schnur:{ geflecht:[12,25], mono:[8,14] }, laenge:[3.9,4.5], laengeHart:true, rolleMin:5000, kat:["ansitz"], kueste:true }],
    ["meerforelle", 0, "Küstenspinnen", { koeder:{ alle:[12,28] },
      schnur:{ geflecht:[6,12] }, laenge:[2.9,3.4], aktion:["mittel","schnell"], freilauf:"nein", kat:["raubfisch"], kueste:true, schnurWichtig:true,
      hinweis:"An der Küste zählt Wurfweite – ideal sind 3,00–3,30 m. Die Meerforelle steigt oft beim Einholen kurz vor dem Ufer ein." }],
    ["hornhecht", 0, "Küstenspinnen – kleiner Blinker", { koeder:{ alle:[10,22] },
      schnur:{ geflecht:[5,12] }, laenge:[2.9,3.4], aktion:["mittel","schnell"], freilauf:"nein", kat:["raubfisch"], kueste:true,
      hinweis:"Hornhechte haben ein hartes Maul – der Wollfaden hinter dem Blinker verfängt sich in den Zähnen." }]
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

  /* ---------- Balance Rute + Rolle ----------
     Gleiche Faustregeln wie die Werkstatt: Rollengröße folgt dem Wurfgewicht,
     lange Ruten brauchen Gegengewicht, kurze eine leichte Rolle.
     Bewusst gewählte Kombos (KOMBO_BEWUSST in data.js) gelten als passend. */
  function wgZuGroesse(wgMax){
    if(wgMax <= 6)  return [1000, 2500];
    if(wgMax <= 12) return [1000, 3000];
    if(wgMax <= 25) return [2000, 3500];
    if(wgMax <= 50) return [2500, 4000];
    if(wgMax <= 80) return [3000, 5000];
    return [3500, 6000];
  }
  function balance(rute, rolle){
    if(!rute || !rolle || !rute.wg || !rolle.groesse) return null;
    const bewusst = (typeof KOMBO_BEWUSST !== "undefined" ? KOMBO_BEWUSST : []).some(k => k.ruten.includes(rute.id) && k.rollen.includes(rolle.id));
    if(bewusst) return { stufe: 0, text: "" };
    let [min, max] = wgZuGroesse(rute.wg[1]);
    if(rute.laenge >= 3.6){ min += 500; max += 500; }
    else if(rute.laenge <= 2.0){ min = Math.max(500, min - 500); max -= 500; }
    const gr = rolle.groesse;
    if(gr < min) return { stufe: min - gr > 1000 ? 2 : 1, text: `Rolle ${gr} ${min - gr > 1000 ? "deutlich " : ""}zu klein für diese Rute (passend ${min}–${max}) – kopflastig, wenig Schnureinzug` };
    if(gr > max) return { stufe: gr - max > 1000 ? 2 : 1, text: `Rolle ${gr} ${gr - max > 1000 ? "deutlich " : ""}zu groß für diese Rute (passend ${min}–${max}) – schwer und unausgewogen` };
    return { stufe: 0, text: "" };
  }

  /* ---------- Zustand der Schnur ----------
     Datum hängt an der Rolle (Etappe 2), die alte App trägt es am Setup ein –
     es gilt das jüngere. */
  function schnurAlterTage(set, rolle){
    let alt = null;
    try { alt = (JSON.parse(localStorage.getItem("schnur_v1")) || {})[set.key] || null; } catch(e){}
    const neu = rolle && rolle.schnurInfo && rolle.schnurInfo.seit;
    const d = alt && neu ? (alt > neu ? alt : neu) : (alt || neu);
    if(!d) return null;
    const t = new Date(d + "T00:00:00").getTime();
    return isNaN(t) ? null : Math.floor((Date.now() - t) / 86400000);
  }

  /* ---------- Ein Setup gegen einen Ansatz prüfen ---------- */
  function pruefe(set, anf, gw){
    const gruende = [], plus = [], hinweise = [];
    let stufe = 0, score = 100;
    const gelb = (t, abzug) => { gruende.push(t); stufe = Math.max(stufe, 1); score -= abzug || 15; };
    const rot = t => { gruende.push(t); stufe = 2; score -= 100; };
    const rute = RUTEN.find(r => r.id === set.ruteId);
    const rolle = set.rolleId ? ROLLEN.find(r => r.id === set.rolleId) : null;
    const istStippe = set.kategorie === "stippe";

    if(/verkauf/i.test(set.name || "")) rot("wird verkauft");

    if(anf.stippe){
      if(!istStippe){ rot("keine Stipprute"); return { stufe, gruende, plus, hinweise, score }; }
      const L = rute && rute.laenge;
      if(L && anf.laenge){
        if(L < anf.laenge[0]) gelb(`mit ${komma(L)} m eher kurz (ideal ab ${komma(anf.laenge[0])} m)`);
        else plus.push(`${komma(L)} m Stippe`);
      }
      if(L) score += Math.min(10, L);   // längere Stippe = mehr Reichweite
      return { stufe, gruende, plus, hinweise, score };
    }
    if(istStippe){ rot("Stipprute ohne Rolle"); return { stufe, gruende, plus, hinweise, score }; }
    if(!rolle){ rot("keine Rolle montiert"); return { stufe, gruende, plus, hinweise, score }; }

    /* Wurfgewicht gegen Gesamtgewicht */
    const k = koederFuer(anf, gw);
    if(k && rute && rute.wg){
      const [w1, w2] = rute.wg, [a, b] = k;
      if(a > w2 * 1.1 || b > w2 * 1.5) rot(`Köder ${komma(a)}–${g(b)} zu schwer für WG ${komma(w1)}–${komma(w2)} g`);
      else if(b > w2 * 1.1) gelb(`obere Gewichte (bis ${g(b)}) über dem WG von ${komma(w2)} g`, 12);
      else if(b < w1 * 0.5) rot(`Köder ${komma(a)}–${g(b)} viel zu leicht für WG ${komma(w1)}–${komma(w2)} g`);
      else if(b < w1) gelb(`Köder (${komma(a)}–${g(b)}) leichter als das WG ab ${komma(w1)} g – die Rute lädt kaum`, 12);
      else if(!anf.passiv && b < w1 * 1.3 && a < w1 * 0.6) gelb(`Rute für diese leichten Köder (${komma(a)}–${g(b)}) zu kräftig – WG ${komma(w1)}–${komma(w2)} g, du spürst wenig`, 10);
      else plus.push(`Köder ${komma(a)}–${g(b)} im WG ${komma(w1)}–${komma(w2)} g`);
      /* Nähe zur Mitte des Wurfgewichts: lieber passend als gerade noch */
      const mk = (log(a) + log(b)) / 2, mw = (log(w1) + log(w2)) / 2, span = Math.max(0.3, log(w2) - log(w1));
      score -= Math.min(12, Math.abs(mk - mw) / span * 12);
    } else if(k && rute && !rute.wg){
      gelb("kein Wurfgewicht hinterlegt", 8);
    }

    /* Schnur: Art und Tragkraft */
    if(anf.schnur){
      const sc = schnurVon(rolle);
      const tk = AUSR.tragkraft(rolle);
      const gesch = tk && tk.quelle === "geschätzt" ? " (geschätzt)" : "";
      if(!sc || !sc.art) gelb("Schnurart unbekannt", 8);
      else if(!anf.schnur[sc.art]){
        const erlaubt = Object.keys(anf.schnur).map(x => ART[x]).join(" oder ");
        gelb(`${ART[sc.art]} drauf, hier besser ${erlaubt}`);
      } else if(tk){
        const [k1, k2] = anf.schnur[sc.art];
        const kg = komma(tk.kg);
        if(tk.kg < k1 * 0.85) gelb(`${ART[sc.art]} mit ca. ${kg} kg${gesch} zu schwach (ab ${komma(k1)} kg)`, 18);
        else if(tk.kg < k1){ hinweise.push(`${ART[sc.art]} mit ca. ${kg} kg${gesch} etwas knapp (ab ${komma(k1)} kg) – Bremse weich einstellen`); score -= 4; }
        else if(tk.kg > k2 * 1.3) gelb(`${ART[sc.art]} mit ca. ${kg} kg${gesch} eher zu kräftig – feinere Schnur bringt mehr Bisse und Wurfweite`, 10);
        else plus.push(`${ART[sc.art]} ${sc.dm ? komma(sc.dm) + " mm, " : ""}ca. ${kg} kg${gesch}`);
        if(tk.quelle === "geschätzt") score -= 1;
      }
      /* Bremse: Richtwert gut ein Drittel der Tragkraft */
      if(tk && anf.schnurWichtig) hinweise.push(`Bremse auf etwa ${komma(Math.round(tk.kg / 3 * 10) / 10)} kg einstellen (ein Drittel der Tragkraft)`);
    }

    /* Länge */
    if(anf.laenge && rute && rute.laenge){
      const L = rute.laenge, [l1, l2] = anf.laenge;
      const raus = L < l1 - 0.05 ? `mit ${komma(L)} m kürzer als ideal (${komma(l1)}–${komma(l2)} m)` :
                   L > l2 + 0.05 ? `mit ${komma(L)} m länger als ideal (${komma(l1)}–${komma(l2)} m)` : "";
      if(raus){ if(anf.laengeHart) rot(raus); else gelb(raus, 10); }
    }

    /* Rutenaktion */
    if(anf.aktion && rute){
      const AKT = { schnell: "schnelle Spitzenaktion", mittel: "mittlere Aktion", parabolisch: "parabolische Aktion" };
      const gesch = rute.aktionQuelle === "geschätzt" ? " (geschätzt)" : "";
      if(!rute.aktion) hinweise.push("Rutenaktion nicht eingetragen – bei „Rute bearbeiten“ nachtragen");
      else if(!anf.aktion.includes(rute.aktion)) gelb(`${AKT[rute.aktion]}${gesch}, hier besser ${anf.aktion.map(a => AKT[a]).join(" oder ")}`, 10);
      else plus.push(`${AKT[rute.aktion]}${gesch}`);
    }

    /* Bibberspitze */
    if(anf.spitze === "feeder"){
      if(rute && rute.feederspitze) plus.push("Bibberspitze");
      else gelb("keine Bibberspitze – feine Bisse beim Feedern schwer zu sehen", 15);
    }

    /* Salzwasser */
    if(anf.kueste){
      if(rolle.salzwasser === true) plus.push("Rolle salzwasserfest");
      else hinweise.push("Nach dem Angeln Rolle und Rute gründlich mit Süßwasser abspülen – Salz greift Lager und Bügel an");
    }

    /* Freilauf */
    if(anf.freilauf === "pflicht" && !rolle.freilauf) gelb("ohne Freilauf – Bügel offen lassen oder Schnurclip", 18);
    else if(anf.freilauf === "gut" && rolle.freilauf){ plus.push("Freilauf"); score += 8; }
    else if(anf.freilauf === "nein" && rolle.freilauf) gelb("Freilaufrolle bringt beim aktiven Führen nichts", 8);

    /* Rollengröße */
    if(anf.rolleMin && rolle.groesse && rolle.groesse < anf.rolleMin) rot(`Rolle ${rolle.groesse} zu klein (ab ${anf.rolleMin})`);

    /* Balance Rute + Rolle: macht das Angeln mühsamer, aber nicht unmöglich */
    const bal = balance(rute, rolle);
    if(bal && bal.stufe === 1) gelb(bal.text, 10);
    else if(bal && bal.stufe === 2) gelb(bal.text, 22);

    /* Schnur alt: kein Ausschluss, aber vor dem Angeln wechseln */
    const alter = schnurAlterTage(set, rolle);
    const sc2 = schnurVon(rolle);
    const grenze = sc2 && sc2.art === "geflecht" ? 365 : 180;   // Geflecht altert langsamer als Mono/FC
    if(alter !== null && alter > grenze){
      hinweise.push(`Schnur ist ${Math.round(alter / 30)} Monate alt – vor dem Angeln prüfen, besser wechseln`);
      score -= anf.schnurWichtig ? 10 : 4;
    } else if(alter === null && anf.schnurWichtig){
      hinweise.push("Kein Aufspul-Datum eingetragen – Schnur vorher auf Scheuerstellen prüfen");
    }

    /* Vorlieben */
    if(anf.kat && anf.kat.includes(set.kategorie)) score += 6;
    if(set.kategorie === "backup") score -= 10;
    if(anf.spezial && rute && anf.spezial.test(rute.name)){ score += 6; plus.push("genau dafür gebaut"); }

    return { stufe, gruende, plus, hinweise, score };
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
        hinweise: bester ? bester.hinweise : [],
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
        hinweise: jeGw.find(x => x.stufe === besteStufe).hinweise,
        platz, besser, hinweis: anf.hinweis || "",
        maxStatus: anf.maxStatus || null
      });
    }));
    return out.sort((x, y) => x.stufe - y.stufe || x.platz - y.platz);
  }

  /* Startzustand: über alle Gewässer gerechnet; nach jeder Ausrüstungsänderung neu */
  wendeAn(null);
  if(typeof AUSR !== "undefined") AUSR.beiAenderung(() => wendeAn(null));

  return { anforderung: a => ANF.get(a) || null, balance, bewerte, pruefe: (set, a, gw) => ANF.get(a) ? pruefe(set, ANF.get(a), gw) : null, rangliste, wendeAn, fuerSetup, montageFuer,
    hatRegel: a => ANF.has(a), koederFuer: (a, gw) => ANF.get(a) ? koederFuer(ANF.get(a), gw) : null };
})();
