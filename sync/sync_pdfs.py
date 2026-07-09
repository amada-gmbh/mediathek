#!/usr/bin/env python3
"""
Synchronisiert Broschüren-PDFs von der Amada EU Mediathek nach /app/pdfs
und erzeugt /app/data/manifest.json für das Kiosk-Frontend.

Pro Sprache wird die jeweilige Amada-Länderseite gecrawlt (DE/EN/NL/FR/IT/PL/HU/RO/SE/TR).
Broschüren werden über den PDF-Dateinamen (ohne Sprachsuffix) zusammengeführt.
"""

from __future__ import annotations

import hashlib
import ipaddress
import json
import logging
import os
import re
import socket
import sys
import time
import unicodedata
from dataclasses import dataclass, field
from datetime import datetime, timezone
from pathlib import Path
from typing import Any
from urllib.parse import urljoin, urlparse, urlunparse

import requests
from bs4 import BeautifulSoup, Tag
from requests.adapters import HTTPAdapter
from requests.exceptions import RequestException

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [sync] %(levelname)s %(message)s",
    stream=sys.stdout,
)
log = logging.getLogger("sync_pdfs")

def _env(name: str, legacy: str | None = None, default: str = "") -> str:
    value = os.getenv(name, "").strip()
    if not value and legacy:
        value = os.getenv(legacy, "").strip()
    return value or default


DEFAULT_SOURCE_BASE_URL = "https://www.amada.eu"
DEFAULT_INDEX_PATHS: dict[str, str] = {
    "de": "de-de/produkte/broschueren-mediathek/",
    "en": "de-en/products/amada-brochures-library/",
    "nl": "nl-nl/producten/brochure-bibliotheek/",
    "fr": "fr-fr/produits/bibliotheque-de-brochures/",
    "it": "it-it/prodotti/archivio-brochure/",
    "dk": "dk-dk/produkter/brochurebibliotek/",
    "no": "no-no/produkter/brosjyrebibliotek/",
    "pl": "pl-pl/produkty/biblioteka-broszur/",
    "hu": "hu-hu/termekek/kiadvany-koenyvtar/",
    "ro": "ro-ro/produse/biblioteca-de-brosuri/",
    "se": "se-se/produkter/broschyr-mediabibliotek/",
    "tr": "tr-tr/ueruenler/brosuer-kuetuephanesi/",
}

BASE_URL = _env("SOURCE_BASE_URL", "AMADA_BASE_URL", default=DEFAULT_SOURCE_BASE_URL).rstrip("/")
PDF_DIR = Path(os.getenv("PDF_DIR", "/app/pdfs"))
THUMB_DIR = PDF_DIR / "thumbs"
THUMB_SIZE = (600, 800)
THUMB_BG = (0x2A, 0x2A, 0x2A)
THUMB_PAD = 12
DATA_DIR = Path(os.getenv("DATA_DIR", "/app/data"))
MANIFEST_PATH = DATA_DIR / "manifest.json"
SYNC_TIMEOUT = int(os.getenv("SYNC_TIMEOUT_SECONDS", "1800"))
USER_AGENT = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
    "AppleWebKit/537.36 (KHTML, like Gecko) "
    "Chrome/126.0.0.0 Safari/537.36"
)
ALL_LANGS = ("de", "en", "nl", "fr", "it", "pl", "hu", "ro", "dk", "no", "se", "tr")
SYNC_FORCE = os.getenv("SYNC_FORCE", "false").lower() == "true"
SYNC_FORCE_DOWNLOAD = os.getenv("SYNC_FORCE_DOWNLOAD", "false").lower() == "true"
SYNC_ALLOW_PRIVATE_HOSTS = os.getenv("SYNC_ALLOW_PRIVATE_HOSTS", "false").lower() == "true"
MAX_PDF_BYTES = int(os.getenv("SYNC_MAX_PDF_BYTES", str(100 * 1024 * 1024)))


def _hostname_resolves_to_blocked_ip(host: str) -> bool:
    host = host.lower().rstrip(".")
    if host in ("localhost", "127.0.0.1", "::1", "0.0.0.0"):
        return True
    try:
        for info in socket.getaddrinfo(host, None):
            ip = ipaddress.ip_address(info[4][0])
            if (
                ip.is_private
                or ip.is_loopback
                or ip.is_link_local
                or ip.is_reserved
                or ip.is_multicast
            ):
                return True
    except (OSError, ValueError):
        return True
    return False


def is_safe_base_url(url: str) -> bool:
    parsed = urlparse(url)
    if parsed.scheme not in ("http", "https"):
        return False
    if not parsed.hostname:
        return False
    if parsed.username or parsed.password:
        return False
    if not SYNC_ALLOW_PRIVATE_HOSTS and _hostname_resolves_to_blocked_ip(parsed.hostname):
        return False
    return True


def _base_domain(hostname: str) -> str:
    """Extract base domain: cdn.amada.eu -> amada.eu, www.amada.eu -> amada.eu"""
    parts = hostname.lower().split(".")
    return ".".join(parts[-2:]) if len(parts) >= 2 else hostname.lower()


def is_allowed_source_url(url: str) -> bool:
    if not url or not BASE_URL:
        return False
    parsed = urlparse(url)
    if parsed.scheme not in ("http", "https"):
        return False
    if not parsed.hostname:
        return False
    base_host = urlparse(BASE_URL).hostname or ""
    if _base_domain(parsed.hostname) != _base_domain(base_host):
        return False
    if not SYNC_ALLOW_PRIVATE_HOSTS and _hostname_resolves_to_blocked_ip(parsed.hostname):
        return False
    return True


