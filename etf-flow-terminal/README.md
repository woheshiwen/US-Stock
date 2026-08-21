# ETF Flow Terminal（本地复刻）

结构与交互复刻自公开站点 [kzgflow.com](https://www.kzgflow.com/)。完整架构说明见 [DECONSTRUCTION.md](./DECONSTRUCTION.md)。

## 在线访问（GitHub Pages）

部署后打开：

**https://woheshiwen.github.io/US-Stock/**

若打不开：仓库 [Settings → Pages](https://github.com/woheshiwen/US-Stock/settings/pages) → Build and deployment → Source 选 **Deploy from a branch**，Branch 选 **`gh-pages` / `(root)`** → Save。  
之后每次更新本目录或合并 PR，Actions 工作流 `Deploy ETF Flow Terminal` 会自动刷新站点。

源码浏览：<https://github.com/woheshiwen/US-Stock/tree/cursor/kzgflow-clone-9437/etf-flow-terminal>

## 快速开始（本地）

```bash
python3 serve.py
```

浏览器打开 <http://127.0.0.1:4173/>。

## 你最常改的两个文件

| 文件 | 改什么 |
|------|--------|
| `config.js` | 站名、文案、配色、中英、入口 URL、暗色默认、线索通道 |
| `data.js` | ETF 日度净流、AUM、`as_of` 日期 |

其余 `assets/*.js` 为渲染与计算逻辑，按文件头注释维护。

## 目录

```
index.html / join.html / 404.html
config.js / data.js
assets/          # 样式 + 图表 + 面板 + 实时层
netlify/functions/price.js
serve.py         # 本地静态 + /api/price
netlify.toml
```
