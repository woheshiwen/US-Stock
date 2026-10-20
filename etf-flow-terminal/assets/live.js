/* ============================================================================
 * live.js — 锁定区(免费公开数据层,零密钥零依赖,维护勿改)
 * ----------------------------------------------------------------------------
 * 全站所有实时数据只从这里来。每个源都是「免费 + 无需注册 + 浏览器可直连」:
 *   CoinGecko public v3 · alternative.me F&G · mempool.space · Binance public
 *   OKX public v5 · Coinbase Exchange public · Kraken public · DefiLlama
 * 机制:
 *   · 每源独立 TTL,结果写 localStorage,刷新命中缓存不重复请求(省额度)
 *   · CoinGecko 组串行 + 间隔(免费额度 ~30 req/min),其余并行
 *   · 6s 超时 + 单源失败隔离,任一源挂掉只影响该面板,页面照常可用
 *   · 每源三态:live(本次拉到)/ cached(用了本地缓存)/ fail(拉不到,走 data.js 兜底)
 * 新增源:在 SRC 里加一条(url + parse + ttl + group),面板层用 L.get("id") 取。
 * 全部端点、额度与兜底策略见 DATA_SOURCES.md。
 * ========================================================================== */
window.FlowLive = (function () {
  "use strict";
  var C = window.SITE_CONFIG || {}, SC = (C.sources || {});
  /* v2 立即淘汰旧版保存的静态报价缓存。 */
  var PFX = "flow_c2_", TO = SC.timeout_ms || 6500;
  var store = {}, status = {}, subs = [], inflight = 0;

  function ls(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function lsSet(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  function now() { return Date.now(); }
  function num(v) { var n = parseFloat(v); return isNaN(n) ? null : n; }
  function iso(ms) { return new Date(ms).toISOString().slice(0, 10); }
  /* [ms, val] 数组 → [["YYYY-MM-DD", val]],按日去重(留当日最后一笔) */
  function toDaily(pairs, idx) {
    var m = new Map(), i;
    for (i = 0; i < pairs.length; i++) m.set(iso(pairs[i][0]), num(pairs[i][idx == null ? 1 : idx]));
    return Array.from(m.entries());
  }

  /* ======================= 源注册表 ======================= */
  var CG = "https://api.coingecko.com/api/v3";
  var IDS = "bitcoin,ethereum,solana,ripple,binancecoin,dogecoin";
  var SRC = {
    /* ---- CoinGecko(串行组) ---- */
    /* GitHub Pages 无 /api/price 后端:直接用 CoinGecko(浏览器 CORS 可用)。
       本地/Netlify 仍可用 serve.py 或 functions/price.js 做多所聚合。 */
    price: {
      g: "cg", ttl: 3e4, maxAge: 3e5, retry: 1,
      url: CG + "/simple/price?ids=bitcoin,ethereum&vs_currencies=usd&include_24hr_change=true",
      parse: function (j) {
        var out = {}, row, id, map = { bitcoin: "bitcoin", ethereum: "ethereum" };
        for (id in map) {
          row = j && j[id];
          if (row && isFinite(+row.usd) && +row.usd > 0) out[map[id]] = {
            px: +row.usd,
            chg: row.usd_24h_change == null || !isFinite(+row.usd_24h_change) ? null : +row.usd_24h_change,
            sources: ["CoinGecko"],
            confidence: "single",
            asOf: null
          };
        }
        if (!out.bitcoin && !out.ethereum) return null;
        return out;
      }
    },
    global: {
      g: "cg", ttl: 12e4, retry: 1, url: CG + "/global",
      parse: function (j) {
        var d = j.data || {};
        return {
          mcap: (d.total_market_cap || {}).usd || 0,
          vol: (d.total_volume || {}).usd || 0,
          chg: d.market_cap_change_percentage_24h_usd || 0,
          dom: d.market_cap_percentage || {},
          coins: d.active_cryptocurrencies || 0,
          markets: d.markets || 0
        };
      }
    },
    markets: {
      g: "cg", ttl: 3e5, retry: 1,
      url: CG + "/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=24&page=1&sparkline=true&price_change_percentage=1h%2C24h%2C7d%2C30d",
      parse: function (j) {
        return (j || []).map(function (c) {
          return {
            sym: (c.symbol || "").toUpperCase(), name: c.name, px: c.current_price, mcap: c.market_cap,
            vol: c.total_volume, rank: c.market_cap_rank,
            h1: c.price_change_percentage_1h_in_currency, d1: c.price_change_percentage_24h_in_currency,
            d7: c.price_change_percentage_7d_in_currency, d30: c.price_change_percentage_30d_in_currency,
            ath: c.ath_change_percentage, spark: ((c.sparkline_in_7d || {}).price || []).filter(function (_, i) { return i % 6 === 0; })
          };
        });
      }
    },
    btc_chart: {
      g: "cg", ttl: 9e5, retry: 1, to: 11000, url: CG + "/coins/bitcoin/market_chart?vs_currency=usd&days=365&interval=daily",
      parse: function (j) { return { price: toDaily(j.prices || []), vol: toDaily(j.total_volumes || []), mcap: toDaily(j.market_caps || []) }; }
    },
    eth_chart: {
      g: "cg", ttl: 9e5, retry: 1, to: 11000, url: CG + "/coins/ethereum/market_chart?vs_currency=usd&days=365&interval=daily",
      parse: function (j) { return { price: toDaily(j.prices || []), vol: toDaily(j.total_volumes || []), mcap: toDaily(j.market_caps || []) }; }
    },
    exchanges: {
      g: "cg", ttl: 9e5, retry: 2, url: CG + "/exchanges?per_page=15&page=1",
      parse: function (j) {
        return (j || []).map(function (e) {
          return { id: e.id, name: e.name, btcVol: e.trade_volume_24h_btc_normalized || e.trade_volume_24h_btc || 0, trust: e.trust_score, rank: e.trust_score_rank, country: e.country, year: e.year_established };
        });
      }
    },
    treasury: {
      g: "cg", ttl: 216e5, retry: 2, url: CG + "/companies/public_treasury/bitcoin",
      parse: function (j) {
        return {
          total: j.total_holdings || 0, valueUsd: j.total_value_usd || 0, dom: j.market_cap_dominance || 0,
          rows: (j.companies || []).map(function (c) {
            return { sym: c.symbol, name: c.name, btc: c.total_holdings, entry: c.total_entry_value_usd, val: c.total_current_value_usd, country: c.country, pct: c.percentage_of_total_supply };
          })
        };
      }
    },
    /* ---- 情绪 ---- */
    fng: {
      g: "x", ttl: 18e5, url: "https://api.alternative.me/fng/?limit=120&format=json",
      parse: function (j) {
        var d = (j.data || []).map(function (x) { return [iso(+x.timestamp * 1000), +x.value, x.value_classification]; }).reverse();
        return { now: d.length ? d[d.length - 1] : null, series: d.map(function (x) { return [x[0], x[1]]; }) };
      }
    },
    /* ---- BTC 链上(mempool.space) ---- */
    fees: { g: "x", ttl: 3e5, url: "https://mempool.space/api/v1/fees/recommended", parse: function (j) { return j; } },
    tip: { g: "x", ttl: 3e5, url: "https://mempool.space/api/blocks/tip/height", parse: function (j) { return { height: +j }; } },
    diff: {
      g: "x", ttl: 6e5, url: "https://mempool.space/api/v1/difficulty-adjustment",
      parse: function (j) { return { progress: j.progressPercent, change: j.difficultyChange, remain: j.remainingBlocks, eta: j.estimatedRetargetDate, avgBlock: j.timeAvg }; }
    },
    hashrate: {
      g: "x", ttl: 36e5, url: "https://mempool.space/api/v1/mining/hashrate/1y",
      parse: function (j) {
        return {
          nowHash: j.currentHashrate, nowDiff: j.currentDifficulty,
          series: (j.hashrates || []).map(function (h) { return [iso(h.timestamp * 1000), h.avgHashrate / 1e18]; }),
          diffSeries: (j.difficulty || []).map(function (d) { return [iso(d.time * 1000), d.difficulty / 1e12]; })
        };
      }
    },
    mempool: {
      g: "x", ttl: 3e5, url: "https://mempool.space/api/mempool",
      parse: function (j) { return { count: j.count, vsize: j.vsize, fees: j.total_fee }; }
    },
    /* ---- 衍生品(Binance / OKX 公开只读) ---- */
    bn_prem: {
      g: "x", ttl: 12e4, url: "https://fapi.binance.com/fapi/v1/premiumIndex",
      parse: function (j) {
        var out = {}, keep = { BTCUSDT: 1, ETHUSDT: 1, SOLUSDT: 1, XRPUSDT: 1, DOGEUSDT: 1, BNBUSDT: 1 }, i;
        for (i = 0; i < j.length; i++) if (keep[j[i].symbol])
          out[j[i].symbol] = { mark: num(j[i].markPrice), index: num(j[i].indexPrice), fr: num(j[i].lastFundingRate) * 100, next: j[i].nextFundingTime };
        return out;
      }
    },
    bn_oi: {
      g: "x", ttl: 9e5, url: "https://fapi.binance.com/futures/data/openInterestHist?symbol=BTCUSDT&period=1d&limit=120",
      parse: function (j) { return (j || []).map(function (r) { return [iso(r.timestamp), num(r.sumOpenInterestValue) / 1e6]; }); }
    },
    bn_oi_eth: {
      g: "x", ttl: 9e5, url: "https://fapi.binance.com/futures/data/openInterestHist?symbol=ETHUSDT&period=1d&limit=120",
      parse: function (j) { return (j || []).map(function (r) { return [iso(r.timestamp), num(r.sumOpenInterestValue) / 1e6]; }); }
    },
    bn_lsr: {
      g: "x", ttl: 9e5, url: "https://fapi.binance.com/futures/data/globalLongShortAccountRatio?symbol=BTCUSDT&period=1d&limit=90",
      parse: function (j) { return (j || []).map(function (r) { return [iso(r.timestamp), num(r.longShortRatio)]; }); }
    },
    bn_taker: {
      g: "x", ttl: 9e5, url: "https://fapi.binance.com/futures/data/takerlongshortRatio?symbol=BTCUSDT&period=1d&limit=90",
      parse: function (j) { return (j || []).map(function (r) { return [iso(r.timestamp), num(r.buySellRatio)]; }); }
    },
    bn_spot: {
      g: "x", ttl: 12e4, url: 'https://api.binance.com/api/v3/ticker/24hr?symbols=%5B%22BTCUSDT%22%2C%22ETHUSDT%22%5D',
      parse: function (j) {
        var out = {}, i;
        for (i = 0; i < j.length; i++) out[j[i].symbol] = { px: num(j[i].lastPrice), chg: num(j[i].priceChangePercent), hi: num(j[i].highPrice), lo: num(j[i].lowPrice), qv: num(j[i].quoteVolume), n: +j[i].count };
        return out;
      }
    },
    okx_fr: {
      g: "x", ttl: 12e4, url: "https://www.okx.com/api/v5/public/funding-rate?instId=BTC-USDT-SWAP",
      parse: function (j) { var d = (j.data || [])[0] || {}; return { fr: num(d.fundingRate) * 100, next: num(d.nextFundingRate) * 100, t: d.fundingTime }; }
    },
    okx_oi: {
      g: "x", ttl: 3e5, url: "https://www.okx.com/api/v5/public/open-interest?instType=SWAP&instId=BTC-USDT-SWAP",
      parse: function (j) { var d = (j.data || [])[0] || {}; return { oiCcy: num(d.oiCcy), oi: num(d.oi) }; }
    },
    okx_px: {
      g: "x", ttl: 12e4, url: "https://www.okx.com/api/v5/market/ticker?instId=BTC-USDT",
      parse: function (j) { var d = (j.data || [])[0] || {}; return { px: num(d.last), vol24: num(d.volCcy24h) }; }
    },
    cb_px: {
      g: "x", ttl: 12e4, url: "https://api.exchange.coinbase.com/products/BTC-USD/ticker",
      parse: function (j) { return { px: num(j.price), vol: num(j.volume), bid: num(j.bid), ask: num(j.ask) }; }
    },
    kr_px: {
      g: "x", ttl: 12e4, url: "https://api.kraken.com/0/public/Ticker?pair=XBTUSD",
      parse: function (j) {
        var k = Object.keys(j.result || {})[0]; if (!k) return null;
        var d = j.result[k];
        return { px: num(d.c[0]), vol: num(d.v[1]), bid: num(d.b[0]), ask: num(d.a[0]) };
      }
    },
    /* ---- 链上资金(DefiLlama) ---- */
    chains: {
      g: "x", ttl: 18e5, url: "https://api.llama.fi/v2/chains",
      parse: function (j) {
        return (j || []).sort(function (a, b) { return b.tvl - a.tvl; }).slice(0, 12)
          .map(function (c) { return { name: c.name, tvl: c.tvl, sym: c.tokenSymbol }; });
      }
    },
    eth_tvl: {
      g: "x", ttl: 36e5, to: 14000, url: "https://api.llama.fi/v2/historicalChainTvl/Ethereum",
      parse: function (j) { return (j || []).slice(-400).map(function (r) { return [iso(r.date * 1000), r.tvl / 1e9]; }); }
    },
    stables: {
      g: "x", ttl: 36e5, to: 14000, url: "https://stablecoins.llama.fi/stablecoincharts/all",
      parse: function (j) {
        return (j || []).slice(-400).map(function (r) {
          var p = r.totalCirculatingUSD || {}, s = 0, k;
          for (k in p) s += p[k];
          return [iso(+r.date * 1000), s / 1e9];
        });
      }
    }
  };

  /* ======================= 缓存 / 状态 ======================= */
  function readCache(id) {
    var raw = ls(PFX + id);
    if (!raw) return null;
    try {
      var o = JSON.parse(raw);
      if (!o || typeof o.t !== "number") return null;
      /* 现价绝不无限期降级:超过 maxAge 就当作不可用。 */
      if (SRC[id] && SRC[id].maxAge && now() - o.t > SRC[id].maxAge) {
        try { localStorage.removeItem(PFX + id); } catch (e2) {}
        return null;
      }
      return o;
    } catch (e) { return null; }
  }
  function emit() { for (var i = 0; i < subs.length; i++) try { subs[i](); } catch (e) {} }

  function pull(id, attempt) {
    var s = SRC[id], c = readCache(id);
    if (c) { store[id] = c.d; status[id] = "cached"; }
    if (c && now() - c.t < s.ttl) return Promise.resolve(false);   /* TTL 内命中,不打网络 */
    if (!window.fetch) return Promise.resolve(false);
    var ctl = new AbortController(), timer = setTimeout(function () { ctl.abort(); }, s.to || TO);
    inflight++;
    return fetch(s.url, { signal: ctl.signal, headers: { accept: "application/json" }, mode: "cors", cache: "no-store" })
      .then(function (r) { return r.ok ? r.json() : Promise.reject(r.status); })
      .then(function (j) {
        var d = s.parse(j);
        if (d == null) throw 0;
        store[id] = d; status[id] = "live";
        lsSet(PFX + id, JSON.stringify({ t: now(), d: d }));
        return true;
      })
      .catch(function () {
        /* 免费额度被限流(CoinGecko 429)或临时超时:退避后再试一次 */
        if ((s.retry || 0) > (attempt || 0)) {
          return new Promise(function (res) { setTimeout(res, 2200 + 1500 * (attempt || 0)); })
            .then(function () { clearTimeout(timer); inflight--; return pull(id, (attempt || 0) + 1); })
            .then(function (r) { inflight++; return r; });
        }
        if (!store[id]) status[id] = "fail";
        return false;
      })
      .then(function (ok) { clearTimeout(timer); inflight--; return ok; });
  }

  /* CoinGecko 串行拉取,避免免费额度 429 */
  function chain(ids, gap) {
    return ids.reduce(function (p, id) {
      return p.then(function () {
        return pull(id).then(function (fresh) {
          if (fresh) emit();
          return new Promise(function (res) { setTimeout(res, fresh ? gap : 0); });
        });
      });
    }, Promise.resolve());
  }

  function boot() {
    var enabled = SC.disabled || [];
    var ids = Object.keys(SRC).filter(function (id) { return enabled.indexOf(id) < 0; });
    ids.forEach(function (id) { var c = readCache(id); if (c) { store[id] = c.d; status[id] = "cached"; } else status[id] = "pending"; });
    emit();
    if (C.flags && C.flags.live_quotes === false) return Promise.resolve();
    var cg = ids.filter(function (id) { return SRC[id].g === "cg"; });
    var rest = ids.filter(function (id) { return SRC[id].g !== "cg"; });
    var jobs = [chain(cg, SC.cg_gap_ms || 1600)];
    rest.forEach(function (id) { jobs.push(pull(id).then(function (f) { if (f) emit(); })); });
    return Promise.all(jobs).then(emit);
  }

  return {
    boot: boot,
    get: function (id) { return store[id]; },
    status: function (id) { return status[id] || "pending"; },
    all: function () { return store; },
    ids: function () { return Object.keys(SRC); },
    /* 汇总面板用:live / cached / fail 计数 */
    health: function () {
      var h = { live: 0, cached: 0, fail: 0, pending: 0, total: 0 }, id;
      for (id in SRC) { h.total++; h[status[id] || "pending"]++; }
      return h;
    },
    onUpdate: function (cb) { subs.push(cb); },
    refresh: function (id) {
      var wipe = id ? [id] : Object.keys(SRC);
      wipe.forEach(function (k) { try { localStorage.removeItem(PFX + k); } catch (e) {} });
      return boot();
    },
    busy: function () { return inflight; },
    endpoints: function () {
      return Object.keys(SRC).map(function (id) { return { id: id, url: SRC[id].url, ttl: SRC[id].ttl, group: SRC[id].g, status: status[id] }; });
    }
  };
})();
