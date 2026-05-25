# ben

美股收盘日报自动化 — **与 Cursor 手动版同规范**（0–15 节完整结构）。

## 工作原理

```
抓取多源数据 (Yahoo + 可选 FRED/Serper)
        ↓
OpenAI 按 templates/REPORT_SPEC_zh.md 生成完整中文 Markdown
        ↓
写入 reports/YYYY-MM-DD.md → 自动 commit 到 main
```

与此前「仅 yfinance 表格摘要」不同，当前流水线以 **同一套章节模板 + LLM 写作** 对齐 Cursor 里手动生成的那版日报。

## 必需配置（GitHub Secrets）

在仓库 **Settings → Secrets and variables → Actions** 添加：

| Secret | 必需 | 作用 |
|--------|------|------|
| `OPENAI_API_KEY` | **是** | 生成完整 15 节日报（与 Cursor 同结构/排版） |
| `FRED_API_KEY` | 建议 | 美债、密歇根信心等官方序列（[FRED](https://fred.stlouisfed.org/docs/api/api_key.html) 免费申请） |
| `SERPER_API_KEY` | 建议 | 补充 CNBC/Reuters/Investopedia 等新闻检索（接近 Cursor 多源引用） |

可选 **Variables**：`OPENAI_MODEL`（默认 `gpt-4o`）。

未配置 `OPENAI_API_KEY` 时，Actions **会失败**（避免再生成缩水版报告）。

## 定时与手动运行

- **定时：** 北京时间 每周二–周六 08:00 → [`.github/workflows/us-market-daily.yml`](.github/workflows/us-market-daily.yml)
- **手动：** Actions → **US Market Daily Report** → **Run workflow**（可填 `session_date`）

## 本地试跑

```bash
pip install -r requirements.txt
export OPENAI_API_KEY=sk-...
export FRED_API_KEY=...      # 可选
export SERPER_API_KEY=...    # 可选
python3 scripts/generate_full_daily_report.py --date 2026-05-22
```

## 文件说明

| 路径 | 说明 |
|------|------|
| `templates/REPORT_SPEC_zh.md` | 15 节结构与合规规则 |
| `templates/STYLE_REFERENCE_zh.md` | Cursor 版排版与叙述深度参考 |
| `scripts/fetch_market_data.py` | 多源数据采集 |
| `scripts/generate_full_daily_report.py` | 调用 OpenAI 生成完整报告 |
| `scripts/generate_us_market_report.py` | **已弃用**（旧摘要版） |

## 说明

- 在配置 `FRED_API_KEY` / `SERPER_API_KEY` 后，宏观与新闻引用会更接近 Cursor 手动检索；部分宽度指标（涨跌家数、McClellan 等）若仍无免费源，报告中须写 **「暂无可靠数据」**（与手动版规则一致）。
- 私有仓库可正常使用 Actions；注意 OpenAI API 费用。
