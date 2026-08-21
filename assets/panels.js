/* ============================================================================
 * panels.js — 锁定区(全部数据模块的渲染,维护勿改)
 * ----------------------------------------------------------------------------
 * 模块注册表 = 全站数据版图。每条:{ id, zone, w, html(x), mount(x) }
 *   zone "free" 公共区(9 组,人人可见) / "deep" 进阶区(21 组,填交易所+UID 后清晰)
 *   w    "full" 整行 / "half" 半行(≤960px 自动单列)
 * 所有文案取 x.t(key)(真源 config.js strings),所有实时数据取 x.L.get(源 id),
 * 所有派生指标取 x.M(metrics.js)。新增模块只加一条注册项,不动其他文件。
 * 每组口径与数据源见 METRICS.md / DATA_SOURCES.md。
 * ========================================================================== */
window.FlowPanels = (function () {
  "use strict";
  var C2 = window.FlowCharts2, M = window.FlowMetrics;

  /* ================= 格式化(单位:M=百万美元) ================= */
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  function fmtM(v, noSign, dp) {
    if (v == null || isNaN(v)) return "—";
    var a = Math.abs(v), s, u;
    if (a >= 1e6) { s = (a / 1e6).toFixed(dp == null ? 2 : dp); u = "T"; }
    else if (a >= 1000) { s = (a / 1000).toFixed(dp == null ? 2 : dp).replace(/\.?0+$/, ""); u = "B"; }
    else { s = a.toFixed(a < 10 ? 1 : 0); u = "M"; }
    return (v < 0 ? "-" : noSign ? "" : "+") + "$" + s + u;
  }
  function fmtUsd(v, dp) {
    if (v == null || isNaN(v)) return "—";
    var a = Math.abs(v);
    if (a >= 1e12) return "$" + (v / 1e12).toFixed(dp == null ? 2 : dp) + "T";
    if (a >= 1e9) return "$" + (v / 1e9).toFixed(dp == null ? 2 : dp) + "B";
    if (a >= 1e6) return "$" + (v / 1e6).toFixed(dp == null ? 1 : dp) + "M";
    if (a >= 1e3) return "$" + (v / 1e3).toFixed(1) + "K";
    return "$" + v.toFixed(a < 10 ? 2 : 0);
  }
  function fmtPx(v) { return v == null || isNaN(v) ? "—" : "$" + (v >= 1000 ? Math.round(v).toLocaleString("en-US") : v.toFixed(v < 1 ? 4 : 2)); }
  function fmtPct(v, dp) { return v == null || isNaN(v) ? "—" : (v > 0 ? "+" : "") + v.toFixed(dp == null ? 2 : dp) + "%"; }
  function fmtP(v, dp) { return v == null || isNaN(v) ? "—" : v.toFixed(dp == null ? 1 : dp) + "%"; }
  function fmtInt(v) { return v == null || isNaN(v) ? "—" : Math.round(v).toLocaleString("en-US"); }
  function fmtN(v, dp) { return v == null || isNaN(v) ? "—" : v.toFixed(dp == null ? 2 : dp); }
  function cls(v) { return v == null || isNaN(v) ? "" : v >= 0 ? "up" : "down"; }
  function ago(iso) { return iso ? String(iso).slice(0, 10) : "—"; }

  /* ================= 结构化片段 ================= */
  function kv(k, v, c) { return '<span class="kv"><span class="k">' + esc(k) + '</span><span class="v ' + (c || "") + '">' + v + "</span></span>"; }
  function foot(items) { return '<div class="card-foot">' + items.join("") + "</div>"; }
  function head(title, chip, right) {
    return '<div class="card-head"><span class="card-title">' + esc(title) + "</span>" +
      (chip ? '<span class="chip">' + esc(chip) + "</span>" : "") + (right || "") + "</div>";
  }
  function tbl(cols, rows, o) {
    o = o || {};
    var h = '<div class="table-scroll' + (o.tall ? " tall" : "") + '"><table><thead><tr>';
    for (var i = 0; i < cols.length; i++) h += '<th scope="col">' + esc(cols[i]) + "</th>";
    h += "</tr></thead><tbody>";
    for (i = 0; i < rows.length; i++) h += "<tr>" + rows[i] + "</tr>";
    return h + "</tbody></table></div>" + (rows.length ? "" : '<div class="state mini">—</div>');
  }
  function td(v, c) { return '<td class="' + (c || "") + '">' + v + "</td>"; }
  function tiles(items) {
    var h = '<div class="tiles">';
    for (var i = 0; i < items.length; i++)
      h += '<div class="tile"><div class="tl">' + esc(items[i].k) + '</div><div class="tv ' + (items[i].c || "") + '">' + items[i].v + "</div>" +
        (items[i].s ? '<div class="ts">' + esc(items[i].s) + "</div>" : "") + "</div>";
    return h + "</div>";
  }
  function note(txt) { return '<div class="bee">' + esc(txt) + "</div>"; }
  function box(id, cls2) { return '<div class="chart-box ' + (cls2 || "") + '" id="' + id + '"></div>'; }
  function empty(x) { return '<div class="state mini" data-panel-empty="1">' + esc(x.t("l_wait")) + "</div>"; }
  function venueName(name) { return name === "Binance" ? "BA" : name; }

  /* 图表实例登记,重渲染前统一销毁 */
  function reg(x, id, inst) { if (x.ch[id]) try { x.ch[id].destroy(); } catch (e) {} x.ch[id] = inst; }
  function el(id) { return document.getElementById(id); }

  var DOW_ZH = ["一", "二", "三", "四", "五", "六", "日"], DOW_EN = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  var MON = ["01", "02", "03", "04", "05", "06", "07", "08", "09", "10", "11", "12"];

  /* ========================================================================
   * 公共区(9 组)
   * ====================================================================== */
  var FREE = [
    /* ---- F1 市场快照:市值前 24 币 ---- */
    {
      id: "market", zone: "free", w: "full",
      html: function (x) {
        var m = x.L.get("markets");
        if (!m || !m.length) return head(x.t("m_market"), x.t("c_market")) + empty(x);
        var rows = m.map(function (c) {
          return td("<b>" + esc(c.sym) + "</b> <span class=\"dim\">" + esc(c.name) + "</span>") +
            td(fmtPx(c.px)) + td(fmtPct(c.h1), cls(c.h1)) + td(fmtPct(c.d1), cls(c.d1)) +
            td(fmtPct(c.d7), cls(c.d7)) + td(fmtPct(c.d30), cls(c.d30)) +
            td(fmtUsd(c.mcap)) + td(fmtUsd(c.vol)) + td(fmtPct(c.ath), cls(c.ath)) +
            td(C2.spark(c.spark, { w: 68, h: 18 }));
        });
        var g = x.L.get("global");
        return head(x.t("m_market"), x.t("c_market")) +
          tbl([x.t("l_asset"), x.t("l_price"), "1H", "24H", "7D", "30D", x.t("l_mcap"), x.t("l_vol24"), x.t("l_ath"), "7D"], rows, { tall: true }) +
          foot([kv(x.t("l_total_mcap"), fmtUsd(g && g.mcap), ""), kv(x.t("l_vol24"), fmtUsd(g && g.vol), ""),
          kv(x.t("l_mcap_chg"), fmtPct(g && g.chg), cls(g && g.chg)), kv(x.t("l_coins"), fmtInt(g && g.coins), "")]);
      }
    },
    /* ---- F2 情绪:恐慌贪婪 ---- */
    {
      id: "fng", zone: "free", w: "half",
      html: function (x) {
        var f = x.L.get("fng");
        if (!f || !f.now) return head(x.t("m_fng"), x.t("c_fng")) + empty(x);
        var s = f.series, v = f.now[1];
        var w7 = s.slice(-7), w30 = s.slice(-30);
        return head(x.t("m_fng"), x.t("c_fng")) + box("bx-fng") + box("bx-fng-strip", "strip-box") +
          foot([kv(x.t("l_now"), v + " · " + esc(f.now[2]), ""), kv("7D " + x.t("l_avg"), fmtN(M.mean(M.vals(w7)), 0), ""),
          kv("30D " + x.t("l_avg"), fmtN(M.mean(M.vals(w30)), 0), ""), kv(x.t("l_range120"), M.min(M.vals(s)) + "–" + M.max(M.vals(s)), "")]);
      },
      mount: function (x) {
        var f = x.L.get("fng"); if (!f || !f.now || !el("bx-fng")) return;
        reg(x, "fng", C2.mountGauge(el("bx-fng"), { value: f.now[1], min: 0, max: 100, label: f.now[2], minLabel: x.t("l_fear"), maxLabel: x.t("l_greed"), aria: x.t("m_fng") }));
        C2.strip(el("bx-fng-strip"), f.series.slice(-120), {
          aria: x.t("m_fng"), color: function (v) {
            return "color-mix(in oklab, " + (v >= 50 ? "var(--up)" : "var(--down)") + " " + (Math.abs(v - 50) / 50 * 80 + 12).toFixed(0) + "%, var(--bg-surface))";
          }
        });
      }
    },
    /* ---- F3 市值结构 ---- */
    {
      id: "dom", zone: "free", w: "half",
      html: function (x) {
        var g = x.L.get("global");
        if (!g || !g.dom) return head(x.t("m_dom"), x.t("c_dom")) + empty(x);
        var d = g.dom, btc = d.btc || 0, eth = d.eth || 0, st = (d.usdt || 0) + (d.usdc || 0);
        return head(x.t("m_dom"), x.t("c_dom")) +
          '<div class="split"><div>' + box("bx-dom") + '</div><div>' + box("bx-dom-b", "flat") + "</div></div>" +
          foot([kv("BTC", fmtP(btc), ""), kv("ETH", fmtP(eth), ""), kv(x.t("l_stables"), fmtP(st), ""), kv(x.t("l_alts"), fmtP(100 - btc - eth - st), "")]);
      },
      mount: function (x) {
        var g = x.L.get("global"); if (!g || !g.dom || !el("bx-dom")) return;
        var d = g.dom, btc = d.btc || 0, eth = d.eth || 0, st = (d.usdt || 0) + (d.usdc || 0), rest = Math.max(0, 100 - btc - eth - st);
        reg(x, "dom", C2.mountDonut(el("bx-dom"), [
          { k: "BTC", v: btc, c: "var(--ink)" }, { k: "ETH", v: eth, c: "color-mix(in oklab, var(--ink) 55%, var(--bg-surface))" },
          { k: x.t("l_stables"), v: st, c: "color-mix(in oklab, var(--up) 45%, var(--bg-surface))" },
          { k: x.t("l_alts"), v: rest, c: "var(--bg-track)" }
        ], { centerTop: fmtP(btc, 1), centerSub: "BTC", aria: x.t("m_dom") }));
        C2.bullet(el("bx-dom-b"), [
          { k: "BTC", v: fmtP(btc), pct: btc },
          { k: "ETH", v: fmtP(eth), pct: eth },
          { k: x.t("l_stables"), v: fmtP(st), pct: st, c: "var(--up)" },
          { k: x.t("l_alts"), v: fmtP(rest), pct: rest, c: "var(--ink-3)" }
        ]);
      }
    },
    /* ---- F4 BTC 链上仪表 ---- */
    {
      id: "onchain", zone: "free", w: "full",
      html: function (x) {
        var f = x.L.get("fees"), tp = x.L.get("tip"), df = x.L.get("diff"), hr = x.L.get("hashrate"), mp = x.L.get("mempool");
        if (!f && !tp && !df && !hr && !mp) return head(x.t("m_onchain"), x.t("c_onchain")) + empty(x);
        var H = x.D.halving || { block: 1050000 }, h = tp ? tp.height : null;
        var toGo = h ? H.block - h : null, days = toGo ? toGo * (df && df.avgBlock ? df.avgBlock / 1000 : 600) / 86400 : null;
        return head(x.t("m_onchain"), x.t("c_onchain")) +
          tiles([
            { k: x.t("l_height"), v: h ? fmtInt(h) : "—" },
            { k: x.t("l_fee_fast"), v: f ? f.fastestFee + " <span class=\"unit\">sat/vB</span>" : "—", s: f ? x.t("l_fee_hour") + " " + f.hourFee : "" },
            { k: x.t("l_hashrate"), v: hr ? fmtN(hr.nowHash / 1e18, 0) + " <span class=\"unit\">EH/s</span>" : "—" },
            { k: x.t("l_difficulty"), v: hr ? fmtN(hr.nowDiff / 1e12, 1) + " <span class=\"unit\">T</span>" : "—", s: df ? x.t("l_next_adj") + " " + fmtPct(df.change, 1) : "" },
            { k: x.t("l_mempool"), v: mp ? fmtInt(mp.count) + " <span class=\"unit\">tx</span>" : "—", s: mp ? fmtN(mp.vsize / 1e6, 1) + " vMB" : "" },
            { k: x.t("l_halving"), v: toGo ? fmtInt(toGo) + " <span class=\"unit\">blk</span>" : "—", s: days ? "≈" + fmtN(days / 365, 2) + " " + x.t("l_years") : "" }
          ]) + box("bx-hash") +
          foot([kv(x.t("l_epoch"), df ? fmtP(df.progress) : "—", ""), kv(x.t("l_blocks_left"), df ? fmtInt(df.remain) : "—", ""),
          kv(x.t("l_avg_block"), df ? fmtN(df.avgBlock / 6e4, 1) + " min" : "—", ""), kv(x.t("l_retarget"), df ? ago(df.eta) : "—", "")]) +
          note(x.t("n_onchain"));
      },
      mount: function (x) {
        var hr = x.L.get("hashrate"); if (!hr || !hr.series.length || !el("bx-hash")) return;
        reg(x, "hash", C2.mountMulti(el("bx-hash"), [
          { label: "EH/s", rows: hr.series, color: "var(--ink)" },
          { label: "Diff T", rows: hr.diffSeries.map(function (r) { return [r[0], r[1] * (hr.series[hr.series.length - 1][1] / (hr.diffSeries[hr.diffSeries.length - 1][1] || 1))]; }), dash: "5 3", opacity: .5 }
        ], { height: 200, zeroBase: true, fmtY: function (v) { return Math.round(v); }, fmtTip: function (v) { return Math.round(v); }, aria: x.t("l_hashrate") }));
      }
    },
    /* ---- F5 衍生品 ---- */
    {
      id: "deriv", zone: "free", w: "full",
      html: function (x) {
        var p = x.L.get("bn_prem"), of = x.L.get("okx_fr"), oo = x.L.get("okx_oi"), oi = x.L.get("bn_oi"), lsr = x.L.get("bn_lsr"), tk = x.L.get("bn_taker");
        if (!p && !of && !oo && !oi && !lsr && !tk) return head(x.t("m_deriv"), x.t("c_deriv")) + empty(x);
        var rows = [];
        if (p) Object.keys(p).forEach(function (s) {
          var d = p[s], ann = d.fr * 3 * 365;
          rows.push(td("<b>" + esc(s.replace("USDT", "")) + "</b>") + td(fmtPx(d.mark)) + td(fmtN(d.fr, 4) + "%", cls(d.fr)) +
            td(fmtPct(ann, 1), cls(ann)) + td(fmtN((d.mark - d.index) / (d.index || 1) * 1e4, 1) + " bp", cls(d.mark - d.index)));
        });
        var lastOI = oi && oi.length ? oi[oi.length - 1] : null, prevOI = oi && oi.length > 8 ? oi[oi.length - 8] : null;
        return head(x.t("m_deriv"), x.t("c_deriv")) +
          '<div class="split"><div>' + tbl([x.t("l_contract"), x.t("l_mark"), x.t("l_funding"), x.t("l_ann"), x.t("l_basis")], rows) + "</div>" +
          "<div>" + box("bx-oi") + "</div></div>" +
          box("bx-lsr") +
          foot([
            kv("OKX " + x.t("l_funding"), of ? fmtN(of.fr, 4) + "%" : "—", of ? cls(of.fr) : ""),
            kv("OKX OI", oo ? fmtInt(oo.oiCcy) + " BTC" : "—", ""),
            kv("BA OI", lastOI ? fmtM(lastOI[1], true, 2) : "—", ""),
            kv(x.t("l_oi_7d"), lastOI && prevOI ? fmtPct((lastOI[1] / prevOI[1] - 1) * 100, 1) : "—", lastOI && prevOI ? cls(lastOI[1] - prevOI[1]) : ""),
            kv(x.t("l_lsr"), lsr && lsr.length ? fmtN(lsr[lsr.length - 1][1]) : "—", ""),
            kv(x.t("l_taker"), tk && tk.length ? fmtN(tk[tk.length - 1][1]) : "—", "")
          ]) + note(x.t("n_deriv"));
      },
      mount: function (x) {
        var oi = x.L.get("bn_oi"), oie = x.L.get("bn_oi_eth"), lsr = x.L.get("bn_lsr"), tk = x.L.get("bn_taker");
        if (oi && oi.length && el("bx-oi")) reg(x, "oi", C2.mountMulti(el("bx-oi"), [
          { label: "BTC OI", rows: oi, color: "var(--ink)" },
          { label: "ETH OI", rows: oie || [], dash: "5 3", opacity: .55 }
        ], { height: 186, zeroBase: true, fmtY: function (v) { return fmtM(v, true, 0); }, fmtTip: function (v) { return fmtM(v, true, 2); }, aria: "Open interest" }));
        if (lsr && lsr.length && el("bx-lsr")) reg(x, "lsr", C2.mountMulti(el("bx-lsr"), [
          { label: x.t("l_lsr"), rows: lsr, color: "var(--ink)" },
          { label: x.t("l_taker"), rows: tk || [], dash: "4 3", opacity: .55 }
        ], { height: 176, fmtY: function (v) { return v.toFixed(2); }, fmtTip: function (v) { return v.toFixed(3); }, aria: x.t("l_lsr") }));
      }
    },
    /* ---- F6 跨所价差 ---- */
    {
      id: "spread", zone: "free", w: "half",
      html: function (x) {
        var bn = x.L.get("bn_spot"), ok = x.L.get("okx_px"), cb = x.L.get("cb_px"), kr = x.L.get("kr_px");
        var list = [
          { k: "BA", px: bn && bn.BTCUSDT ? bn.BTCUSDT.px : null, vol: bn && bn.BTCUSDT ? bn.BTCUSDT.qv : null },
          { k: "OKX", px: ok ? ok.px : null, vol: ok ? ok.vol24 : null },
          { k: "Coinbase", px: cb ? cb.px : null, vol: cb && cb.vol && cb.px ? cb.vol * cb.px : null },
          { k: "Kraken", px: kr ? kr.px : null, vol: kr && kr.vol && kr.px ? kr.vol * kr.px : null }
        ].filter(function (r) { return r.px; });
        if (list.length < 2) return head(x.t("m_spread"), x.t("c_spread")) + empty(x);
        var pxs = list.map(function (r) { return r.px; }), mn = Math.min.apply(null, pxs), mx = Math.max.apply(null, pxs), mid = (mn + mx) / 2;
        var rows = list.map(function (r) {
          return td("<b>" + esc(r.k) + "</b>") + td(fmtPx(r.px)) + td(fmtN((r.px / mid - 1) * 1e4, 1) + " bp", cls(r.px - mid)) + td(fmtUsd(r.vol));
        });
        return head(x.t("m_spread"), x.t("c_spread")) + tbl([x.t("l_venue"), "BTC/USD", x.t("l_vs_mid"), x.t("l_vol24")], rows) +
          foot([kv(x.t("l_spread"), fmtN((mx / mn - 1) * 1e4, 1) + " bp", ""), kv(x.t("l_high"), fmtPx(mx), "up"), kv(x.t("l_low"), fmtPx(mn), "down"),
          kv("24H " + x.t("l_range"), bn && bn.BTCUSDT ? fmtPx(bn.BTCUSDT.lo) + " – " + fmtPx(bn.BTCUSDT.hi) : "—", "")]) +
          note(x.t("n_spread"));
      }
    },
    /* ---- F7 链上资金(DefiLlama) ---- */
    {
      id: "defi", zone: "free", w: "half",
      html: function (x) {
        var tv = x.L.get("eth_tvl"), st = x.L.get("stables"), ch = x.L.get("chains");
        if (!tv && !st && !ch) return head(x.t("m_defi"), x.t("c_defi")) + empty(x);
        var lt = tv && tv.length ? tv[tv.length - 1][1] : null, ls = st && st.length ? st[st.length - 1][1] : null;
        var s30 = st && st.length > 30 ? st[st.length - 31][1] : null;
        return head(x.t("m_defi"), x.t("c_defi")) + box("bx-tvl") + box("bx-chains", "flat") +
          foot([kv("ETH TVL", lt ? "$" + fmtN(lt, 1) + "B" : "—", ""), kv(x.t("l_stable_supply"), ls ? "$" + fmtN(ls, 1) + "B" : "—", ""),
          kv(x.t("l_stable_30d"), ls && s30 ? fmtPct((ls / s30 - 1) * 100, 1) : "—", ls && s30 ? cls(ls - s30) : "")]) +
          note(x.t("n_defi"));
      },
      mount: function (x) {
        var tv = x.L.get("eth_tvl"), st = x.L.get("stables"), ch = x.L.get("chains");
        if ((tv || st) && el("bx-tvl")) reg(x, "tvl", C2.mountMulti(el("bx-tvl"), [
          { label: "ETH TVL $B", rows: tv || [], color: "var(--ink)" },
          { label: x.t("l_stables") + " $B", rows: st || [], dash: "5 3", opacity: .55 }
        ], { height: 180, zeroBase: true, fmtY: function (v) { return Math.round(v); }, fmtTip: function (v) { return "$" + v.toFixed(1) + "B"; }, aria: x.t("m_defi") }));
        if (ch && ch.length && el("bx-chains")) C2.hbars(el("bx-chains"), ch.slice(0, 8).map(function (c) {
          return { k: c.name, v: c.tvl, hi: c.name === "Ethereum" };
        }), { fmt: function (v) { return fmtUsd(v, 1); } });
      }
    },
    /* ---- F8 交易所量榜 ---- */
    {
      id: "exvol", zone: "free", w: "half",
      html: function (x) {
        var e = x.L.get("exchanges");
        if (!e || !e.length) return head(x.t("m_exvol"), x.t("c_exvol")) + empty(x);
        return head(x.t("m_exvol"), x.t("c_exvol")) + box("bx-exvol", "flat") +
          foot([kv(x.t("l_venues"), fmtInt(e.length), ""), kv(x.t("l_top_venue"), esc(venueName(e[0].name)), ""),
          kv(x.t("l_btc_vol"), fmtInt(e[0].btcVol) + " BTC", "")]) + note(x.t("n_exvol"));
      },
      mount: function (x) {
        var e = x.L.get("exchanges"); if (!e || !e.length || !el("bx-exvol")) return;
        var hi = { Binance: 1 };   /* 唯一入口所在的交易所,榜上高亮一家 */
        C2.hbars(el("bx-exvol"), e.slice(0, 10).map(function (r) {
          return { k: venueName(r.name), v: r.btcVol, hi: !!hi[r.name], c: hi[r.name] ? "var(--up)" : null, note: r.trust ? "T" + r.trust : "" };
        }), { fmt: function (v) { return fmtInt(v); } });
      }
    },
    /* ---- F9 数据源健康 + 导出 ---- */
    {
      id: "sources", zone: "free", w: "half",
      html: function (x) {
        var eps = x.L.endpoints(), h = x.L.health();
        var rows = eps.map(function (e) {
          return td('<span class="mono">' + esc(e.id) + "</span>") +
            td('<span class="dot2 ' + e.status + '"></span>' + esc(x.t("l_" + e.status) || e.status)) +
            td(fmtN(e.ttl / 6e4, 0) + " min") + td('<span class="dim ell">' + esc(e.url.replace(/^https?:\/\//, "").slice(0, 42)) + "</span>");
        });
        return head(x.t("m_sources"), x.t("c_sources"),
          '<div class="ctl-row"><button type="button" class="mini-btn" id="btn-refresh">' + esc(x.t("l_refresh")) + '</button>' +
          '<button type="button" class="mini-btn" id="btn-csv">' + esc(x.t("l_export")) + "</button></div>") +
          tbl([x.t("l_source"), x.t("l_status"), "TTL", "endpoint"], rows, { tall: true }) +
          foot([kv(x.t("l_live"), h.live, "up"), kv(x.t("l_cached"), h.cached, ""), kv(x.t("l_fail"), h.fail, h.fail ? "down" : ""), kv(x.t("l_total"), h.total, "")]) +
          note(x.t("n_sources"));
      },
      mount: function (x) {
        var r = el("btn-refresh"), c = el("btn-csv");
        if (r) r.addEventListener("click", function () { this.disabled = true; x.L.refresh(); });
        if (c) c.addEventListener("click", function () { x.exportCsv(); });
      }
    }
  ];

  /* ========================================================================
   * 进阶区(21 组)
   * ====================================================================== */
  var DEEP = [
    /* ---- 01 BTC 价格 × 净流(免费试看) ---- */
    {
      id: "px_btc", zone: "deep", w: "full", free: true,
      html: function (x) {
        return head(x.t("m_px_btc"), x.t("free_chip"),
          '<div class="ctl-row"><span class="chip">▎ ' + esc(x.t("legend_flow")) + '</span><span class="chip">— ' + esc(x.t("legend_px")) + "</span></div>") +
          box("bx-px-btc") + foot([
            kv(x.t("l_corr_mo"), fmtN(x.moCorrB, 2), cls(x.moCorrB)),
            kv(x.t("l_months"), x.moB.length, ""),
            kv(x.t("l_best_mo"), x.bestMoB ? fmtM(x.bestMoB[1]) + " · " + x.bestMoB[0] : "—", "up"),
            kv(x.t("l_worst_mo"), x.worstMoB ? fmtM(x.worstMoB[1]) + " · " + x.worstMoB[0] : "—", "down")
          ]);
      },
      mount: function (x) {
        if (!el("bx-px-btc")) return;
        reg(x, "pxb", x.F.mountDual(el("bx-px-btc"), x.moB, x.pxB, { emptyText: x.t("empty"), aria: x.t("m_px_btc"), tipNet: x.tipNet }));
      }
    },
    /* ---- 02 ETH 价格 × 净流 ---- */
    {
      id: "px_eth", zone: "deep", w: "full",
      html: function (x) {
        return head(x.t("m_px_eth"), x.t("c_px"),
          '<div class="ctl-row"><span class="chip">▎ ' + esc(x.t("legend_flow")) + '</span><span class="chip">— ' + esc(x.t("legend_px")) + "</span></div>") +
          box("bx-px-eth") + foot([
            kv(x.t("l_corr_mo"), fmtN(x.moCorrE, 2), cls(x.moCorrE)),
            kv(x.t("l_months"), x.moE.length, ""),
            kv(x.t("l_best_mo"), x.bestMoE ? fmtM(x.bestMoE[1]) + " · " + x.bestMoE[0] : "—", "up"),
            kv(x.t("l_worst_mo"), x.worstMoE ? fmtM(x.worstMoE[1]) + " · " + x.worstMoE[0] : "—", "down")
          ]);
      },
      mount: function (x) {
        if (!el("bx-px-eth")) return;
        reg(x, "pxe", x.F.mountDual(el("bx-px-eth"), x.moE, x.pxE, { emptyText: x.t("empty"), aria: x.t("m_px_eth"), tipNet: x.tipNet }));
      }
    },
    /* ---- 03 累计赛马 ---- */
    {
      id: "race", zone: "deep", w: "full",
      html: function (x) {
        var cb = M.cumulative(x.btc), ce = M.cumulative(x.eth);
        var lb = cb[cb.length - 1][1], le = ce[ce.length - 1][1];
        return head(x.t("m_race"), x.t("c_race"),
          '<div class="ctl-row"><span class="chip">' + esc(x.t("legend_btc")) + '</span><span class="chip">' + esc(x.t("legend_eth")) + "</span></div>") +
          box("bx-race") + foot([
            kv("BTC " + x.t("l_cum"), fmtM(lb, true), ""), kv("ETH " + x.t("l_cum"), fmtM(le, true), ""),
            kv(x.t("l_ratio_be"), fmtN(le ? lb / le : 0, 1) + "×", ""),
            kv(x.t("l_eth_share"), fmtP(lb + le ? le / (lb + le) * 100 : 0), "")
          ]);
      },
      mount: function (x) {
        if (!el("bx-race")) return;
        reg(x, "race", x.F.mountLines(el("bx-race"),
          { label: "BTC", rows: M.cumulative(M.byMonth(x.btc)) }, { label: "ETH", rows: M.cumulative(M.byMonth(x.eth)) },
          { emptyText: x.t("empty"), aria: x.t("m_race") }));
      }
    },
    /* ---- 04 纪录与纪律 ---- */
    {
      id: "streak", zone: "deep", w: "full",
      html: function (x) {
        function block(tag, rows) {
          var R = M.runs(rows), W = M.extremeWeeks(rows), cur = R.current, cc = M.concentration(rows, 10);
          var top = R.all.slice(0, 5).map(function (r) {
            return td('<span class="' + (r.sign > 0 ? "up" : "down") + '">' + (r.sign > 0 ? x.t("l_inflow") : x.t("l_outflow")) + "</span>") +
              td(r.len + x.t("d_unit")) + td(fmtM(r.sum), cls(r.sum)) + td(r.start) + td(r.end);
          });
          return '<div class="sub-block"><div class="sub-head"><span class="chip">' + tag + "</span>" +
            kv(x.t("st_in"), (R.longestIn ? R.longestIn.len + x.t("d_unit") + " · " + fmtM(R.longestIn.sum) : "—"), "up") +
            kv(x.t("st_out"), (R.longestOut ? R.longestOut.len + x.t("d_unit") + " · " + fmtM(R.longestOut.sum) : "—"), "down") +
            kv(x.t("st_wbest"), W.best ? fmtM(W.best[1]) + " · " + W.best[0] : "—", "up") +
            kv(x.t("st_wworst"), W.worst ? fmtM(W.worst[1]) + " · " + W.worst[0] : "—", "down") +
            kv(x.t("l_current_run"), cur ? (cur.sign > 0 ? "+" : "−") + cur.len + x.t("d_unit") : "—", cur ? (cur.sign > 0 ? "up" : "down") : "") +
            kv(x.t("l_hit"), fmtP(M.hitRate(rows)), "") +
            kv(x.t("l_top10_share"), fmtP(cc.share), "") + "</div>" +
            tbl([x.t("l_dir"), x.t("l_len"), x.t("l_net"), x.t("l_from"), x.t("l_to")], top) + "</div>";
        }
        return head(x.t("m_streak"), x.t("c_streak")) + block("BTC", x.btc) + block("ETH", x.eth) + note(x.t("n_streak"));
      }
    },
    /* ---- 05 日历热力 ---- */
    {
      id: "cal", zone: "deep", w: "full",
      html: function (x) {
        return head(x.t("m_cal"), x.t("c_cal")) + '<div id="bx-cal"></div>' +
          foot([kv(x.t("l_weeks"), 26, ""), kv(x.t("l_legend"), '<span class="lg up">■</span> ' + x.t("l_inflow") + ' <span class="lg down">■</span> ' + x.t("l_outflow"), "")]) +
          note(x.t("n_cal"));
      },
      mount: function (x) {
        if (!el("bx-cal")) return;
        var g = M.calendarGrid(x.btc, 26), dow = x.lang === "zh" ? DOW_ZH.slice(0, 5) : DOW_EN.slice(0, 5);
        C2.heat(el("bx-cal"), g.map(function (w) {
          return {
            label: w.week.slice(5), cells: [0, 1, 2, 3, 4].map(function (d) {
              var v = w.cells[d];
              return v === undefined ? null : { v: v, txt: Math.abs(v) >= 100 ? Math.round(v / 100) / 10 + "B" : Math.round(v), title: w.week + " · " + fmtM(v) };
            })
          };
        }), { cols: dow, labelWidth: "48px" });
      }
    },
    /* ---- 06 月度净流矩阵 ---- */
    {
      id: "mheat", zone: "deep", w: "full",
      html: function (x) {
        return head(x.t("m_mheat"), x.t("c_mheat")) + '<div id="bx-mheat"></div>' + '<div id="bx-mheat-e"></div>' +
          foot([kv("BTC " + x.t("l_cum"), fmtM(M.sum(M.vals(x.btc)), true), ""), kv("ETH " + x.t("l_cum"), fmtM(M.sum(M.vals(x.eth)), true), ""),
          kv(x.t("l_pos_months"), M.byMonth(x.btc).filter(function (r) { return r[1] > 0; }).length + "/" + M.byMonth(x.btc).length, "")]);
      },
      mount: function (x) {
        function draw(host, rows, tag) {
          if (!el(host)) return;
          var mm = new Map(M.byMonth(rows)), yrs = [];
          mm.forEach(function (_, k) { var y = k.slice(0, 4); if (yrs.indexOf(y) < 0) yrs.push(y); });
          C2.heat(el(host), yrs.map(function (y) {
            return {
              label: tag + " " + y, cells: MON.map(function (m) {
                var v = mm.get(y + "-" + m);
                return v === undefined ? null : { v: v, txt: Math.abs(v) >= 1000 ? (v / 1000).toFixed(1) + "B" : Math.round(v), title: y + "-" + m + " · " + fmtM(v) };
              })
            };
          }), { cols: x.lang === "zh" ? ["1月", "2月", "3月", "4月", "5月", "6月", "7月", "8月", "9月", "10月", "11月", "12月"] : MON, labelWidth: "74px" });
        }
        draw("bx-mheat", x.btc, "BTC"); draw("bx-mheat-e", x.eth, "ETH");
      }
    },
    /* ---- 07 分布与分位 ---- */
    {
      id: "dist", zone: "deep", w: "half",
      html: function (x) {
        var q = M.quantiles(x.btc);
        return head(x.t("m_dist"), x.t("c_dist")) + box("bx-dist") +
          tbl([x.t("l_stat"), "BTC", "ETH"], (function () {
            var qe = M.quantiles(x.eth);
            return [["p05", "p05"], ["p25", "p25"], ["p50", "p50"], ["p75", "p75"], ["p95", "p95"], ["mean", "l_avg"], ["sd", "l_sd"]].map(function (r) {
              return td(r[1].indexOf("l_") === 0 ? x.t(r[1]) : r[1].toUpperCase()) + td(fmtM(q[r[0]]), cls(q[r[0]])) + td(fmtM(qe[r[0]]), cls(qe[r[0]]));
            });
          })()) +
          foot([kv(x.t("l_n_days"), q.n, ""), kv(x.t("l_max"), fmtM(q.max), "up"), kv(x.t("l_min"), fmtM(q.min), "down")]);
      },
      mount: function (x) {
        if (!el("bx-dist")) return;
        reg(x, "dist", C2.mountHist(el("bx-dist"), M.histogram(M.vals(x.btc), 28), { height: 176, fmt: function (v) { return fmtM(v, true, 1); }, aria: x.t("m_dist") }));
      }
    },
    /* ---- 08 星期与月份效应 ---- */
    {
      id: "dow", zone: "deep", w: "half",
      html: function (x) {
        var d = M.dayOfWeek(x.btc).slice(0, 5), names = x.lang === "zh" ? DOW_ZH : DOW_EN;
        var rows = d.map(function (r) { return td(names[r.dow]) + td(fmtM(r.total), cls(r.total)) + td(fmtM(r.avg), cls(r.avg)) + td(fmtP(r.hit)) + td(r.count); });
        var mo = M.monthOfYear(x.btc).filter(function (r) { return r.count; });
        var mrows = mo.map(function (r) { return td(x.lang === "zh" ? r.m + "月" : MON[r.m - 1]) + td(fmtM(r.total), cls(r.total)) + td(fmtM(r.avg), cls(r.avg)) + td(fmtP(r.hit)) + td(r.count); });
        return head(x.t("m_dow"), x.t("c_dow")) +
          tbl([x.t("l_dow"), x.t("l_net"), x.t("l_avg"), x.t("l_hit"), x.t("l_n")], rows) +
          '<div class="gap"></div>' +
          tbl([x.t("l_month"), x.t("l_net"), x.t("l_avg"), x.t("l_hit"), x.t("l_n")], mrows, { tall: true }) +
          note(x.t("n_dow"));
      }
    },
    /* ---- 09 动量与体制 ---- */
    {
      id: "mom", zone: "deep", w: "full",
      html: function (x) {
        var rg = M.regime(x.btc), rge = M.regime(x.eth), z = M.lastNonNull(M.rollingZ(x.btc, 60));
        return head(x.t("m_mom"), x.t("c_mom")) + box("bx-mom") +
          tiles([
            { k: "BTC " + x.t("l_regime"), v: esc(x.t("rg_" + rg.code)), c: rg.ma7 >= 0 ? "up" : "down" },
            { k: "ETH " + x.t("l_regime"), v: esc(x.t("rg_" + rge.code)), c: rge.ma7 >= 0 ? "up" : "down" },
            { k: "BTC MA7", v: fmtM(rg.ma7), c: cls(rg.ma7) },
            { k: "BTC MA30", v: fmtM(rg.ma30), c: cls(rg.ma30) },
            { k: "Z(60)", v: fmtN(z ? z[1] : 0, 2), c: cls(z ? z[1] : 0) },
            { k: "ETH MA30", v: fmtM(rge.ma30), c: cls(rge.ma30) }
          ]) + note(x.t("n_mom"));
      },
      mount: function (x) {
        if (!el("bx-mom")) return;
        var w = M.windowRows(x.btc, 400);
        reg(x, "mom", C2.mountMulti(el("bx-mom"), [
          { label: "MA7", rows: M.sma(w, 7), color: "var(--ink)" },
          { label: "MA30", rows: M.sma(w, 30), dash: "5 3", opacity: .6 },
          { label: "MA90", rows: M.sma(w, 90), dash: "2 3", opacity: .4 }
        ], { height: 220, fmtY: function (v) { return fmtM(v, true, 0); }, fmtTip: function (v) { return fmtM(v); }, aria: x.t("m_mom") }));
      }
    },
    /* ---- 10 净流 × 收益相关 ---- */
    {
      id: "corr", zone: "deep", w: "full",
      html: function (x) {
        var pr = x.dailyB;
        if (!pr || pr.length < 40) return head(x.t("m_corr"), x.t("c_corr")) + empty(x);
        var rets = M.returns(pr), pair = M.align(x.btc, rets);
        var c0 = M.pearson(pair.map(function (r) { return r[1]; }), pair.map(function (r) { return r[2]; }));
        var ll = M.leadLag(x.btc, rets, 3);
        var rows = [ll.map(function (r) { return td((r[0] > 0 ? "+" : "") + r[0] + "d"); }).join(""), ll.map(function (r) { return td(fmtN(r[1], 2), cls(r[1])); }).join("")];
        return head(x.t("m_corr"), x.t("c_corr")) +
          '<div class="split"><div>' + box("bx-scatter") + "</div><div>" + box("bx-rcorr") + "</div></div>" +
          '<div class="lead-lag"><span class="ll-t">' + esc(x.t("l_leadlag")) + '</span><div class="table-scroll"><table><tbody><tr>' +
          rows[0] + "</tr><tr>" + rows[1] + "</tr></tbody></table></div></div>" +
          foot([kv(x.t("l_corr_all"), fmtN(c0, 2), cls(c0)), kv(x.t("l_n_pairs"), pair.length, ""),
          kv(x.t("l_corr_30"), (function () { var r = M.lastNonNull(M.rollingCorr(x.btc, rets, 30)); return r ? fmtN(r[1], 2) : "—"; })(), "")]) +
          note(x.t("n_corr"));
      },
      mount: function (x) {
        var pr = x.dailyB; if (!pr || pr.length < 40) return;
        var rets = M.returns(pr), pair = M.align(x.btc, rets);
        if (el("bx-scatter")) reg(x, "sc", C2.mountScatter(el("bx-scatter"), pair.map(function (r) { return [r[1], r[2], r[0] + " · " + fmtM(r[1]) + " → " + fmtPct(r[2]) ]; }), {
          height: 230, fmtX: function (v) { return fmtM(v, true, 0); }, fmtY: function (v) { return v.toFixed(0) + "%"; }, aria: x.t("m_corr")
        }));
        if (el("bx-rcorr")) reg(x, "rc", C2.mountMulti(el("bx-rcorr"), [{ label: "ρ30", rows: M.rollingCorr(x.btc, rets, 30), color: "var(--ink)" }],
          { height: 230, fmtY: function (v) { return v.toFixed(1); }, fmtTip: function (v) { return v.toFixed(3); }, aria: x.t("l_corr_30") }));
      }
    },
    /* ---- 11 波动率 ---- */
    {
      id: "vol", zone: "deep", w: "half",
      html: function (x) {
        if (!x.dailyB) return head(x.t("m_vol"), x.t("c_vol")) + empty(x);
        var vb = M.lastNonNull(M.rollingVol(x.dailyB, 30)), ve = x.dailyE ? M.lastNonNull(M.rollingVol(x.dailyE, 30)) : null;
        var v90 = M.lastNonNull(M.rollingVol(x.dailyB, 90));
        return head(x.t("m_vol"), x.t("c_vol")) + box("bx-vol") +
          foot([kv("BTC 30D", vb ? fmtP(vb[1]) : "—", ""), kv("BTC 90D", v90 ? fmtP(v90[1]) : "—", ""),
          kv("ETH 30D", ve ? fmtP(ve[1]) : "—", ""), kv(x.t("l_ratio"), vb && ve ? fmtN(ve[1] / vb[1]) + "×" : "—", "")]) +
          note(x.t("n_vol"));
      },
      mount: function (x) {
        if (!x.dailyB || !el("bx-vol")) return;
        reg(x, "vol", C2.mountMulti(el("bx-vol"), [
          { label: "BTC", rows: M.rollingVol(x.dailyB, 30), color: "var(--ink)" },
          { label: "ETH", rows: x.dailyE ? M.rollingVol(x.dailyE, 30) : [], dash: "5 3", opacity: .55 }
        ], { height: 196, zeroBase: true, fmtY: function (v) { return Math.round(v) + "%"; }, fmtTip: function (v) { return v.toFixed(1) + "%"; }, aria: x.t("m_vol") }));
      }
    },
    /* ---- 12 回撤 ---- */
    {
      id: "dd", zone: "deep", w: "half",
      html: function (x) {
        if (!x.dailyB) return head(x.t("m_dd"), x.t("c_dd")) + empty(x);
        var d = M.drawdown(x.dailyB), de = x.dailyE ? M.drawdown(x.dailyE) : null;
        return head(x.t("m_dd"), x.t("c_dd")) + box("bx-dd") +
          foot([kv(x.t("l_max_dd"), fmtP(d.max), "down"), kv(x.t("l_peak"), d.peakAt || "—", ""),
          kv(x.t("l_trough"), d.troughAt || "—", ""), kv(x.t("l_now_dd"), fmtP(d.current), d.current < -1 ? "down" : ""),
          kv("ETH " + x.t("l_max_dd"), de ? fmtP(de.max) : "—", "down")]) + note(x.t("n_dd"));
      },
      mount: function (x) {
        if (!x.dailyB || !el("bx-dd")) return;
        reg(x, "dd", C2.mountUnderwater(el("bx-dd"), M.drawdown(x.dailyB).series, { height: 196, aria: x.t("m_dd") }));
      }
    },
    /* ---- 13 月度收益矩阵 ---- */
    {
      id: "mret", zone: "deep", w: "full",
      html: function (x) {
        if (!x.dailyB) return head(x.t("m_mret"), x.t("c_mret")) + empty(x);
        return head(x.t("m_mret"), x.t("c_mret")) + '<div id="bx-mret"></div><div id="bx-mret-e"></div>' + note(x.t("n_mret"));
      },
      mount: function (x) {
        function draw(host, prices, tag) {
          if (!prices || !el(host)) return;
          var r = M.monthlyReturns(prices);
          C2.heat(el(host), r.years.map(function (y) {
            return {
              label: tag + " " + y, cells: MON.map(function (m) {
                var v = r.cells.get(y + "-" + m);
                return v === undefined ? null : { v: v, txt: v.toFixed(0) + "%", title: y + "-" + m + " · " + fmtPct(v, 1) };
              })
            };
          }), { cols: x.lang === "zh" ? ["1月", "2月", "3月", "4月", "5月", "6月", "7月", "8月", "9月", "10月", "11月", "12月"] : MON, labelWidth: "74px", scale: 25 });
        }
        draw("bx-mret", x.dailyB, "BTC"); draw("bx-mret-e", x.dailyE, "ETH");
      }
    },
    /* ---- 14 折算持币 ---- */
    {
      id: "coins", zone: "deep", w: "full",
      html: function (x) {
        var ic = M.impliedCoins(x.btc, x.pxDaily || x.pxB), cum = M.cumulative(ic);
        var total = cum.length ? cum[cum.length - 1][1] : 0, held = x.D.stats.btc_holdings_btc;
        var last30 = M.sum(M.vals(ic.slice(-30)));
        return head(x.t("m_coins"), x.t("c_coins")) + box("bx-coins") +
          foot([kv(x.t("l_implied_cum"), fmtInt(total) + " BTC", ""), kv(x.t("l_etf_held"), fmtInt(held) + " BTC", ""),
          kv(x.t("l_of_supply"), fmtP(held / 21e6 * 100, 2), ""), kv(x.t("l_last30_coins"), fmtInt(last30) + " BTC", cls(last30)),
          kv(x.t("l_avg_cost"), fmtPx(total ? M.sum(M.vals(x.btc)) * 1e6 / total : 0), "")]) +
          note(x.t("n_coins"));
      },
      mount: function (x) {
        if (!el("bx-coins")) return;
        var ic = M.impliedCoins(x.btc, x.pxDaily || x.pxB);
        reg(x, "coins", C2.mountMulti(el("bx-coins"), [{ label: "BTC", rows: M.cumulative(ic), color: "var(--ink)" }],
          { height: 220, zeroBase: true, fmtY: function (v) { return fmtInt(v / 1000) + "K"; }, fmtTip: function (v) { return fmtInt(v) + " BTC"; }, aria: x.t("m_coins") }));
      }
    },
    /* ---- 15 币股透视(实时) ---- */
    {
      id: "bee", zone: "deep", w: "full",
      html: function (x) {
        var tr = x.L.get("treasury"), px = x.btcPx;
        if (px == null || isNaN(px)) return head(x.t("m_bee"), x.t("c_bee")) + empty(x);
        var rows, tot, dom;
        if (tr && tr.rows && tr.rows.length) {
          rows = tr.rows.slice(0, 20).map(function (c) {
            var val = c.btc * px, pl = c.entry ? (val / c.entry - 1) * 100 : null;
            return td("<b>" + esc(c.sym) + "</b>") + td('<span class="dim">' + esc(c.name) + "</span>") + td(esc(c.country || "—")) +
              td(fmtInt(c.btc)) + td(fmtUsd(val, 2)) + td(fmtP(c.pct, 3)) + td(pl == null ? "—" : fmtPct(pl, 1), cls(pl));
          });
          tot = tr.total; dom = tr.dom;
        } else {
          rows = (x.D.bee_table || []).map(function (b) {
            return td("<b>" + esc(b[0]) + "</b>") + td('<span class="dim">' + esc(b[1]) + "</span>") + td("—") +
              td(fmtInt(b[2])) + td(fmtUsd(b[2] * px, 2)) + td(fmtP(b[2] / 21e6 * 100, 3)) + td("—");
          });
          tot = x.D.bee_stock.btc_held; dom = null;
        }
        return head(x.t("m_bee"), tr ? x.t("c_bee_live") : x.t("c_bee")) +
          tbl([x.t("l_ticker"), x.t("l_company"), x.t("l_country"), x.t("l_btc_held"), x.t("l_value"), x.t("l_of_21m"), x.t("l_pnl")], rows, { tall: true }) +
          foot([kv(x.t("l_co_total"), fmtInt(tot) + " BTC", ""), kv(x.t("l_marked"), fmtUsd(tot * px, 1), ""),
          kv(x.t("l_dominance"), dom ? fmtP(dom, 2) : "—", ""), kv(x.t("l_at_price"), fmtPx(px), "")]) +
          note(x.t("bee_note"));
      }
    },
    /* ---- 16 交叉口径 ---- */
    {
      id: "cross", zone: "deep", w: "half",
      html: function (x) {
        var lastR = x.D.ratio_series[x.D.ratio_series.length - 1], usEqM = lastR[2] * 1e6;
        var etfM = x.D.stats.btc_aum_musd + x.D.stats.eth_aum_musd;
        var tr = x.L.get("treasury"), beeM = tr && x.btcPx != null ? tr.total * x.btcPx / 1e6 : x.D.bee_stock.nav_all_musd;
        var g = x.L.get("global"), cryptoT = g ? g.mcap / 1e12 : lastR[1];
        return head(x.t("m_cross"), x.t("c_cross")) + box("bx-cross", "flat") +
          foot([kv(x.t("x_etf"), fmtP(etfM / usEqM * 100, 2), ""), kv(x.t("x_bee"), fmtM(beeM, true, 1), ""),
          kv(x.t("x_combo"), fmtM(etfM + beeM, true, 1), ""), kv(x.t("x_crypto"), fmtP(cryptoT / lastR[2] * 100, 2), "")]) +
          note(x.t("x_note"));
      },
      mount: function (x) {
        if (!el("bx-cross")) return;
        var lastR = x.D.ratio_series[x.D.ratio_series.length - 1], usEqM = lastR[2] * 1e6;
        var etfM = x.D.stats.btc_aum_musd + x.D.stats.eth_aum_musd;
        var tr = x.L.get("treasury"), beeM = tr && x.btcPx != null ? tr.total * x.btcPx / 1e6 : x.D.bee_stock.nav_all_musd;
        var g = x.L.get("global"), cryptoM = (g ? g.mcap : lastR[1] * 1e12) / 1e6, base = etfM + beeM || 1;
        /* 条形按「ETF+币股合计」归一,加密总市值只在脚注给数——两者差 20 倍以上,同尺度会退化成细线 */
        C2.bullet(el("bx-cross"), [
          { k: x.t("x_etf"), v: fmtM(etfM, true, 1) + " · " + fmtP(etfM / usEqM * 100, 2), pct: etfM / base * 100 },
          { k: x.t("x_bee"), v: fmtM(beeM, true, 1) + " · " + fmtP(beeM / usEqM * 100, 2), pct: beeM / base * 100, c: "color-mix(in oklab, var(--ink) 60%, var(--bg-surface))" },
          { k: x.t("x_combo"), v: fmtM(base, true, 1) + " · " + fmtP(base / usEqM * 100, 2), pct: 100, c: "var(--up)" },
          { k: x.t("x_crypto"), v: fmtM(cryptoM, true, 2) + " · " + fmtP(cryptoM / usEqM * 100, 2), pct: 100, c: "var(--ink-3)", note: x.t("l_off_scale") }
        ]);
      }
    },
    /* ---- 17 发行商拆解 ---- */
    {
      id: "issuer", zone: "deep", w: "half",
      html: function (x) {
        var L = x.D.issuers || [], tot = L.reduce(function (a, r) { return a + r[2]; }, 0);
        var rows = L.map(function (r) {
          return td("<b>" + esc(r[0]) + "</b>") + td('<span class="dim">' + esc(r[1]) + "</span>") + td(fmtM(r[2], true, 1)) +
            td(fmtP(tot ? r[2] / tot * 100 : 0)) + td(fmtP(r[3], 2)) + td(esc(r[4]));
        });
        return head(x.t("m_issuer"), x.t("c_issuer")) +
          tbl([x.t("l_fund"), x.t("l_issuer"), "AUM", x.t("l_share"), x.t("l_fee"), x.t("l_asset")], rows, { tall: true }) +
          foot([kv(x.t("l_funds"), L.length, ""), kv("AUM", fmtM(tot, true, 1), ""),
          kv(x.t("l_top3"), fmtP(tot ? L.slice(0, 3).reduce(function (a, r) { return a + r[2]; }, 0) / tot * 100 : 0), "")]) +
          note(x.t("n_issuer"));
      }
    },
    /* ---- 18 周/月/季汇总 ---- */
    {
      id: "wk", zone: "deep", w: "full",
      html: function (x) {
        var wB = M.byWeek(x.btc), wE = new Map(M.byWeek(x.eth)), mB = M.byMonth(x.btc), mE = new Map(M.byMonth(x.eth)), qB = M.byQuarter(x.btc), qE = new Map(M.byQuarter(x.eth));
        function mk(agg, mapE, n, lbl) {
          var a = agg.slice(-n).reverse();
          var rows = a.map(function (r, i) {
            var prev = a[i + 1], e = mapE.get(r[0]) || 0;
            /* Δ 取环比差额(美元)而非百分比:净流会变号,百分比在变号时没有意义 */
            return td(r[0]) + td(fmtM(r[1]), cls(r[1])) + td(prev ? fmtM(r[1] - prev[1]) : "—", prev ? cls(r[1] - prev[1]) : "") +
              td(fmtM(e), cls(e)) + td(fmtM(r[1] + e), cls(r[1] + e));
          });
          return '<div class="sub-block"><div class="sub-head"><span class="chip">' + esc(lbl) + "</span></div>" +
            tbl([x.t("l_period"), "BTC", "Δ", "ETH", x.t("l_total")], rows, { tall: true }) + "</div>";
        }
        return head(x.t("m_wk"), x.t("c_wk")) +
          '<div class="tri">' + mk(wB, wE, 12, x.t("l_weekly")) + mk(mB, mE, 12, x.t("l_monthly")) + mk(qB, qE, 10, x.t("l_quarterly")) + "</div>";
      }
    },
    /* ---- 19 多窗口摘要 ---- */
    {
      id: "win", zone: "deep", w: "half",
      html: function (x) {
        var wins = [7, 30, 90, 180, 365, 1e6], names = ["7D", "30D", "90D", "180D", "1Y", "ALL"];
        var rows = wins.map(function (d, i) {
          var b = M.windowSummary(x.btc, d), e = M.windowSummary(x.eth, d);
          return td("<b>" + names[i] + "</b>") + td(fmtM(b.net), cls(b.net)) + td(fmtM(b.avg), cls(b.avg)) +
            td(fmtP(b.hit)) + td(fmtM(e.net), cls(e.net)) + td(b.n);
        });
        return head(x.t("m_win"), x.t("c_win")) +
          tbl([x.t("l_window"), "BTC " + x.t("l_net"), x.t("l_avg_day"), x.t("l_hit"), "ETH " + x.t("l_net"), x.t("l_n")], rows) +
          note(x.t("n_win"));
      }
    },
    /* ---- 20 OI × 净流 ---- */
    {
      id: "oiflow", zone: "deep", w: "half",
      html: function (x) {
        var oi = x.L.get("bn_oi");
        if (!oi || !oi.length) return head(x.t("m_oiflow"), x.t("c_oiflow")) + empty(x);
        var pair = M.align(x.btc, oi), c = M.pearson(pair.map(function (r) { return r[1]; }), pair.map(function (r) { return r[2]; }));
        var oiChg = oi.map(function (r, i) { return i ? [r[0], r[1] - oi[i - 1][1]] : [r[0], 0]; });
        var pair2 = M.align(x.btc, oiChg), c2 = M.pearson(pair2.map(function (r) { return r[1]; }), pair2.map(function (r) { return r[2]; }));
        return head(x.t("m_oiflow"), x.t("c_oiflow")) + box("bx-oiflow") +
          foot([kv(x.t("l_corr_lvl"), fmtN(c, 2), cls(c)), kv(x.t("l_corr_chg"), fmtN(c2, 2), cls(c2)),
          kv(x.t("l_n_pairs"), pair.length, "")]) + note(x.t("n_oiflow"));
      },
      mount: function (x) {
        var oi = x.L.get("bn_oi"); if (!oi || !oi.length || !el("bx-oiflow")) return;
        var cum = M.cumulative(M.windowRows(x.btc, 120));
        reg(x, "oif", C2.mountMulti(el("bx-oiflow"), [
          { label: "OI", rows: oi, color: "var(--ink)" },
          { label: x.t("l_cum_flow"), rows: cum.map(function (r) { return [r[0], r[1] - cum[0][1] + oi[0][1]]; }), dash: "5 3", opacity: .55 }
        ], { height: 196, fmtY: function (v) { return fmtM(v, true, 0); }, fmtTip: function (v) { return fmtM(v, true, 2); }, aria: x.t("m_oiflow") }));
      }
    },
    /* ---- 21 导出与方法论 ---- */
    {
      id: "export", zone: "deep", w: "full",
      html: function (x) {
        var rows = [
          [x.t("dd_flow"), "data.js · SoSoValue / Farside", x.t("dd_flow_d")],
          [x.t("dd_px"), "CoinGecko market_chart", x.t("dd_px_d")],
          [x.t("dd_fng"), "alternative.me", x.t("dd_fng_d")],
          [x.t("dd_chain"), "mempool.space", x.t("dd_chain_d")],
          [x.t("dd_deriv"), "BA / OKX public", x.t("dd_deriv_d")],
          [x.t("dd_defi"), "DefiLlama", x.t("dd_defi_d")],
          [x.t("dd_bee"), "CoinGecko public_treasury", x.t("dd_bee_d")]
        ].map(function (r) { return td("<b>" + esc(r[0]) + "</b>") + td('<span class="mono dim">' + esc(r[1]) + "</span>") + td('<span class="wrap-td">' + esc(r[2]) + "</span>"); });
        return head(x.t("m_export"), x.t("c_export"),
          '<div class="ctl-row"><button type="button" class="mini-btn" id="btn-csv2">' + esc(x.t("l_export_all")) + '</button>' +
          '<button type="button" class="mini-btn" id="btn-json">' + esc(x.t("l_export_json")) + "</button></div>") +
          tbl([x.t("l_dataset"), x.t("l_source"), x.t("l_method")], rows, { tall: true }) + note(x.t("n_export"));
      },
      mount: function (x) {
        var a = el("btn-csv2"), b = el("btn-json");
        if (a) a.addEventListener("click", function () { x.exportCsv(); });
        if (b) b.addEventListener("click", function () { x.exportJson(); });
      }
    }
  ];

  /* ================= 渲染 ================= */
  /* prefix "F" = 公共区 F1…F9;prefix "" = 进阶区 01…21(start 为起始序号) */
  function renderZone(hostId, list, x, prefix, start) {
    var host = document.getElementById(hostId);
    if (!host) return;
    var h = "", i, shown = [];
    for (i = 0; i < list.length; i++) {
      var m = list[i], n = (start || 1) + i, no = prefix === "F" ? "F" + n : (n < 10 ? "0" + n : String(n));
      if (m.id === "sources" && x.C.flags && x.C.flags.show_source_panel === false) continue;
      var body = m.html(x);
      if (x.C.flags && x.C.flags.hide_unavailable_panels && body.indexOf('data-panel-empty="1"') >= 0) continue;
      shown.push({ m: m, no: no, body: body, full: m.w !== "half" });
    }
    /* 保持原顺序，同时把无法配对的半宽卡提升为整行，避免桌面网格空洞。 */
    var openHalf = -1;
    for (i = 0; i < shown.length; i++) {
      if (shown[i].full) {
        if (openHalf >= 0) { shown[openHalf].full = true; openHalf = -1; }
      } else if (openHalf < 0) openHalf = i;
      else openHalf = -1;
    }
    if (openHalf >= 0) shown[openHalf].full = true;
    for (i = 0; i < shown.length; i++) {
      h += '<section class="card pcard ' + (shown[i].full ? "full" : "half") + '" id="p-' + shown[i].m.id + '" data-screen-label="' +
        esc(shown[i].no + " " + shown[i].m.id) + '">' + shown[i].body + "</section>";
    }
    host.innerHTML = h;
    for (i = 0; i < shown.length; i++) if (shown[i].m.mount) try { shown[i].m.mount(x); } catch (e) { if (window.console) console.warn("panel " + shown[i].m.id, e); }
  }

  return {
    free: FREE, deep: DEEP,
    /* 公共区统一排版，入口带固定放在整个公共区之后。 */
    renderFree: function (x, includeExtra) {
      renderZone("free-panels", FREE.slice(0, 5), x, "F", 1);
      if (includeExtra) renderZone("free-panels-b", FREE.slice(5), x, "F", 6);
      else { var b = document.getElementById("free-panels-b"); if (b) b.innerHTML = ""; }
    },
    renderDeep: function (x) { renderZone("deep-panels", DEEP.slice(1), x, "", 2); },
    renderPreview: function (x) { renderZone("preview-panel", [DEEP[0]], x, "", 1); },
    count: function () { return { free: FREE.length, deep: DEEP.length }; },
    fmt: { fmtM: fmtM, fmtUsd: fmtUsd, fmtPx: fmtPx, fmtPct: fmtPct, fmtP: fmtP, fmtInt: fmtInt, fmtN: fmtN, cls: cls }
  };
})();
