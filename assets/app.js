/* ============================================================================
 * app.js — 页面渲染与交互编排(维护勿改)
 * ----------------------------------------------------------------------------
 * 职责:取配置(config.js)+ 静态数据(data.js)+ 实时数据(live.js)
 *       → 组装上下文 x → 交给 charts.js / charts2.js / panels.js 渲染。
 * 本文件不含任何可编辑文案与颜色;发现硬编码请回填 config/data(见 AGENT.md)。
 * ========================================================================== */
(function () {
  "use strict";
  var C = window.SITE_CONFIG, D = window.SITE_DATA;
  var L = window.FlowLive, M = window.FlowMetrics, F = window.FlowCharts, P = window.FlowPanels, K = window.FlowCapture;
  var $ = function (id) { return document.getElementById(id); };
  var LS_LANG = "flow_lang";
  var lang = (function () { try { return localStorage.getItem(LS_LANG) || C.meta.lang_default; } catch (e) { return C.meta.lang_default; } })();
  if (!C.strings[lang]) lang = "zh";
  var t = function (k) {
    var s = C.strings[lang];
    return s && Object.prototype.hasOwnProperty.call(s, k) ? s[k] : k;
  };

  /* ---- 数值格式 ---- */
  var fmt = P.fmt;
  function fmtM(v, noSign, dp) { return fmt.fmtM(v, noSign, dp); }
  function fmtInt(n) { return fmt.fmtInt(n); }
  function fmtPx(v) { return fmt.fmtPx(v); }
  function fmtChg(v) { var s = (v || 0).toFixed(1); if (s === "-0.0") s = "0.0"; return (parseFloat(s) > 0 ? "+" : "") + s + "%"; }
  function fmtT(v) { return "$" + (v / 1e12).toFixed(2) + "T"; }
  function cls(v) { return v >= 0 ? "up" : "down"; }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }

  /* ---- 品牌与交易所标识(内联 SVG) ---- */
  function brandMark() {
    return '<svg class="brand-mark" viewBox="0 0 32 32" aria-hidden="true"><rect width="32" height="32" rx="8" fill="#1d1d1f"/><rect x="6.5" y="8" width="5" height="8" rx="1" fill="#30d158"/><rect x="13.5" y="11" width="5" height="5" rx="1" fill="#30d158" opacity=".55"/><rect x="20.5" y="16.5" width="5" height="7" rx="1" fill="#ff453a"/><rect x="4.5" y="15.6" width="23" height="1.1" fill="#f5f5f7" opacity=".85"/></svg>';
  }
  function baMark() {
    return '<svg class="logo ba-badge" viewBox="0 0 32 32" role="img" aria-label="BA"><rect x="1" y="1" width="30" height="30" rx="9" fill="#c99908"/><text x="16" y="20.5" text-anchor="middle" font-family="-apple-system,BlinkMacSystemFont,sans-serif" font-size="11" font-weight="750" fill="#fff">BA</text></svg>';
  }

  /* ---- 数据缺失兜底 ---- */
  if (!D || !Array.isArray(D.btc_flows) || !D.btc_flows.length) {
    document.querySelector("main").innerHTML = '<div class="card"><div class="state error">' + esc(t("err_nodata")) + "</div></div>";
    return;
  }

  var btc = D.btc_flows, eth = D.eth_flows;
  var btcCum = M.sum(M.vals(btc)), ethCum = M.sum(M.vals(eth));
  var btcLast = btc[btc.length - 1], ethLast = eth[eth.length - 1];
  var charts = {}, chartState = { btc: { type: "bar", gran: "d", period: "6m" }, eth: { type: "bar", gran: "d", period: "6m" } };
  var deepOpen = false, freeOpen = false;

  /* ---- 元信息同步 ---- */
  function syncMeta() {
    document.documentElement.lang = lang === "zh" ? "zh-CN" : "en";
    document.title = C.meta.title;
    var q = function (sel) { return document.querySelector(sel); };
    if (q('meta[name="description"]')) q('meta[name="description"]').setAttribute("content", C.meta.description);
    if (q('meta[property="og:title"]')) q('meta[property="og:title"]').setAttribute("content", C.meta.title);
    if (q('meta[property="og:description"]')) q('meta[property="og:description"]').setAttribute("content", C.meta.description);
    if (C.meta.site_url) {
      var l = q('link[rel="canonical"]') || document.head.appendChild(Object.assign(document.createElement("link"), { rel: "canonical" }));
      l.setAttribute("href", C.meta.site_url);
      var ogUrl = q('meta[property="og:url"]') || document.head.appendChild(Object.assign(document.createElement("meta"), { property: "og:url" }));
      ogUrl.setAttribute("content", C.meta.site_url);
    }
  }

  /* ---- 上下文:所有派生序列只算一次 ---- */
  function liveDaily(id) {
    var c = L.get(id);
    return c && c.price && c.price.length > 30 ? c.price : null;
  }
  function monthlyCloses(daily) {
    if (!daily) return null;
    var m = new Map(), i;
    for (i = 0; i < daily.length; i++) m.set(daily[i][0].slice(0, 7), daily[i][1]);
    return Array.from(m.entries());
  }
  function buildCtx() {
    var dailyB = liveDaily("btc_chart"), dailyE = liveDaily("eth_chart");
    /* 价格月线:优先用实时日线折算,缺失则用 data.js 月末价 */
    var pxB = D.btc_price_monthly, pxE = D.eth_price_monthly;
    var lmB = monthlyCloses(dailyB), lmE = monthlyCloses(dailyE);
    if (lmB && lmB.length > 6) pxB = mergeMonthly(pxB, lmB);
    if (lmE && lmE.length > 6) pxE = mergeMonthly(pxE, lmE);
    var fmB = M.monthMap(btc), fmE = M.monthMap(eth);
    var moB = pxB.map(function (r) { return [r[0], Math.round((fmB.get(r[0]) || 0) * 10) / 10]; });
    var moE = pxE.map(function (r) { return [r[0], Math.round((fmE.get(r[0]) || 0) * 10) / 10]; });
    var pq = L.get("price"), btcPx = pq && pq.bitcoin ? pq.bitcoin.px : null;
    function moCorr(mo, px) {
      var chg = px.map(function (r, i) { return i ? [r[0], (r[1] / px[i - 1][1] - 1) * 100] : [r[0], 0]; }).slice(1);
      var pair = M.align(mo, chg);
      return M.pearson(pair.map(function (r) { return r[1]; }), pair.map(function (r) { return r[2]; }));
    }
    var sB = moB.slice().sort(function (a, b) { return b[1] - a[1]; }), sE = moE.slice().sort(function (a, b) { return b[1] - a[1]; });
    return {
      t: t, lang: lang, C: C, D: D, L: L, F: F, ch: charts, btc: btc, eth: eth,
      moB: moB, moE: moE, pxB: pxB, pxE: pxE, dailyB: dailyB, dailyE: dailyE, pxDaily: dailyB,
      moCorrB: moCorr(moB, pxB), moCorrE: moCorr(moE, pxE),
      bestMoB: sB[0], worstMoB: sB[sB.length - 1], bestMoE: sE[0], worstMoE: sE[sE.length - 1],
      btcPx: btcPx, tipNet: lang === "zh" ? "净流" : "NET",
      exportCsv: exportCsv, exportJson: exportJson
    };
  }
  function mergeMonthly(base, live) {
    var m = new Map(base);
    live.forEach(function (r) { m.set(r[0], Math.round(r[1])); });
    return Array.from(m.entries()).sort();
  }

  /* ---- 导出 ---- */
  function exportCsv() {
    K.track("csv_export");
    var lines = ["# ETF Flow Terminal export · v" + C.meta.version + " · " + new Date().toISOString(), "", "# btc_daily_net_flow_musd", "date,net_musd,cum_musd"];
    var c = 0;
    btc.forEach(function (r) { c += r[1]; lines.push(r[0] + "," + r[1] + "," + Math.round(c * 10) / 10); });
    lines.push("", "# eth_daily_net_flow_musd", "date,net_musd,cum_musd"); c = 0;
    eth.forEach(function (r) { c += r[1]; lines.push(r[0] + "," + r[1] + "," + Math.round(c * 10) / 10); });
    lines.push("", "# monthly_aggregate_musd", "month,btc,eth,btc_price,eth_price");
    var mB = M.monthMap(btc), mE = M.monthMap(eth), pB = new Map(D.btc_price_monthly), pE = new Map(D.eth_price_monthly);
    Array.from(mB.keys()).forEach(function (k) { lines.push([k, mB.get(k) || 0, mE.get(k) || 0, pB.get(k) || "", pE.get(k) || ""].join(",")); });
    lines.push("", "# live_snapshot", "source,status,payload_json");
    L.endpoints().forEach(function (e) {
      var d = L.get(e.id), s = d == null ? "" : JSON.stringify(d);
      if (s.length > 4000) s = s.slice(0, 4000) + "…";
      lines.push([e.id, e.status, '"' + s.replace(/"/g, '""') + '"'].join(","));
    });
    K.download("etf-flow-export-" + new Date().toISOString().slice(0, 10) + ".csv", lines.join("\n"));
  }
  function exportJson() {
    K.track("csv_export");
    K.download("etf-flow-export-" + new Date().toISOString().slice(0, 10) + ".json", JSON.stringify({
      meta: { version: C.meta.version, generated: new Date().toISOString(), as_of: D.as_of },
      static: D, live: L.all(), health: L.health()
    }, null, 1), "application/json");
  }

  /* ---- 行情条 ---- */
  function renderTicker() {
    var f = D.fallback_quotes, pq = L.get("price"), g = L.get("global"), fng = L.get("fng"), fee = L.get("fees"), tip = L.get("tip"), prem = L.get("bn_prem");
    var bp = pq && pq.bitcoin ? pq.bitcoin : null;
    var ep = pq && pq.ethereum ? pq.ethereum : null;
    var mcap = g ? g.mcap : f.total_mcap_usd;
    var items = [
      ["BTC", bp ? fmtPx(bp.px) : "—", bp && bp.chg != null ? fmtChg(bp.chg) : "", bp && bp.chg != null ? cls(bp.chg) : ""],
      ["ETH", ep ? fmtPx(ep.px) : "—", ep && ep.chg != null ? fmtChg(ep.chg) : "", ep && ep.chg != null ? cls(ep.chg) : ""],
      [t("ticker_total"), fmtT(mcap), g ? fmtChg(g.chg) : "", g ? cls(g.chg) : ""],
      [t("ticker_dom"), g && g.dom ? fmt.fmtP(g.dom.btc, 1) : "—", "", ""],
      [t("ticker_fng"), fng && fng.now ? String(fng.now[1]) : "—", fng && fng.now ? fng.now[2] : "", ""],
      [t("ticker_funding"), prem && prem.BTCUSDT ? fmt.fmtN(prem.BTCUSDT.fr, 3) + "%" : "—", "", prem && prem.BTCUSDT ? cls(prem.BTCUSDT.fr) : ""],
      [t("ticker_fee"), fee ? fee.fastestFee + " sat/vB" : "—", "", ""],
      [t("ticker_block"), tip ? fmtInt(tip.height) : "—", "", ""],
      ["BTC ETF AUM", fmtM(D.stats.btc_aum_musd, true, 1), "", ""],
      ["ETH ETF AUM", fmtM(D.stats.eth_aum_musd, true, 1), "", ""]
    ].filter(function (r) { return r[1] !== "—"; });
    var h = '<div class="ticker-in">', i;
    for (i = 0; i < items.length; i++)
      h += '<span class="tk"><span class="lbl">' + esc(items[i][0]) + "</span><b>" + items[i][1] + "</b>" +
        (items[i][2] ? '<span class="' + items[i][3] + '">' + esc(items[i][2]) + "</span>" : "") + "</span>";
    h += '<span class="tk-live"><span>ETF ' + t("ticker_asof") + " " + D.as_of + "</span></span></div>";
    $("ticker").innerHTML = h;
  }

  /* ---- 页头 + 分区导航 ---- */
  function renderHeader() {
    var nav = "";
    if (C.flags.sticky_nav && C.nav) {
      nav = '<nav class="pnav" aria-label="sections">';
      for (var i = 0; i < C.nav.length; i++) nav += '<a href="#' + C.nav[i].id + '">' + esc(C.nav[i][lang] || C.nav[i].zh) + "</a>";
      nav += "</nav>";
    }
    $("header").innerHTML = '<a class="brand" href="./">' + brandMark() +
      '<span class="brand-name">' + esc(C.meta.site_name) + '</span><span class="brand-cn">' + esc(C.meta.site_name_cn) + "</span></a>" + nav +
      '<div class="seg lang" role="group" aria-label="language">' +
      '<button type="button" data-lang="zh" aria-pressed="' + (lang === "zh") + '">中文</button>' +
      '<button type="button" data-lang="en" aria-pressed="' + (lang === "en") + '">EN</button></div>';
    var btns = $("header").querySelectorAll("[data-lang]");
    for (var j = 0; j < btns.length; j++) btns[j].addEventListener("click", function () {
      if (this.dataset.lang === lang) return;
      lang = this.dataset.lang;
      try { localStorage.setItem(LS_LANG, lang); } catch (e) {}
      renderAll();
    });
  }
  function renderHero() {
    $("hero").innerHTML = '<div class="kicker">' + esc(t("hero_kicker")) + "</div><h1>" + esc(t("hero_h1")) + "</h1><p>" + esc(t("hero_sub")) + "</p>" +
      '<div class="hero-meta"><span class="chip">ETF ' + esc(t("ticker_asof")) + " " + esc(D.as_of) + "</span></div>";
  }
  function statCard(lbl, val, valCls, sub) {
    return '<div class="stat"><div class="lbl">' + esc(lbl) + '</div><div class="val ' + valCls + '">' + val + '</div><div class="sub">' + sub + "</div></div>";
  }
  function renderStats() {
    var s = D.stats;
    $("stats").innerHTML =
      statCard(t("stat_btc_last"), fmtM(btcLast[1]), cls(btcLast[1]), btcLast[0]) +
      statCard(t("stat_btc_cum"), fmtM(btcCum, true), "", t("stat_aum") + " " + fmtM(s.btc_aum_musd, true, 1) + " · " + fmtInt(s.btc_holdings_btc) + " BTC") +
      statCard(t("stat_eth_last"), fmtM(ethLast[1]), cls(ethLast[1]), ethLast[0]) +
      statCard(t("stat_eth_cum"), fmtM(ethCum, true), "", t("stat_aum") + " " + fmtM(s.eth_aum_musd, true, 1) + " · " + t("stat_since") + " " + s.eth_launch);
  }

  /* ---- 净流量主卡 ---- */
  function seg(group, items, cur) {
    var h = '<div class="seg" role="group" data-g="' + group + '">';
    for (var i = 0; i < items.length; i++)
      h += '<button type="button" data-v="' + items[i][0] + '" aria-pressed="' + (items[i][0] === cur) + '">' + esc(items[i][1]) + "</button>";
    return h + "</div>";
  }
  function renderFlowCard(key) {
    var card = $("card-" + key), st = chartState[key], rows = key === "btc" ? btc : eth;
    card.innerHTML = '<div class="card-head"><span class="card-title">' + esc(t("card_" + key + "_title")) + "</span>" +
      '<span class="chip">' + esc(t("card_chip_" + key)) + "</span>" +
      '<div class="ctl-row">' +
      seg("gran", [["d", t("ctl_d")], ["w", t("ctl_w")], ["m", t("ctl_m")]], st.gran) +
      seg("type", [["bar", t("ctl_bar")], ["line", t("ctl_line")], ["cum", t("ctl_cum")]], st.type) +
      seg("period", [["1m", t("per_1m")], ["3m", t("per_3m")], ["6m", t("per_6m")], ["1y", t("per_1y")], ["all", t("per_all")]], st.period) +
      "</div></div><div class=\"chart-box\" id=\"box-" + key + '"></div><div class="card-foot" id="foot-' + key + '"></div>';
    if (charts[key]) charts[key].destroy();
    charts[key] = F.mountFlow($("box-" + key), rows, {
      state: st, emptyText: t("empty"), aria: t("chart_aria"),
      tipNet: lang === "zh" ? "净流" : "NET", tipCum: lang === "zh" ? "累计" : "CUM",
      onStats: function (x) {
        $("foot-" + key).innerHTML = !x ? "" :
          '<span class="kv"><span class="k">' + t("foot_window") + '</span><span class="v ' + cls(x.net) + '">' + fmtM(x.net) + "</span></span>" +
          '<span class="kv"><span class="k">' + t("foot_maxin") + '</span><span class="v up">' + fmtM(x.maxin) + "</span></span>" +
          '<span class="kv"><span class="k">' + t("foot_maxout") + '</span><span class="v down">' + fmtM(x.maxout) + "</span></span>" +
          '<span class="kv"><span class="k">' + t("foot_days") + '</span><span class="v">' + x.days + "</span></span>";
      }
    });
    var segs = card.querySelectorAll(".seg[data-g] button");
    for (var i = 0; i < segs.length; i++) segs[i].addEventListener("click", function () {
      var g = this.parentNode.getAttribute("data-g"), v = this.getAttribute("data-v");
      if (chartState[key][g] === v) return;
      chartState[key][g] = v;
      var sib = this.parentNode.querySelectorAll("button");
      for (var j = 0; j < sib.length; j++) sib[j].setAttribute("aria-pressed", sib[j] === this ? "true" : "false");
      charts[key].setState({});
    });
  }

  /* ---- 占比卡 + 近 6 日表 ---- */
  function renderRatio() {
    var rs = D.ratio_series, lastR = rs[rs.length - 1], pk = rs[0], i;
    for (i = 1; i < rs.length; i++) if (rs[i][1] / rs[i][2] > pk[1] / pk[2]) pk = rs[i];
    var pct = function (r) { return (r[1] / r[2] * 100).toFixed(2) + "%"; };
    $("card-ratio").innerHTML = '<div class="card-head"><span class="card-title">' + esc(t("ratio_title")) + '</span><span class="chip">' + esc(t("ratio_sub")) + "</span></div>" +
      '<div class="chart-box" id="box-ratio"></div>' +
      '<div class="card-foot">' +
      '<span class="kv"><span class="k">' + t("ratio_now") + '</span><span class="v">' + pct(lastR) + "</span></span>" +
      '<span class="kv"><span class="k">' + t("ratio_peak") + '</span><span class="v">' + pct(pk) + " · " + pk[0] + "</span></span>" +
      '<span class="kv"><span class="k">' + t("ratio_crypto") + '</span><span class="v">$' + lastR[1].toFixed(2) + "T</span></span>" +
      '<span class="kv"><span class="k">' + t("ratio_equity") + '</span><span class="v">$' + lastR[2].toFixed(1) + "T</span></span></div>";
    if (charts.ratio) charts.ratio.destroy();
    charts.ratio = F.mountRatio($("box-ratio"), rs, { emptyText: t("empty"), aria: t("ratio_title"), lblCrypto: t("ratio_crypto"), lblEquity: t("ratio_equity") });
  }
  function renderTable() {
    var ethMap = new Map(eth), cm = M.cumMap(btc), i;
    var rows = btc.slice(-6).reverse(), body = "";
    for (i = 0; i < rows.length; i++) {
      var d = rows[i][0], bv = rows[i][1], ev = ethMap.has(d) ? ethMap.get(d) : null, tot = bv + (ev || 0);
      body += "<tr><td>" + d + '</td><td class="' + cls(bv) + '">' + fmtM(bv) + "</td>" +
        "<td" + (ev === null ? ">—" : ' class="' + cls(ev) + '">' + fmtM(ev)) + "</td>" +
        '<td class="' + cls(tot) + '">' + fmtM(tot) + "</td><td>" + fmtM(cm.get(d), true) + "</td></tr>";
    }
    $("card-table").innerHTML = '<div class="card-head"><span class="card-title">' + esc(t("table_title")) + "</span></div>" +
      '<div class="table-scroll"><table><thead><tr><th scope="col">' + t("th_date") + '</th><th scope="col">' + t("th_btc") +
      '</th><th scope="col">' + t("th_eth") + '</th><th scope="col">' + t("th_total") + '</th><th scope="col">' + t("th_cum") +
      "</th></tr></thead><tbody>" + body + "</tbody></table></div>";
  }

  /* ---- 公共数据区 ---- */
  function renderFreeZone(x) {
    $("free-head").innerHTML = '<div class="kicker">' + esc(t("free_kicker")) + "</div><h2>" + esc(t("free_h")) + '</h2><p class="sub">' + esc(t("free_sub")) + "</p>";
    var more = $("free-more"), label = $("free-more-label"), hint = $("free-more-hint");
    if (label) label.textContent = t("free_more");
    if (hint) hint.textContent = t("free_hint");
    if (more) more.open = freeOpen;
    P.renderFree(x, freeOpen);
    if (more) more.ontoggle = function () {
      freeOpen = more.open;
      P.renderFree(buildCtx(), freeOpen);
      observePanels(); settleBands();
    };
  }

  /* ---- 入口带定位：在最接近页面 1/3 与 2/3 的完整行之后各放一条。
   * 只使用整行卡或完整内容块作锚点，避免把半宽卡拆开造成桌面网格空洞。 ---- */
  function placeEntryBands() {
    var old = document.querySelectorAll(".entry-slot"), q;
    for (q = 0; q < old.length; q++) old[q].parentNode.removeChild(old[q]);
    var cands = [], i;
    function add(n) {
      if (n && n.offsetHeight > 0 && n.getClientRects().length && cands.indexOf(n) < 0) cands.push(n);
    }
    var fixed = document.querySelectorAll("#flows > .chart-card, #flows > .duo, #free-more, #deep-more");
    for (i = 0; i < fixed.length; i++) add(fixed[i]);
    /* 每个真实网格行只取最后一张：桌面端半宽卡成对，手机端每卡独占一行。 */
    function addRowEnds(id) {
      var g = $(id);
      if (!g) return;
      var cards = g.querySelectorAll(":scope > .pcard"), last = null, rowTop = null;
      for (var n = 0; n < cards.length; n++) {
        if (!cards[n].offsetHeight || !cards[n].getClientRects().length) continue;
        if (rowTop === null || Math.abs(cards[n].offsetTop - rowTop) < 2) last = cards[n];
        else { add(last); last = cards[n]; }
        rowTop = cards[n].offsetTop;
      }
      add(last);
    }
    addRowEnds("free-panels"); addRowEnds("free-panels-b");
    addRowEnds("preview-panel"); addRowEnds("deep-panels");
    if (cands.length < 2) return;
    function absBottom(el) {
      var y = el.offsetHeight;
      while (el) { y += el.offsetTop; el = el.offsetParent; }
      return y;
    }
    cands.sort(function (a, b) { return absBottom(a) - absBottom(b); });

    /* 先量出两条带子的实际高度，再预估插入后的总页高与中心位置。
       这样手机端较高的丰富入口也能稳定落在约 1/3、2/3。 */
    var probeAnchor = cands[cands.length - 1];
    slot(probeAnchor, "a"); slot(probeAnchor, "b");
    var hA = $("entry-a").offsetHeight, hB = $("entry-b").offsetHeight;
    old = document.querySelectorAll(".entry-slot");
    for (q = 0; q < old.length; q++) old[q].parentNode.removeChild(old[q]);

    var H = Math.max(document.documentElement.scrollHeight, document.body.scrollHeight);
    var bottoms = cands.map(absBottom), finalH = H + hA + hB;
    var ia = -1, ib = -1, best = Infinity;
    for (i = 0; i < cands.length - 1; i++) {
      for (var j = i + 1; j < cands.length; j++) {
        var ra = (bottoms[i] + hA / 2) / finalH;
        var rb = (bottoms[j] + hA + hB / 2) / finalH;
        var score = Math.abs(ra - 1 / 3) + Math.abs(rb - 2 / 3);
        if (score < best) { best = score; ia = i; ib = j; }
      }
    }
    if (ia < 0 || ib < 0) return;
    slot(cands[ia], "a");
    slot(cands[ib], "b");
  }
  function slot(anchor, variant) {
    var s = document.createElement("section");
    s.className = "entry entry-slot";
    s.id = "entry-" + variant;
    s.setAttribute("data-screen-label", "Entry " + variant.toUpperCase());
    anchor.parentNode.insertBefore(s, anchor.nextSibling);
    renderEntry("entry-" + variant, variant);
  }

  /* ---- 完整入口：同一注册链接，两处清晰呈现。 ---- */
  function renderEntry(hostId, variant) {
    var host = $(hostId);
    if (!host) return;
    var E = (C.links && C.links.entry) || {}, p = variant === "b" ? "entry_b_" : "entry_";
    var href = E.landing || "join.html";
    var bullets = String(t("entry_bullets")).split("|"), chips = "", i;
    for (i = 0; i < bullets.length; i++) if (bullets[i]) chips += '<span class="eb">' + esc(bullets[i]) + "</span>";
    host.innerHTML = '<a class="entry-band" data-entry="' + esc(E.id || "binance") + '" data-variant="' + esc(variant) + '" href="' + esc(href) + '">' +
      '<span class="eb-mark">' + baMark() + "</span>" +
      '<span class="eb-body"><span class="eb-kicker">' + esc(t(p + "kicker")) + "</span>" +
      '<span class="eb-h">' + esc(t(p + "h")) + "</span>" +
      '<span class="eb-sub">' + esc(t(p + "sub")) + "</span>" +
      (chips ? '<span class="eb-chips">' + chips + "</span>" : "") + "</span>" +
      '<span class="eb-go">' + esc(t(p + "cta")) + " →</span></a>" +
      (t("entry_risk") ? '<div class="entry-risk">' + esc(t("entry_risk")) + "</div>" : "");
    var a = host.querySelector("[data-entry]");
    if (a) a.addEventListener("click", function () { K.track("entry_click", (E.id || "binance") + ":" + variant); });
  }

  /* ---- 进阶区：全部公开；默认收起长内容，展开时才渲染，控制首屏长度。 ---- */
  function renderLocked(x) {
    var el = $("locked");
    if (!(C.premium && C.premium.enabled)) { el.innerHTML = ""; return; }
    el.innerHTML = '<div class="kicker">' + esc(t("lock_kicker")) + "</div><h2>" + esc(t("lock_h")) + "</h2>" +
      '<p class="sub">' + esc(t("lock_sub")) + "</p>" +
      '<div id="preview-panel" class="pgrid preview"></div>' +
      '<details class="deep-more" id="deep-more"' + (deepOpen ? " open" : "") + '><summary><span>' + esc(t("deep_more")) + '</span><small>' + esc(t("deep_hint")) + '</small></summary><div id="deep-panels" class="pgrid"></div></details>';
    P.renderPreview(x);
    if (deepOpen) P.renderDeep(x);
    var more = $("deep-more");
    if (more) more.addEventListener("toggle", function () {
      deepOpen = more.open;
      if (deepOpen) { P.renderDeep(buildCtx()); observePanels(); }
      else { var d = $("deep-panels"); if (d) d.innerHTML = ""; }
      settleBands();
    });
  }
  /* ---- 页脚 ---- */
  function renderFooter() {
    $("footer").innerHTML = '<div class="src">' + esc(t("foot_src")) + " " + D.as_of + "</div>" +
      "<div>" + esc(t("foot_note")) + " " + esc(t("foot_legal")) + "</div>" +
      '<div class="src">© 2026 ' + esc(C.meta.site_name) + " · v" + esc(C.meta.version) + "</div>";
  }

  /* ---- 埋点挂载点 ---- */
  function mountAnalytics() {
    if (!C.flags.analytics_enabled || !C.flags.analytics_src) return;
    var s = document.createElement("script"); s.defer = true; s.src = C.flags.analytics_src;
    document.head.appendChild(s);
  }
  /* ---- 面板曝光统计(纯本地计数,用于知道哪些数据最被需要) ---- */
  function observePanels() {
    if (!window.IntersectionObserver) return;
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { K.track("module_view", e.target.id.replace(/^p-/, "")); io.unobserve(e.target); } });
    }, { threshold: .35 });
    document.querySelectorAll(".pcard").forEach(function (n) { io.observe(n); });
  }

  (function () { var ns = document.querySelectorAll("noscript"); for (var i = 0; i < ns.length; i++) ns[i].parentNode.removeChild(ns[i]); })();

  function renderAll() {
    var x = buildCtx();
    syncMeta(); renderTicker(); renderHeader(); renderHero(); renderStats();
    renderFlowCard("btc"); renderFlowCard("eth"); renderRatio(); renderTable();
    renderFreeZone(x); renderLocked(x); renderFooter();
    observePanels();
    settleBands();
  }
  /* 图表与字体落定后再量几次(插入带子本身会小幅改变页高)。
     不依赖 requestAnimationFrame:页面在后台标签或不可见 iframe 里时 rAF 可能不触发。 */
  function settleBands() {
    placeEntryBands();
    setTimeout(placeEntryBands, 120);
    setTimeout(placeEntryBands, 800);
  }

  /* 实时数据到达后合并重绘(节流:一次爆发只重绘一次) */
  var pend = null;
  function onLive() {
    clearTimeout(pend);
    pend = setTimeout(function () {
      var x = buildCtx();
      renderTicker(); renderFreeZone(x); renderLocked(x); renderFooter(); observePanels();
      settleBands();
    }, 450);
  }

  renderAll();
  L.onUpdate(onLive);
  L.boot();
  mountAnalytics();
})();
