/* ============================================================================
 * charts2.js — 锁定区(扩展图表原语,纯 SVG/DOM,零依赖,维护勿改)
 * ----------------------------------------------------------------------------
 * charts.js 提供 4 种主图;本文件补齐进阶面板所需的 11 种:
 *   gauge 仪表 / donut 环形 / heat 热力网格 / hist 直方图 / spark 迷你线
 *   hbars 横条榜 / scatter 散点 / multi 多线(可双轴)/ underwater 水下回撤
 *   strip 色带 / bullet 进度条
 * 颜色一律取 :root token(真源 config.js),文案一律由调用方传入。
 * ========================================================================== */
window.FlowCharts2 = (function () {
  "use strict";
  function css(n) { return getComputedStyle(document.documentElement).getPropertyValue(n).trim(); }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  function debounce(fn, ms) { var t; return function () { clearTimeout(t); t = setTimeout(fn, ms); }; }
  var MONO = 'style="font-family:var(--font-mono);font-variant-numeric:tabular-nums"';

  function niceTicks(lo, hi, n) {
    var span = hi - lo; if (span <= 0) span = 1;
    var raw = span / n, mag = Math.pow(10, Math.floor(Math.log(raw) / Math.LN10)), norm = raw / mag;
    var step = (norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 2.5 ? 2.5 : norm <= 5 ? 5 : 10) * mag;
    var out = [], v = Math.ceil(lo / step) * step;
    for (; v <= hi + step * 1e-6; v += step) out.push(Math.abs(v) < step * 1e-6 ? 0 : v);
    return out;
  }
  /* 双向色阶:v/scale ∈ [-1,1] → 绿(流入)/红(流出),0 附近接近底色 */
  function divColor(v, scale) {
    var t = Math.max(-1, Math.min(1, scale ? v / scale : 0));
    var a = Math.pow(Math.abs(t), .62);
    if (Math.abs(t) < .008) return "color-mix(in oklab, var(--bg-track) 55%, transparent)";
    return "color-mix(in oklab, " + (t > 0 ? "var(--up)" : "var(--down)") + " " + (a * 68 + 6).toFixed(1) + "%, var(--bg-surface))";
  }
  /* 单向色阶(用于计数类热力) */
  function seqColor(t) {
    var a = Math.pow(Math.max(0, Math.min(1, t)), .7);
    return "color-mix(in oklab, var(--ink) " + (a * 72 + 4).toFixed(1) + "%, var(--bg-surface))";
  }
  /* 通用 hover 提示层(SVG 图共用) */
  function tipLayer(el) {
    var tip = el.querySelector(".tip");
    return {
      show: function (e, html) {
        tip.innerHTML = html;
        var r = el.getBoundingClientRect(), ex = e.clientX - r.left, ey = e.clientY - r.top;
        var tw = tip.offsetWidth || 130;
        tip.style.left = Math.min(Math.max(4, ex + 14), el.clientWidth - tw - 4) + "px";
        tip.style.top = Math.max(0, ey - 52) + "px";
        tip.classList.add("show");
      },
      hide: function () { tip.classList.remove("show"); }
    };
  }
  function autoRender(inst) {
    inst.ro = new ResizeObserver(debounce(inst.render.bind(inst), 160));
    inst.ro.observe(inst.el); inst.render();
    inst.destroy = function () { this.ro.disconnect(); };
    return inst;
  }

  /* ================= 1. 半圆仪表(恐慌贪婪等 0–100 指数) ================= */
  function gauge(el, o) {
    var W = Math.max(el.clientWidth || 260, 200), H = o.height || 148;
    var cx = W / 2, cy = H - 18, R = Math.min(W / 2 - 16, H - 34), ink3 = css("--ink-3");
    var v = Math.max(o.min, Math.min(o.max, o.value)), t = (v - o.min) / (o.max - o.min);
    function pt(f, r) { var a = Math.PI * (1 - f); return [cx + Math.cos(a) * r, cy - Math.sin(a) * r]; }
    function arc(f0, f1, r, w, color) {
      var A = pt(f0, r), B = pt(f1, r);
      return '<path d="M' + A[0].toFixed(1) + " " + A[1].toFixed(1) + " A" + r + " " + r + " 0 0 1 " + B[0].toFixed(1) + " " + B[1].toFixed(1) +
        '" fill="none" stroke="' + color + '" stroke-width="' + w + '" stroke-linecap="butt"/>';
    }
    var bands = o.bands || [[0, .25, "var(--down)"], [.25, .45, "color-mix(in oklab, var(--down) 45%, var(--ink-3))"], [.45, .55, "var(--ink-3)"], [.55, .75, "color-mix(in oklab, var(--up) 45%, var(--ink-3))"], [.75, 1, "var(--up)"]];
    var s = "", i;
    for (i = 0; i < bands.length; i++) s += arc(bands[i][0], bands[i][1], R, 10, bands[i][2]);
    var N = pt(t, R - 2), C = pt(t, 12);
    s += '<line x1="' + C[0].toFixed(1) + '" y1="' + C[1].toFixed(1) + '" x2="' + N[0].toFixed(1) + '" y2="' + N[1].toFixed(1) +
      '" stroke="var(--ink)" stroke-width="2.2" stroke-linecap="round"/><circle cx="' + cx + '" cy="' + cy + '" r="4" fill="var(--ink)"/>';
    s += '<text x="' + cx + '" y="' + (cy - R * .42) + '" text-anchor="middle" font-size="30" font-weight="700" fill="var(--ink)" ' + MONO + ">" + esc(o.valueText || Math.round(v)) + "</text>";
    if (o.label) s += '<text x="' + cx + '" y="' + (cy - R * .42 + 18) + '" text-anchor="middle" font-size="11" fill="' + ink3 + '" ' + MONO + ">" + esc(o.label) + "</text>";
    s += '<text x="' + (cx - R) + '" y="' + (cy + 13) + '" font-size="10" fill="' + ink3 + '" ' + MONO + ">" + esc(o.minLabel || o.min) + "</text>" +
      '<text x="' + (cx + R) + '" y="' + (cy + 13) + '" text-anchor="end" font-size="10" fill="' + ink3 + '" ' + MONO + ">" + esc(o.maxLabel || o.max) + "</text>";
    el.innerHTML = '<svg viewBox="0 0 ' + W + " " + H + '" width="100%" height="' + H + '" role="img" aria-label="' + esc(o.aria || "") + '">' + s + "</svg>";
  }
  function mountGauge(el, o) { return autoRender({ el: el, render: function () { gauge(this.el, o); }, update: function (n) { o = Object.assign(o, n); gauge(el, o); } }); }

  /* ================= 2. 环形占比(市值主导率等) ================= */
  function donut(el, slices, o) {
    o = o || {};
    var W = Math.max(el.clientWidth || 240, 180), H = o.height || 168;
    var cx = W / 2, cy = H / 2, R = Math.min(W, H) / 2 - 6, r0 = R * .62;
    var tot = slices.reduce(function (a, s) { return a + s.v; }, 0) || 1, acc = 0, s = "", i;
    for (i = 0; i < slices.length; i++) {
      var f0 = acc / tot, f1 = (acc += slices[i].v) / tot;
      var a0 = f0 * 2 * Math.PI - Math.PI / 2, a1 = f1 * 2 * Math.PI - Math.PI / 2;
      var big = f1 - f0 > .5 ? 1 : 0;
      var x0 = cx + Math.cos(a0) * R, y0 = cy + Math.sin(a0) * R, x1 = cx + Math.cos(a1) * R, y1 = cy + Math.sin(a1) * R;
      var X0 = cx + Math.cos(a1) * r0, Y0 = cy + Math.sin(a1) * r0, X1 = cx + Math.cos(a0) * r0, Y1 = cy + Math.sin(a0) * r0;
      s += '<path d="M' + x0.toFixed(1) + " " + y0.toFixed(1) + " A" + R + " " + R + " 0 " + big + " 1 " + x1.toFixed(1) + " " + y1.toFixed(1) +
        " L" + X0.toFixed(1) + " " + Y0.toFixed(1) + " A" + r0 + " " + r0 + " 0 " + big + " 0 " + X1.toFixed(1) + " " + Y1.toFixed(1) + ' Z" fill="' +
        (slices[i].c || seqColor(1 - i / Math.max(1, slices.length))) + '"><title>' + esc(slices[i].k) + " " + (slices[i].v / tot * 100).toFixed(1) + "%</title></path>";
    }
    if (o.centerTop) s += '<text x="' + cx + '" y="' + (cy - 2) + '" text-anchor="middle" font-size="20" font-weight="700" fill="var(--ink)" ' + MONO + ">" + esc(o.centerTop) + "</text>";
    if (o.centerSub) s += '<text x="' + cx + '" y="' + (cy + 14) + '" text-anchor="middle" font-size="10" fill="' + css("--ink-3") + '" ' + MONO + ">" + esc(o.centerSub) + "</text>";
    el.innerHTML = '<svg viewBox="0 0 ' + W + " " + H + '" width="100%" height="' + H + '" role="img" aria-label="' + esc(o.aria || "") + '">' + s + "</svg>";
  }
  function mountDonut(el, slices, o) { return autoRender({ el: el, render: function () { donut(this.el, slices, o); } }); }

  /* ================= 3. 热力网格(日历 / 月度矩阵) ================= */
  /* rows: [{ label, cells:[{txt,v,title} | null] }], o.cols: 列表头数组 */
  function heat(el, rows, o) {
    o = o || {};
    var scale = o.scale || Math.max.apply(null, [1].concat(rows.reduce(function (a, r) {
      return a.concat(r.cells.map(function (c) { return c ? Math.abs(c.v) : 0; }));
    }, [])));
    var h = '<div class="heat" style="grid-template-columns:' + (o.labelWidth || "58px") + " repeat(" + o.cols.length + ",minmax(0,1fr))\">";
    h += '<div class="hh"></div>';
    for (var i = 0; i < o.cols.length; i++) h += '<div class="hh">' + esc(o.cols[i]) + "</div>";
    for (i = 0; i < rows.length; i++) {
      h += '<div class="hl">' + esc(rows[i].label) + "</div>";
      for (var j = 0; j < o.cols.length; j++) {
        var c = rows[i].cells[j];
        if (!c) { h += '<div class="hc off"></div>'; continue; }
        var bg = o.sequential ? seqColor(Math.abs(c.v) / scale) : divColor(c.v, scale);
        h += '<div class="hc" style="background:' + bg + '" title="' + esc(c.title || "") + '"><span>' + esc(c.txt) + "</span></div>";
      }
    }
    el.innerHTML = h + "</div>";
  }

  /* ================= 4. 直方图(分布) ================= */
  function hist(el, H0, o) {
    o = o || {};
    var W = Math.max(el.clientWidth || 420, 260), H = o.height || 190;
    var m = { t: 12, r: 12, b: 26, l: 34 }, pw = W - m.l - m.r, ph = H - m.t - m.b;
    var bins = H0.bins, n = bins.length, mx = 1, i;
    for (i = 0; i < n; i++) if (bins[i].n > mx) mx = bins[i].n;
    var ink3 = css("--ink-3"), soft = css("--hairline-soft"), step = pw / n, s = "";
    var ticks = niceTicks(0, mx, 3);
    for (i = 0; i < ticks.length; i++) {
      var yy = (m.t + ph * (1 - ticks[i] / mx)).toFixed(1);
      s += '<line x1="' + m.l + '" x2="' + (m.l + pw) + '" y1="' + yy + '" y2="' + yy + '" stroke="' + soft + '" stroke-width="1" shape-rendering="crispEdges"/>' +
        '<text x="' + (m.l - 6) + '" y="' + (+yy + 3.5) + '" font-size="10" text-anchor="end" fill="' + ink3 + '" ' + MONO + ">" + Math.round(ticks[i]) + "</text>";
    }
    for (i = 0; i < n; i++) {
      var hh = ph * bins[i].n / mx, mid = (bins[i].lo + bins[i].hi) / 2;
      s += '<rect x="' + (m.l + i * step + step * .12).toFixed(1) + '" y="' + (m.t + ph - hh).toFixed(1) + '" width="' + (step * .76).toFixed(1) +
        '" height="' + Math.max(hh, bins[i].n ? 1 : 0).toFixed(1) + '" rx="1.5" fill="' + (mid >= 0 ? css("--up") : css("--down")) + '" opacity=".8"><title>' +
        esc((o.fmt ? o.fmt(bins[i].lo) : bins[i].lo.toFixed(0)) + " … " + (o.fmt ? o.fmt(bins[i].hi) : bins[i].hi.toFixed(0)) + " · " + bins[i].n) + "</title></rect>";
    }
    var lab = [0, Math.floor(n / 2), n - 1], anch = ["start", "middle", "end"];
    for (i = 0; i < lab.length; i++) {
      var b = bins[lab[i]], x = m.l + lab[i] * step + step / 2;
      s += '<text x="' + x.toFixed(1) + '" y="' + (H - 7) + '" font-size="10" text-anchor="' + anch[i] + '" fill="' + ink3 + '" ' + MONO + ">" +
        esc(o.fmt ? o.fmt((b.lo + b.hi) / 2) : Math.round((b.lo + b.hi) / 2)) + "</text>";
    }
    el.innerHTML = '<svg viewBox="0 0 ' + W + " " + H + '" width="100%" height="' + H + '" role="img" aria-label="' + esc(o.aria || "") + '">' + s + "</svg>";
  }
  function mountHist(el, H0, o) { return autoRender({ el: el, render: function () { hist(this.el, H0, o); } }); }

  /* ================= 5. 迷你线(表格内联,返回 SVG 字符串) ================= */
  function spark(a, o) {
    o = o || {};
    var W = o.w || 72, H = o.h || 20, n = a.length;
    if (n < 2) return "";
    var lo = Math.min.apply(null, a), hi = Math.max.apply(null, a), sp = hi - lo || 1, s = "", i;
    for (i = 0; i < n; i++) s += (i ? " " : "") + (i / (n - 1) * (W - 2) + 1).toFixed(1) + "," + (H - 2 - (a[i] - lo) / sp * (H - 4)).toFixed(1);
    var col = o.color || (a[n - 1] >= a[0] ? "var(--up)" : "var(--down)");
    return '<svg class="spk" viewBox="0 0 ' + W + " " + H + '" width="' + W + '" height="' + H + '" aria-hidden="true"><polyline points="' + s +
      '" fill="none" stroke="' + col + '" stroke-width="1.3" stroke-linejoin="round" stroke-linecap="round"/></svg>';
  }

  /* ================= 6. 横条榜(排行:交易所量、链上 TVL) ================= */
  /* items: [{k, v, note, href}] */
  function hbars(el, items, o) {
    o = o || {};
    var mx = Math.max.apply(null, [1].concat(items.map(function (x) { return Math.abs(x.v); })));
    var h = '<div class="hbars">';
    for (var i = 0; i < items.length; i++) {
      var it = items[i], w = (Math.abs(it.v) / mx * 100).toFixed(1);
      h += '<div class="hb' + (it.hi ? " hi" : "") + '"><span class="hb-k">' + (it.href ? '<a href="' + esc(it.href) + '" target="_blank" rel="noopener noreferrer">' + esc(it.k) + "</a>" : esc(it.k)) + "</span>" +
        '<span class="hb-t"><span class="hb-f" style="width:' + w + "%;background:" + (it.c || (it.v >= 0 ? "var(--ink)" : "var(--down)")) + '"></span></span>' +
        '<span class="hb-v">' + esc(o.fmt ? o.fmt(it.v) : it.v) + "</span>" + (it.note ? '<span class="hb-n">' + esc(it.note) + "</span>" : "") + "</div>";
    }
    el.innerHTML = h + "</div>";
  }

  /* ================= 7. 散点(净流 × 次日收益等) ================= */
  /* pts: [[x, y, label]] */
  function scatter(el, pts, o) {
    o = o || {};
    var W = Math.max(el.clientWidth || 420, 260), H = o.height || 240;
    var m = { t: 14, r: 14, b: 30, l: 44 }, pw = W - m.l - m.r, ph = H - m.t - m.b, i;
    var xs = pts.map(function (p) { return p[0]; }), ys = pts.map(function (p) { return p[1]; });
    var xlo = Math.min.apply(null, xs), xhi = Math.max.apply(null, xs);
    var ylo = Math.min.apply(null, ys), yhi = Math.max.apply(null, ys);
    var xp = (xhi - xlo) * .06 || 1, yp = (yhi - ylo) * .08 || 1;
    xlo -= xp; xhi += xp; ylo -= yp; yhi += yp;
    function X(v) { return m.l + pw * (v - xlo) / (xhi - xlo); }
    function Y(v) { return m.t + ph * (1 - (v - ylo) / (yhi - ylo)); }
    var ink3 = css("--ink-3"), soft = css("--hairline-soft"), s = "";
    var yt = niceTicks(ylo, yhi, 3), xt = niceTicks(xlo, xhi, 4);
    for (i = 0; i < yt.length; i++) {
      var yy = Y(yt[i]).toFixed(1);
      s += '<line x1="' + m.l + '" x2="' + (m.l + pw) + '" y1="' + yy + '" y2="' + yy + '" stroke="' + (Math.abs(yt[i]) < 1e-9 ? ink3 : soft) + '" stroke-width="1" shape-rendering="crispEdges"/>' +
        '<text x="' + (m.l - 6) + '" y="' + (+yy + 3.5) + '" font-size="10" text-anchor="end" fill="' + ink3 + '" ' + MONO + ">" + esc(o.fmtY ? o.fmtY(yt[i]) : yt[i]) + "</text>";
    }
    for (i = 0; i < xt.length; i++) {
      var xx = X(xt[i]).toFixed(1);
      s += '<line x1="' + xx + '" x2="' + xx + '" y1="' + m.t + '" y2="' + (m.t + ph) + '" stroke="' + (Math.abs(xt[i]) < 1e-9 ? ink3 : soft) + '" stroke-width="1" shape-rendering="crispEdges"/>' +
        '<text x="' + xx + '" y="' + (H - 8) + '" font-size="10" text-anchor="middle" fill="' + ink3 + '" ' + MONO + ">" + esc(o.fmtX ? o.fmtX(xt[i]) : xt[i]) + "</text>";
    }
    for (i = 0; i < pts.length; i++)
      s += '<circle cx="' + X(pts[i][0]).toFixed(1) + '" cy="' + Y(pts[i][1]).toFixed(1) + '" r="2.6" fill="' + (pts[i][1] >= 0 ? css("--up") : css("--down")) +
        '" opacity=".55"><title>' + esc(pts[i][2] || "") + "</title></circle>";
    /* 最小二乘回归线 */
    if (pts.length > 4) {
      var mx2 = xs.reduce(function (a, b) { return a + b; }, 0) / xs.length, my = ys.reduce(function (a, b) { return a + b; }, 0) / ys.length, num = 0, den = 0;
      for (i = 0; i < pts.length; i++) { num += (xs[i] - mx2) * (ys[i] - my); den += (xs[i] - mx2) * (xs[i] - mx2); }
      var k = den ? num / den : 0, b0 = my - k * mx2;
      s += '<line x1="' + X(xlo).toFixed(1) + '" y1="' + Y(k * xlo + b0).toFixed(1) + '" x2="' + X(xhi).toFixed(1) + '" y2="' + Y(k * xhi + b0).toFixed(1) +
        '" stroke="' + css("--ink") + '" stroke-width="1.4" stroke-dasharray="5 3" opacity=".55"/>';
    }
    el.innerHTML = '<svg viewBox="0 0 ' + W + " " + H + '" width="100%" height="' + H + '" role="img" aria-label="' + esc(o.aria || "") + '">' + s + "</svg>";
  }
  function mountScatter(el, pts, o) { return autoRender({ el: el, render: function () { scatter(this.el, pts, o); } }); }

  /* ================= 8. 多线图(N 条序列,同轴或归一化) ================= */
  /* series: [{label, rows, dash, opacity}] */
  function Multi(el, series, o) { this.el = el; this.series = series; this.o = o || {}; }
  Multi.prototype.render = function () {
    var el = this.el, o = this.o, S = this.series.filter(function (s) { return s.rows && s.rows.length; });
    if (!S.length) { el.innerHTML = '<div class="state">' + esc(o.emptyText || "—") + "</div>"; return; }
    var W = Math.max(el.clientWidth || 520, 280), narrow = W < 560, H = o.height || (narrow ? 220 : 264);
    var m = { t: 16, r: 56, b: 26, l: 8 }, pw = W - m.l - m.r, ph = H - m.t - m.b, i, j;
    var domain = S[0].rows.map(function (r) { return r[0]; });
    for (i = 1; i < S.length; i++) if (S[i].rows.length > domain.length) domain = S[i].rows.map(function (r) { return r[0]; });
    var maps = S.map(function (s) { return new Map(s.rows); });
    var lo = 1e18, hi = -1e18;
    for (i = 0; i < S.length; i++) for (j = 0; j < S[i].rows.length; j++) {
      var v = S[i].rows[j][1]; if (v === null || isNaN(v)) continue;
      if (v < lo) lo = v; if (v > hi) hi = v;
    }
    if (lo === 1e18) { el.innerHTML = '<div class="state">' + esc(o.emptyText || "—") + "</div>"; return; }
    if (o.zeroBase) lo = Math.min(0, lo);
    if (hi === lo) hi = lo + 1;
    var pad = (hi - lo) * .08; lo -= pad; hi += pad;
    function Y(v) { return m.t + ph * (1 - (v - lo) / (hi - lo)); }
    var n = domain.length, step = pw / n, ink3 = css("--ink-3"), soft = css("--hairline-soft"), ink = css("--ink");
    var g = "", ticks = niceTicks(lo, hi, 4), yy;
    for (i = 0; i < ticks.length; i++) {
      yy = Y(ticks[i]).toFixed(1);
      g += '<line x1="' + m.l + '" x2="' + (m.l + pw) + '" y1="' + yy + '" y2="' + yy + '" stroke="' + (Math.abs(ticks[i]) < 1e-9 ? ink3 : soft) + '" stroke-width="1" shape-rendering="crispEdges"/>' +
        '<text x="' + (W - m.r + 8) + '" y="' + (+yy + 3.5) + '" font-size="10.5" fill="' + ink3 + '" ' + MONO + ">" + esc(o.fmtY ? o.fmtY(ticks[i]) : ticks[i]) + "</text>";
    }
    var body = "";
    for (i = 0; i < S.length; i++) {
      var p = "", started = false;
      for (j = 0; j < n; j++) {
        var val = maps[i].get(domain[j]);
        if (val === undefined || val === null || isNaN(val)) continue;
        p += (started ? " " : "") + (m.l + j * step + step / 2).toFixed(1) + "," + Y(val).toFixed(1);
        started = true;
      }
      if (!p) continue;
      body += '<polyline points="' + p + '" fill="none" stroke="' + (S[i].color || ink) + '" stroke-width="' + (S[i].w || 1.7) + '" ' +
        (S[i].dash ? 'stroke-dasharray="' + S[i].dash + '" ' : "") + 'opacity="' + (S[i].opacity || 1) + '" stroke-linejoin="round"/>';
      var lastPt = p.split(" ").pop().split(",");
      body += '<circle cx="' + lastPt[0] + '" cy="' + lastPt[1] + '" r="2.8" fill="' + (S[i].color || ink) + '" opacity="' + (S[i].opacity || 1) + '"/>';
      if (S[i].label && o.inlineLabels !== false)
        body += '<text x="' + (+lastPt[0] - 6) + '" y="' + (+lastPt[1] - 8) + '" font-size="10" font-weight="600" text-anchor="end" fill="' + (S[i].color || ink) +
          '" opacity="' + (S[i].opacity || 1) + '" ' + MONO + ">" + esc(S[i].label) + "</text>";
    }
    var nl = Math.min(n, narrow ? 4 : 6), lbl = "", used = {}, idx, tx;
    for (i = 0; i < nl; i++) {
      idx = nl === 1 ? 0 : Math.round(i * (n - 1) / (nl - 1)); tx = domain[idx].length > 7 ? domain[idx].slice(2) : domain[idx];
      if (used[tx]) continue; used[tx] = 1;
      var lx = m.l + idx * step + step / 2, an = "middle";
      if (idx === 0 && lx < 22) { lx = m.l; an = "start"; }
      lbl += '<text x="' + lx.toFixed(1) + '" y="' + (H - 7) + '" font-size="10.5" fill="' + ink3 + '" text-anchor="' + an + '" ' + MONO + ">" + esc(tx) + "</text>";
    }
    el.innerHTML = '<svg viewBox="0 0 ' + W + " " + H + '" width="100%" height="' + H + '" role="img" aria-label="' + esc(o.aria || "") + '">' + g + body + lbl +
      '<line class="xh" x1="0" x2="0" y1="' + m.t + '" y2="' + (m.t + ph) + '" stroke="' + ink3 + '" stroke-dasharray="3 3" opacity="0"/>' +
      '<rect class="ov" x="' + m.l + '" y="' + m.t + '" width="' + pw + '" height="' + ph + '" fill="transparent"/></svg><div class="tip" role="status"></div>';
    var svg = el.querySelector("svg"), ov = el.querySelector(".ov"), xh = el.querySelector(".xh"), T = tipLayer(el), fmt = o.fmtTip || function (v) { return Math.round(v * 100) / 100; };
    ov.addEventListener("pointermove", function (e) {
      var r = svg.getBoundingClientRect(), sx = (e.clientX - r.left) * (W / r.width);
      var k = Math.max(0, Math.min(n - 1, Math.floor((sx - m.l) / step))), cx = m.l + k * step + step / 2;
      xh.setAttribute("x1", cx); xh.setAttribute("x2", cx); xh.setAttribute("opacity", ".6");
      var html = "<div>" + esc(domain[k]) + "</div>";
      for (var q = 0; q < S.length; q++) {
        var vv = maps[q].get(domain[k]);
        if (vv === undefined || vv === null || isNaN(vv)) continue;
        html += '<div style="opacity:' + (q ? ".75" : "1") + '"><b>' + esc(S[q].label || "") + " " + fmt(vv) + "</b></div>";
      }
      T.show(e, html);
    });
    ov.addEventListener("pointerleave", function () { xh.setAttribute("opacity", "0"); T.hide(); });
  };
  function mountMulti(el, series, o) { var m = new Multi(el, series, o); return autoRender(m); }

  /* ================= 9. 水下回撤图 ================= */
  function underwater(el, rows, o) {
    o = o || {};
    var W = Math.max(el.clientWidth || 460, 260), H = o.height || 200;
    var m = { t: 12, r: 46, b: 24, l: 8 }, pw = W - m.l - m.r, ph = H - m.t - m.b, i;
    var lo = 0, hi = 0;
    for (i = 0; i < rows.length; i++) if (rows[i][1] < lo) lo = rows[i][1];
    lo *= 1.08;
    function Y(v) { return m.t + ph * (1 - (v - lo) / (hi - lo)); }
    var ink3 = css("--ink-3"), soft = css("--hairline-soft"), down = css("--down");
    var g = "", ticks = niceTicks(lo, hi, 3), yy;
    for (i = 0; i < ticks.length; i++) {
      yy = Y(ticks[i]).toFixed(1);
      g += '<line x1="' + m.l + '" x2="' + (m.l + pw) + '" y1="' + yy + '" y2="' + yy + '" stroke="' + (ticks[i] === 0 ? ink3 : soft) + '" stroke-width="1" shape-rendering="crispEdges"/>' +
        '<text x="' + (W - m.r + 8) + '" y="' + (+yy + 3.5) + '" font-size="10" fill="' + ink3 + '" ' + MONO + ">" + Math.round(ticks[i]) + "%</text>";
    }
    var n = rows.length, step = pw / n, p = "";
    for (i = 0; i < n; i++) p += (i ? " L" : "M") + (m.l + i * step + step / 2).toFixed(1) + " " + Y(rows[i][1]).toFixed(1);
    var body = '<path d="' + p + " L" + (m.l + (n - 1) * step + step / 2).toFixed(1) + " " + Y(0).toFixed(1) + " L" + (m.l + step / 2).toFixed(1) + " " + Y(0).toFixed(1) +
      ' Z" fill="' + down + '" opacity=".13"/><path d="' + p + '" fill="none" stroke="' + down + '" stroke-width="1.5"/>';
    var lbl = "", nl = 5, used = {};
    for (i = 0; i < nl; i++) {
      var idx = Math.round(i * (n - 1) / (nl - 1)), tx = rows[idx][0].slice(2, 7);
      if (used[tx]) continue; used[tx] = 1;
      var lx = m.l + idx * step + step / 2, an = "middle";
      if (idx === 0 && lx < 22) { lx = m.l; an = "start"; }
      lbl += '<text x="' + lx.toFixed(1) + '" y="' + (H - 6) + '" font-size="10" fill="' + ink3 + '" text-anchor="' + an + '" ' + MONO + ">" + tx + "</text>";
    }
    el.innerHTML = '<svg viewBox="0 0 ' + W + " " + H + '" width="100%" height="' + H + '" role="img" aria-label="' + esc(o.aria || "") + '">' + g + body + lbl + "</svg>";
  }
  function mountUnderwater(el, rows, o) { return autoRender({ el: el, render: function () { underwater(this.el, rows, o); } }); }

  /* ================= 10. 色带(近 N 期指数条) ================= */
  function strip(el, rows, o) {
    o = o || {};
    var h = '<div class="strip" role="img" aria-label="' + esc(o.aria || "") + '">';
    for (var i = 0; i < rows.length; i++) {
      var t = o.sequential ? rows[i][1] / (o.max || 100) : null;
      h += '<span class="sc" style="background:' + (o.color ? o.color(rows[i][1]) : seqColor(t)) + '" title="' + esc(rows[i][0] + " · " + rows[i][1]) + '"></span>';
    }
    el.innerHTML = h + "</div>";
  }

  /* ================= 11. 进度条组(占比对照) ================= */
  function bullet(el, items, o) {
    o = o || {};
    var h = '<div class="bullets">';
    for (var i = 0; i < items.length; i++) {
      var it = items[i], w = Math.max(0, Math.min(100, it.pct)).toFixed(2);
      h += '<div class="bu"><div class="bu-top"><span class="bu-k">' + esc(it.k) + '</span><span class="bu-v">' + esc(it.v) + "</span></div>" +
        '<div class="bu-t"><span class="bu-f" style="width:' + w + "%;background:" + (it.c || "var(--ink)") + '"></span></div>' +
        (it.note ? '<div class="bu-n">' + esc(it.note) + "</div>" : "") + "</div>";
    }
    el.innerHTML = h + "</div>";
  }

  return {
    mountGauge: mountGauge, mountDonut: mountDonut, mountHist: mountHist, mountScatter: mountScatter,
    mountMulti: mountMulti, mountUnderwater: mountUnderwater,
    heat: heat, spark: spark, hbars: hbars, strip: strip, bullet: bullet,
    divColor: divColor, seqColor: seqColor, niceTicks: niceTicks
  };
})();
