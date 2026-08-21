/* ============================================================================
 * metrics.js — 锁定区(纯计算库,零依赖,零副作用,维护勿改)
 * ----------------------------------------------------------------------------
 * 全站所有派生指标只在此处计算。输入统一为 [ ["YYYY-MM-DD", number], ... ]
 * 序列(下称 rows),输出为普通对象/数组。本文件不碰 DOM、不发请求、不读配置。
 * 每个函数的口径说明见 METRICS.md(与本文件函数名一一对应)。
 * ========================================================================== */
window.FlowMetrics = (function () {
  "use strict";

  /* ================= 基础统计 ================= */
  function vals(rows) { return rows.map(function (r) { return r[1]; }); }
  function keys(rows) { return rows.map(function (r) { return r[0]; }); }
  function sum(a) { var s = 0, i; for (i = 0; i < a.length; i++) s += a[i]; return s; }
  function mean(a) { return a.length ? sum(a) / a.length : 0; }
  function stdev(a) {
    if (a.length < 2) return 0;
    var m = mean(a), s = 0, i;
    for (i = 0; i < a.length; i++) s += (a[i] - m) * (a[i] - m);
    return Math.sqrt(s / (a.length - 1));
  }
  function minOf(a) { return a.length ? Math.min.apply(null, a) : 0; }
  function maxOf(a) { return a.length ? Math.max.apply(null, a) : 0; }
  function median(a) { return pct(a, 50); }
  /* 线性插值分位数(p 为 0–100) */
  function pct(a, p) {
    if (!a.length) return 0;
    var s = a.slice().sort(function (x, y) { return x - y; });
    var i = (s.length - 1) * p / 100, lo = Math.floor(i), hi = Math.ceil(i);
    return lo === hi ? s[lo] : s[lo] + (s[hi] - s[lo]) * (i - lo);
  }
  /* 某值在样本中的分位(0–100) */
  function rankOf(a, v) {
    if (!a.length) return 0;
    var c = 0, i;
    for (i = 0; i < a.length; i++) if (a[i] <= v) c++;
    return c / a.length * 100;
  }

  /* ================= 序列变换 ================= */
  function cumulative(rows) {
    var c = 0;
    return rows.map(function (r) { c += r[1]; return [r[0], Math.round(c * 10) / 10]; });
  }
  function cumMap(rows) {
    var c = 0, m = new Map(), i;
    for (i = 0; i < rows.length; i++) { c += rows[i][1]; m.set(rows[i][0], c); }
    return m;
  }
  function sma(rows, n) {
    var out = [], acc = 0, i;
    for (i = 0; i < rows.length; i++) {
      acc += rows[i][1];
      if (i >= n) acc -= rows[i - n][1];
      out.push([rows[i][0], i >= n - 1 ? acc / n : null]);
    }
    return out;
  }
  function ema(rows, n) {
    var k = 2 / (n + 1), prev = null;
    return rows.map(function (r) {
      prev = prev === null ? r[1] : r[1] * k + prev * (1 - k);
      return [r[0], prev];
    });
  }
  /* 滚动 z 分数:当前值相对过去 n 日的标准分 */
  function rollingZ(rows, n) {
    var out = [], i, w, s;
    for (i = 0; i < rows.length; i++) {
      if (i < n) { out.push([rows[i][0], null]); continue; }
      w = vals(rows.slice(i - n, i)); s = stdev(w);
      out.push([rows[i][0], s ? (rows[i][1] - mean(w)) / s : 0]);
    }
    return out;
  }
  function lastNonNull(rows) {
    for (var i = rows.length - 1; i >= 0; i--) if (rows[i][1] !== null && !isNaN(rows[i][1])) return rows[i];
    return null;
  }
  function windowRows(rows, days) {
    if (!rows.length || !days || days >= 1e6) return rows.slice();
    var last = rows[rows.length - 1][0];
    var cut = new Date(new Date(last + "T00:00:00Z").getTime() - days * 864e5).toISOString().slice(0, 10);
    return rows.filter(function (r) { return r[0] >= cut; });
  }

  /* ================= 时间聚合 ================= */
  function weekKey(iso) {
    var d = new Date(iso + "T00:00:00Z"), off = (d.getUTCDay() + 6) % 7;
    d.setUTCDate(d.getUTCDate() - off);
    return d.toISOString().slice(0, 10);
  }
  function quarterKey(iso) { return iso.slice(0, 4) + "-Q" + (Math.floor((+iso.slice(5, 7) - 1) / 3) + 1); }
  function aggBy(rows, fn) {
    var m = new Map(), i, k;
    for (i = 0; i < rows.length; i++) { k = fn(rows[i][0]); m.set(k, (m.get(k) || 0) + rows[i][1]); }
    return Array.from(m.entries()).map(function (e) { return [e[0], Math.round(e[1] * 10) / 10]; });
  }
  function byWeek(rows) { return aggBy(rows, weekKey); }
  function byMonth(rows) { return aggBy(rows, function (d) { return d.slice(0, 7); }); }
  function byQuarter(rows) { return aggBy(rows, quarterKey); }
  function byYear(rows) { return aggBy(rows, function (d) { return d.slice(0, 4); }); }
  function monthMap(rows) { return new Map(byMonth(rows)); }

  /* ================= 流向纪录 ================= */
  /* 连续同向段:返回全部段落(按长度降序)+ 最长流入/流出 + 当前进行中的段 */
  function runs(rows) {
    var out = [], cur = null, i, v, s;
    for (i = 0; i < rows.length; i++) {
      v = rows[i][1]; s = v > 0 ? 1 : v < 0 ? -1 : 0;
      if (s === 0) { if (cur) { out.push(cur); cur = null; } continue; }
      if (cur && cur.sign === s) { cur.len++; cur.sum += v; cur.end = rows[i][0]; }
      else { if (cur) out.push(cur); cur = { sign: s, len: 1, sum: v, start: rows[i][0], end: rows[i][0] }; }
    }
    if (cur) out.push(cur);
    var sorted = out.slice().sort(function (a, b) { return b.len - a.len || Math.abs(b.sum) - Math.abs(a.sum); });
    var ins = sorted.filter(function (r) { return r.sign > 0; });
    var outs = sorted.filter(function (r) { return r.sign < 0; });
    return {
      all: sorted, inflow: ins, outflow: outs,
      longestIn: ins[0] || null, longestOut: outs[0] || null,
      current: out.length ? out[out.length - 1] : null
    };
  }
  /* 极值日:dir=1 取最大流入,dir=-1 取最大流出 */
  function topDays(rows, n, dir) {
    return rows.slice().sort(function (a, b) { return dir > 0 ? b[1] - a[1] : a[1] - b[1]; }).slice(0, n);
  }
  /* 周聚合的最强/最弱 */
  function extremeWeeks(rows) {
    var w = byWeek(rows), s = w.slice().sort(function (a, b) { return b[1] - a[1]; });
    return { best: s[0] || null, worst: s[s.length - 1] || null, weeks: w };
  }
  /* 正值日占比 */
  function hitRate(rows) {
    if (!rows.length) return 0;
    var c = 0, i;
    for (i = 0; i < rows.length; i++) if (rows[i][1] > 0) c++;
    return c / rows.length * 100;
  }
  /* 集中度:前 n 大流入日占总流入的比重;HHI 为赫芬达尔指数(0–1) */
  function concentration(rows, n) {
    var pos = vals(rows).filter(function (v) { return v > 0; });
    var tot = sum(pos);
    if (!tot) return { share: 0, hhi: 0, n: n };
    var top = pos.slice().sort(function (a, b) { return b - a; }).slice(0, n);
    var hhi = 0, i;
    for (i = 0; i < pos.length; i++) hhi += Math.pow(pos[i] / tot, 2);
    return { share: sum(top) / tot * 100, hhi: hhi, n: n };
  }
  /* 星期效应:0=周一 … 6=周日 */
  function dayOfWeek(rows) {
    var b = [], i, d, k;
    for (i = 0; i < 7; i++) b.push({ dow: i, total: 0, count: 0, pos: 0 });
    for (i = 0; i < rows.length; i++) {
      d = new Date(rows[i][0] + "T00:00:00Z"); k = (d.getUTCDay() + 6) % 7;
      b[k].total += rows[i][1]; b[k].count++; if (rows[i][1] > 0) b[k].pos++;
    }
    return b.map(function (x) {
      return { dow: x.dow, total: x.total, count: x.count, avg: x.count ? x.total / x.count : 0, hit: x.count ? x.pos / x.count * 100 : 0 };
    });
  }
  /* 月份效应:1=一月 … 12=十二月 */
  function monthOfYear(rows) {
    var b = [], i, k;
    for (i = 1; i <= 12; i++) b.push({ m: i, total: 0, count: 0, pos: 0 });
    for (i = 0; i < rows.length; i++) {
      k = +rows[i][0].slice(5, 7) - 1;
      b[k].total += rows[i][1]; b[k].count++; if (rows[i][1] > 0) b[k].pos++;
    }
    return b.map(function (x) { return { m: x.m, total: x.total, count: x.count, avg: x.count ? x.total / x.count : 0, hit: x.count ? x.pos / x.count * 100 : 0 }; });
  }
  /* 直方图:等宽分箱 */
  function histogram(a, bins) {
    if (!a.length) return { bins: [], lo: 0, hi: 0, width: 0 };
    var lo = minOf(a), hi = maxOf(a);
    if (hi === lo) { hi = lo + 1; }
    var w = (hi - lo) / bins, out = [], i, k;
    for (i = 0; i < bins; i++) out.push({ lo: lo + i * w, hi: lo + (i + 1) * w, n: 0 });
    for (i = 0; i < a.length; i++) {
      k = Math.min(bins - 1, Math.max(0, Math.floor((a[i] - lo) / w)));
      out[k].n++;
    }
    return { bins: out, lo: lo, hi: hi, width: w };
  }
  /* 分位数概览 */
  function quantiles(rows) {
    var a = vals(rows);
    return {
      p05: pct(a, 5), p25: pct(a, 25), p50: pct(a, 50), p75: pct(a, 75), p95: pct(a, 95),
      mean: mean(a), sd: stdev(a), min: minOf(a), max: maxOf(a), n: a.length
    };
  }
  /* 日历热力网格:按周分行,列为周一~周五 */
  function calendarGrid(rows, weeksBack) {
    var byW = new Map(), i, k;
    for (i = 0; i < rows.length; i++) {
      k = weekKey(rows[i][0]);
      if (!byW.has(k)) byW.set(k, {});
      byW.get(k)[(new Date(rows[i][0] + "T00:00:00Z").getUTCDay() + 6) % 7] = rows[i][1];
    }
    var ks = Array.from(byW.keys()).sort();
    if (weeksBack) ks = ks.slice(-weeksBack);
    return ks.map(function (w) { return { week: w, cells: byW.get(w) }; });
  }

  /* ================= 价格系派生 ================= */
  function returns(prices) {
    var out = [], i;
    for (i = 1; i < prices.length; i++) {
      if (!prices[i - 1][1]) { out.push([prices[i][0], 0]); continue; }
      out.push([prices[i][0], (prices[i][1] / prices[i - 1][1] - 1) * 100]);
    }
    return out;
  }
  /* 年化波动率(%):对数收益标准差 × √365 */
  function rollingVol(prices, n) {
    var r = returns(prices), out = [], i;
    for (i = 0; i < r.length; i++) {
      if (i < n - 1) { out.push([r[i][0], null]); continue; }
      out.push([r[i][0], stdev(vals(r.slice(i - n + 1, i + 1))) * Math.sqrt(365)]);
    }
    return out;
  }
  /* 回撤:序列 + 最大回撤 + 峰谷日期 + 当前水下深度 */
  function drawdown(prices) {
    var peak = -1e18, out = [], mx = 0, mxAt = "", peakAt = "", curPeakAt = "", i, dd;
    for (i = 0; i < prices.length; i++) {
      if (prices[i][1] > peak) { peak = prices[i][1]; curPeakAt = prices[i][0]; }
      dd = peak ? (prices[i][1] / peak - 1) * 100 : 0;
      out.push([prices[i][0], dd]);
      if (dd < mx) { mx = dd; mxAt = prices[i][0]; peakAt = curPeakAt; }
    }
    return { series: out, max: mx, troughAt: mxAt, peakAt: peakAt, current: out.length ? out[out.length - 1][1] : 0 };
  }
  /* 月度收益矩阵:{ years:[..], cells: Map("YYYY-MM" -> %) } */
  function monthlyReturns(prices) {
    var last = new Map(), i;
    for (i = 0; i < prices.length; i++) last.set(prices[i][0].slice(0, 7), prices[i][1]);
    var ks = Array.from(last.keys()).sort(), cells = new Map(), yrs = [];
    for (i = 1; i < ks.length; i++) {
      var p0 = last.get(ks[i - 1]), p1 = last.get(ks[i]);
      cells.set(ks[i], p0 ? (p1 / p0 - 1) * 100 : 0);
      var y = ks[i].slice(0, 4);
      if (yrs.indexOf(y) < 0) yrs.push(y);
    }
    return { years: yrs, cells: cells };
  }
  /* 皮尔逊相关 */
  function pearson(a, b) {
    var n = Math.min(a.length, b.length);
    if (n < 3) return 0;
    var ma = mean(a.slice(0, n)), mb = mean(b.slice(0, n)), num = 0, da = 0, db = 0, i, x, y;
    for (i = 0; i < n; i++) { x = a[i] - ma; y = b[i] - mb; num += x * y; da += x * x; db += y * y; }
    return da && db ? num / Math.sqrt(da * db) : 0;
  }
  /* 按日期对齐两条序列 → [[date, aVal, bVal], ...] */
  function align(a, b) {
    var mb = new Map(b), out = [], i;
    for (i = 0; i < a.length; i++) if (mb.has(a[i][0])) out.push([a[i][0], a[i][1], mb.get(a[i][0])]);
    return out;
  }
  /* 滚动相关系数 */
  function rollingCorr(a, b, n) {
    var p = align(a, b), out = [], i, w;
    for (i = 0; i < p.length; i++) {
      if (i < n - 1) { out.push([p[i][0], null]); continue; }
      w = p.slice(i - n + 1, i + 1);
      out.push([p[i][0], pearson(w.map(function (r) { return r[1]; }), w.map(function (r) { return r[2]; }))]);
    }
    return out;
  }
  /* 领先/滞后相关:flows 领先 returns k 日 */
  function leadLag(flows, rets, maxLag) {
    var out = [], k, sh, p;
    for (k = -maxLag; k <= maxLag; k++) {
      sh = flows.map(function (r, i) {
        var j = i + k;
        return j >= 0 && j < flows.length ? [rets[i] ? rets[i][0] : r[0], flows[j][1]] : null;
      }).filter(Boolean);
      p = align(sh, rets);
      out.push([k, pearson(p.map(function (r) { return r[1]; }), p.map(function (r) { return r[2]; }))]);
    }
    return out;
  }
  /* 净流量折算 BTC 枚数(按当日价);priceMap 缺日则用最近可得价 */
  function impliedCoins(rows, priceRows) {
    var pm = new Map(priceRows), lastP = priceRows.length ? priceRows[0][1] : 0, out = [], i, mk, p;
    for (i = 0; i < rows.length; i++) {
      mk = rows[i][0].slice(0, 7);
      p = pm.get(rows[i][0]) || pm.get(mk) || lastP;
      if (p) lastP = p;
      out.push([rows[i][0], p ? rows[i][1] * 1e6 / p : 0]);
    }
    return out;
  }
  /* 状态判定:由 7d/30d 均值与 z 分数给出体制标签 */
  function regime(rows) {
    var s7 = lastNonNull(sma(rows, 7)), s30 = lastNonNull(sma(rows, 30));
    var z = lastNonNull(rollingZ(rows, 60));
    var a = s7 ? s7[1] : 0, b = s30 ? s30[1] : 0, zz = z ? z[1] : 0;
    var code = a > 0 && b > 0 ? (a > b ? "accel_in" : "cool_in")
      : a < 0 && b < 0 ? (a < b ? "accel_out" : "cool_out")
        : a > 0 ? "turn_in" : "turn_out";
    return { code: code, ma7: a, ma30: b, z: zz };
  }
  /* 期间摘要:任意窗口的净流/均值/最大最小/胜率 */
  function windowSummary(rows, days) {
    var w = windowRows(rows, days), a = vals(w);
    return { days: days, n: w.length, net: sum(a), avg: mean(a), max: maxOf(a), min: minOf(a), hit: hitRate(w) };
  }
  /* 多窗口摘要表 */
  function windowTable(rows, list) {
    return list.map(function (d) { return windowSummary(rows, d); });
  }

  return {
    vals: vals, keys: keys, sum: sum, mean: mean, stdev: stdev, median: median, pct: pct, rankOf: rankOf,
    min: minOf, max: maxOf,
    cumulative: cumulative, cumMap: cumMap, sma: sma, ema: ema, rollingZ: rollingZ,
    lastNonNull: lastNonNull, windowRows: windowRows,
    weekKey: weekKey, quarterKey: quarterKey, byWeek: byWeek, byMonth: byMonth, byQuarter: byQuarter,
    byYear: byYear, monthMap: monthMap,
    runs: runs, topDays: topDays, extremeWeeks: extremeWeeks, hitRate: hitRate, concentration: concentration,
    dayOfWeek: dayOfWeek, monthOfYear: monthOfYear, histogram: histogram, quantiles: quantiles, calendarGrid: calendarGrid,
    returns: returns, rollingVol: rollingVol, drawdown: drawdown, monthlyReturns: monthlyReturns,
    pearson: pearson, align: align, rollingCorr: rollingCorr, leadLag: leadLag,
    impliedCoins: impliedCoins, regime: regime, windowSummary: windowSummary, windowTable: windowTable
  };
})();
