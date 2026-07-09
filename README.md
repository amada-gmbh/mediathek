# Brochure Library (Mediathek)

**Version 1.3.0** — Touch-friendly brochure kiosk for showrooms and offices. Runs in Docker, syncs PDFs from a configurable public website, and works offline after the first sync.

This is a generic open-source stack: crawl source, logo, and company name are set via environment variables. The repository includes an **AMADA EU example** in `.env.example`.

---

## What does it do?

1. **Crawls** brochure pages on your configured website (e.g. [amada.eu](https://www.amada.eu))
2. **Downloads** PDFs and generates cover thumbnails
3. **Serves** a touch-optimized kiosk UI for browsing, reading, QR codes, and link copying

No database, no login — designed as a read-only display on a local network.

---

## Features

| Feature | Description |
|--------|-------------|
| **9:16 touch UI** | Optimized for portrait touch displays |
| **10 languages** | DE, EN, NL, FR, IT, PL, HU, RO, SE, TR (each can be enabled/disabled) |
| **Category filters** | Fiber laser, punching, bending, automation, etc. |
| **PDF viewer** | In-browser reader with scroll/swipe |
| **QR codes** | Link to the **original brochure URL** on the source website |
| **Link table** | Copy official PDF URLs for sales e-mails |
| **Auto-sync** | On startup and optionally via cron (default: every 24 h) |
| **Offline mode** | PDFs are stored locally after sync |

---

## Requirements

- **Docker** and **Docker Compose** (or Portainer with stack deploy)
- Network access to the **source website** during sync (not required for kiosk use after sync)
- A screen or touchscreen with a modern browser (Chrome, Edge, Firefox)

For Windows kiosk mode: Microsoft Edge (see [Kiosk mode](#kiosk-mode-windows-edge) below).

---

## Quick start (5 minutes)

### 1. Get the project

```bash
git clone https://github.com/bucto/amada-mediathek.git
cd amada-mediathek
```

### 2. (Optional) create configuration

```bash
cp .env.example .env
```

The repository already contains built-in defaults for:

- `SOURCE_BASE_URL=https://www.amada.eu`
- `INDEX_DE ... INDEX_TR` (all AMADA EU brochure paths)
- sync/runtime defaults (`SYNC_*`, `PDF_PAGE_MODE`, screensaver off)
- branding defaults (`COMPANY_NAME=AMADA GmbH`, `COMPANY_LOGO_URL=/assets/AMADA_80th_logo_White.svg`)

So you can start **without** `.env`.  
Create/edit `.env` only when you want to override defaults.

### 3. Build and start

```bash
docker compose up --build -d
```

Open in a browser:

- **http://localhost:8080** (or the port set in `MEDIATHEK_PORT`)

### 4. Watch the first sync

The first sync downloads PDFs and builds thumbnails. This can take **10–30 minutes** depending on languages and network speed.

```bash
docker logs -f amada-mediathek
```

Wait until you see `Synchronisation abgeschlossen` or `Fertig:` in the logs.

### 5. Test without downloading (demo mode)

For UI testing only, without crawling the source website:

```env
SYNC_ENABLED=false
```

Then rebuild and start — shows **2 demo brochures** with a local PDF.

---

## Configuration reference

All settings can be overridden via `.env` (never commit this file — it is in `.gitignore`).

### Essential variables

| Variable | Description | Example |
|----------|-------------|---------|
| `MEDIATHEK_PORT` | Port on your host PC/server | `8080` |
| `COMPANY_NAME` | Shown in footer and browser title | `AMADA GmbH` |
| `COMPANY_LOGO_URL` | Logo path inside the container | `/assets/AMADA_80th_logo_White.svg` |
| `SOURCE_BASE_URL` | Base URL of the brochure source site | `https://www.amada.eu` |
| `INDEX_DE` … `INDEX_TR` | Relative path to the brochure library per language | see `.env.example` |
| `SYNC_ENABLED` | `true` = download PDFs; `false` = demo mode | `true` |

### Language control

Each language is controlled by `INDEX_<LANG>`:

- Not set → built-in AMADA EU default path is used
- Set a path → overrides the default path
- Set **empty** (`INDEX_FR=`) → language is **disabled** (no crawl, no UI button)

**Important:** To disable a language, set it to empty — do not remove the line.

UI default on first start:

- The language selector starts with **DE, EN, NL enabled**.
- Additional languages can be enabled in the web UI via **Languages**.
- Users can disable DE/EN/NL afterwards if needed.

Built-in default paths (already included in the repository):

```env
INDEX_DE=de-de/produkte/broschueren-mediathek/
INDEX_EN=de-en/products/amada-brochures-library/
INDEX_NL=nl-nl/producten/brochure-bibliotheek/
INDEX_FR=fr-fr/produits/bibliotheque-de-brochures/
INDEX_IT=it-it/prodotti/archivio-brochure/
INDEX_PL=pl-pl/produkty/biblioteka-broszur/
INDEX_HU=hu-hu/termekek/kiadvany-koenyvtar/
INDEX_RO=ro-ro/produse/biblioteca-de-brosuri/
INDEX_DK=dk-dk/produkter/brochurebibliotek/
INDEX_NO=no-no/produkter/brosjyrebibliotek/
INDEX_SE=se-se/produkter/broschyr-mediabibliotek/
INDEX_TR=tr-tr/ueruenler/brosuer-kuetuephanesi/
```

### Sync options

| Variable | Default | Description |
|----------|---------|-------------|
| `SYNC_ON_START` | `true` | Sync on container start if no complete manifest exists |
| `SYNC_INTERVAL_HOURS` | `24` | Cron interval; `0` = disable scheduled sync |
| `SYNC_TIMEOUT_SECONDS` | `3600` | Max crawl duration per run |
| `SYNC_FORCE` | `false` | Force re-crawl and refresh manifest/thumbnails |
| `SYNC_FORCE_DOWNLOAD` | `false` | Also re-download all PDFs (use once, then set back to `false`) |

### Sync schema (EU source, every 24h)

```text
┌──────────────────────┐
│  AMADA EU Website    │
│  SOURCE_BASE_URL     │
│  + INDEX_* paths     │
└──────────┬───────────┘
           │ crawl
           ▼
┌──────────────────────┐
│  Sync Worker         │
│  sync_pdfs.py        │
│  download + thumbs   │
└──────────┬───────────┘
           │ write
           ▼
┌──────────────────────┐
│  Local Storage       │
│  manifest.json       │
│  /app/pdfs/*         │
└──────────┬───────────┘
           │ serve
           ▼
┌──────────────────────┐
│  Kiosk Frontend      │
│  nginx + browser     │
│  offline capable     │
└──────────────────────┘
```

Runtime schedule:

- **Container start**: initial sync runs (if needed, based on existing manifest/PDF state)
- **Then every 24h** (default): cron executes `run-sync-cron.sh` -> `sync/sync_pdfs.py`
- **Frontend refresh**: reads updated `manifest.json` and displays new/changed brochures

Relevant settings:

- `SYNC_ON_START=true`
- `SYNC_INTERVAL_HOURS=24`
- `SYNC_FORCE=true` (manual one-time full re-crawl)
- `SYNC_FORCE_DOWNLOAD=true` (manual one-time PDF re-download)

**Re-scan brochures** after website updates:

```bash
docker exec -e SYNC_FORCE=true amada-mediathek python /app/sync/sync_pdfs.py
```

Or set `SYNC_FORCE=true` in `.env`, restart the container, then set it back to `false`.

### Display options

| Variable | Description |
|----------|-------------|
| `PDF_PAGE_MODE` | `single` (one page) or `double` (two-page spread) |
| `KIOSK_TOUCH_LAYOUT` | `true` = compact portrait UI even when Windows is in landscape |
| `SCREENSAVER_ENABLED` | `true` + `SCREENSAVER_VIDEO_URL` for idle video screensaver |
| `SCREENSAVER_TIMEOUT_MINUTES` | Minutes of inactivity before screensaver (default: `5`) |

### Security-related variables

| Variable | Default | Description |
|----------|---------|-------------|
| `SYNC_ALLOW_PRIVATE_HOSTS` | `false` | Allow crawling internal/private IPs (only for trusted LAN sources) |
| `SYNC_MAX_PDF_BYTES` | `104857600` (100 MB) | Maximum size per downloaded PDF |

---

## Branding (logo & company name)

1. Place your logo in `frontend/assets/` (e.g. `company-logo.png`)
2. Set in `.env`:
   ```env
   COMPANY_NAME=Your Company GmbH
   COMPANY_LOGO_URL=/assets/company-logo.png
   ```
3. Rebuild the image:
   ```bash
   docker compose build --no-cache && docker compose up -d
   ```

Logos must be local paths (`/assets/...`) or `https://` URLs. Path traversal (`..`) is blocked.

---

## Using the kiosk

### Language switching

- Use the language buttons in the **top right** (DE, EN, IT, …)
- Or open directly in a language: `http://localhost:8080/?lang=en`

| Language | URL parameter |
|----------|---------------|
| German | `?lang=de` |
| English | `?lang=en` |
| Italian | `?lang=it` |

### QR codes

1. Tap a brochure tile
2. Open the **QR** tab
3. Visitors scan the code — it opens the **official brochure page** on the source website (not your local server)

### Link table (for sales teams)

Switch from **Tiles** to **Link table** above the search bar. Copy official PDF URLs (DE / EN / NL columns) for e-mails — customers always get the current version from the publisher website.

---

## Kiosk mode (Windows / Edge)

For a dedicated touchscreen PC, use the included batch script:

1. Edit `scripts/start-kiosk-edge.bat` — set `MEDIATHEK_URL` to your server (e.g. `http://192.168.1.50:8080/?lang=de`)
2. Double-click the script — Edge opens in fullscreen kiosk mode

Or start Edge manually:

```text
msedge.exe --kiosk "http://localhost:8080/?lang=de" --edge-kiosk-type=fullscreen
```

---

## Data storage

Docker volumes persist data across restarts:

| Path in container | Content |
|-------------------|---------|
| `/app/data/manifest.json` | Brochure catalog (titles, categories, URLs) |
| `/app/data/config.json` | UI settings (generated from env on startup) |
| `/app/pdfs/` | Downloaded PDF files and thumbnails |

List volumes:

```bash
docker volume ls | grep mediathek
```

---

## Deployment with Portainer

1. In Portainer: **Stacks → Add stack → Git repository**
2. Point to this repository
3. Add environment variables from `.env.example` in the stack editor
4. Deploy — Portainer builds the image locally (`pull_policy: build`)

---

## Security

This kiosk is designed for **trusted local networks** (showroom, office LAN). It has **no login** and serves content read-only.

### Offline operation benefit (trade fairs / public terminals)

After the initial sync, the catalog and PDFs are stored locally (`/app/data`, `/app/pdfs`).  
So the kiosk can run **offline** or in a strictly isolated network during exhibitions.

Benefits:

- No permanent internet access required on booth terminals
- Lower risk of misuse at the booth (e.g. visitors opening unrelated external websites)
- More stable operation even if venue Wi-Fi is unstable
- Better controlled presentation environment for AMADA trade-fair setups

### Built-in protections

- HTTP security headers (CSP, `X-Content-Type-Options`, `X-Frame-Options`, …)
- Sync crawler only accepts URLs under `SOURCE_BASE_URL` (blocks external PDF links)
- Private/localhost hosts blocked by default (`SYNC_ALLOW_PRIVATE_HOSTS=false`)
- PDF download size limit (`SYNC_MAX_PDF_BYTES`)
- XSS mitigation in the frontend (`escapeHtml`, safe URL checks)
- Internal sync config (`sync.env`) not served by nginx
- `.env` is gitignored — never commit secrets

### Recommendations for production

| Scenario | Recommendation |
|----------|----------------|
| **LAN kiosk only** | Bind to local network; firewall block from internet |
| **Internet-facing** | Put **nginx/Caddy/Traefik** in front with **HTTPS**, restrict access (VPN, IP allowlist, or basic auth) |
| **Source website** | Only point `SOURCE_BASE_URL` at a **trusted** public site you control or trust |
| **Updates** | Rebuild the Docker image periodically for dependency updates |

QR codes and external links always point to the **configured source website**, not to the kiosk itself.

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| Empty library | Wait for sync; check `docker logs -f amada-mediathek` |
| Sync fails immediately | Verify `SOURCE_BASE_URL` is reachable; check `INDEX_*` paths |
| Wrong language | Use `?lang=en` in the URL or enable the language in `.env` |
| Old brochures | Run sync with `SYNC_FORCE=true` |
| Port already in use | Change `MEDIATHEK_PORT=8091` in `.env` |
| Logo not shown | Check path in `COMPANY_LOGO_URL`; rebuild image after adding file to `frontend/assets/` |
| Container unhealthy | First sync can take >10 min — healthcheck allows 600 s start period |

For questions or issues, contact: `thomas.buecken@amada.de`.

---

## Migration from older versions

| Old name | New name |
|----------|----------|
| `AMADA_BASE_URL` | `SOURCE_BASE_URL` |
| `AMADA_INDEX_DE` | `INDEX_DE` |
| `PUBLIC_URL` | *(removed — QR uses source website URLs)* |

Legacy `AMADA_*` variables are still read automatically.

---

## Example: AMADA EU

The repository already includes ready-to-run defaults for `SOURCE_BASE_URL=https://www.amada.eu` and all `INDEX_*` paths.

| Language | Brochure library on amada.eu |
|----------|------------------------------|
| DE | [Broschüren-Mediathek](https://www.amada.eu/de-de/produkte/broschueren-mediathek/) |
| EN | [Brochures Library](https://www.amada.eu/de-en/products/amada-brochures-library/) |
| IT | [Archivio brochure](https://www.amada.eu/it-it/prodotti/archivio-brochure/) |

More languages are listed in `.env.example`.

---

## Project structure

```text
mediathek/
├── frontend/          # Static kiosk UI (HTML, CSS, JS)
├── sync/              # Python crawler (sync_pdfs.py)
├── nginx/             # Web server configuration
├── scripts/           # Docker entrypoint, cron, kiosk launcher
├── data/              # Sample manifests for demo mode
├── docker-compose.yml
├── Dockerfile
└── .env.example       # Configuration template
```

---

## Further documentation

- German README: [README_DE.md](README_DE.md)
- Showroom guide (English): [docs/SHOWROOM_GUIDE_EN.md](docs/SHOWROOM_GUIDE_EN.md)

---

## License

Code in this repository: see [AUTHORS](AUTHORS). Downloaded brochure PDFs and brand logos belong to their respective publishers.

- "AMADA trademark/logo and brochure content are excluded."
- "Only source code is licensed under MIT."
