@echo off
REM Startet den Angel-Setup-Berater ueber einen lokalen Webserver statt per
REM Doppelklick auf index.html. Das ist notwendig, weil moderne Browser
REM (v.a. Firefox mit OpaqueResponseBlocking) Netzwerk-Anfragen von file://-
REM Seiten aus blockieren - dadurch wuerden Kartenkacheln und OSM-Angelspots
REM nicht laden. Ueber http://localhost funktioniert alles normal.

cd /d "%~dp0"

echo Starte lokalen Server ...
start /min "AngelSetupBeraterServer" cmd /c "python -m http.server 8000"

timeout /t 2 /nobreak >nul

echo Oeffne die App im Browser ...
start "" http://localhost:8000/index.html

echo.
echo Die App laeuft jetzt unter http://localhost:8000
echo Dieses Fenster kann geschlossen werden, der Server laeuft im Hintergrund weiter.
echo Um den Server zu beenden: Taskmanager oeffnen und den Python-Prozess beenden,
echo oder das minimierte "AngelSetupBeraterServer"-Fenster in der Taskleiste schliessen.
pause