class SafeHTTPAdapter(HTTPAdapter):
    """Blockiert HTTP-Requests zu URLs außerhalb der konfigurierten Quelle."""

    def send(self, request, stream=False, timeout=None, verify=True, cert=None, proxies=None):
        url = request.url or ""
        if url and not is_allowed_source_url(url):
            raise RequestException(f"Request blockiert (URL außerhalb der Quelle): {url}")
        return super().send(
            request,
            stream=stream,
            timeout=timeout,
            verify=verify,
            cert=cert,
            proxies=proxies,
        )


def _index_env_key(lang: str) -> str:
    return f"INDEX_{lang.upper()}"


def _legacy_index_env_key(lang: str) -> str:
    return f"AMADA_INDEX_{lang.upper()}"


def _resolve_index_path(lang: str) -> str | None:
    """Leere INDEX_* → Sprache deaktiviert, sonst Env-Override oder Repo-Default."""
    env_key = _index_env_key(lang)
    legacy_key = _legacy_index_env_key(lang)
    if env_key in os.environ or legacy_key in os.environ:
        value = _env(env_key, legacy_key)
        return value if value else None
    return DEFAULT_INDEX_PATHS.get(lang)


ENABLED_LANGS_FILE = DATA_DIR / "enabled_langs.json"


def _load_enabled_langs() -> frozenset[str] | None:
    """Read UI language selection; returns None if no preference file exists."""
    try:
        data = json.loads(ENABLED_LANGS_FILE.read_text("utf-8"))
        if isinstance(data, list) and data:
            return frozenset(l.lower() for l in data if isinstance(l, str) and l.lower() in ALL_LANGS)
    except (FileNotFoundError, json.JSONDecodeError, OSError):
        pass
    return None


def load_active_locale_paths() -> dict[str, str]:
    enabled = _load_enabled_langs()
    paths: dict[str, str] = {}
    for lang in ALL_LANGS:
        if enabled is not None and lang not in enabled:
            continue
        path = _resolve_index_path(lang)
        if path:
            paths[lang] = path
    return paths


ACTIVE_LOCALE_PATHS = load_active_locale_paths()
ACTIVE_LANGS = frozenset(ACTIVE_LOCALE_PATHS.keys())


def apply_legacy_env() -> None:
    """AMADA_* aus Portainer in SOURCE_* / INDEX_* spiegeln (auch zur Laufzeit)."""
    global BASE_URL, ACTIVE_LOCALE_PATHS, ACTIVE_LANGS

    if not os.getenv("SOURCE_BASE_URL", "").strip():
        legacy_base = os.getenv("AMADA_BASE_URL", "").strip()
        if legacy_base:
            os.environ["SOURCE_BASE_URL"] = legacy_base

    for lang in ALL_LANGS:
        key = _index_env_key(lang)
        legacy = _legacy_index_env_key(lang)
        if not os.getenv(key, "").strip():
            legacy_val = os.getenv(legacy, "").strip()
            if legacy_val:
                os.environ[key] = legacy_val

    BASE_URL = _env("SOURCE_BASE_URL", "AMADA_BASE_URL", default=DEFAULT_SOURCE_BASE_URL).rstrip("/")
    ACTIVE_LOCALE_PATHS = load_active_locale_paths()
    ACTIVE_LANGS = frozenset(ACTIVE_LOCALE_PATHS.keys())


def _cat(
    de: str,
    en: str,
    nl: str,
    fr: str,
    it: str,
    pl: str,
    hu: str,
    ro: str | None = None,
    se: str | None = None,
    tr: str | None = None,
) -> dict[str, str]:
    return {
        "de": de,
        "en": en,
        "nl": nl,
        "fr": fr,
        "it": it,
        "pl": pl,
        "hu": hu,
        "ro": ro if ro is not None else en,
        "se": se if se is not None else en,
        "tr": tr if tr is not None else en,
    }


CATEGORY_LABELS: dict[str, dict[str, str]] = {
    "faserlaser-schneiden": _cat(
        "Faserlaser", "Fiber Laser", "Vezellaser",
        "Découpe laser", "Taglio laser", "Cięcie laserem", "Lézervágás",
        "Taiere cu laser", "Laserskärning", "Lazer kesim",
    ),
    "scheren": _cat(
        "Scheren", "Shearing", "Scharen",
        "Cisaillement", "Cesoie", "Cięcie gilotynowe", "Vágás",
        "Forfecare", "Gradsax", "Giyotin",
    ),
    "stanzen": _cat(
        "Stanzen", "Punching", "Ponsen",
        "Poinçonnage", "Punzonatura", "Wykrawanie", "Lyukasztás",
        "Perforare", "Stans", "Punch",
    ),
    "stanz-laser-kombination": _cat(
        "Stanz-Laser", "Punch-Laser", "Pons-Laser",
        "Poinçon-laser", "Punzonatura-laser", "Wykrawarko-laser", "Kombinált",
        "Combinate", "Kombinations", "Kombinasyon",
    ),
    "abkanten": _cat(
        "Abkanten", "Bending", "Kanten",
        "Pliage", "Piegatura", "Gięcie", "Hajlítás",
        "Indoire", "Bockning", "Abkant",
    ),
    "faserlaser-schweissen": _cat(
        "Laser-Schweißen", "Laser Welding", "Laserslassen",
        "Soudage laser", "Saldatura laser", "Spawanie laserem", "Lézeres hegesztés",
        "Sudura", "Svetsning", "Kaynak",
    ),
    "automation": _cat(
        "Automation", "Automation", "Automatisering",
        "Automatisation", "Automazione", "Automatyzacja", "Automatizálás",
        "Automatizare", "Automation", "Otomasyon",
    ),
    "software": _cat(
        "Software & I4.0", "Software & I4.0", "Software & I4.0",
        "Logiciel & I4.0", "Software & I4.0", "Oprogramowanie & I4.0", "Szoftver & I4.0",
        "Software & I4.0", "Mjukvara & I4.0", "Yazılım & I4.0",
    ),
    "unternehmen": _cat(
        "Unternehmen", "Corporate", "Bedrijf",
        "Corporate", "Aziendale", "Korporacyjne", "Vállalati",
        "Corporate", "Företag", "Kurumsal",
    ),
}

