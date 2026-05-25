#!/usr/bin/env python3
"""Send the latest reports/*.md to inbox via Resend API."""

from __future__ import annotations

import argparse
import html
import os
import re
import sys
from pathlib import Path

import requests

REPO_ROOT = Path(__file__).resolve().parents[1]


def markdown_to_simple_html(md: str) -> str:
    """Minimal Markdown → HTML for email (headings, tables as pre)."""
    lines = md.splitlines()
    out: list[str] = [
        '<div style="font-family:sans-serif;line-height:1.5;max-width:900px">'
    ]
    in_table = False
    for line in lines:
        if line.strip().startswith("|"):
            if not in_table:
                out.append("<table border='1' cellpadding='6' cellspacing='0' style='border-collapse:collapse;font-size:13px'>")
                in_table = True
            if re.match(r"^\|[\s\-:|]+\|$", line.strip()):
                continue
            cells = [c.strip() for c in line.strip().strip("|").split("|")]
            tag = "th" if in_table and "<tr>" not in "".join(out[-3:]) else "td"
            if tag == "th" and out[-1].endswith("<table ...>"):
                pass
            row = "".join(f"<{tag}>{html.escape(c)}</{tag}>" for c in cells)
            out.append(f"<tr>{row}</tr>")
            continue
        if in_table:
            out.append("</table>")
            in_table = False
        if line.startswith("# "):
            out.append(f"<h1>{html.escape(line[2:])}</h1>")
        elif line.startswith("## "):
            out.append(f"<h2>{html.escape(line[3:])}</h2>")
        elif line.startswith("### "):
            out.append(f"<h3>{html.escape(line[4:])}</h3>")
        elif line.strip() == "---":
            out.append("<hr/>")
        elif line.strip():
            out.append(f"<p>{html.escape(line)}</p>")
    if in_table:
        out.append("</table>")
    out.append("</div>")
    return "\n".join(out)


def send_resend(
    to_addr: str,
    subject: str,
    html_body: str,
    report_path: Path,
    from_addr: str,
    api_key: str,
) -> None:
    md = report_path.read_text(encoding="utf-8")
    github_url = os.environ.get("REPORT_GITHUB_BLOB_URL", "")
    preface = ""
    if github_url:
        preface = f'<p><a href="{html.escape(github_url)}">在 GitHub 中查看完整报告</a></p>'

    payload = {
        "from": from_addr,
        "to": [to_addr],
        "subject": subject,
        "html": preface + html_body,
    }
    # Optional: attach raw markdown as text - Resend supports attachments in newer API
    r = requests.post(
        "https://api.resend.com/emails",
        headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
        json=payload,
        timeout=30,
    )
    if r.status_code >= 400:
        raise RuntimeError(f"Resend API error {r.status_code}: {r.text}")
    print(f"Email sent to {to_addr}, id={r.json().get('id')}")


def main() -> int:
    p = argparse.ArgumentParser()
    p.add_argument("--file", required=True, help="Path to reports/YYYY-MM-DD.md")
    args = p.parse_args()

    report_path = Path(args.file)
    if not report_path.is_file():
        print(f"Report not found: {report_path}", file=sys.stderr)
        return 1

    to_addr = os.environ.get("REPORT_EMAIL_TO", "").strip()
    api_key = os.environ.get("RESEND_API_KEY", "").strip()
    from_addr = os.environ.get(
        "REPORT_EMAIL_FROM", "onboarding@resend.dev"
    ).strip()

    if not to_addr:
        print("REPORT_EMAIL_TO not set, skip email.", file=sys.stderr)
        return 0
    if not api_key:
        print("RESEND_API_KEY not set, skip email.", file=sys.stderr)
        return 0

    date_match = re.search(r"(\d{4}-\d{2}-\d{2})", report_path.name)
    date_str = date_match.group(1) if date_match else report_path.stem
    subject = os.environ.get(
        "REPORT_EMAIL_SUBJECT", f"美股收盘日报｜{date_str}"
    ).strip()

    md = report_path.read_text(encoding="utf-8")
    html_body = markdown_to_simple_html(md)
    send_resend(to_addr, subject, html_body, report_path, from_addr, api_key)
    return 0


if __name__ == "__main__":
    sys.exit(main())
