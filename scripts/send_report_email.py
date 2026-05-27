#!/usr/bin/env python3
"""Send daily report email with GitHub raw PDF download link (Resend API)."""

from __future__ import annotations

import argparse
import os
import sys

import requests

RESEND_API = "https://api.resend.com/emails"


def raw_url(repo: str, branch: str, session_date: str, ext: str) -> str:
    return f"https://github.com/{repo}/raw/{branch}/reports/{session_date}.{ext}"


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--date", required=True, help="NYSE session YYYY-MM-DD")
    parser.add_argument(
        "--repo",
        default=os.environ.get("GITHUB_REPOSITORY", ""),
        help="owner/repo (default: GITHUB_REPOSITORY)",
    )
    parser.add_argument(
        "--branch",
        default=os.environ.get("GITHUB_REF_NAME", "main"),
        help="Branch for raw links (default: GITHUB_REF_NAME)",
    )
    args = parser.parse_args()

    api_key = os.environ.get("RESEND_API_KEY", "").strip()
    to_email = os.environ.get("REPORT_EMAIL_TO", "").strip()
    from_email = os.environ.get(
        "REPORT_EMAIL_FROM",
        "美股收盘日报 <onboarding@resend.dev>",
    ).strip()

    if not api_key or not to_email:
        print(
            "RESEND_API_KEY or REPORT_EMAIL_TO not set; skipping email.",
            file=sys.stderr,
        )
        return 0

    if not args.repo:
        print("GITHUB_REPOSITORY / --repo required for download links.", file=sys.stderr)
        return 1

    session = args.date
    pdf_url = raw_url(args.repo, args.branch, session, "pdf")
    md_url = raw_url(args.repo, args.branch, session, "md")

    subject = f"美股收盘日报 {session}（PDF）"
    html_body = f"""
<div style="font-family: sans-serif; line-height: 1.6; color: #111;">
  <h2>美股收盘日报 · {session}</h2>
  <p>今日自动报告已生成并推送到仓库 <code>{args.repo}</code>（分支 <code>{args.branch}</code>）。</p>
  <p><strong>PDF 直接下载：</strong><br>
    <a href="{pdf_url}">{pdf_url}</a>
  </p>
  <p><strong>Markdown 备份：</strong><br>
    <a href="{md_url}">{md_url}</a>
  </p>
  <p style="color:#666;font-size:13px;">
    本邮件由 GitHub Actions 自动发送。完整 15 节深度版仍可在 Cursor 中输入 <code>Stock</code> 生成。
  </p>
</div>
"""

    resp = requests.post(
        RESEND_API,
        headers={
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        },
        json={
            "from": from_email,
            "to": [to_email],
            "subject": subject,
            "html": html_body,
        },
        timeout=30,
    )

    if resp.status_code >= 400:
        print(f"Resend error {resp.status_code}: {resp.text}", file=sys.stderr)
        return 1

    print(f"Email sent to {to_email} (id={resp.json().get('id', '?')})")
    return 0


if __name__ == "__main__":
    sys.exit(main())