PATH_TO_CATEGORY: list[tuple[str, str]] = [
    ("faserlaserschneiden", "faserlaser-schneiden"),
    ("laser-cutting", "faserlaser-schneiden"),
    ("lasersnijden", "faserlaser-schneiden"),
    ("decoupe-laser", "faserlaser-schneiden"),
    ("taglio-laser", "faserlaser-schneiden"),
    ("ciecia-laserem", "faserlaser-schneiden"),
    ("levagas", "faserlaser-schneiden"),
    ("lezer-vagas", "faserlaser-schneiden"),
    ("tafelscheren", "scheren"),
    ("shearing", "scheren"),
    ("scharen", "scheren"),
    ("stanzen-broschueren", "stanzen"),
    ("punching", "stanzen"),
    ("stansen", "stanzen"),
    ("poinconnage", "stanzen"),
    ("laserpunzonatura", "stanz-laser-kombination"),  # IT combo – before punzonatura alone
    ("punzonatura", "stanzen"),
    ("laser-wykrawanie", "stanz-laser-kombination"),  # PL combo – before wykrawania alone
    ("wykrawania", "stanzen"),
    ("kombinalt", "stanz-laser-kombination"),         # HU combo – before lyukaszt alone
    ("lyukaszt", "stanzen"),
    ("laser-stanz-kombination", "stanz-laser-kombination"),
    ("stans-laser", "stanz-laser-kombination"),
    ("combination", "stanz-laser-kombination"),
    ("combined", "stanz-laser-kombination"),
    ("laserpunzonatura", "stanz-laser-kombination"),  # IT: combinate-laserpunzonatura
    ("laser-wykrawanie", "stanz-laser-kombination"),  # PL: laser-wykrawanie
    ("kombinalt", "stanz-laser-kombination"),         # HU: lyukaszto-kombinalt (before lyukaszt)
    ("laser-stans", "stanz-laser-kombination"),       # SE: laser-stans-kombi
    ("combi-laser", "stanz-laser-kombination"),       # RO: combi-laser-punch
    ("laser-punch", "stanz-laser-kombination"),       # generic
    ("biegeloesungen", "abkanten"),
    ("bending", "abkanten"),
    ("buigen", "abkanten"),
    ("pliage", "abkanten"),
    ("piegatura", "abkanten"),
    ("giecia", "abkanten"),
    ("elhajlit", "abkanten"),
    ("hajlit", "abkanten"),
    ("faserlaserschweissen", "faserlaser-schweissen"),
    ("welding", "faserlaser-schweissen"),
    ("lassen", "faserlaser-schweissen"),
    ("soudage", "faserlaser-schweissen"),
    ("saldatura", "faserlaser-schweissen"),
    ("spawania", "faserlaser-schweissen"),
    ("hegeszt", "faserlaser-schweissen"),
    ("automations-loesungen", "automation"),
    ("automation", "automation"),
    ("automatiser", "automation"),
    ("automatisation", "automation"),
    ("automatizzazione", "automation"),
    ("automatyzacja", "automation"),
    ("automatizalas", "automation"),
    ("software-und-industrie", "software"),
    ("software-and-industry", "software"),
    ("software-en-industrie", "software"),
    ("logiciel", "software"),
    ("oprogramowanie", "software"),
    ("szoftver", "software"),
    ("bibliotheque-de-brochures", "unternehmen"),
    ("archivio-brochure", "unternehmen"),
    ("biblioteka-broszur", "unternehmen"),
    ("kiadvany-koenyvtar", "unternehmen"),
    ("biblioteca-de-brosuri", "unternehmen"),
    ("broschyr-mediabibliotek", "unternehmen"),
    ("brosuer-kuetuephanesi", "unternehmen"),
    # FR
    ("cisaillage", "scheren"),
    ("poinconneuse", "stanzen"),
    ("decoupe-combinee", "stanz-laser-kombination"),
    ("combinee", "stanz-laser-kombination"),
    # RO
    ("taiere-cu-laser", "faserlaser-schneiden"),
    ("taiere", "faserlaser-schneiden"),
    ("forfecare", "scheren"),
    ("perforare", "stanzen"),
    ("combinate", "stanz-laser-kombination"),
    ("indoire", "abkanten"),
    ("sudura", "faserlaser-schweissen"),
    ("automatizare", "automation"),
    # SE
    ("laserskarn", "faserlaser-schneiden"),
    ("laserskarmaskiner", "faserlaser-schneiden"),
    ("gradesax", "scheren"),
    ("stansning", "stanzen"),
    ("kombinations", "stanz-laser-kombination"),
    ("bockning", "abkanten"),
    ("svetsning", "faserlaser-schweissen"),
    ("automatiser", "automation"),
    ("mjukvara", "software"),
    # TR
    ("lazer-kesim", "faserlaser-schneiden"),
    ("giyotin", "scheren"),
    ("delme", "stanzen"),
    ("kombinasyon", "stanz-laser-kombination"),
    ("kaynak", "faserlaser-schweissen"),
    ("otomasyon", "automation"),
    ("yazilim", "software"),
    ("amada-one", "unternehmen"),
    ("amada_one", "unternehmen"),
]

LANG_CODES = "de|en|nl|fr|it|pl|hu|ro|se|tr|sv|es|sr"
LANG_PATTERN = re.compile(
    rf"(?:^|[_\-.])({LANG_CODES})(?:[_\-.]|$|\.pdf$|(?=brochure))",
    re.IGNORECASE,
)


