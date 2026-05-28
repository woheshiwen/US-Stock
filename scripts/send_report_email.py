#!/usr/bin/env python3
"""Send daily report email with PDF attachment (Resend API)."""

from __future__ import annotations

import argparse
import base64
import os
import sys
from pathlib import Path

import requests

RESEND_API = "https://api.resend.com/emails"
REPO_ROOT = Path(__file__).resolve().parents[1]


def raw_url(repo: str, branch: str, session_date: str, ext: str) -> str:
    return (
        f"https://raw.githubusercontent.com/{repo}/{branch}/"
        f"reports/{session_date}.{ext}"
    )


def github_file_url(repo: str, branch: str, session_date: str, ext: str) -> str:
    return (
        f"https://github.com/{repo}/blob/{branch}/"
        f"reports/{session_date}.{ext}"
    )


def attachment_filename(session_date: str) -> str:
    # ASCII filename for Windows / Outlook compatibility
    return f"us-market-daily-{session_date}.pdf"


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--date", required=True, help="NYSE session YYYY-MM-DD")
    parser.add_argument(
        "--pdf",
        type=Path,
        help="Path to PDF file (default: reports/YYYY-MM-DD.pdf)",
    )
    parser.add_argument(
        "--repo",
        default=os.environ.get("GITHUB_REPOSITORY", ""),
        help="owner/repo (default: GITHUB_REPOSITORY)",
    )
    parser.add_argument(
        "--branch",
        default=os.environ.get("GITHUB_REF_NAME", "main"),
        help="Branch for optional links (default: GITHUB_REF_NAME)",
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

    session = args.date
    pdf_path = (args.pdf or REPO_ROOT / "reports" / f"{session}.pdf").resolve()

    if not pdf_path.is_file():
        print(f"PDF not found: {pdf_path}", file=sys.stderr)
        return 1

    pdf_bytes = pdf_path.read_bytes()
    if not pdf_bytes.startswith(b"%PDF"):
        print(f"File is not a valid PDF: {pdf_path}", file=sys.stderr)
        return 1

    attach_name = attachment_filename(session)
    attachments = [
        {
            "filename": attach_name,
            "content": base64.b64encode(pdf_bytes).decode("ascii"),
        }
    ]

    repo = args.repo
    branch = args.branch
    pdf_link = raw_url(repo, branch, session, "pdf") if repo else ""
    md_link = raw_url(repo, branch, session, "md") if repo else ""
    blob_link = github_file_url(repo, branch, session, "pdf") if repo else ""

    subject = f"美股收盘日报 {session}（PDF）"
    html_body = f"""
<div style="font-family: sans-serif; line-height: 1.6; color: #111;">
  <h2>美股收盘日报 · {session}</h2>
  <p><strong>PDF 已附在本邮件</strong>，文件名：<code>{attach_name}</code>（请直接打开附件，勿依赖网页链接）。</p>
  <p style="color:#444;font-size:14px;">
    说明：本仓库为<strong>私有仓库</strong>时，GitHub 的「直接下载链接」在未登录浏览器中会返回 404 页面，
    可能被误存为乱码文件名（例如 <code>2026-05-27---.pdf</code>）。请一律使用邮件附件。
  </p>
"""

    if repo:
        html_body += f"""
  <p><strong>仓库内查看（需 GitHub 登录）：</strong><br>
    <a href="{blob_link}">{blob_link}</a>
  </p>
  <p style="color:#666;font-size:13px;">
    若仓库已设为 Public，也可尝试 raw 链接：<br>
    <a href="{pdf_link}">{pdf_link}</a>
  </p>
"""

    html_body += """
  <p style="color:#666;font-size:13px;">
    本邮件由 GitHub Actions 自动发送。完整 15 节深度版仍可在 Cursor 中输入 <code>Stock</code> 生成。
  </p>
</div>
"""

    payload: dict = {
        "from": from_email,
        "to": [to_email],
        "subject": subject,
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
        f"({len(pdf_bytes)} bytes, id={resp.json().get('id', '?')})"
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
