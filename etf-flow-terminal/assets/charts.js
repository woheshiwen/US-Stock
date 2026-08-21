/* ============================================================================
 * charts.js — 锁定区(纯 SVG 图表引擎,零依赖,维护勿改)
 * 颜色一律取自 :root token(真源 config.js);本文件不含任何写死颜色与文案。
 * 对外暴露 window.FlowCharts:mountFlow(净流量图)/ mountRatio(占比线图)。
 * ========================================================================== */
window.FlowCharts = (function () {
  "use strict";
  var doc = document;
  function css(n) { return getComputedStyle(doc.documentElement).getPropertyValue(n).trim(); }
  function debounce(fn, ms) { var t; return function () { clearTimeout(t); t = setTimeout(fn, ms); }; }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }

  /* ---- 数值格式(输入单位:百万美元) ---- */
  function fmtShort(v) {
    var a = Math.abs(v), s, u;
    if (a >= 1000) { s = (a / 1000).toFixed(a >= 10000 ? 1 : 2).replace(/\.?0+$/, ""); u = "B"; }
    else { s = a.toFixed(a > 0 && a < 10 ? 1 : 0).replace(/\.0$/, ""); u = "M"; }
    return (v < 0 ? "-" : "") + "$" + s + u;
  }
  function fmtSigned(v) { return (v > 0 ? "+" : "") + fmtShort(v); }
  function fmtAxis(v) { return v === 0 ? "0" : fmtShort(v); }

  function niceTicks(lo, hi, n) {
    var span = hi - lo; if (span <= 0) span = 1;
    var raw = span / n, mag = Math.pow(10, Math.floor(Math.log(raw) / Math.LN10)), norm = raw / mag;
    var step = (norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 2.5 ? 2.5 : norm <= 5 ? 5 : 10) * mag;
    var out = [], v = Math.ceil(lo / step) * step;
    for (; v <= hi + step * 1e-6; v += step) out.push(Math.abs(v) < step * 1e-6 ? 0 : v);
    return out;
  }

  /* ---- 聚合与取窗 ---- */
  function weekKey(iso) {
    var d = new Date(iso + "T00:00:00Z"), off = (d.getUTCDay() + 6) % 7;
    d.setUTCDate(d.getUTCDate() - off); return d.toISOString().slice(0, 10);
  }
  function agg(rows, gran) {
    if (gran === "d") return rows.slice();
    var m = new Map(), i, k, r;
    for (i = 0; i < rows.length; i++) { r = rows[i]; k = gran === "w" ? weekKey(r[0]) : r[0].slice(0, 7); m.set(k, (m.get(k) || 0) + r[1]); }
    return Array.from(m.entries());
  }
  var WIN = { "1m": 32, "3m": 93, "6m": 186, "1y": 367, "all": 1e9 };

  /* ---- 净流量图 ---- */
  function Flow(el, rows, opts) {
    this.el = el; this.rows = rows; this.o = opts; this.s = opts.state;
    this.ro = new ResizeObserver(debounce(this.render.bind(this), 150));
    this.ro.observe(el); this.render();
  }
  Flow.prototype.destroy = function () { this.ro.disconnect(); };
  Flow.prototype.setState = function (p) { var k; for (k in p) this.s[k] = p[k]; this.render(); };
  Flow.prototype.render = function () {
    var el = this.el, o = this.o, s = this.s, daily = this.rows;
    var last = daily[daily.length - 1][0], win;
    if (s.period === "all") win = daily.slice();
    else {
      var cut = new Date(new Date(last + "T00:00:00Z").getTime() - WIN[s.period] * 864e5).toISOString().slice(0, 10);
      win = daily.filter(function (r) { return r[0] >= cut; });
    }
    var flows = agg(win, s.gran), pts, i, c, cm;
    if (s.type === "cum") {
      c = 0; cm = new Map();
      for (i = 0; i < daily.length; i++) { c += daily[i][1]; cm.set(daily[i][0], c); }
      var b = new Map(), d, k;
      for (i = 0; i < win.length; i++) { d = win[i][0]; k = s.gran === "d" ? d : s.gran === "w" ? weekKey(d) : d.slice(0, 7); b.set(k, cm.get(d)); }
      pts = Array.from(b.entries()); this.cumMap = cm;
    } else {
      pts = flows;
      c = 0; cm = new Map();
      for (i = 0; i < daily.length; i++) { c += daily[i][1]; cm.set(daily[i][0], c); }
      this.cumMap = cm;
    }
    if (o.onStats) {
      if (!flows.length) o.onStats(null);
      else {
        var net = 0, mx = -1e18, mn = 1e18;
        for (i = 0; i < flows.length; i++) { net += flows[i][1]; if (flows[i][1] > mx) mx = flows[i][1]; if (flows[i][1] < mn) mn = flows[i][1]; }
        o.onStats({ net: net, maxin: mx, maxout: mn, days: win.length });
      }
    }
    if (!pts.length) { el.innerHTML = '<div class="state">' + esc(o.emptyText || "—") + "</div>"; return; }
    this.pts = pts; this.draw(pts);
  };
  Flow.prototype.draw = function (pts) {
    var el = this.el, o = this.o, s = this.s;
    var W = Math.max(el.clientWidth || 600, 280), narrow = W < 560, H = o.height || (narrow ? 250 : 310);
    var m = { t: 16, r: 58, b: 26, l: 8 }, pw = W - m.l - m.r, ph = H - m.t - m.b;
    var n = pts.length, i, v, lo = 0, hi = 0, minV = 1e18, maxV = -1e18;
    for (i = 0; i < n; i++) { v = pts[i][1]; if (v < minV) minV = v; if (v > maxV) maxV = v; }
    if (s.type === "cum") { lo = minV; hi = maxV; if (hi === lo) hi = lo + 1; var pad = (hi - lo) * .08; lo -= pad; hi += pad; }
    else { lo = Math.min(0, minV); hi = Math.max(0, maxV); if (hi === lo) hi = 1; var p2 = (hi - lo) * .07; if (lo < 0) lo -= p2; if (hi > 0) hi += p2; }
    function y(val) { return m.t + ph * (1 - (val - lo) / (hi - lo)); }
    var ink3 = css("--ink-3"), soft = css("--hairline-soft"), ink = css("--ink"), up = css("--up"), down = css("--down");
    var monoStyle = 'style="font-family:var(--font-mono);font-variant-numeric:tabular-nums"';
    var ticks = niceTicks(lo, hi, 4), g = "", yy;
    for (i = 0; i < ticks.length; i++) {
      yy = y(ticks[i]).toFixed(1);
      g += '<line x1="' + m.l + '" x2="' + (m.l + pw) + '" y1="' + yy + '" y2="' + yy + '" stroke="' + (ticks[i] === 0 ? ink3 : soft) + '" stroke-width="1" shape-rendering="crispEdges"/>' +
        '<text x="' + (W - m.r + 8) + '" y="' + (+yy + 3.5) + '" font-size="10.5" fill="' + ink3 + '" ' + monoStyle + ">" + fmtAxis(ticks[i]) + "</text>";
    }
    var step = pw / n, body = "";
    if (s.type === "bar") {
      var bw = Math.min(16, Math.max(1.4, step * .72)), rx = Math.min(2, bw / 3), x, h0, yv;
      for (i = 0; i < n; i++) {
        v = pts[i][1]; x = (m.l + i * step + (step - bw) / 2).toFixed(1);
        if (v >= 0) { yv = y(v); h0 = Math.max(y(0) - yv, v === 0 ? 0 : 1); }
        else { yv = y(0); h0 = Math.max(y(v) - y(0), 1); }
        body += '<rect x="' + x + '" y="' + yv.toFixed(1) + '" width="' + bw.toFixed(1) + '" height="' + h0.toFixed(1) + '" rx="' + rx + '" fill="' + (v >= 0 ? up : down) + '"/>';
      }
    } else {
      var ptStr = "", px, py;
      for (i = 0; i < n; i++) { px = (m.l + i * step + step / 2).toFixed(1); py = y(pts[i][1]).toFixed(1); ptStr += (i ? " " : "") + px + "," + py; }
      if (s.type === "cum") {
        var first = (m.l + step / 2).toFixed(1), lastX = (m.l + (n - 1) * step + step / 2).toFixed(1), base = (m.t + ph).toFixed(1);
        body += '<path d="M' + first + " " + base + " L" + ptStr.split(" ").join(" L") + " L" + lastX + " " + base + ' Z" fill="' + ink + '" opacity=".055"/>';
      }
      body += '<polyline points="' + ptStr + '" fill="none" stroke="' + ink + '" stroke-width="1.7" stroke-linejoin="round" stroke-linecap="round"/>';
      body += '<circle cx="' + (m.l + (n - 1) * step + step / 2).toFixed(1) + '" cy="' + y(pts[n - 1][1]).toFixed(1) + '" r="3" fill="' + ink + '"/>';
    }
    /* X 轴标签:短窗日粒度显示月-日,其余显示年-月 */
    var shortWin = (s.period === "1m" || s.period === "3m") && s.gran === "d";
    function xl(d) { return s.gran === "m" ? d.slice(2) : shortWin ? d.slice(5) : d.slice(2, 7); }
    var nl = Math.min(n, narrow ? 4 : 6), lbl = "", used = {}, idx, tx;
    for (i = 0; i < nl; i++) {
      idx = nl === 1 ? 0 : Math.round(i * (n - 1) / (nl - 1)); tx = xl(pts[idx][0]);
      if (used[tx]) continue; used[tx] = 1;
      var lx = m.l + idx * step + step / 2, anch = "middle";
      if (idx === 0 && lx < 22) { lx = m.l; anch = "start"; }
      lbl += '<text x="' + lx.toFixed(1) + '" y="' + (H - 7) + '" font-size="10.5" fill="' + ink3 + '" text-anchor="' + anch + '" ' + monoStyle + ">" + tx + "</text>";
    }
    var svg = '<svg viewBox="0 0 ' + W + " " + H + '" width="100%" height="' + H + '" role="img" aria-label="' + esc(o.aria || "") + '">' + g + body + lbl +
      '<line class="xh" x1="0" x2="0" y1="' + m.t + '" y2="' + (m.t + ph) + '" stroke="' + ink3 + '" stroke-dasharray="3 3" opacity="0"/>' +
      '<rect class="ov" x="' + m.l + '" y="' + m.t + '" width="' + pw + '" height="' + ph + '" fill="transparent"/></svg>' +
      '<div class="tip" role="status"></div>';
    el.innerHTML = svg;
    this.bindHover({ W: W, H: H, m: m, step: step, y: y });
  };
  Flow.prototype.bindHover = function (geo) {
    var el = this.el, o = this.o, s = this.s, pts = this.pts, cumMap = this.cumMap;
    var svg = el.querySelector("svg"), ov = el.querySelector(".ov"), xh = el.querySelector(".xh"), tip = el.querySelector(".tip");
    function move(e) {
      var r = svg.getBoundingClientRect(), sx = (e.clientX - r.left) * (geo.W / r.width);
      var i = Math.max(0, Math.min(pts.length - 1, Math.floor((sx - geo.m.l) / geo.step)));
      var p = pts[i], cx = geo.m.l + i * geo.step + geo.step / 2;
      xh.setAttribute("x1", cx); xh.setAttribute("x2", cx); xh.setAttribute("opacity", ".6");
      var lines = "<div>" + esc(p[0]) + "</div>";
      if (s.type === "cum") lines += "<div><b>" + o.tipCum + " " + fmtShort(p[1]) + "</b></div>";
      else {
        lines += "<div><b>" + o.tipNet + " " + fmtSigned(p[1]) + "</b></div>";
        if (s.gran === "d" && cumMap.has(p[0])) lines += '<div style="opacity:.7">' + o.tipCum + " " + fmtShort(cumMap.get(p[0])) + "</div>";
      }
      tip.innerHTML = lines;
      var ex = e.clientX - el.getBoundingClientRect().left, ey = e.clientY - el.getBoundingClientRect().top;
      var tw = tip.offsetWidth || 120;
      tip.style.left = Math.min(Math.max(4, ex + 14), el.clientWidth - tw - 4) + "px";
      tip.style.top = Math.max(0, ey - 48) + "px";
      tip.classList.add("show");
    }
    function leave() { xh.setAttribute("opacity", "0"); tip.classList.remove("show"); }
    ov.addEventListener("pointermove", move);
    ov.addEventListener("pointerleave", leave);
  };

  /* ---- 占比线图(加密市值 ÷ 美股市值) ---- */
  function Ratio(el, series, opts) {
    this.el = el; this.series = series; this.o = opts;
    this.ro = new ResizeObserver(debounce(this.render.bind(this), 150));
    this.ro.observe(el); this.render();
  }
  Ratio.prototype.destroy = function () { this.ro.disconnect(); };
  Ratio.prototype.render = function () {
    var el = this.el, o = this.o, rows = this.series;
    if (!rows.length) { el.innerHTML = '<div class="state">' + esc(o.emptyText || "—") + "</div>"; return; }
    var pts = rows.map(function (r) { return [r[0], r[1] / r[2] * 100, r[1], r[2]]; });
    var W = Math.max(el.clientWidth || 500, 260), H = o.height || 236;
    var m = { t: 14, r: 46, b: 24, l: 8 }, pw = W - m.l - m.r, ph = H - m.t - m.b;
    var n = pts.length, i, lo = 1e18, hi = -1e18;
    for (i = 0; i < n; i++) { if (pts[i][1] < lo) lo = pts[i][1]; if (pts[i][1] > hi) hi = pts[i][1]; }
    var pad = (hi - lo) * .12 || 1; lo -= pad; hi += pad; if (lo < 0) lo = 0;
    function y(v) { return m.t + ph * (1 - (v - lo) / (hi - lo)); }
    var ink3 = css("--ink-3"), soft = css("--hairline-soft"), ink = css("--ink");
    var monoStyle = 'style="font-family:var(--font-mono);font-variant-numeric:tabular-nums"';
    var ticks = niceTicks(lo, hi, 3), g = "", yy;
    for (i = 0; i < ticks.length; i++) {
      yy = y(ticks[i]).toFixed(1);
      g += '<line x1="' + m.l + '" x2="' + (m.l + pw) + '" y1="' + yy + '" y2="' + yy + '" stroke="' + soft + '" stroke-width="1" shape-rendering="crispEdges"/>' +
        '<text x="' + (W - m.r + 8) + '" y="' + (+yy + 3.5) + '" font-size="10.5" fill="' + ink3 + '" ' + monoStyle + ">" + (Math.round(ticks[i] * 10) / 10) + "%</text>";
    }
    var step = pw / n, ptStr = "";
    for (i = 0; i < n; i++) ptStr += (i ? " " : "") + (m.l + i * step + step / 2).toFixed(1) + "," + y(pts[i][1]).toFixed(1);
    var first = (m.l + step / 2).toFixed(1), lastX = (m.l + (n - 1) * step + step / 2).toFixed(1), base = (m.t + ph).toFixed(1);
    var body = '<path d="M' + first + " " + base + " L" + ptStr.split(" ").join(" L") + " L" + lastX + " " + base + ' Z" fill="' + ink + '" opacity=".05"/>' +
      '<polyline points="' + ptStr + '" fill="none" stroke="' + ink + '" stroke-width="1.7" stroke-linejoin="round"/>' +
      '<circle cx="' + lastX + '" cy="' + y(pts[n - 1][1]).toFixed(1) + '" r="3" fill="' + ink + '"/>';
    var nl = 5, lbl = "", used = {}, idx, tx;
    for (i = 0; i < nl; i++) {
      idx = Math.round(i * (n - 1) / (nl - 1)); tx = pts[idx][0].slice(2);
      if (used[tx]) continue; used[tx] = 1;
      var lx = m.l + idx * step + step / 2, anch = "middle";
      if (idx === 0 && lx < 22) { lx = m.l; anch = "start"; }
      lbl += '<text x="' + lx.toFixed(1) + '" y="' + (H - 6) + '" font-size="10.5" fill="' + ink3 + '" text-anchor="' + anch + '" ' + monoStyle + ">" + tx + "</text>";
    }
    el.innerHTML = '<svg viewBox="0 0 ' + W + " " + H + '" width="100%" height="' + H + '" role="img" aria-label="' + esc(o.aria || "") + '">' + g + body + lbl +
      '<line class="xh" x1="0" x2="0" y1="' + m.t + '" y2="' + (m.t + ph) + '" stroke="' + ink3 + '" stroke-dasharray="3 3" opacity="0"/>' +
      '<rect class="ov" x="' + m.l + '" y="' + m.t + '" width="' + pw + '" height="' + ph + '" fill="transparent"/></svg><div class="tip" role="status"></div>';
    var svg = el.querySelector("svg"), ov = el.querySelector(".ov"), xh = el.querySelector(".xh"), tip = el.querySelector(".tip");
    function fmtT(v) { return "$" + (Math.round(v * 100) / 100) + "T"; }
    ov.addEventListener("pointermove", function (e) {
      var r = svg.getBoundingClientRect(), sx = (e.clientX - r.left) * (W / r.width);
      var i2 = Math.max(0, Math.min(n - 1, Math.floor((sx - m.l) / step))), p = pts[i2];
      var cx = m.l + i2 * step + step / 2;
      xh.setAttribute("x1", cx); xh.setAttribute("x2", cx); xh.setAttribute("opacity", ".6");
      tip.innerHTML = "<div>" + esc(p[0]) + "</div><div><b>" + (Math.round(p[1] * 100) / 100) + "%</b></div>" +
        '<div style="opacity:.7">' + esc(o.lblCrypto) + " " + fmtT(p[2]) + " · " + esc(o.lblEquity) + " " + fmtT(p[3]) + "</div>";
      var ex = e.clientX - el.getBoundingClientRect().left, ey = e.clientY - el.getBoundingClientRect().top;
      var tw = tip.offsetWidth || 140;
      tip.style.left = Math.min(Math.max(4, ex + 14), el.clientWidth - tw - 4) + "px";
      tip.style.top = Math.max(0, ey - 52) + "px";
      tip.classList.add("show");
    });
    ov.addEventListener("pointerleave", function () { xh.setAttribute("opacity", "0"); tip.classList.remove("show"); });
  };

  /* ---- 双轴叠加图(月度净流柱 × 价格线;衍生面板用) ---- */
  function Dual(el, flows, price, opts) {
    this.el = el; this.flows = flows; this.price = price; this.o = opts;
    this.ro = new ResizeObserver(debounce(this.render.bind(this), 150));
    this.ro.observe(el); this.render();
  }
  Dual.prototype.destroy = function () { this.ro.disconnect(); };
  Dual.prototype.render = function () {
    var el = this.el, o = this.o, fl = this.flows, pr = this.price;
    if (!pr.length || !fl.length) { el.innerHTML = '<div class="state">' + esc(o.emptyText || "—") + "</div>"; return; }
    var W = Math.max(el.clientWidth || 600, 280), narrow = W < 560, H = narrow ? 250 : 300;
    var m = { t: 16, r: 58, b: 26, l: 50 }, pw = W - m.l - m.r, ph = H - m.t - m.b, n = pr.length, i, v;
    var fLo = 0, fHi = 0;
    for (i = 0; i < n; i++) { v = fl[i][1]; if (v < fLo) fLo = v; if (v > fHi) fHi = v; }
    if (fHi === fLo) fHi = 1; var fp = (fHi - fLo) * .07; if (fLo < 0) fLo -= fp; if (fHi > 0) fHi += fp;
    function yF(val) { return m.t + ph * (1 - (val - fLo) / (fHi - fLo)); }
    var pLo = 1e18, pHi = -1e18;
    for (i = 0; i < n; i++) { if (pr[i][1] < pLo) pLo = pr[i][1]; if (pr[i][1] > pHi) pHi = pr[i][1]; }
    var pp = (pHi - pLo) * .12 || 1; pLo -= pp; pHi += pp;
    function yP(val) { return m.t + ph * (1 - (val - pLo) / (pHi - pLo)); }
    var ink3 = css("--ink-3"), soft = css("--hairline-soft"), ink = css("--ink"), up = css("--up"), down = css("--down");
    var monoStyle = 'style="font-family:var(--font-mono);font-variant-numeric:tabular-nums"';
    var g = "", ticks = niceTicks(fLo, fHi, 4), yy;
    for (i = 0; i < ticks.length; i++) {
      yy = yF(ticks[i]).toFixed(1);
      g += '<line x1="' + m.l + '" x2="' + (m.l + pw) + '" y1="' + yy + '" y2="' + yy + '" stroke="' + (ticks[i] === 0 ? ink3 : soft) + '" stroke-width="1" shape-rendering="crispEdges"/>' +
        '<text x="' + (W - m.r + 8) + '" y="' + (+yy + 3.5) + '" font-size="10.5" fill="' + ink3 + '" ' + monoStyle + ">" + fmtAxis(ticks[i]) + "</text>";
    }
    var pTicks = niceTicks(pLo, pHi, 3);
    for (i = 0; i < pTicks.length; i++) {
      yy = yP(pTicks[i]).toFixed(1);
      g += '<text x="' + (m.l - 8) + '" y="' + (+yy + 3.5) + '" font-size="10.5" fill="' + ink3 + '" text-anchor="end" ' + monoStyle + '>$' + Math.round(pTicks[i] / 1000) + "K</text>";
    }
    var step = pw / n, bw = Math.min(14, Math.max(2, step * .6)), body = "", x, yv, h0;
    for (i = 0; i < n; i++) {
      v = fl[i][1]; x = (m.l + i * step + (step - bw) / 2).toFixed(1);
      if (v >= 0) { yv = yF(v); h0 = Math.max(yF(0) - yv, v === 0 ? 0 : 1); }
      else { yv = yF(0); h0 = Math.max(yF(v) - yF(0), 1); }
      body += '<rect x="' + x + '" y="' + yv.toFixed(1) + '" width="' + bw.toFixed(1) + '" height="' + h0.toFixed(1) + '" rx="1.5" fill="' + (v >= 0 ? up : down) + '" opacity=".8"/>';
    }
    var pts = "";
    for (i = 0; i < n; i++) pts += (i ? " " : "") + (m.l + i * step + step / 2).toFixed(1) + "," + yP(pr[i][1]).toFixed(1);
    body += '<polyline points="' + pts + '" fill="none" stroke="' + ink + '" stroke-width="1.8" stroke-linejoin="round"/>' +
      '<circle cx="' + (m.l + (n - 1) * step + step / 2).toFixed(1) + '" cy="' + yP(pr[n - 1][1]).toFixed(1) + '" r="3" fill="' + ink + '"/>';
    var nl = Math.min(n, narrow ? 4 : 6), lbl = "", used = {}, idx, tx;
    for (i = 0; i < nl; i++) {
      idx = nl === 1 ? 0 : Math.round(i * (n - 1) / (nl - 1)); tx = pr[idx][0].slice(2);
      if (used[tx]) continue; used[tx] = 1;
      var lx = m.l + idx * step + step / 2, anch = "middle";
      if (idx === 0 && lx < m.l + 16) { lx = m.l; anch = "start"; }
      lbl += '<text x="' + lx.toFixed(1) + '" y="' + (H - 7) + '" font-size="10.5" fill="' + ink3 + '" text-anchor="' + anch + '" ' + monoStyle + ">" + tx + "</text>";
    }
    el.innerHTML = '<svg viewBox="0 0 ' + W + " " + H + '" width="100%" height="' + H + '" role="img" aria-label="' + esc(o.aria || "") + '">' + g + body + lbl +
      '<line class="xh" x1="0" x2="0" y1="' + m.t + '" y2="' + (m.t + ph) + '" stroke="' + ink3 + '" stroke-dasharray="3 3" opacity="0"/>' +
      '<rect class="ov" x="' + m.l + '" y="' + m.t + '" width="' + pw + '" height="' + ph + '" fill="transparent"/></svg><div class="tip" role="status"></div>';
    var svg = el.querySelector("svg"), ov = el.querySelector(".ov"), xh = el.querySelector(".xh"), tip = el.querySelector(".tip");
    ov.addEventListener("pointermove", function (e) {
      var r = svg.getBoundingClientRect(), sx = (e.clientX - r.left) * (W / r.width);
      var i2 = Math.max(0, Math.min(n - 1, Math.floor((sx - m.l) / step))), cx = m.l + i2 * step + step / 2;
      xh.setAttribute("x1", cx); xh.setAttribute("x2", cx); xh.setAttribute("opacity", ".6");
      tip.innerHTML = "<div>" + esc(pr[i2][0]) + "</div><div><b>" + o.tipNet + " " + fmtSigned(fl[i2][1]) + "</b></div>" +
        '<div style="opacity:.7">BTC $' + Math.round(pr[i2][1]).toLocaleString("en-US") + "</div>";
      var ex = e.clientX - el.getBoundingClientRect().left, ey = e.clientY - el.getBoundingClientRect().top, tw = tip.offsetWidth || 130;
      tip.style.left = Math.min(Math.max(4, ex + 14), el.clientWidth - tw - 4) + "px";
      tip.style.top = Math.max(0, ey - 52) + "px"; tip.classList.add("show");
    });
    ov.addEventListener("pointerleave", function () { xh.setAttribute("opacity", "0"); tip.classList.remove("show"); });
  };

  /* ---- 双线同轴图(BTC × ETH 累计赛马) ---- */
  function Lines(el, a, b, opts) {
    this.el = el; this.a = a; this.b = b; this.o = opts;
    this.ro = new ResizeObserver(debounce(this.render.bind(this), 150));
    this.ro.observe(el); this.render();
  }
  Lines.prototype.destroy = function () { this.ro.disconnect(); };
  Lines.prototype.render = function () {
    var el = this.el, o = this.o, A = this.a.rows, bMap = new Map(this.b.rows);
    if (!A.length) { el.innerHTML = '<div class="state">' + esc(o.emptyText || "—") + "</div>"; return; }
    var W = Math.max(el.clientWidth || 600, 280), narrow = W < 560, H = narrow ? 240 : 280;
    var m = { t: 16, r: 58, b: 26, l: 8 }, pw = W - m.l - m.r, ph = H - m.t - m.b, n = A.length, i, v;
    var lo = 0, hi = -1e18;
    for (i = 0; i < n; i++) { v = A[i][1]; if (v > hi) hi = v; if (v < lo) lo = v; }
    bMap.forEach(function (val) { if (val > hi) hi = val; if (val < lo) lo = val; });
    if (hi === lo) hi = lo + 1; var pad = (hi - lo) * .08; hi += pad; if (lo < 0) lo -= pad;
    function y(val) { return m.t + ph * (1 - (val - lo) / (hi - lo)); }
    var ink3 = css("--ink-3"), soft = css("--hairline-soft"), ink = css("--ink");
    var monoStyle = 'style="font-family:var(--font-mono);font-variant-numeric:tabular-nums"';
    var ticks = niceTicks(lo, hi, 4), g = "", yy;
    for (i = 0; i < ticks.length; i++) {
      yy = y(ticks[i]).toFixed(1);
      g += '<line x1="' + m.l + '" x2="' + (m.l + pw) + '" y1="' + yy + '" y2="' + yy + '" stroke="' + (ticks[i] === 0 ? ink3 : soft) + '" stroke-width="1" shape-rendering="crispEdges"/>' +
        '<text x="' + (W - m.r + 8) + '" y="' + (+yy + 3.5) + '" font-size="10.5" fill="' + ink3 + '" ' + monoStyle + ">" + fmtAxis(ticks[i]) + "</text>";
    }
    var step = pw / n, pa = "", pb = "", xB0 = -1;
    for (i = 0; i < n; i++) {
      var cx = (m.l + i * step + step / 2).toFixed(1);
      pa += (i ? " " : "") + cx + "," + y(A[i][1]).toFixed(1);
      if (bMap.has(A[i][0])) { if (xB0 < 0) xB0 = i; pb += (pb ? " " : "") + cx + "," + y(bMap.get(A[i][0])).toFixed(1); }
    }
    var body = '<polyline points="' + pa + '" fill="none" stroke="' + ink + '" stroke-width="1.8" stroke-linejoin="round"/>';
    if (pb) body += '<polyline points="' + pb + '" fill="none" stroke="' + ink + '" stroke-width="1.6" stroke-dasharray="5 3" opacity=".72" stroke-linejoin="round"/>';
    var lastY = y(A[n - 1][1]).toFixed(1), lastX = (m.l + (n - 1) * step + step / 2).toFixed(1);
    body += '<circle cx="' + lastX + '" cy="' + lastY + '" r="3" fill="' + ink + '"/>' +
      '<text x="' + (+lastX + 7) + '" y="' + (+lastY - 6) + '" font-size="10" font-weight="600" fill="' + ink + '" ' + monoStyle + ">" + esc(this.a.label) + "</text>";
    if (pb) {
      var lastB = bMap.get(A[n - 1][0]);
      if (lastB != null) {
        var byy = y(lastB).toFixed(1);
        body += '<circle cx="' + lastX + '" cy="' + byy + '" r="3" fill="' + ink + '" opacity=".72"/>' +
          '<text x="' + (+lastX + 7) + '" y="' + (+byy + 12) + '" font-size="10" font-weight="600" fill="' + ink + '" opacity=".72" ' + monoStyle + ">" + esc(this.b.label) + "</text>";
      }
    }
    var nl = Math.min(n, narrow ? 4 : 6), lbl = "", used = {}, idx, tx;
    for (i = 0; i < nl; i++) {
      idx = nl === 1 ? 0 : Math.round(i * (n - 1) / (nl - 1)); tx = A[idx][0].slice(2);
      if (used[tx]) continue; used[tx] = 1;
      var lx = m.l + idx * step + step / 2, anch = "middle";
      if (idx === 0 && lx < 22) { lx = m.l; anch = "start"; }
      lbl += '<text x="' + lx.toFixed(1) + '" y="' + (H - 7) + '" font-size="10.5" fill="' + ink3 + '" text-anchor="' + anch + '" ' + monoStyle + ">" + tx + "</text>";
    }
    el.innerHTML = '<svg viewBox="0 0 ' + W + " " + H + '" width="100%" height="' + H + '" role="img" aria-label="' + esc(o.aria || "") + '">' + g + body + lbl +
      '<line class="xh" x1="0" x2="0" y1="' + m.t + '" y2="' + (m.t + ph) + '" stroke="' + ink3 + '" stroke-dasharray="3 3" opacity="0"/>' +
      '<rect class="ov" x="' + m.l + '" y="' + m.t + '" width="' + pw + '" height="' + ph + '" fill="transparent"/></svg><div class="tip" role="status"></div>';
    var svg = el.querySelector("svg"), ov = el.querySelector(".ov"), xh = el.querySelector(".xh"), tip = el.querySelector(".tip");
    var la = this.a.label, lb2 = this.b.label;
    ov.addEventListener("pointermove", function (e) {
      var r = svg.getBoundingClientRect(), sx = (e.clientX - r.left) * (W / r.width);
      var i2 = Math.max(0, Math.min(n - 1, Math.floor((sx - m.l) / step))), cx2 = m.l + i2 * step + step / 2;
      xh.setAttribute("x1", cx2); xh.setAttribute("x2", cx2); xh.setAttribute("opacity", ".6");
      var h = "<div>" + esc(A[i2][0]) + "</div><div><b>" + la + " " + fmtShort(A[i2][1]) + "</b></div>";
      if (bMap.has(A[i2][0])) h += '<div style="opacity:.7">' + lb2 + " " + fmtShort(bMap.get(A[i2][0])) + "</div>";
      tip.innerHTML = h;
      var ex = e.clientX - el.getBoundingClientRect().left, ey = e.clientY - el.getBoundingClientRect().top, tw = tip.offsetWidth || 120;
      tip.style.left = Math.min(Math.max(4, ex + 14), el.clientWidth - tw - 4) + "px";
      tip.style.top = Math.max(0, ey - 52) + "px"; tip.classList.add("show");
    });
    ov.addEventListener("pointerleave", function () { xh.setAttribute("opacity", "0"); tip.classList.remove("show"); });
  };

  return {
    mountFlow: function (el, rows, opts) { return new Flow(el, rows, opts); },
    mountRatio: function (el, series, opts) { return new Ratio(el, series, opts); },
    mountDual: function (el, flows, price, opts) { return new Dual(el, flows, price, opts); },
    mountLines: function (el, a, b, opts) { return new Lines(el, a, b, opts); },
    fmtShort: fmtShort, fmtSigned: fmtSigned
  };
})();
