# ben

美股收盘日报自动化（GitHub Actions）。

## 定时任务

工作流：[`.github/workflows/us-market-daily.yml`](.github/workflows/us-market-daily.yml)

| 触发方式 | 说明 |
|----------|------|
| **定时** | 北京时间 **每周二至周六 08:00**（对应上一美股交易日收盘数据） |
| **手动** | GitHub → **Actions** → **US Market Daily Report** → **Run workflow** |

生成结果保存在 [`reports/`](reports/)，文件名 `YYYY-MM-DD.md`（NYSE 交易日）。

## 本地试跑

```bash
pip install -r requirements.txt
python scripts/generate_us_market_report.py
# 指定交易日：
python scripts/generate_us_market_report.py --date 2026-05-22
```

## 说明

- 首版为 **Yahoo Finance 自动数据摘要**（指数、板块 ETF、Mag7、关注列表含 **NOK** 等）。
- 完整 15 节深度研报（新闻、FedWatch、宽度、机构观点）可在 Cursor 中按需增强；后续可加邮件推送（Resend/SendGrid + Secrets）。
