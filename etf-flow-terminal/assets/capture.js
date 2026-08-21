/* ============================================================================
 * capture.js — 锁定区(线索收集与本地统计,维护勿改)
 * ----------------------------------------------------------------------------
 * 定位:访客填「交易所 + UID」→ 立即解锁,不做任何校验、不做任何拒绝。
 * 提交内容同时投递到已配置的所有通道(全部可选,一个都不配也能正常解锁):
 *   1) Supabase REST insert     —— 你自己的表,免费额度足够
 *   2) 通用 Webhook POST        —— Google Apps Script / Formspree / Make / n8n 均可
 *   3) Netlify Forms            —— 部署在 Netlify 时零后端,后台直接看列表 + 邮件通知
 *   4) 本地队列(始终执行)      —— 离线/失败自动重试,admin.html 可导出 CSV
 * 隐私:只收集访客主动填写的字段 + 常规访问上下文(来源、语言、时区、设备宽度)。
 * 配置见 config.js → capture;通道搭建 5 分钟流程见 LEADS.md。
 * ========================================================================== */
window.FlowCapture = (function () {
  "use strict";
  var C = window.SITE_CONFIG || {}, K = (C.capture || {});
  var LS_LEADS = "flow_leads", LS_QUEUE = "flow_leads_queue", LS_STATS = "flow_stats";

  /* v2.3 隐私清理:旧版 admin 曾把数据库配置写入这个 key,升级后立即移除。 */
  try { localStorage.removeItem("flow_admin_sb"); } catch (e) {}

  function rd(k, dflt) { try { var v = localStorage.getItem(k); return v ? JSON.parse(v) : dflt; } catch (e) { return dflt; } }
  function wr(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }

  /* ---------------- 本地访问统计(用于线索上下文,不外发第三方) ---------------- */
  var stats = rd(LS_STATS, null) || { first_seen: new Date().toISOString(), visits: 0, views: 0, modules: {}, events: {} };
  function bumpVisit() {
    stats.visits++; stats.views++; stats.last_seen = new Date().toISOString();
    wr(LS_STATS, stats);
  }
  function track(evt, meta) {
    stats.events[evt] = (stats.events[evt] || 0) + 1;
    if (evt === "module_view" && meta) stats.modules[meta] = (stats.modules[meta] || 0) + 1;
    wr(LS_STATS, stats);
  }
  function statSnapshot() {
    var mods = Object.keys(stats.modules);
    return {
      first_seen: stats.first_seen, visits: stats.visits,
      modules_seen: mods.length, top_modules: mods.slice(0, 12).join("|"),
      unlock_clicks: stats.events.unlock_click || 0, entry_clicks: stats.events.entry_click || 0,
      csv_exports: stats.events.csv_export || 0
    };
  }

  /* ---------------- 访问上下文 ---------------- */
  function ctx() {
    var q = {};
    try {
      var p = new URLSearchParams(location.search);
      p.forEach(function (v, k) { q[k] = v; });
    } catch (e) { q = {}; }
    return {
      ts: new Date().toISOString(),
      lang: (function () { try { return localStorage.getItem("flow_lang") || C.meta.lang_default; } catch (e) { return "zh"; } })(),
      referrer: document.referrer || "direct",
      landing: location.pathname + location.hash,
      utm_source: q.utm_source || q.src || "", utm_medium: q.utm_medium || "", utm_campaign: q.utm_campaign || q.c || "",
      tz: (function () { try { return Intl.DateTimeFormat().resolvedOptions().timeZone; } catch (e) { return ""; } })(),
      tz_offset: -new Date().getTimezoneOffset() / 60,
      screen_w: window.innerWidth, dpr: window.devicePixelRatio || 1,
      platform_ua: navigator.userAgent.slice(0, 180),
      site_version: C.meta.version
    };
  }

  /* ---------------- 通道投递 ---------------- */
  function post(url, body, headers) {
    if (!window.fetch) return Promise.reject();
    var ctl = new AbortController(); setTimeout(function () { ctl.abort(); }, 8000);
    return fetch(url, {
      method: "POST", signal: ctl.signal,
      headers: Object.assign({ "Content-Type": "application/json" }, headers || {}),
      body: JSON.stringify(body)
    }).then(function (r) { return r.ok ? true : Promise.reject(r.status); });
  }
  function toSupabase(rec) {
    if (!K.supabase_url || !K.supabase_anon_key) return Promise.reject("off");
    return post(K.supabase_url.replace(/\/$/, "") + "/rest/v1/" + (K.table || "unlock_requests"), rec, {
      apikey: K.supabase_anon_key, Authorization: "Bearer " + K.supabase_anon_key, Prefer: "return=minimal"
    });
  }
  function toWebhook(rec) {
    if (!K.webhook_url) return Promise.reject("off");
    /* Apps Script / n8n / Make 需要 no-cors 时用 text/plain 绕过预检 */
    if (K.webhook_no_cors) {
      return fetch(K.webhook_url, { method: "POST", mode: "no-cors", headers: { "Content-Type": "text/plain;charset=utf-8" }, body: JSON.stringify(rec) })
        .then(function () { return true; });
    }
    return post(K.webhook_url, rec);
  }
  function toNetlify(rec) {
    if (!K.netlify_forms) return Promise.reject("off");
    var body = new URLSearchParams();
    body.append("form-name", K.netlify_form_name || "unlock");
    Object.keys(rec).forEach(function (k) { body.append(k, rec[k] == null ? "" : String(rec[k])); });
    return fetch("/", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: body.toString() })
      .then(function (r) { return r.ok ? true : Promise.reject(r.status); });
  }

  /* ---------------- 队列重试 ---------------- */
  function enqueue(rec) { var q = rd(LS_QUEUE, []); q.push(rec); wr(LS_QUEUE, q.slice(-50)); }
  function flush() {
    var q = rd(LS_QUEUE, []);
    if (!q.length) return Promise.resolve(0);
    var keep = [], jobs = q.map(function (rec) {
      return Promise.all([
        toSupabase(rec).catch(function () { return false; }),
        toWebhook(rec).catch(function () { return false; }),
        toNetlify(rec).catch(function () { return false; })
      ]).then(function (r) { if (!(r[0] || r[1] || r[2])) keep.push(rec); });
    });
    return Promise.all(jobs).then(function () { wr(LS_QUEUE, keep); return q.length - keep.length; });
  }

  /* ---------------- 主提交:永不拒绝 ---------------- */
  function submit(input) {
    var rec = Object.assign({
      email: (input.email || "").trim(),
      exchange: input.exchange || "",
      uid: (input.uid || "").trim(),
      note: (input.note || "").trim()
    }, ctx(), statSnapshot());
    var leads = rd(LS_LEADS, []);
    leads.push(rec); wr(LS_LEADS, leads.slice(-200));
    track("unlock_submit");
    var sinks = { supabase: false, webhook: false, netlify: false };
    return Promise.all([
      toSupabase(rec).then(function () { sinks.supabase = true; }).catch(function () {}),
      toWebhook(rec).then(function () { sinks.webhook = true; }).catch(function () {}),
      toNetlify(rec).then(function () { sinks.netlify = true; }).catch(function () {})
    ]).then(function () {
      var any = sinks.supabase || sinks.webhook || sinks.netlify;
      var configured = !!(K.supabase_url || K.webhook_url || K.netlify_forms);
      if (configured && !any) enqueue(rec);
      return { ok: true, sinks: sinks, queued: configured && !any, record: rec };
    });
  }

  /* ---------------- 导出(admin.html 用) ---------------- */
  function leads() { return rd(LS_LEADS, []); }
  function queue() { return rd(LS_QUEUE, []); }
  function toCSV(rows) {
    if (!rows.length) return "";
    var cols = Object.keys(rows.reduce(function (a, r) { Object.keys(r).forEach(function (k) { a[k] = 1; }); return a; }, {}));
    var esc = function (v) { v = v == null ? "" : String(v); return /[",\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; };
    return cols.join(",") + "\n" + rows.map(function (r) { return cols.map(function (c) { return esc(r[c]); }).join(","); }).join("\n");
  }
  function download(name, text, mime) {
    var b = new Blob([text], { type: mime || "text/csv;charset=utf-8" }), u = URL.createObjectURL(b);
    var a = document.createElement("a"); a.href = u; a.download = name; document.body.appendChild(a); a.click();
    setTimeout(function () { URL.revokeObjectURL(u); a.remove(); }, 400);
  }

  bumpVisit();
  if (window.fetch) setTimeout(flush, 2500);

  return {
    submit: submit, track: track, flush: flush,
    leads: leads, queue: queue, toCSV: toCSV, download: download,
    stats: function () { return stats; },
    sinksConfigured: function () {
      return { supabase: !!(K.supabase_url && K.supabase_anon_key), webhook: !!K.webhook_url, netlify: !!K.netlify_forms };
    }
  };
})();
