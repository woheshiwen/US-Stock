#!/usr/bin/env python3
"""Convert a Markdown report to PDF (Chinese-friendly) for GitHub Actions."""

from __future__ import annotations

import argparse
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

import markdown


def find_chromium() -> str | None:
    for name in (
        "chromium",
        "chromium-browser",
        "google-chrome-stable",
        "google-chrome",
    ):
        path = shutil.which(name)
        if path:
            return path
    return None


def md_to_html(md_path: Path, title: str) -> str:
    md_text = md_path.read_text(encoding="utf-8")
    body = markdown.markdown(
        md_text,
        extensions=["tables", "fenced_code", "nl2br", "sane_lists"],
    )
    return f"""<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<title>{title}</title>
<style>
@page {{ margin: 18mm 16mm; size: A4; }}
body {{
  font-family: "Noto Sans CJK SC", "WenQuanYi Micro Hei", "Droid Sans Fallback", sans-serif;
  font-size: 11pt;
  line-height: 1.55;
  color: #1a1a1a;
}}
h1 {{ font-size: 20pt; border-bottom: 2px solid #2563eb; padding-bottom: 8px; }}
h2 {{ font-size: 14pt; margin-top: 1.4em; color: #1e40af; }}
h3 {{ font-size: 12pt; }}
table {{ border-collapse: collapse; width: 100%; margin: 12px 0; font-size: 9.5pt; }}
th, td {{ border: 1px solid #cbd5e1; padding: 6px 8px; text-align: left; }}
th {{ background: #f1f5f9; }}
blockquote {{
  border-left: 4px solid #94a3b8;
  margin: 1em 0;
  padding: 0.5em 1em;
  background: #f8fafc;
  color: #475569;
}}
a {{ color: #2563eb; word-break: break-all; }}
hr {{ border: none; border-top: 1px solid #e2e8f0; margin: 1.5em 0; }}
ul {{ padding-left: 1.4em; }}
</style>
</head>
<body>
{body}
</body>
</html>"""


def html_to_pdf(html_path: Path, pdf_path: Path, chromium: str) -> None:
    pdf_path.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory() as profile_dir:
        cmd = [
            chromium,
            "--headless=new",
            "--disable-gpu",
            "--no-sandbox",
            "--disable-dev-shm-usage",
            f"--user-data-dir={profile_dir}",
            "--no-pdf-header-footer",
            f"--print-to-pdf={pdf_path}",
            f"file://{html_path.resolve()}",
        ]
        result = subprocess.run(cmd, capture_output=True, text=True)
        if result.returncode != 0:
            raise RuntimeError(
                f"PDF export failed ({result.returncode}): {result.stderr[-2000:]}"
            )


def main() -> int:
    parser = argparse.ArgumentParser(description="Convert reports/*.md to PDF")
    parser.add_argument("markdown", type=Path, help="Path to .md file")
    parser.add_argument(
        "-o",
        "--output",
        type=Path,
        help="Output .pdf path (default: same name as input)",
    )
    args = parser.parse_args()

    md_path = args.markdown.resolve()
    if not md_path.is_file():
        print(f"Markdown not found: {md_path}", file=sys.stderr)
        return 1

    pdf_path = (args.output or md_path.with_suffix(".pdf")).resolve()
    chromium = find_chromium()
    if not chromium:
        print("Chromium/Chrome not found; install chromium-browser.", file=sys.stderr)
        return 1

    title = md_path.stem
    html = md_to_html(md_path, title)

    with tempfile.TemporaryDirectory() as tmp:
        html_path = Path(tmp) / f"{title}.html"
        html_path.write_text(html, encoding="utf-8")
        html_to_pdf(html_path, pdf_path, chromium)

    print(f"Wrote {pdf_path}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
