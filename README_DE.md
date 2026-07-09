# Broschüren-Mediathek

**Version 1.3.0** — Touch-Kiosk für Broschüren-PDFs in Showrooms und Büros. Läuft in Docker, synchronisiert PDFs von einer konfigurierbaren Website und funktioniert nach dem ersten Sync **offline**.

Generischer Open-Source-Stack: Crawl-Quelle, Logo und Firmenname werden per Umgebungsvariablen gesetzt. Im Repository liegt ein **AMADA-EU-Beispiel** in `.env.example`.

---

## Was macht die Anwendung?

1. **Crawlt** Broschüren-Seiten auf der konfigurierten Website (z. B. [amada.eu](https://www.amada.eu))
2. **Lädt** PDFs herunter und erzeugt Vorschaubilder
3. **Stellt** eine touch-optimierte Kiosk-Oberfläche bereit zum Blättern, Lesen, QR-Codes und Link-Kopieren

Keine Datenbank, kein Login — gedacht als schreibgeschützte Anzeige im lokalen Netzwerk.

---

## Funktionen

| Funktion | Beschreibung |
|----------|--------------|
| **9:16 Touch-UI** | Optimiert für Hochformat-Touchdisplays |
| **10 Sprachen** | DE, EN, NL, FR, IT, PL, HU, RO, SE, TR (je ein-/ausschaltbar) |
| **Kategoriefilter** | Faserlaser, Stanzen, Abkanten, Automation usw. |
| **PDF-Viewer** | Browser-Reader mit Scroll/Wischen |
| **QR-Codes** | Verlinken auf die **Original-Broschüre** der Quell-Website |
| **Link-Tabelle** | Offizielle PDF-URLs für Vertriebs-E-Mails kopieren |
| **Auto-Sync** | Beim Start und optional per Cron (Standard: alle 24 h) |
| **Offline-Betrieb** | PDFs werden lokal gespeichert |

---

## Voraussetzungen

- **Docker** und **Docker Compose** (oder Portainer mit Stack-Deploy)
- Netzwerkzugang zur **Quell-Website** während des Syncs (danach nicht nötig)
- Bildschirm oder Touchscreen mit modernem Browser (Chrome, Edge, Firefox)

Für Windows-Kioskmodus: Microsoft Edge (siehe [Kioskmodus](#kioskmodus-windows--edge) unten).

---

## Schnellstart (5 Minuten)

### 1. Projekt holen

```bash
git clone https://github.com/bucto/amada-mediathek.git
cd amada-mediathek
```

### 2. (Optional) Konfiguration anlegen

```bash
cp .env.example .env
```

Das Repository enthält bereits feste Standardwerte für:

- `SOURCE_BASE_URL=https://www.amada.eu`
- `INDEX_DE ... INDEX_TR` (alle AMADA-EU-Broschürenpfade)
- Sync-/Runtime-Defaults (`SYNC_*`, `PDF_PAGE_MODE`, Screensaver aus)
- Branding-Defaults (`COMPANY_NAME=AMADA GmbH`, `COMPANY_LOGO_URL=/assets/AMADA_80th_logo_White.svg`)

Damit kann der Stack auch **ohne** `.env` direkt gestartet werden.  
`.env` wird nur benötigt, wenn Sie Defaults überschreiben möchten.

### 3. Bauen und starten

```bash
docker compose up --build -d
```

Im Browser öffnen:

- **http://localhost:8080** (oder der in `MEDIATHEK_PORT` gesetzte Port)

### 4. Ersten Sync beobachten

Der erste Sync lädt PDFs herunter und erzeugt Vorschaubilder. Das kann je nach Sprachen und Netz **10–30 Minuten** dauern.

```bash
docker logs -f amada-mediathek
```

Warten, bis `Synchronisation abgeschlossen` oder `Fertig:` in den Logs erscheint.

### 5. Ohne Download testen (Demo-Modus)

Nur für UI-Tests, ohne die Quell-Website zu crawlen:

```env
SYNC_ENABLED=false
```

Dann neu bauen und starten — zeigt **2 Demo-Broschüren** mit lokalem PDF.

---

## Konfiguration

Alle Einstellungen können über `.env` überschrieben werden (niemals committen — steht in `.gitignore`).

### Wichtige Variablen

| Variable | Beschreibung | Beispiel |
|----------|--------------|----------|
| `MEDIATHEK_PORT` | Port auf dem Host-PC/Server | `8080` |
| `COMPANY_NAME` | Fußzeile und Browser-Titel | `AMADA GmbH` |
| `COMPANY_LOGO_URL` | Logo-Pfad im Container | `/assets/AMADA_80th_logo_White.svg` |
| `SOURCE_BASE_URL` | Basis-URL der Quell-Website | `https://www.amada.eu` |
| `INDEX_DE` … `INDEX_TR` | Relativer Pfad zur Broschüren-Mediathek je Sprache | siehe `.env.example` |
| `SYNC_ENABLED` | `true` = PDFs laden; `false` = Demo | `true` |

### Sprachen steuern

Jede Sprache über `INDEX_<LANG>`:

- Nicht gesetzt → eingebauter AMADA-EU-Standardpfad wird verwendet
- Pfad setzen → überschreibt den Standardpfad
- **Leer** setzen (`INDEX_FR=`) → Sprache **aus** (kein Crawl, kein Button)

**Wichtig:** Zum Deaktivieren explizit leer setzen — Zeile nicht entfernen.

UI-Standard beim ersten Start:

- In der Sprachwahl sind initial **DE, EN, NL aktiv**.
- Weitere Sprachen können in der Weboberfläche über **Sprachen** aktiviert werden.
- DE/EN/NL können anschließend bei Bedarf wieder deaktiviert werden.

Beispiel — nur Englisch und Italienisch (schnellerer Erst-Sync):

```env
INDEX_DE=
INDEX_EN=de-en/products/amada-brochures-library/
INDEX_NL=
INDEX_FR=
INDEX_IT=it-it/prodotti/archivio-brochure/
INDEX_PL=
INDEX_HU=
INDEX_RO=
INDEX_SE=
INDEX_TR=
```

### Sync-Optionen

| Variable | Standard | Beschreibung |
|----------|----------|--------------|
| `SYNC_ON_START` | `true` | Sync beim Start, wenn noch kein vollständiges Manifest |
| `SYNC_INTERVAL_HOURS` | `24` | Cron-Intervall; `0` = kein geplanter Sync |
| `SYNC_TIMEOUT_SECONDS` | `3600` | Max. Crawl-Dauer pro Lauf |
| `SYNC_FORCE` | `false` | Quellen neu crawlen, Manifest/Thumbnails aktualisieren |
| `SYNC_FORCE_DOWNLOAD` | `false` | Alle PDFs neu laden (einmalig, danach wieder `false`) |

### Datenfluss (EU-Quelle, Standard alle 24h)

```text
┌───────────────────────────────────┐     ┌──────────────────────────────┐     ┌───────────────────────────┐
│  AMADA EU Quell-Website           │────▶│  Sync-Worker                 │────▶│  Lokaler Datenspeicher    │
│  SOURCE_BASE_URL + INDEX_*-Pfade  │     │  sync/sync_pdfs.py           │     │  /app/data + /app/pdfs    │
│  Kategorie-Seiten + PDF-Links     │     │  Crawl + Download + Thumbs   │     │  manifest.json + PDFs     │
└───────────────────────────────────┘     └──────────────────────────────┘     └───────────────────────────┘
                                                                                              │
                                                                                              ▼
                                                                                ┌───────────────────────────┐
                                                                                │  Kiosk-Weboberfläche      │
                                                                                │  nginx + frontend         │
                                                                                │  liest Manifest + PDFs    │
                                                                                └───────────────────────────┘
```

**Broschüren neu einlesen** nach Website-Updates:

```bash
docker exec -e SYNC_FORCE=true amada-mediathek python /app/sync/sync_pdfs.py
```

Oder `SYNC_FORCE=true` in `.env`, Container neu starten, danach wieder `false`.

### Anzeige-Optionen

| Variable | Beschreibung |
|----------|--------------|
| `PDF_PAGE_MODE` | `single` (eine Seite) oder `double` (Doppelseite) |
| `KIOSK_TOUCH_LAYOUT` | `true` = kompaktes Hochformat-UI auch bei Querformat-Windows |
| `SCREENSAVER_ENABLED` | `true` + `SCREENSAVER_VIDEO_URL` für Bildschirmschoner-Video |
| `SCREENSAVER_TIMEOUT_MINUTES` | Minuten Inaktivität vor Screensaver (Standard: `5`) |

### Sicherheitsrelevante Variablen

| Variable | Standard | Beschreibung |
|----------|----------|--------------|
| `SYNC_ALLOW_PRIVATE_HOSTS` | `false` | Interne/private IPs crawlen (nur für vertrauenswürdige LAN-Quellen) |
| `SYNC_MAX_PDF_BYTES` | `104857600` (100 MB) | Maximale Größe pro heruntergeladenem PDF |

---

## Branding (Logo & Firmenname)

1. Logo nach `frontend/assets/` legen (z. B. `firmenlogo.png`)
2. In `.env` setzen:
   ```env
   COMPANY_NAME=Ihr Unternehmen GmbH
   COMPANY_LOGO_URL=/assets/firmenlogo.png
   ```
3. Image neu bauen:
   ```bash
   docker compose build --no-cache && docker compose up -d
   ```

Logos müssen lokale Pfade (`/assets/...`) oder `https://`-URLs sein. Pfad-Traversal (`..`) wird blockiert.

---

## Bedienung des Kiosks

### Sprache wechseln

- Sprachbuttons **oben rechts** (DE, EN, IT, …)
- Oder direkt per URL: `http://localhost:8080/?lang=de`

| Sprache | URL-Parameter |
|---------|---------------|
| Deutsch | `?lang=de` |
| Englisch | `?lang=en` |
| Italienisch | `?lang=it` |

### QR-Codes

1. Broschüren-Kachel antippen
2. Tab **QR** öffnen
3. Besucher scannen den Code — öffnet die **offizielle Broschüren-Seite** der Quell-Website (nicht den lokalen Server)

### Link-Tabelle (für Vertrieb)

Von **Kacheln** auf **Link-Tabelle** umschalten (über der Suche). Offizielle PDF-URLs (Spalten DE / EN / NL) für E-Mails kopieren — Kunden erhalten immer die aktuelle Version von der Anbieter-Website.

---

## Kioskmodus (Windows / Edge)

Für einen dedizierten Touchscreen-PC das mitgelieferte Skript nutzen:

1. `scripts/start-kiosk-edge.bat` bearbeiten — `MEDIATHEK_URL` setzen (z. B. `http://192.168.1.50:8080/?lang=de`)
2. Skript doppelklicken — Edge startet im Vollbild-Kioskmodus

Oder Edge manuell starten:

```text
msedge.exe --kiosk "http://localhost:8080/?lang=de" --edge-kiosk-type=fullscreen
```

---

## Datenspeicherung

Docker-Volumes behalten Daten über Neustarts:

| Pfad im Container | Inhalt |
|-------------------|--------|
| `/app/data/manifest.json` | Broschüren-Katalog (Titel, Kategorien, URLs) |
| `/app/data/config.json` | UI-Einstellungen (beim Start aus Env erzeugt) |
| `/app/pdfs/` | Heruntergeladene PDFs und Vorschaubilder |

Volumes anzeigen:

```bash
docker volume ls | grep mediathek
```

---

## Deployment mit Portainer

1. In Portainer: **Stacks → Stack hinzufügen → Git-Repository**
2. Auf dieses Repository verweisen
3. Umgebungsvariablen aus `.env.example` im Stack-Editor eintragen
4. Deploy — Portainer baut das Image lokal (`pull_policy: build`)

---

## Sicherheit

Der Kiosk ist für **vertrauenswürdige lokale Netzwerke** (Showroom, Büro-LAN) gedacht. Es gibt **kein Login**; Inhalte werden nur gelesen.

### Offline-Vorteil für Messen und Terminals

Nach dem initialen Sync liegen Katalog und PDFs lokal auf dem Terminal/Server (`/app/data`, `/app/pdfs`).  
Damit kann das System im Messebetrieb **offline** oder in einem strikt abgeschotteten Netz laufen.

Vorteile:

- Kein permanenter Internetzugriff an den Messe-Terminals nötig
- Geringeres Risiko von Missbrauch am Stand (z. B. Aufruf fremder Webseiten durch Dritte)
- Stabilere Bedienung auch bei instabiler Hallen-/Gast-WLAN-Verbindung
- Besser kontrollierbare Präsentationsumgebung für den AMADA-Messestand

### Eingebaute Schutzmaßnahmen

- HTTP-Sicherheitsheader (CSP, `X-Content-Type-Options`, `X-Frame-Options`, …)
- Sync-Crawler akzeptiert nur URLs unter `SOURCE_BASE_URL` (blockiert externe PDF-Links)
- Private/Localhost-Hosts standardmäßig gesperrt (`SYNC_ALLOW_PRIVATE_HOSTS=false`)
- PDF-Download-Größenlimit (`SYNC_MAX_PDF_BYTES`)
- XSS-Schutz im Frontend (`escapeHtml`, sichere URL-Prüfungen)
- Interne Sync-Konfiguration (`sync.env`) wird nicht von nginx ausgeliefert
- `.env` ist gitignored — keine Secrets ins Repository

### Empfehlungen für den Produktivbetrieb

| Szenario | Empfehlung |
|----------|------------|
| **Nur LAN-Kiosk** | An lokales Netz binden; Firewall blockiert Internet-Zugriff |
| **Internet-erreichbar** | **nginx/Caddy/Traefik** mit **HTTPS** davor; Zugriff einschränken (VPN, IP-Allowlist oder Basic Auth) |
| **Quell-Website** | `SOURCE_BASE_URL` nur auf **vertrauenswürdige** öffentliche Sites setzen |
| **Updates** | Docker-Image regelmäßig neu bauen (Abhängigkeits-Updates) |

QR-Codes und externe Links verweisen immer auf die **konfigurierte Quell-Website**, nicht auf den Kiosk selbst.

---

## Fehlerbehebung

| Problem | Lösung |
|---------|--------|
| Leere Mediathek | Auf Sync warten; `docker logs -f amada-mediathek` prüfen |
| Sync bricht sofort ab | `SOURCE_BASE_URL` erreichbar? `INDEX_*`-Pfade prüfen |
| Falsche Sprache | `?lang=de` in der URL oder Sprache in `.env` aktivieren |
| Alte Broschüren | Sync mit `SYNC_FORCE=true` ausführen |
| Port belegt | `MEDIATHEK_PORT=8091` in `.env` ändern |
| Logo fehlt | Pfad in `COMPANY_LOGO_URL` prüfen; nach Datei in `frontend/assets/` Image neu bauen |
| Container „unhealthy“ | Erster Sync kann >10 Min. dauern — Healthcheck erlaubt 600 s Startphase |

Bei Fragen oder Problemen bitte an `thomas.buecken@amada.de` wenden.

---

## Migration von älteren Versionen

| Alt | Neu |
|-----|-----|
| `AMADA_BASE_URL` | `SOURCE_BASE_URL` |
| `AMADA_INDEX_DE` | `INDEX_DE` |
| `PUBLIC_URL` | *(entfernt — QR nutzt Quell-Website-URLs)* |
| Container-Name in Doku | `amada-mediathek` (wie in `docker-compose.yml`) |

Legacy-Variablen `AMADA_*` werden weiterhin automatisch gelesen.

---

## Beispiel: AMADA EU

Das Repository enthält bereits lauffähige Defaults mit `SOURCE_BASE_URL=https://www.amada.eu` und allen `INDEX_*`-Pfaden.

| Sprache | Broschüren-Mediathek auf amada.eu |
|---------|-----------------------------------|
| DE | [Broschüren-Mediathek](https://www.amada.eu/de-de/produkte/broschueren-mediathek/) |
| EN | [Brochures Library](https://www.amada.eu/de-en/products/amada-brochures-library/) |
| IT | [Archivio brochure](https://www.amada.eu/it-it/prodotti/archivio-brochure/) |

Weitere Sprachen in `.env.example`.

---

## Projektstruktur

```text
mediathek/
├── frontend/          # Statische Kiosk-UI (HTML, CSS, JS)
├── sync/              # Python-Crawler (sync_pdfs.py)
├── nginx/             # Webserver-Konfiguration
├── scripts/           # Docker-Entrypoint, Cron, Kiosk-Starter
├── data/              # Beispiel-Manifeste für Demo-Modus
├── docker-compose.yml
├── Dockerfile
└── .env.example       # Konfigurationsvorlage
```

---

## Weitere Dokumentation

- English README: [README.md](README.md)
- Showroom-Anleitung (Englisch): [docs/SHOWROOM_GUIDE_EN.md](docs/SHOWROOM_GUIDE_EN.md)

---

## Lizenz

Code im Repository: siehe [AUTHORS](AUTHORS). Heruntergeladene Broschüren-PDFs und Markenlogos gehören dem jeweiligen Anbieter.

- "AMADA trademark/logo and brochure content are excluded."
- "Only source code is licensed under MIT."
