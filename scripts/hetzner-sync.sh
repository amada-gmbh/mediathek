#!/bin/bash
# Hetzner MA120 – Sync-Script (Cron oder manuell)
# Auf dem Server: cp scripts/hetzner-sync.sh ~/sync-amada.sh && chmod +x ~/sync-amada.sh

set -uo pipefail

REPO="${HOME}/amada-mediathek"
VENV="${REPO}/sync/venv/bin/python"
LOG="${HOME}/sync-amada.log"
ENV_FILE="${REPO}/.env"

touch "$LOG" 2>/dev/null || true

log() {
    echo "[$(date -Iseconds)] $*" | tee -a "$LOG"
}

if [ ! -f "$VENV" ]; then
    log "FEHLER: venv nicht gefunden: $VENV"
    exit 1
fi

if [ -f "$ENV_FILE" ]; then
    set -a
    # shellcheck disable=SC1090
    . "$ENV_FILE"
    set +a
else
    log "WARNUNG: $ENV_FILE fehlt – Umgebungsvariablen manuell setzen."
fi

cd "$REPO" || exit 1
log "Sync startet …"
if "$VENV" sync/sync_pdfs.py >> "$LOG" 2>&1; then
    log "Sync erfolgreich."
    exit 0
else
    log "Sync FEHLGESCHLAGEN (Exit $?)."
    exit 1
fi
