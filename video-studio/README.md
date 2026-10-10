# Video Studio

口播视频动效生产线 · 预览台（第 0 步地基）

## 当前进度

- ✅ 三栏 Studio：左侧卡片列表 / 中间 1920×1080 画布 / 右侧参数面板
- ✅ 3 张练手卡：核心数字滚动、左右对比条、金句逐行揭示
- ✅ `registry.ts` 注册表 — 列表与参数面板自动生成
- ✅ 铁律：动画仅 CSS transition + `requestAnimationFrame`（禁 setInterval / 真随机 / 一次性关键帧）
- ⏳ 第 1 步：品牌主题系统（skin / style 令牌）
- ⏳ 第 2+ 步：量产卡、垫视频、时间轴、透明导出、AI Skill…

## 启动

```bash
cd video-studio
npm install
npm run dev
```

打开终端提示的本地地址即可调参预览。

## 架构（施工图 L1–L3）

| 层 | 职责 | 本步 |
|---|---|---|
| L1 卡片库 | React 组件 + registry | ✅ 起步 3 张 |
| L2 编排 | overlay JSON + AI Skill | 未做 |
| L3 工作台+导出 | Studio + 透明 MOV | ✅ 预览台 / 导出未做 |

## 仓库说明

理想形态为独立仓库 `woheshiwen/video-studio`。当前 Cloud Agent 绑定在 `ben`，代码暂放本目录；独立仓库建好后可整体迁出。