@dataclass
class BrochureEntry:
    title: str
    category: str
    canonical_key: str = ""
    thumbnail: str | None = None
    thumbnails: dict[str, str] = field(default_factory=dict)
    crawl_locale: str = ""
    titles: dict[str, str] = field(default_factory=dict)
    files: dict[str, str] = field(default_factory=dict)
    source_urls: dict[str, str] = field(default_factory=dict)

    @property
    def id(self) -> str:
        base = f"{self.category}:{self.canonical_key or self.title}".encode("utf-8")
        return hashlib.sha256(base).hexdigest()[:16]


def pdf_file_path(relative: str) -> Path:
    return PDF_DIR / Path(relative).name


def _fix_volume_permissions() -> None:
    """Nach manuellem docker exec sync: Nginx (www-data) muss /app/data lesen können."""
    import subprocess

    for target in (DATA_DIR, PDF_DIR):
        if not target.exists():
            continue
        subprocess.run(
            ["chown", "-R", "www-data:www-data", str(target)],
            check=False,
            capture_output=True,
        )
        for path in target.rglob("*"):
            try:
                os.chmod(path, 0o644 if path.is_file() else 0o755)
            except OSError:
                pass


def mediathek_ready() -> bool:
    """Manifest vorhanden und die meisten PDFs lokal auf dem Volume."""
    if not MANIFEST_PATH.exists():
        return False
    try:
        data = json.loads(MANIFEST_PATH.read_text(encoding="utf-8"))
    except (json.JSONDecodeError, OSError):
        return False

    brochures = data.get("brochures") or []
    if not brochures:
        return False

    total = 0
    present = 0
    for brochure in brochures:
        for rel in (brochure.get("files") or {}).values():
            total += 1
            path = pdf_file_path(rel)
            if path.is_file() and path.stat().st_size > 0:
                present += 1

    if total == 0:
        return False

    ready = present >= max(1, int(total * 0.8))
    if ready:
        log.info(
            "Mediathek bereit: %d/%d PDFs vorhanden, %d Broschüren im Manifest.",
            present,
            total,
            len(brochures),
        )
    return ready


def slugify(text: str) -> str:
    text = unicodedata.normalize("NFKD", text)
    text = text.encode("ascii", "ignore").decode("ascii")
    text = re.sub(r"[^a-zA-Z0-9]+", "-", text.lower()).strip("-")
    return text or "brochure"


def detect_language(filename: str) -> str | None:
    """Erkennt Sprache anhand typischer Amada-PDF-Dateinamen."""
    name = Path(filename).stem.lower()

    m = re.search(r"eu\d{2}(de|en|nl|fr|it|pl|hu|ro|se|tr|sv)(?:[_\-.]|$)", name, re.I)
    if m:
        lang = m.group(1).lower()
        if lang == "sv":
            lang = "se"
        if lang in ACTIVE_LANGS:
            return lang

    for lang in ALL_LANGS:
        if re.search(rf"[_\-.]{lang}(?:[_\-.]|$)", name, re.I):
            return lang
    if re.search(r"[_\-.]sv(?:[_\-.]|$)", name, re.I) and "se" in ACTIVE_LANGS:
        return "se"

    m = re.search(r"[_\-.](de|en|nl|fr|it|pl|hu|ro|se|tr|sv)$", name, re.I)
    if m:
        lang = m.group(1).lower()
        if lang == "sv":
            lang = "se"
        if lang in ACTIVE_LANGS:
            return lang

    match = LANG_PATTERN.search(name)
    if match:
        lang = match.group(1).lower()
        if lang == "sv":
            lang = "se"
        return lang if lang in ACTIVE_LANGS else None

    return None


def pdf_canonical_key(url: str) -> str:
    """Sprachneutraler Schlüssel aus dem PDF-Dateinamen."""
    stem = Path(urlparse(url).path).stem.lower()
    key = stem
    for _ in range(4):
        prev = key
        key = re.sub(rf"[_\-.]?({LANG_CODES})([_\-.]|$)", "_", key, flags=re.I)
        key = re.sub(r"eu\d{2}(de|en|nl|fr|it|pl|hu|ro|se|tr|sv)$", "", key, flags=re.I)
        key = re.sub(r"(brochure|folder|prospectus)([_\-.]\d{4})?([_\-.]\d{2})?$", "", key, flags=re.I)
        key = re.sub(r"_+", "_", key).strip("_.- ")
        if key == prev:
            break
    if not key:
        key = hashlib.sha256(url.encode()).hexdigest()[:12]
    return key


def resolve_category(url: str) -> str:
    # Match only against the last path segment so parent directory names
    # (e.g. /bibliotheque-de-brochures/ in a FR sub-page URL) don't shadow
    # the actual category of the page.
    path = urlparse(url).path.rstrip("/")
    last_segment = path.split("/")[-1].lower() if "/" in path else path.lower()
    for fragment, slug in PATH_TO_CATEGORY:
        if fragment in last_segment:
            return slug
    return "sonstiges"


def normalize_url(url: str) -> str:
    """Entfernt doppelte Slashes im Pfad (…/seite// → …/seite/)."""
    parsed = urlparse(url)
    path = re.sub(r"/+", "/", parsed.path)
    if path != "/" and not path.endswith("/"):
        path += "/"
    return urlunparse((parsed.scheme, parsed.netloc, path, parsed.params, parsed.query, ""))


def fetch_html(session: requests.Session, url: str, retries: int = 2) -> str | None:
    url = normalize_url(url)
    for attempt in range(1, retries + 2):
        try:
            resp = session.get(url, timeout=30)
            resp.raise_for_status()
            return resp.text
        except RequestException as exc:
            log.warning("Seite nicht erreichbar: %s (%s)", url, exc)
            if attempt <= retries:
                time.sleep(2 * attempt)
    return None


