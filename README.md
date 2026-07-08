# 🎣 Angel-Setup-Berater

Interaktive Web-App: Zielfisch + Gewässer wählen → passendes Setup, Methode(n) und
kompletter Montage-Aufbau (inkl. Gewichten) auf Basis **deiner eigenen Ausrüstung**.

## Öffnen
**Doppelklick auf `App-starten.bat`** (empfohlen). Startet einen kleinen lokalen Server und öffnet die App
automatisch im Browser unter `http://localhost:8000`.

⚠️ Direkt `index.html` per Doppelklick zu öffnen funktioniert für Berater, Knotenkunde, Zubehör-Check &
Saisonkalender, **aber nicht für die Karte im Tab „Fänge & Spots"**: Firefox blockiert bei `file://`-Seiten
per „Opaque Response Blocking" sowohl das Laden der Kartenkacheln als auch die OSM-Spot-Abfrage. Über
`App-starten.bat` (also `http://localhost`) tritt dieses Problem nicht auf.

Zum Beenden: das minimierte Server-Fenster „AngelSetupBeraterServer" in der Taskleiste schließen.

## So funktioniert's
1. **Zielfisch** wählen – die Gewässer-Liste passt sich automatisch an (nur Gewässer, in denen der Fisch vorkommt).
2. **Gewässer** wählen (z. B. Eider = deine „Ida", NOK, Elbe, See, Forellensee, Ostsee, Nordsee, Kutter).
3. Ergebnis pro Methode mit Ampel-Status:
   - ✅ **Machbar** mit einem deiner Setups → zeigt Rute/Rolle/Schnur + Montage-Kette + Gewichte
   - 🟡 **Bedingt machbar** → geht mit vorhandenem Gerät, ideal wäre ein Wunschlisten-Setup
   - ❌ **Nicht machbar** → zeigt genau, was du aus der Wunschliste brauchst (Rute/Rolle/Schnur + Preis)

## Tabs
- **Berater** – Zielfisch/Gewässer → Setup & Montage
- **Lohnt sich heute?** – Erfahrungswissen-Check (Luftdruck, Tageszeit, Saison …)
- **Knotenkunde** – 4 Knoten, die alle Setups abdecken
- **Zubehör-Check** – 39-Punkte-Checkliste, erkennt automatisch, was du schon hast
- **Saisonkalender** – Hauptsaison & Schonzeiten aller Fische auf einen Blick
- **Fänge & Spots** – Karte mit ~98 vorinstallierten SH/HH/NI/MV-Gewässern, eigene Spots (GPS),
  Fangbuch (verknüpfbar mit Spot und/oder Berater-Methode), Statistik, Backup-Export/Import
- **Mein Equipment** – alle Setups, Zubehör und Wunschliste

## Dateien
- `index.html` – Oberfläche
- `style.css` – Design
- `app.js` – Logik (Auswahl, Matching, Rendering, Karte)
- `data.js` – **hier pflegst du deine Daten**: Equipment (`AKTUELL`), Wunschliste (`WUNSCH`),
  Gewässer (`GEWAESSER`), Fische samt Montagen (`FISCHE`) und Spot-Startdaten (`SPOTS_SEED`).

## Erweitern
Neue Ausrüstung, neues Gewässer oder neuen Fisch? Einfach in `data.js` ergänzen –
Struktur ist auskommentiert. Kein Build nötig, Seite neu laden reicht.

> Alle Montagen & Gewichte sind Richtwerte. Schonzeiten, Mindestmaße und Gerätevorschriften
> immer vor Ort prüfen. Stand deiner Inventurliste: 04.07.2026.
