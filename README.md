# ben

## 唯一用法：在 Cursor 里手动跑 Stock 日报

1. 用 Cursor 打开本仓库 `woheshiwen/ben`
2. 在 Agent 输入框发送：

```text
Stock
```

或：

```text
按 prompts/STOCK_DAILY_REPORT.md 生成最新美股收盘日报
```

3. 报告输出在：**`reports/YYYY-MM-DD.md`**

完整规范见：**[prompts/STOCK_DAILY_REPORT.md](prompts/STOCK_DAILY_REPORT.md)**

---

与 Cursor 聊天里手动生成的日报相同：15 节全文、多源引用、固定关注池（含 NOK）。  
**不要**使用 `scripts/` 或 GitHub Actions 生成简表；那些不是本项目的交付物。