def discover_category_urls(session: requests.Session, index_path: str) -> list[str]:
    index_path = index_path.strip("/")
    index_url = normalize_url(urljoin(BASE_URL + "/", index_path + "/"))
    html = fetch_html(session, index_url)
    urls: set[str] = {index_url}

    if not html:
        return sorted(urls)

    base_path = "/" + index_path
    soup = BeautifulSoup(html, "lxml")
    for anchor in soup.find_all("a", href=True):
        href = anchor["href"].split("#")[0].strip()
        if not href or href.startswith("mailto:"):
            continue
        full = urljoin(BASE_URL + "/", href.lstrip("/"))
        if not is_allowed_source_url(full):
            continue
        path = urlparse(full).path.rstrip("/")
        if not path.startswith(base_path + "/"):
            continue
        rest = path[len(base_path) + 1 :]
        if rest and "/" not in rest:
            urls.add(normalize_url(full))

    log.info("Kategorie-Seiten für %s: %d", index_path, len(urls))
    return sorted(urls)


def extract_thumbnail(tile: Tag) -> str | None:
    """Amada-Vorschaubilder werden nicht verwendet (einheitliche PDF-Thumbnails)."""
    return None


def link_lang_score(url: str, lang: str, locale_lang: str) -> int:
    """Höher = vertrauenswürdigere Zuordnung URL → Sprache."""
    detected = detect_language(urlparse(url).path)
    if detected == lang:
        return 3
    if detected:
        return 0
    if lang == locale_lang:
        return 2
    return 1


def find_tile_pdf_root(tile: Tag) -> Tag:
    """
    Amada-Typo3: PDF-Flaggen stehen nicht in div.tile, sondern im nächsten
    Geschwister-Frame (frame-type-theme_tilesgridcustom) innerhalb derselben Zeile.
    """
    frame = tile.find_parent("div", class_=lambda c: c and "frame-type-theme_tile" in c)
    if not frame:
        return tile

    sibling = frame.find_next_sibling()
    while sibling is not None:
        if not getattr(sibling, "find_all", None):
            sibling = sibling.find_next_sibling()
            continue
        classes = sibling.get("class") or []
        if "frame-type-theme_tilesgridcustom" in classes:
            return sibling
        pdf_hrefs = [
            a["href"]
            for a in sibling.find_all("a", href=True)
            if ".pdf" in a["href"].lower()
        ]
        if pdf_hrefs:
            return sibling
        sibling = sibling.find_next_sibling()

    return tile


def collect_pdf_urls(root: Tag) -> list[str]:
    """PDF-Links in DOM-Reihenfolge (entspricht Flaggen auf der Amada-Seite)."""
    urls: list[str] = []
    seen: set[str] = set()
    for anchor in root.find_all("a", href=True):
        href = anchor["href"]
        if ".pdf" not in href.lower():
            continue
        full_url = href if href.startswith("http") else urljoin(BASE_URL, href)
        if not is_allowed_source_url(full_url):
            continue
        if full_url not in seen:
            seen.add(full_url)
            urls.append(full_url)
    return urls


def map_urls_to_languages(urls: list[str], locale_lang: str) -> dict[str, str]:
    """
    Ordnet PDF-URLs den Sprachen zu.
    Primär per Dateiname (EU01en, _de_brochure, …); nur bei genau einem Link
    ohne erkennbare Sprache wird die Crawl-Locale verwendet.
    """
    pdf_links: dict[str, str] = {}
    for url in urls:
        detected = detect_language(urlparse(url).path)
        if detected in ACTIVE_LANGS:
            lang = detected
        elif len(urls) == 1 and locale_lang in ACTIVE_LANGS:
            lang = locale_lang
        else:
            continue

        assign_pdf_link(pdf_links, lang, url, locale_lang)
    return pdf_links


def assign_pdf_link(links: dict[str, str], lang: str, url: str, locale_lang: str) -> None:
    if lang not in ACTIVE_LANGS:
        return
    # Gleiche URL nicht zweimal verschiedenen Sprachen zuordnen
    for existing_lang, existing_url in links.items():
        if existing_url == url and existing_lang != lang:
            return
    if lang not in links or link_lang_score(url, lang, locale_lang) > link_lang_score(
        links[lang], lang, locale_lang
    ):
        links[lang] = url


def parse_category_page(html: str, page_url: str, locale_lang: str) -> list[BrochureEntry]:
    soup = BeautifulSoup(html, "lxml")
    category = resolve_category(page_url)
    entries: list[BrochureEntry] = []

    for tile in soup.select("div.tile"):
        title_el = tile.select_one("h2")
        if not title_el:
            continue
        title = title_el.get_text(strip=True)
        if not title:
            continue

        thumbnail = extract_thumbnail(tile)
        search_root = find_tile_pdf_root(tile)

        pdf_links: dict[str, str] = {}
        urls = collect_pdf_urls(search_root)
        if urls:
            pdf_links = map_urls_to_languages(urls, locale_lang)

        if not pdf_links:
            continue

        first_url = next(iter(pdf_links.values()))
        canonical = pdf_canonical_key(first_url)

        entries.append(
            BrochureEntry(
                title=title,
                category=category,
                canonical_key=canonical,
                thumbnail=thumbnail,
                crawl_locale=locale_lang,
                titles={locale_lang: title},
                source_urls=dict(pdf_links),
            )
        )

    return entries


