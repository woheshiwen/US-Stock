#!/usr/bin/env python3
"""Send Excel report email with attachment (Resend API)."""

from __future__ import annotations

import argparse
import base64
import os
import sys
from pathlib import Path

import requests

RESEND_API = "https://api.resend.com/emails"
REPO_ROOT = Path(__file__).resolve().parents[1]


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--file",
        type=Path,
        required=True,
        help="Path to .xlsx file",
    )
    parser.add_argument(
        "--subject",
        default="2014年前项目全量报表",
        help="Email subject",
    )
    args = parser.parse_args()

    api_key = os.environ.get("RESEND_API_KEY", "").strip()
    to_email = os.environ.get("REPORT_EMAIL_TO", "").strip()
    from_email = os.environ.get(
        "REPORT_EMAIL_FROM",
        "报表 <onboarding@resend.dev>",
    ).strip()

    if not api_key or not to_email:
        print(
            "RESEND_API_KEY or REPORT_EMAIL_TO not set; skipping email.",
            file=sys.stderr,
        )
        return 1

    xlsx_path = args.file.resolve()
    if not xlsx_path.is_file():
        print(f"File not found: {xlsx_path}", file=sys.stderr)
        return 1

    xlsx_bytes = xlsx_path.read_bytes()
    attach_name = xlsx_path.name

    attachments = [
        {
            "filename": attach_name,
            "content": base64.b64encode(xlsx_bytes).decode("ascii"),
        }
    ]

    html_body = f"""
<div style="font-family: sans-serif; line-height: 1.6; color: #111;">
  <h2>{args.subject}</h2>
  <p><strong>Excel 报表已附在本邮件</strong>，文件名：<code>{attach_name}</code></p>
  <p style="color:#666;font-size:13px;">
    报表包含 6 个工作表：汇总统计、全量项目清单（1003项）、暂停项目（385项）、
    进行中项目（1项）、300万以上项目（166项）、按年份统计。
  </p>
</div>
"""

    payload = {
        "from": from_email,
        "to": [to_email],
        "subject": args.subject,
        "html": html_body,
        "attachments": attachments,
    }

    resp = requests.post(
        RESEND_API,
        headers={
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        },
        json=payload,
        timeout=60,
    )

    if resp.status_code >= 400:
        print(f"Resend error {resp.status_code}: {resp.text}", file=sys.stderr)
        return 1

    print(
        f"Email sent to {to_email} with attachment {attach_name} "
        f"({len(xlsx_bytes)} bytes, id={resp.json().get('id', '?')})"
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
