# ETF Flow Terminal（本地复刻）

结构与交互复刻自公开站点 [kzgflow.com](https://www.kzgflow.com/)。完整架构说明见 [DECONSTRUCTION.md](./DECONSTRUCTION.md)。

## 快速开始

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