def download_pdf(session: requests.Session, url: str, dest: Path, force: bool = False) -> bool:
    if not is_allowed_source_url(url):
        log.warning("Download blockiert (URL außerhalb der Quelle): %s", url)
        return False
    if not force and dest.exists() and dest.stat().st_size > 0:
        return True
    try:
        with session.get(url, stream=True, timeout=60) as resp:
            resp.raise_for_status()
            content_length = resp.headers.get("Content-Length")
            if content_length and int(content_length) > MAX_PDF_BYTES:
                log.warning("Download zu groß (%s bytes): %s", content_length, url)
                return False
            dest.parent.mkdir(parents=True, exist_ok=True)
            total = 0
            with open(dest, "wb") as fh:
                for chunk in resp.iter_content(chunk_size=65536):
                    if chunk:
                        total += len(chunk)
                        if total > MAX_PDF_BYTES:
                            log.warning("Download abgebrochen (>%d bytes): %s", MAX_PDF_BYTES, url)
                            fh.close()
                            dest.unlink(missing_ok=True)
                            return False
                        fh.write(chunk)
        if dest.stat().st_size == 0:
            dest.unlink(missing_ok=True)
            return False
        log.info("Heruntergeladen: %s", dest.name)
        return True
    except RequestException as exc:
        log.warning("Download fehlgeschlagen %s: %s", url, exc)
        return False


def crop_cover_content(img, threshold: int = 248, header_frac: float = 0.18, pad: int = 6):
    """Schneidet nur horizontalen Weißraum ab (rechts); volle Seitenhöhe bleibt erhalten."""
    from PIL import Image

    if not isinstance(img, Image.Image):
        return img
    gray = img.convert("L")
    w, h = gray.size
    if w <= 0 or h <= 0:
        return img

    y0 = min(h - 1, max(1, int(h * header_frac)))
    body = gray.crop((0, y0, w, h))
    mask = body.point(lambda p: 255 if p < threshold else 0)
    bbox = mask.getbbox()
    if not bbox:
        return img

    left, _, right, _ = bbox
    left = max(0, left - pad)
    right = min(w, right + pad)
    return img.crop((left, 0, right, h))


def fit_contain(img, target_w: int, target_h: int, bg_rgb: tuple, align: str = "center"):
    """Skaliert proportional (contain) und platziert auf Hintergrund."""
    from PIL import Image

    if img.width <= 0 or img.height <= 0:
        return Image.new("RGB", (target_w, target_h), bg_rgb)
    scale = min(target_w / img.width, target_h / img.height)
    new_w = max(1, round(img.width * scale))
    new_h = max(1, round(img.height * scale))
    resized = img.resize((new_w, new_h), Image.Resampling.LANCZOS)
    canvas = Image.new("RGB", (target_w, target_h), bg_rgb)
    x0 = 0 if align == "left" else (target_w - new_w) // 2
    y0 = (target_h - new_h) // 2
    canvas.paste(resized, (x0, y0))
    return canvas


def generate_pdf_thumbnail(pdf_path: Path, dest: Path, force: bool = False) -> bool:
    """Erste PDF-Seite als JPEG – Weißraum entfernen, Proportionen erhalten (contain)."""
    if not force and dest.exists() and dest.stat().st_size > 0:
        return True
    if not pdf_path.exists() or pdf_path.stat().st_size == 0:
        return False

    try:
        import fitz
        from PIL import Image
    except ImportError as exc:
        log.warning("Thumbnail-Abhängigkeit fehlt (%s): %s", pdf_path.name, exc)
        return False

    box_w, box_h = THUMB_SIZE
    inner_w = box_w - THUMB_PAD * 2
    inner_h = box_h - THUMB_PAD * 2
    bg_rgb = (THUMB_BG[0], THUMB_BG[1], THUMB_BG[2])

    try:
        doc = fitz.open(str(pdf_path))
        try:
            page = doc[0]
            rect = page.rect
            if rect.width <= 0 or rect.height <= 0:
                return False

            # Hohe Auflösung rendern, Weißraum entfernen, proportional einpassen
            scale = max(inner_w / rect.width, inner_h / rect.height) * 2.5
            pix = page.get_pixmap(matrix=fitz.Matrix(scale, scale), alpha=False)
            if hasattr(pix, "pil_image"):
                img = pix.pil_image()
                if img.mode != "RGB":
                    img = img.convert("RGB")
            else:
                img = Image.frombytes("RGB", (pix.width, pix.height), bytes(pix.samples))
            img = crop_cover_content(img)
            inner = fit_contain(img, inner_w, inner_h, bg_rgb)
            canvas = Image.new("RGB", (box_w, box_h), bg_rgb)
            canvas.paste(inner, (THUMB_PAD, THUMB_PAD))

            dest.parent.mkdir(parents=True, exist_ok=True)
            canvas.save(str(dest), "JPEG", quality=85, optimize=True)
            log.info("Thumbnail: %s", dest.name)
            return True
        finally:
            doc.close()
    except Exception as exc:
        log.warning("Thumbnail fehlgeschlagen %s: %s", pdf_path.name, exc)
        if dest.exists():
            dest.unlink(missing_ok=True)
        return False


THUMB_SOURCE_LANGS = ("de", "en", "nl")


def assign_local_thumbnails(entry: BrochureEntry, force: bool = False) -> None:
    """Pro verfügbarer Sprache ein Thumbnail aus dem jeweiligen PDF erzeugen."""
    entry.thumbnails = {}
    entry.thumbnail = None

    for lang in sorted(entry.files.keys()):
        name = entry.files[lang]
        pdf_path = PDF_DIR / (name if isinstance(name, str) else Path(name).name)
        if not pdf_path.is_file() or pdf_path.stat().st_size == 0:
            continue
        dest = THUMB_DIR / f"{entry.id}_{lang}.jpg"
        if generate_pdf_thumbnail(pdf_path, dest, force=force):
            entry.thumbnails[lang] = f"/pdfs/thumbs/{entry.id}_{lang}.jpg"

    for lang in (*THUMB_SOURCE_LANGS, *sorted(entry.thumbnails.keys())):
        if lang in entry.thumbnails:
            entry.thumbnail = entry.thumbnails[lang]
            break


