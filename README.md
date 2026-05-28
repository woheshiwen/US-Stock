# US-Stock

美股收盘日报：Cursor 手动深度版 + GitHub Actions 自动 PDF 邮件版。

## 一、Cursor 手动版（完整 15 节）

1. 用 **Cursor** 打开本仓库  
2. 在 Agent / Composer 输入：`Stock`  
3. 按 [`prompts/STOCK_DAILY_REPORT.md`](prompts/STOCK_DAILY_REPORT.md) 生成 `reports/YYYY-MM-DD.md`（含新闻、FedWatch、机构观点等）

## 二、自动定时 + Email（方案 A）

工作流：[`.github/workflows/us-market-daily.yml`](.github/workflows/us-market-daily.yml)

| 项目 | 说明 |
|------|------|
| **定时** | 北京时间 **每周二至周六 08:00**（对应上一美股交易日） |
| **产出** | `reports/YYYY-MM-DD.md` + `reports/YYYY-MM-DD.pdf` |
| **推送** | 自动 commit 到 **默认分支**（`main`） |
| **邮件** | 通过 [Resend](https://resend.com/) 发送 **PDF 邮件附件**（私有仓库请用附件，勿点 raw 链接） |
| **手动** | GitHub → **Actions** → **US Market Daily Report** → **Run workflow** |

自动版为 **Yahoo Finance 数据摘要**（指数、板块 ETF、Mag7、关注列表含 NOK 等）；深度叙事仍以 Cursor `Stock` 为准。

### 配置 GitHub Secrets（必做）

在仓库 **Settings → Secrets and variables → Actions** 添加：

| Secret | 说明 |
|--------|------|
| `RESEND_API_KEY` | [Resend](https://resend.com/api-keys) API Key |
| `REPORT_EMAIL_TO` | 收件邮箱（您的地址） |
| `REPORT_EMAIL_FROM` | 发件人，如 `日报 <reports@yourdomain.com>`（须在 Resend 验证域名；测试可用 `onboarding@resend.dev`） |

合并本 PR 到 `main` 后，定时任务才会在默认分支上运行。

邮件附件文件名：`us-market-daily-YYYY-MM-DD.pdf`（请直接打开附件）。

> **私有仓库：** `github.com/.../raw/...` 链接在未登录时会下载到 404 网页，可能被存成 `2026-05-27---.pdf`。请使用邮件附件。

仓库若为 Public，可用：  
`https://raw.githubusercontent.com/woheshiwen/ben/main/reports/2026-05-26.pdf`

### 本地试跑

```bash
pip install -r requirements.txt
python scripts/generate_us_market_report.py
python scripts/md_to_pdf.py reports/2026-05-22.md

# 试发邮件（需 export 环境变量）
export RESEND_API_KEY=...
export REPORT_EMAIL_TO=you@example.com
python scripts/send_report_email.py --date 2026-05-22 --repo woheshiwen/ben --branch main
```
