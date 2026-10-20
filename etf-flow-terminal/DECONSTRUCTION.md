# ETF Flow Terminal — 解构说明

> 本地复刻自 [kzgflow.com](https://www.kzgflow.com/)（公开前端 v2.5.2）。原站版权归其作者；本目录用于学习架构与二次配置，上线前请替换品牌、入口链接与数据源声明。

## 一句话定位

**纯前端「机构资金流终端」**：用静态 ETF 日度净流入序列 + 浏览器直连的免费公开 API，拼出 BTC/ETH 现货 ETF 流向、行情、情绪、链上、衍生品、跨所价差、DeFi、币股等全景面板。部署在 Netlify；几乎零后端，仅 `/api/price` 做多所报价聚合。

## 信息架构（页面骨架）

```
ticker          顶栏行情条（总市值 / BTC·ETH 价 / F&G / 费率 / 资金费率…）
header          品牌 + 中英切换 + 暗色切换 + 分区导航
hero            一句话价值主张
stats           4 张关键 KPI（最新净流 / 累计 / AUM…）
#flows
  card-btc      BTC ETF 日度净流柱状 + 累计线
  card-eth      ETH ETF 同上
  duo
    card-ratio  加密 vs 美股市值占比
    card-table  交易日明细表
#free-zone      免费市场全景面板网格（可折叠「更多」）
entry bands     页面 1/3、2/3 处插入的注册入口条（app.js 动态插入）
#locked         「进阶数据」区（填交易所+UID 本地解锁；可接 webhook）
footer
```

`index.html` **只保留 DOM 挂载点**，文案/颜色/链接一律不写死。

## 模块与加载顺序

```
config.js → data.js → wechat → metrics → live → capture → charts → charts2 → panels → app
```

| 文件 | 角色 | 可否随便改 |
|------|------|------------|
| `config.js` | 全站配置真源：meta、开关、主题、导航、中英文字符串、入口链接、线索通道 | ✅ 自由编辑 |
| `data.js` | 全站数据真源：`btc_flows` / `eth_flows`、AUM、占比序列等 | ✅ 自由编辑 |
| `assets/styles.css` | 布局与组件；颜色仅作无 JS 兜底 | ⚠️ 结构锁定 |
| `assets/metrics.js` | 纯计算（累计、回撤、相关、动量…） | ⚠️ |
| `assets/live.js` | 免费公开 API 拉取 + TTL 缓存 + 失败隔离 | ⚠️ |
| `assets/charts.js` | 主图：净流柱+累计线、占比线 | ⚠️ |
| `assets/charts2.js` | 进阶图：gauge/donut/heat/hist/spark/hbars/scatter/multi/underwater… | ⚠️ |
| `assets/panels.js` | 面板注册表：FREE 9 + DEEP 21 | ⚠️ 增删面板改这里 |
| `assets/capture.js` | 解锁表单 → 本地队列 / Supabase / Webhook / Netlify Forms | ⚠️ |
| `assets/wechat.js` | 微信等内置浏览器外链二段引导 | ⚠️ |
| `assets/app.js` | 编排：组上下文 → 渲染 → 入口条落位 | ⚠️ |
| `assets/join.js` + `join.html` | 注册缓冲页（呼吸页 → 外链） | ⚠️ |
| `netlify/functions/price.js` | BTC/ETH 多所中位数报价 | ✅ 可替换 |

设计原则：**配置 / 数据 / 逻辑三分**。改文案只动 `config.js`，改数字只动 `data.js`，改面板只动 `panels.js`。

## 数据层

### 静态（data.js）

- `btc_flows` / `eth_flows`：`["YYYY-MM-DD", 净流入百万美元]`
- `stats`：AUM、持仓枚数、ETF 首发日
- `ratio_series`：加密 vs 美股市值月度
- `bee_stock` / `issuers` / `halving` 等注脚与发行商拆分

累计净流入、最佳/最差日、连续流入天数等全部由 `metrics.js` **运行时求和**，不预存累计列。

### 实时（live.js，27 个源）

| 组 | 代表源 | 用途 |
|----|--------|------|
| 自建 | `/api/price` | Binance+Coinbase+Kraken 中位价 |
| CoinGecko | global / markets / charts / exchanges / treasury | 市值、榜单、走势、币股金库 |
| alternative.me | Fear & Greed | 情绪 |
| mempool.space | fees / tip / diff / hashrate / mempool | 链上 |
| Binance | premium / OI / LSR / taker / spot | 衍生品与现货 |
| OKX | funding / OI / ticker | 跨所 |
| Coinbase / Kraken | ticker | 价差 |
| DefiLlama | chains / ETH TVL / stables | DeFi |

机制：独立 TTL → `localStorage` 缓存 → CoinGecko 串行防 429 → 6s 超时 → 单源失败只灭一块面板。

## 面板清单

**FREE（市场全景）**  
`market` `fng` `dom` `onchain` `deriv` `spread` `defi` `exvol` `sources`

**DEEP（进阶，部分 free:true 试看）**  
`px_btc` `px_eth` `race` `streak` `cal` `mheat` `dist` `dow` `mom` `corr` `vol` `dd` `mret` `coins` `bee` `cross` `issuer` `wk` `win` `oiflow` `export`

## 增长漏斗（原站）

1. 入口条 / CTA → `join.html`（缓冲页）
2. → `config.links.entry.url`（原站为币安邀请落地）
3. 微信内：`wechat.js` 复制链接 +「在浏览器打开」
4. 进阶区：填「交易所 + UID」→ `capture.js` 本地解锁，可选上报

复刻时请在 `config.js` 改掉 `links.entry.url`、站点名与 `site_url`。

## 视觉系统

- Apple 系浅色默认：`#f5f5f7` 页底 / `#ffffff` 卡片 / `#1d1d1f` 正文
- 涨绿 `#007940` · 跌红 `#c92a2a` · 焦点蓝 `#0071e3`
- 暗色 token 完整对称；`data-theme="dark"`
- 字体：系统栈 + SF Mono 数字；8pt 栅格；字阶 11–40
- 卡片圆角 12px；分段控件仿 iOS `seg`

## 本地运行

```bash
cd etf-flow-terminal
python3 serve.py
# 打开 http://127.0.0.1:4173/
```

`serve.py` 同时提供静态资源与 `/api/price`。

## 部署 Netlify

- Publish directory：`etf-flow-terminal`（或将该目录本身作为站点根）
- Functions：`netlify/functions`
- `/api/price` → `/.netlify/functions/price`（见 `netlify.toml`）

## 与原站差异（本复刻）

1. 补齐公开可见的 `netlify/functions/price.js` 与本地 `serve.py`
2. 增加本解构文档与 README
3. **未**包含原站未公开的 `admin.html` / `tools/update-data.mjs` / 内部 md
4. 配置里的邀请链接请自行替换，避免沿用他人渠道参数
