/* ============================================================================
 * join.js — 锁定区(缓冲页,维护勿改)
 * ----------------------------------------------------------------------------
 * 只做三件事:显示一句话 → 自动打开注册页 → 打不开时给一个手动出口。
 * 不展示链接、不展示邀请码、不做二次推销。
 * 微信等内置浏览器由 wechat.js 接管为「复制 + 在浏览器打开」。
 * ========================================================================== */
(function () {
  "use strict";
  var C = window.SITE_CONFIG, K = window.FlowCapture, W = window.FlowWeChat;
  var E = (C.links && C.links.entry) || {}, url = E.url || "";
  var lang = (function () { try { return localStorage.getItem("flow_lang") || C.meta.lang_default; } catch (e) { return C.meta.lang_default; } })();
  if (!C.strings[lang]) lang = "zh";
  var t = function (k) {
    var s = C.strings[lang];
    return s && Object.prototype.hasOwnProperty.call(s, k) ? s[k] : k;
  };
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }

  document.documentElement.lang = lang === "zh" ? "zh-CN" : "en";
  document.title = t("jb_title");

  var ns = document.querySelectorAll("noscript");
  for (var i = 0; i < ns.length; i++) ns[i].parentNode.removeChild(ns[i]);

  document.getElementById("jb").innerHTML =
    '<div class="jb-in">' +
    '<svg class="jb-mark" viewBox="0 0 32 32" aria-hidden="true"><rect x="1" y="1" width="30" height="30" rx="9" fill="#c99908"/><text x="16" y="20.5" text-anchor="middle" font-family="-apple-system,BlinkMacSystemFont,sans-serif" font-size="11" font-weight="750" fill="#fff">BA</text></svg>' +
    '<h1>' + esc(t("jb_h")) + "</h1>" +
    '<div class="jb-bar"><span></span></div>' +
    (t("jb_disclosure") ? '<p class="jb-disclosure">' + esc(t("jb_disclosure")) + "</p>" : "") +
    '<a class="jb-go" id="jb-go" href="' + esc(url) + '" data-wx rel="noopener noreferrer">' + esc(t("jb_manual")) + "</a>" +
    '<a class="jb-back" href="./">' + esc(t("jb_back")) + "</a>" +
    "</div>";

  var go = document.getElementById("jb-go");
  go.addEventListener("click", function (e) {
    if (W && W.inApp) { e.preventDefault(); W.open(url); }
    K.track("entry_click", (E.id || "binance") + ":manual");
  });

  K.track("join_view");

  /* 自动打开:非内置浏览器直接跳;内置浏览器改为弹二段引导(跳过去也是白屏)。
     ?wxdemo=1 为自检模式,不自动跳转。 */
  if (!/[?&]wxdemo=1/.test(location.search)) setTimeout(function () {
    if (W && W.inApp) { W.open(url); return; }
    K.track("entry_click", (E.id || "binance") + ":auto");
    window.location.href = url;
  }, 900);
})();
