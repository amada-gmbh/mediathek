#!/bin/bash
set -euo pipefail

SYNC_ENABLED="${SYNC_ENABLED:-true}"
SYNC_ON_START="${SYNC_ON_START:-true}"
SYNC_INTERVAL_HOURS="${SYNC_INTERVAL_HOURS:-24}"
SYNC_FORCE="${SYNC_FORCE:-false}"

SCREENSAVER_ENABLED="${SCREENSAVER_ENABLED:-false}"
SCREENSAVER_TIMEOUT_MINUTES="${SCREENSAVER_TIMEOUT_MINUTES:-5}"
SCREENSAVER_VIDEO_URL="${SCREENSAVER_VIDEO_URL:-}"

# Legacy AMADA_* → SOURCE_* (Portainer-Stacks nutzen oft noch AMADA_BASE_URL)
migrate_legacy_env() {
    local src="${SOURCE_BASE_URL:-}"
    local leg_base="${AMADA_BASE_URL:-}"
    if [ -z "${src// }" ] && [ -n "${leg_base// }" ]; then
        export SOURCE_BASE_URL="${leg_base}"
        echo "[entrypoint] SOURCE_BASE_URL aus AMADA_BASE_URL übernommen."
    elif [ -z "${src// }" ]; then
        export SOURCE_BASE_URL="https://www.amada.eu"
    fi
    for lang in de en nl fr it pl hu ro dk no se tr; do
        var="INDEX_${lang^^}"
        legacy="AMADA_INDEX_${lang^^}"
        val="${!var:-}"
        leg="${!legacy:-}"
        if [ -z "${val// }" ] && [ -n "${leg// }" ]; then
            export "${var}=${leg}"
        fi
    done
}

migrate_legacy_env

write_config() {
    python3 - <<'PY'
import json, os

def env(name, legacy=None, default=""):
    v = os.getenv(name, "").strip()
    if not v and legacy:
        v = os.getenv(legacy, "").strip()
    return v or default

video_url = os.getenv("SCREENSAVER_VIDEO_URL", "").strip()
enabled_env = os.getenv("SCREENSAVER_ENABLED", "false").strip().lower() in ("1", "true", "yes", "on")
enabled = enabled_env and bool(video_url)
if enabled and video_url.startswith("/"):
    if ".." in video_url or video_url.startswith("//"):
        print(f"[entrypoint] Screensaver: ungültiger Pfad ({video_url}) – deaktiviert.")
        enabled = False
        video_url = ""
    else:
        local_path = "/var/www/html" + video_url
        if not os.path.isfile(local_path):
            print(f"[entrypoint] Screensaver: Datei fehlt ({local_path}) – deaktiviert.")
            enabled = False
            video_url = ""
elif enabled and video_url:
    print("[entrypoint] Screensaver: nur lokale Pfade (/assets/...) erlaubt – deaktiviert.")
    enabled = False
    video_url = ""
elif not enabled:
    video_url = ""
try:
    timeout = max(1, int(os.getenv("SCREENSAVER_TIMEOUT_MINUTES", "5")))
except ValueError:
    timeout = 5

page_mode = os.getenv("PDF_PAGE_MODE", "single").strip().lower()
if page_mode not in ("single", "double"):
    page_mode = "single"

touch_layout = os.getenv("KIOSK_TOUCH_LAYOUT", "false").strip().lower() in ("1", "true", "yes", "on")

ALL_LANGS = ("de", "en", "nl", "fr", "it", "pl", "hu", "ro", "dk", "no", "se", "tr")
DEFAULT_INDEX_PATHS = {
    "de": "de-de/produkte/broschueren-mediathek/",
    "en": "de-en/products/amada-brochures-library/",
    "nl": "nl-nl/producten/brochure-bibliotheek/",
    "fr": "fr-fr/produits/bibliotheque-de-brochures/",
    "it": "it-it/prodotti/archivio-brochure/",
    "pl": "pl-pl/produkty/biblioteka-broszur/",
    "hu": "hu-hu/termekek/kiadvany-koenyvtar/",
    "ro": "ro-ro/produse/biblioteca-de-brosuri/",
    "dk": "dk-dk/produkter/brochurebibliotek/",
    "no": "no-no/produkter/brosjyrebibliotek/",
    "se": "se-se/produkter/broschyr-mediabibliotek/",
    "tr": "tr-tr/ueruenler/brosuer-kuetuephanesi/",
}

def index_env(lang):
    return f"INDEX_{lang.upper()}"

def legacy_index_env(lang):
    return f"AMADA_INDEX_{lang.upper()}"

def active_languages():
    langs = []
    for lang in ALL_LANGS:
        key = index_env(lang)
        legacy = legacy_index_env(lang)
        if key in os.environ or legacy in os.environ:
            if not env(key, legacy):
                continue
            langs.append(lang)
            continue
        if DEFAULT_INDEX_PATHS.get(lang):
            langs.append(lang)
    return langs

company_name = env("COMPANY_NAME")
logo_url = env("COMPANY_LOGO_URL", default="/assets/AMADA_80th_logo_White.svg")
if logo_url:
    if logo_url.startswith(("http://", "https://")):
        pass
    elif logo_url.startswith("/"):
        if ".." in logo_url or logo_url.startswith("//"):
            print(f"[entrypoint] Ungültiges COMPANY_LOGO_URL ({logo_url!r}) – Logo deaktiviert.")
            logo_url = ""
    else:
        logo_url = "/" + logo_url.lstrip("/")
        if ".." in logo_url or logo_url.startswith("//"):
            print(f"[entrypoint] Ungültiges COMPANY_LOGO_URL ({logo_url!r}) – Logo deaktiviert.")
            logo_url = ""

active_langs = active_languages()

cfg = {
    "screensaver": {
        "enabled": enabled,
        "timeout_minutes": timeout,
        "video_url": video_url,
    },
    "pdf_view": {
        "page_mode": page_mode,
    },
    "supported_languages": active_langs,
    "touch_layout": touch_layout,
    "branding": {
        "company_name": company_name,
        "logo_url": logo_url if company_name or logo_url else "",
    },
}
path = "/app/data/config.json"
with open(path, "w", encoding="utf-8") as fh:
    json.dump(cfg, fh, ensure_ascii=False, indent=2)
brand = company_name or "(kein Firmenname)"
print(f"[entrypoint] config.json geschrieben (Screensaver: {'an' if enabled else 'aus'}, PDF: {page_mode}, Touch-Layout: {'an' if touch_layout else 'auto'}, Firma: {brand}, Sprachen: {', '.join(active_langs) or 'keine'}).")
PY
}

