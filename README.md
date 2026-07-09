# Broschüren-Mediathek

**Release 1.2.0** – Touch-Kiosk für Broschüren-PDFs, Docker/Portainer, mehrsprachig, offline-fähig.

Generischer Open-Source-Stack: Crawl-Quelle, Logo und Firmenname werden per Umgebungsvariablen gesetzt. Im Repo liegt ein **AMADA-Beispiel** in `.env.example`.

## Features

- **9:16 Touch-Kiosk-UI** – optimiert für Hochformat-Displays
- **Mehrsprachig** – DE, EN, NL, FR, IT, PL, HU, RO, SE, TR (konfigurierbar)
- **Kategoriefilter**, PDF-Viewer, QR-Codes auf Original-URLs der Quell-Website
- **Automatischer Sync** – PDFs beim Start und optional per Cron

## Schnellstart

```bash
cp .env.example .env
# .env anpassen: SOURCE_BASE_URL, INDEX_*, COMPANY_NAME, Logo unter frontend/assets/

docker compose up --build -d
# UI: http://localhost:8080  (Port über MEDIATHEK_PORT)
```

Erster Sync dauert einige Minuten: `docker logs -f brochure-mediathek`

### Testmodus (ohne Download)

```env
SYNC_ENABLED=false
```

Startet mit **2 Demo-Broschüren** – ideal für UI-Tests.

## Wichtige Umgebungsvariablen

| Variable | Beschreibung |
|---|---|
| `MEDIATHEK_PORT` | Host-Port (Standard `8080`) |
| `COMPANY_NAME` | Firmenname in Fußzeile und Browser-Titel |
| `COMPANY_LOGO_URL` | Logo-Pfad, z. B. `/assets/company-logo.png` |
| `SOURCE_BASE_URL` | Basis-URL der Quell-Website (z. B. `https://www.amada.eu`) |
| `INDEX_DE` … `INDEX_TR` | Relativer Pfad zur Broschüren-Mediathek je Sprache; **leer = Sprache aus** |
| `SYNC_ENABLED` | PDF-Download (`false` = Demo) |
| `SYNC_FORCE` / `SYNC_FORCE_DOWNLOAD` | Rescan / PDF-Neudownload (einmalig) |
| `KIOSK_TOUCH_LAYOUT` | Touch-Hochformat-UI erzwingen |

**Hinweis:** `PUBLIC_URL` entfällt – QR-Codes nutzen die beim Sync gespeicherten `source_urls` der Quell-Website, nicht die Kiosk-LAN-URL.

### Sprachen

Jede Sprache über `INDEX_<LANG>` steuern. Explizit leer setzen (`INDEX_FR=`), nicht weglassen.

### Branding

1. Logo nach `frontend/assets/` legen (z. B. `company-logo.png`)
2. `COMPANY_LOGO_URL=/assets/company-logo.png` setzen
3. `COMPANY_NAME=Ihr Unternehmen GmbH`
4. Image neu bauen: `docker compose build --no-cache && docker compose up -d`

### Migration von älteren Versionen

| Alt | Neu |
|---|---|
| `AMADA_BASE_URL` | `SOURCE_BASE_URL` |
| `AMADA_INDEX_DE` | `INDEX_DE` |
| `PUBLIC_URL` | *(entfernt)* |
| Container `amada-mediathek` | `brochure-mediathek` |

Legacy-Variablen `AMADA_*` werden vom Sync noch gelesen.

## Beispiel: AMADA EU

Siehe `.env.example` – `SOURCE_BASE_URL=https://www.amada.eu` und die passenden `INDEX_*`-Pfade.

| Sprache | Mediathek |
|---|---|
| DE | [Broschüren-Mediathek](https://www.amada.eu/de-de/produkte/broschueren-mediathek/) |
| EN | [Brochures Library](https://www.amada.eu/de-en/products/amada-brochures-library/) |
| … | weitere Sprachen in `.env.example` |

## PDF-Rescan

`SYNC_FORCE=true` beim Deploy → nach Abschluss wieder `false`. Logs: `docker logs -f brochure-mediathek`

```bash
docker exec -e SYNC_FORCE=true brochure-mediathek python /app/sync/sync_pdfs.py
```

## Datenspeicherung

- `/app/data/manifest.json` – Katalog
- `/app/pdfs/` – PDFs (Volume)

## QR-Codes

Verlinken auf die **Original-PDF auf der konfigurierten Quell-Website** (`source_urls` im Manifest), nicht auf den Kiosk.

## Releases

| Version | Highlights |
|---------|------------|
| **1.2.0** | Generische Env-Variablen, `COMPANY_NAME`, `PUBLIC_URL` entfernt |
| **1.1.2** | Touch-Layout, Offline-Assets, Modal-Tabs |
| **1.0.0** | Erstes Kiosk-Release |

Version in `VERSION` und UI-Fußzeile.

## Lizenz

Code im Repository: siehe `AUTHORS`. Heruntergeladene Broschüren-PDFs und Markenlogos gehören dem jeweiligen Anbieter.
