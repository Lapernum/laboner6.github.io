#!/usr/bin/env python3
"""Build the small woff2 subsets used by the site.

The original Noto CJK variable fonts are ~29 MB. The site only needs the
characters that actually appear in its copy, so we subset them down to a few
tens of kilobytes. Re-run this after editing Chinese text in the HTML/JS.

Requires: fonttools + brotli (pip install fonttools brotli).
"""

from __future__ import annotations

import re
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
FONT_DIR = ROOT / "assets" / "fonts"
SOURCES = [
    ROOT / "index.html",
    ROOT / "README.md",
    *(ROOT / "js").glob("*.js"),
    *(ROOT / "admin").glob("*.html"),
    *(ROOT / "admin").glob("*.js"),
    ROOT / "old" / "index.html",
    ROOT / "old" / "legacy-enhance.js",
]

CJK = re.compile(
    r"[\u00a0-\u00ff\u2000-\u206f\u2190-\u2193\u3000-\u303f\u3400-\u4dbf"
    r"\u4e00-\u9fff\uf900-\ufaff\uff00-\uffef]"
)
ASCII = re.compile(r"[\u0020-\u007e]")
LATIN_EXTRA = re.compile(r"[\u00a0-\u00ff\u2000-\u206f\u2190-\u2193\u300c\u300d]")


def collect(pattern: re.Pattern[str]) -> str:
    chars: set[str] = set()
    for path in SOURCES:
        if not path.exists():
            continue
        chars.update(pattern.findall(path.read_text(encoding="utf-8", errors="ignore")))
    return "".join(sorted(chars))


def run(font: str, text: str, out: str) -> None:
    source = FONT_DIR / font
    if not source.exists():
        raise SystemExit(
            f"Missing source font: {source}\n"
            "Download the original variable TTF from Google Fonts into "
            "assets/fonts/ first:\n"
            "  https://fonts.google.com/download?family=Noto%20Sans%20SC\n"
            "  https://fonts.google.com/download?family=Noto%20Sans%20TC\n"
            "  https://fonts.google.com/download?family=Outfit\n"
        )
    text_file = FONT_DIR / f".chars-{out}.txt"
    text_file.write_text(text, encoding="utf-8")
    cmd = [
        sys.executable,
        "-m",
        "fontTools.subset",
        str(source),
        f"--text-file={text_file}",
        "--flavor=woff2",
        "--layout-features=*",
        "--name-IDs=*",
        "--name-legacy",
        "--notdef-outline",
        f"--output-file={FONT_DIR / out}",
    ]
    print(" ".join(cmd))
    subprocess.run(cmd, check=True)
    text_file.unlink(missing_ok=True)
    print(f"  -> {out} {(FONT_DIR / out).stat().st_size / 1024:.1f} KB")


def main() -> None:
    cjk_text = collect(CJK)
    latin_text = collect(ASCII) + collect(LATIN_EXTRA)
    print(f"CJK characters: {len(cjk_text)}")
    run("NotoSansSC-VariableFont_wght.ttf", cjk_text, "NotoSansSC.woff2")
    run("NotoSansTC-VariableFont_wght.ttf", cjk_text, "NotoSansTC.woff2")
    run("Outfit-VariableFont_wght.ttf", latin_text, "Outfit.woff2")


if __name__ == "__main__":
    main()
