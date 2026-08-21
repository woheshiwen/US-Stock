/* ============================================================================
 * wechat.js — 锁定区(微信/内置浏览器二段式引导,维护勿改)
 * ----------------------------------------------------------------------------
 * 机制:拦截所有外链点击 → 检测 UA。
 *   · 微信 / QQ / 企业微信等内置浏览器 → 拦下,弹引导层:一键复制 + 三步图示
 *   · 其余环境(桌面、手机 Chrome / Safari)→ 零拦截,直接跳,不加任何步骤
 * 用法:引入本文件即自动接管带 data-wx 的链接;也可 FlowWeChat.open(url) 主动调用。
 * 文案全部取 config.js → strings.*.wx_*;不含任何硬编码文案与颜色。
 * ========================================================================== */
window.FlowWeChat = (function () {
  "use strict";
  var C = window.SITE_CONFIG || {};
  function t(k) {
    var lang = "zh";
    try { lang = localStorage.getItem("flow_lang") || C.meta.lang_default; } catch (e) {}
    if (!C.strings || !C.strings[lang]) lang = "zh";
    return (C.strings[lang] && C.strings[lang][k]) || k;
  }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }

  var UA = navigator.userAgent || "";
  /* 内置浏览器:微信、企业微信、QQ、QQ 浏览器、微博、飞书、钉钉 —— 它们都可能拦截外域跳转 */
  var inApp = /MicroMessenger|wxwork|\bQQ\/|QQBrowser|Weibo|Lark|DingTalk/i.test(UA);
  var isWeChat = /MicroMessenger/i.test(UA);
  var iOS = /iPhone|iPad|iPod/i.test(UA);
  var layer = null;

  function copy(text) {
    return new Promise(function (res) {
      if (navigator.clipboard && navigator.clipboard.writeText && window.isSecureContext)
        return navigator.clipboard.writeText(text).then(function () { res(true); }, function () { res(fallback()); });
      res(fallback());
      function fallback() {
        var ta = document.createElement("textarea");
        ta.value = text; ta.setAttribute("readonly", "");
        ta.style.cssText = "position:fixed;top:0;left:0;opacity:0";
        document.body.appendChild(ta);
        ta.select(); ta.setSelectionRange(0, text.length);
        var ok = false;
        try { ok = document.execCommand("copy"); } catch (e) {}
        ta.remove();
        return ok;
      }
    });
  }

  function close() {
    if (!layer) return;
    layer.classList.remove("show");
    var el = layer; layer = null;
    setTimeout(function () { if (el.parentNode) el.parentNode.removeChild(el); }, 220);
    document.documentElement.style.overflow = "";
  }

  /* 三步图示:右上角菜单 → 在浏览器中打开 → 粘贴 */
  function stepIcon(n) {
    if (n === 1) return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><circle cx="5" cy="12" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="19" cy="12" r="1.6"/></svg>';
    if (n === 2) return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><path d="M15 3h6v6"/><path d="M10 14 21 3"/></svg>';
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="8" y="8" width="13" height="13" rx="2"/><path d="M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h3"/></svg>';
  }

  /* force=true 时无视 UA 强制展示引导层(用于自检与桌面预览) */
  function open(url, force) {
    if (!inApp && !force) { window.location.href = url; return; }
    if (layer) return;
    layer = document.createElement("div");
    layer.className = "wx-layer";
    layer.setAttribute("role", "dialog");
    layer.setAttribute("aria-modal", "true");
    var steps = "", labels = [t("wx_s1"), t("wx_s2"), t("wx_s3")], i;
    for (i = 0; i < 3; i++)
      steps += '<li><span class="wx-ic">' + stepIcon(i + 1) + '</span><span class="wx-st">' + esc(labels[i]) + "</span></li>";
    layer.innerHTML =
      '<div class="wx-scrim" data-close></div>' +
      '<div class="wx-box">' +
      '<button type="button" class="wx-x" data-close aria-label="' + esc(t("wx_close")) + '">' +
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg></button>' +
      '<div class="wx-h">' + esc(t("wx_h")) + "</div>" +
      '<p class="wx-p">' + esc(t(isWeChat ? "wx_p" : "wx_p_app")) + "</p>" +
      '<button type="button" class="wx-copy" id="wx-copy">' + esc(t("wx_copy")) + "</button>" +
      '<ol class="wx-steps">' + steps + "</ol>" +
      '<div class="wx-arrow' + (iOS ? " ios" : "") + '">' + esc(t("wx_hint")) + "</div>" +
      "</div>";
    document.body.appendChild(layer);
    document.documentElement.style.overflow = "hidden";
    requestAnimationFrame(function () { layer && layer.classList.add("show"); });
    setTimeout(function () { layer && layer.classList.add("show"); }, 30);

    var btn = layer.querySelector("#wx-copy");
    btn.addEventListener("click", function () {
      copy(url).then(function (ok) {
        if (window.FlowCapture) window.FlowCapture.track(ok ? "wx_copy" : "wx_copy_fail");
        if (ok) {
          btn.textContent = t("wx_copied"); btn.classList.add("done");
          setTimeout(function () { btn.textContent = t("wx_copy"); btn.classList.remove("done"); }, 2600);
          return;
        }
        /* 复制被环境拦截时才露出可选中的地址条——唯一的兵接兵退路,正常情况下不出现 */
        btn.textContent = t("wx_copy_fail");
        var box = layer.querySelector(".wx-box"), old = layer.querySelector(".wx-raw");
        if (old) { old.querySelector("input").select(); return; }
        var raw = document.createElement("div");
        raw.className = "wx-raw";
        raw.innerHTML = '<input type="text" readonly value="' + esc(url) + '" aria-label="' + esc(t("wx_copy")) + '">';
        box.insertBefore(raw, layer.querySelector(".wx-steps"));
        var inp = raw.querySelector("input");
        inp.addEventListener("focus", function () { this.select(); });
        inp.select();
      });
    });
    var cs = layer.querySelectorAll("[data-close]");
    for (i = 0; i < cs.length; i++) cs[i].addEventListener("click", close);
    document.addEventListener("keydown", function esc2(e) {
      if (e.key === "Escape") { close(); document.removeEventListener("keydown", esc2); }
    });
    if (window.FlowCapture) window.FlowCapture.track("wx_guide");
  }

  /* 全局接管:任何带 data-wx 的链接 */
  document.addEventListener("click", function (e) {
    var a = e.target.closest && e.target.closest("a[data-wx]");
    if (!a || !inApp) return;
    e.preventDefault();
    open(a.getAttribute("href"));
  });

  /* ?wxdemo=1 可在任意浏览器预览引导层(部署后也能用来自检,不影响正常访问) */
  if (/[?&]wxdemo=1/.test(location.search))
    setTimeout(function () { open((C.links && C.links.entry && C.links.entry.url) || "#", true); }, 400);

  return { open: open, close: close, inApp: inApp, isWeChat: isWeChat };
})();
