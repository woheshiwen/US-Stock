# ben

私有仓库：**美股收盘日报**（完整 15 节，与 Cursor 手动版同规范）。

## 推荐方式：Cursor Cloud Agent（无需 GitHub OpenAI Key）

| 步骤 | 说明 |
|------|------|
| 1 | 阅读 **[docs/CURSOR_CLOUD_AGENT_SETUP.zh.md](docs/CURSOR_CLOUD_AGENT_SETUP.zh.md)** |
| 2 | 复制 **[prompts/cloud-agent-daily-task.txt](prompts/cloud-agent-daily-task.txt)** 到 [cursor.com/agents](https://cursor.com/agents) 或 [Automations](https://cursor.com/automations) |
| 3 | 定时建议：cron `0 8 * * 2-6`，时区 **Asia/Shanghai** |
| 4 | 结果在 **`reports/YYYY-MM-DD.md`** |

Agent 会使用 Cursor 的模型与上网能力，费用在 **Cursor 账单**，不在 GitHub Secrets 里配 OpenAI。

## 模板与规则

- `templates/REPORT_SPEC_zh.md` — 章节与合规
- `templates/STYLE_REFERENCE_zh.md` — 排版参考
- `.cursor/rules/us-market-daily-report.mdc` — 在 Cursor 里 @ 日报任务时自动对齐规范

## GitHub Actions（可选）

[`.github/workflows/us-market-daily.yml`](.github/workflows/us-market-daily.yml) **仅手动**抓取 `data/*.json` 辅助数据，**不会**生成简版日报，也**不需要** `OPENAI_API_KEY`。

## 不推荐

- 旧版 `scripts/generate_us_market_report.py`（已弃用）
- 除非自备 OpenAI Key，否则不用 `scripts/generate_full_daily_report.py` 走 Actions 写全文
