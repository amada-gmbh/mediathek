#!/usr/bin/env python3
"""Tiny HTTP API to persist enabled-language preferences from the frontend.

Listens on 127.0.0.1:8881 (container-internal only).
nginx proxies /api/enabled-langs to this server.

GET  /api/enabled-langs  → returns current enabled_langs.json
POST /api/enabled-langs  → expects JSON array, e.g. ["de","en","nl"]
"""

import json
import os
from http.server import HTTPServer, BaseHTTPRequestHandler
from pathlib import Path

ALL_LANGS = frozenset([
    "de", "en", "nl", "fr", "it", "pl", "hu", "ro", "dk", "no", "se", "tr",
])

DATA_DIR = Path(os.getenv("DATA_DIR", "/app/data"))
ENABLED_LANGS_FILE = DATA_DIR / "enabled_langs.json"


class Handler(BaseHTTPRequestHandler):
    def log_message(self, fmt, *args):
        pass

    def _cors(self):
        self.send_header("Content-Type", "application/json")
        self.end_headers()

    def do_GET(self):
        if self.path.rstrip("/") != "/api/enabled-langs":
            self.send_response(404)
            self._cors()
            return
        try:
            data = json.loads(ENABLED_LANGS_FILE.read_text("utf-8"))
        except (FileNotFoundError, json.JSONDecodeError):
            data = []
        self.send_response(200)
        self._cors()
        self.wfile.write(json.dumps(data).encode())

    def do_POST(self):
        if self.path.rstrip("/") != "/api/enabled-langs":
            self.send_response(404)
            self._cors()
            return
        length = int(self.headers.get("Content-Length", 0))
        if length > 4096:
            self.send_response(413)
            self._cors()
            return
        try:
            body = json.loads(self.rfile.read(length))
        except (json.JSONDecodeError, ValueError):
            self.send_response(400)
            self._cors()
            self.wfile.write(b'{"error":"invalid JSON"}')
            return
        if not isinstance(body, list):
            self.send_response(400)
            self._cors()
            self.wfile.write(b'{"error":"expected array"}')
            return
        langs = [l for l in body if isinstance(l, str) and l.lower() in ALL_LANGS]
        DATA_DIR.mkdir(parents=True, exist_ok=True)
        ENABLED_LANGS_FILE.write_text(json.dumps(langs, ensure_ascii=False), "utf-8")
        self.send_response(200)
        self._cors()
        self.wfile.write(json.dumps({"saved": langs}).encode())


if __name__ == "__main__":
    server = HTTPServer(("127.0.0.1", 8881), Handler)
    print("[lang-api] Listening on 127.0.0.1:8881", flush=True)
    server.serve_forever()
