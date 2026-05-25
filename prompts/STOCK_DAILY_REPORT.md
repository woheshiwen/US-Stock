# Cursor 手动任务：美股收盘日报（唯一标准）

在 Cursor 中对本仓库说：**「Stock」** 或 **「按 STOCK_DAILY_REPORT 生成今日美股收盘日报」**。

Agent 必须按下列规范生成报告，**与在 Cursor 聊天里手动跑的质量、结构、排版、引用规则完全一致**。不得输出 yfinance 简表或省略章节。

---

## 输出

- 文件：`reports/YYYY-MM-DD.md`（YYYY-MM-DD = 该美股交易日，美东收盘日）
- 标题：`# 美股收盘日报｜YYYY-MM-DD`
- 文首注明：数据截至时间、生成时间（北京时间）、主要来源列表

---

## 数据与引用（硬性）

1. 必须使用**最新可获得**数据，并注明数据截至时间。
2. 优先参考：CNBC、Reuters、Bloomberg、MarketWatch、WSJ、Yahoo Finance、Investing、Barchart、Koyfin、TradingView、Finviz、FactSet、Nasdaq、公司 IR、SEC、CME FedWatch、FRED、美国财政部、EIA、CBOE 等。
3. 所有关键事实、重要数据、公司新闻、财报、宏观数据、机构观点，**必须注明来源或链接**。
4. 不得编造；无可靠数据写 **「暂无可靠数据」**。
5. 不同来源冲突时说明差异，采用更权威、更实时来源。
6. 市场判断区分：**已发生事实** / **数据推断** / **主观判断** / **需继续观察**。
7. 不提供确定性投资建议；操作倾向仅用 **「观察」** 和 **「风险控制」**。

---

## 章节 0–15（不可省略、不可合并为摘要）

### 0. 今日一句话总结
- 3–5 句：大盘涨跌、核心驱动、risk-on/off、市场宽度、今日主线
- 末句：**今日市场状态：**（一句）

### 1. 大盘表现总览
表格列：指数/指标 | 收盘点位 | 涨跌幅 | 日内高低点 | 成交量变化 | 技术状态  
含：Dow、S&P 500、Nasdaq、Nasdaq 100/QQQ、Russell 2000/IWM、SOX、VIX  
附：是否创新高、纳指 vs 标普、小盘、半导体、VIX 解读

### 2. 盘中走势复盘
盘前 / 开盘 / 午盘 / 尾盘 / 盘后；核心原因；sell the news、buy the dip、rotation 等

### 3. 宏观环境
- 3.1 美债（2Y/10Y/30Y、利差、分析）
- 3.2 Fed 降息预期（FedWatch、年内次数、变化、官员讲话）
- 3.3 美元、黄金、原油、加密货币（表 + 解读）
- 3.4 当日重要经济数据（表：数据/实际/预期/前值/解读）

### 4. 板块表现
11 板块表：排名 | 板块 | ETF | 当日 | 近5日 | 近1月 | 相对标普 | 驱动  
最强/最弱、成长价值、周期防御、高切低、AI 轮动

### 5. 主题与风格
半导体 SMH/SOXX、软件 IGV、网络安全、云计算、AI、光通信、数据中心/电力、储能、小盘 IWO/IWN、RSP、QQQ、VTV 等

### 6. 市场宽度
- 6.1 均线参与度（多指数 × 20/50/100/200）
- 6.2 涨跌家数、新高新低（NYSE/Nasdaq）
- 6.3 其他（A/D、Put/Call、VIX 期限结构等，能写则写）

### 7. 技术面
SPY、QQQ、IWM、SMH、IGV、XLK、XLC、XLY 等：价格、均线、RSI、MACD/趋势、支撑、压力

### 8. 重点个股
- 8.1 七巨头 NVDA MSFT AAPL GOOGL AMZN META TSLA
- 8.2 AI 硬件/半导体（含 NVDA AMD AVGO MRVL MU TSM ASML ARM INTC QCOM SMCI DELL HPE ANET CLS VRT COHR LITE AAOI TSEM 等）
- 8.3 软件 SaaS（CRM NOW SNOW ORCL ADBE PANW CRWD DDOG NET MDB PLTR 等）
- 8.4 AI 电力/数据中心（CEG VST NRG ETN PWR GEV VRT FLNC OKLO SMR BE NEE APLD IREN CORZ 等）
- 8.5 其他显著异动

### 9. 财报
- 9.1 昨夜财报表
- 9.2 未来 1–3 日重要财报日历

### 10. 机构观点与资金流

### 11. 板块轮动判断（从给定状态列表选择并说明）

### 12. 重点关注股（必须逐只，表含：股票|涨跌|趋势|新闻|支撑|压力|我的判断）

**固定股票池：**
- 核心科技/AI：NVDA、AMD、AVGO、MRVL、GOOGL、MSFT、META、AMZN、ORCL
- 软件：CRM、NOW、SNOW、ADBE、PANW、CRWD、PLTR、DDOG、NET
- 光通信：LITE、COHR、AAOI、TSEM、SIVE、MRVL、NOK、AVGO、ANET
- 电力/基建：FLNC、OKLO、VST、CEG、ETN、VRT、PWR、GEV、APLD、IREN

**「我的判断」仅允许：** 继续强势、高位震荡、短线过热、回踩支撑、破位风险、等财报催化、利好兑现、低位修复、需要观察

### 13. 明日交易计划 / 观察清单（13.1–13.4）

### 14. 风险提示（风险维度表 + 等级：低/中/中高/高）

### 15. 最终结论
- 今日市场结论（3–5 句）
- 当前市场阶段（选一）
- 我的操作倾向（观察口径）
- 明天最值得关注的 5 个信号

---

## 禁止

- 禁止输出仅 yfinance 填表的缩水版
- 禁止省略章节
- 禁止在未要求时修改 workflow、scripts、发邮件等无关内容
