# AMADA Brochure Library – Showroom Guide (EN)

Short guide for subsidiaries testing the digital brochure kiosk locally (e.g. showroom or office).

**Live example (Germany):** https://library.amada-gmbh.eu/

---

## What is it?

A touch-friendly **brochure library** for kiosks and large screens. It downloads brochure PDFs from the AMADA EU website, stores them locally, and lets visitors browse, read, and share them — **even without internet** after the first sync.

---

## Main features

| Feature | Description |
|--------|-------------|
| **Tile view** | Browse brochures by cover image and title |
| **Category filters** | Fiber laser, punching, bending, automation, etc. |
| **Search** | Find brochures by product name |
| **PDF viewer** | Full-screen reader with swipe/scroll |
| **Language switch** | UI and brochure titles follow the selected language |
| **Per-language covers** | Thumbnails update when you change language |
| **QR code** | Opens the **original brochure page on amada.eu** (for visitors’ phones) |
| **Link table** | Copy official PDF URLs for sales e-mails (see below) |
| **Offline use** | PDFs are stored on the server after sync |
| **Auto-update** | Scheduled sync refreshes brochures from the website |

---

## Language switching

### In the app

Use the language buttons in the **top right** (e.g. **DE**, **EN**, **IT**).

When you switch language:

- UI labels change (menus, search, buttons)
- Brochure titles and categories update
- Cover thumbnails switch to that language’s PDF (if available)
- Opening a brochure prefers the PDF in the selected language

### Start directly in a language (URL)

Add `?lang=` to the address:

| Market / use case | URL example |
|-------------------|-------------|
| English | `http://localhost:8080/?lang=en` |
| Italian | `http://localhost:8080/?lang=it` |
| German | `http://localhost:8080/?lang=de` |
| Dutch | `http://localhost:8080/?lang=nl` |

**Showroom tip:** Bookmark or set the browser homepage to e.g.  
`http://your-pc-ip:8080/?lang=it` for an Italian showroom screen.

If no `?lang=` is set, the app uses the **browser language** automatically.

---

## QR codes

1. Tap a brochure tile  
2. Open the **QR** tab  
3. Visitor scans the code with their phone  

The QR code links to the **official AMADA EU brochure page** for that product (not to your local server).  
Useful for sending brochures by email or opening them on a personal device.

You can also tap **Copy original link** below the QR code.

---

## Link table (for sales colleagues)

Switch from **Tiles** to **Link table** above the search bar.

This view is especially useful for colleagues who **send offers and brochures to customers by e-mail**. Instead of attaching large PDF files, you can:

1. Search or filter by product / technology  
2. Find the brochure in the list  
3. Click the **copy icon** next to the link (columns **DE**, **EN**, **NL**)  
4. Paste the URL into your e-mail — the customer opens the **official PDF on amada.eu**

**Benefits:**

- No heavy e-mail attachments  
- Customers always get the **current** brochure from the website  
- Faster workflow when preparing quotes and follow-ups  

The links point to the publisher website, not to your local kiosk.

---

## Local installation with Docker

**Requirements:** [Docker Desktop](https://www.docker.com/products/docker-desktop/) (Windows/Mac) or Docker on Linux.

### 1. Get the project

```bash
git clone https://github.com/bucto/amada-mediathek.git
cd amada-mediathek
```

### 2. Configure environment

```bash
cp .env.example .env
```

Edit `.env` — for **EN + IT only** (faster first sync):

```env
MEDIATHEK_PORT=8080

COMPANY_NAME=AMADA Your Company Name
COMPANY_LOGO_URL=/assets/AMADA_80th_logo_White.svg

SOURCE_BASE_URL=https://www.amada.eu

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

SYNC_ENABLED=true
SYNC_ON_START=true
```

Leave a language **empty** (`INDEX_FR=`) to disable it.  
Add more `INDEX_*` lines when you need additional languages.

### 3. Start

```bash
docker compose up --build -d
```

Open in a browser:

- English: http://localhost:8080/?lang=en  
- Italian: http://localhost:8080/?lang=it  

**First sync** downloads PDFs and builds thumbnails — can take **10–30 minutes** depending on languages and network. Watch progress:

```bash
docker logs -f amada-mediathek
```

### 4. Stop / restart

```bash
docker compose down
docker compose up -d
```

### 5. Quick UI test (no download)

For layout tests only, without crawling amada.eu:

```env
SYNC_ENABLED=false
```

Then rebuild and start — shows 2 demo brochures.

---

## Touchscreen / kiosk mode

- Works best on **touch displays** (portrait or landscape)
- For a dedicated Windows touchscreen in landscape, set in `.env`:

```env
KIOSK_TOUCH_LAYOUT=true
```

- Optional screensaver (after idle timeout): see comments in `.env.example`

---

## Troubleshooting

| Issue | What to do |
|-------|------------|
| Empty library | Wait for sync; check `docker logs -f amada-mediathek` |
| Wrong language | Use `?lang=en` or `?lang=it` in the URL |
| Old content | Set `SYNC_FORCE=true` in `.env`, restart container, then set back to `false` |
| Port already in use | Change `MEDIATHEK_PORT=8091` in `.env` |

---

## Support

For setup questions, contact your AMADA GmbH IT contact.  
Technical details and all environment variables: see `README.md` and `.env.example` in the repository.

---

*Brochure content and logos © AMADA. The kiosk software is for internal showroom and evaluation use.*