# Kategorien, die nur als Fallback dienen wenn keine Fachkategorie bekannt ist.
# Erscheint dasselbe PDF sowohl in einer Fachkategorie als auch in einer dieser
# Fallback-Kategorien, wird der Fallback-Eintrag verworfen (seine URLs werden aber
# in den Fachkategorie-Eintrag gemergt, damit alle Sprachlinks erhalten bleiben).
_FALLBACK_CATEGORIES = frozenset({"unternehmen", "sonstiges"})


def _merge_urls_into(target: BrochureEntry, source: BrochureEntry) -> None:
    """Fügt fehlende source_urls und titles aus source in target ein."""
    for lang, url in source.source_urls.items():
        if lang in ACTIVE_LANGS and lang not in target.source_urls:
            target.source_urls[lang] = url
    for lang, title in source.titles.items():
        if lang not in target.titles:
            target.titles[lang] = title


def merge_entries(all_entries: list[BrochureEntry]) -> dict[str, BrochureEntry]:
    # Schritt 1: Einträge mit demselben canonical_key aber unterschiedlichen Kategorien
    # zusammenführen: Fachkategorie gewinnt, Fallback-Kategorie gibt ihre URLs ab.
    by_canonical: dict[str, list[BrochureEntry]] = {}
    for entry in all_entries:
        key = entry.canonical_key or slugify(entry.title)
        by_canonical.setdefault(key, []).append(entry)

    resolved: list[BrochureEntry] = []
    for group in by_canonical.values():
        specific = [e for e in group if e.category not in _FALLBACK_CATEGORIES]
        fallback = [e for e in group if e.category in _FALLBACK_CATEGORIES]
        if specific and fallback:
            # URLs aus Fallback-Einträgen in den ersten Fach-Eintrag übernehmen
            primary = specific[0]
            for fb in fallback:
                _merge_urls_into(primary, fb)
            resolved.extend(specific)
        elif fallback and not specific:
            # Mehrere Fallback-Kategorien für dieselbe Broschüre → zu einem Eintrag zusammenführen.
            # unternehmen hat Vorrang vor sonstiges.
            order = ["unternehmen", "sonstiges"]
            primary = next(
                (e for cat in order for e in fallback if e.category == cat),
                fallback[0],
            )
            for fb in fallback:
                if fb is not primary:
                    _merge_urls_into(primary, fb)
            resolved.append(primary)
        else:
            resolved.extend(group)

    # Schritt 2: Gleiche (category, canonical_key) aus mehreren Locales zusammenführen
    merged: dict[str, BrochureEntry] = {}
    for entry in resolved:
        merge_key = f"{entry.category}::{entry.canonical_key or slugify(entry.title)}"
        if merge_key not in merged:
            merged[merge_key] = entry
            continue

        existing = merged[merge_key]
        for lang, url in entry.source_urls.items():
            if lang not in ACTIVE_LANGS:
                continue
            current = existing.source_urls.get(lang)
            # URL von der passenden Locale-Quelle bevorzugen
            prefer_new = entry.crawl_locale == lang
            prefer_current = existing.crawl_locale == lang if existing.crawl_locale else False
            if not current:
                existing.source_urls[lang] = url
            elif prefer_new and not prefer_current:
                existing.source_urls[lang] = url
            elif detect_language(urlparse(url).path) == lang and detect_language(
                urlparse(current).path
            ) != lang:
                existing.source_urls[lang] = url
        if entry.crawl_locale and not existing.crawl_locale:
            existing.crawl_locale = entry.crawl_locale
        existing.titles.update(entry.titles)
        if "de" in entry.titles:
            existing.title = entry.titles["de"]
        elif not existing.title and entry.title:
            existing.title = entry.title

    for entry in merged.values():
        if "de" in entry.titles:
            entry.title = entry.titles["de"]
        elif "en" in entry.titles:
            entry.title = entry.titles["en"]
        elif entry.titles:
            entry.title = next(iter(entry.titles.values()))

    return merged


def build_manifest(entries: dict[str, BrochureEntry]) -> dict[str, Any]:
    brochures = []
    for entry in sorted(entries.values(), key=lambda e: (e.category, e.title)):
        files: dict[str, str] = {}
        for lang, filename in sorted(entry.files.items()):
            if lang not in ACTIVE_LANGS:
                continue
            name = filename if isinstance(filename, str) else Path(filename).name
            files[lang] = f"/pdfs/{name}"
        if not files:
            continue

        titles = {lang: entry.titles[lang] for lang in ACTIVE_LANGS if lang in entry.titles}
        if not titles:
            titles = {"de": entry.title}

        source_urls = {
            lang: entry.source_urls[lang]
            for lang in ACTIVE_LANGS
            if lang in entry.source_urls
        }

        item: dict[str, Any] = {
            "id": entry.id,
            "title": entry.title,
            "titles": titles,
            "category": entry.category,
            "thumbnail": entry.thumbnail,
            "languages": sorted(files.keys()),
            "files": files,
        }
        if entry.thumbnails:
            item["thumbnails"] = dict(entry.thumbnails)
        if source_urls:
            item["source_urls"] = source_urls
        brochures.append(item)

    categories = []
    for slug, labels in CATEGORY_LABELS.items():
        count = sum(1 for b in brochures if b["category"] == slug)
        if count > 0:
            categories.append({"id": slug, "labels": labels, "count": count})

    if any(b["category"] == "sonstiges" for b in brochures):
        categories.append(
            {
                "id": "sonstiges",
                "labels": _cat(
                    "Sonstiges", "Other", "Overig", "Autre", "Altro", "Inne", "Egyéb",
                    "Altele", "Övrigt", "Diğer",
                ),
                "count": sum(1 for b in brochures if b["category"] == "sonstiges"),
            }
        )

    return {
        "version": 1,
        "last_sync": datetime.now(timezone.utc).isoformat(),
        "source_base_url": BASE_URL,
        "supported_languages": sorted(ACTIVE_LANGS),
        "sources": {lang: urljoin(BASE_URL + "/", path) for lang, path in ACTIVE_LOCALE_PATHS.items()},
        "categories": categories,
        "brochures": brochures,
    }