write_config

fix_permissions() {
    chown -R www-data:www-data /app/data /app/pdfs 2>/dev/null || true
    find /app/data /app/pdfs -type d -exec chmod 755 {} + 2>/dev/null || true
    find /app/data /app/pdfs -type f -exec chmod 644 {} + 2>/dev/null || true
}

fix_permissions

write_sync_env() {
    # Cron jobs do not inherit Docker env; persist relevant vars for run-sync-cron.sh.
    {
        env | grep -E '^(SYNC_|INDEX_|AMADA_INDEX_|PDF_|DATA_|SOURCE_|AMADA_BASE_|THUMB_|COMPANY_)' || true
    } > /app/data/sync.env
    chmod 600 /app/data/sync.env 2>/dev/null || true
}

write_sync_env

# Default enabled_langs.json (DE, EN, NL) if not yet set by user via UI
if [ ! -f /app/data/enabled_langs.json ]; then
    echo '["en"]' > /app/data/enabled_langs.json
    echo "[entrypoint] enabled_langs.json angelegt (Standard: en)."
fi

sync_config_languages_from_manifest() {
    python3 - <<'PY' || true
import json
from pathlib import Path

manifest_path = Path("/app/data/manifest.json")
config_path = Path("/app/data/config.json")
if not manifest_path.is_file() or not config_path.is_file():
    raise SystemExit(0)
manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
langs = manifest.get("supported_languages") or []
if not langs:
    raise SystemExit(0)
config = json.loads(config_path.read_text(encoding="utf-8"))
config["supported_languages"] = langs
config_path.write_text(json.dumps(config, ensure_ascii=False, indent=2), encoding="utf-8")
print(f"[entrypoint] config.json: supported_languages aus Manifest ({len(langs)} Sprachen).")
PY
}

run_sync() {
    echo "[entrypoint] Starte PDF-Synchronisation …"
    if python /app/sync/sync_pdfs.py; then
        echo "[entrypoint] Synchronisation abgeschlossen."
        sync_config_languages_from_manifest
    else
        echo "[entrypoint] WARNUNG: Synchronisation fehlgeschlagen – Nginx startet trotzdem."
    fi
    fix_permissions
}

if [ "$SYNC_ENABLED" = "false" ]; then
    echo "[entrypoint] Sync deaktiviert (SYNC_ENABLED=false) – Demo-Manifest wird verwendet."
    if [ -f /app/data/manifest.demo.json ]; then
        cp /app/data/manifest.demo.json /app/data/manifest.json
    fi
    fix_permissions
elif [ "$SYNC_ON_START" = "true" ]; then
    if [ "$SYNC_FORCE" = "true" ]; then
        echo "[entrypoint] SYNC_FORCE=true – Starte Rescan (PDFs nur bei SYNC_FORCE_DOWNLOAD=true neu)."
        run_sync
    elif python /app/sync/sync_pdfs.py --ready >/dev/null 2>&1; then
        echo "[entrypoint] Mediathek bereit – überspringe Start-Sync (Cron alle ${SYNC_INTERVAL_HOURS}h)."
        echo "[entrypoint] Tipp: Rescan mit SYNC_FORCE=true oder PDF-Neudownload mit SYNC_FORCE_DOWNLOAD=true."
    else
        echo "[entrypoint] Kein vollständiges Manifest/PDF-Bestand – Starte Erst-Sync …"
        run_sync
    fi
else
    echo "[entrypoint] SYNC_ON_START=false – kein Sync beim Start; nächster Lauf per Cron (alle ${SYNC_INTERVAL_HOURS}h)."
fi

if [ "$SYNC_ENABLED" != "false" ] && [ -n "$SYNC_INTERVAL_HOURS" ] && [ "$SYNC_INTERVAL_HOURS" != "0" ]; then
    touch /var/log/sync.log
    chmod 644 /var/log/sync.log
    CRON_EXPR="0 */${SYNC_INTERVAL_HOURS} * * * root /app/scripts/run-sync-cron.sh"
    printf '%s\n' "$CRON_EXPR" > /etc/cron.d/mediathek-sync
    chmod 0644 /etc/cron.d/mediathek-sync
    cron
    echo "[entrypoint] Cron-Sync alle ${SYNC_INTERVAL_HOURS}h aktiviert (Log: /var/log/sync.log)."
fi

echo "[entrypoint] Starte Lang-API …"
nohup python -u /app/scripts/lang-api.py > /var/log/lang-api.log 2>&1 &
sleep 0.5
if kill -0 $! 2>/dev/null; then
    echo "[entrypoint] Lang-API läuft (PID $!)."
else
    echo "[entrypoint] WARNUNG: Lang-API konnte nicht gestartet werden."
fi

echo "[entrypoint] Starte Nginx …"
exec nginx -g "daemon off;"
