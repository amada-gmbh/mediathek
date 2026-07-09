#!/bin/bash
# Cron wrapper: full Python path + Docker env (cron inherits neither by default).

set -uo pipefail

PYTHON="/usr/local/bin/python"
SYNC_SCRIPT="/app/sync/sync_pdfs.py"
LOG="/var/log/sync.log"
ENV_FILE="/app/data/sync.env"

touch "$LOG" 2>/dev/null || true

log() {
    echo "[$(date -Iseconds)] $*" >> "$LOG"
}

if [ -f "$ENV_FILE" ]; then
    set -a
    # shellcheck disable=SC1090
    . "$ENV_FILE"
    set +a
fi

log "Cron-Sync startet …"
if "$PYTHON" "$SYNC_SCRIPT" >> "$LOG" 2>&1; then
    log "Cron-Sync erfolgreich abgeschlossen."
    chown -R www-data:www-data /app/data /app/pdfs 2>/dev/null || true
else
    log "Cron-Sync FEHLGESCHLAGEN (Exit $?)."
fi
