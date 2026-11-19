/* ============================================================
   Ausrüstung aus der App (gemeinsam für alte und neue Oberfläche)

   Bis zur ersten Änderung in der App gilt der Stand aus data.js
   (RUTEN, ROLLEN, AKTUELL). Sobald du in der App etwas umbaust,
   anlegst, änderst oder verkaufst, wird der komplette Stand unter
   "ausruestung_v1" gespeichert (und per Login synchronisiert) – ab
   dann ist DAS die Wahrheit, data.js nur noch die Ausgangsbasis.

   Beim Laden werden RUTEN, ROLLEN und AKTUELL an Ort und Stelle
   mit dem gespeicherten Stand neu gefüllt. Der übrige Code beider
   Apps arbeitet unverändert mit diesen drei Globals.
   Verkaufte Ruten/Rollen stehen im Archiv, nicht in den Globals.

   Muss nach data.js und vor app.js / neu/js geladen werden.
   ============================================================ */
const AUSR = (function(){
  const KEY = "ausruestung_v1";
  const kopie = o => JSON.parse(JSON.stringify(o));

  /* Abgeleitete Textfelder, die verknuepfe() in data.js an die Setups hängt */
  const ABGELEITET = ["rute", "rolle", "schnur"];

  function setupRoh(s){
    const o = kopie(s);
    ABGELEITET.forEach(k => delete o[k]);
    return o;
  }

  /* Stand aus data.js einfrieren, bevor irgendetwas überschrieben wird */
  const CODE = {
    version: 1,
    geaendert: null,
    ruten: RUTEN.map(r => ({ ...kopie(r), status: "aktiv" })),
    rollen: ROLLEN.map(r => ({ ...kopie(r), status: "aktiv", schnurInfo: parseSchnur(r.schnur), schnurVerlauf: [] })),
    setups: Object.fromEntries(Object.values(AKTUELL).map(s => [s.key, setupRoh(s)]))
  };

  /* ---------- Schnur ---------- */
  function schnurArt(t){
    t = String(t || "").toLowerCase();
    if(/vorbespult/.test(t)) return "";
    if(/fluoro|\bfc\b/.test(t) && !/geflocht|braid/.test(t)) return "fc";
    if(/geflocht|braid|x8/.test(t)) return "geflecht";
    if(/mono|gtm/.test(t)) return "mono";
    return "";
  }
  function parseSchnur(text){
    const t = String(text || "");
    const dm = (t.match(/0,\d{2,3}/) || [""])[0];
    const lm = t.match(/(\d{2,4})\s*m(?!m)\b/);
    let bez = dm ? t.split(dm)[0] : t.split(/ [–·(]/)[0];
    bez = bez.replace(/\s+$/, "").replace(/[–·,]$/, "").trim();
    return { bezeichnung: bez, art: schnurArt(t), dm, laenge: lm ? +lm[1] : null, seit: null };
  }
  const ART_TEXT = { geflecht: "geflochten", mono: "monofil", fc: "Fluorocarbon" };
  function schnurText(i){
    if(!i) return "";
    const bez = (i.bezeichnung || "").trim();
    const artSchon = /geflocht|braid|mono|fluoro|\bfc\b/i.test(bez);
    let t = bez;
    if(i.dm) t += (t ? " " : "") + i.dm + " mm";
    if(i.art && !artSchon) t += ` (${ART_TEXT[i.art] || i.art})`;
    if(i.laenge) t += ` · ${i.laenge} m`;
    return t.trim();
  }

  /* ---------- Laden / Speichern ---------- */
  function lies(){
    try { const s = JSON.parse(localStorage.getItem(KEY)); return (s && s.version === 1 && Array.isArray(s.ruten)) ? s : null; }
    catch(e){ return null; }
  }
  let gespeichert = lies();

  /* Aktueller Gesamtstand (gespeichert oder aus dem Code), immer als Kopie */
  function stand(){ return kopie(gespeichert || CODE); }

  /* Globals RUTEN / ROLLEN / AKTUELL mit einem Stand füllen (nur aktive Teile) */
  function wendeAn(s){
    const ruten  = s.ruten.filter(r => r.status !== "verkauft");
    const rollen = s.rollen.filter(r => r.status !== "verkauft");
    const rById  = Object.fromEntries(ruten.map(r => [r.id, r]));
    const roById = Object.fromEntries(rollen.map(r => [r.id, r]));

    RUTEN.length = 0;  ruten.forEach(r => RUTEN.push(kopie(r)));
    ROLLEN.length = 0; rollen.forEach(r => { const o = kopie(r); delete o.schnurVerlauf; ROLLEN.push(o); });
    Object.keys(AKTUELL).forEach(k => delete AKTUELL[k]);

    Object.values(s.setups).forEach(roh => {
      const rute = rById[roh.ruteId];
      if(!rute) return;                         // Rute verkauft -> Setup im Archiv
      const o = kopie(roh);
      const rolle = o.rolleId ? roById[o.rolleId] : null;
      if(o.rolleId && !rolle) o.rolleId = null; // Rolle verkauft
      if(!o.rolleId && o.kategorie !== "stippe" && !o.rolleText){
        o.rolleText = "⚠️ noch keine Rolle montiert";
        o.schnurText = "⚠️ noch nicht bespult";
        o.unvollstaendig = true;
      }
      if(o.rolleId){ delete o.rolleText; delete o.schnurText; o.unvollstaendig = false; }
      o.rute   = rute.text;
      o.rolle  = rolle ? rolle.text : (o.rolleText || "");
      o.schnur = rolle ? rolle.schnur : (o.schnurText || "");
      AKTUELL[o.key] = o;
    });
  }

  const hoerer = new Set();
  function melde(quelle){ hoerer.forEach(fn => { try { fn(quelle); } catch(e){ console.error(e); } }); }

  /* Neuen Stand übernehmen: speichern, Globals neu füllen, Bescheid sagen */
  function speichere(s, quelle){
    s.version = 1;
    s.geaendert = new Date().toISOString();
    gespeichert = kopie(s);
    try { localStorage.setItem(KEY, JSON.stringify(gespeichert)); } catch(e){}
    wendeAn(gespeichert);
    melde(quelle || "lokal");
  }

  /* Stand von einem anderen Gerät: nur übernehmen, wenn er neuer ist.
     Gibt "neu" (übernommen), "aelter" (lokal ist neuer -> pushen) oder "gleich" zurück. */
  function vonRemote(r){
    if(!r || r.version !== 1 || !Array.isArray(r.ruten)) return "gleich";
    const lokal = gespeichert ? gespeichert.geaendert || "" : "";
    const fern = r.geaendert || "";
    if(fern === lokal) return "gleich";
    if(lokal && fern < lokal) return "aelter";
    gespeichert = kopie(r);
    try { localStorage.setItem(KEY, JSON.stringify(gespeichert)); } catch(e){}
    wendeAn(gespeichert);
    melde("remote");
    return "neu";
  }

  /* Andere Tabs derselben Domain */
  window.addEventListener("storage", e => {
    if(e.key !== KEY) return;
    gespeichert = lies();
    wendeAn(gespeichert || CODE);
    melde("tab");
  });

  /* Wartungs-/Schnurdaten hängen in schnur_v1 am Setup – beim ersten Speichern
     das Datum an die Rolle übernehmen, damit es beim Umbauen mitwandert. */
  function ersteSchnurDaten(s){
    let sc = {};
    try { sc = JSON.parse(localStorage.getItem("schnur_v1")) || {}; } catch(e){}
    Object.values(s.setups).forEach(set => {
      const r = s.rollen.find(x => x.id === set.rolleId);
      if(r && r.schnurInfo && !r.schnurInfo.seit && sc[set.key]) r.schnurInfo.seit = sc[set.key];
    });
  }

  function id(prefix){ return prefix + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }
  const meterText = v => String(Number(v).toFixed(2)).replace(".", ",") + " m";
  const komma = v => String(v).replace(".", ",");

  function ruteText(r){
    const teile = [r.name];
    if(r.laenge) teile.push(meterText(r.laenge));
    if(r.wg) teile.push(`WG ${komma(r.wg[0])}–${komma(r.wg[1])} g`);
    if(r.details) teile.push(r.details);
    return teile.join(" · ");
  }
  function setupName(rute, zusatz){
    return `${rute.name}${rute.laenge ? " · " + meterText(rute.laenge) : ""}${zusatz ? ` (${zusatz})` : ""}`;
  }

  /* ---------- Änderungen ----------
     Jede Funktion arbeitet auf einem frischen Stand und speichert ihn. */
  function aendere(fn){
    const s = stand();
    if(!gespeichert) ersteSchnurDaten(s);
    const ergebnis = fn(s);
    speichere(s);
    return ergebnis;
  }

  const api = {
    KEY, CODE,
    stand, wendeAn, speichere, vonRemote,
    gespeichert: () => gespeichert ? kopie(gespeichert) : null,
    beiAenderung: fn => hoerer.add(fn),
    parseSchnur, schnurText, schnurArt, ruteText, setupName,

    /* Rolle auf ein Setup setzen (null = abnehmen). Sitzt sie woanders, wird sie dort abgenommen.
       Rückgabe: Schlüssel des Setups, von dem sie kam (oder null). */
    montiere(setupKey, rolleId){
      return aendere(s => {
        let vorher = null;
        if(rolleId) Object.values(s.setups).forEach(x => { if(x.rolleId === rolleId && x.key !== setupKey){ x.rolleId = null; delete x.unvollstaendig; vorher = x.key; } });
        const ziel = s.setups[setupKey];
        if(!ziel) return vorher;
        ziel.rolleId = rolleId || null;
        if(rolleId){ delete ziel.rolleText; delete ziel.schnurText; ziel.unvollstaendig = false; }
        else { delete ziel.rolleText; delete ziel.schnurText; }
        return vorher;
      });
    },

    /* Mehrere Umbauten auf einmal (Werkstatt der alten App): { ruteId: rolleId|null } */
    montiereNachRute(plan){
      return aendere(s => {
        const setupVonRute = Object.fromEntries(Object.values(s.setups).map(x => [x.ruteId, x]));
        Object.entries(plan).forEach(([ruteId, rolleId]) => {
          const x = setupVonRute[ruteId];
          if(!x || (x.rolleId || null) === (rolleId || null)) return;
          x.rolleId = rolleId || null;
          delete x.rolleText; delete x.schnurText; x.unvollstaendig = !rolleId;
        });
      });
    },

    neueRute(d){
      return aendere(s => {
        const r = { id: id("r_"), name: d.name, kategorie: d.kategorie, laenge: d.laenge || null, status: "aktiv" };
        if(d.wg) r.wg = d.wg;
        r.details = d.details || "";
        r.text = ruteText(r);
        s.ruten.push(r);
        const key = id("setup_");
        s.setups[key] = { key, kategorie: d.kategorie, name: setupName(r, d.zusatz), ruteId: r.id, rolleId: null,
          vorfach: "", extra: "", einsatz: d.einsatz || "" };
        if(d.kategorie === "stippe"){ s.setups[key].rolleText = "keine Rolle nötig – Schnur fest an der Rutenspitze"; s.setups[key].schnurText = ""; }
        return key;
      });
    },

    neueRolle(d){
      return aendere(s => {
        const info = { bezeichnung: d.schnur?.bezeichnung || "", art: d.schnur?.art || "", dm: d.schnur?.dm || "", laenge: d.schnur?.laenge || null, seit: d.schnur?.seit || null };
        const r = { id: id("ro_"), name: d.name, groesse: d.groesse, freilauf: !!d.freilauf, status: "aktiv",
          text: [d.name, d.details].filter(Boolean).join(" · "), details: d.details || "",
          schnurInfo: info, schnur: schnurText(info), schnurVerlauf: [] };
        s.rollen.push(r);
        return r.id;
      });
    },

    aendereRute(ruteId, d){
      aendere(s => {
        const r = s.ruten.find(x => x.id === ruteId); if(!r) return;
        const set = Object.values(s.setups).find(x => x.ruteId === ruteId);
        Object.assign(r, { name: d.name, laenge: d.laenge || null });
        if(d.wg) r.wg = d.wg; else delete r.wg;
        if(d.details !== undefined) r.details = d.details;
        r.text = d.textBehalten ? r.text : ruteText(r);
        if(set){
          set.kategorie = d.kategorie; r.kategorie = d.kategorie;
          set.name = setupName(r, d.zusatz);
          ["vorfach", "extra", "einsatz", "tippKompakt", "bewusst"].forEach(k => { if(d[k] !== undefined){ if(d[k]) set[k] = d[k]; else delete set[k]; } });
        }
      });
    },

    aendereRolle(rolleId, d){
      aendere(s => {
        const r = s.rollen.find(x => x.id === rolleId); if(!r) return;
        r.name = d.name; r.groesse = d.groesse; r.freilauf = !!d.freilauf;
        if(d.details !== undefined) r.details = d.details;
        r.text = d.textBehalten ? r.text : [r.name, r.details].filter(Boolean).join(" · ");
      });
    },

    /* Neue Schnur aufspulen: alte wandert in den Verlauf */
    wechsleSchnur(rolleId, info){
      aendere(s => {
        const r = s.rollen.find(x => x.id === rolleId); if(!r) return;
        r.schnurVerlauf = r.schnurVerlauf || [];
        const alt = r.schnurInfo || parseSchnur(r.schnur);
        if(alt && (alt.bezeichnung || alt.dm)) r.schnurVerlauf.unshift({ ...alt, text: r.schnur, bis: info.seit || null });
        r.schnurInfo = { bezeichnung: info.bezeichnung || "", art: info.art || "", dm: info.dm || "", laenge: info.laenge || null, seit: info.seit || null };
        r.schnur = schnurText(r.schnurInfo);
      });
    },

    /* Nur das Datum eintragen (gleiche Schnur neu aufgespult / Datum korrigiert) */
    setzeSchnurDatum(rolleId, datum){
      aendere(s => {
        const r = s.rollen.find(x => x.id === rolleId); if(!r) return;
        r.schnurInfo = r.schnurInfo || parseSchnur(r.schnur);
        r.schnurInfo.seit = datum || null;
      });
    },

    verkaufe(art, teilId, datum){
      return aendere(s => {
        const liste = art === "rute" ? s.ruten : s.rollen;
        const t = liste.find(x => x.id === teilId); if(!t) return;
        t.status = "verkauft"; t.verkauftAm = datum || new Date().toISOString().slice(0, 10);
        if(art === "rolle") Object.values(s.setups).forEach(x => { if(x.rolleId === teilId) x.rolleId = null; });
        if(art === "rute"){
          /* Die Rolle der verkauften Rute wird frei – sie bleibt bei dir */
          const set = Object.values(s.setups).find(x => x.ruteId === teilId);
          if(set && set.rolleId){ t.letzteRolle = set.rolleId; set.rolleId = null; }
        }
      });
    },

    zurueckholen(art, teilId){
      aendere(s => {
        const liste = art === "rute" ? s.ruten : s.rollen;
        const t = liste.find(x => x.id === teilId); if(!t) return;
        t.status = "aktiv"; delete t.verkauftAm; delete t.letzteRolle;
      });
    },

    /* Archiv für die Anzeige */
    archiv(){
      const s = stand();
      return { ruten: s.ruten.filter(r => r.status === "verkauft"), rollen: s.rollen.filter(r => r.status === "verkauft"), setups: s.setups };
    },
    rolleVoll(rolleId){ return stand().rollen.find(r => r.id === rolleId) || null; }
  };

  if(gespeichert) wendeAn(gespeichert);
  return api;
})();
