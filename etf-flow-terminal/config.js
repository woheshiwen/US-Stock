/* ============================================================================
 * config.js — 自由编辑区(全站配置真源,改完刷新即生效)
 * ----------------------------------------------------------------------------
 * 文案、链接、配色、开关、线索通道全部在此。布局与逻辑文件不含任何可变内容。
 * 键名规则:英文小写下划线,全局唯一。逐键说明见 CONTENT.md。
 * ========================================================================== */
window.SITE_CONFIG = {

  meta: {
    version: "2.5.2",
    site_name: "ETF Flow Terminal",
    site_name_cn: "资金流向终端",
    title: "ETF Flow Terminal · BTC/ETH 机构资金流与市场全景",
    description: "比特币、以太坊现货 ETF 净流向,叠加行情、情绪、链上、衍生品、跨所价差、DeFi 与币股持仓;只呈现当前可用信息,ETF 流量更新至最近完整交易日。",
    site_url: "https://woheshiwen.github.io/US-Stock",
    og_locale: "zh_CN",
    lang_default: "zh"
  },

  flags: {
    live_quotes: true,          // false = 完全离线模式,只用 data.js 兜底值(不发任何请求)
    dark_mode_default: false,
    analytics_enabled: false,
    analytics_src: "",
    show_source_panel: false,   // 公共页面不展示内部数据源状态
    hide_unavailable_panels: true, // 无可用数据时自动隐藏对应面板
    sticky_nav: true            // 顶部分区导航
  },

  /* 免费数据层参数(源清单固化在 assets/live.js,端点说明见 DATA_SOURCES.md) */
  sources: {
    timeout_ms: 6500,
    cg_gap_ms: 1600,    // CoinGecko 串行间隔(免费额度约 30 req/min;低于 1200 容易 429)
    disabled: []        // 要关掉某个源就把它的 id 填进来,如 ["stables","kr_px"]
  },

  links: {
    /* 唯一入口:BA(内部 id 保持不变)。
     * ⚠ url 必须逐字符保持不变。
     * href 指向站内 join.html(先看完整介绍页,再去注册页);join.html 里的按钮才是外链。 */
    entry: {
      id: "binance",
      /* 换成你自己的注册/邀请落地页；留空则入口条仍渲染但无法跳转 */
      url: "",
      landing: "join.html"
    }
  },

  /* 进阶面板总开关；开启后内容对所有访客公开 */
  premium: { enabled: true },

  /* 匿名事件通道；默认全部关闭，不收集注册代码或联系方式。 */
  capture: {
    supabase_url: "",            // 如 "https://xxxx.supabase.co"
    supabase_anon_key: "",       // anon public key(表策略只给 insert)
    table: "unlock_requests",
    webhook_url: "",             // Google Apps Script / Formspree / Make / n8n / Discord
    webhook_no_cors: true,       // Apps Script 等不返回 CORS 头时保持 true
    netlify_forms: false,        // 默认不向服务器提交;用户信息只保留在自己的浏览器
    netlify_form_name: "unlock"
  },

  /* 配色 token —— 全站唯一颜色真源 */
  theme_light: {
    bg_page:       "#f5f5f7",
    bg_surface:    "#ffffff",
    bg_track:      "#e8e8ed",
    ink:           "#1d1d1f",
    ink_2:         "#6e6e73",
    ink_3:         "#a1a1a6",
    hairline:      "#d2d2d7",
    hairline_soft: "#e8e8ed",
    up:            "#007940",
    down:          "#c92a2a",
    focus:         "#0071e3",
    tip_bg:        "#1d1d1f",
    tip_ink:       "#f5f5f7"
  },
  theme_dark: {
    bg_page:       "#000000",
    bg_surface:    "#1c1c1e",
    bg_track:      "#2c2c2e",
    ink:           "#f5f5f7",
    ink_2:         "#a1a1a6",
    ink_3:         "#6e6e73",
    hairline:      "#3a3a3c",
    hairline_soft: "#2c2c2e",
    up:            "#30d158",
    down:          "#ff453a",
    focus:         "#0a84ff",
    tip_bg:        "#f5f5f7",
    tip_ink:       "#1d1d1f"
  },

  fonts: {
    sans: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Helvetica Neue', 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', sans-serif",
    mono: "ui-monospace, 'SF Mono', SFMono-Regular, Menlo, Consolas, 'Liberation Mono', monospace"
  },

  breakpoints: { sm: 640, md: 960 },

  /* 顶部分区导航:id 对应页面锚点,增删一项即增删一个入口 */
  nav: [
    { id: "flows", zh: "ETF 流向", en: "ETF flows" },
    { id: "free-zone", zh: "市场全景", en: "Markets" },
    { id: "locked", zh: "进阶数据", en: "Deep data" }
  ],

  /* ==========================================================================
   * 全部界面文案。新增语言=复制一份键值并在 app.js 顶部 LANGS 加代码(见 CONTENT.md)
   * 键前缀:m_ 模块标题 / c_ 模块角标 / l_ 字段标签 / n_ 模块脚注 / dd_ 数据字典
   * ======================================================================== */
  strings: {
    zh: {
      /* ---- 行情条 / 页头 / Hero ---- */
      ticker_total: "加密总市值", ticker_live: "实时", ticker_cached: "缓存", ticker_fallback: "离线兜底", ticker_asof: "截至",
      ticker_fng: "情绪", ticker_dom: "BTC 占比", ticker_fee: "链上费率", ticker_block: "区块高度", ticker_funding: "资金费率",
      hero_kicker: "US SPOT ETF · 机构资金流监测 · 市场全景",
      hero_h1: "机构资金,一眼看清。",
      hero_sub: "比特币、以太坊现货 ETF 的每日净流入与净流出,叠加行情、情绪、链上、衍生品、跨所与链上资金。只呈现当前可用信息;ETF 流量更新至最近完整交易日。",
      stat_btc_last: "BTC 最新单日净流", stat_btc_cum: "BTC 累计净流入",
      stat_eth_last: "ETH 最新单日净流", stat_eth_cum: "ETH 累计净流入",
      stat_aum: "净资产", stat_holdings: "持有", stat_since: "自",
      nav_top: "回到顶部",

      /* ---- 净流量主卡 ---- */
      card_btc_title: "比特币现货 ETF 净流量", card_eth_title: "以太坊现货 ETF 净流量",
      card_chip_btc: "US SPOT · 2024-01-11 上市", card_chip_eth: "US SPOT · 2024-07-23 上市",
      ctl_d: "日", ctl_w: "周", ctl_m: "月",
      ctl_bar: "柱状", ctl_line: "折线", ctl_cum: "累计",
      per_1m: "1月", per_3m: "3月", per_6m: "6月", per_1y: "1年", per_all: "全部",
      foot_window: "区间净流", foot_maxin: "最大单日流入", foot_maxout: "最大单日流出", foot_days: "交易日",
      ratio_title: "加密总市值 ÷ 美股总市值", ratio_sub: "月度,占比 %",
      ratio_now: "当前占比", ratio_peak: "区间峰值", ratio_crypto: "加密", ratio_equity: "美股",
      bee_note: "另注:美股「币股」已自成气候——上市公司把比特币搬进资产负债表,与 ETF 买的是同一个叙事。表内持仓按最新价折现,数据来自 CoinGecko 公开接口。",
      table_title: "近 6 个交易日",
      th_date: "日期", th_btc: "BTC 净流", th_eth: "ETH 净流", th_total: "合计", th_cum: "BTC 累计",

      /* ---- 公共数据区 ---- */
      free_kicker: "市场全景 · MARKET WIDE",
      free_h: "有效信息,直接呈现",
      free_sub: "行情、情绪、市值结构、链上、衍生品、跨所价差与链上资金。可用模块自动呈现,无需登录。",
      free_more: "更多市场数据",
      free_hint: "按需展开,默认收起",

      m_market: "市值前 24 币种快照", c_market: "CoinGecko · 实时",
      m_fng: "恐慌与贪婪指数", c_fng: "alternative.me · 近 120 天",
      m_dom: "市值结构", c_dom: "主导率 · 实时",
      m_onchain: "比特币链上仪表", c_onchain: "mempool.space · 实时",
      m_deriv: "永续合约:资金费率与持仓", c_deriv: "BA / OKX 公开只读",
      m_spread: "跨交易所价差", c_spread: "四所同一时点对照",
      m_defi: "链上资金:TVL 与稳定币", c_defi: "DefiLlama · 日度",
      m_exvol: "交易所现货量榜", c_exvol: "CoinGecko · 24h 折算 BTC",
      m_sources: "数据源健康", c_sources: "全部免费公开端点",

      /* ---- 进阶区 ---- */
      lock_kicker: "全部公开 · GO DEEPER",
      lock_h: "进阶数据，全部开放",
      lock_sub: "叠加、透视、纪录、热力、回撤与相关性，无需登录或代码；所有当前可用内容均已公开，按需展开即可查看。",
      free_chip: "公开数据",
      deep_more: "全部进阶数据",
      deep_hint: "全部公开 · 点开即看",

      m_px_btc: "BTC 价格 × ETF 净流量", m_px_eth: "ETH 价格 × ETF 净流量", c_px: "月度叠加",
      c_px_btc: "月度叠加 · 公开", c_px_eth: "月度叠加",
      legend_flow: "净流(右轴)", legend_px: "价格(左轴)",
      m_race: "BTC × ETH 累计净流赛马", c_race: "月度累计 · 同轴",
      legend_btc: "— BTC 实线", legend_eth: "┄ ETH 虚线",
      m_streak: "流向纪录与纪律统计", c_streak: "由全量日度序列实时计算",
      m_cal: "净流日历热力", c_cal: "近 26 周 · 周一至周五",
      m_mheat: "月度净流矩阵", c_mheat: "年 × 月 · BTC / ETH",
      m_dist: "单日净流分布与分位", c_dist: "全量样本直方图",
      m_dow: "星期效应与月份效应", c_dow: "择时口径参考",
      m_mom: "资金动量与体制判定", c_mom: "MA7 / MA30 / MA90 · Z(60)",
      m_corr: "净流 × 次日收益相关性", c_corr: "散点 · 滚动 ρ · 领先滞后",
      m_vol: "滚动年化波动率", c_vol: "30 日窗口 · BTC / ETH",
      m_dd: "价格回撤(水下图)", c_dd: "自 365 日高点起算",
      m_mret: "月度收益矩阵", c_mret: "CoinGecko 日线折算",
      m_coins: "净流折算持币", c_coins: "净流 ÷ 当日价 = 隐含 BTC",
      m_bee: "「币股」持仓透视", c_bee: "上市公司 BTC 储备 · 按最新价折现", c_bee_live: "CoinGecko 公开接口 · 实时折现",
      m_cross: "加密 × 美股 交叉口径", c_cross: "同一叙事的四条通道",
      m_issuer: "ETF 发行商拆解", c_issuer: "AUM / 费率 / 份额",
      m_wk: "周 · 月 · 季汇总", c_wk: "三档周期同屏对照",
      m_win: "多窗口摘要", c_win: "7D 至全期",
      m_oiflow: "永续持仓 × ETF 净流", c_oiflow: "杠杆钱 vs 现货钱",
      m_export: "数据导出与方法论", c_export: "口径与来源一览",

      /* ---- 字段标签 ---- */
      l_wait: "读取中…",
      l_asset: "资产", l_price: "价格", l_mcap: "市值", l_vol24: "24h 成交", l_ath: "距历史高点",
      l_total_mcap: "总市值", l_mcap_chg: "24h 变动", l_coins: "币种数",
      l_now: "当前", l_avg: "均值", l_sd: "标准差", l_range120: "120 日区间", l_fear: "极度恐慌", l_greed: "极度贪婪",
      l_stables: "稳定币", l_alts: "其他",
      l_height: "区块高度", l_fee_fast: "快速费率", l_fee_hour: "1 小时", l_hashrate: "全网算力", l_difficulty: "挖矿难度",
      l_next_adj: "下次调整", l_mempool: "内存池", l_halving: "距下次减半", l_years: "年",
      l_epoch: "本周期进度", l_blocks_left: "剩余区块", l_avg_block: "平均出块", l_retarget: "调整日",
      l_contract: "合约", l_mark: "标记价", l_funding: "资金费率", l_ann: "年化", l_basis: "基差",
      l_oi_7d: "OI 7 日变动", l_lsr: "多空账户比", l_taker: "主动买卖比",
      l_venue: "交易所", l_vs_mid: "偏离中位", l_spread: "最大价差", l_high: "最高", l_low: "最低", l_range: "区间",
      l_stable_supply: "稳定币总供给", l_stable_30d: "30 日变动",
      l_venues: "在榜所数", l_top_venue: "量榜第一", l_btc_vol: "折算量",
      l_source: "数据源", l_status: "状态", l_live: "实时", l_cached: "缓存", l_fail: "不可达", l_pending: "等待",
      l_refresh: "强制刷新", l_export: "导出 CSV", l_export_all: "导出全部 CSV", l_export_json: "导出 JSON", l_total: "合计",
      l_corr_mo: "月度相关", l_months: "月数", l_best_mo: "最强月", l_worst_mo: "最弱月",
      l_cum: "累计", l_ratio_be: "BTC/ETH 倍数", l_eth_share: "ETH 占比",
      l_inflow: "流入", l_outflow: "流出", l_dir: "方向", l_len: "长度", l_net: "净流", l_from: "起", l_to: "止",
      l_current_run: "当前连续", l_hit: "正值日占比", l_top10_share: "前十日集中度",
      l_weeks: "周数", l_legend: "图例", l_pos_months: "净流入月份",
      l_stat: "统计量", l_n_days: "样本日数", l_max: "最大", l_min: "最小",
      l_dow: "星期", l_month: "月份", l_n: "样本",
      l_regime: "体制", l_corr_all: "全样本 ρ", l_corr_30: "近 30 日 ρ", l_n_pairs: "配对样本", l_leadlag: "领先/滞后 ρ(净流领先 k 日)",
      l_ratio: "倍数", l_max_dd: "最大回撤", l_peak: "峰值日", l_trough: "谷底日", l_now_dd: "当前水下",
      l_implied_cum: "隐含累计买入", l_etf_held: "ETF 实际持有", l_of_supply: "占总供给", l_last30_coins: "近 30 日", l_avg_cost: "隐含均价",
      l_ticker: "代码", l_company: "公司", l_country: "地区", l_btc_held: "持有 BTC", l_value: "现值", l_of_21m: "占 2100 万", l_pnl: "浮动盈亏",
      l_co_total: "上市公司合计", l_marked: "折现总值", l_dominance: "占流通比", l_at_price: "折现价",
      l_fund: "基金", l_issuer: "发行商", l_share: "份额", l_fee: "费率", l_funds: "基金数", l_top3: "前三集中度",
      l_period: "期间", l_weekly: "周度", l_monthly: "月度", l_quarterly: "季度",
      l_window: "窗口", l_avg_day: "日均", l_corr_lvl: "水平相关", l_corr_chg: "增量相关", l_cum_flow: "累计净流",
      l_dataset: "数据集", l_method: "口径说明", l_off_scale: "* 不同量纲,条形仅作对照,数字为真实值",

      /* ---- 体制标签 ---- */
      rg_accel_in: "加速流入", rg_cool_in: "流入放缓", rg_accel_out: "加速流出", rg_cool_out: "流出放缓",
      rg_turn_in: "转向流入", rg_turn_out: "转向流出",

      /* ---- 模块脚注 ---- */
      n_onchain: "算力为 mempool.space 的日均口径,难度线按算力量纲缩放后同轴显示,只看形状不看绝对值。减半区块高度可在 data.js → halving 修改。",
      n_deriv: "资金费率为最近一期结算值,年化按 8 小时一结、一年 1095 次折算。正值=多头付费,通常意味着杠杆偏多。",
      n_spread: "同一时点四所报价差异反映搬砖成本与流动性深度;偏离中位以基点(bp)计,1 bp = 0.01%。",
      n_defi: "TVL 与稳定币供给是链上可用资金的粗口径。稳定币扩张往往先于风险资产走强,回落则相反。",
      n_exvol: "折算量为 CoinGecko 的标准化 24 小时 BTC 成交口径,已剔除明显刷量;绿色那一行是本站唯一入口所在的交易所。",
      n_sources: "任一源不可达只影响对应面板,其余照常显示。缓存命中期内不会重复请求,省额度也更快。",
      n_streak: "连续段以「净流方向不变」为口径,0 值中断计数;周口径为 ISO 周(周一起算)。集中度=前十大流入日占全部流入的比重。",
      n_cal: "每格为一个交易日的净流,颜色深浅按全期绝对值最大值归一。空白格为休市日。",
      n_dow: "星期与月份效应仅为历史统计,样本有限,不构成任何交易建议。",
      n_mom: "体制由 MA7 与 MA30 的相对位置判定;Z(60) 为当日净流相对过去 60 日的标准分,±2 以外为极端值。",
      n_corr: "散点为「当日净流 × 次日收益」;滚动 ρ 为 30 日皮尔逊相关。领先滞后表中 k>0 表示净流领先收益。",
      n_vol: "年化波动率 = 日收益标准差 × √365,窗口 30 日,价格取 CoinGecko 日线。",
      n_dd: "回撤以近 365 日滚动高点为基准,反映持有体验而非最终收益。",
      n_mret: "月度收益按月末价环比计算,颜色以 ±25% 为满档。",
      n_coins: "隐含买入 = 当日净流 ÷ 当日价格,是资金流的「币本位」等价换算,与发行商实际成交价存在偏差。",
      n_issuer: "AUM 与费率为公开披露的口径快照,季度更新一次即可(data.js → issuers)。",
      n_win: "各窗口互相独立计算,以最新交易日回溯。ALL 为自上市首日起全样本。",
      n_oiflow: "永续持仓代表杠杆资金,ETF 净流代表现货资金。两者同向放大通常意味着趋势加速,背离往往先出现在拐点附近。",
      n_export: "导出内容包含全部日度序列与本次拉到的实时快照,CSV 直接进 Excel,JSON 适合喂给脚本。",

      /* ---- 数据字典 ---- */
      dd_flow: "ETF 日度净流", dd_flow_d: "2026-07-21 及以前为月度汇总校准重建;2026-07-22 起为 Farside 公布的逐日 Total。",
      dd_px: "BTC / ETH 日线", dd_px_d: "365 日日线收盘,用于波动率、回撤、月度收益与相关性。",
      dd_fng: "恐慌贪婪指数", dd_fng_d: "0–100 合成情绪指标,含波动率、动量、社媒、搜索等分项。",
      dd_chain: "链上指标", dd_chain_d: "区块高度、费率、算力、难度、内存池,10 分钟级刷新。",
      dd_deriv: "衍生品指标", dd_deriv_d: "资金费率、持仓量、多空比、主动买卖比,交易所公开只读端点。",
      dd_defi: "链上资金", dd_defi_d: "以太坊 TVL 与全稳定币流通量日度序列。",
      dd_bee: "上市公司持仓", dd_bee_d: "公开申报的公司 BTC 储备,按最新价折现,含浮动盈亏。",

      /* ---- 入口区 / 页脚 / 状态 ---- */
      /* ---- 入口带(页面 1/3 与 2/3 各一次)---- */
      entry_kicker: "全球最大 CEX · 补漏!",
      entry_h: "何必东奔西走？BA 全部都有。",
      entry_sub: "现货、合约、理财、Web3 与更多市场入口，集中在一个账户里；本站数据无需注册也可直接使用。",
      entry_cta: "看看都有什么",
      entry_b_kicker: "看完数据 · 现在补漏!",
      entry_b_h: "上面的资金流向，自己账户里也能验证。",
      entry_b_sub: "如需注册链接，何必东奔西走？BA 全部都有：24×7 市场、多品类入口与统一账户体验。",
      entry_b_cta: "进入注册页",
      entry_bullets: "现货深度|合约工具|理财入口|Web3|多品类市场|第三方平台",
      entry_risk: "",

      /* ---- join.html 缓冲页(极简:一句话 + 自动跳转,不出现链接与邀请码)---- */
      jb_title: "正在打开…",
      jb_h: "何必东奔西走？BA 全部都有。",
      jb_manual: "前往 BA",
      jb_back: "返回数据面板",
      jb_disclosure: "",

      /* ---- 微信/内置浏览器二段引导(全站外链共用)---- */
      wx_h: "在浏览器里打开",
      wx_p: "微信不允许直接打开这个链接。复制之后,用浏览器打开就可以了。",
      wx_p_app: "当前应用的内置浏览器无法直接打开这个链接。复制之后,用系统浏览器打开就可以了。",
      wx_copy: "复制链接",
      wx_copied: "已复制,去浏览器粘贴",
      wx_copy_fail: "长按下方地址,选「拷贝」",
      wx_s1: "点右上角的 ···",
      wx_s2: "选「在浏览器打开」",
      wx_s3: "粘贴链接,回车",
      wx_hint: "右上角 → 在浏览器打开",
      wx_close: "关闭",
      foot_src: "ETF 数据:SoSoValue · Farside 公开汇总 | 行情与衍生指标:CoinGecko / mempool.space / BA / OKX / Coinbase / Kraken / DefiLlama / alternative.me 免费公开接口 | 截至",
      foot_note: "2026-07-21 及以前的日度序列为公开月度汇总校准重建;2026-07-22 起采用 Farside 逐日总流量。精确值仍以发行商公告为准。",
      foot_legal: "本站仅供信息参考,不构成投资建议。",
      foot_modules: "面板总数",
      err_nodata: "数据加载失败:请检查 data.js 是否存在且格式正确(见 CONTENT.md)。",
      empty: "暂无数据",
      chart_aria: "净流量图表,正值为净流入,负值为净流出",
      st_in: "最长连续流入", st_out: "最长连续流出", st_wbest: "最强单周", st_wworst: "最弱单周", d_unit: "天",
      x_etf: "ETF 合计 AUM", x_bee: "币股合计数字资产", x_combo: "ETF + 币股 合计", x_crypto: "加密总市值",
      x_note: "ETF、币股、链上现货——三条通道,买的是同一个叙事;规模最小的那条,往往是下一条主干道。前三条按「ETF+币股合计」归一作图,加密总市值量纲差 20 倍以上,只在数字里给。"
    },

    en: {
      ticker_total: "TOTAL MCAP", ticker_live: "LIVE", ticker_cached: "CACHED", ticker_fallback: "OFFLINE FALLBACK", ticker_asof: "AS OF",
      ticker_fng: "SENTIMENT", ticker_dom: "BTC DOM", ticker_fee: "FEE", ticker_block: "HEIGHT", ticker_funding: "FUNDING",
      hero_kicker: "US SPOT ETF · INSTITUTIONAL FLOW MONITOR · MARKET WIDE",
      hero_h1: "Institutional flows, at a glance.",
      hero_sub: "Daily net inflows and outflows of US spot Bitcoin & Ethereum ETFs, layered with prices, sentiment, on-chain, derivatives, cross-venue spreads and DeFi liquidity. Only available information is shown; ETF flows are updated through the latest complete session.",
      stat_btc_last: "BTC LATEST SESSION", stat_btc_cum: "BTC CUMULATIVE",
      stat_eth_last: "ETH LATEST SESSION", stat_eth_cum: "ETH CUMULATIVE",
      stat_aum: "AUM", stat_holdings: "Holdings", stat_since: "Since",
      nav_top: "Back to top",

      card_btc_title: "Bitcoin Spot ETF Net Flow", card_eth_title: "Ethereum Spot ETF Net Flow",
      card_chip_btc: "US SPOT · LISTED 2024-01-11", card_chip_eth: "US SPOT · LISTED 2024-07-23",
      ctl_d: "D", ctl_w: "W", ctl_m: "M",
      ctl_bar: "Bar", ctl_line: "Line", ctl_cum: "Cum.",
      per_1m: "1M", per_3m: "3M", per_6m: "6M", per_1y: "1Y", per_all: "ALL",
      foot_window: "Window net", foot_maxin: "Max daily in", foot_maxout: "Max daily out", foot_days: "Sessions",
      ratio_title: "Crypto Mcap ÷ US Equity Mcap", ratio_sub: "Monthly, in %",
      ratio_now: "Now", ratio_peak: "Peak", ratio_crypto: "Crypto", ratio_equity: "US equity",
      bee_note: "Footnote: crypto-treasury stocks are a force of their own — listed companies putting BTC on the balance sheet buy the same narrative the ETFs do. Holdings below are marked to the latest price, sourced from CoinGecko's public API.",
      table_title: "Last 6 Sessions",
      th_date: "DATE", th_btc: "BTC NET", th_eth: "ETH NET", th_total: "TOTAL", th_cum: "BTC CUM.",

      free_kicker: "MARKET WIDE",
      free_h: "Useful information, directly presented.",
      free_sub: "Prices, sentiment, market structure, on-chain, derivatives, cross-venue spreads and DeFi liquidity. Available modules appear automatically, with no login.",
      free_more: "More market data",
      free_hint: "Expand on demand",

      m_market: "Top 24 by Market Cap", c_market: "COINGECKO · LIVE",
      m_fng: "Fear & Greed Index", c_fng: "ALTERNATIVE.ME · 120 DAYS",
      m_dom: "Market Structure", c_dom: "DOMINANCE · LIVE",
      m_onchain: "Bitcoin On-Chain Dashboard", c_onchain: "MEMPOOL.SPACE · LIVE",
      m_deriv: "Perpetuals: Funding & Open Interest", c_deriv: "BA / OKX PUBLIC",
      m_spread: "Cross-Venue Spread", c_spread: "FOUR VENUES, ONE TIMESTAMP",
      m_defi: "On-Chain Liquidity: TVL & Stables", c_defi: "DEFILLAMA · DAILY",
      m_exvol: "Spot Volume Leaderboard", c_exvol: "COINGECKO · 24H BTC-NORMALISED",
      m_sources: "Source Health", c_sources: "ALL FREE PUBLIC ENDPOINTS",

      lock_kicker: "ALL PUBLIC · GO DEEPER",
      lock_h: "Advanced data, open to everyone",
      lock_sub: "Overlays, x-rays, records, heatmaps, drawdowns and correlations. No login or code is required; every currently available module is public and opens on demand.",
      free_chip: "PUBLIC DATA",
      deep_more: "All advanced data",
      deep_hint: "ALL PUBLIC · OPEN TO VIEW",

      m_px_btc: "BTC Price × ETF Net Flow", m_px_eth: "ETH Price × ETF Net Flow", c_px: "MONTHLY OVERLAY",
      c_px_btc: "MONTHLY OVERLAY · PUBLIC", c_px_eth: "MONTHLY OVERLAY",
      legend_flow: "Net flow (right)", legend_px: "Price (left)",
      m_race: "BTC × ETH Cumulative Race", c_race: "MONTHLY CUM. · ONE AXIS",
      legend_btc: "— BTC solid", legend_eth: "┄ ETH dashed",
      m_streak: "Streaks & Records", c_streak: "COMPUTED LIVE FROM FULL DAILY SERIES",
      m_cal: "Flow Calendar Heatmap", c_cal: "LAST 26 WEEKS · MON–FRI",
      m_mheat: "Monthly Flow Matrix", c_mheat: "YEAR × MONTH · BTC / ETH",
      m_dist: "Daily Flow Distribution", c_dist: "FULL-SAMPLE HISTOGRAM",
      m_dow: "Day-of-Week & Month Effects", c_dow: "SEASONALITY REFERENCE",
      m_mom: "Flow Momentum & Regime", c_mom: "MA7 / MA30 / MA90 · Z(60)",
      m_corr: "Flow × Next-Day Return", c_corr: "SCATTER · ROLLING ρ · LEAD/LAG",
      m_vol: "Rolling Annualised Volatility", c_vol: "30-DAY WINDOW · BTC / ETH",
      m_dd: "Price Drawdown (Underwater)", c_dd: "FROM 365-DAY HIGH",
      m_mret: "Monthly Return Matrix", c_mret: "FROM COINGECKO DAILIES",
      m_coins: "Flow Converted to Coins", c_coins: "FLOW ÷ PRICE = IMPLIED BTC",
      m_bee: "Treasury-Stock X-Ray", c_bee: "LISTED-CO BTC RESERVES · MARKED TO MARKET", c_bee_live: "COINGECKO PUBLIC API · LIVE MARK",
      m_cross: "Crypto × Equity Cross-Metrics", c_cross: "FOUR LANES, ONE NARRATIVE",
      m_issuer: "ETF Issuer Breakdown", c_issuer: "AUM / FEE / SHARE",
      m_wk: "Weekly · Monthly · Quarterly", c_wk: "THREE HORIZONS SIDE BY SIDE",
      m_win: "Multi-Window Summary", c_win: "7D TO INCEPTION",
      m_oiflow: "Perp OI × ETF Net Flow", c_oiflow: "LEVERAGED VS SPOT MONEY",
      m_export: "Export & Methodology", c_export: "DEFINITIONS AND SOURCES",

      l_wait: "Loading…",
      l_asset: "Asset", l_price: "Price", l_mcap: "Mcap", l_vol24: "24h vol", l_ath: "From ATH",
      l_total_mcap: "Total mcap", l_mcap_chg: "24h change", l_coins: "Coins",
      l_now: "Now", l_avg: "Mean", l_sd: "Std dev", l_range120: "120d range", l_fear: "Extreme fear", l_greed: "Extreme greed",
      l_stables: "Stables", l_alts: "Others",
      l_height: "Block height", l_fee_fast: "Fastest fee", l_fee_hour: "1 hour", l_hashrate: "Hashrate", l_difficulty: "Difficulty",
      l_next_adj: "Next adj.", l_mempool: "Mempool", l_halving: "To halving", l_years: "yr",
      l_epoch: "Epoch progress", l_blocks_left: "Blocks left", l_avg_block: "Avg block", l_retarget: "Retarget",
      l_contract: "Contract", l_mark: "Mark", l_funding: "Funding", l_ann: "Annualised", l_basis: "Basis",
      l_oi_7d: "OI 7d", l_lsr: "Long/short accts", l_taker: "Taker buy/sell",
      l_venue: "Venue", l_vs_mid: "vs mid", l_spread: "Max spread", l_high: "High", l_low: "Low", l_range: "range",
      l_stable_supply: "Stablecoin supply", l_stable_30d: "30d change",
      l_venues: "Venues listed", l_top_venue: "Top venue", l_btc_vol: "Volume",
      l_source: "Source", l_status: "Status", l_live: "live", l_cached: "cached", l_fail: "unreachable", l_pending: "pending",
      l_refresh: "Force refresh", l_export: "Export CSV", l_export_all: "Export all CSV", l_export_json: "Export JSON", l_total: "Total",
      l_corr_mo: "Monthly ρ", l_months: "Months", l_best_mo: "Best month", l_worst_mo: "Worst month",
      l_cum: "cumulative", l_ratio_be: "BTC/ETH ratio", l_eth_share: "ETH share",
      l_inflow: "Inflow", l_outflow: "Outflow", l_dir: "Direction", l_len: "Length", l_net: "Net", l_from: "From", l_to: "To",
      l_current_run: "Current run", l_hit: "Positive days", l_top10_share: "Top-10 concentration",
      l_weeks: "Weeks", l_legend: "Legend", l_pos_months: "Net-inflow months",
      l_stat: "Statistic", l_n_days: "Sample days", l_max: "Max", l_min: "Min",
      l_dow: "Weekday", l_month: "Month", l_n: "N",
      l_regime: "regime", l_corr_all: "Full-sample ρ", l_corr_30: "30-day ρ", l_n_pairs: "Paired obs", l_leadlag: "Lead/lag ρ (flow leads by k days)",
      l_ratio: "Ratio", l_max_dd: "Max drawdown", l_peak: "Peak", l_trough: "Trough", l_now_dd: "Current",
      l_implied_cum: "Implied cumulative", l_etf_held: "ETF actual holdings", l_of_supply: "Of supply", l_last30_coins: "Last 30d", l_avg_cost: "Implied avg price",
      l_ticker: "Ticker", l_company: "Company", l_country: "Region", l_btc_held: "BTC held", l_value: "Value", l_of_21m: "Of 21M", l_pnl: "Unrealised",
      l_co_total: "Listed-co total", l_marked: "Marked value", l_dominance: "Of circulating", l_at_price: "At price",
      l_fund: "Fund", l_issuer: "Issuer", l_share: "Share", l_fee: "Fee", l_funds: "Funds", l_top3: "Top-3 share",
      l_period: "Period", l_weekly: "Weekly", l_monthly: "Monthly", l_quarterly: "Quarterly",
      l_window: "Window", l_avg_day: "Per day", l_corr_lvl: "Level ρ", l_corr_chg: "Change ρ", l_cum_flow: "Cumulative flow",
      l_dataset: "Dataset", l_method: "Definition", l_off_scale: "* Different order of magnitude — bars are indicative, figures are exact",

      rg_accel_in: "Accelerating inflow", rg_cool_in: "Cooling inflow", rg_accel_out: "Accelerating outflow", rg_cool_out: "Cooling outflow",
      rg_turn_in: "Turning inflow", rg_turn_out: "Turning outflow",

      n_onchain: "Hashrate is mempool.space's daily average; the difficulty line is rescaled onto the same axis — read its shape, not its level. Halving block height is editable in data.js → halving.",
      n_deriv: "Funding is the latest settled rate; annualised at three settlements a day, 1,095 a year. Positive means longs pay — usually leverage leaning long.",
      n_spread: "Quote differences across four venues at one timestamp show arbitrage cost and depth. Deviation from the median is in basis points; 1 bp = 0.01%.",
      n_defi: "TVL and stablecoin supply are a rough gauge of deployable on-chain capital. Stablecoin expansion tends to lead risk assets; contraction does the reverse.",
      n_exvol: "Volume is CoinGecko's normalised 24h BTC figure with obvious wash trading stripped out. The green row is the one venue this site links to.",
      n_sources: "An unreachable source only affects its own panel. Within the cache window nothing is re-requested — cheaper on quota and faster to load.",
      n_streak: "A run is an unbroken stretch of one flow direction; zeros break the count. Weeks are ISO weeks starting Monday. Concentration is the top-10 inflow days as a share of all inflows.",
      n_cal: "Each cell is one session's net flow, shaded against the largest absolute value in the sample. Blanks are market holidays.",
      n_dow: "Weekday and month effects are historical statistics on a limited sample. Not trading advice.",
      n_mom: "Regime comes from MA7 relative to MA30. Z(60) is the day's flow as a standard score against the prior 60 sessions; beyond ±2 is extreme.",
      n_corr: "The scatter pairs each day's flow with the next day's return. Rolling ρ is a 30-day Pearson correlation. In the lead/lag table, k > 0 means flow leads returns.",
      n_vol: "Annualised volatility = standard deviation of daily returns × √365, 30-day window, prices from CoinGecko dailies.",
      n_dd: "Drawdown is measured from the rolling 365-day high — it describes the holding experience, not the final return.",
      n_mret: "Monthly returns compare month-end prices; colour saturates at ±25%.",
      n_coins: "Implied buying = daily net flow ÷ that day's price — the coin-denominated equivalent of the dollar flow. Issuers' actual fills will differ.",
      n_issuer: "AUM and fees are a snapshot of public disclosures; refreshing quarterly is enough (data.js → issuers).",
      n_win: "Each window is computed independently, counting back from the latest session. ALL covers the full sample since launch.",
      n_oiflow: "Open interest is leveraged money; ETF flow is spot money. Both rising together usually means the trend is accelerating; divergence often shows up near turns.",
      n_export: "The export carries every daily series plus the live snapshot fetched this session. CSV opens in Excel; JSON is easier to script against.",

      dd_flow: "ETF daily net flow", dd_flow_d: "History through 2026-07-21 is calibrated from monthly aggregates; from 2026-07-22 onward it uses Farside's published daily Total.",
      dd_px: "BTC / ETH dailies", dd_px_d: "365 daily closes, used for volatility, drawdown, monthly returns and correlations.",
      dd_fng: "Fear & Greed", dd_fng_d: "A 0–100 composite of volatility, momentum, social and search inputs.",
      dd_chain: "On-chain metrics", dd_chain_d: "Height, fees, hashrate, difficulty and mempool, refreshed on a ten-minute cadence.",
      dd_deriv: "Derivatives", dd_deriv_d: "Funding, open interest, long/short and taker ratios from exchange public read-only endpoints.",
      dd_defi: "On-chain liquidity", dd_defi_d: "Daily Ethereum TVL and total stablecoin circulation.",
      dd_bee: "Listed-company holdings", dd_bee_d: "Publicly filed corporate BTC reserves, marked to the latest price with unrealised P&L.",

      /* ---- Entry bands (at 1/3 and 2/3 of the page) ---- */
      entry_kicker: "THE LARGEST CEX · BULU!",
      entry_h: "Why search everywhere? BA has it all.",
      entry_sub: "Spot, derivatives, earn, Web3 and more market access in one account. The data on this site remains available without registration.",
      entry_cta: "See what is available",
      entry_b_kicker: "AFTER THE DATA · BULU NOW!",
      entry_b_h: "Verify the flows above in your own account.",
      entry_b_sub: "Why search everywhere? BA brings 24×7 markets, multiple product types and one account experience into a single entry point.",
      entry_b_cta: "Open registration",
      entry_bullets: "SPOT DEPTH|DERIVATIVES|EARN|WEB3|MULTI-ASSET|THIRD-PARTY",
      entry_risk: "",

      /* ---- join.html buffer page ---- */
      jb_title: "Opening…",
      jb_h: "Why search everywhere? BA has it all.",
      jb_manual: "Go to BA",
      jb_back: "Back to the data",
      jb_disclosure: "",

      /* ---- In-app browser guidance (shared by all external links) ---- */
      wx_h: "Open in a browser",
      wx_p: "WeChat won't open this link directly. Copy it, then open it in a browser.",
      wx_p_app: "This app's built-in browser can't open the link directly. Copy it, then open it in your browser.",
      wx_copy: "Copy link",
      wx_copied: "Copied — paste in your browser",
      wx_copy_fail: "Long-press the address below, then Copy",
      wx_s1: "Tap ··· at the top right",
      wx_s2: "Choose \"Open in Browser\"",
      wx_s3: "Paste the link and go",
      wx_hint: "Top right → Open in Browser",
      wx_close: "Close",
      foot_src: "ETF data: SoSoValue · Farside public aggregates | Markets & derived metrics: CoinGecko / mempool.space / BA / OKX / Coinbase / Kraken / DefiLlama / alternative.me free public APIs | as of",
      foot_note: "Daily history through 2026-07-21 is reconstructed from public monthly aggregates; from 2026-07-22 onward it uses Farside daily totals. Refer to issuer filings for exact figures.",
      foot_legal: "For information only. Not investment advice.",
      foot_modules: "Panels",
      err_nodata: "Failed to load data: check that data.js exists and is valid (see CONTENT.md).",
      empty: "No data",
      chart_aria: "Net flow chart. Positive = net inflow, negative = net outflow",
      st_in: "Longest inflow run", st_out: "Longest outflow run", st_wbest: "Best week", st_wworst: "Worst week", d_unit: "d",
      x_etf: "Total ETF AUM", x_bee: "Treasury-stock digital assets", x_combo: "ETF + treasury stocks", x_crypto: "Crypto market cap",
      x_note: "ETFs, treasury stocks, spot on-chain — three lanes buying the same narrative; the smallest lane tends to become the next highway. The first three bars are normalised to the ETF + treasury total; crypto market cap is more than 20× larger, so it is given as a figure only."
    }
  }
};
