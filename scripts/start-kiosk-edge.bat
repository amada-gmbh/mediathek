@echo off
REM AMADA Broschüren-Mediathek – Edge im Vollbild-Kiosk
REM URL anpassen (IP/Port des Docker-Hosts)

set MEDIATHEK_URL=http://localhost:8091

set EDGE86=%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe
set EDGE64=%ProgramFiles%\Microsoft\Edge\Application\msedge.exe

if exist "%EDGE64%" (
  start "" "%EDGE64%" --kiosk "%MEDIATHEK_URL%" --edge-kiosk-type=fullscreen
) else if exist "%EDGE86%" (
  start "" "%EDGE86%" --kiosk "%MEDIATHEK_URL%" --edge-kiosk-type=fullscreen
) else (
  echo Microsoft Edge nicht gefunden.
  pause
  exit /b 1
)