def main() -> int:
    apply_legacy_env()

    if len(sys.argv) > 1 and sys.argv[1] == "--ready":
        return 0 if mediathek_ready() else 1

    start = time.time()
    PDF_DIR.mkdir(parents=True, exist_ok=True)
    THUMB_DIR.mkdir(parents=True, exist_ok=True)
    DATA_DIR.mkdir(parents=True, exist_ok=True)

    if SYNC_FORCE:
        log.info("SYNC_FORCE=true – Quellen werden neu gecrawlt.")
    if SYNC_FORCE_DOWNLOAD:
        log.info("SYNC_FORCE_DOWNLOAD=true – vorhandene PDFs werden neu heruntergeladen.")

    session = requests.Session()
    session.mount("http://", SafeHTTPAdapter())
    session.mount("https://", SafeHTTPAdapter())
    session.headers.update({"User-Agent": USER_AGENT})

    all_entries: list[BrochureEntry] = []
    seen_pages: set[str] = set()

    if not BASE_URL:
        log.error(
            "SOURCE_BASE_URL bzw. AMADA_BASE_URL fehlt (z. B. https://www.amada.eu). "
            "AMADA_BASE_URL=%r SOURCE_BASE_URL=%r",
            os.getenv("AMADA_BASE_URL"),
            os.getenv("SOURCE_BASE_URL"),
        )
        return 1

    if not is_safe_base_url(BASE_URL):
        log.error(
            "SOURCE_BASE_URL ist nicht erlaubt (nur öffentliche http(s)-URLs; "
            "interne Hosts mit SYNC_ALLOW_PRIVATE_HOSTS=true): %s",
            BASE_URL,
        )
        return 1

    if not ACTIVE_LOCALE_PATHS:
        log.error(
            "Keine Quellen konfiguriert (INDEX_* / AMADA_INDEX_* leer?). "
            "Prüfen Sie die Stack-Umgebungsvariablen in Portainer.",
        )
        return 1

    log.info("Aktive Sprachen: %s", ", ".join(sorted(ACTIVE_LANGS)))

    for locale_lang, index_path in ACTIVE_LOCALE_PATHS.items():
        log.info("=== Locale %s: %s ===", locale_lang.upper(), index_path)
        for url in discover_category_urls(session, index_path):
            url = normalize_url(url)
            if url in seen_pages:
                continue
            seen_pages.add(url)
            if time.time() - start > SYNC_TIMEOUT:
                log.warning("Sync-Timeout erreicht, breche Crawling ab.")
                break
            html = fetch_html(session, url)
            if html:
                found = parse_category_page(html, url, locale_lang)
                log.info("%s → %d Broschüren", url, len(found))
                all_entries.extend(found)

    merged = merge_entries(all_entries)
    log.info("Eindeutige Broschüren: %d", len(merged))

    thumb_ok = 0
    thumb_fail = 0
    for entry in merged.values():
        brochure_id = entry.id
        langs = sorted(entry.source_urls.keys())
        log.info("Broschüre '%s' → Sprachen: %s", entry.title[:40], ", ".join(langs) or "keine")
        for lang, pdf_url in entry.source_urls.items():
            if lang not in ACTIVE_LANGS:
                continue
            dest = PDF_DIR / f"{brochure_id}_{lang}.pdf"
            had_file = dest.exists() and dest.stat().st_size > 0
            if download_pdf(session, pdf_url, dest, force=SYNC_FORCE_DOWNLOAD):
                entry.files[lang] = dest.name
            if had_file and not SYNC_FORCE_DOWNLOAD:
                log.info("  %s (vorhanden)", dest.name)
            else:
                log.info("  %s ← %s", dest.name, pdf_url)

        unique_urls = set(entry.source_urls.values())
        if len(unique_urls) < len(entry.source_urls):
            log.warning(
                "Duplikate Quell-URLs bei '%s': %s",
                entry.title[:40],
                entry.source_urls,
            )

        assign_local_thumbnails(entry, force=SYNC_FORCE or SYNC_FORCE_DOWNLOAD)
        if entry.thumbnails:
            thumb_ok += len(entry.thumbnails)
        else:
            thumb_fail += 1

    manifest = build_manifest({k: v for k, v in merged.items() if v.files})

    if not manifest["brochures"]:
        log.warning("Keine Broschüren synchronisiert – behalte bestehendes Manifest bei.")
        if MANIFEST_PATH.exists():
            return 0
        manifest["brochures"] = []

    with open(MANIFEST_PATH, "w", encoding="utf-8") as fh:
        json.dump(manifest, fh, ensure_ascii=False, indent=2)
    os.chmod(MANIFEST_PATH, 0o644)
    _fix_volume_permissions()

    on_disk = len(list(THUMB_DIR.glob("*.jpg"))) if THUMB_DIR.exists() else 0
    log.info(
        "Fertig: %d Broschüren, %d PDFs, %d Thumbnails (%d fehlgeschlagen, %d JPGs in %s) in %.1fs",
        len(manifest["brochures"]),
        sum(len(b["files"]) for b in manifest["brochures"]),
        thumb_ok,
        thumb_fail,
        on_disk,
        THUMB_DIR,
        time.time() - start,
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
