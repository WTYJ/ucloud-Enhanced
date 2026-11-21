// ==UserScript==
// @name         ucloud-Enhanced
// @namespace    https://github.com/WTYJ/ucloud-Enhanced
// @version      2.5.12
// @description  独立工作台（待办/课程/通知/资源一站式管理），自动深色模式，修复 ticket 跳转循环，Office 365 与浏览器原生 PDF 预览，作业所属课程直达，解除复制限制，课件下载增强，优化页面标题
// @author       WTYJ (基于 uarix/ucloud-Evolved 二次开发)
// @match        https://ucloud.bupt.edu.cn/*
// @match        https://ucloud.bupt.edu.cn/uclass/course.html*
// @match        https://ucloud.bupt.edu.cn/uclass/*
// @match        https://ucloud.bupt.edu.cn/office/*
// @icon         https://ucloud.bupt.edu.cn/favicon.ico
// @require      https://mirrors.sustech.edu.cn/cdnjs/ajax/libs/nprogress/0.2.0/nprogress.min.js#sha512-bUg5gaqBVaXIJNuebamJ6uex//mjxPk8kljQTdM1SwkNrQD7pjS+PerntUSD+QRWPNJ0tq54/x4zRV8bLrLhZg==
// @resource     NPROGRESS_CSS https://mirrors.sustech.edu.cn/cdnjs/ajax/libs/nprogress/0.2.0/nprogress.min.css#sha512-42kB9yDlYiCEfx2xVwq0q7hT4uf26FUgSIZBK8uiaEnTdShXjwr8Ip1V4xGJMg3mHkUt9nNuTDxunHF0/EgxLQ==
// @connect      github.com
// @connect      raw.githubusercontent.com
// @connect      cdn.jsdelivr.net
// @grant        GM_getResourceText
// @grant        GM_addStyle
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_registerMenuCommand
// @grant        GM_xmlhttpRequest
// @grant        GM_openInTab
// @grant        unsafeWindow
// @run-at       document-start
// @license      MIT
// @updateURL    https://github.com/WTYJ/ucloud-Enhanced/raw/refs/heads/main/ucloud-Enhanced.user.js
// @downloadURL  https://github.com/WTYJ/ucloud-Enhanced/raw/refs/heads/main/ucloud-Enhanced.user.js
// ==/UserScript==

const OFFICE_EXT_RE = /\.(xlsx?|docx?|pptx?)$/i;

function escapeHtml(text) {
  return String(text == null ? "" : text).replace(/[&<>"']/g, (ch) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[ch]);
}

(function () {
  if (location.href.startsWith("https://ucloud.bupt.edu.cn/office/")) {
    if (
      GM_getValue("preview_autoSwitchOffice", false) ||
      GM_getValue("preview_autoSwitchPdf", true)
    ) {
      const params = new URLSearchParams(location.search);
      const url = params.get("furl");
      if (!url) return;
      let viewURL;
      try {
        viewURL = new URL(url);
      } catch (e) {
        return;
      }
      const filename = params.get("fullfilename") || url;
      const oauthKey = params.get("oauthKey");
      if (oauthKey) {
        const viewURLsearch = new URLSearchParams(viewURL.search);
        viewURLsearch.set("oauthKey", oauthKey);
        viewURL.search = viewURLsearch.toString();
      }
      if (OFFICE_EXT_RE.test(filename)) {
        if (!GM_getValue("preview_autoSwitchOffice", false)) {
          return;
        }
        if (window.stop) window.stop();
        location.href =
          "https://view.officeapps.live.com/op/view.aspx?src=" +
          encodeURIComponent(viewURL.toString());
        return;
      } else if (/\.pdf$/i.test(filename)) {
        if (!GM_getValue("preview_autoSwitchPdf", true)) {
          return;
        }
        if (window.stop) window.stop();
        // 使用浏览器内置预览器，显式指定 application/pdf 避免 octet-stream 触发下载
        fetch(viewURL.toString())
          .then((response) => {
            if (!response.ok) throw new Error("HTTP " + response.status);
            return response.arrayBuffer();
          })
          .then((buf) => {
            const blob = new Blob([buf], { type: "application/pdf" });
            const blobUrl = URL.createObjectURL(blob);
            location.href = blobUrl;
          })
          .catch((err) => console.error("PDF加载失败:", err));
        return;
      }
      return;
    }
  }
})();
