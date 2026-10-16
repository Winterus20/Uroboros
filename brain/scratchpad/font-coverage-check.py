#!/usr/bin/env python3
"""Aday fontlarin Turkce (latin-ext-A + latin-1) glif kapsamasini dogrular."""
import sys
import urllib.request
from fontTools.ttLib import TTFont

TR = {
    "ç U+00E7": 0x00E7, "ö U+00F6": 0x00F6, "ü U+00FC": 0x00FC,
    "ğ U+011F": 0x011F, "Ğ U+011E": 0x011E, "ı U+0131": 0x0131,
    "İ U+0130": 0x0130, "ş U+015F": 0x015F, "Ş U+015E": 0x015E,
}

def css_ttf_url(family: str) -> str | None:
    req = urllib.request.Request(
        f"https://fonts.googleapis.com/css2?family={family}&display=swap",
        headers={"User-Agent": "Mozilla/5.0 (compatible; coverage-check/1.0)"},
    )
    # Non-woff2 UA on this endpoint returns plain TTF urls in css
    req_plain = urllib.request.Request(
        f"https://fonts.googleapis.com/css2?family={family}&display=swap",
    )
    for r in (req_plain, req):
        try:
            css = urllib.request.urlopen(r, timeout=20).read().decode()
        except Exception as e:
            print(f"  css error: {e}")
            continue
        for line in css.splitlines():
            if "url(" in line and ".ttf" in line:
                return line.split("url(")[1].split(")")[0].strip()
    return None

def check(name: str, url: str) -> bool:
    try:
        data = urllib.request.urlopen(url, timeout=30).read()
    except Exception as e:
        print(f"{name}: DOWNLOAD FAIL {e}")
        return False
    path = f"/tmp/fonts/{name.replace('/', '_')}.ttf"
    with open(path, "wb") as f:
        f.write(data)
    try:
        font = TTFont(path, fontNumber=0, lazy=True)
        cmap = font.getBestCmap()
        missing = [k for k, cp in TR.items() if cp not in cmap]
        status = "TR-OK" if not missing else f"TR-MISSING: {', '.join(missing)}"
        print(f"{name}: {status}  ({len(data)//1024} KB)")
        return not missing
    except Exception as e:
        print(f"{name}: PARSE FAIL {e}")
        return False

import os
os.makedirs("/tmp/fonts", exist_ok=True)

GOOGLE = [
    ("Chakra Petch (mevcut display)", "Chakra+Petch:wght@600;700"),
    ("Inter (mevcut sans)", "Inter:wght@400;600;900"),
    ("JetBrains Mono (mevcut mono)", "JetBrains+Mono:wght@400;700"),
    ("Caveat (el yazisi adayi)", "Caveat:wght@400;700"),
    ("Permanent Marker (marker adayi)", "Permanent+Marker"),
    ("Gochi Hand (el yazisi adayi)", "Gochi+Hand"),
    ("Space Mono (retro mono adayi)", "Space+Mono:wght@400;700"),
    ("Ultra (kumarhane slab adayi)", "Ultra"),
    ("Alfa Slab One (display adayi)", "Alfa+Slab+One"),
    ("Bowlby One (display adayi)", "Bowlby+One"),
    ("Rye (saloon display adayi)", "Rye"),
    ("Special Elite (daktilo/kolaj adayi)", "Special+Elite"),
    ("Bungee (tabela display adayi)", "Bungee"),
]

if __name__ == "__main__":
    ok = True
    for name, fam in GOOGLE:
        url = css_ttf_url(fam)
        if not url:
            print(f"{name}: NO TTF URL")
            ok = False
            continue
        ok = check(name, url) and ok
    # m6x11 (Balatro) - harici kaynak
    for name, url in [
        ("m6x11 (balatrowiki)", "https://balatrowiki.org/wiki/Special:FilePath/M6x11.ttf"),
    ]:
        try:
            ok = check(name, url) and ok
        except Exception as e:
            print(f"{name}: FAIL {e}")
    sys.exit(0 if ok else 1)
