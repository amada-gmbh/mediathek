#!/usr/bin/env python3
"""Debug: PDF-Reihenfolge auf Amada-Kacheln prüfen."""
import requests
from bs4 import BeautifulSoup
from urllib.parse import urljoin, urlparse

URL = "https://www.amada.eu/de-de/produkte/broschueren-mediathek/automations-loesungen-broschueren/"

resp = requests.get(URL, timeout=30, headers={"User-Agent": "test"})
soup = BeautifulSoup(resp.text, "lxml")

for i, tile in enumerate(soup.select("div.tile")[:3]):
    title = tile.select_one("h2")
    if not title:
        continue
    print("\n===", title.get_text(strip=True), "===")
    from sync_pdfs import find_tile_pdf_root

    root = find_tile_pdf_root(tile)
    for j, a in enumerate(root.find_all("a", href=True)):
        href = a["href"]
        if ".pdf" not in href.lower():
            continue
        name = urlparse(href).path.split("/")[-1]
        print(f"  [{j}] {name}")
