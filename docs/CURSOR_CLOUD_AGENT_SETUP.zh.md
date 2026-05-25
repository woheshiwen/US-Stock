# 用 Cursor Cloud Agent 生成美股收盘日报（推荐）

不占用 GitHub 里的 `OPENAI_API_KEY`。模型与上网检索走 **Cursor 订阅**，仓库只保存生成的 `reports/YYYY-MM-DD.md`。

---

## 一、前置条件

1. **Cursor 付费计划**（Cloud Agent 需可用额度，见 [Cloud Agents 文档](https://cursor.com/docs/cloud-agent)）。
2. GitHub 已连接 Cursor：**Settings → Integrations → GitHub**，对私有库 `woheshiwen/ben` 有 **读写** 权限。
3. 本仓库已包含：
   - `templates/REPORT_SPEC_zh.md` — 15 节结构与合规规则（与 Cursor 手动版一致）
   - `templates/STYLE_REFERENCE_zh.md` — 排版与叙述深度参考
   - `prompts/cloud-agent-daily-task.txt` — 可直接复制的任务全文

> 若 `main` 上还没有 `templates/`，请先合并 PR #2（或把 `cursor/full-daily-report-parity-9437` 合并进 `main`）。

---

## 二、方式 A：网页手动 / 按需跑（先用来试效果）

1. 打开 **[cursor.com/agents](https://cursor.com/agents)**（或 Cursor 桌面版 → Agent 输入框旁选 **Cloud**）。
2. 选择仓库：**woheshiwen/ben**，分支 **main**。
3. 打开本仓库 **`prompts/cloud-agent-daily-task.txt`**，**全文复制** 到 Agent 输入框。
4. 建议设置（界面里若有）：
   - **直接提交到当前分支** / *Work on current branch* → 开启（报告进 `main`，不必每天开 PR）
   - **自动开 PR** → 关闭（仅写 `reports/` 时不需要 PR）
5. 启动 Agent，等跑完。
6. 在 GitHub **Code → `reports/`** 查看 `YYYY-MM-DD.md`。

---

## 三、方式 B：定时自动跑（Cursor Automations）

适合「北京时间每个美股交易日早上 8 点」无人值守。

1. 打开 **[cursor.com/automations](https://cursor.com/automations)**（见 [Cursor Automations 介绍](https://cursor.com/blog/automations)）。
2. **New automation**：
   - **Trigger（触发器）**：Schedule / Cron  
   - **时区**：`Asia/Shanghai`  
   - **Cron**（周二～周六 08:00，对应上一美股交易日）：
     ```text
     0 8 * * 2-6
     ```
   - **Repository**：`https://github.com/woheshiwen/ben`
   - **Branch**：`main`
3. **Instructions（指令）**：粘贴 `prompts/cloud-agent-daily-task.txt` 全文。
4. 保存并 **Enable**。
5. 第一次可点 **Run now** 试跑，再去 `reports/` 看结果。

---

## 四、方式 C：API 触发（进阶）

若你用外部调度（本机 cron、服务器），可用 Cursor Cloud Agents API：

- 文档：[Cloud Agents API](https://cursor.com/docs/cloud-agent/api/endpoints)
- API Key：**Cursor Dashboard → Integrations** 创建
- 创建 Agent 时建议：
  - `repos[0].url`: `https://github.com/woheshiwen/ben`
  - `repos[0].startingRef`: `main`
  - `workOnCurrentBranch`: `true`
  - `autoCreatePR`: `false`
  - `prompt.text`: `prompts/cloud-agent-daily-task.txt` 的内容

计费按 Cursor API/模型用量，不是 GitHub Secrets。

---

## 五、与 GitHub Actions 的分工

| 方式 | 是否需要 OpenAI Key | 报告质量 |
|------|---------------------|----------|
| **Cursor Cloud Agent**（本指南） | 否 | 与 Cursor 手动一致（多源检索 + 长文） |
| GitHub Actions + `generate_full_daily_report.py` | 是 | 依赖自备 Key |

建议：

- **关闭或忽略** Actions 的定时（本仓库 workflow 已改为仅手动可选）。
- 日常只用 **Cursor Automations** 或 **Agents 页面** 生成日报。

---

## 六、常见问题

**Q：Agent 跑完没有 `reports/` 文件？**  
- 确认开启了「直接提交到 main」且 Agent 有 push 权限。  
- 看 Agent 运行日志是否报错、是否只开了 PR 没 merge。

**Q：和我在聊天里手动写的仍有一点不同？**  
- 属正常：交易日新闻每天不同；Agent 须遵守「不得编造、无数据写暂无可靠数据」。

**Q：想发邮件？**  
- Cloud Agent 任务里加一句：「生成后把 `reports/最新日期.md` 摘要发到我邮箱 …」或另做 Automation 对接 Slack/邮件（需自行集成）。

---

## 七、检查清单

- [ ] GitHub 已连 Cursor，ben 仓库可写  
- [ ] `templates/` 已在 `main`  
- [ ] 用 `prompts/cloud-agent-daily-task.txt` 试跑成功  
- [ ] `reports/YYYY-MM-DD.md` 已出现在 `main`  
- [ ]（可选）Automations cron `0 8 * * 2-6` @ Asia/Shanghai 已启用  

---

## 八、定时跑 + 自动发邮件（推荐组合）

Cursor **不能**直接把整份日报发到邮箱（邮件一般是「任务完成」通知 + 链接）。  
推荐：**Cursor 定时写 `reports/` → push 到 `main` → GitHub 自动发邮件**。

### 流程

```text
Cursor Automations（每天 08:00）
    → Cloud Agent 生成 reports/YYYY-MM-DD.md
    → git push 到 main
    → GitHub Actions「Email US Market Daily Report」
    → 邮件发到你的邮箱
```

### 你需要配置的 GitHub Secrets

**Settings → Secrets and variables → Actions → New secret**

| Secret | 说明 |
|--------|------|
| `REPORT_EMAIL_TO` | 你的收件邮箱，例如 `you@gmail.com` |
| `RESEND_API_KEY` | 在 [resend.com](https://resend.com) 注册后创建 API Key（有免费额度） |
| `REPORT_EMAIL_FROM` | （可选）发件人，须为 Resend 已验证域名；测试可用 `onboarding@resend.dev`（仅发往你在 Resend 注册的邮箱） |

合并含 `email-report.yml` 的分支后，**第一次** Agent push 新 `reports/*.md` 时会触发发信。

### Cursor 定时（再确认）

- [cursor.com/automations](https://cursor.com/automations)
- Cron：`0 8 * * 2-6`，时区 `Asia/Shanghai`
- 指令：粘贴 `prompts/cloud-agent-daily-task.txt`
- **Work on current branch = main**，**不要**只开 PR 不合并（否则邮件 workflow 不会触发）

### 收不到邮件时检查

1. `main` 上是否真有新的 `reports/xxx.md`（不是只在 PR 里）
2. Actions 里 **Email US Market Daily Report** 是否成功（黄字 warning = 没配 Secret）
3. Resend 测试发件人 `onboarding@resend.dev` 只能发到 Resend 账号邮箱
4. 看垃圾邮件箱
