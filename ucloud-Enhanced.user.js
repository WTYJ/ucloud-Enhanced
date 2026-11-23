// ==UserScript==
// @name         ucloud-Enhanced
// @namespace    https://github.com/WTYJ/ucloud-Enhanced
// @version      2.6.5
// @description  独立工作台（待办/课程/通知/资源一站式管理），自动深色模式，修复 ticket 跳转循环，Office 365 与浏览器原生 PDF 预览，作业所属课程直达，解除复制限制，课件下载增强，优化页面标题
// @author       WTYJ (基于 uarix/ucloud-Evolved 二次开发)
// @match        https://ucloud.bupt.edu.cn/*
// @match        https://ucloud.bupt.edu.cn/uclass/course.html*
// @match        https://ucloud.bupt.edu.cn/uclass/*
// @match        https://ucloud.bupt.edu.cn/office/*
// @icon         https://ucloud.bupt.edu.cn/favicon.ico
// @connect      github.com
// @connect      raw.githubusercontent.com
// @connect      cdn.jsdelivr.net
// @grant        GM_addStyle
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_registerMenuCommand
// @grant        GM_xmlhttpRequest
// @grant        GM_openInTab
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

  // ========== [MODULE: 10-core.js] 核心层（设置体系 / 深色引擎 / 助手 UI / 平台共享 API） ==========

(function () {
  document.addEventListener("DOMContentLoaded", initializeExtension);
  const settingsConfig = {
    workbench: {
      emoji: '🧩',
      title: '工作台',
      items: {
        entry: {
          type: 'checkbox',
          label: '显示工作台入口',
          description: '在悬浮球快捷面板显示「打开工作台」。',
          defaultValue: true
        },
        autoOpen: {
          type: 'checkbox',
          quick: true,
          label: '进入页面自动打开工作台',
          description: '每次打开或刷新页面后自动弹出工作台。',
          defaultValue: true
        },
        fullscreen: {
          type: 'checkbox',
          quick: true,
          label: '工作台全屏',
          description: '工作台以全屏铺满窗口的方式打开（关闭时为居中浮窗）。',
          defaultValue: false
        }
      }
    },
    home: {
      emoji: '👤',
      title: '个人主页',
      items: {
        useBiggerButton: {
          type: 'checkbox',
          label: '加大翻页按钮尺寸',
          description: '增大个人主页翻页按钮的尺寸和点击区域，提升操作便捷性。',
          defaultValue: true
        },
        useWheelPageTurner: {
          type: 'checkbox',
          label: '使用鼠标滚轮翻页',
          description: '可以使用鼠标滚轮来翻动个人主页的"本学期课程"和"待办"。',
          defaultValue: true
        },
        showTodoCourseName: {
          type: 'checkbox',
          label: '待办显示所属课程',
          description: '在个人主页的待办条目上显示所属课程与教师，方便区分不同课程的作业。',
          defaultValue: true
        },
      }
    },
    preview: {
      emoji: '🖼️',
      title: '课件预览',
      items: {
        autoSwitchOffice: {
          type: 'checkbox',
          label: '使用 Office365 预览 Office 文件',
          description: '使用微软 Office365 在线服务渲染预览 Office 文档，排版还原最好，但需要联网。',
          defaultValue: false
        },
        autoSwitchPdf: {
          type: 'checkbox',
          label: '使用浏览器原生阅读器预览 PDF 文件',
          description: '使用系统（浏览器）原生的阅读器预览PDF文档，提供更好的浏览体验。移动端及部分平板可能不支持。',
          defaultValue: true
        },
        autoDownload: {
          type: 'checkbox',
          label: '预览课件时自动下载',
          description: '当打开课件预览时，自动触发下载操作，方便存储课件到本地。',
          defaultValue: false
        },
        autoClosePopup: {
          type: 'checkbox',
          label: '自动关闭预览时的学习弹窗',
          description: '自动关闭预览时出现的"您已经在学习"及同类弹窗。',
          defaultValue: true
        },
        hideTimer: {
          type: 'checkbox',
          label: '隐藏预览界面的倒计时',
          description: '隐藏课件预览页面的倒计时显示。',
          defaultValue: true
        }
      }
    },
    course: {
      emoji: '📚',
      title: '课程资源',
      items: {
        addBatchDownload: {
          type: 'checkbox',
          label: '增加全部下载按钮',
          description: '增加全部下载按钮，方便一键下载课程中的所有课件。',
          defaultValue: false
        },
        showAllDownloadButoon: {
          type: 'checkbox',
          label: '下载按钮常驻显示',
          description: '在资源页让下载按钮常驻显示，无需悬停才出现。',
          defaultValue: true
        }
      }
    },
    homework: {
      emoji: '📝',
      title: '作业详情',
      items: {
        showHomeworkSource: {
          type: 'checkbox',
          label: '显示作业所属课程',
          description: '在作业详情页显示作业所属的课程名称，便于区分不同课程的作业；点击课程名可直接进入课程主页。',
          defaultValue: true
        }
      }
    },
    system: {
      emoji: '⚙️',
      title: '系统设置',
      items: {
        darkMode: {
          type: 'checkbox',
          quick: true,
          label: '自动切换深色模式',
          description: '跟随操作系统的深色外观自动切换（系统切换时即时生效）；关闭后始终使用浅色主题。',
          defaultValue: true
        },
        fixTicketBug: {
          type: 'checkbox',
          label: '修复 ticket 跳转问题',
          description: '修复登录过期后，重新登录出现"无法获取 ticket"提示的问题。',
          defaultValue: true
        },
        betterTitle: {
          type: 'checkbox',
          label: '优化页面标题',
          description: '优化浏览器标签页的标题显示，更直观地反映当前页面内容。',
          defaultValue: true
        },
        unlockCopy: {
          type: 'checkbox',
          label: '解除复制限制',
          description: '解除全局的复制限制，方便摘录内容进行学习笔记。',
          defaultValue: true
        },
        autoUpdate: {
          type: 'checkbox',
          label: '自动检查更新',
          description: '每次打开页面启动时自动检查一次新版本，发现更新时弹窗提醒（油猴的原生更新是静默的，弹窗能让你感知版本变化）。',
          defaultValue: true
        },
        showConfigButton: {
          type: 'checkbox',
          label: '显示悬浮球',
          description: '在页面显示可拖动的助手悬浮球（点击打开快捷面板）；关闭后仍可从油猴菜单打开设置。',
          defaultValue: true
        }
      }
    }
  };

  // 从配置自动生成settings对象
  const settings = {};
  Object.keys(settingsConfig).forEach(category => {
    settings[category] = {};
    const items = settingsConfig[category].items;
    Object.keys(items).forEach(key => {
      const item = items[key];
      const settingId = `${category}_${key}`;
      settings[category][key] = GM_getValue(settingId, item.defaultValue);
    });
  });

  // ===== 修复 SSO ticket 跳转循环与残留（document-start 阶段即介入）=====
  // 实测根因：
  // 1) /uclass 前端写死了 service=http://ucloud.bupt.edu.cn/uclass，后端 oauth/token 拒绝该 service 签发的 ticket，
  //    导致 /uclass/?ticket=ST-xxx 报 "ticket获取用户账号失败" 并无限循环跳回统一认证。
  // 2) 根路径 https://ucloud.bupt.edu.cn/ 走的才是后端认可的 CAS service；但根路径路由器没有 #/index（补 #/index 会 404）。
  // 3) 根路径换票成功写入 iClass-token 后，自动跳回 /uclass/#/student/homePage（或教师主页）即可无缝进入。
  function ensureUclassTicketHash(urlStr) {
    try {
      const u = new URL(urlStr);
      // 仅对 /uclass 路径补 #/index，绝不碰根路径 "/"（根路径无 #/index 路由，补了会 404）
      if (!u.pathname.startsWith("/uclass") || !u.searchParams.has("ticket") || u.hash) {
        return null;
      }
      return u.pathname + u.search + "#/index";
    } catch (e) {
      return null;
    }
  }

  function stripTicketFromUrl(urlStr) {
    try {
      const u = new URL(urlStr);
      if (!u.searchParams.has("ticket")) return null;
      u.searchParams.delete("ticket");
      const qs = u.searchParams.toString();
      return u.pathname + (qs ? "?" + qs : "") + u.hash;
    } catch (e) {
      return null;
    }
  }

  function isTicketLoginRoute(hashStr) {
    const h = String(hashStr || "");
    return !h || h === "#" || h === "#/" || h.startsWith("#/index");
  }

  function recordUclassTicketAttempt(nowMs = Date.now()) {
    const KEY = "ue_uclass_ticket_loop";
    try {
      const raw = sessionStorage.getItem(KEY) || "";
      const [cntStr, tsStr] = raw.split("|");
      const prevCnt = parseInt(cntStr, 10) || 0;
      const prevTs = parseInt(tsStr, 10) || 0;
      const nextCnt = nowMs - prevTs < 15000 ? prevCnt + 1 : 1;
      sessionStorage.setItem(KEY, `${nextCnt}|${nowMs}`);
      return nextCnt;
    } catch (e) {
      return 1;
    }
  }

  function clearUclassTicketAttempt() {
    try {
      sessionStorage.removeItem("ue_uclass_ticket_loop");
    } catch (e) {}
  }

  function installTicketRedirectFix() {
    if (!settings.system.fixTicketBug) return;
    if (!new URLSearchParams(location.search).has("ticket")) return;

    const isUclass = location.pathname.startsWith("/uclass");

    // 场景 A：根路径 https://ucloud.bupt.edu.cn/?ticket=...（有效 SSO 落地页）
    // 不补 #/index（避免 404）；等待根页面换票写入 iClass-token 后，跳到 /uclass/#/index（不带 ?ticket=），
    // 让 /uclass 登录页走 else { this.checkRole() } 补齐 iClass-user-role / user-info 后再进入主页，
    // 避免直跳 #/student/homePage 跳过角色初始化导致「没有访问权限」
    if (!isUclass) {
      clearUclassTicketAttempt();
      if (window !== window.parent) return;
      const startAt = Date.now();
      const waitToken = setInterval(() => {
        if (getCookie("iClass-token")) {
          clearInterval(waitToken);
          setTimeout(() => {
            location.replace("https://ucloud.bupt.edu.cn/uclass/#/index");
          }, 300);
          return;
        }
        if (Date.now() - startAt > 15000) {
          clearInterval(waitToken);
        }
      }, 150);
      return;
    }

    // 场景 B：/uclass 路径带 ?ticket=
    const patchedWithHash = ensureUclassTicketHash(location.href);
    if (patchedWithHash) {
      try {
        history.replaceState(null, "", patchedWithHash);
      } catch (e) {}
    }

    // iframe 内仅补齐 #/index，交由平台自身 window.parent.location 跳出
    if (window !== window.parent) return;

    const cleanIfLoggedIn = () => {
      if (!new URLSearchParams(location.search).has("ticket")) return true;
      if (isTicketLoginRoute(location.hash)) return false;
      clearUclassTicketAttempt();
      const cleanUrl = stripTicketFromUrl(location.href);
      if (cleanUrl) {
        try {
          history.replaceState(null, "", cleanUrl);
        } catch (e) {}
      }
      return true;
    };

    // 若已在业务路由（如 #/student/homePage）残留旧 ticket，立即无刷新剥离
    if (cleanIfLoggedIn()) return;

    // 15 秒内第 2 次带着 ticket 回到 /uclass 登录页 → 确认命中 service=http://.../uclass 死循环，
    // 立即跳往根路径 https://ucloud.bupt.edu.cn/ 走正确的 CAS service 完成无感登录
    const attempts = recordUclassTicketAttempt();
    if (attempts >= 2) {
      clearUclassTicketAttempt();
      location.replace("https://ucloud.bupt.edu.cn/");
      return;
    }

    // 首次落地 /uclass 登录页：等待平台换票离开 #/index 后无刷新剥离 ?ticket=
    let done = false;
    let pollTimer = null;
    const finish = () => {
      if (done) return;
      if (!cleanIfLoggedIn()) return;
      done = true;
      window.removeEventListener("hashchange", finish);
      if (pollTimer) {
        clearInterval(pollTimer);
        pollTimer = null;
      }
    };
    window.addEventListener("hashchange", finish);
    const startAt = Date.now();
    pollTimer = setInterval(() => {
      if (done || Date.now() - startAt > 20000) {
        clearInterval(pollTimer);
        pollTimer = null;
        return;
      }
      finish();
    }, 250);
  }
  installTicketRedirectFix();

  // ===== 深色模式 v2：CSSOM 样式表自动重写（全站兜底）+ 手写现代色板精调（对齐工作台）=====
  // 彻底告别逐 DOM 元素 getComputedStyle 遍历与 pointerover 监听：
  // 1) 直接读取同源 document.styleSheets（含懒加载分包）并重写浅底/深字/浅边框为 html.ue-dark-mode 前缀 CSS
  // 2) 原生保留所有 :hover/:focus/transition，零鼠标悬停重排、切深浅色仅切换单个类名瞬时完成
  // 3) 叠加手写 Element UI & 云邮高频容器现代深色色板（#0f1117 / #171a21 / #1f242d）与工作台视觉统一
  const DARK_CANVAS = "#0f1117";

  function parseCssColor(str) {
    if (!str) return null;
    const s = String(str).trim().toLowerCase();
    if (!s || s === "transparent" || s === "inherit" || s === "initial" || s === "currentcolor") {
      return null;
    }
    if (s === "white") return { r: 255, g: 255, b: 255, a: 1 };
    if (s === "black") return { r: 0, g: 0, b: 0, a: 1 };
    const m = s.match(
      /rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)(?:[,\s/]+([\d.]+)\s*)?\)/
    );
    if (m) {
      const a = m[4] === undefined ? 1 : +m[4];
      return a > 0 ? { r: +m[1], g: +m[2], b: +m[3], a } : null;
    }
    const hm = s.match(/^#([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/);
    if (hm) {
      let hex = hm[1];
      if (hex.length === 3) {
        hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
      }
      const r = parseInt(hex.slice(0, 2), 16);
      const g = parseInt(hex.slice(2, 4), 16);
      const b = parseInt(hex.slice(4, 6), 16);
      const a = hex.length === 8 ? parseInt(hex.slice(6, 8), 16) / 255 : 1;
      return a > 0 ? { r, g, b, a } : null;
    }
    return null;
  }

  function rgbToHsl(r, g, b) {
    r /= 255;
    g /= 255;
    b /= 255;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const l = (max + min) / 2;
    let h = 0;
    let s = 0;
    if (max !== min) {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
        case r:
          h = (g - b) / d + (g < b ? 6 : 0);
          break;
        case g:
          h = (b - r) / d + 2;
          break;
        default:
          h = (r - g) / d + 4;
      }
      h /= 6;
    }
    return [h, s, l];
  }

  function hue2rgb(p, q, t) {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  }

  function hslToRGB(h, s, l) {
    if (s === 0) {
      const v = Math.round(l * 255);
      return [v, v, v];
    }
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    return [
      Math.round(hue2rgb(p, q, h + 1 / 3) * 255),
      Math.round(hue2rgb(p, q, h) * 255),
      Math.round(hue2rgb(p, q, h - 1 / 3) * 255),
    ];
  }

  // 对齐工作台冷灰深色色板（#0f1117 画布 / #171a21 卡片 / #1f242d 浮层）
  function remapColor(c, kind) {
    const [h, s, l] = rgbToHsl(c.r, c.g, c.b);
    let nh = h;
    let ns = s;
    let nl = l;
    const SLATE_H = 220 / 360;

    if (kind === "text") {
      if (l >= 0.62) return null;
      if (s < 0.2) {
        // 深黑/深灰文字 → 高对比柔白，中灰 → 柔和次级灰
        nh = SLATE_H;
        ns = 0.14;
        nl = Math.min(0.9, 0.66 + (0.62 - l) * 0.44);
      } else {
        // 彩色深字（如深蓝链接）保留色相并适度提亮
        nl = Math.min(0.76, 0.56 + (0.62 - l) * 0.35);
      }
    } else if (kind === "border") {
      const grayish = s < 0.25;
      if (l > 0.72 || (grayish && l > 0.52)) {
        nh = grayish ? SLATE_H : h;
        ns = grayish ? 0.16 : Math.min(s, 0.45);
        nl = 0.21 + (1 - Math.min(1, l)) * 0.12;
      } else {
        return null;
      }
    } else {
      // bg
      const grayish = s < 0.22;
      if (grayish && l > 0.58) {
        nh = SLATE_H;
        ns = 0.18;
        // 纯白(#fff) → 卡片面 ~0.11；浅灰底(#f5f7fa) → 略区分层次 ~0.145
        nl = l >= 0.97 ? 0.11 : 0.125 + (1 - l) * 0.14;
      } else if (!grayish && l > 0.84) {
        // 极浅彩色提示底（如 #ecf5ff / #f0f9eb / #fef0f0）保留色相转深色轻底
        ns = Math.min(s, 0.52);
        nl = 0.165;
      } else {
        return null;
      }
    }

    if (Math.abs(nl - l) < 0.01) return null;
    const [r, g, b] = hslToRGB(nh, ns, nl);
    const alpha = Math.round(c.a * 1000) / 1000;
    return alpha >= 1 ? `rgb(${r}, ${g}, ${b})` : `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

  function splitTopLevelSelectors(selectorText) {
    const parts = [];
    let buf = "";
    let paren = 0;
    let bracket = 0;
    for (let i = 0; i < selectorText.length; i++) {
      const ch = selectorText[i];
      if (ch === "(") paren++;
      else if (ch === ")" && paren > 0) paren--;
      else if (ch === "[") bracket++;
      else if (ch === "]" && bracket > 0) bracket--;
      if (ch === "," && paren === 0 && bracket === 0) {
        const trimmed = buf.trim();
        if (trimmed) parts.push(trimmed);
        buf = "";
      } else {
        buf += ch;
      }
    }
    const last = buf.trim();
    if (last) parts.push(last);
    return parts;
  }

  const DARK_SKIP_SELECTOR_RE =
    /ue-dark-mode|#yzHelper-|\.yz-notify|#downloadAllButton/;

  function scopeDarkSelector(selectorText) {
    const scoped = [];
    for (const raw of splitTopLevelSelectors(selectorText)) {
      if (!raw || DARK_SKIP_SELECTOR_RE.test(raw)) continue;
      if (raw === "html" || raw === ":root") {
        scoped.push("html.ue-dark-mode");
      } else if (/^html(?=[.#:[\s>+~]|$)/i.test(raw)) {
        scoped.push(raw.replace(/^html/i, "html.ue-dark-mode"));
      } else if (/^:root(?=[.#:[\s>+~]|$)/i.test(raw)) {
        scoped.push(raw.replace(/^:root/i, "html.ue-dark-mode"));
      } else {
        scoped.push("html.ue-dark-mode " + raw);
      }
    }
    return scoped.join(", ");
  }

  function rewriteCssRuleList(rules, out) {
    if (!rules) return;
    for (let i = 0; i < rules.length; i++) {
      const rule = rules[i];
      if (rule.type === 1 && rule.selectorText && rule.style) {
        const s = rule.style;
        const pri = (prop) =>
          typeof s.getPropertyPriority === "function" && s.getPropertyPriority(prop) === "important"
            ? " !important"
            : "";
        const decls = [];
        const bgImg = (s.backgroundImage || "").trim().toLowerCase();
        const hasNoBgImage =
          !bgImg ||
          bgImg === "none" ||
          bgImg === "initial" ||
          bgImg === "unset" ||
          bgImg === "revert";
        if (s.backgroundColor && hasNoBgImage) {
          const c = parseCssColor(s.backgroundColor);
          const mapped = c && remapColor(c, "bg");
          if (mapped) decls.push(`background-color:${mapped}${pri("background-color")}`);
        }
        if (s.color) {
          const c = parseCssColor(s.color);
          const mapped = c && remapColor(c, "text");
          if (mapped) decls.push(`color:${mapped}${pri("color")}`);
        }
        const bTop = s.borderTopColor;
        const bRight = s.borderRightColor;
        const bBottom = s.borderBottomColor;
        const bLeft = s.borderLeftColor;
        if (bTop && bTop === bRight && bTop === bBottom && bTop === bLeft) {
          const c = parseCssColor(bTop);
          const mapped = c && remapColor(c, "border");
          if (mapped) {
            const bImp =
              pri("border-top-color") ||
              pri("border-right-color") ||
              pri("border-bottom-color") ||
              pri("border-left-color");
            decls.push(`border-color:${mapped}${bImp}`);
          }
        } else {
          const sides = [
            ["border-top-color", bTop],
            ["border-right-color", bRight],
            ["border-bottom-color", bBottom],
            ["border-left-color", bLeft],
          ];
          for (const [prop, val] of sides) {
            if (!val) continue;
            const c = parseCssColor(val);
            const mapped = c && remapColor(c, "border");
            if (mapped) decls.push(`${prop}:${mapped}${pri(prop)}`);
          }
        }
        if (decls.length) {
          const sel = scopeDarkSelector(rule.selectorText);
          if (sel) out.push(`${sel}{${decls.join(";")}}`);
        }
      } else if (rule.type === 4 && rule.cssRules) {
        // @media
        const inner = [];
        rewriteCssRuleList(rule.cssRules, inner);
        if (inner.length) {
          out.push(`@media ${rule.conditionText || rule.media.mediaText}{${inner.join("")}}`);
        }
      } else if (rule.type === 12 && rule.cssRules) {
        // @supports
        const inner = [];
        rewriteCssRuleList(rule.cssRules, inner);
        if (inner.length) {
          out.push(`@supports ${rule.conditionText}{${inner.join("")}}`);
        }
      }
    }
  }

  const darkProcessedSheets = new WeakSet();
  let darkHeadObserver = null;

  function shouldSkipStyleSheet(sheet) {
    const owner = sheet && sheet.ownerNode;
    if (!owner) return false;
    if (owner.dataset && owner.dataset.ueDarkSheet === "1") return true;
    if (owner.tagName === "STYLE") {
      const txt = owner.textContent || "";
      if (
        txt.includes("#yzHelper-") ||
        txt.includes(".yz-notify") ||
        txt.includes("html.ue-dark-mode")
      ) {
        return true;
      }
    }
    return false;
  }

  function processDarkStyleSheet(sheet) {
    if (!sheet || darkProcessedSheets.has(sheet) || shouldSkipStyleSheet(sheet)) return;
    let rules;
    try {
      rules = sheet.cssRules;
    } catch (e) {
      // 跨域样式表（如 CDN 字体/第三方）跳过即可
      darkProcessedSheets.add(sheet);
      return;
    }
    if (!rules || !rules.length) return;
    darkProcessedSheets.add(sheet);
    const out = [];
    rewriteCssRuleList(rules, out);
    if (!out.length || !document.head) return;
    const styleEl = document.createElement("style");
    styleEl.dataset.ueDarkSheet = "1";
    styleEl.textContent = out.join("\n");
    // 插在手写精调样式之前，保证手写现代色板优先级高于自动重映射
    const handTuned = document.getElementById("ue-dark-handtuned");
    if (handTuned && handTuned.parentNode === document.head) {
      document.head.insertBefore(styleEl, handTuned);
    } else {
      document.head.appendChild(styleEl);
    }
  }

  function scanDarkStyleSheets() {
    if (!document.styleSheets) return;
    for (let i = 0; i < document.styleSheets.length; i++) {
      processDarkStyleSheet(document.styleSheets[i]);
    }
  }

  // 自动深色：开关开启且系统为深色外观时才生效，系统切换时即时响应
  const darkMediaQuery =
    window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)");
  const systemPrefersDark = () => !!(darkMediaQuery && darkMediaQuery.matches);
  const isDarkActive = () => !!settings.system.darkMode && systemPrefersDark();

  function ensureDarkEngine() {
    if (!isDarkActive() || !document.head) return;
    scanDarkStyleSheets();
    if (!darkHeadObserver) {
      // 仅监听 <head> 直接子节点的新增 <style>/<link>（懒加载分包），整个会话仅触发数次
      darkHeadObserver = new MutationObserver((records) => {
        if (!isDarkActive()) return;
        for (const r of records) {
          for (const node of r.addedNodes) {
            if (node.nodeType !== Node.ELEMENT_NODE) continue;
            if (node.dataset && node.dataset.ueDarkSheet === "1") continue;
            if (node.tagName === "STYLE") {
              requestAnimationFrame(() => {
                if (node.sheet) processDarkStyleSheet(node.sheet);
              });
            } else if (node.tagName === "LINK" && node.rel === "stylesheet") {
              if (node.sheet) processDarkStyleSheet(node.sheet);
              else {
                node.addEventListener(
                  "load",
                  () => node.sheet && processDarkStyleSheet(node.sheet),
                  { once: true }
                );
              }
            }
          }
        }
      });
      darkHeadObserver.observe(document.head, { childList: true });
    }
  }

  function applyDarkMode() {
    const active = isDarkActive();
    document.documentElement.classList.toggle("ue-dark-mode", active);
    if (active) ensureDarkEngine();
  }

  // 手写现代深色色板精调层：对齐工作台（#0f1117 / #171a21 / #1f242d），覆盖 Element UI 与高频容器
  const DARK_MODE_CSS = `
    html.ue-dark-mode {
      color-scheme: dark;
      background-color: ${DARK_CANVAS} !important;
      color: #e6edf3;
    }
    html.ue-dark-mode body,
    html.ue-dark-mode #app,
    html.ue-dark-mode #layout-container,
    html.ue-dark-mode .main-content,
    html.ue-dark-mode .router-container,
    html.ue-dark-mode .el-main {
      background-color: ${DARK_CANVAS} !important;
      color: #e6edf3;
    }
    /* 卡片、弹窗、下拉浮层：统一至工作台 Surface (#171a21) */
    html.ue-dark-mode .home-card,
    html.ue-dark-mode .el-card,
    html.ue-dark-mode .el-dialog,
    html.ue-dark-mode .el-drawer,
    html.ue-dark-mode .el-message-box,
    html.ue-dark-mode .el-popover,
    html.ue-dark-mode .el-dropdown-menu,
    html.ue-dark-mode .el-select-dropdown,
    html.ue-dark-mode .el-picker-panel,
    html.ue-dark-mode .el-tabs--border-card {
      background-color: #171a21 !important;
      border-color: rgba(255, 255, 255, 0.08) !important;
      color: #e6edf3 !important;
    }
    html.ue-dark-mode .el-dialog__title,
    html.ue-dark-mode .el-message-box__title,
    html.ue-dark-mode .el-card__header {
      color: #e6edf3 !important;
      border-bottom-color: rgba(255, 255, 255, 0.08) !important;
    }
    html.ue-dark-mode .el-dropdown-menu__item:hover,
    html.ue-dark-mode .el-select-dropdown__item.hover,
    html.ue-dark-mode .el-select-dropdown__item:hover {
      background-color: #1f242d !important;
      color: #60a5fa !important;
    }
    /* 导航菜单与页签 */
    html.ue-dark-mode .el-menu {
      background-color: #171a21 !important;
      border-color: rgba(255, 255, 255, 0.08) !important;
    }
    html.ue-dark-mode .el-menu-item,
    html.ue-dark-mode .el-submenu__title {
      color: #c9d1d9 !important;
    }
    html.ue-dark-mode .el-menu-item:hover,
    html.ue-dark-mode .el-submenu__title:hover {
      background-color: #1f242d !important;
      color: #e6edf3 !important;
    }
    html.ue-dark-mode .el-menu-item.is-active {
      background-color: rgba(59, 130, 246, 0.16) !important;
      color: #60a5fa !important;
    }
    html.ue-dark-mode .el-tabs__item { color: #9aa4b2 !important; }
    html.ue-dark-mode .el-tabs__item.is-active,
    html.ue-dark-mode .el-tabs__item:hover { color: #60a5fa !important; }
    html.ue-dark-mode .el-tabs__nav-wrap::after,
    html.ue-dark-mode .el-tabs--card > .el-tabs__header,
    html.ue-dark-mode .el-tabs--card > .el-tabs__header .el-tabs__nav,
    html.ue-dark-mode .el-tabs--card > .el-tabs__header .el-tabs__item {
      border-color: rgba(255, 255, 255, 0.08) !important;
    }
    /* 表格：表头、斑马纹、悬停行层次分明 */
    html.ue-dark-mode .el-table,
    html.ue-dark-mode .el-table__expanded-cell {
      background-color: #171a21 !important;
      color: #e6edf3 !important;
    }
    html.ue-dark-mode .el-table th.el-table__cell {
      background-color: #1f242d !important;
      color: #9aa4b2 !important;
      border-bottom-color: rgba(255, 255, 255, 0.08) !important;
    }
    html.ue-dark-mode .el-table tr,
    html.ue-dark-mode .el-table td.el-table__cell {
      background-color: #171a21 !important;
      border-bottom-color: rgba(255, 255, 255, 0.06) !important;
      color: #e6edf3 !important;
    }
    html.ue-dark-mode .el-table--striped .el-table__body tr.el-table__row--striped td.el-table__cell {
      background-color: #1b1f28 !important;
    }
    html.ue-dark-mode .el-table--enable-row-hover .el-table__body tr:hover > td.el-table__cell {
      background-color: #222834 !important;
    }
    html.ue-dark-mode .el-table::before { background-color: rgba(255, 255, 255, 0.08) !important; }
    /* 输入框、按钮、分页 */
    html.ue-dark-mode .el-input__inner,
    html.ue-dark-mode .el-textarea__inner {
      background-color: #1f242d !important;
      border-color: rgba(255, 255, 255, 0.12) !important;
      color: #e6edf3 !important;
    }
    html.ue-dark-mode .el-input__inner:focus,
    html.ue-dark-mode .el-textarea__inner:focus {
      border-color: #3b82f6 !important;
    }
    html.ue-dark-mode .el-button--default {
      background-color: #1f242d !important;
      border-color: rgba(255, 255, 255, 0.12) !important;
      color: #e6edf3 !important;
    }
    html.ue-dark-mode .el-button--default:hover {
      background-color: #28303d !important;
      border-color: rgba(96, 165, 250, 0.5) !important;
      color: #93c5fd !important;
    }
    html.ue-dark-mode .el-pagination.is-background .el-pager li:not(.disabled),
    html.ue-dark-mode .el-pagination.is-background .btn-prev,
    html.ue-dark-mode .el-pagination.is-background .btn-next {
      background-color: #1f242d !important;
      color: #c9d1d9 !important;
    }
    html.ue-dark-mode .el-pagination.is-background .el-pager li:not(.disabled).active {
      background-color: #2563eb !important;
      color: #ffffff !important;
    }
    /* Quill 富文本编辑器与作业富文本内联白底/黑字兜底 */
    html.ue-dark-mode .ql-toolbar.ql-snow {
      background-color: #1f242d !important;
      border-color: rgba(255, 255, 255, 0.1) !important;
    }
    html.ue-dark-mode .ql-toolbar.ql-snow .ql-stroke { stroke: #c9d1d9 !important; }
    html.ue-dark-mode .ql-toolbar.ql-snow .ql-fill { fill: #c9d1d9 !important; }
    html.ue-dark-mode .ql-toolbar.ql-snow .ql-picker { color: #c9d1d9 !important; }
    html.ue-dark-mode .ql-container.ql-snow {
      background-color: #171a21 !important;
      border-color: rgba(255, 255, 255, 0.1) !important;
      color: #e6edf3 !important;
    }
    html.ue-dark-mode .ql-editor,
    html.ue-dark-mode #assignment-info [style*="background-color: rgb(255, 255, 255)"],
    html.ue-dark-mode #assignment-info [style*="background: rgb(255, 255, 255)"],
    html.ue-dark-mode #assignment-info [style*="background-color:#fff"],
    html.ue-dark-mode #assignment-info [style*="background:#fff"] {
      background-color: transparent !important;
    }
    html.ue-dark-mode #assignment-info [style*="color: rgb(0, 0, 0)"],
    html.ue-dark-mode #assignment-info [style*="color:#000"],
    html.ue-dark-mode #assignment-info [style*="color: black"],
    html.ue-dark-mode .ql-editor [style*="color: rgb(0, 0, 0)"] {
      color: #e6edf3 !important;
    }
    /* 教学云平台一级主页精调（Logo 提亮、白边渐变去除、导航高亮下划线保留） */
    html.ue-dark-mode .header .left-bg {
      filter: brightness(1.75) saturate(1.1);
    }
    html.ue-dark-mode .layout .banner-box .banner-bg {
      background: transparent !important;
    }
    html.ue-dark-mode .tab-box .tab .tab-item .tab-text .tab-bar {
      background-color: #60a5fa !important;
    }
  `;
  // document-start 阶段即注入手写精调深色层，并打标避免被 CSSOM 重写器二次处理
  const handTunedDarkStyle = GM_addStyle(DARK_MODE_CSS);
  if (handTunedDarkStyle) {
    handTunedDarkStyle.id = "ue-dark-handtuned";
    handTunedDarkStyle.dataset.ueDarkSheet = "1";
  }

  // 辅助变量
  let downloading = false;
  let gpage = -1;
  let glist = null;
  let onlinePreview = null;

  // 初始化扩展功能
  function initializeExtension() {
    // 注册菜单命令
    registerMenuCommands();
    setupWorkbench();

    loadui();

    addFunctionalCSS();
    // DOM 就绪后扫描已加载样式表并开启 <head> 新样式监听（不再遍历 body 或监听 pointerover）
    ensureDarkEngine();
    window.addEventListener("load", () => ensureDarkEngine(), { once: true });
    setTimeout(main, 100);

    if (settings.system.autoUpdate && window === window.parent) {
      checkForUpdates();
    }

    window.addEventListener("hashchange", () => {
      setTimeout(main, 500);
    });
  }

  function toggleSettingsPanel() {
    const panel = document.getElementById("yzHelper-settings");
    if (!panel) return;
    if (panel.classList.contains("visible")) {
      panel.classList.remove("visible");
      setTimeout(() => {
        panel.style.display = "none";
      }, 300);
    } else {
      panel.style.display = "flex";
      void panel.offsetWidth;
      panel.classList.add("visible");
    }
  }

  // 注册菜单命令
  function registerMenuCommands() {
    GM_registerMenuCommand(
      (settings.system.showConfigButton ? "✅ " : "❌ ") +
        "显示悬浮球：" +
        (settings.system.showConfigButton ? "已启用" : "已禁用"),
      () => {
        settings.system.showConfigButton = !settings.system.showConfigButton;
        GM_setValue(
          "system_showConfigButton",
          settings.system.showConfigButton
        );
        location.reload();
      }
    );
    
    GM_registerMenuCommand(
      (settings.system.darkMode ? "🌙 " : "☀️ ") +
        "自动深色模式：" +
        (settings.system.darkMode ? "已开启" : "已关闭"),
      () => {
        settings.system.darkMode = !settings.system.darkMode;
        GM_setValue("system_darkMode", settings.system.darkMode);
        location.reload();
      }
    );

    GM_registerMenuCommand("⚙️ 打开插件设置", toggleSettingsPanel);
  }
  /**
   * 通用标签页打开函数
   * @param {string} url - 要打开的URL
   * @param {Object} options - 选项参数
   * @param {boolean} [options.active=true] - 新标签页是否获得焦点
   * @param {boolean} [options.insert=true] - 是否在当前标签页旁边插入新标签页
   * @param {boolean} [options.setParent=true] - 新标签页是否将当前标签页设为父页面
   * @param {string} [options.windowName="_blank"] - window.open的窗口名称
   * @param {string} [options.windowFeatures=""] - window.open的窗口特性
   * @returns {Object|Window|null} 打开的标签页对象
   */
  function openTab(url, options = {}) {
    const defaultOptions = {
      active: true,
      insert: true,
      setParent: true,
      windowName: "_blank",
      windowFeatures: "",
    };
    const finalOptions = { ...defaultOptions, ...options };
    if (typeof GM_openInTab === "function") {
      try {
        return GM_openInTab(url, {
          active: finalOptions.active,
          insert: finalOptions.insert,
          setParent: finalOptions.setParent,
        });
      } catch (error) {
        return window.open(
          url,
          finalOptions.windowName,
          finalOptions.windowFeatures
        );
      }
    }
  }
  // ===== 通知组件（更新提醒 / 通用提示）：与助手 UI 同一套设计语言，亮/暗自适应，多条垂直堆叠 =====
  const NOTIFY_CSS = `
    #yzHelper-notify-stack {
      position: fixed;
      bottom: 84px;
      right: 20px;
      z-index: 2147483600;
      display: flex;
      flex-direction: column-reverse;
      align-items: flex-end;
      gap: 10px;
      pointer-events: none;
    }
    .yz-notify {
      pointer-events: auto;
      max-width: 310px;
      box-sizing: border-box;
      padding: 14px 16px;
      border-radius: 14px;
      border: 1px solid rgba(31, 35, 41, 0.09);
      background: #ffffff;
      color: #1f2329;
      box-shadow: 0 10px 34px rgba(31, 35, 41, 0.2);
      font-family: 'Segoe UI', 'Microsoft YaHei', sans-serif;
      font-size: 13px;
      opacity: 0;
      transform: translateY(8px);
      transition: opacity 0.25s ease, transform 0.25s ease;
    }
    .yz-notify.visible { opacity: 1; transform: none; }
    .yz-notify .notify-title {
      font-weight: 700; font-size: 14px;
      display: flex; align-items: center; gap: 8px; margin-bottom: 4px;
    }
    .yz-notify .notify-dot {
      width: 8px; height: 8px; border-radius: 50%;
      background: #2962ff; flex-shrink: 0;
    }
    .yz-notify .notify-msg { color: #646a73; line-height: 1.6; }
    .yz-notify .notify-actions { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 12px; }
    .yz-notify .notify-btn {
      border: none; border-radius: 8px; padding: 6px 12px;
      font-size: 12.5px; font-weight: 600; cursor: pointer;
    }
    .yz-notify .notify-btn.primary { background: #2962ff; color: #fff; }
    .yz-notify .notify-btn.primary:hover { background: #1f4fe0; }
    .yz-notify .notify-btn.ghost {
      background: transparent; color: #646a73;
      border: 1px solid rgba(31, 35, 41, 0.14);
    }
    .yz-notify .notify-btn.ghost:hover { color: #1f2329; }
    html.ue-dark-mode .yz-notify {
      background: #202325;
      color: #e8eaed;
      border-color: rgba(232, 234, 237, 0.12);
      box-shadow: 0 10px 34px rgba(0, 0, 0, 0.55);
    }
    html.ue-dark-mode .yz-notify .notify-msg { color: #9aa0a6; }
    html.ue-dark-mode .yz-notify .notify-btn.ghost {
      color: #9aa0a6; border-color: rgba(232, 234, 237, 0.16);
    }
    html.ue-dark-mode .yz-notify .notify-btn.ghost:hover { color: #e8eaed; }
  `;
  GM_addStyle(NOTIFY_CSS);

  function ensureNotifyStack() {
    let stack = document.getElementById("yzHelper-notify-stack");
    if (!stack) {
      stack = document.createElement("div");
      stack.id = "yzHelper-notify-stack";
      document.body.appendChild(stack);
    }
    return stack;
  }

  function createNotify(html, autoCloseMs = 0) {
    const el = document.createElement("div");
    el.className = "yz-notify";
    el.innerHTML = html;
    ensureNotifyStack().appendChild(el);
    requestAnimationFrame(() => el.classList.add("visible"));
    const close = () => {
      el.classList.remove("visible");
      setTimeout(() => el.remove(), 300);
    };
    if (autoCloseMs > 0) setTimeout(close, autoCloseMs);
    return { el, close };
  }

  function showNotification(title, message) {
    createNotify(
      `<div class="notify-title"><span class="notify-dot"></span>${escapeHtml(title)}</div>
      <div class="notify-msg">${escapeHtml(message)}</div>`,
      3000
    );
  }

  const UPDATE_IGNORE_SESSION_KEY = "ue_ignored_update_ver";

  function showUpdateNotification(newVersion) {
    const { el, close } = createNotify(`
      <div class="notify-title"><span class="notify-dot"></span>发现新版本 v${escapeHtml(newVersion)}</div>
      <div class="notify-msg">当前版本 v${GM_info.script.version}，可前往 Releases 查看详细更新日志。</div>
      <div class="notify-actions">
        <button class="notify-btn primary" data-act="update">立即更新</button>
        <button class="notify-btn ghost" data-act="notes">查看日志</button>
        <button class="notify-btn ghost" data-act="ignore">暂时忽略</button>
      </div>
    `);
    el.addEventListener("click", (e) => {
      const act = e.target.dataset && e.target.dataset.act;
      if (act === "update") openTab(GM_info.script.downloadURL, { active: true });
      else if (act === "notes") openTab("https://github.com/WTYJ/ucloud-Enhanced/releases", { active: true });
      else if (act === "ignore") {
        try {
          sessionStorage.setItem(UPDATE_IGNORE_SESSION_KEY, String(newVersion));
        } catch (err) {}
      }
      if (act) close();
    });
  }

  // 更新检查源：github.com 官方源优先（权威、即时），jsdelivr 兜底（国内可达性好，
  // 但对 GitHub 分支内容有最长约 12 小时的缓存延迟，仅作为官方源不可达时的降级）
  const UPDATE_CHECK_SOURCES = [
    GM_info.script.updateURL,
    "https://cdn.jsdelivr.net/gh/WTYJ/ucloud-Enhanced@main/ucloud-Enhanced.user.js",
  ];

  function checkForUpdates(force = false, onDone) {
    const bustParam = "_t=" + Math.floor(Date.now() / 60000);
    const trySource = (index) => {
      if (index >= UPDATE_CHECK_SOURCES.length) {
        if (force) {
          showNotification("检查失败", "所有更新源均无法访问，请稍后再试");
        }
        if (onDone) onDone();
        return;
      }
      const baseUrl = UPDATE_CHECK_SOURCES[index];
      const reqUrl = baseUrl + (baseUrl.includes("?") ? "&" : "?") + bustParam;
      GM_xmlhttpRequest({
        method: "GET",
        url: reqUrl,
        timeout: 8000,
        headers: { "Cache-Control": "no-cache" },
        onload: function (response) {
          const versionMatch = (response.responseText || "").match(
            /@version\s+([\d.]+)/
          );
          if (!versionMatch || !versionMatch[1]) {
            // 响应异常（网络劫持页/错误页），降级下一个源
            trySource(index + 1);
            return;
          }
          const latestVersion = versionMatch[1];
          const currentVersion = GM_info.script.version;
          // 逐段按数值比较，避免 "1.10" < "1.9" 这类字符串比较误判
          const isNewer = (a, b) => {
            const pa = a.split(".").map(Number);
            const pb = b.split(".").map(Number);
            for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
              const d = (pa[i] || 0) - (pb[i] || 0);
              if (d) return d > 0;
            }
            return false;
          };
          if (isNewer(latestVersion, currentVersion)) {
            let ignoredVer = "";
            try {
              ignoredVer = sessionStorage.getItem(UPDATE_IGNORE_SESSION_KEY) || "";
            } catch (err) {}
            if (force || ignoredVer !== latestVersion) {
              showUpdateNotification(latestVersion);
            }
          } else if (force) {
            showNotification("已是最新版本", "当前版本 v" + currentVersion);
          }
          if (onDone) onDone();
        },
        onerror: function () {
          trySource(index + 1);
        },
        ontimeout: function () {
          trySource(index + 1);
        },
      });
    };
    trySource(0);
  }

  function loadui() {
    GM_addStyle(`
      /* ===== 设计变量：品牌蓝主色，亮/暗双主题（独立于页面深色引擎） ===== */
      #yzHelper-ball, #yzHelper-quick, #yzHelper-settings {
          --ue-accent: #2962ff;
          --ue-accent-weak: rgba(41, 98, 255, 0.12);
          --ue-bg: #ffffff;
          --ue-bg-2: #f5f7fa;
          --ue-text: #1f2329;
          --ue-text-2: #646a73;
          --ue-border: rgba(31, 35, 41, 0.09);
          --ue-shadow: 0 10px 34px rgba(31, 35, 41, 0.18);
          font-family: 'Segoe UI', 'Microsoft YaHei', sans-serif;
      }
      html.ue-dark-mode #yzHelper-ball,
      html.ue-dark-mode #yzHelper-quick,
      html.ue-dark-mode #yzHelper-settings {
          --ue-bg: #202325;
          --ue-bg-2: #2a2e31;
          --ue-text: #e8eaed;
          --ue-text-2: #9aa0a6;
          --ue-border: rgba(232, 234, 237, 0.12);
          --ue-shadow: 0 10px 34px rgba(0, 0, 0, 0.55);
      }

      /* ===== 悬浮球 ===== */
      #yzHelper-ball {
          position: fixed;
          width: 46px;
          height: 46px;
          border-radius: 50%;
          background: linear-gradient(135deg, #3d7bff, #2962ff);
          color: #fff;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 20px;
          cursor: pointer;
          z-index: 10000;
          box-shadow: 0 4px 14px rgba(41, 98, 255, 0.42);
          opacity: 0.72;
          transition: opacity 0.2s, transform 0.2s;
          user-select: none;
          touch-action: none;
      }
      #yzHelper-ball:hover {
          opacity: 1;
          transform: scale(1.07);
      }
      #yzHelper-ball.dragging {
          opacity: 1;
          transition: none;
          cursor: grabbing;
          transform: scale(1.12);
      }
      #yzHelper-ball.snap-anim {
          transition: left 0.25s ease, top 0.25s ease, opacity 0.2s;
      }

      /* ===== 快捷面板 ===== */
      #yzHelper-quick {
          position: fixed;
          width: 262px;
          background: var(--ue-bg);
          border: 1px solid var(--ue-border);
          border-radius: 14px;
          box-shadow: var(--ue-shadow);
          z-index: 10000;
          padding: 10px;
          display: none;
          color: var(--ue-text);
          box-sizing: border-box;
      }
      #yzHelper-quick.visible {
          display: block;
          animation: ue-pop 0.18s ease;
      }
      @keyframes ue-pop {
          from { opacity: 0; transform: translateY(6px); }
          to { opacity: 1; transform: none; }
      }
      #yzHelper-quick .quick-title {
          font-size: 11.5px;
          font-weight: 600;
          color: var(--ue-text-2);
          letter-spacing: 0.06em;
          padding: 4px 8px 8px;
      }
      #yzHelper-quick .quick-item {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 8px;
          border-radius: 10px;
          font-size: 13px;
      }
      #yzHelper-quick .quick-item:hover {
          background: var(--ue-bg-2);
      }
      #yzHelper-quick .quick-item .setting-label {
          flex: 1;
          cursor: pointer;
      }
      #yzHelper-quick .quick-workbench {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          width: calc(100% - 12px);
          margin: 4px 6px 8px;
          padding: 9px 12px;
          border: none;
          border-radius: 10px;
          background: linear-gradient(135deg, #3d7bff, #2962ff);
          color: #fff;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          box-shadow: 0 3px 10px rgba(41, 98, 255, 0.28);
          transition: filter 0.15s ease;
      }
      #yzHelper-quick .quick-workbench:hover {
          filter: brightness(1.06);
      }
      #yzHelper-quick .quick-footer {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 6px;
          border-top: 1px solid var(--ue-border);
          margin-top: 6px;
          padding: 8px 6px 2px;
      }
      #yzHelper-quick .quick-footer-btns {
          display: inline-flex;
          align-items: center;
          gap: 6px;
      }
      #yzHelper-quick .quick-all {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          background: var(--ue-accent-weak);
          color: var(--ue-accent);
          border: none;
          border-radius: 8px;
          padding: 6px 10px;
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
      }
      #yzHelper-quick .quick-all:hover {
          background: var(--ue-accent);
          color: #fff;
      }
      #yzHelper-quick .quick-check-btn {
          background: var(--ue-bg-2);
          color: var(--ue-text-2);
          border: 1px solid var(--ue-border);
          border-radius: 8px;
          padding: 5px 9px;
          font-size: 12px;
          font-weight: 500;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: 4px;
      }
      @keyframes ueSpin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
      }
      #yzHelper-quick .quick-check-btn .ue-btn-ico,
      #section-about .about-btn .ue-btn-ico {
          flex-shrink: 0;
      }
      #yzHelper-quick .quick-check-btn.is-loading .ue-btn-ico,
      #section-about .about-btn.is-loading .ue-btn-ico {
          animation: ueSpin 0.8s linear infinite;
      }
      #yzHelper-quick .quick-check-btn:hover {
          color: var(--ue-text);
          border-color: var(--ue-accent);
      }
      #yzHelper-quick .quick-check-btn:disabled {
          opacity: 0.6;
          cursor: default;
      }
      #yzHelper-quick .quick-ver {
          font-size: 11.5px;
          color: var(--ue-text-2);
      }

      /* ===== 设置主面板 ===== */
      #yzHelper-settings {
          position: fixed;
          bottom: 20px;
          right: 20px;
          background: var(--ue-bg);
          border: 1px solid var(--ue-border);
          box-shadow: var(--ue-shadow);
          border-radius: 16px;
          z-index: 2147483500;
          width: 580px;
          height: 500px;
          color: var(--ue-text);
          overflow: hidden;
          flex-direction: column;
          display: none;
          opacity: 0;
          transform: translateY(10px) scale(0.98);
          transition: opacity 0.25s ease, transform 0.25s ease;
      }
      #yzHelper-settings .section-note {
          font-size: 12px;
          line-height: 1.55;
          color: var(--ue-text-2);
          background: var(--ue-accent-weak);
          border-radius: 10px;
          padding: 8px 12px;
          margin-bottom: 12px;
      }
      #yzHelper-settings .section-group-title {
          font-size: 12px;
          font-weight: 700;
          color: var(--ue-text-2);
          letter-spacing: 0.04em;
          margin: 14px 4px 8px;
      }
      #yzHelper-settings .section-group-title:first-child {
          margin-top: 2px;
      }
      #yzHelper-settings.visible {
          opacity: 1;
          transform: none;
      }

      #yzHelper-header {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 13px 16px;
          border-bottom: 1px solid var(--ue-border);
      }
      #yzHelper-header .hd-title {
          font-size: 15px;
          font-weight: 700;
          flex: 1;
          display: flex;
          align-items: center;
          gap: 9px;
      }
      #yzHelper-header .hd-logo {
          width: 22px;
          height: 22px;
          border-radius: 7px;
          background: linear-gradient(135deg, #3d7bff, #2962ff);
          color: #fff;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 13px;
      }
      #yzHelper-header .hd-version {
          font-size: 11px;
          color: var(--ue-accent);
          background: var(--ue-accent-weak);
          padding: 2px 9px;
          border-radius: 99px;
          font-weight: 600;
      }
      #yzHelper-header .hd-close {
          border: none;
          background: transparent;
          color: var(--ue-text-2);
          font-size: 17px;
          cursor: pointer;
          width: 28px;
          height: 28px;
          border-radius: 8px;
          line-height: 1;
      }
      #yzHelper-header .hd-close:hover {
          background: var(--ue-bg-2);
          color: var(--ue-text);
      }

      #yzHelper-main {
          display: flex;
          flex: 1;
          overflow: hidden;
      }

      #yzHelper-settings-sidebar {
          width: 148px;
          background: var(--ue-bg-2);
          padding: 10px 8px;
          border-right: 1px solid var(--ue-border);
          overflow-y: auto;
          display: flex;
          flex-direction: column;
          gap: 2px;
          box-sizing: border-box;
      }

      #yzHelper-settings-sidebar .menu-item {
          padding: 9px 10px;
          cursor: pointer;
          font-size: 13px;
          color: var(--ue-text-2);
          display: flex;
          align-items: center;
          gap: 8px;
          border-radius: 9px;
          transition: background 0.15s, color 0.15s;
      }

      #yzHelper-settings-sidebar .menu-item:hover {
          color: var(--ue-text);
      }

      #yzHelper-settings-sidebar .menu-item.active {
          background: var(--ue-bg);
          color: var(--ue-accent);
          font-weight: 600;
          box-shadow: 0 1px 4px rgba(0, 0, 0, 0.08);
      }

      html.ue-dark-mode #yzHelper-settings-sidebar .menu-item.active {
          background: var(--ue-accent-weak);
          box-shadow: none;
      }

      #yzHelper-settings-sidebar .emoji {
          font-size: 15px;
      }

      #yzHelper-settings-content {
          flex: 1;
          padding: 16px 18px;
          overflow-y: auto;
          position: relative;
      }

      #yzHelper-settings-content .settings-section {
          display: none;
      }

      #yzHelper-settings-content .settings-section.active {
          display: block;
      }

      #section-about .about-content {
          line-height: 1.7;
          font-size: 13.5px;
      }

      #section-about h4 {
          margin: 16px 0 8px;
          font-size: 14.5px;
      }

      #section-about ul {
          margin: 8px 0;
          padding-left: 20px;
      }

      #section-about li {
          margin-bottom: 4px;
      }

      #section-about .github-link {
          display: inline-flex;
          align-items: center;
          padding: 7px 13px;
          background: var(--ue-bg-2);
          border: 1px solid var(--ue-border);
          border-radius: 8px;
          color: var(--ue-text);
          text-decoration: none;
          font-weight: 500;
          transition: border-color 0.2s;
      }

      #section-about .github-link:hover {
          border-color: var(--ue-accent);
          color: var(--ue-accent);
      }

      #section-about .github-icon {
          margin-right: 6px;
          fill: currentColor;
      }

      #section-about .about-update-row {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-top: 10px;
      }
      #section-about .about-btn {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: var(--ue-accent);
          color: #fff;
          border: none;
          border-radius: 8px;
          padding: 7px 14px;
          font-size: 12.5px;
          font-weight: 600;
          cursor: pointer;
          transition: background 0.15s;
      }
      #section-about .about-btn:hover {
          background: #1f4fe0;
      }
      #section-about .about-btn:disabled {
          opacity: 0.6;
          cursor: default;
      }
      #section-about .about-update-tip {
          font-size: 12px;
          color: var(--ue-text-2);
      }


      #section-about .feedback-note {
          margin-top: 14px;
          border-top: 1px solid var(--ue-border);
          padding-top: 14px;
          font-size: 13px;
          color: var(--ue-text-2);
      }

      #section-about a {
          color: var(--ue-accent);
      }

      #section-about code {
          background: var(--ue-bg-2);
          color: var(--ue-text);
          padding: 0.2em 0.4em;
          border-radius: 6px;
          font-family: ui-monospace, SFMono-Regular, SF Mono, Menlo, Consolas, Liberation Mono, monospace;
          font-size: 85%;
      }

      #yzHelper-settings .setting-item {
          margin-bottom: 10px;
          background: var(--ue-bg-2);
          border: 1px solid transparent;
          border-radius: 12px;
          padding: 10px 12px;
          transition: border-color 0.15s;
      }
      #yzHelper-settings .setting-item:hover {
          border-color: var(--ue-border);
      }
      #yzHelper-settings .setting-toggle {
          display: flex;
          align-items: center;
      }
      #yzHelper-settings .setting-toggle .switch {
          order: 2;
          margin-left: auto;
      }
      #yzHelper-settings .setting-label {
          flex: 1;
          font-size: 13.5px;
          font-weight: 500;
          cursor: pointer;
      }

      /* ===== 开关（设置面板与快捷面板共用） ===== */
      #yzHelper-settings .switch,
      #yzHelper-quick .switch {
          position: relative;
          display: inline-block;
          width: 40px;
          height: 22px;
          flex-shrink: 0;
      }
      #yzHelper-settings .switch input,
      #yzHelper-quick .switch input {
          opacity: 0;
          width: 0;
          height: 0;
      }
      #yzHelper-settings .slider,
      #yzHelper-quick .slider {
          position: absolute;
          cursor: pointer;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-color: rgba(128, 134, 142, 0.4);
          transition: 0.25s;
          border-radius: 22px;
      }
      #yzHelper-settings .slider:before,
      #yzHelper-quick .slider:before {
          position: absolute;
          content: "";
          height: 16px;
          width: 16px;
          left: 3px;
          bottom: 3px;
          background-color: #fff;
          transition: 0.25s;
          border-radius: 50%;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.25);
      }
      #yzHelper-settings input:checked + .slider,
      #yzHelper-quick input:checked + .slider {
          background-color: var(--ue-accent);
      }
      #yzHelper-settings input:focus-visible + .slider,
      #yzHelper-quick input:focus-visible + .slider {
          box-shadow: 0 0 0 3px var(--ue-accent-weak);
      }
      #yzHelper-settings input:checked + .slider:before,
      #yzHelper-quick input:checked + .slider:before {
          transform: translateX(18px);
      }

      #yzHelper-settings .setting-description {
          display: block;
          margin-left: 0;
          margin-top: 8px;
          font-size: 12px;
          line-height: 1.6;
          color: var(--ue-text-2);
          background: transparent;
          border-left: 3px solid var(--ue-accent);
          border-radius: 0 6px 6px 0;
          max-height: 0;
          overflow: hidden;
          opacity: 0;
          transition: all 0.25s ease;
          padding: 0 12px;
      }

      #yzHelper-settings .setting-description.visible {
          max-height: 120px;
          opacity: 1;
          padding: 6px 12px;
      }

      #yzHelper-settings .setting-item .setting-toggle:has(input:disabled) {
          opacity: 0.55;
      }

      #yzHelper-settings .setting-item:has(input:disabled) .setting-label:after {
          content: " 🔒";
          font-size: 12px;
      }

      #yzHelper-settings .setting-item:has(input:disabled) .setting-description {
          border-left-color: var(--ue-border);
          font-style: italic;
      }

      /* 滚动条与面板配色一致 */
      #yzHelper-settings ::-webkit-scrollbar,
      #yzHelper-quick ::-webkit-scrollbar {
          width: 8px;
      }
      #yzHelper-settings ::-webkit-scrollbar-thumb,
      #yzHelper-quick ::-webkit-scrollbar-thumb {
          background: var(--ue-border);
          border-radius: 4px;
      }
    `);

    // ===== 悬浮球：可拖动、贴边吸附、位置记忆，点击弹出快捷面板 =====
    const ball = document.createElement("div");
    ball.id = "yzHelper-ball";
    ball.title = "云邮助手 · 点击打开快捷面板，可拖动";
    ball.innerHTML = "⚙";

    const savedBallPos = GM_getValue("ui_ballPos", null);
    // side 记录吸附侧（left/right）：窗口放大时据此跟随对应边缘；旧存储无 side 时按位置推断
    let ballSide = null;
    if (savedBallPos && typeof savedBallPos.left === "number") {
      ballSide =
        savedBallPos.side === "left" || savedBallPos.side === "right"
          ? savedBallPos.side
          : savedBallPos.left > window.innerWidth / 2
          ? "right"
          : "left";
      ball.style.left =
        (ballSide === "right" ? window.innerWidth - 54 : 8) + "px";
      ball.style.top =
        Math.max(8, Math.min(savedBallPos.top, window.innerHeight - 54)) + "px";
    } else {
      ball.style.right = "20px";
      ball.style.bottom = "20px";
    }

    let dragState = null;
    ball.addEventListener("pointerdown", (e) => {
      dragState = { startX: e.clientX, startY: e.clientY, moved: false };
      ball.setPointerCapture(e.pointerId);
    });
    ball.addEventListener("pointermove", (e) => {
      if (!dragState) return;
      const dx = e.clientX - dragState.startX;
      const dy = e.clientY - dragState.startY;
      if (!dragState.moved && Math.hypot(dx, dy) > 6) {
        dragState.moved = true;
        ball.classList.add("dragging");
        const rect = ball.getBoundingClientRect();
        ball.style.right = "auto";
        ball.style.bottom = "auto";
        ball.style.left = rect.left + "px";
        ball.style.top = rect.top + "px";
        closeQuickPanel();
      }
      if (dragState.moved) {
        ball.style.left =
          Math.max(8, Math.min(e.clientX - 23, window.innerWidth - 54)) + "px";
        ball.style.top =
          Math.max(8, Math.min(e.clientY - 23, window.innerHeight - 54)) + "px";
      }
    });
    const finishDrag = () => {
      if (!dragState) return;
      const wasDrag = dragState.moved;
      dragState = null;
      ball.classList.remove("dragging");
      if (wasDrag) {
        const rect = ball.getBoundingClientRect();
        const toLeft = rect.left + rect.width / 2 < window.innerWidth / 2;
        const targetLeft = toLeft ? 8 : window.innerWidth - 54;
        ball.classList.add("snap-anim");
        ball.style.left = targetLeft + "px";
        ballSide = toLeft ? "left" : "right";
        GM_setValue("ui_ballPos", {
          left: targetLeft,
          top: rect.top,
          side: ballSide,
        });
        setTimeout(() => ball.classList.remove("snap-anim"), 300);
      } else {
        toggleQuickPanel();
      }
    };
    ball.addEventListener("pointerup", finishDrag);
    ball.addEventListener("pointercancel", finishDrag);

    // 窗口尺寸变化时修正悬浮球位置：
    // 缩小时钳回可视区，放大时按吸附侧跟随对应边缘（右吸附跟右缘，左吸附不动）
    let ballResizePersist = null;
    window.addEventListener("resize", () => {
      if (!ball.style.left) return; // 未拖动过的球用 right/bottom 定位，浏览器自动跟随
      const maxLeft = window.innerWidth - 54;
      const maxTop = window.innerHeight - 54;
      const curLeft = parseFloat(ball.style.left) || 0;
      const curTop = parseFloat(ball.style.top) || 0;
      let newLeft = Math.max(8, Math.min(curLeft, maxLeft));
      if (ballSide === "right") newLeft = maxLeft;
      const newTop = Math.max(8, Math.min(curTop, maxTop));
      if (newLeft !== curLeft || newTop !== curTop) {
        ball.classList.add("snap-anim");
        ball.style.left = newLeft + "px";
        ball.style.top = newTop + "px";
        clearTimeout(ballResizePersist);
        ballResizePersist = setTimeout(() => {
          ball.classList.remove("snap-anim");
          GM_setValue("ui_ballPos", {
            left: newLeft,
            top: newTop,
            side: ballSide,
          });
        }, 300);
      }
    });
    if (settings.system.showConfigButton) {
      document.body.appendChild(ball);
    }

    // ===== 即改即存：轻量设置即时热生效，依赖注入/Hook 的设置自动刷新 =====
    let applyReloadTimer = null;
    const HOT_APPLY_KEYS = new Set([
      "workbench_fullscreen",
      "workbench_entry",
      "workbench_autoOpen",
      "system_darkMode",
      "system_showConfigButton",
      "system_autoUpdate",
    ]);

    function saveSettingAndApply(category, key, value) {
      const settingId = `${category}_${key}`;
      settings[category][key] = value;
      GM_setValue(settingId, value);
      // 同步快捷面板与设置主面板的同名开关状态
      document
        .querySelectorAll(`input[id="${settingId}"], input[data-setting-id="${settingId}"]`)
        .forEach((el) => {
          if (el.checked !== value) el.checked = value;
        });
      if (HOT_APPLY_KEYS.has(settingId)) {
        if (settingId === "system_darkMode") applyDarkMode();
        else if (settingId === "workbench_fullscreen") wbApplyTheme();
        else if (settingId === "workbench_entry" && quickPanel.classList.contains("visible")) {
          buildQuickPanel();
        } else if (settingId === "system_showConfigButton") {
          if (value) {
            if (!ball.isConnected) document.body.appendChild(ball);
          } else {
            closeQuickPanel();
            ball.remove();
          }
        }
        showNotification("已生效", "设置已即时应用");
        return;
      }
      showNotification("已保存", "即将刷新生效…");
      clearTimeout(applyReloadTimer);
      applyReloadTimer = setTimeout(() => location.reload(), 700);
    }

    function bindAutoSave(container) {
      container.addEventListener("change", (e) => {
        const input = e.target;
        const settingId = input && ((input.dataset && input.dataset.settingId) || input.id);
        if (!settingId || !settingId.includes("_")) return;
        const [category, settingName] = settingId.split("_");
        if (!settings[category]) return;
        if (input.type === "checkbox") {
          saveSettingAndApply(category, settingName, input.checked);
        }
      });
    }

    const SETTINGS_ICON_SVG =
      '<svg class="ue-btn-ico" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>';
    const UPDATE_ICON_SVG =
      '<svg class="ue-btn-ico" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12a9 9 0 1 1-2.64-6.36"/><polyline points="21 3 21 9 15 9"/></svg>';

    // ===== 快捷面板：工作台直达置顶 + 核心高频开关 =====
    const quickPanel = document.createElement("div");
    quickPanel.id = "yzHelper-quick";

    const QUICK_SWITCH_ITEMS = [
      ["workbench", "autoOpen"],
      ["workbench", "fullscreen"],
      ["system", "darkMode"],
    ];

    function buildQuickPanel() {
      const rows = QUICK_SWITCH_ITEMS.map(([category, key]) => {
        const item = settingsConfig[category] && settingsConfig[category].items[key];
        if (!item) return "";
        const settingId = `${category}_${key}`;
        return `
          <div class="quick-item">
            <span class="setting-label">${item.label}</span>
            <label class="switch">
              <input type="checkbox" data-setting-id="${settingId}" ${
          settings[category][key] ? "checked" : ""
        }>
              <span class="slider"></span>
            </label>
          </div>
        `;
      });
      const wbBoxHtml = settings.workbench.entry
        ? `<button class="quick-workbench" data-wb-open="todo">🧩 打开工作台</button>`
        : "";
      quickPanel.innerHTML = `
        ${wbBoxHtml}
        <div class="quick-title">快捷开关</div>
        ${rows.join("")}
        <div class="quick-footer">
          <div class="quick-footer-btns">
            <button class="quick-all" id="yzHelper-quick-all">${SETTINGS_ICON_SVG}<span>全部设置</span></button>
            <button class="quick-check-btn" id="yzHelper-quick-update" title="立即检查新版本">${UPDATE_ICON_SVG}<span>检查更新</span></button>
          </div>
          <span class="quick-ver">v${GM_info.script.version}</span>
        </div>
      `;
    }

    function positionQuickPanel() {
      const rect = ball.getBoundingClientRect();
      const width = 268;
      let left = rect.left + rect.width / 2 - width / 2;
      left = Math.max(10, Math.min(left, window.innerWidth - width - 10));
      quickPanel.style.left = left + "px";
      if (rect.top > 360) {
        quickPanel.style.bottom = window.innerHeight - rect.top + 12 + "px";
        quickPanel.style.top = "auto";
      } else {
        quickPanel.style.top = rect.bottom + 12 + "px";
        quickPanel.style.bottom = "auto";
      }
    }

    function openQuickPanel() {
      buildQuickPanel();
      positionQuickPanel();
      quickPanel.classList.add("visible");
    }

    function closeQuickPanel() {
      quickPanel.classList.remove("visible");
    }

    function toggleQuickPanel() {
      if (quickPanel.classList.contains("visible")) closeQuickPanel();
      else openQuickPanel();
    }

    document.body.appendChild(quickPanel);
    bindAutoSave(quickPanel);
    quickPanel.addEventListener("click", (e) => {
      const wbBtn = e.target.closest("[data-wb-open]");
      if (wbBtn) {
        const targetTab = wbBtn.getAttribute("data-wb-open") || "todo";
        closeQuickPanel();
        wbOpen(targetTab);
        return;
      }
      if (e.target.closest("#yzHelper-quick-all")) {
        closeQuickPanel();
        toggleSettingsPanel();
        return;
      }
      const updBtn = e.target.closest("#yzHelper-quick-update");
      if (updBtn && !updBtn.disabled) {
        const updLabel = updBtn.querySelector("span");
        updBtn.disabled = true;
        updBtn.classList.add("is-loading");
        if (updLabel) updLabel.textContent = "检查中…";
        checkForUpdates(true, () => {
          if (updBtn.isConnected) {
            updBtn.disabled = false;
            updBtn.classList.remove("is-loading");
            if (updLabel) updLabel.textContent = "检查更新";
          }
        });
      }
    });
    // 点击快捷面板与悬浮球以外的区域时关闭快捷面板
    document.addEventListener(
      "click",
      (e) => {
        if (!quickPanel.classList.contains("visible")) return;
        if (
          e.target.closest("#yzHelper-quick") ||
          e.target.closest("#yzHelper-ball")
        )
          return;
        closeQuickPanel();
      },
      true
    );

    // ===== 设置中心：以工作台为主导的 5 分类收敛视图（底层 category_key 存储完全兼容）=====
    const SETTINGS_NAV_SECTIONS = [
      {
        id: "workbench",
        emoji: "🧩",
        title: "工作台与导航",
        note: "工作台提供独立的待办（含已提交未截止）、课程空间、作业详情（含批改透视）与通知中心。",
        groups: [
          {
            title: "工作台体验",
            items: [
              ["workbench", "autoOpen"],
              ["workbench", "fullscreen"],
              ["workbench", "entry"],
            ],
          },
        ],
      },
      {
        id: "preview",
        emoji: "🖼️",
        title: "课件与预览",
        note: "同时作用于「工作台 → 课程空间 / 作业详情」与平台原网页的课件、附件预览。",
        groups: [
          {
            title: "预览引擎",
            items: [
              ["preview", "autoSwitchOffice"],
              ["preview", "autoSwitchPdf"],
            ],
          },
          {
            title: "预览辅助",
            items: [
              ["preview", "autoDownload"],
              ["preview", "autoClosePopup"],
              ["preview", "hideTimer"],
            ],
          },
        ],
      },
      {
        id: "system",
        emoji: "⚙️",
        title: "外观与系统",
        groups: [
          {
            title: "外观与入口",
            items: [
              ["system", "darkMode"],
              ["system", "showConfigButton"],
              ["system", "autoUpdate"],
            ],
          },
          {
            title: "通用增强",
            items: [
              ["system", "betterTitle"],
              ["system", "unlockCopy"],
              ["system", "fixTicketBug"],
            ],
          },
        ],
      },
      {
        id: "pagemods",
        emoji: "📄",
        title: "原页面增强",
        note: "以下开关仅增强云邮平台原网页（不影响独立工作台）。",
        groups: [
          {
            title: "原页个人主页与作业详情",
            items: [
              ["home", "showTodoCourseName"],
              ["home", "useWheelPageTurner"],
              ["home", "useBiggerButton"],
              ["homework", "showHomeworkSource"],
            ],
          },
          {
            title: "原页课程资源",
            items: [
              ["course", "addBatchDownload"],
              ["course", "showAllDownloadButoon"],
            ],
          },
        ],
      },
    ];

    function generateSettingItem(category, key, item) {
      const settingId = `${category}_${key}`;
      const value = settings[category][key];
      const disabledAttr = item.disabled ? "disabled" : "";
      const checkedAttr = value ? "checked" : "";
      return `
        <div class="setting-item">
          <div class="setting-toggle">
            <label class="switch">
              <input type="checkbox" id="${settingId}" ${checkedAttr} ${disabledAttr}>
              <span class="slider"></span>
            </label>
            <span class="setting-label" data-for="description-${settingId}">${item.label}</span>
          </div>
          <div class="setting-description" id="description-${settingId}">
            ${item.description}
          </div>
        </div>
      `;
    }

    function generateNavSection(sec, isActive = false) {
      const activeClass = isActive ? "active" : "";
      const noteHtml = sec.note ? `<div class="section-note">${sec.note}</div>` : "";
      const groupsHtml = sec.groups
        .map((g) => {
          const titleHtml = g.title ? `<div class="section-group-title">${g.title}</div>` : "";
          const itemsHtml = g.items
            .map(([cat, key]) => {
              const item = settingsConfig[cat] && settingsConfig[cat].items[key];
              return item ? generateSettingItem(cat, key, item) : "";
            })
            .join("");
          return titleHtml + itemsHtml;
        })
        .join("");

      return `
        <div class="settings-section ${activeClass}" id="section-${sec.id}">
          ${noteHtml}
          ${groupsHtml}
        </div>
      `;
    }

    function generateSidebarMenu() {
      return (
        SETTINGS_NAV_SECTIONS.map((sec, index) => {
          const activeClass = index === 0 ? "active" : "";
          return `
            <div class="menu-item ${activeClass}" data-section="${sec.id}">
              <span class="emoji">${sec.emoji}</span>
              <span>${sec.title}</span>
            </div>
          `;
        }).join("") +
        `
        <div class="menu-item" data-section="about">
          <span class="emoji">ℹ️</span>
          <span>关于助手</span>
        </div>
      `
      );
    }

    function generateAllSections() {
      let sectionsHTML = SETTINGS_NAV_SECTIONS.map((sec, idx) =>
        generateNavSection(sec, idx === 0)
      ).join("");

      sectionsHTML += `
        <div class="settings-section" id="section-about">
          <div class="about-content">
            <p><strong>ucloud-Enhanced</strong> 是一款以「独立工作台」为核心的北邮云邮教学空间增强脚本。</p>

            <h4>🚀 核心功能</h4>
            <ul>
              <li>🧩 <strong>独立工作台</strong> - 待办（待完成 / 已提交未截止）、课程、通知三合一，支持快捷键与滚动记忆</li>
              <li>📝 <strong>作业详情与批改透视</strong> - 直接查看要求、附件、班级进度及「我的得分 / 教师评语 / 已交附件」</li>
              <li>📚 <strong>课程空间</strong> - 课件按章节分组搜索、在线预览、按章节或整课批量下载，本课作业与测试一览</li>
              <li>🌓 <strong>自动深色模式</strong> - 跟随系统外观即时切换，工作台与原网页亮/暗双主题适配</li>
              <li>📄 <strong>课件预览与原页增强</strong> - Office365 / 原生 PDF / 内置图片阅读器、解除复制限制与标题优化</li>
            </ul>

            <h4>🔗 相关链接</h4>
            <p>
              <a href="https://github.com/WTYJ/ucloud-Enhanced/" target="_blank" class="github-link">
                <svg class="github-icon" height="16" width="16" viewBox="0 0 16 16" aria-hidden="true">
                  <path d="M8 0c4.42 0 8 3.58 8 8a8.013 8.013 0 0 1-5.45 7.59c-.4.08-.55-.17-.55-.38 0-.27.01-1.13.01-2.2 0-.75-.25-1.23-.54-1.48 1.78-.2 3.65-.88 3.65-3.95 0-.88-.31-1.59-.82-2.15.08-.2.36-1.02-.08-2.12 0 0-.67-.22-2.2.82-.64-.18-1.32-.27-2-.27-.68 0-1.36.09-2 .27-1.53-1.03-2.2-.82-2.2-.82-.44 1.1-.16 1.92-.08 2.12-.51.56-.82 1.28-.82 2.15 0 3.06 1.86 3.75 3.64 3.95-.23.2-.44.55-.51 1.07-.46.21-1.61.55-2.33-.66-.15-.24-.6-.83-1.23-.82-.67.01-.27.38.01.53.34.19.73.9.82 1.13.16.45.68 1.31 2.69.94 0 .67.01 1.3.01 1.49 0 .21-.15.45-.55.38A7.995 7.995 0 0 1 0 8c0-4.42 3.58-8 8-8Z"></path>
                </svg>
                <span>GitHub 项目主页</span>
              </a>
            </p>

            <div class="about-update-row">
              <button id="yzHelper-check-update" class="about-btn">${UPDATE_ICON_SVG}<span>立即检查更新</span></button>
              <span class="about-update-tip">每次打开页面启动时自动检查，也可手动检查</span>
            </div>

            <p class="feedback-note">
              如有问题或建议，请通过
              <a href="https://github.com/WTYJ/ucloud-Enhanced/issues" target="_blank">GitHub Issues</a>
              提交反馈。
            </p>
          </div>
        </div>
      `;

      return sectionsHTML;
    }

    const settingsPanel = document.createElement("div");
    settingsPanel.id = "yzHelper-settings";

    const header = `
      <div id="yzHelper-header">
        <div class="hd-title">
          <span class="hd-logo">⚙</span>
          <span>云邮教学空间助手</span>
          <span class="hd-version">v${GM_info.script.version}</span>
        </div>
        <button class="hd-close" id="yzHelper-close" title="关闭">✕</button>
      </div>
    `;

    const mainContent = `
    <div id="yzHelper-main">
        <div id="yzHelper-settings-sidebar">
            ${generateSidebarMenu()}
        </div>

        <div id="yzHelper-settings-content">
            ${generateAllSections()}
        </div>
    </div>
    `;

    settingsPanel.innerHTML = header + mainContent;
    document.body.appendChild(settingsPanel);

    // 菜单切换功能
    document
      .querySelectorAll("#yzHelper-settings-sidebar .menu-item")
      .forEach((item) => {
        item.addEventListener("click", function () {
          // 移除所有菜单项的活动状态
          document
            .querySelectorAll("#yzHelper-settings-sidebar .menu-item")
            .forEach((i) => {
              i.classList.remove("active");
            });
          document
            .querySelectorAll("#yzHelper-settings-content .settings-section")
            .forEach((section) => {
              section.classList.remove("active");
            });

          this.classList.add("active");
          const sectionId = "section-" + this.getAttribute("data-section");
          document.getElementById(sectionId).classList.add("active");

          // 隐藏所有设置描述
          document.querySelectorAll(".setting-description").forEach((desc) => {
            desc.classList.remove("visible");
          });
        });
      });

    // 设置描述显示/隐藏功能
    document.querySelectorAll("#yzHelper-settings .setting-label").forEach((label) => {
      label.addEventListener("click", function () {
        const descriptionId = this.getAttribute("data-for");
        if (!descriptionId) return;
        const description = document.getElementById(descriptionId);
        if (!description) return;

        // 隐藏所有其他描述
        document.querySelectorAll(".setting-description").forEach((desc) => {
          if (desc.id !== descriptionId) {
            desc.classList.remove("visible");
          }
        });

        // 切换当前描述的可见性
        description.classList.toggle("visible");
      });
    });

    // 主面板关闭按钮
    document
      .getElementById("yzHelper-close")
      .addEventListener("click", toggleSettingsPanel);

    // 主面板设置项即改即存
    bindAutoSave(document.getElementById("yzHelper-settings-content"));

    // 关于页：立即检查更新
    const checkUpdateBtn = document.getElementById("yzHelper-check-update");
    checkUpdateBtn.addEventListener("click", () => {
      const labelEl = checkUpdateBtn.querySelector("span");
      checkUpdateBtn.disabled = true;
      checkUpdateBtn.classList.add("is-loading");
      const originalText = labelEl ? labelEl.textContent : "立即检查更新";
      if (labelEl) labelEl.textContent = "检查中…";
      checkForUpdates(true, () => {
        checkUpdateBtn.disabled = false;
        checkUpdateBtn.classList.remove("is-loading");
        if (labelEl) labelEl.textContent = originalText;
      });
    });
  }

  function getCookie(name) {
    const target = name + "=";
    for (const part of document.cookie.split("; ")) {
      if (part.startsWith(target)) return part.slice(target.length);
    }
    return null;
  }

  // 获取Token
  function getToken() {
    return [getCookie("iClass-uuid"), getCookie("iClass-token")];
  }

  // 平台 API 请求统一封装：公共鉴权头 + JSON 解析
  // 所有 apiucloud.bupt.edu.cn 的接口调用都应走这里（getPreviewURL 除外：其 CORS 不带鉴权头，保持原样）
  const API_BASE = "https://apiucloud.bupt.edu.cn/";
  let apiAuthExpired = false;

  async function apiFetch(path, { method = "GET", body, headers = {} } = {}) {
    const [, token] = getToken();
    const res = await fetch(API_BASE + path, {
      method,
      headers: Object.assign(
        {
          authorization: "Basic cG9ydGFsOnBvcnRhbF9zZWNyZXQ=",
          "blade-auth": token,
        },
        headers
      ),
      body: body === undefined ? null : body,
    });
    if (res.status === 401 || res.status === 403) {
      apiAuthExpired = true;
      const err = new Error("登录状态已过期，请刷新页面重新登录");
      err.code = res.status;
      err.isAuthError = true;
      throw err;
    }
    if (!res.ok) {
      const err = new Error(`接口请求失败 (${res.status})`);
      err.code = res.status;
      throw err;
    }
    const json = await res.json();
    if (json && (Number(json.code) === 401 || Number(json.status) === 401)) {
      apiAuthExpired = true;
      const err = new Error("登录状态已过期，请刷新页面重新登录");
      err.code = 401;
      err.isAuthError = true;
      throw err;
    }
    apiAuthExpired = false;
    return json;
  }

  // 文件下载相关函数（支持无 Content-Length 降级、可选取消回调与进度回调）
  async function downloadFile(url, filename, shouldCancel, onProgress) {
    console.debug("Call download");
    const isCancelled = () =>
      typeof shouldCancel === "function" ? !!shouldCancel() : false;
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const contentLength = parseInt(response.headers.get("content-length") || "0", 10);
      let blob;
      if (contentLength > 0 && response.body && response.body.getReader) {
        const reader = response.body.getReader();
        const chunks = [];
        let loaded = 0;
        let lastPct = -1;
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          if (isCancelled()) {
            reader.cancel().catch(() => {});
            return;
          }
          chunks.push(value);
          loaded += value.length;
          if (typeof onProgress === "function") {
            const pct = Math.min(99, Math.floor((loaded / contentLength) * 100));
            if (pct !== lastPct) {
              lastPct = pct;
              onProgress(pct);
            }
          }
        }
        blob = new Blob(chunks);
      } else {
        // 服务器未返回 Content-Length 或不支持流式读取时，降级为整块 Blob 下载
        if (typeof onProgress === "function") onProgress(null);
        blob = await response.blob();
        if (isCancelled()) return;
      }

      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = downloadUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      // 延迟释放 Blob URL，避免 Safari/Firefox 尚未接管下载流就被同步回收
      setTimeout(() => window.URL.revokeObjectURL(downloadUrl), 1000);
    } catch (error) {
      console.error("Download failed:", error);
      throw error;
    }
  }

  // 任务搜索函数
  async function searchTask(siteId, keyword) {
    return apiFetch("ykt-site/work/student/list", {
      method: "POST",
      headers: { "content-type": "application/json;charset=UTF-8" },
      body: JSON.stringify({ siteId, keyword, current: 1, size: 5 }),
    });
  }

  // 课程搜索函数：在全部课程中定位某个活动属于哪门课（作业详情页用，按标题关键词缩小扫描范围）
  async function searchCourse(id, keyword) {
    const list = await getCourseList();
    for (let i = 0; i < list.length; i += 5) {
      const batch = list.slice(i, i + 5);
      const ress = await Promise.all(
        batch.map((x) => searchTask(x.id, keyword))
      );
      for (let j = 0; j < ress.length; j++) {
        const records = ress[j] && ress[j].data && ress[j].data.records;
        if (records && records.some((item) => item.id == id)) {
          return batch[j];
        }
      }
    }
    return null;
  }

  // 获取任务列表
  async function getTasks(siteId) {
    return apiFetch("ykt-site/work/student/list", {
      method: "POST",
      headers: { "content-type": "application/json;charset=UTF-8" },
      body: JSON.stringify({ siteId, current: 1, size: 9999 }),
    });
  }

  // 获取测试列表（学生视角）
  // 待办中的测试类活动不在 work/student/list 的返回里，需单独扫描测试列表才能匹配到课程
  async function getExams(siteId) {
    try {
      const json = await apiFetch(
        "ykt-site/examination/list-stu?siteId=" +
          siteId +
          "&current=1&size=9999"
      );
      const data = json && json.data;
      const records = Array.isArray(data) ? data : data && data.records;
      return Array.isArray(records) ? records : [];
    } catch (e) {
      return [];
    }
  }

  // 会话级课程作业与活动缓存（合并待办已提交、课程匹配与课程空间的并发与重复请求）
  const courseWorksCache = new Map();
  const courseActivitiesCache = new Map();

  function fetchCourseWorks(siteId) {
    if (courseWorksCache.has(siteId)) return courseWorksCache.get(siteId);
    const p = getTasks(siteId)
      .then((works) => (works && works.data && works.data.records) || [])
      .catch(() => {
        courseWorksCache.delete(siteId);
        return [];
      });
    courseWorksCache.set(siteId, p);
    return p;
  }

  function fetchCourseActivities(siteId) {
    if (courseActivitiesCache.has(siteId)) return courseActivitiesCache.get(siteId);
    const p = Promise.all([
      fetchCourseWorks(siteId),
      getExams(siteId),
    ])
      .then(([worksRecords, exams]) => worksRecords.concat(exams))
      .catch(() => {
        courseActivitiesCache.delete(siteId);
        return [];
      });
    courseActivitiesCache.set(siteId, p);
    return p;
  }

  // 搜索课程：把一批活动ID匹配到所属课程（作业与测试两类活动并行扫描，支持并发复用）
  async function searchCourses(nids) {
    const result = {};
    const ids = [];
    for (const id of nids) {
      const r = get(id);
      if (r) result[id] = r;
      else ids.push(id);
    }
    if (ids.length === 0) return result;

    // 复用带缓存的课程列表（fetchCurrentSiteList），避免每次重复全量拉取
    const list = await getCourseList();
    const idSet = new Set(ids);

    for (let i = 0; i < list.length; i += 5) {
      const batch = list.slice(i, i + 5);
      const pairs = await Promise.all(
        batch.map(async (x) => ({
          course: x,
          records: await fetchCourseActivities(x.id),
        }))
      );
      for (const { course, records } of pairs) {
        for (const item of records) {
          if (idSet.has(item.id)) {
            result[item.id] = course;
            set(item.id, course);
            idSet.delete(item.id);
            if (idSet.size === 0) return result;
          }
        }
      }
    }
    return result;
  }

  // 获取未完成列表
  async function getUndoneList() {
    const [userid] = getToken();
    return apiFetch("ykt-site/site/student/undone?userId=" + userid);
  }

  // 获取详情
  async function getDetail(id) {
    return apiFetch("ykt-site/work/detail?assignmentId=" + id);
  }

  // 获取学生提交与批改详情（我的作答 / 得分 / 教师评语 / 已交附件 ID）
  async function getSubmitView(id) {
    return apiFetch("ykt-site/work/submit-view?assignmentId=" + encodeURIComponent(id));
  }

  // 根据资源 ID 列表获取已上传附件元信息
  async function getUploadFilesByIds(ids) {
    if (!Array.isArray(ids) || !ids.length) return [];
    const json = await apiFetch(
      "blade-source/resource/list/byId?resourceIds=" + encodeURIComponent(ids.join(","))
    );
    return (json && Array.isArray(json.data) && json.data) || [];
  }

  // 获取站点资源树（供工作台课程空间按章节展示，并被 getSiteResource 复用）
  async function getSiteResourceTree(id) {
    const [userid] = getToken();
    const json = await apiFetch(
      "ykt-site/site-resource/tree/student?siteId=" + id + "&userId=" + userid,
      { method: "POST" }
    );
    return (json && Array.isArray(json.data) && json.data) || [];
  }

  // 获取站点资源（扁平列表）
  async function getSiteResource(id) {
    const tree = await getSiteResourceTree(id);
    const result = [];
    function foreach(data) {
      if (!data || !Array.isArray(data)) return;
      data.forEach((x) => {
        if (x.attachmentVOs && Array.isArray(x.attachmentVOs)) {
          x.attachmentVOs.forEach((y) => {
            if (y.type !== 2 && y.resource) result.push(y.resource);
          });
        }
        if (x.children) foreach(x.children);
      });
    }
    foreach(tree);
    return result;
  }

  // 待办截止倒计时：把剩余毫秒差换算成分档文案与配色
  function formatRemain(diffMs) {
    const MIN = 60 * 1000;
    const HOUR = 60 * MIN;
    const DAY = 24 * HOUR;
    if (diffMs < 0) {
      const past = -diffMs;
      if (past < HOUR) return { cls: "overdue", text: "已逾期不足 1 时" };
      if (past < DAY) return { cls: "overdue", text: "已逾期 " + Math.floor(past / HOUR) + " 时" };
      return { cls: "overdue", text: "已逾期 " + Math.floor(past / DAY) + " 天" };
    }
    if (diffMs < HOUR) {
      const m = Math.ceil(diffMs / MIN);
      if (m >= 60) return { cls: "urgent", text: "剩 1 时" };
      return { cls: "urgent", text: "剩 " + Math.max(1, m) + " 分" };
    }
    if (diffMs < DAY) {
      const h = Math.floor(diffMs / HOUR);
      const m = Math.floor((diffMs % HOUR) / MIN);
      return { cls: "urgent", text: "剩 " + h + " 时" + (m ? " " + m + " 分" : "") };
    }
    if (diffMs < 3 * DAY) {
      const d = Math.floor(diffMs / DAY);
      const h = Math.floor((diffMs % DAY) / HOUR);
      return { cls: "soon", text: "剩 " + d + " 天" + (h ? " " + h + " 时" : "") };
    }
    const days = Math.floor(diffMs / DAY);
    const hours = Math.floor((diffMs % DAY) / HOUR);
    return { cls: "later", text: "剩 " + days + " 天" + (hours ? " " + hours + " 时" : "") };
  }

  function parseDeadline(endTime) {
    if (!endTime) return null;
    const d = new Date(String(endTime).replace(" ", "T"));
    return isNaN(d.getTime()) ? null : d;
  }

  function sortTasksByDeadline(list) {
    return list
      .map((t) => ({ t, ms: (parseDeadline(t.endTime) || { getTime: () => Infinity }).getTime() }))
      .sort((a, b) => a.ms - b.ms)
      .map((x) => x.t);
  }

  // 作业详情补充信息缓存（作业模式、附件数、互评、班级已交人数）
  const assignmentInfoCache = new Map();

  function normalizeStat(total, noSubmit) {
    const t = Number(total);
    const n = Number(noSubmit);
    if (!Number.isFinite(t) || !Number.isFinite(n)) return null;
    if (t <= 0 || n < 0 || n > t) return null;
    return { total: t, submitted: t - n };
  }

  function pickModeName(type) {
    if (type === 0 || type === "0") return "个人作业";
    if (type === 1 || type === "1") return "小组作业";
    return "";
  }

  function fetchAssignmentInfo(task) {
    const id = task && (task.activityId || task.id);
    if (!id) return Promise.resolve(null);
    if (assignmentInfoCache.has(id)) return assignmentInfoCache.get(id);
    const p = Promise.resolve()
      .then(() => getDetail(id))
      .then((json) => {
        const d = (json && json.data) || {};
        const info = {};
        const stat = normalizeStat(d.totalNum, d.noSubmitNum);
        if (stat) info.stat = stat;
        const mode = pickModeName(d.assignmentType);
        if (mode) info.mode = mode;
        if (Array.isArray(d.assignmentResource) && d.assignmentResource.length) {
          info.attachments = d.assignmentResource.length;
        }
        if (Number(d.isOpenEvaluation) === 1) info.evaluation = true;
        if (d.isOvertimeCommit !== undefined && d.isOvertimeCommit !== null) {
          info.noLateSubmit = Number(d.isOvertimeCommit) === 1;
        }
        return Object.keys(info).length ? info : null;
      })
      .catch(() => null);
    assignmentInfoCache.set(id, p);
    return p;
  }

  // ===== 共享格式化、路由导航、课程列表与资源预览工具（供工作台与原页面模块共用）=====
  const WEEKDAY_NAMES = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];

  function fmtDeadline(d, withWeekday = false, now = new Date()) {
    const pad = (n) => String(n).padStart(2, "0");
    const base =
      d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()) +
      " " + pad(d.getHours()) + ":" + pad(d.getMinutes());
    if (!withWeekday) return base;
    const today0 = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const target0 = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
    const dayDiff = Math.round((target0 - today0) / 86400000);
    const suffix = dayDiff === 0 ? "今天" : dayDiff === 1 ? "明天" : WEEKDAY_NAMES[d.getDay()];
    return base + " " + suffix;
  }

  // 生成待办详情地址（供工作台与卡片共用；tabOverride 可指定落点页签如 "second" 直达提交页）
  function buildTaskUrl(task, tabOverride) {
    const id = task && (task.activityId || task.id);
    if (!id) return "";
    const q = (obj) =>
      Object.keys(obj)
        .filter((k) => obj[k] !== undefined && obj[k] !== null && obj[k] !== "")
        .map((k) => k + "=" + encodeURIComponent(obj[k]))
        .join("&");
    const type = Number(task.type);
    if (type === 3 || type === 5) {
      const tab = tabOverride || (type === 3 ? "first" : "fourth");
      return (
        "course.html#/student/assignmentDetails_fullpage?" +
        q({
          activeTabName: tab,
          assignmentId: id,
          assignmentType: task.assignmentType === undefined ? 0 : task.assignmentType,
          assignmentTitle: task.activityName || task.assignmentTitle || "",
          evaluationStatus: task.evaluationStatus,
          studentGroupId: task.studentGroupId,
          isOpenEvaluation: task.isOpenEvaluation,
        })
      );
    }
    if (type === 1) return "course.html#/teacher/forum/topicDetail_fullpage?tid=" + encodeURIComponent(id);
    if (type === 2) return "course.html#/survey/surveyDetail_fullpage?id=" + encodeURIComponent(id);
    if (type === 4) return "course.html#/answer?id=" + encodeURIComponent(id);
    return "";
  }

  // 跳转任务/课程详情页
  function openTaskUrl(url) {
    if (!url) return;
    location.href = url;
  }

  const CACHE_STORAGE_KEY = "zzxw";
  const CACHE_MAX_ENTRIES = 300;

  function readCourseCache() {
    try {
      const raw = localStorage.getItem(CACHE_STORAGE_KEY);
      const parsed = raw ? JSON.parse(raw) : {};
      return parsed && typeof parsed === "object" ? parsed : {};
    } catch (e) {
      return {};
    }
  }

  function set(k, v) {
    if (!k || !v) return;
    const h = readCourseCache();
    // 仅持久化必要字段，避免将整条课程 raw 对象重复写入 localStorage
    const slim =
      typeof v === "object"
        ? {
            id: v.id,
            name: v.name || "",
            teachers: v.teachers || "",
            department: v.department || "",
          }
        : v;
    delete h[k];
    h[k] = slim;
    const keys = Object.keys(h);
    if (keys.length > CACHE_MAX_ENTRIES) {
      for (let i = 0; i < keys.length - CACHE_MAX_ENTRIES; i++) {
        delete h[keys[i]];
      }
    }
    try {
      localStorage.setItem(CACHE_STORAGE_KEY, JSON.stringify(h));
    } catch (e) {
      console.warn("[ucloud-Enhanced] 写入课程缓存失败", e);
    }
  }

  function get(k) {
    if (!k) return undefined;
    return readCourseCache()[k];
  }

  // 本学期课程列表缓存与跳转
  let courseListCache = null;
  let courseListPromise = null;
  let courseListLoading = false;

  function getRoleAliase() {
    const raw = getCookie("user-role");
    if (!raw) return "";
    try {
      return (JSON.parse(decodeURIComponent(raw)) || {}).roleAliase || "";
    } catch (e) {
      try {
        return (JSON.parse(raw) || {}).roleAliase || "";
      } catch (err) {
        return "";
      }
    }
  }

  function mapSiteRecord(record) {
    let teachers = record.primaryTeachers || "";
    if (!teachers && Array.isArray(record.teachers)) {
      teachers = record.teachers
        .map((t) => t.realName || t.name || "")
        .filter(Boolean)
        .join(", ");
    }
    return {
      id: record.id,
      name: record.siteName || "",
      teachers: teachers,
      department: record.departmentName || "",
      raw: record,
    };
  }

  async function fetchCurrentSiteList() {
    const [userid, token] = getToken();
    if (!userid || !token) return [];
    const roleAliase = getRoleAliase();
    let path = "student/current";
    let siteRoleCode = 2;
    if (roleAliase === "JS004" || roleAliase === "JS006") {
      path = "teacher/current";
      siteRoleCode = roleAliase === "JS004" ? 1 : 3;
    }
    const json = await apiFetch(
      "ykt-site/site/list/" +
        path +
        "?size=999999&current=1&userId=" +
        userid +
        "&siteRoleCode=" +
        siteRoleCode
    );
    return (json && json.data && json.data.records) || [];
  }

  async function getCourseList() {
    if (courseListCache && courseListCache.length) return courseListCache;
    if (!courseListPromise) {
      courseListLoading = true;
      courseListPromise = fetchCurrentSiteList()
        .then((records) => records.map(mapSiteRecord))
        .catch((e) => {
          console.error("[ucloud-Enhanced] 获取课程列表失败", e);
          return [];
        })
        .then((list) => {
          courseListCache = list;
          courseListPromise = null;
          courseListLoading = false;
          return list;
        });
    }
    return courseListPromise;
  }

  function openCoursePage(course) {
    if (!course || !course.id) return;
    const cached = (courseListCache || []).find((x) => x.id === course.id);
    const raw = (cached && cached.raw) || course.raw || {};
    const siteData = Object.assign({}, raw, {
      id: course.id,
      siteName: raw.siteName || course.name || "",
    });
    // 平台 Cookie 统一使用 iClass- 前缀（模块 4UAI 的 cookies 封装），
    // 默认有效期 1 天，与平台 tapSiteItem 行为保持一致
    document.cookie =
      "iClass-site-id=" + course.id + "; path=/; max-age=86400";
    try {
      localStorage.setItem("site", JSON.stringify(siteData));
    } catch (e) {
      console.error("[ucloud-Enhanced] 写入课程信息失败", e);
    }
    const roleAliase = getRoleAliase();
    const view =
      roleAliase === "JS004" || roleAliase === "JS006" ? "teacher" : "student";
    const url =
      "https://ucloud.bupt.edu.cn/uclass/course.html#/" +
      view +
      "/courseHomePage?ind=1";
    openTaskUrl(url);
  }

  // 预览URL相关
  async function getPreviewURL(storageId) {
    const res = await fetch(
      "https://apiucloud.bupt.edu.cn/blade-source/resource/preview-url?resourceId=" +
        encodeURIComponent(storageId)
    );
    if (!res.ok) {
      throw new Error(`获取预览链接失败 (${res.status})`);
    }
    const json = await res.json();
    if (!json || !json.data || !json.data.previewUrl) {
      throw new Error("预览链接数据缺失");
    }
    onlinePreview = json.data.onlinePreview ?? null;
    return json.data.previewUrl;
  }

  // ========== [MODULE: 20-workbench.js] 独立工作台（Shadow DOM：待办 / 课程 / 通知 / 二级视图） ==========

  // ===== 工作台：Shadow DOM 独立界面（待办 / 课程 / 通知）=====
  let wbHost = null;
  let wbRoot = null;
  let wbCloseTimer = null;
  const wbState = {
    tab: "todo",
    todoSubTab: "pending",
    open: false,
    detail: null,
    courseView: null,
    todoLoaded: false,
    courseLoaded: false,
    noticeLoaded: false,
    scrollPositions: Object.create(null),
    themeObserver: null,
    prevOverflow: "",
  };
  let wbTodoCards = [];
  let wbSubmittedCards = [];
  let wbTodoLoadSeq = 0;
  let wbCourseLoadSeq = 0;
  let wbNoticeLoadSeq = 0;
  let wbTicker = null;
  let wbCoursePendingCounts = new Map();
  let wbCourseGridRerender = null;
  let wbActiveCourseDownload = null;

  function wbGetPinnedCourses() {
    try {
      const saved = GM_getValue("wb_pinned_courses", []);
      return new Set(Array.isArray(saved) ? saved.map(String) : []);
    } catch (e) {
      return new Set();
    }
  }

  function wbTogglePinnedCourse(courseId) {
    const key = String(courseId);
    const set = wbGetPinnedCourses();
    if (set.has(key)) set.delete(key);
    else set.add(key);
    try {
      GM_setValue("wb_pinned_courses", Array.from(set));
    } catch (e) {}
    return set.has(key);
  }

  const WB_ICONS = {
    brand:
      '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/></svg>',
    refresh:
      '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a9 9 0 1 1-2.64-6.36"/><polyline points="21 3 21 9 15 9"/></svg>',
    expand:
      '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/><line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/></svg>',
    compress:
      '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="4 14 10 14 10 20"/><polyline points="20 10 14 10 14 4"/><line x1="14" y1="10" x2="21" y2="3"/><line x1="3" y1="21" x2="10" y2="14"/></svg>',
    close:
      '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>',
    search:
      '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>',
    arrow:
      '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>',
    back:
      '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>',
    external:
      '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>',
    file:
      '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>',
    eye:
      '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>',
    download:
      '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>',
    book:
      '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>',
    star:
      '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>',
    settings:
      '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>',
    empty:
      '<svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M8 15s1.5-2 4-2 4 2 4 2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/></svg>',
  };

  const WB_COURSE_PALETTE = [
    ["rgba(41, 98, 255, 0.12)", "#2563eb", "rgba(96, 165, 250, 0.18)", "#93c5fd"],
    ["rgba(16, 185, 129, 0.12)", "#059669", "rgba(52, 211, 153, 0.18)", "#6ee7b7"],
    ["rgba(139, 92, 246, 0.12)", "#7c3aed", "rgba(167, 139, 250, 0.18)", "#c4b5fd"],
    ["rgba(245, 158, 11, 0.14)", "#d97706", "rgba(251, 191, 36, 0.18)", "#fcd34d"],
    ["rgba(236, 72, 153, 0.12)", "#db2777", "rgba(244, 114, 182, 0.18)", "#f9a8d4"],
    ["rgba(14, 165, 233, 0.12)", "#0284c7", "rgba(56, 189, 248, 0.18)", "#7dd3fc"],
  ];

  function wbPickCourseTone(name) {
    let hash = 0;
    const str = String(name || "");
    for (let i = 0; i < str.length; i++) hash = (hash * 31 + str.charCodeAt(i)) >>> 0;
    return hash % WB_COURSE_PALETTE.length;
  }

  function wbSkeletonHtml(kind) {
    if (kind === "course") {
      return (
        '<div class="wb-inner"><div class="wb-skel-bar"></div><div class="wb-course-grid">' +
        Array.from({ length: 6 }, () => '<div class="wb-skel-card wb-skel-course"></div>').join("") +
        "</div></div>"
      );
    }
    return (
      '<div class="wb-inner">' +
      Array.from(
        { length: 3 },
        () =>
          '<div class="wb-skel-card"><div class="wb-skel-line lg"></div><div class="wb-skel-line md"></div><div class="wb-skel-line sm"></div></div>'
      ).join("") +
      "</div>"
    );
  }

  function wbEmptyHtml(text) {
    return `<div class="wb-empty"><div class="wb-empty-icon">${WB_ICONS.empty}</div><div>${escapeHtml(text)}</div></div>`;
  }

  const WB_CSS = `
    :host {
      all: initial;
      --wb-panel-bg: #ffffff;
      --wb-canvas: #f5f7fa;
      --wb-surface: #ffffff;
      --wb-surface-2: #edf1f6;
      --wb-surface-muted: #fafbfd;
      --wb-border: rgba(15, 23, 42, 0.08);
      --wb-border-strong: rgba(15, 23, 42, 0.14);
      --wb-text: #111827;
      --wb-text-2: #4b5563;
      --wb-text-3: #9ca3af;
      --wb-accent: #2962ff;
      --wb-accent-soft: rgba(41, 98, 255, 0.1);
      --wb-accent-text: #2563eb;
      --wb-shadow: 0 18px 36px rgba(15, 23, 42, 0.22), 0 0 0 1px rgba(15, 23, 42, 0.06);
      --wb-card-shadow: 0 1px 2px rgba(15, 23, 42, 0.04);
      --wb-card-hover-shadow: 0 10px 24px rgba(15, 23, 42, 0.08);
      --wb-tab-active-bg: #ffffff;
      --wb-tab-active-shadow: 0 1px 3px rgba(15, 23, 42, 0.1);
      --wb-skel-a: #e8edf3;
      --wb-skel-b: #f3f6fa;
      --wb-scroll: rgba(15, 23, 42, 0.16);
      --wb-scroll-hover: rgba(15, 23, 42, 0.28);
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
    }
    :host(.wb-dark) {
      --wb-panel-bg: #181b20;
      --wb-canvas: #121519;
      --wb-surface: #1d2128;
      --wb-surface-2: rgba(255, 255, 255, 0.07);
      --wb-surface-muted: #181c22;
      --wb-border: rgba(255, 255, 255, 0.08);
      --wb-border-strong: rgba(255, 255, 255, 0.15);
      --wb-text: #f3f4f6;
      --wb-text-2: #a1a9b8;
      --wb-text-3: #6b7280;
      --wb-accent: #3b82f6;
      --wb-accent-soft: rgba(59, 130, 246, 0.18);
      --wb-accent-text: #93c5fd;
      --wb-shadow: 0 18px 40px rgba(0, 0, 0, 0.55), 0 0 0 1px rgba(255, 255, 255, 0.08);
      --wb-card-shadow: 0 1px 2px rgba(0, 0, 0, 0.24);
      --wb-card-hover-shadow: 0 12px 28px rgba(0, 0, 0, 0.36);
      --wb-tab-active-bg: #262c36;
      --wb-tab-active-shadow: 0 1px 3px rgba(0, 0, 0, 0.35);
      --wb-skel-a: #222730;
      --wb-skel-b: #2b313d;
      --wb-scroll: rgba(255, 255, 255, 0.16);
      --wb-scroll-hover: rgba(255, 255, 255, 0.28);
    }

    .wb-mask {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.52);
      opacity: 0;
      transition: opacity 0.2s ease;
    }
    :host(.wb-open) .wb-mask { opacity: 1; }
    :host(.wb-full) .wb-mask { display: none; }

    .wb-panel {
      position: fixed;
      left: 50%;
      top: 50%;
      width: min(1040px, calc(100vw - 48px));
      height: min(760px, calc(100vh - 64px));
      display: flex;
      flex-direction: column;
      overflow: hidden;
      background: var(--wb-panel-bg);
      color: var(--wb-text);
      border-radius: 20px;
      box-shadow: var(--wb-shadow);
      opacity: 0;
      transform: translate(-50%, calc(-50% + 10px)) scale(0.98);
      transition: opacity 0.2s ease, transform 0.22s cubic-bezier(0.22, 1, 0.36, 1), border-radius 0.2s ease;
    }
    :host(.wb-open) .wb-panel {
      opacity: 1;
      transform: translate(-50%, -50%) scale(1);
    }
    :host(.wb-full) .wb-panel {
      left: 0;
      top: 0;
      width: 100vw;
      height: 100vh;
      max-width: none;
      max-height: none;
      border-radius: 0;
      box-shadow: none;
      transform: scale(0.99);
    }
    :host(.wb-full.wb-open) .wb-panel { transform: none; }

    /* 顶栏 */
    .wb-head {
      display: flex;
      align-items: center;
      gap: 16px;
      padding: 14px 22px;
      background: var(--wb-panel-bg);
      border-bottom: 1px solid var(--wb-border);
      flex: none;
    }
    .wb-brand {
      display: inline-flex;
      align-items: center;
      gap: 10px;
      font-size: 15px;
      font-weight: 700;
      letter-spacing: -0.01em;
      color: var(--wb-text);
    }
    .wb-brand-icon {
      width: 28px;
      height: 28px;
      border-radius: 9px;
      background: linear-gradient(135deg, #3d7bff, #2962ff);
      color: #fff;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 3px 10px rgba(41, 98, 255, 0.32);
    }

    /* 分段式页签 */
    .wb-tabs {
      display: inline-flex;
      align-items: center;
      gap: 3px;
      padding: 4px;
      border-radius: 12px;
      background: var(--wb-surface-2);
    }
    .wb-tab {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      border: none;
      background: transparent;
      padding: 6px 14px;
      border-radius: 9px;
      font-size: 13px;
      font-weight: 500;
      color: var(--wb-text-2);
      cursor: pointer;
      transition: background 0.16s ease, color 0.16s ease, box-shadow 0.16s ease;
    }
    .wb-tab:hover { color: var(--wb-text); }
    .wb-tab.active {
      background: var(--wb-tab-active-bg);
      color: var(--wb-accent-text);
      font-weight: 600;
      box-shadow: var(--wb-tab-active-shadow);
    }
    .wb-tab-count {
      display: none;
      min-width: 17px;
      height: 17px;
      padding: 0 5px;
      border-radius: 999px;
      font-size: 11px;
      line-height: 17px;
      font-weight: 600;
      text-align: center;
      background: var(--wb-surface-2);
      color: var(--wb-text-2);
      box-sizing: border-box;
      font-variant-numeric: tabular-nums;
    }
    .wb-tab-count.show { display: inline-block; }
    .wb-tab.active .wb-tab-count { background: var(--wb-accent-soft); color: var(--wb-accent-text); }
    .wb-tab-count.unread { background: #ef4444 !important; color: #fff !important; }

    /* 顶栏右侧操作按钮 */
    .wb-actions { margin-left: auto; display: flex; align-items: center; gap: 6px; }
    .wb-icon-btn {
      width: 34px;
      height: 34px;
      border: 1px solid transparent;
      background: transparent;
      border-radius: 10px;
      cursor: pointer;
      color: var(--wb-text-2);
      display: inline-flex;
      align-items: center;
      justify-content: center;
      transition: background 0.15s ease, color 0.15s ease, border-color 0.15s ease;
    }
    .wb-icon-btn:hover {
      background: var(--wb-surface-2);
      color: var(--wb-text);
    }
    .wb-icon-btn.spinning svg { animation: wb-spin 0.55s ease; }
    @keyframes wb-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }

    /* 内容画布与纤细滚动条 */
    .wb-body {
      flex: 1;
      overflow-y: auto;
      padding: 22px 24px 32px;
      background: var(--wb-canvas);
      box-sizing: border-box;
      contain: layout style paint;
      scrollbar-width: thin;
      scrollbar-color: var(--wb-scroll) transparent;
    }
    .wb-body::-webkit-scrollbar { width: 6px; height: 6px; }
    .wb-body::-webkit-scrollbar-track { background: transparent; }
    .wb-body::-webkit-scrollbar-thumb { background: var(--wb-scroll); border-radius: 999px; }
    .wb-body::-webkit-scrollbar-thumb:hover { background: var(--wb-scroll-hover); }

    .wb-inner { width: 100%; max-width: 880px; margin: 0 auto; }
    .wb-pane[hidden] { display: none; }

    /* 空态与骨架屏 */
    .wb-empty {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 10px;
      color: var(--wb-text-3);
      font-size: 13.5px;
      padding: 64px 0;
    }
    .wb-empty[hidden] { display: none; }
    .wb-empty-icon { opacity: 0.65; }
    .wb-skel-bar, .wb-skel-line, .wb-skel-course {
      background: linear-gradient(90deg, var(--wb-skel-a) 25%, var(--wb-skel-b) 50%, var(--wb-skel-a) 75%);
      background-size: 200% 100%;
      animation: wb-shimmer 1.3s ease-in-out infinite;
    }
    @keyframes wb-shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }
    .wb-skel-bar { height: 40px; border-radius: 12px; margin-bottom: 16px; }
    .wb-skel-card {
      background: var(--wb-surface);
      border: 1px solid var(--wb-border);
      border-radius: 14px;
      padding: 18px 20px;
      margin-bottom: 12px;
    }
    .wb-skel-course { height: 82px; margin-bottom: 0; }
    .wb-skel-line { height: 12px; border-radius: 6px; margin-bottom: 10px; }
    .wb-skel-line.lg { width: 58%; height: 15px; }
    .wb-skel-line.md { width: 34%; }
    .wb-skel-line.sm { width: 44%; margin-bottom: 0; }

    /* 待办筛选条 */
    .wb-filter-bar { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 16px; }
    .wb-filter-bar[hidden] { display: none; }
    .wb-filter-chip {
      border: 1px solid var(--wb-border);
      background: var(--wb-surface);
      color: var(--wb-text-2);
      border-radius: 999px;
      padding: 5px 13px;
      font-size: 12.5px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.15s ease;
    }
    .wb-filter-chip:hover { border-color: var(--wb-border-strong); color: var(--wb-text); }
    .wb-filter-chip.active {
      background: var(--wb-accent);
      border-color: var(--wb-accent);
      color: #fff;
      font-weight: 600;
      box-shadow: 0 4px 12px rgba(41, 98, 255, 0.28);
    }

    /* 待办卡片（含左侧紧迫度色条） */
    .wb-card {
      position: relative;
      overflow: hidden;
      background: var(--wb-surface);
      border: 1px solid var(--wb-border);
      border-radius: 14px;
      padding: 15px 18px 15px 21px;
      margin-bottom: 12px;
      cursor: pointer;
      contain: layout style;
      box-shadow: var(--wb-card-shadow);
      transition: transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease;
    }
    .wb-card::before {
      content: "";
      position: absolute;
      left: 0;
      top: 10px;
      bottom: 10px;
      width: 3.5px;
      border-radius: 0 4px 4px 0;
      background: rgba(148, 163, 184, 0.45);
    }
    .wb-card[data-urgency="overdue"]::before { background: #b91c1c; }
    .wb-card[data-urgency="urgent"]::before { background: #ef4444; }
    .wb-card[data-urgency="soon"]::before { background: #f59e0b; }
    .wb-card[hidden] { display: none; }
    .wb-card:hover {
      transform: translateY(-2px);
      border-color: var(--wb-border-strong);
      box-shadow: var(--wb-card-hover-shadow);
    }
    .wb-card-head { display: flex; align-items: center; gap: 12px; }
    .wb-card-title {
      flex: 1;
      min-width: 0;
      font-size: 14.5px;
      font-weight: 600;
      line-height: 1.4;
      color: var(--wb-text);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .wb-card-tags { display: flex; gap: 6px; flex: none; }
    .wb-deadline {
      display: inline-flex;
      align-items: center;
      padding: 2px 9px;
      border-radius: 999px;
      background: var(--wb-surface-2);
      color: var(--wb-text-2);
      font-size: 11.5px;
      font-variant-numeric: tabular-nums;
      white-space: nowrap;
    }
    .wb-mode {
      display: inline-flex;
      align-items: center;
      padding: 2px 9px;
      border-radius: 999px;
      background: rgba(139, 92, 246, 0.12);
      color: #7c3aed;
      font-size: 11.5px;
      font-weight: 500;
      white-space: nowrap;
    }
    :host(.wb-dark) .wb-mode { background: rgba(167, 139, 250, 0.16); color: #c4b5fd; }
    .wb-course {
      margin-top: 5px;
      font-size: 12.5px;
      font-weight: 500;
      color: var(--wb-accent-text);
    }
    .wb-course-teacher { color: var(--wb-text-3); font-weight: 400; }
    .wb-meta { display: flex; flex-wrap: wrap; align-items: center; gap: 7px; margin-top: 10px; font-size: 12px; }
    .wb-badge {
      display: inline-flex;
      align-items: center;
      padding: 2px 9px;
      border-radius: 999px;
      font-size: 11.5px;
      font-weight: 600;
      color: #fff;
      white-space: nowrap;
      font-variant-numeric: tabular-nums;
    }
    .wb-badge.later { background: var(--wb-surface-2); color: var(--wb-text-2); }
    .wb-badge.soon { background: #f59e0b; }
    .wb-badge.urgent { background: #ef4444; }
    .wb-badge.overdue { background: #b91c1c; }
    .wb-chip {
      display: inline-flex;
      align-items: center;
      padding: 2px 9px;
      border-radius: 999px;
      border: 1px solid var(--wb-border);
      background: var(--wb-surface-muted);
      color: var(--wb-text-2);
      font-size: 11.5px;
      white-space: nowrap;
      font-variant-numeric: tabular-nums;
    }
    .wb-chip.blue {
      border-color: transparent;
      background: var(--wb-accent-soft);
      color: var(--wb-accent-text);
      font-weight: 500;
    }

    /* 已过期且不可补交折叠区 */
    .wb-expired-box {
      margin-top: 18px;
      border: 1px dashed var(--wb-border);
      border-radius: 14px;
      background: var(--wb-surface-muted);
      padding: 10px 14px;
    }
    .wb-expired-summary {
      display: flex;
      align-items: center;
      gap: 8px;
      cursor: pointer;
      user-select: none;
      list-style: none;
      font-size: 13px;
      font-weight: 500;
      color: var(--wb-text-2);
    }
    .wb-expired-summary::-webkit-details-marker { display: none; }
    .wb-expired-summary::before {
      content: "▸";
      font-size: 12px;
      color: var(--wb-text-3);
      transition: transform 0.16s ease;
    }
    .wb-expired-box[open] > .wb-expired-summary::before {
      transform: rotate(90deg);
    }
    .wb-expired-summary:hover { color: var(--wb-text); }
    .wb-expired-list {
      margin-top: 12px;
    }
    .wb-expired-list .wb-card {
      opacity: 0.78;
    }
    .wb-expired-list .wb-card:hover {
      opacity: 1;
    }

    /* 课程搜索与卡片网格 */
    .wb-search-wrap { position: relative; margin-bottom: 16px; }
    .wb-search-icon {
      position: absolute;
      left: 14px;
      top: 50%;
      transform: translateY(-50%);
      color: var(--wb-text-3);
      display: inline-flex;
      pointer-events: none;
    }
    .wb-search {
      width: 100%;
      box-sizing: border-box;
      padding: 11px 14px 11px 40px;
      border-radius: 12px;
      border: 1px solid var(--wb-border);
      background: var(--wb-surface);
      color: var(--wb-text);
      font-size: 13.5px;
      outline: none;
      box-shadow: var(--wb-card-shadow);
      transition: border-color 0.16s ease, box-shadow 0.16s ease;
    }
    .wb-search::placeholder { color: var(--wb-text-3); }
    .wb-search:focus {
      border-color: var(--wb-accent);
      box-shadow: 0 0 0 3px var(--wb-accent-soft);
    }
    .wb-course-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 14px; }
    .wb-course-item {
      display: flex;
      align-items: center;
      gap: 13px;
      background: var(--wb-surface);
      border: 1px solid var(--wb-border);
      border-radius: 14px;
      padding: 15px 16px;
      cursor: pointer;
      contain: layout style;
      box-shadow: var(--wb-card-shadow);
      transition: transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease;
    }
    .wb-course-item:hover {
      transform: translateY(-2px);
      border-color: var(--wb-border-strong);
      box-shadow: var(--wb-card-hover-shadow);
    }
    .wb-course-avatar {
      width: 40px;
      height: 40px;
      border-radius: 11px;
      flex: none;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 16px;
      font-weight: 700;
      background: var(--tone-bg-l);
      color: var(--tone-fg-l);
    }
    :host(.wb-dark) .wb-course-avatar { background: var(--tone-bg-d); color: var(--tone-fg-d); }
    .wb-course-info { flex: 1; min-width: 0; }
    .wb-course-title {
      font-size: 14px;
      font-weight: 600;
      line-height: 1.4;
      color: var(--wb-text);
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }
    .wb-course-meta {
      margin-top: 4px;
      font-size: 12px;
      color: var(--wb-text-2);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .wb-course-arrow {
      flex: none;
      color: var(--wb-text-3);
      opacity: 0;
      transform: translateX(-4px);
      transition: opacity 0.16s ease, transform 0.16s ease, color 0.16s ease;
      display: inline-flex;
    }
    .wb-course-item:hover .wb-course-arrow { opacity: 1; transform: translateX(0); color: var(--wb-accent-text); }

    /* 通知列表 */
    .wb-notice-toolbar { display: flex; align-items: center; justify-content: space-between; margin-bottom: 14px; }
    .wb-notice-count { font-size: 13px; font-weight: 500; color: var(--wb-text-2); }
    .wb-readall {
      border: 1px solid var(--wb-border);
      background: var(--wb-surface);
      color: var(--wb-accent-text);
      border-radius: 999px;
      padding: 6px 14px;
      font-size: 12.5px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.15s ease;
    }
    .wb-readall:hover:not(:disabled) {
      background: var(--wb-accent);
      border-color: var(--wb-accent);
      color: #fff;
    }
    .wb-readall:disabled { opacity: 0.45; cursor: default; color: var(--wb-text-3); }
    .wb-notice {
      position: relative;
      overflow: hidden;
      border: 1px solid var(--wb-border);
      border-radius: 14px;
      padding: 15px 18px;
      margin-bottom: 12px;
      background: var(--wb-surface-muted);
      contain: layout style;
      box-shadow: var(--wb-card-shadow);
      transition: background 0.16s ease, border-color 0.16s ease, box-shadow 0.16s ease;
    }
    .wb-notice[data-unread="0"] .wb-notice-title { color: var(--wb-text-2); font-weight: 500; }
    .wb-notice[data-unread="0"] .wb-notice-body { opacity: 0.78; }
    .wb-notice[data-unread="1"] {
      background: var(--wb-surface);
      padding-left: 21px;
      border-color: var(--wb-border-strong);
      cursor: pointer;
    }
    .wb-notice[data-unread="1"]::before {
      content: "";
      position: absolute;
      left: 0;
      top: 10px;
      bottom: 10px;
      width: 3.5px;
      border-radius: 0 4px 4px 0;
      background: var(--wb-accent);
    }
    .wb-notice[data-unread="1"]:hover { box-shadow: var(--wb-card-hover-shadow); }
    .wb-notice-title { display: flex; align-items: center; gap: 8px; font-size: 14px; font-weight: 600; color: var(--wb-text); }
    .wb-notice-hint {
      margin-left: auto;
      padding: 2px 8px;
      border-radius: 999px;
      background: var(--wb-accent-soft);
      font-size: 11px;
      font-weight: 600;
      color: var(--wb-accent-text);
      flex: none;
    }
    .wb-dot { width: 7px; height: 7px; border-radius: 50%; background: #ef4444; flex: none; }
    .wb-notice-time { margin-top: 5px; font-size: 12px; color: var(--wb-text-3); font-variant-numeric: tabular-nums; }
    .wb-notice-body {
      margin-top: 9px;
      font-size: 13px;
      line-height: 1.72;
      color: var(--wb-text-2);
      white-space: pre-wrap;
      word-break: break-word;
    }
    .wb-link { color: var(--wb-accent-text); text-decoration: underline; text-underline-offset: 2px; word-break: break-all; }

    /* 二级视图：作业详情 */
    .wb-detail-bar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      margin-bottom: 16px;
    }
    .wb-back-btn {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      border: 1px solid var(--wb-border);
      background: var(--wb-surface);
      color: var(--wb-text-2);
      border-radius: 10px;
      padding: 7px 13px;
      font-size: 13px;
      font-weight: 500;
      cursor: pointer;
      transition: background 0.15s ease, color 0.15s ease, border-color 0.15s ease;
    }
    .wb-back-btn:hover { background: var(--wb-surface-2); color: var(--wb-text); border-color: var(--wb-border-strong); }
    .wb-primary-btn {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      border: none;
      background: linear-gradient(135deg, #3d7bff, #2962ff);
      color: #fff;
      border-radius: 10px;
      padding: 8px 16px;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      box-shadow: 0 4px 12px rgba(41, 98, 255, 0.28);
      transition: transform 0.15s ease, box-shadow 0.15s ease, filter 0.15s ease;
    }
    .wb-primary-btn:hover { transform: translateY(-1px); box-shadow: 0 6px 18px rgba(41, 98, 255, 0.36); filter: brightness(1.04); }
    .wb-detail-hero, .wb-detail-card {
      background: var(--wb-surface);
      border: 1px solid var(--wb-border);
      border-radius: 16px;
      padding: 20px 22px;
      margin-bottom: 14px;
      box-shadow: var(--wb-card-shadow);
    }
    .wb-detail-title {
      font-size: 19px;
      font-weight: 700;
      line-height: 1.4;
      color: var(--wb-text);
      letter-spacing: -0.01em;
    }
    .wb-detail-course {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      margin-top: 10px;
      padding: 4px 11px;
      border-radius: 999px;
      background: var(--wb-accent-soft);
      color: var(--wb-accent-text);
      font-size: 12.5px;
      font-weight: 600;
      border: none;
      cursor: pointer;
      transition: filter 0.15s ease;
    }
    .wb-detail-course.static { cursor: default; }
    .wb-detail-course:not(.static):hover { filter: brightness(0.95); }
    .wb-detail-meta {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 8px;
      margin-top: 14px;
    }
    .wb-progress-wrap {
      margin-top: 16px;
      padding-top: 14px;
      border-top: 1px solid var(--wb-border);
    }
    .wb-progress-head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      font-size: 12.5px;
      color: var(--wb-text-2);
      margin-bottom: 7px;
      font-variant-numeric: tabular-nums;
    }
    .wb-progress-pct { font-weight: 600; color: var(--wb-accent-text); }
    .wb-progress-track {
      height: 6px;
      border-radius: 999px;
      background: var(--wb-surface-2);
      overflow: hidden;
    }
    .wb-progress-fill {
      height: 100%;
      border-radius: 999px;
      background: linear-gradient(90deg, #3d7bff, #2962ff);
      transition: width 0.35s ease;
    }
    .wb-section-title {
      font-size: 13.5px;
      font-weight: 700;
      color: var(--wb-text);
      margin-bottom: 12px;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .wb-rich-body {
      font-size: 13.5px;
      line-height: 1.78;
      color: var(--wb-text-2);
      word-break: break-word;
    }
    .wb-rich-body p { margin: 0 0 10px; }
    .wb-rich-body p:last-child { margin-bottom: 0; }
    .wb-rich-body ul, .wb-rich-body ol { margin: 6px 0 10px; padding-left: 20px; }
    .wb-rich-body li { margin-bottom: 4px; }
    .wb-rich-body blockquote {
      margin: 10px 0;
      padding: 8px 14px;
      border-left: 3px solid var(--wb-accent);
      background: var(--wb-surface-muted);
      border-radius: 0 8px 8px 0;
    }
    .wb-rich-body pre {
      background: var(--wb-surface-2);
      padding: 12px 14px;
      border-radius: 10px;
      overflow-x: auto;
      font-size: 12.5px;
      line-height: 1.6;
    }
    .wb-rich-body code {
      background: var(--wb-surface-2);
      padding: 2px 5px;
      border-radius: 5px;
      font-family: ui-monospace, SFMono-Regular, Consolas, monospace;
      font-size: 90%;
    }
    .wb-rich-body pre code { background: transparent; padding: 0; }
    .wb-rich-body img { max-width: 100%; height: auto; border-radius: 10px; margin: 8px 0; display: block; }
    .wb-rich-body table { width: 100%; border-collapse: collapse; margin: 10px 0; font-size: 12.5px; }
    .wb-rich-body th, .wb-rich-body td { border: 1px solid var(--wb-border-strong); padding: 6px 10px; text-align: left; }
    .wb-rich-empty { color: var(--wb-text-3); font-size: 13px; }
    .wb-attach-list { display: flex; flex-direction: column; gap: 8px; }
    .wb-attach-item {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 11px 14px;
      border-radius: 12px;
      border: 1px solid var(--wb-border);
      background: var(--wb-surface-muted);
      transition: border-color 0.15s ease, background 0.15s ease;
    }
    .wb-attach-item:hover { border-color: var(--wb-border-strong); background: var(--wb-surface); }
    .wb-attach-ico {
      width: 34px;
      height: 34px;
      border-radius: 9px;
      background: var(--wb-accent-soft);
      color: var(--wb-accent-text);
      display: inline-flex;
      align-items: center;
      justify-content: center;
      flex: none;
    }
    .wb-attach-name {
      flex: 1;
      min-width: 0;
      font-size: 13px;
      font-weight: 500;
      color: var(--wb-text);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .wb-attach-btns { display: flex; gap: 6px; flex: none; }
    .wb-ghost-btn {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      border: 1px solid var(--wb-border);
      background: var(--wb-surface);
      color: var(--wb-text-2);
      border-radius: 8px;
      padding: 5px 10px;
      font-size: 12px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.15s ease;
    }
    .wb-ghost-btn:hover:not(:disabled) {
      border-color: var(--wb-accent);
      color: var(--wb-accent-text);
      background: var(--wb-accent-soft);
    }
    .wb-ghost-btn:disabled { opacity: 0.5; cursor: wait; }

    /* 二级视图：课程空间 */
    .wb-course-hero {
      display: flex;
      align-items: center;
      gap: 16px;
      background: var(--wb-surface);
      border: 1px solid var(--wb-border);
      border-radius: 16px;
      padding: 18px 22px;
      margin-bottom: 14px;
      box-shadow: var(--wb-card-shadow);
    }
    .wb-course-hero-avatar {
      width: 48px;
      height: 48px;
      border-radius: 14px;
      flex: none;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 20px;
      font-weight: 700;
      background: var(--tone-bg-l);
      color: var(--tone-fg-l);
    }
    :host(.wb-dark) .wb-course-hero-avatar { background: var(--tone-bg-d); color: var(--tone-fg-d); }
    .wb-course-hero-info { flex: 1; min-width: 0; }
    .wb-course-hero-title { font-size: 18px; font-weight: 700; color: var(--wb-text); line-height: 1.35; }
    .wb-course-hero-meta { margin-top: 4px; font-size: 12.5px; color: var(--wb-text-2); }
    .wb-subtabs-bar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      margin-bottom: 14px;
      flex-wrap: wrap;
    }
    .wb-subtabs {
      display: inline-flex;
      gap: 4px;
      padding: 4px;
      border-radius: 12px;
      background: var(--wb-surface-2);
    }
    .wb-subtab {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      border: none;
      background: transparent;
      padding: 6px 14px;
      border-radius: 9px;
      font-size: 13px;
      font-weight: 500;
      color: var(--wb-text-2);
      cursor: pointer;
      transition: all 0.15s ease;
    }
    .wb-subtab:hover { color: var(--wb-text); }
    .wb-subtab.active {
      background: var(--wb-tab-active-bg);
      color: var(--wb-accent-text);
      font-weight: 600;
      box-shadow: var(--wb-tab-active-shadow);
    }
    .wb-subtab-num {
      font-size: 11px;
      padding: 0 6px;
      height: 17px;
      line-height: 17px;
      border-radius: 999px;
      background: var(--wb-surface-2);
      color: var(--wb-text-2);
      font-variant-numeric: tabular-nums;
    }
    .wb-subtab.active .wb-subtab-num { background: var(--wb-accent-soft); color: var(--wb-accent-text); }
    .wb-res-toolbar { display: flex; align-items: center; gap: 10px; margin-bottom: 14px; }
    .wb-res-toolbar .wb-search-wrap { flex: 1; margin-bottom: 0; }
    .wb-res-group {
      background: var(--wb-surface);
      border: 1px solid var(--wb-border);
      border-radius: 14px;
      padding: 14px 16px;
      margin-bottom: 12px;
      box-shadow: var(--wb-card-shadow);
    }
    .wb-res-group-title {
      font-size: 12.5px;
      font-weight: 700;
      color: var(--wb-text-2);
      margin-bottom: 10px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
    }
    .wb-res-group-actions {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      flex-shrink: 0;
    }
    .wb-group-dl-btn {
      padding: 3px 9px;
      font-size: 11.5px;
      font-weight: 600;
    }
    .wb-course-badges {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      flex-shrink: 0;
    }
    .wb-course-pending {
      padding: 2px 7px;
      border-radius: 999px;
      font-size: 11px;
      font-weight: 700;
      background: rgba(239, 68, 68, 0.12);
      color: #dc2626;
      white-space: nowrap;
      font-variant-numeric: tabular-nums;
    }
    :host(.wb-dark) .wb-course-pending { background: rgba(239, 68, 68, 0.22); color: #fca5a5; }
    .wb-pin-btn {
      width: 28px;
      height: 28px;
      border-radius: 8px;
      border: none;
      background: transparent;
      color: var(--wb-text-3);
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      transition: background 0.15s ease, color 0.15s ease;
    }
    .wb-pin-btn:hover { background: var(--wb-surface-2); color: #f59e0b; }
    .wb-pin-btn.pinned { color: #f59e0b; }
    .wb-pin-btn.pinned svg { fill: currentColor; }
    .wb-notice-controls {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 12px;
      flex-wrap: wrap;
    }
    .wb-notice-controls .wb-search-wrap { flex: 1; min-width: 180px; margin-bottom: 0; }
    .wb-toggle-chip {
      height: 36px;
      padding: 0 12px;
      border-radius: 10px;
      border: 1px solid var(--wb-border);
      background: var(--wb-surface);
      color: var(--wb-text-2);
      font-size: 12.5px;
      font-weight: 500;
      cursor: pointer;
      white-space: nowrap;
      transition: all 0.15s ease;
    }
    .wb-toggle-chip:hover { border-color: var(--wb-border-strong); color: var(--wb-text); }
    .wb-toggle-chip.active {
      background: var(--wb-accent-soft);
      border-color: var(--wb-accent);
      color: var(--wb-accent-text);
      font-weight: 600;
    }
    .wb-sub-summary {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 8px;
      margin-bottom: 12px;
    }
    .wb-score-pill {
      display: inline-flex;
      align-items: center;
      padding: 3px 10px;
      border-radius: 999px;
      font-size: 12px;
      font-weight: 700;
      background: rgba(16, 185, 129, 0.14);
      color: #059669;
    }
    :host(.wb-dark) .wb-score-pill { background: rgba(52, 211, 153, 0.18); color: #6ee7b7; }
    .wb-sub-block { margin-top: 12px; }
    .wb-sub-block:first-child { margin-top: 0; }
    .wb-sub-label {
      font-size: 12px;
      font-weight: 600;
      color: var(--wb-text-2);
      margin-bottom: 6px;
    }
    .wb-comment-box {
      padding: 10px 12px;
      border-radius: 10px;
      background: var(--wb-surface-2);
      border-left: 3px solid var(--wb-accent);
    }
    .wb-comment-box.rejected { border-left-color: #f59e0b; }
    .wb-status-chip {
      display: inline-flex;
      align-items: center;
      padding: 2px 9px;
      border-radius: 999px;
      font-size: 11.5px;
      font-weight: 600;
      white-space: nowrap;
    }
    .wb-status-chip.unsubmitted { background: rgba(234, 179, 8, 0.16); color: #a16207; }
    .wb-status-chip.rejected { background: rgba(245, 158, 11, 0.14); color: #d97706; }
    .wb-status-chip.submitted { background: var(--wb-accent-soft); color: var(--wb-accent-text); }
    .wb-status-chip.graded { background: rgba(16, 185, 129, 0.14); color: #059669; }
    :host(.wb-dark) .wb-status-chip.unsubmitted { background: rgba(250, 204, 21, 0.18); color: #fde047; }
    :host(.wb-dark) .wb-status-chip.rejected { background: rgba(251, 191, 36, 0.18); color: #fcd34d; }
    :host(.wb-dark) .wb-status-chip.graded { background: rgba(52, 211, 153, 0.18); color: #6ee7b7; }
    .wb-file-ext {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-width: 34px;
      height: 20px;
      padding: 0 5px;
      border-radius: 6px;
      font-size: 10px;
      font-weight: 700;
      letter-spacing: 0.03em;
      flex-shrink: 0;
    }
    .wb-file-ext.pdf { background: rgba(239, 68, 68, 0.12); color: #dc2626; }
    .wb-file-ext.ppt { background: rgba(249, 115, 22, 0.14); color: #c2410c; }
    .wb-file-ext.doc { background: rgba(37, 99, 235, 0.12); color: #2563eb; }
    .wb-file-ext.xls { background: rgba(16, 185, 129, 0.14); color: #059669; }
    .wb-file-ext.zip { background: rgba(139, 92, 246, 0.14); color: #7c3aed; }
    .wb-file-ext.img { background: rgba(20, 184, 166, 0.14); color: #0f766e; }
    .wb-file-ext.media { background: rgba(99, 102, 241, 0.14); color: #4f46e5; }
    .wb-file-ext.code { background: var(--wb-surface-2); color: var(--wb-text-2); }
    .wb-ghost-btn.done {
      border-color: rgba(16, 185, 129, 0.45);
      background: rgba(16, 185, 129, 0.12);
      color: #059669;
    }
    :host(.wb-dark) .wb-ghost-btn.done {
      border-color: rgba(52, 211, 153, 0.4);
      background: rgba(52, 211, 153, 0.16);
      color: #6ee7b7;
    }
    :host(.wb-dark) .wb-file-ext.pdf { background: rgba(239, 68, 68, 0.22); color: #fca5a5; }
    :host(.wb-dark) .wb-file-ext.ppt { background: rgba(251, 146, 60, 0.22); color: #fdba74; }
    :host(.wb-dark) .wb-file-ext.doc { background: rgba(96, 165, 250, 0.2); color: #93c5fd; }
    :host(.wb-dark) .wb-file-ext.xls { background: rgba(52, 211, 153, 0.2); color: #6ee7b7; }
    :host(.wb-dark) .wb-file-ext.zip { background: rgba(167, 139, 250, 0.22); color: #c4b5fd; }
    :host(.wb-dark) .wb-file-ext.img { background: rgba(45, 212, 191, 0.2); color: #5eead4; }
    :host(.wb-dark) .wb-file-ext.media { background: rgba(129, 140, 248, 0.22); color: #a5b4fc; }
  `;

  function wbApplyTheme() {
    if (!wbHost) return;
    wbHost.classList.toggle("wb-dark", document.documentElement.classList.contains("ue-dark-mode"));
    wbHost.classList.toggle("wb-full", !!settings.workbench.fullscreen);
    const fullBtn = wbRoot && wbRoot.querySelector(".wb-fullscreen");
    if (fullBtn) {
      fullBtn.title = settings.workbench.fullscreen ? "退出全屏" : "全屏显示";
      fullBtn.innerHTML = settings.workbench.fullscreen ? WB_ICONS.compress : WB_ICONS.expand;
    }
  }

  function wbSetTabCount(tab, count, isUnread = false) {
    if (!wbRoot) return;
    const badge = wbRoot.querySelector(`.wb-tab[data-tab="${tab}"] .wb-tab-count`);
    if (!badge) return;
    const n = Number(count) || 0;
    badge.textContent = n > 99 ? "99+" : String(n);
    badge.classList.toggle("show", n > 0);
    badge.classList.toggle("unread", isUnread && n > 0);
  }

  function wbEnsure() {
    if (wbHost) return;
    wbHost = document.createElement("div");
    wbHost.id = "yzHelper-workbench";
    wbHost.style.cssText = "position:fixed;inset:0;z-index:2147483000;display:none;";
    wbRoot = wbHost.attachShadow({ mode: "open" });
    wbRoot.innerHTML = `<style>${WB_CSS}</style>
      <div class="wb-mask"></div>
      <div class="wb-panel">
        <div class="wb-head">
          <div class="wb-brand">
            <span class="wb-brand-icon">${WB_ICONS.brand}</span>
            <span>工作台</span>
          </div>
          <div class="wb-tabs">
            <button class="wb-tab active" data-tab="todo">待办<span class="wb-tab-count"></span></button>
            <button class="wb-tab" data-tab="course">课程<span class="wb-tab-count"></span></button>
            <button class="wb-tab" data-tab="notice">通知<span class="wb-tab-count"></span></button>
          </div>
          <div class="wb-actions">
            <button class="wb-icon-btn wb-settings" title="助手设置">${WB_ICONS.settings}</button>
            <button class="wb-icon-btn wb-refresh" title="刷新当前页签">${WB_ICONS.refresh}</button>
            <button class="wb-icon-btn wb-fullscreen" title="全屏显示">${WB_ICONS.expand}</button>
            <button class="wb-icon-btn wb-close" title="关闭 (Esc)">${WB_ICONS.close}</button>
          </div>
        </div>
        <div class="wb-body">
          <div class="wb-pane" data-pane="todo">${wbSkeletonHtml("todo")}</div>
          <div class="wb-pane" data-pane="course" hidden>${wbSkeletonHtml("course")}</div>
          <div class="wb-pane" data-pane="notice" hidden>${wbSkeletonHtml("notice")}</div>
          <div class="wb-pane" data-pane="detail" hidden></div>
          <div class="wb-pane" data-pane="courseView" hidden></div>
        </div>
      </div>`;
    document.body.appendChild(wbHost);
    wbRoot.querySelector(".wb-mask").addEventListener("click", wbClose);
    wbRoot.querySelector(".wb-close").addEventListener("click", wbClose);
    wbRoot.querySelector(".wb-settings").addEventListener("click", toggleSettingsPanel);
    wbRoot.querySelector(".wb-fullscreen").addEventListener("click", () => {
      const next = !settings.workbench.fullscreen;
      settings.workbench.fullscreen = next;
      GM_setValue("workbench_fullscreen", next);
      document
        .querySelectorAll('input[id="workbench_fullscreen"], input[data-setting-id="workbench_fullscreen"]')
        .forEach((el) => {
          el.checked = next;
        });
      wbApplyTheme();
    });
    const refreshBtn = wbRoot.querySelector(".wb-refresh");
    refreshBtn.addEventListener("click", () => {
      refreshBtn.classList.remove("spinning");
      void refreshBtn.offsetWidth;
      refreshBtn.classList.add("spinning");
      if (wbState.tab === "detail" && wbState.detail) {
        wbOpenAssignmentDetail(
          wbState.detail.task,
          wbState.detail.course,
          wbState.detail.returnTab
        );
        return;
      }
      if (wbState.tab === "courseView" && wbState.courseView) {
        const sid = wbState.courseView.course && wbState.courseView.course.id;
        if (sid) {
          courseWorksCache.delete(sid);
          courseActivitiesCache.delete(sid);
        }
        wbOpenCourseView(wbState.courseView.course, wbState.courseView.subTab);
        return;
      }
      if (wbState.tab === "course") {
        wbState.courseLoaded = false;
        courseListCache = null;
      } else if (wbState.tab === "notice") {
        wbState.noticeLoaded = false;
      } else {
        wbState.todoLoaded = false;
        courseWorksCache.clear();
        courseActivitiesCache.clear();
      }
      wbSwitchTab(wbState.tab);
    });
    wbRoot.querySelectorAll(".wb-tab").forEach((btn) => {
      btn.addEventListener("click", () => wbSwitchTab(btn.dataset.tab));
    });
    const obs = new MutationObserver(wbApplyTheme);
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    wbState.themeObserver = obs;
  }

  function wbUpdateTabs() {
    if (!wbRoot) return;
    let highlightTab = wbState.tab;
    if (wbState.tab === "detail" && wbState.detail) {
      highlightTab = wbState.detail.returnTab === "courseView" ? "course" : wbState.detail.returnTab || "todo";
    } else if (wbState.tab === "courseView") {
      highlightTab = "course";
    }
    wbRoot.querySelectorAll(".wb-tab").forEach((btn) => {
      btn.classList.toggle("active", btn.dataset.tab === highlightTab);
    });
    wbRoot.querySelectorAll(".wb-pane").forEach((pane) => {
      pane.hidden = pane.dataset.pane !== wbState.tab;
    });
  }

  function wbGetScrollKey() {
    if (wbState.tab === "courseView" && wbState.courseView && wbState.courseView.course) {
      return "courseView:" + wbState.courseView.course.id;
    }
    return wbState.tab;
  }

  function wbSaveCurrentScroll() {
    if (!wbRoot) return;
    const bodyEl = wbRoot.querySelector(".wb-body");
    if (!bodyEl) return;
    const key = wbGetScrollKey();
    if (key && key !== "detail") {
      wbState.scrollPositions[key] = bodyEl.scrollTop;
    }
  }

  function wbRestoreCurrentScroll() {
    if (!wbRoot) return;
    const bodyEl = wbRoot.querySelector(".wb-body");
    if (!bodyEl) return;
    const key = wbGetScrollKey();
    const pos = wbState.scrollPositions[key];
    bodyEl.scrollTop = typeof pos === "number" ? pos : 0;
  }

  function wbCancelCourseDownload() {
    if (wbActiveCourseDownload) {
      wbActiveCourseDownload.cancelled = true;
      wbActiveCourseDownload = null;
    }
  }

  function wbSwitchTab(tab) {
    wbSaveCurrentScroll();
    if (tab !== "detail") wbState.detail = null;
    if (tab !== "courseView" && tab !== "detail") {
      wbCancelCourseDownload();
      wbState.courseView = null;
    }
    wbState.tab = tab;
    wbUpdateTabs();
    wbRestoreCurrentScroll();
    if (tab === "course" && !wbState.courseLoaded) wbLoadCourses();
    if (tab === "notice" && !wbState.noticeLoaded) wbLoadNotices();
    if (tab === "todo" && !wbState.todoLoaded) wbLoadTodo();
  }

  function wbOpen(tab) {
    wbEnsure();
    wbApplyTheme();
    clearTimeout(wbCloseTimer);
    if (!wbState.open) {
      wbState.prevOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
    }
    wbState.open = true;
    wbHost.style.display = "block";
    requestAnimationFrame(() => wbHost && wbHost.classList.add("wb-open"));
    if (wbState.todoLoaded) wbStartTicker();
    wbSwitchTab(tab || wbState.tab);
    // 后台预拉通知与待办，以便直接进入课程页签时也能点亮未读红点与各课待办角标
    if (!wbState.noticeLoaded) wbLoadNotices();
    if (!wbState.todoLoaded) wbLoadTodo();
  }

  function wbClose() {
    if (!wbHost || !wbState.open) return;
    wbSaveCurrentScroll();
    wbCancelCourseDownload();
    wbState.open = false;
    wbHost.classList.remove("wb-open");
    document.body.style.overflow = wbState.prevOverflow || "";
    if (wbTicker) {
      clearInterval(wbTicker);
      wbTicker = null;
    }
    clearTimeout(wbCloseTimer);
    wbCloseTimer = setTimeout(() => {
      if (!wbState.open && wbHost) wbHost.style.display = "none";
    }, 220);
  }

  function pickTaskTypeLabel(type) {
    const t = Number(type);
    if (t === 1) return "💬 讨论";
    if (t === 2) return "📊 问卷";
    if (t === 4) return "📝 测试";
    return "";
  }

  function wbRenderTodoMeta(card, task, info) {
    const meta = card.querySelector(".wb-meta");
    const tags = card.querySelector(".wb-card-tags");
    if (!meta || !tags) return;
    meta.innerHTML = "";
    tags.innerHTML = "";
    if (wbParseWorkStatus(task) === 2) {
      meta.insertAdjacentHTML("beforeend", '<span class="wb-status-chip rejected">已驳回</span>');
    } else {
      meta.insertAdjacentHTML("beforeend", '<span class="wb-status-chip unsubmitted">未提交</span>');
    }
    const d = parseDeadline(task.endTime);
    if (d) {
      tags.insertAdjacentHTML("beforeend", `<span class="wb-deadline">截止 ${fmtDeadline(d, true)}</span>`);
      const rem = formatRemain(d - Date.now());
      card.dataset.urgency = rem.cls;
      meta.insertAdjacentHTML("beforeend", `<span class="wb-badge ${rem.cls}">${rem.text}</span>`);
      if (rem.cls === "overdue" && info && info.noLateSubmit) {
        meta.insertAdjacentHTML("beforeend", '<span class="wb-chip">不可补交</span>');
      }
    } else {
      card.dataset.urgency = "later";
    }
    const mode = (info && info.mode) || pickModeName(task.assignmentType);
    const typeLabel = pickTaskTypeLabel(task.type);
    if (mode) {
      tags.insertAdjacentHTML(
        "beforeend",
        `<span class="wb-mode">${mode === "小组作业" ? "👥" : "👤"} ${mode}</span>`
      );
    } else if (typeLabel) {
      tags.insertAdjacentHTML("beforeend", `<span class="wb-mode">${typeLabel}</span>`);
    }
    if (info && info.attachments) meta.insertAdjacentHTML("beforeend", `<span class="wb-chip">附件 ${info.attachments}</span>`);
    if (info && info.evaluation) meta.insertAdjacentHTML("beforeend", `<span class="wb-chip">互评</span>`);
    if (info && info.stat) {
      meta.insertAdjacentHTML(
        "beforeend",
        `<span class="wb-chip blue">班级已交 ${info.stat.submitted} / ${info.stat.total} 人</span>`
      );
    }
  }

  function wbFormatSubmittedRemain(endDate, nowMs = Date.now()) {
    const diff = endDate.getTime() - nowMs;
    if (diff <= 0) return "已截止";
    return "距截止" + formatRemain(diff).text;
  }

  function wbUpdateTodoBadges() {
    const nowMs = Date.now();
    wbTodoCards.forEach(({ card, task }) => {
      const badge = card.querySelector(".wb-badge");
      const d = parseDeadline(task.endTime);
      if (!badge || !d) return;
      const rem = formatRemain(d - nowMs);
      card.dataset.urgency = rem.cls;
      badge.className = "wb-badge " + rem.cls;
      badge.textContent = rem.text;
    });
    wbSubmittedCards.forEach(({ card, endDate }) => {
      const chip = card.querySelector("[data-submitted-remain]");
      if (!chip || !endDate) return;
      chip.textContent = wbFormatSubmittedRemain(endDate, nowMs);
    });
  }

  async function wbCollectSubmittedActiveWorks() {
    const courses = await getCourseList();
    if (!Array.isArray(courses) || !courses.length) return [];
    const nowMs = Date.now();
    const seen = new Set();
    const collected = [];
    for (let i = 0; i < courses.length; i += 5) {
      const batch = courses.slice(i, i + 5);
      const pairs = await Promise.all(
        batch.map(async (course) => ({
          course,
          works: await fetchCourseWorks(course.id),
        }))
      );
      for (const { course, works } of pairs) {
        for (const work of works) {
          if (!wbIsWorkSubmittedActive(work, nowMs)) continue;
          const wid = work.id || work.activityId;
          if (wid && seen.has(wid)) continue;
          if (wid) seen.add(wid);
          const endStr = work.assignmentEndTime || work.endTime;
          const endDate = parseDeadline(endStr);
          if (!endDate) continue;
          collected.push({ work, course, endDate, endStr });
        }
      }
    }
    collected.sort((a, b) => a.endDate.getTime() - b.endDate.getTime());
    return collected;
  }

  function wbAttachCourseFilter(filterBar, cardsList, totalCount, courseCounts) {
    if (!filterBar.isConnected) return;
    if (courseCounts.size <= 1) {
      filterBar.innerHTML = "";
      filterBar.hidden = true;
      cardsList.forEach(({ card }) => {
        card.hidden = false;
      });
      return;
    }
    filterBar.innerHTML = "";
    let activeCourse = "";
    const applyFilter = (courseName) => {
      activeCourse = courseName;
      cardsList.forEach(({ card }) => {
        card.hidden = !!activeCourse && card.dataset.course !== activeCourse;
      });
      filterBar.querySelectorAll(".wb-filter-chip").forEach((chip) => {
        chip.classList.toggle("active", chip.dataset.course === activeCourse);
      });
    };
    const addChip = (label, courseKey, active) => {
      const chip = document.createElement("button");
      chip.className = "wb-filter-chip" + (active ? " active" : "");
      chip.dataset.course = courseKey;
      chip.textContent = label;
      chip.addEventListener("click", () => applyFilter(courseKey));
      filterBar.appendChild(chip);
    };
    addChip(`全部 (${totalCount})`, "", true);
    courseCounts.forEach((cnt, name) => addChip(`${name} (${cnt})`, name, false));
    filterBar.hidden = false;
  }

  function wbStartTicker() {
    if (wbTicker) return;
    wbTicker = setInterval(() => {
      if (!wbState.open) return;
      wbUpdateTodoBadges();
    }, 60 * 1000);
  }

  async function wbLoadTodo() {
    wbState.todoLoaded = true;
    if (!wbRoot) return;
    const seq = ++wbTodoLoadSeq;
    const pane = wbRoot.querySelector('[data-pane="todo"]');
    pane.innerHTML = wbSkeletonHtml("todo");
    try {
      const res = await getUndoneList();
      if (seq !== wbTodoLoadSeq) return;
      const list = (res && res.data && res.data.undoneList) || [];
      const tasks = sortTasksByDeadline(list);
      wbSetTabCount("todo", tasks.length);
      pane.innerHTML = "";

      const inner = document.createElement("div");
      inner.className = "wb-inner";
      pane.appendChild(inner);

      const subBar = document.createElement("div");
      subBar.className = "wb-subtabs-bar";
      subBar.innerHTML = `
        <div class="wb-subtabs">
          <button class="wb-subtab" data-sub="pending">待完成<span class="wb-subtab-num" data-pending-num>${tasks.length}</span></button>
          <button class="wb-subtab" data-sub="submitted">已提交<span class="wb-subtab-num" data-submitted-num>…</span></button>
        </div>`;
      inner.appendChild(subBar);
      const pendingNumEl = subBar.querySelector("[data-pending-num]");
      const submittedNumEl = subBar.querySelector("[data-submitted-num]");

      const subPending = document.createElement("div");
      const subSubmitted = document.createElement("div");
      inner.appendChild(subPending);
      inner.appendChild(subSubmitted);

      const switchSub = (sub) => {
        const target = sub === "submitted" ? "submitted" : "pending";
        wbState.todoSubTab = target;
        subBar.querySelectorAll(".wb-subtab").forEach((b) => {
          b.classList.toggle("active", b.dataset.sub === target);
        });
        subPending.hidden = target !== "pending";
        subSubmitted.hidden = target !== "submitted";
      };
      subBar.querySelectorAll(".wb-subtab").forEach((b) => {
        b.addEventListener("click", () => switchSub(b.dataset.sub));
      });
      switchSub(wbState.todoSubTab);

      wbTodoCards = [];
      wbSubmittedCards = [];

      // 子页签 1：待完成
      if (!tasks.length) {
        wbCoursePendingCounts = new Map();
        if (wbCourseGridRerender) wbCourseGridRerender();
        subPending.innerHTML = wbEmptyHtml("当前没有待办事项");
      } else {
        const filterBar = document.createElement("div");
        filterBar.className = "wb-filter-bar";
        filterBar.hidden = true;
        subPending.appendChild(filterBar);

        const activeListEl = document.createElement("div");
        subPending.appendChild(activeListEl);

        const activeEmptyEl = document.createElement("div");
        activeEmptyEl.innerHTML = wbEmptyHtml("当前没有可提交的待办事项");
        activeEmptyEl.hidden = true;
        subPending.appendChild(activeEmptyEl);

        const expiredBox = document.createElement("details");
        expiredBox.className = "wb-expired-box";
        expiredBox.hidden = true;
        expiredBox.innerHTML =
          '<summary class="wb-expired-summary"></summary><div class="wb-expired-list"></div>';
        const expiredSummary = expiredBox.querySelector(".wb-expired-summary");
        const expiredListEl = expiredBox.querySelector(".wb-expired-list");
        subPending.appendChild(expiredBox);

        const cards = {};
        const taskCourses = new Map();
        const expiredIds = new Set();
        let coursesResolved = false;

        const syncPendingViews = () => {
          if (seq !== wbTodoLoadSeq) return;
          const activeItems = wbTodoCards.filter(({ task }) => !expiredIds.has(task.activityId || task.id));
          const activeCount = activeItems.length;
          const expiredCount = expiredIds.size;

          wbSetTabCount("todo", activeCount);
          if (pendingNumEl) pendingNumEl.textContent = String(activeCount);
          activeEmptyEl.hidden = activeCount > 0;
          expiredBox.hidden = expiredCount === 0;
          if (expiredCount > 0) {
            expiredSummary.textContent = `已过期 · 不可补交 (${expiredCount})`;
          }

          if (coursesResolved) {
            const courseCounts = new Map();
            const pendingById = new Map();
            activeItems.forEach(({ card, task }) => {
              const tid = task.activityId || task.id;
              const info = taskCourses.get(tid);
              if (info && info.id !== undefined && info.id !== null) {
                const cid = String(info.id);
                pendingById.set(cid, (pendingById.get(cid) || 0) + 1);
              }
              const courseName = info ? info.name : "未知课程";
              if (card && card.isConnected) {
                courseCounts.set(courseName, (courseCounts.get(courseName) || 0) + 1);
              }
            });
            wbCoursePendingCounts = pendingById;
            if (wbCourseGridRerender) wbCourseGridRerender();
            wbAttachCourseFilter(filterBar, activeItems, activeCount, courseCounts);
          }
        };

        tasks.forEach((task) => {
          const tid = task.activityId || task.id;
          const card = document.createElement("div");
          card.className = "wb-card";
          card.innerHTML =
            '<div class="wb-card-head"><div class="wb-card-title"></div><div class="wb-card-tags"></div></div>' +
            '<div class="wb-course">课程加载中…</div><div class="wb-meta"></div>';
          card.querySelector(".wb-card-title").textContent = task.activityName || task.assignmentTitle || "未命名作业";
          wbRenderTodoMeta(card, task, null);
          card.addEventListener("click", () => {
            const t = Number(task.type);
            if (t === 3 || t === 5) {
              wbOpenAssignmentDetail(task, taskCourses.get(tid) || get(tid) || null, "todo");
            } else {
              const url = buildTaskUrl(task);
              if (url) {
                wbClose();
                openTaskUrl(url);
              }
            }
          });
          activeListEl.appendChild(card);
          cards[tid] = card;
          wbTodoCards.push({ card: card, task: task });
        });
        wbStartTicker();
        const ids = tasks.map((t) => t.activityId || t.id).filter(Boolean);
        searchCourses(ids)
          .then((infos) => {
            if (seq !== wbTodoLoadSeq) return;
            coursesResolved = true;
            tasks.forEach((task) => {
              const tid = task.activityId || task.id;
              const card = cards[tid];
              const info = infos[tid];
              if (info) taskCourses.set(tid, info);
              const courseName = info ? info.name : "未知课程";
              if (card && card.isConnected) {
                card.dataset.course = courseName;
                const courseEl = card.querySelector(".wb-course");
                courseEl.textContent = "";
                courseEl.appendChild(document.createTextNode(courseName));
                if (info && info.teachers) {
                  const tSpan = document.createElement("span");
                  tSpan.className = "wb-course-teacher";
                  tSpan.textContent = " · " + info.teachers;
                  courseEl.appendChild(tSpan);
                }
              }
            });
            syncPendingViews();
          })
          .catch(() => {});
        tasks.forEach((task) => {
          fetchAssignmentInfo(task).then((info) => {
            if (seq !== wbTodoLoadSeq) return;
            const tid = task.activityId || task.id;
            const card = cards[tid];
            if (!card || !card.isConnected || !info) return;
            wbRenderTodoMeta(card, task, info);
            const d = parseDeadline(task.endTime);
            const isExpiredLocked = !!(info.noLateSubmit && d && d.getTime() <= Date.now());
            if (isExpiredLocked && !expiredIds.has(tid)) {
              expiredIds.add(tid);
              card.hidden = false;
              expiredListEl.appendChild(card);
              syncPendingViews();
            }
          });
        });
      }

      // 子页签 2：已提交（未截止），后台异步扫描当前学期课程作业
      subSubmitted.innerHTML = wbSkeletonHtml("todo");
      wbCollectSubmittedActiveWorks()
        .then((items) => {
          if (seq !== wbTodoLoadSeq || !subSubmitted.isConnected) return;
          if (submittedNumEl) submittedNumEl.textContent = String(items.length);
          subSubmitted.innerHTML = "";
          if (!items.length) {
            subSubmitted.innerHTML = wbEmptyHtml("暂无已提交且未截止的作业");
            return;
          }
          const subFilterBar = document.createElement("div");
          subFilterBar.className = "wb-filter-bar";
          subFilterBar.hidden = true;
          subSubmitted.appendChild(subFilterBar);

          const courseCounts = new Map();
          const nowMs = Date.now();
          items.forEach(({ work, course, endDate, endStr }) => {
            const card = document.createElement("div");
            card.className = "wb-card";
            card.dataset.urgency = "later";
            const courseName = (course && course.name) || "未知课程";
            card.dataset.course = courseName;
            courseCounts.set(courseName, (courseCounts.get(courseName) || 0) + 1);

            card.innerHTML =
              '<div class="wb-card-head"><div class="wb-card-title"></div><div class="wb-card-tags"></div></div>' +
              '<div class="wb-course"></div><div class="wb-meta"></div>';
            card.querySelector(".wb-card-title").textContent =
              work.assignmentTitle || work.activityName || "未命名作业";
            const courseEl = card.querySelector(".wb-course");
            courseEl.appendChild(document.createTextNode(courseName));
            if (course && course.teachers) {
              const tSpan = document.createElement("span");
              tSpan.className = "wb-course-teacher";
              tSpan.textContent = " · " + course.teachers;
              courseEl.appendChild(tSpan);
            }

            const tags = card.querySelector(".wb-card-tags");
            const meta = card.querySelector(".wb-meta");
            tags.insertAdjacentHTML("beforeend", `<span class="wb-deadline">截止 ${fmtDeadline(endDate, true)}</span>`);
            const mode = pickModeName(work.assignmentType);
            if (mode) {
              tags.insertAdjacentHTML(
                "beforeend",
                `<span class="wb-mode">${mode === "小组作业" ? "👥" : "👤"} ${mode}</span>`
              );
            }
            const status = wbPickWorkStatus(work);
            if (status) {
              meta.insertAdjacentHTML(
                "beforeend",
                `<span class="wb-status-chip ${status.cls}">${escapeHtml(status.text)}</span>`
              );
            }
            const submitDate = parseDeadline(work.submitTime);
            if (submitDate) {
              meta.insertAdjacentHTML("beforeend", `<span class="wb-chip">提交于 ${fmtDeadline(submitDate)}</span>`);
            }
            meta.insertAdjacentHTML(
              "beforeend",
              `<span class="wb-chip" data-submitted-remain>${wbFormatSubmittedRemain(endDate, nowMs)}</span>`
            );

            card.addEventListener("click", () => {
              const taskObj = Object.assign({}, work, {
                activityId: work.id || work.activityId,
                activityName: work.assignmentTitle || work.activityName,
                endTime: endStr,
                type: 3,
              });
              wbOpenAssignmentDetail(taskObj, course || null, "todo");
            });
            subSubmitted.appendChild(card);
            wbSubmittedCards.push({ card, endDate });
          });
          wbAttachCourseFilter(subFilterBar, wbSubmittedCards, items.length, courseCounts);
          wbStartTicker();
        })
        .catch(() => {
          if (seq !== wbTodoLoadSeq || !subSubmitted.isConnected) return;
          if (submittedNumEl) submittedNumEl.textContent = "!";
          subSubmitted.innerHTML = wbEmptyHtml("加载已提交作业失败，请点击刷新重试");
        });
    } catch (e) {
      if (seq !== wbTodoLoadSeq) return;
      pane.innerHTML = wbEmptyHtml(
        e && e.isAuthError ? "登录状态已过期，请刷新页面重新登录" : "加载失败，请稍后重试"
      );
      wbState.todoLoaded = false;
    }
  }

  function renderTextWithLinks(container, text) {
    container.textContent = "";
    const urlRe = /https?:\/\/[^\s<>"'()（）【】《》，。；：！？、]+/g;
    let last = 0;
    let match;
    while ((match = urlRe.exec(text)) !== null) {
      if (match.index > last) {
        container.appendChild(document.createTextNode(text.slice(last, match.index)));
      }
      const rawUrl = match[0];
      const cleanUrl = rawUrl.replace(/[.,;:!?]+$/, "");
      const trailing = rawUrl.slice(cleanUrl.length);
      const a = document.createElement("a");
      a.className = "wb-link";
      a.href = cleanUrl;
      a.target = "_blank";
      a.rel = "noopener noreferrer";
      a.textContent = cleanUrl;
      container.appendChild(a);
      if (trailing) {
        container.appendChild(document.createTextNode(trailing));
      }
      last = match.index + rawUrl.length;
    }
    if (last < text.length) {
      container.appendChild(document.createTextNode(text.slice(last)));
    }
  }

  async function wbLoadNotices() {
    wbState.noticeLoaded = true;
    if (!wbRoot) return;
    const seq = ++wbNoticeLoadSeq;
    const pane = wbRoot.querySelector('[data-pane="notice"]');
    pane.innerHTML = wbSkeletonHtml("notice");
    try {
      const [userId] = getToken();
      const qs = new URLSearchParams({
        newsCopyPersonId: userId || "",
        current: 1,
        size: 100,
      }).toString();
      const res = await apiFetch("ykt-basics/api/inform/news/list?" + qs, { method: "POST" });
      if (seq !== wbNoticeLoadSeq) return;
      const rawList = (res && res.data && res.data.records) || [];
      const list = rawList.slice().sort((a, b) => {
        const ta = parseDeadline(a.newsCopyTime)?.getTime() || 0;
        const tb = parseDeadline(b.newsCopyTime)?.getTime() || 0;
        return tb - ta;
      });
      pane.innerHTML = "";
      if (!list.length) {
        wbSetTabCount("notice", 0, true);
        pane.innerHTML = wbEmptyHtml("暂无通知");
        return;
      }
      const inner = document.createElement("div");
      inner.className = "wb-inner";
      let unreadCount = list.filter((item) => Number(item.isRead) === 0).length;
      const toolbar = document.createElement("div");
      toolbar.className = "wb-notice-toolbar";
      toolbar.innerHTML =
        '<span class="wb-notice-count"></span>' +
        '<button class="wb-readall">全部已读</button>';
      const countEl = toolbar.querySelector(".wb-notice-count");
      const readAllBtn = toolbar.querySelector(".wb-readall");
      const syncNoticeCount = () => {
        countEl.textContent = unreadCount > 0 ? "未读 " + unreadCount + " 条" : "全部已读";
        readAllBtn.disabled = unreadCount <= 0;
        wbSetTabCount("notice", unreadCount, true);
      };
      syncNoticeCount();
      inner.appendChild(toolbar);

      const controls = document.createElement("div");
      controls.className = "wb-notice-controls";
      controls.innerHTML =
        `<div class="wb-search-wrap"><span class="wb-search-icon">${WB_ICONS.search}</span>` +
        '<input class="wb-search" placeholder="搜索通知标题 / 正文"></div>' +
        '<button class="wb-toggle-chip" type="button">仅看未读</button>';
      const noticeSearch = controls.querySelector(".wb-search");
      const unreadOnlyBtn = controls.querySelector(".wb-toggle-chip");
      inner.appendChild(controls);

      const noticeListHost = document.createElement("div");
      inner.appendChild(noticeListHost);
      const noticeEmptyTip = document.createElement("div");
      noticeEmptyTip.className = "wb-empty";
      noticeEmptyTip.innerHTML = `<div class="wb-empty-icon">${WB_ICONS.empty}</div><div>未找到匹配的通知</div>`;
      noticeEmptyTip.hidden = true;
      inner.appendChild(noticeEmptyTip);

      let unreadOnly = false;
      const cards = [];
      const applyNoticeFilter = () => {
        const kw = noticeSearch.value.trim().toLowerCase();
        let visible = 0;
        cards.forEach(({ card, searchText }) => {
          const matchUnread = !unreadOnly || card.dataset.unread === "1";
          const matchKw = !kw || searchText.includes(kw);
          const show = matchUnread && matchKw;
          card.hidden = !show;
          if (show) visible++;
        });
        noticeEmptyTip.hidden = visible > 0;
      };
      noticeSearch.addEventListener("input", applyNoticeFilter);
      unreadOnlyBtn.addEventListener("click", () => {
        unreadOnly = !unreadOnly;
        unreadOnlyBtn.classList.toggle("active", unreadOnly);
        applyNoticeFilter();
      });

      const markCardRead = (card, item) => {
        if (card.dataset.unread !== "1") return;
        card.dataset.unread = "0";
        card.querySelector(".wb-dot")?.remove();
        card.querySelector(".wb-notice-hint")?.remove();
        unreadCount = Math.max(0, unreadCount - 1);
        syncNoticeCount();
        if (unreadOnly) applyNoticeFilter();
        if (item && item.id != null) {
          apiFetch(
            "ykt-basics/api/inform/news/readNews?ids=" + encodeURIComponent(item.id),
            { method: "POST" }
          ).catch(() => {});
        }
      };

      list.forEach((item) => {
        const card = document.createElement("div");
        card.className = "wb-notice";
        const unread = Number(item.isRead) === 0;
        card.dataset.unread = unread ? "1" : "0";
        card.innerHTML =
          '<div class="wb-notice-title">' +
          (unread ? '<span class="wb-dot"></span>' : "") +
          '<span class="wb-notice-text"></span>' +
          (unread ? '<span class="wb-notice-hint">点击已读</span>' : "") +
          '</div>' +
          '<div class="wb-notice-time"></div>' +
          '<div class="wb-notice-body"></div>';
        const titleStr = item.newsTitle || "无标题通知";
        card.querySelector(".wb-notice-text").textContent = titleStr;
        card.querySelector(".wb-notice-time").textContent = item.newsCopyTime || "";
        let noticeText = "";
        try {
          const doc = new DOMParser().parseFromString(item.newsInfo || "", "text/html");
          doc.querySelectorAll("script,style,iframe,object,embed,link,meta").forEach((n) => n.remove());
          noticeText = (doc.body && doc.body.textContent) || "";
        } catch (e) {
          noticeText = "";
        }
        const trimmedText = noticeText.trim();
        renderTextWithLinks(card.querySelector(".wb-notice-body"), trimmedText);
        card.addEventListener("click", () => markCardRead(card, item));
        cards.push({ card, searchText: (titleStr + " " + trimmedText).toLowerCase() });
        noticeListHost.appendChild(card);
      });
      readAllBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        const unreadIds = [];
        cards.forEach(({ card: c }, idx) => {
          if (c.dataset.unread === "1") {
            c.dataset.unread = "0";
            c.querySelector(".wb-dot")?.remove();
            c.querySelector(".wb-notice-hint")?.remove();
            if (list[idx] && list[idx].id != null) unreadIds.push(list[idx].id);
          }
        });
        unreadCount = 0;
        syncNoticeCount();
        if (unreadOnly) applyNoticeFilter();
        if (unreadIds.length) {
          apiFetch(
            "ykt-basics/api/inform/news/readNews?ids=" + encodeURIComponent(unreadIds.join(",")),
            { method: "POST" }
          ).catch(() => {});
        }
      });
      pane.appendChild(inner);
    } catch (e) {
      if (seq !== wbNoticeLoadSeq) return;
      pane.innerHTML = wbEmptyHtml(
        e && e.isAuthError ? "登录状态已过期，请刷新页面重新登录" : "加载失败，请稍后重试"
      );
      wbState.noticeLoaded = false;
    }
  }

  async function wbLoadCourses() {
    wbState.courseLoaded = true;
    if (!wbRoot) return;
    const seq = ++wbCourseLoadSeq;
    const pane = wbRoot.querySelector('[data-pane="course"]');
    pane.innerHTML = wbSkeletonHtml("course");
    try {
      const list = await getCourseList();
      if (seq !== wbCourseLoadSeq) return;
      wbSetTabCount("course", (list && list.length) || 0);
      pane.innerHTML = "";
      if (!list || !list.length) {
        if (apiAuthExpired) {
          wbState.courseLoaded = false;
          pane.innerHTML = wbEmptyHtml("登录状态已过期，请刷新页面重新登录");
        } else {
          pane.innerHTML = wbEmptyHtml("暂无课程");
        }
        return;
      }
      const inner = document.createElement("div");
      inner.className = "wb-inner";
      pane.appendChild(inner);

      const searchWrap = document.createElement("div");
      searchWrap.className = "wb-search-wrap";
      searchWrap.innerHTML = `<span class="wb-search-icon">${WB_ICONS.search}</span>`;
      const search = document.createElement("input");
      search.className = "wb-search";
      search.placeholder = "搜索课程 / 教师 / 院系";
      searchWrap.appendChild(search);
      inner.appendChild(searchWrap);

      const grid = document.createElement("div");
      grid.className = "wb-course-grid";
      inner.appendChild(grid);
      const emptyTip = document.createElement("div");
      emptyTip.className = "wb-empty";
      emptyTip.innerHTML = `<div class="wb-empty-icon">${WB_ICONS.empty}</div><div>未找到匹配的课程</div>`;
      emptyTip.hidden = true;
      inner.appendChild(emptyTip);

      const renderGrid = (keyword) => {
        grid.innerHTML = "";
        const kw = (keyword || "").toLowerCase();
        const pinnedSet = wbGetPinnedCourses();
        const matched = list
          .filter((c) => {
            if (!kw) return true;
            return [c.name, c.teachers, c.department]
              .filter(Boolean)
              .join(" ")
              .toLowerCase()
              .includes(kw);
          })
          .sort((a, b) => {
            const pa = pinnedSet.has(String(a.id)) ? 0 : 1;
            const pb = pinnedSet.has(String(b.id)) ? 0 : 1;
            return pa - pb;
          });
        emptyTip.hidden = matched.length > 0;
        matched.forEach((course) => {
          const item = document.createElement("div");
          item.className = "wb-course-item";
          const titleText = course.name || "未命名课程";
          const tone = WB_COURSE_PALETTE[wbPickCourseTone(titleText)];
          const isPinned = pinnedSet.has(String(course.id));
          const pendingNum = wbCoursePendingCounts.get(String(course.id)) || 0;
          item.innerHTML =
            '<div class="wb-course-avatar"></div>' +
            '<div class="wb-course-info"><div class="wb-course-title"></div><div class="wb-course-meta"></div></div>' +
            '<div class="wb-course-badges">' +
            (pendingNum > 0 ? `<span class="wb-course-pending">${pendingNum} 待办</span>` : "") +
            `<button class="wb-pin-btn${isPinned ? " pinned" : ""}" type="button" title="${isPinned ? "取消置顶" : "星标置顶"}">${WB_ICONS.star}</button>` +
            `<span class="wb-course-arrow">${WB_ICONS.arrow}</span>` +
            "</div>";
          const avatar = item.querySelector(".wb-course-avatar");
          avatar.textContent = titleText.trim().charAt(0) || "课";
          avatar.style.setProperty("--tone-bg-l", tone[0]);
          avatar.style.setProperty("--tone-fg-l", tone[1]);
          avatar.style.setProperty("--tone-bg-d", tone[2]);
          avatar.style.setProperty("--tone-fg-d", tone[3]);
          item.querySelector(".wb-course-title").textContent = titleText;
          item.querySelector(".wb-course-meta").textContent = [course.teachers, course.department]
            .filter(Boolean)
            .join(" · ");
          item.querySelector(".wb-pin-btn").addEventListener("click", (e) => {
            e.stopPropagation();
            wbTogglePinnedCourse(course.id);
            renderGrid(search.value.trim());
          });
          item.addEventListener("click", () => {
            wbOpenCourseView(course);
          });
          grid.appendChild(item);
        });
      };
      wbCourseGridRerender = () => {
        if (grid.isConnected) renderGrid(search.value.trim());
      };
      search.addEventListener("input", () => renderGrid(search.value.trim()));
      renderGrid("");
    } catch (e) {
      if (seq !== wbCourseLoadSeq) return;
      pane.innerHTML = wbEmptyHtml(
        e && e.isAuthError ? "登录状态已过期，请刷新页面重新登录" : "加载失败，请稍后重试"
      );
      wbState.courseLoaded = false;
    }
  }

  const WB_SAFE_TAGS = new Set([
    "P", "BR", "DIV", "SPAN", "STRONG", "B", "EM", "I", "U", "S",
    "UL", "OL", "LI", "BLOCKQUOTE", "PRE", "CODE", "H1", "H2", "H3", "H4",
    "TABLE", "THEAD", "TBODY", "TR", "TH", "TD", "A", "IMG", "HR",
  ]);

  function wbRenderSafeHtml(container, htmlStr) {
    container.textContent = "";
    if (!htmlStr || !String(htmlStr).trim()) {
      container.innerHTML = '<div class="wb-rich-empty">该作业未填写文字说明</div>';
      return;
    }
    let doc;
    try {
      doc = new DOMParser().parseFromString(String(htmlStr), "text/html");
    } catch (e) {
      container.textContent = String(htmlStr);
      return;
    }
    const cleanNode = (node) => {
      if (node.nodeType === Node.TEXT_NODE) {
        return document.createTextNode(node.nodeValue || "");
      }
      if (node.nodeType !== Node.ELEMENT_NODE) return null;
      const tag = node.tagName.toUpperCase();
      if (["SCRIPT", "STYLE", "IFRAME", "OBJECT", "EMBED", "SVG", "LINK", "META"].includes(tag)) {
        return null;
      }
      if (!WB_SAFE_TAGS.has(tag)) {
        const frag = document.createDocumentFragment();
        node.childNodes.forEach((child) => {
          const cleaned = cleanNode(child);
          if (cleaned) frag.appendChild(cleaned);
        });
        return frag;
      }
      const el = document.createElement(tag.toLowerCase());
      if (tag === "A") {
        const href = (node.getAttribute("href") || "").trim();
        if (/^(https?:|mailto:)/i.test(href)) {
          el.setAttribute("href", href);
          el.setAttribute("target", "_blank");
          el.setAttribute("rel", "noopener noreferrer");
          el.className = "wb-link";
        }
      } else if (tag === "IMG") {
        const src = (node.getAttribute("src") || "").trim();
        if (/^(https?:|data:image\/)/i.test(src)) {
          el.setAttribute("src", src);
          el.setAttribute("loading", "lazy");
          el.setAttribute("alt", node.getAttribute("alt") || "作业图片");
        } else {
          return null;
        }
      }
      node.childNodes.forEach((child) => {
        const cleaned = cleanNode(child);
        if (cleaned) el.appendChild(cleaned);
      });
      return el;
    };
    const frag = document.createDocumentFragment();
    doc.body.childNodes.forEach((child) => {
      const cleaned = cleanNode(child);
      if (cleaned) frag.appendChild(cleaned);
    });
    container.appendChild(frag);
    if (!container.textContent.trim() && !container.querySelector("img")) {
      container.innerHTML = '<div class="wb-rich-empty">该作业未填写文字说明</div>';
    }
  }

  async function wbPreviewAttachment(res) {
    const url = await getPreviewURL(res.resourceId);
    const filename = res.resourceName || "附件";
    if (settings.preview.autoDownload) {
      downloadFile(url, filename).catch(() => {});
    }
    if (OFFICE_EXT_RE.test(filename) && settings.preview.autoSwitchOffice) {
      openTab(
        "https://view.officeapps.live.com/op/view.aspx?src=" + encodeURIComponent(url),
        { active: true, insert: true }
      );
    } else if (onlinePreview !== null) {
      openTab(onlinePreview + encodeURIComponent(url), {
        active: true,
        insert: true,
      });
    } else {
      openTab(url, { active: true, insert: true });
    }
  }

  function wbPickFileTypeBadge(filename) {
    const m = String(filename || "").trim().match(/\.([a-z0-9]+)$/i);
    if (!m) return null;
    const ext = m[1].toLowerCase();
    if (ext === "pdf") return { cls: "pdf", label: "PDF" };
    if (ext === "ppt" || ext === "pptx") return { cls: "ppt", label: "PPT" };
    if (ext === "doc" || ext === "docx") return { cls: "doc", label: "DOC" };
    if (ext === "xls" || ext === "xlsx" || ext === "csv") return { cls: "xls", label: "XLS" };
    if (/^(zip|rar|7z|tar|gz|tgz)$/.test(ext)) return { cls: "zip", label: "ZIP" };
    if (/^(png|jpe?g|gif|webp|svg|bmp)$/.test(ext)) return { cls: "img", label: "IMG" };
    if (/^(mp4|mov|avi|mkv|mp3|wav|m4a)$/.test(ext)) return { cls: "media", label: "MEDIA" };
    if (/^(txt|md|c|cpp|h|hpp|py|java|js|ts|html|css|json|xml|sql|sh)$/.test(ext)) {
      return { cls: "code", label: ext.toUpperCase().slice(0, 4) };
    }
    return null;
  }

  function wbCreateAttachmentRow(res, fallbackName = "未命名附件") {
    const rid = res.resourceId || res.id;
    const fname = res.resourceName || res.name || fallbackName;
    const extBadge = wbPickFileTypeBadge(fname);
    const iconHtml = extBadge
      ? `<span class="wb-file-ext ${extBadge.cls}">${extBadge.label}</span>`
      : `<span class="wb-attach-ico">${WB_ICONS.file}</span>`;
    const row = document.createElement("div");
    row.className = "wb-attach-item";
    row.innerHTML =
      iconHtml +
      '<span class="wb-attach-name"></span>' +
      '<div class="wb-attach-btns">' +
      `<button class="wb-ghost-btn wb-act-preview">${WB_ICONS.eye}<span>预览</span></button>` +
      `<button class="wb-ghost-btn wb-act-dl">${WB_ICONS.download}<span>下载</span></button>` +
      "</div>";
    const normalized = { resourceId: rid, resourceName: fname };
    const nameEl = row.querySelector(".wb-attach-name");
    nameEl.textContent = fname;
    nameEl.title = fname;

    const previewBtn = row.querySelector(".wb-act-preview");
    const previewSpan = previewBtn.querySelector("span");
    previewBtn.addEventListener("click", async () => {
      previewBtn.disabled = true;
      previewSpan.textContent = "打开中…";
      try {
        await wbPreviewAttachment(normalized);
      } catch (e) {
        showNotification("预览失败", "无法获取文件预览链接");
      } finally {
        previewBtn.disabled = false;
        previewSpan.textContent = "预览";
      }
    });

    const dlBtn = row.querySelector(".wb-act-dl");
    const dlSpan = dlBtn.querySelector("span");
    let dlDoneTimer = null;
    dlBtn.addEventListener("click", async () => {
      clearTimeout(dlDoneTimer);
      dlBtn.classList.remove("done");
      dlBtn.disabled = true;
      dlSpan.textContent = "准备中…";
      try {
        const url = await getPreviewURL(rid);
        dlSpan.textContent = "下载中…";
        await downloadFile(url, fname, null, (pct) => {
          if (dlSpan.isConnected) {
            dlSpan.textContent = pct === null ? "下载中…" : `下载中 ${pct}%`;
          }
        });
        dlBtn.classList.add("done");
        dlSpan.textContent = "已下载";
        dlDoneTimer = setTimeout(() => {
          if (dlBtn.isConnected) {
            dlBtn.classList.remove("done");
            dlSpan.textContent = "下载";
          }
        }, 1500);
      } catch (e) {
        dlSpan.textContent = "下载";
        showNotification("下载失败", "无法获取文件下载链接");
      } finally {
        dlBtn.disabled = false;
      }
    });
    return row;
  }

  async function wbOpenAssignmentDetail(task, courseInfo, returnTab = "todo") {
    if (!wbRoot || !task) return;
    wbSaveCurrentScroll();
    const id = task.activityId || task.id;
    const backLabel = returnTab === "courseView" ? "返回课程" : "返回待办";
    wbState.detail = { task, course: courseInfo, returnTab };
    wbState.tab = "detail";
    wbUpdateTabs();
    const pane = wbRoot.querySelector('[data-pane="detail"]');
    const bodyEl = wbRoot.querySelector(".wb-body");
    if (bodyEl) bodyEl.scrollTop = 0;
    pane.innerHTML = wbSkeletonHtml("todo");

    const nativeUrl = buildTaskUrl(task, Number(task.type) === 5 ? "fourth" : "second");
    try {
      const [json, submitJson] = await Promise.all([
        getDetail(id),
        getSubmitView(id).catch(() => null),
      ]);
      // 防止异步返回时用户已切走或打开了别的作业
      if (wbState.tab !== "detail" || !wbState.detail || (wbState.detail.task.activityId || wbState.detail.task.id) !== id) {
        return;
      }
      const d = (json && json.data) || {};
      const sub = (submitJson && submitJson.data) || null;
      const effectiveWork = Object.assign({}, task, sub || {});
      const workStatus = wbPickWorkStatus(effectiveWork);
      const isSubmittedOrGraded = !!(workStatus && !wbIsWorkPending(effectiveWork));

      pane.innerHTML = "";
      const inner = document.createElement("div");
      inner.className = "wb-inner";
      pane.appendChild(inner);

      // 顶部操作条
      const bar = document.createElement("div");
      bar.className = "wb-detail-bar";
      bar.innerHTML =
        `<button class="wb-back-btn">${WB_ICONS.back}<span>${backLabel}</span></button>` +
        `<button class="wb-primary-btn"><span>去原页提交 / 查看</span>${WB_ICONS.external}</button>`;
      bar.querySelector(".wb-back-btn").addEventListener("click", () => wbSwitchTab(returnTab));
      bar.querySelector(".wb-primary-btn").addEventListener("click", () => {
        wbClose();
        openTaskUrl(nativeUrl);
      });
      inner.appendChild(bar);

      // 头部概览卡片
      const hero = document.createElement("div");
      hero.className = "wb-detail-hero";
      const titleText = d.assignmentTitle || task.activityName || task.assignmentTitle || "未命名作业";
      const titleEl = document.createElement("div");
      titleEl.className = "wb-detail-title";
      titleEl.textContent = titleText;
      hero.appendChild(titleEl);

      const courseLabel = courseInfo
        ? courseInfo.name + (courseInfo.teachers ? " · " + courseInfo.teachers : "")
        : d.siteName || d.courseName || "";
      if (courseLabel) {
        const courseBtn = document.createElement("button");
        courseBtn.className = "wb-detail-course" + (courseInfo && courseInfo.id ? "" : " static");
        courseBtn.innerHTML = `${WB_ICONS.book}<span></span>`;
        courseBtn.querySelector("span").textContent = courseLabel;
        if (courseInfo && courseInfo.id) {
          courseBtn.title = "点击进入课程空间";
          courseBtn.addEventListener("click", () => {
            wbOpenCourseView(courseInfo);
          });
        }
        hero.appendChild(courseBtn);
      }

      const meta = document.createElement("div");
      meta.className = "wb-detail-meta";
      const endTimeStr = d.assignmentEndTime || d.endTime || task.endTime;
      const beginTimeStr = d.assignmentBeginTime || d.beginTime;
      const endDate = parseDeadline(endTimeStr);
      if (workStatus) {
        meta.insertAdjacentHTML(
          "beforeend",
          `<span class="wb-status-chip ${workStatus.cls}">${escapeHtml(workStatus.text)}</span>`
        );
      }
      if (endDate) {
        if (!isSubmittedOrGraded) {
          const rem = formatRemain(endDate - Date.now());
          meta.insertAdjacentHTML("beforeend", `<span class="wb-badge ${rem.cls}">${rem.text}</span>`);
        } else if (endDate.getTime() > Date.now()) {
          meta.insertAdjacentHTML(
            "beforeend",
            `<span class="wb-chip">${wbFormatSubmittedRemain(endDate)}</span>`
          );
        }
        meta.insertAdjacentHTML("beforeend", `<span class="wb-deadline">截止 ${fmtDeadline(endDate, true)}</span>`);
      }
      const beginDate = parseDeadline(beginTimeStr);
      if (beginDate) {
        meta.insertAdjacentHTML("beforeend", `<span class="wb-chip">开始 ${fmtDeadline(beginDate)}</span>`);
      }
      const mode = pickModeName(d.assignmentType !== undefined ? d.assignmentType : task.assignmentType);
      if (mode) {
        meta.insertAdjacentHTML("beforeend", `<span class="wb-mode">${mode === "小组作业" ? "👥" : "👤"} ${mode}</span>`);
      }
      const fullScore = d.assignmentScore ?? d.fullScore ?? d.score;
      if (fullScore !== undefined && fullScore !== null && fullScore !== "") {
        meta.insertAdjacentHTML("beforeend", `<span class="wb-chip">满分 ${escapeHtml(fullScore)}</span>`);
      }
      if (Number(d.isOpenEvaluation) === 1) {
        meta.insertAdjacentHTML("beforeend", `<span class="wb-chip">支持互评</span>`);
      }
      hero.appendChild(meta);

      const stat = normalizeStat(d.totalNum, d.noSubmitNum);
      if (stat) {
        const pct = Math.round((stat.submitted / stat.total) * 100);
        hero.insertAdjacentHTML(
          "beforeend",
          `<div class="wb-progress-wrap">
            <div class="wb-progress-head">
              <span>班级提交进度（${stat.submitted} / ${stat.total} 人）</span>
              <span class="wb-progress-pct">${pct}%</span>
            </div>
            <div class="wb-progress-track"><div class="wb-progress-fill" style="width:${pct}%"></div></div>
          </div>`
        );
      }
      inner.appendChild(hero);

      // 我的提交与批改卡片（来自 /ykt-site/work/submit-view，无数据时静默跳过）
      if (sub) {
        const subSt = wbParseWorkStatus(sub);
        const subScore = sub.assignmentScore;
        const groupScore = sub.groupScore;
        const hasScore = subScore !== undefined && subScore !== null && subScore !== "";
        const hasGroupScore = groupScore !== undefined && groupScore !== null && groupScore !== "";
        const hasComment = !!(sub.assignmentComment && String(sub.assignmentComment).trim());
        const hasContent = !!(sub.assignmentContent && String(sub.assignmentContent).trim());
        const attIds = Array.isArray(sub.attachmentIds) ? sub.attachmentIds.filter(Boolean) : [];
        if (
          subSt === 0 ||
          subSt === 1 ||
          subSt === 2 ||
          hasScore ||
          hasComment ||
          hasContent ||
          attIds.length
        ) {
          const subCard = document.createElement("div");
          subCard.className = "wb-detail-card";
          const cardTitle = subSt === 1 || hasScore || hasComment ? "我的提交与批改" : "我的提交";
          subCard.innerHTML = `<div class="wb-section-title">${cardTitle}</div>`;

          const summary = document.createElement("div");
          summary.className = "wb-sub-summary";
          if (workStatus) {
            summary.insertAdjacentHTML(
              "beforeend",
              `<span class="wb-status-chip ${workStatus.cls}">${escapeHtml(workStatus.text)}</span>`
            );
          }
          if (hasScore) {
            summary.insertAdjacentHTML("beforeend", `<span class="wb-score-pill">教师打分 ${escapeHtml(subScore)} 分</span>`);
          }
          if (hasGroupScore && String(groupScore) !== String(subScore)) {
            summary.insertAdjacentHTML("beforeend", `<span class="wb-chip">小组得分 ${escapeHtml(groupScore)} 分</span>`);
          }
          const subTimeDate = parseDeadline(sub.submitTime || task.submitTime);
          if (subTimeDate) {
            summary.insertAdjacentHTML("beforeend", `<span class="wb-chip">提交于 ${fmtDeadline(subTimeDate)}</span>`);
          }
          if (summary.children.length) subCard.appendChild(summary);

          if (hasComment) {
            const cBlock = document.createElement("div");
            cBlock.className = "wb-sub-block";
            cBlock.innerHTML =
              `<div class="wb-sub-label">${subSt === 2 ? "驳回原因" : "教师评语"}</div>` +
              `<div class="wb-comment-box${subSt === 2 ? " rejected" : ""}"><div class="wb-rich-body"></div></div>`;
            wbRenderSafeHtml(cBlock.querySelector(".wb-rich-body"), sub.assignmentComment);
            subCard.appendChild(cBlock);
          }

          if (hasContent) {
            const tBlock = document.createElement("div");
            tBlock.className = "wb-sub-block";
            tBlock.innerHTML = '<div class="wb-sub-label">提交正文</div><div class="wb-rich-body"></div>';
            wbRenderSafeHtml(tBlock.querySelector(".wb-rich-body"), sub.assignmentContent);
            subCard.appendChild(tBlock);
          }

          if (attIds.length) {
            const aBlock = document.createElement("div");
            aBlock.className = "wb-sub-block";
            aBlock.innerHTML =
              `<div class="wb-sub-label">已提交附件（${attIds.length}）</div>` +
              '<div class="wb-attach-list"><div class="wb-rich-empty">加载附件信息中…</div></div>';
            subCard.appendChild(aBlock);
            const listHost = aBlock.querySelector(".wb-attach-list");
            getUploadFilesByIds(attIds)
              .then((files) => {
                if (!listHost.isConnected) return;
                listHost.innerHTML = "";
                if (!files.length) {
                  listHost.innerHTML = '<div class="wb-rich-empty">暂无可预览的已提交附件</div>';
                  return;
                }
                files.forEach((f) => listHost.appendChild(wbCreateAttachmentRow(f, "已提交附件")));
              })
              .catch(() => {
                if (listHost.isConnected) {
                  listHost.innerHTML = '<div class="wb-rich-empty">已提交附件加载失败，请点击右上角前往原页查看</div>';
                }
              });
          }

          inner.appendChild(subCard);
        }
      }

      // 作业要求卡片
      const reqCard = document.createElement("div");
      reqCard.className = "wb-detail-card";
      reqCard.innerHTML = '<div class="wb-section-title">作业要求</div><div class="wb-rich-body"></div>';
      const rawContent = d.assignmentContent || d.content || d.assignmentRequirement || "";
      wbRenderSafeHtml(reqCard.querySelector(".wb-rich-body"), rawContent);
      inner.appendChild(reqCard);

      // 作业附件卡片
      const resources = Array.isArray(d.assignmentResource) ? d.assignmentResource : [];
      if (resources.length) {
        const attachCard = document.createElement("div");
        attachCard.className = "wb-detail-card";
        attachCard.innerHTML = `<div class="wb-section-title">作业附件（${resources.length}）</div><div class="wb-attach-list"></div>`;
        const listEl = attachCard.querySelector(".wb-attach-list");
        resources.forEach((res) => listEl.appendChild(wbCreateAttachmentRow(res, "未命名附件")));
        inner.appendChild(attachCard);
      }
    } catch (e) {
      pane.innerHTML =
        `<div class="wb-inner"><div class="wb-detail-bar">` +
        `<button class="wb-back-btn">${WB_ICONS.back}<span>${backLabel}</span></button>` +
        `<button class="wb-primary-btn"><span>打开原页面</span>${WB_ICONS.external}</button>` +
        `</div>${wbEmptyHtml("加载作业详情失败，请重试或直接打开原页面")}</div>`;
      pane.querySelector(".wb-back-btn")?.addEventListener("click", () => wbSwitchTab(returnTab));
      pane.querySelector(".wb-primary-btn")?.addEventListener("click", () => {
        wbClose();
        openTaskUrl(nativeUrl);
      });
    }
  }

  function wbCollectResourceGroups(tree) {
    const groups = [];
    const walk = (nodes, pathPrefix) => {
      if (!Array.isArray(nodes)) return;
      nodes.forEach((node) => {
        const nodeTitle = (node.resourceName || node.name || "").trim();
        const label = pathPrefix && nodeTitle ? `${pathPrefix} / ${nodeTitle}` : nodeTitle || pathPrefix;
        const files = [];
        if (Array.isArray(node.attachmentVOs)) {
          node.attachmentVOs.forEach((att) => {
            if (att.type !== 2 && att.resource) {
              files.push({
                resourceId: att.resource.id || att.resource.resourceId,
                resourceName: att.resource.name || att.resource.resourceName || "未命名文件",
              });
            }
          });
        }
        if (files.length) {
          groups.push({ title: label || "课程资源", files });
        }
        if (Array.isArray(node.children) && node.children.length) {
          walk(node.children, label);
        }
      });
    };
    walk(tree, "");
    return groups;
  }

  function wbParseWorkStatus(work) {
    const raw = work && work.assignmentStatus;
    if (raw === undefined || raw === null || raw === "") return NaN;
    return Number(raw);
  }

  // 平台 /ykt-site/work/student/list 的 assignmentStatus 枚举：
  // 99 = 未提交，0 = 已提交（待批改），1 = 已批改，2 = 已驳回
  function wbIsWorkPending(work) {
    const st = wbParseWorkStatus(work);
    return st === 99 || st === 2;
  }

  function wbIsWorkSubmittedActive(work, nowMs = Date.now()) {
    const st = wbParseWorkStatus(work);
    if (st !== 0 && st !== 1) return false;
    const endDate = parseDeadline(work.assignmentEndTime || work.endTime);
    return !!(endDate && endDate.getTime() > nowMs);
  }

  function wbPickWorkStatus(work) {
    const st = wbParseWorkStatus(work);
    const score = work.assignmentScore ?? work.score;
    if (st === 1) {
      const scoreText =
        score !== undefined && score !== null && score !== "" ? `已批改 · ${score} 分` : "已批改";
      return { cls: "graded", text: scoreText };
    }
    if (st === 0) return { cls: "submitted", text: "已提交" };
    if (st === 2) return { cls: "rejected", text: "已驳回" };
    if (st === 99) return { cls: "unsubmitted", text: "未提交" };
    return null;
  }

  async function wbOpenCourseView(course, initialSubTab = "resource") {
    if (!wbRoot || !course || !course.id) return;
    wbSaveCurrentScroll();
    wbCancelCourseDownload();
    wbState.courseView = { course, subTab: initialSubTab };
    wbState.detail = null;
    wbState.tab = "courseView";
    wbUpdateTabs();
    const pane = wbRoot.querySelector('[data-pane="courseView"]');
    const bodyEl = wbRoot.querySelector(".wb-body");
    if (bodyEl) bodyEl.scrollTop = 0;
    pane.innerHTML = wbSkeletonHtml("todo");

    const siteId = course.id;
    try {
      const [tree, worksRecords, exams] = await Promise.all([
        getSiteResourceTree(siteId).catch(() => []),
        fetchCourseWorks(siteId).catch(() => []),
        getExams(siteId).catch(() => []),
      ]);
      if (
        wbState.tab !== "courseView" ||
        !wbState.courseView ||
        wbState.courseView.course.id !== siteId
      ) {
        return;
      }

      const groups = wbCollectResourceGroups(tree);
      const allFiles = groups.flatMap((g) => g.files);
      const works = (Array.isArray(worksRecords) ? worksRecords : []).slice().sort((a, b) => {
        const sa = wbIsWorkPending(a) ? 0 : 1;
        const sb = wbIsWorkPending(b) ? 0 : 1;
        if (sa !== sb) return sa - sb;
        const ta = parseDeadline(a.assignmentEndTime || a.endTime)?.getTime() || 0;
        const tb = parseDeadline(b.assignmentEndTime || b.endTime)?.getTime() || 0;
        return tb - ta;
      });
      const examList = Array.isArray(exams) ? exams : [];

      pane.innerHTML = "";
      const inner = document.createElement("div");
      inner.className = "wb-inner";
      pane.appendChild(inner);

      // 顶部操作条
      const bar = document.createElement("div");
      bar.className = "wb-detail-bar";
      bar.innerHTML =
        `<button class="wb-back-btn">${WB_ICONS.back}<span>返回课程</span></button>` +
        `<button class="wb-primary-btn"><span>打开原课程主页</span>${WB_ICONS.external}</button>`;
      bar.querySelector(".wb-back-btn").addEventListener("click", () => wbSwitchTab("course"));
      bar.querySelector(".wb-primary-btn").addEventListener("click", () => {
        wbClose();
        openCoursePage(course);
      });
      inner.appendChild(bar);

      // 课程概览头部卡片
      const titleText = course.name || "未命名课程";
      const tone = WB_COURSE_PALETTE[wbPickCourseTone(titleText)];
      const hero = document.createElement("div");
      hero.className = "wb-course-hero";
      hero.innerHTML =
        '<div class="wb-course-hero-avatar"></div>' +
        '<div class="wb-course-hero-info"><div class="wb-course-hero-title"></div><div class="wb-course-hero-meta"></div></div>';
      const avatar = hero.querySelector(".wb-course-hero-avatar");
      avatar.textContent = titleText.trim().charAt(0) || "课";
      avatar.style.setProperty("--tone-bg-l", tone[0]);
      avatar.style.setProperty("--tone-fg-l", tone[1]);
      avatar.style.setProperty("--tone-bg-d", tone[2]);
      avatar.style.setProperty("--tone-fg-d", tone[3]);
      hero.querySelector(".wb-course-hero-title").textContent = titleText;
      hero.querySelector(".wb-course-hero-meta").textContent =
        [course.teachers, course.department].filter(Boolean).join(" · ") || "课程空间";
      inner.appendChild(hero);

      // 子页签栏
      const subBar = document.createElement("div");
      subBar.className = "wb-subtabs-bar";
      subBar.innerHTML = `
        <div class="wb-subtabs">
          <button class="wb-subtab" data-sub="resource">课件资源<span class="wb-subtab-num">${allFiles.length}</span></button>
          <button class="wb-subtab" data-sub="work">课程作业<span class="wb-subtab-num">${works.length}</span></button>
          <button class="wb-subtab" data-sub="exam">课程测试<span class="wb-subtab-num">${examList.length}</span></button>
        </div>`;
      inner.appendChild(subBar);

      const subRes = document.createElement("div");
      const subWork = document.createElement("div");
      const subExam = document.createElement("div");
      inner.appendChild(subRes);
      inner.appendChild(subWork);
      inner.appendChild(subExam);

      const switchSub = (sub) => {
        if (wbState.courseView) wbState.courseView.subTab = sub;
        subBar.querySelectorAll(".wb-subtab").forEach((b) => {
          b.classList.toggle("active", b.dataset.sub === sub);
        });
        subRes.hidden = sub !== "resource";
        subWork.hidden = sub !== "work";
        subExam.hidden = sub !== "exam";
      };
      subBar.querySelectorAll(".wb-subtab").forEach((b) => {
        b.addEventListener("click", () => switchSub(b.dataset.sub));
      });

      // 子页签 1：课件资源
      if (!allFiles.length) {
        subRes.innerHTML = wbEmptyHtml("本课程暂无课件资源");
      } else {
        const resBar = document.createElement("div");
        resBar.className = "wb-res-toolbar";
        resBar.innerHTML =
          `<div class="wb-search-wrap"><span class="wb-search-icon">${WB_ICONS.search}</span>` +
          '<input class="wb-search" placeholder="搜索课件文件名 / 章节"></div>' +
          `<button class="wb-primary-btn wb-batch-dl">${WB_ICONS.download}<span>全部下载 (${allFiles.length})</span></button>`;
        subRes.appendChild(resBar);

        const resSearch = resBar.querySelector(".wb-search");
        const batchBtn = resBar.querySelector(".wb-batch-dl");
        const batchSpan = batchBtn.querySelector("span");
        const runBatchDownload = async (files, spanEl, idleText) => {
          if (wbActiveCourseDownload && wbActiveCourseDownload.spanEl === spanEl) {
            wbCancelCourseDownload();
            spanEl.textContent = idleText;
            return;
          }
          if (wbActiveCourseDownload) {
            const prev = wbActiveCourseDownload;
            wbCancelCourseDownload();
            if (prev.spanEl && prev.spanEl.isConnected) prev.spanEl.textContent = prev.idleText;
          }
          const job = { cancelled: false, spanEl, idleText };
          wbActiveCourseDownload = job;
          for (let i = 0; i < files.length; i++) {
            if (job.cancelled) break;
            const f = files[i];
            if (spanEl.isConnected) spanEl.textContent = `取消下载 (${i + 1}/${files.length})`;
            try {
              const url = await getPreviewURL(f.resourceId);
              if (job.cancelled) break;
              await downloadFile(
                url,
                f.resourceName,
                () => job.cancelled,
                (pct) => {
                  if (!job.cancelled && spanEl.isConnected) {
                    spanEl.textContent =
                      pct === null
                        ? `取消下载 (${i + 1}/${files.length})`
                        : `取消下载 (${i + 1}/${files.length} · ${pct}%)`;
                  }
                }
              );
            } catch (e) {
              console.warn("[ucloud-Enhanced] 批量下载单文件失败:", f.resourceName, e);
            }
          }
          if (wbActiveCourseDownload === job) wbActiveCourseDownload = null;
          if (spanEl.isConnected) spanEl.textContent = idleText;
        };
        batchBtn.addEventListener("click", () =>
          runBatchDownload(allFiles, batchSpan, `全部下载 (${allFiles.length})`)
        );

        const groupsHost = document.createElement("div");
        subRes.appendChild(groupsHost);
        const resEmptyTip = document.createElement("div");
        resEmptyTip.innerHTML = wbEmptyHtml("未找到匹配的课件资源");
        resEmptyTip.hidden = true;
        subRes.appendChild(resEmptyTip);

        // 一次性创建分组与文件行 DOM，搜索时仅切换 hidden，保留正在进行的单文件/分组下载进度与取消按钮
        const renderedGroups = groups.map((g) => {
          const box = document.createElement("div");
          box.className = "wb-res-group";
          box.innerHTML =
            '<div class="wb-res-group-title">' +
            '<span class="wb-gt"></span>' +
            '<div class="wb-res-group-actions">' +
            '<span class="wb-gc"></span>' +
            `<button class="wb-ghost-btn wb-group-dl-btn" type="button">${WB_ICONS.download}<span>下载本组</span></button>` +
            "</div></div>" +
            '<div class="wb-attach-list"></div>';
          box.querySelector(".wb-gt").textContent = g.title;
          const gcEl = box.querySelector(".wb-gc");
          gcEl.textContent = `${g.files.length} 个文件`;
          const grpBtn = box.querySelector(".wb-group-dl-btn");
          const grpSpan = grpBtn.querySelector("span");
          const listEl = box.querySelector(".wb-attach-list");

          const rows = g.files.map((res) => {
            const row = wbCreateAttachmentRow(res, "未命名文件");
            listEl.appendChild(row);
            return { row, res, nameLower: String(res.resourceName || "").toLowerCase() };
          });
          grpBtn.addEventListener("click", () => {
            const visibleFiles = rows.filter((r) => !r.row.hidden).map((r) => r.res);
            runBatchDownload(visibleFiles.length ? visibleFiles : g.files, grpSpan, "下载本组");
          });
          groupsHost.appendChild(box);
          return { box, titleLower: String(g.title || "").toLowerCase(), gcEl, rows };
        });

        const filterResourceGroups = (kw) => {
          const q = (kw || "").toLowerCase();
          let renderedCount = 0;
          renderedGroups.forEach(({ box, titleLower, gcEl, rows }) => {
            const groupMatched = !q || titleLower.includes(q);
            let groupVisible = 0;
            rows.forEach(({ row, nameLower }) => {
              const show = groupMatched || nameLower.includes(q);
              row.hidden = !show;
              if (show) groupVisible++;
            });
            box.hidden = groupVisible === 0;
            if (groupVisible > 0) {
              gcEl.textContent = `${groupVisible} 个文件`;
              renderedCount += groupVisible;
            }
          });
          resEmptyTip.hidden = renderedCount > 0;
        };
        resSearch.addEventListener("input", () => filterResourceGroups(resSearch.value.trim()));
      }

      // 子页签 2：课程作业
      if (!works.length) {
        subWork.innerHTML = wbEmptyHtml("本课程暂无作业");
      } else {
        works.forEach((work) => {
          const card = document.createElement("div");
          card.className = "wb-card";
          const endStr = work.assignmentEndTime || work.endTime;
          const endDate = parseDeadline(endStr);
          const status = wbPickWorkStatus(work);
          const isPending = wbIsWorkPending(work);
          if (endDate && isPending) {
            card.dataset.urgency = formatRemain(endDate - Date.now()).cls;
          } else {
            card.dataset.urgency = "later";
          }
          card.innerHTML =
            '<div class="wb-card-head"><div class="wb-card-title"></div><div class="wb-card-tags"></div></div>' +
            '<div class="wb-meta"></div>';
          card.querySelector(".wb-card-title").textContent =
            work.assignmentTitle || work.activityName || "未命名作业";
          const tags = card.querySelector(".wb-card-tags");
          const meta = card.querySelector(".wb-meta");
          if (endDate) {
            tags.insertAdjacentHTML("beforeend", `<span class="wb-deadline">截止 ${fmtDeadline(endDate, true)}</span>`);
          }
          const mode = pickModeName(work.assignmentType);
          if (mode) {
            tags.insertAdjacentHTML(
              "beforeend",
              `<span class="wb-mode">${mode === "小组作业" ? "👥" : "👤"} ${mode}</span>`
            );
          }
          if (status) {
            meta.insertAdjacentHTML(
              "beforeend",
              `<span class="wb-status-chip ${status.cls}">${escapeHtml(status.text)}</span>`
            );
          }
          if (endDate && isPending) {
            const rem = formatRemain(endDate - Date.now());
            meta.insertAdjacentHTML("beforeend", `<span class="wb-badge ${rem.cls}">${rem.text}</span>`);
          }
          if (work.chapterName) {
            meta.insertAdjacentHTML("beforeend", `<span class="wb-chip">${escapeHtml(work.chapterName)}</span>`);
          }
          card.addEventListener("click", () => {
            const taskObj = Object.assign({}, work, {
              activityId: work.id || work.activityId,
              activityName: work.assignmentTitle || work.activityName,
              endTime: endStr,
              type: 3,
            });
            wbOpenAssignmentDetail(taskObj, course, "courseView");
          });
          subWork.appendChild(card);
        });
      }

      // 子页签 3：课程测试
      if (!examList.length) {
        subExam.innerHTML = wbEmptyHtml("本课程暂无测试");
      } else {
        examList.forEach((exam) => {
          const card = document.createElement("div");
          card.className = "wb-card";
          card.dataset.urgency = "later";
          const endStr = exam.endTime || exam.examEndTime;
          const endDate = parseDeadline(endStr);
          card.innerHTML =
            '<div class="wb-card-head"><div class="wb-card-title"></div><div class="wb-card-tags"></div></div>' +
            '<div class="wb-meta"></div>';
          card.querySelector(".wb-card-title").textContent =
            exam.examName || exam.title || exam.name || "未命名测试";
          const tags = card.querySelector(".wb-card-tags");
          const meta = card.querySelector(".wb-meta");
          const hasScore = exam.score !== undefined && exam.score !== null && exam.score !== "";
          if (endDate) {
            tags.insertAdjacentHTML("beforeend", `<span class="wb-deadline">截止 ${fmtDeadline(endDate, true)}</span>`);
            if (!hasScore) {
              const rem = formatRemain(endDate - Date.now());
              if (rem.cls !== "overdue") {
                card.dataset.urgency = rem.cls;
                meta.insertAdjacentHTML("beforeend", `<span class="wb-badge ${rem.cls}">${rem.text}</span>`);
              }
            }
          }
          tags.insertAdjacentHTML("beforeend", '<span class="wb-mode">📝 测试</span>');
          if (hasScore) {
            meta.insertAdjacentHTML(
              "beforeend",
              `<span class="wb-status-chip graded">得分 ${escapeHtml(exam.score)}</span>`
            );
          }
          card.addEventListener("click", () => {
            const examId = exam.id || exam.examId || exam.activityId;
            if (!examId) return;
            wbClose();
            openTaskUrl("course.html#/answer?id=" + encodeURIComponent(examId));
          });
          subExam.appendChild(card);
        });
      }

      switchSub(initialSubTab);
    } catch (e) {
      pane.innerHTML =
        `<div class="wb-inner"><div class="wb-detail-bar">` +
        `<button class="wb-back-btn">${WB_ICONS.back}<span>返回课程</span></button>` +
        `<button class="wb-primary-btn"><span>打开原课程主页</span>${WB_ICONS.external}</button>` +
        `</div>${wbEmptyHtml("加载课程空间失败，请重试或直接打开原课程主页")}</div>`;
      pane.querySelector(".wb-back-btn")?.addEventListener("click", () => wbSwitchTab("course"));
      pane.querySelector(".wb-primary-btn")?.addEventListener("click", () => {
        wbClose();
        openCoursePage(course);
      });
    }
  }

  function isHomePage() {
    const href = location.href;
    return (
      href.indexOf("/uclass/#/student/homePage") >= 0 ||
      href.indexOf("/uclass/index.html#/student/homePage") >= 0 ||
      href.indexOf("/uclass/#/teacher/homePage") >= 0 ||
      href.indexOf("/uclass/index.html#/teacher/homePage") >= 0
    );
  }

  function setupWorkbench() {
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        const settingsEl = document.getElementById("yzHelper-settings");
        if (settingsEl && settingsEl.classList.contains("visible")) {
          toggleSettingsPanel();
          return;
        }
      }
      if (!wbState.open) return;
      if (e.key === "Escape") {
        if (wbState.tab === "detail" && wbState.detail) {
          wbSwitchTab(wbState.detail.returnTab || "todo");
        } else if (wbState.tab === "courseView") {
          wbSwitchTab("course");
        } else {
          wbClose();
        }
        return;
      }
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const activeTarget = (typeof e.composedPath === "function" && e.composedPath()[0]) || e.target;
      const tag = activeTarget && activeTarget.tagName ? activeTarget.tagName.toUpperCase() : "";
      if (tag === "INPUT" || tag === "TEXTAREA" || (activeTarget && activeTarget.isContentEditable)) {
        return;
      }
      if (e.key === "/") {
        const activePane = wbRoot && wbRoot.querySelector(`.wb-pane[data-pane="${wbState.tab}"]`);
        const searchInput = activePane && activePane.querySelector(".wb-search");
        if (searchInput && searchInput.offsetParent !== null) {
          e.preventDefault();
          searchInput.focus();
          searchInput.select();
        }
      } else if (e.key === "1") {
        wbSwitchTab("todo");
      } else if (e.key === "2") {
        wbSwitchTab("course");
      } else if (e.key === "3") {
        wbSwitchTab("notice");
      }
    });
    const autoOpen = () => {
      if (settings.workbench.autoOpen && isHomePage()) {
        setTimeout(() => {
          if (isHomePage()) wbOpen("todo");
        }, 800);
      }
    };
    if (document.readyState === "complete") autoOpen();
    else window.addEventListener("load", autoOpen, { once: true });
    // 从主页跳转到其它页面时关闭工作台，避免遮挡内容
    window.addEventListener("hashchange", () => {
      if (wbState.open && !isHomePage()) wbClose();
    });
  }


  applyDarkMode();
  // 跟随系统深色外观的变化即时切换（无需刷新）
  if (darkMediaQuery && darkMediaQuery.addEventListener) {
    darkMediaQuery.addEventListener("change", () => applyDarkMode());
  }

  // ========== [MODULE: 30-page-mods.js] 原页面注入与改版（主页 / 详情页 / 课程资源 / 通知页 / 入口） ==========

  // 仅注入课程名（不改版待办，供“待办显示所属课程”开关使用）
  function queryTodoCardNodes() {
    let nodes = Array.from(
      document.querySelectorAll(".in-progress-section .in-progress-body .in-progress-item")
    );
    if (!nodes.length) {
      nodes = $x(
        '//*[@id="layout-container"]/div[2]/div[2]/div/div[2]/div[1]/div[3]/div[2]/div/div'
      );
    }
    return nodes;
  }

  async function injectTodoCourseNames(list) {
    if (!list || !list.length) return;
    const ids = list.map((x) => x.activityId).filter(Boolean);
    if (!ids.length) return;
    let infos = {};
    try {
      infos = await searchCourses(ids);
    } catch (e) {
      return;
    }
    let nodes = queryTodoCardNodes();
    if (!nodes.length) {
      // 命中本地课程缓存时可能快于平台 Vue 渲染，等待待办卡片挂载后再注入
      nodes =
        (await wait(() => {
          const cur = queryTodoCardNodes();
          return cur.length ? cur : null;
        }, 8000, 150)) || [];
    }
    if (!nodes.length) return;
    const byTitle = new Map();
    list.forEach((task) => {
      const title = (task.activityName || "").trim();
      if (title && !byTitle.has(title)) byTitle.set(title, task);
    });
    nodes.forEach((node) => {
      const titleEl = node.querySelector(".activity-title");
      const title = titleEl ? (titleEl.textContent || "").trim() : "";
      const task = byTitle.get(title);
      const info = task && infos[task.activityId];
      const host = node.children && node.children[1];
      node.dataset.yzCourseDone = "1";
      if (!host || !info) return;
      let el = host.querySelector(".yz-course-line");
      if (!el) {
        el = document.createElement("div");
        el.className = "yz-course-line";
        host.insertAdjacentElement("afterbegin", el);
      }
      el.textContent = info.name + "(" + info.teachers + ")";
    });
  }

  // 更新待办显示：保持平台原结构，按需注入所属课程名
  async function updateAssignmentDisplay(list) {
    if (!list || list.length === 0) return;
    if (settings.home.showTodoCourseName) injectTodoCourseNames(list);
  }

  // XPath选择器
  function $x(xpath, context = document) {
    const iterator = document.evaluate(
      xpath,
      context,
      null,
      XPathResult.ANY_TYPE,
      null
    );
    const results = [];
    let item;
    while ((item = iterator.iterateNext())) {
      results.push(item);
    }
    return results;
  }

  // 本地存储（容量上限 300 条 + 剔除大体积 raw 字段 + 异常容错）
  // 插入课程信息
  function insert(x, retry) {
    if (!x) return;
    const attempt = retry || 0;
    // 仅在「作业信息」Tab 存在时注入，避免切到「我的作业」时插错位置
    if (!document.getElementById("assignment-info")) {
      if (attempt < 40) setTimeout(() => insert(x, attempt + 1), 50);
      return;
    }
    let d = $x(
      "/html/body/div[1]/div/div[2]/div[2]/div/div/div[2]/div/div[2]/div[1]/div/div/div[1]/div/p[1]"
    );
    if (!d.length) {
      const firstP = document.querySelector("#assignment-info p");
      if (firstP) d = [firstP];
    }
    if (!d.length) {
      if (attempt < 40) setTimeout(() => insert(x, attempt + 1), 50);
      return;
    }
    // 检查是否已经插入过
    const existingText = Array.from(d[0].parentNode.childNodes).some(
      (node) => node.textContent && node.textContent.includes(x.name)
    );

    if (!existingText) {
      const p = document.createElement("p");
      p.className = "yz-course-wrap";
      const label = x.name + (x.teachers ? " · " + x.teachers : "");
      // 有课程 ID 时渲染成现代风可点击胶囊，复用课程主页跳转逻辑；
      // 早期版本缓存下来的无 ID 记录仍按静态胶囊显示，避免点击无响应
      const badge = document.createElement("span");
      badge.className = x.id ? "yz-course-link" : "yz-course-link is-static";
      badge.innerHTML =
        '<svg class="yz-course-ico" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>' +
        '<span class="yz-course-text"></span>' +
        (x.id
          ? '<svg class="yz-course-arr" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>'
          : "");
      badge.querySelector(".yz-course-text").textContent = label;
      if (x.id) {
        badge.title = "点击进入课程主页";
        badge.addEventListener("click", (e) => {
          e.preventDefault();
          e.stopPropagation();
          openCoursePage(x);
        });
      }
      p.appendChild(badge);
      d[0].after(p);
    }
  }

  // 作业详情页切换 Tab 后 DOM 会重绘，需要重新注入课程名
  let yzAssignmentCourse = null;
  let yzAssignmentObserver = null;
  let yzAssignmentTimer = null;
  let yzAssignmentClickBound = false;

  function watchAssignmentCourse(course) {
    if (!course) return;
    yzAssignmentCourse = course;
    const tryInsert = () => {
      if (!yzAssignmentCourse) return;
      if (
        !location.href.startsWith(
          "https://ucloud.bupt.edu.cn/uclass/course.html#/student/assignmentDetails_fullpage"
        )
      )
        return;
      insert(yzAssignmentCourse);
    };
    if (!yzAssignmentObserver) {
      yzAssignmentObserver = new MutationObserver(() => {
        clearTimeout(yzAssignmentTimer);
        yzAssignmentTimer = setTimeout(tryInsert, 150);
      });
    }
    const startObserve = () => {
      if (
        !location.href.startsWith(
          "https://ucloud.bupt.edu.cn/uclass/course.html#/student/assignmentDetails_fullpage"
        )
      )
        return;
      const root = document.getElementById("assignment-details");
      if (!root) {
        setTimeout(startObserve, 300);
        return;
      }
      try {
        yzAssignmentObserver.disconnect();
      } catch (e) {}
      yzAssignmentObserver.observe(root, { childList: true, subtree: true });
    };
    startObserve();
    if (!yzAssignmentClickBound) {
      yzAssignmentClickBound = true;
      document.addEventListener(
        "click",
        (e) => {
          if (e.target && e.target.closest && e.target.closest(".details-tabs")) {
            setTimeout(tryInsert, 250);
            setTimeout(tryInsert, 700);
          }
        },
        true
      );
    }
  }

  // 辅助函数
  function sleep(n) {
    return new Promise((res) => setTimeout(res, n));
  }

  async function wait(func, timeout = 15000, interval = 50) {
    const deadline = Date.now() + timeout;
    while (Date.now() < deadline) {
      let r = func();
      if (r instanceof Promise) r = await r;
      if (r) return r;
      await sleep(interval);
    }
    return null;
  }

  // 启用文本选择、页面美化与按需功能样式（合并为单次 GM_addStyle 注入）
  function addFunctionalCSS() {
    const cssParts = [
      `
      .teacher-home-page .home-left-container .in-progress-section .in-progress-body .in-progress-item .activity-box .activity-title {
        height: auto !important;
      }
      #layout-container > div.main-content > div.router-container > div > div.my-course-page {
        max-height: none !important;
      }
      .yz-course-line {
        font-size: 12px;
        line-height: 16px;
        font-weight: 600;
        color: #0066cc;
      }
      .main-content .router-container .menu-nav,
      .main-content .router-container .menu-nav .el-menu {
        border-radius: 20px !important;
        overflow: hidden;
      }
      /* 作业详情页轻量现代风抛光（仅皮肤层，不触碰表单与编辑器结构） */
      #assignment-details {
        border-radius: 20px !important;
        overflow: hidden;
        box-shadow: 0 8px 28px rgba(15, 23, 42, 0.06) !important;
        border: 1px solid rgba(15, 23, 42, 0.07) !important;
      }
      html.ue-dark-mode #assignment-details {
        box-shadow: 0 12px 36px rgba(0, 0, 0, 0.35) !important;
        border-color: rgba(255, 255, 255, 0.08) !important;
      }
      #assignment-info,
      .assignment-content,
      .assignment-info,
      .assignment-detail-wrap,
      .details-tabs {
        border-radius: 20px !important;
      }
      #assignment-details .el-tabs__item {
        font-weight: 500;
        transition: color 0.16s ease;
      }
      #assignment-details .el-tabs__item.is-active {
        color: #2962ff !important;
        font-weight: 600;
      }
      html.ue-dark-mode #assignment-details .el-tabs__item.is-active {
        color: #93c5fd !important;
      }
      #assignment-details .el-tabs__active-bar {
        background-color: #2962ff !important;
        height: 3px !important;
        border-radius: 3px !important;
      }
      html.ue-dark-mode #assignment-details .el-tabs__active-bar {
        background-color: #60a5fa !important;
      }
      #assignment-details .el-button {
        border-radius: 10px !important;
        transition: transform 0.15s ease, box-shadow 0.15s ease, background-color 0.15s ease;
      }
      #assignment-details .el-button--primary {
        background-color: #2962ff !important;
        border-color: #2962ff !important;
      }
      #assignment-details .el-button--primary:hover {
        background-color: #1f4fe0 !important;
        border-color: #1f4fe0 !important;
        box-shadow: 0 4px 12px rgba(41, 98, 255, 0.28);
      }
      #assignment-info .by-icon-eye-grey,
      #assignment-info .by-icon-yundown-grey {
        cursor: pointer;
        border-radius: 8px;
        transition: opacity 0.15s ease, transform 0.15s ease;
      }
      #assignment-info .by-icon-eye-grey:hover,
      #assignment-info .by-icon-yundown-grey:hover {
        opacity: 0.85;
        transform: scale(1.08);
      }
      html.ue-dark-mode #assignment-details .info-item,
      html.ue-dark-mode #assignment-details .filed-wrap,
      html.ue-dark-mode #assignment-details .header,
      html.ue-dark-mode #assignment-details .el-tabs__item {
        border-color: rgba(255, 255, 255, 0.12) !important;
      }
      html.ue-dark-mode #assignment-details .el-tabs__nav-wrap::after {
        background-color: rgba(255, 255, 255, 0.12) !important;
      }
      /* 课程资源页轻量现代风抛光 */
      .resource-item {
        border-radius: 12px !important;
        transition: background-color 0.16s ease, box-shadow 0.16s ease, transform 0.16s ease;
      }
      .resource-item:hover {
        box-shadow: 0 4px 14px rgba(15, 23, 42, 0.06);
      }
      html.ue-dark-mode .resource-item:hover {
        box-shadow: 0 4px 16px rgba(0, 0, 0, 0.28);
      }
      #downloadAllButton {
        border: none !important;
        border-radius: 10px !important;
        padding: 9px 18px !important;
        font-size: 13px !important;
        font-weight: 600 !important;
        background: linear-gradient(135deg, #3d7bff, #2962ff) !important;
        color: #ffffff !important;
        box-shadow: 0 4px 12px rgba(41, 98, 255, 0.28) !important;
        transition: transform 0.15s ease, box-shadow 0.15s ease, filter 0.15s ease !important;
      }
      #downloadAllButton:hover {
        transform: translateY(-1px);
        box-shadow: 0 6px 18px rgba(41, 98, 255, 0.36) !important;
        filter: brightness(1.04);
      }
      /* 主页板块与卡片圆角统一 */
      .teacher-home-page .home-card {
        border-radius: 20px !important;
      }
      .teacher-home-page .home-left-container .my-lesson-section .my-lesson-body .my-lesson-banner .my-lesson-group .my-lesson-item,
      .teacher-home-page .home-left-container .in-progress-section .in-progress-body .in-progress-item,
      .teacher-home-page .home-right-container .my-need-section .my-need-body .my-need-item {
        border-radius: 16px !important;
      }
      .teacher-home-page .home-left-container .my-lesson-section .my-lesson-body .my-lesson-banner .my-lesson-group .my-lesson-item .my-lesson-post {
        border-radius: 12px !important;
      }
      `,
    ];

    if (settings.homework.showHomeworkSource) {
      cssParts.push(`
      .yz-course-wrap {
        margin: 8px 0 4px !important;
      }
      .yz-course-link {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 4px 12px;
        border-radius: 999px;
        font-size: 12.5px;
        font-weight: 600;
        line-height: 1.4;
        color: #2563eb;
        background: rgba(41, 98, 255, 0.09);
        border: 1px solid rgba(41, 98, 255, 0.2);
        cursor: pointer;
        transition: background 0.15s ease, border-color 0.15s ease, transform 0.15s ease;
      }
      .yz-course-link:hover {
        background: rgba(41, 98, 255, 0.15);
        border-color: rgba(41, 98, 255, 0.38);
        transform: translateY(-1px);
      }
      .yz-course-link.is-static {
        cursor: default;
      }
      .yz-course-link.is-static:hover {
        transform: none;
      }
      .yz-course-link .yz-course-ico,
      .yz-course-link .yz-course-arr {
        flex: none;
        opacity: 0.85;
      }
      html.ue-dark-mode .yz-course-link {
        color: #93c5fd;
        background: rgba(59, 130, 246, 0.18);
        border-color: rgba(96, 165, 250, 0.3);
      }
      html.ue-dark-mode .yz-course-link:hover {
        background: rgba(59, 130, 246, 0.26);
        border-color: rgba(96, 165, 250, 0.48);
      }
      `);
    }
    if (settings.system.unlockCopy) {
      cssParts.push(`
      .el-checkbox, .el-checkbox-button__inner, .el-empty__image img, .el-radio,
      div, span, p, a, h1, h2, h3, h4, h5, h6, li, td, th {
        -webkit-user-select: auto !important;
        -moz-user-select: auto !important;
        -ms-user-select: auto !important;
        user-select: auto !important;
      }
      `);
      document.addEventListener(
        "copy",
        function (e) {
          e.stopImmediatePropagation();
        },
        true
      );
      document.addEventListener(
        "selectstart",
        function (e) {
          e.stopImmediatePropagation();
        },
        true
      );
    }
    if (settings.home.useBiggerButton) {
      cssParts.push(`
      .teacher-home-page .home-left-container .my-lesson-section .my-lesson-header .header-control .banner-control-btn, .teacher-home-page .home-left-container .in-progress-section .in-progress-header .header-control .banner-control-btn {
        width: 60px !important;
        height: 30px !important;
        background: #f2f2f2 !important;
        line-height: auto !important;
      }
      .teacher-home-page .home-left-container .my-lesson-section .my-lesson-header .header-control .banner-control-btn span,.teacher-home-page .home-left-container .in-progress-section .in-progress-header .header-control .banner-control-btn span {
        font-size: 22px !important;
      }
      .el-icon-arrow-left, .el-icon-arrow-right {
        height: 100%;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      `);
    }
    GM_addStyle(cssParts.join("\n"));
  }

  let homePageObserver = null;

  // 主函数
  async function main() {
    const isStudentHome =
      location.href.startsWith(
        "https://ucloud.bupt.edu.cn/uclass/#/student/homePage"
      ) ||
      location.href.startsWith(
        "https://ucloud.bupt.edu.cn/uclass/index.html#/student/homePage"
      );
    const isAssignmentDetail = location.href.startsWith(
      "https://ucloud.bupt.edu.cn/uclass/course.html#/student/assignmentDetails_fullpage"
    );
    if (!isStudentHome && homePageObserver) {
      homePageObserver.disconnect();
      homePageObserver = null;
    }
    if (!isAssignmentDetail && yzAssignmentObserver) {
      yzAssignmentObserver.disconnect();
    }

    // 课件预览页面
    if (
      location.href.startsWith(
        "https://ucloud.bupt.edu.cn/uclass/course.html#/resourceLearn"
      )
    ) {
      if (settings.system.betterTitle) {
        function extractFilename(url) {
          try {
            const match = url.match(/previewUrl=([^&]+)/);
            if (!match) return null;

            const previewUrl = decodeURIComponent(match[1]);

            // 从content-disposition中提取文件名
            const filenameMatch = previewUrl.match(/filename%3D([^&]+)/);
            if (!filenameMatch) return null;

            return decodeURIComponent(decodeURIComponent(filenameMatch[1]));
          } catch (e) {
            return null;
          }
        }
        const url = location.href;
        const filename = extractFilename(url);
        const pageTitle = "[预览] " + (filename || "课件") + " - 教学云空间";
        document.title = pageTitle;
      }
      if (settings.preview.autoClosePopup) {
        const dialogBox = document.querySelector("div.el-message-box__wrapper");

        if (
          dialogBox &&
          window.getComputedStyle(dialogBox).display !== "none"
        ) {
          const messageElement = dialogBox.querySelector(
            ".el-message-box__message p"
          );
          if (
            messageElement &&
            (messageElement.textContent.includes("您正在学习其他课件") ||
              messageElement.textContent.includes("您已经在学习此课件了"))
          ) {
            const confirmButton = dialogBox.querySelector(
              ".el-button--primary"
            );
            if (confirmButton) {
              confirmButton.click();
            } else {
              console.warn("未找到确认按钮");
            }
          }
        }
      }
      if (settings.preview.hideTimer) {
        GM_addStyle(`
        .preview-container .time {
            display: none !important;
        }
      `);
      }
    }

    // 作业详情页面
    if (
      location.href.startsWith(
        "https://ucloud.bupt.edu.cn/uclass/course.html#/student/assignmentDetails_fullpage"
      )
    ) {
      const qIdx = location.href.indexOf("?");
      const q = new URLSearchParams(qIdx >= 0 ? location.href.slice(qIdx + 1) : "");
      const id = q.get("assignmentId");
      const r = get(id);
      const title = q.get("assignmentTitle");
      if (settings.system.betterTitle) {
        const pageTitle = "[作业] " + (title || "详情") + " - 教学云空间";
        document.title = pageTitle;
      }
      if (settings.homework.showHomeworkSource) {
        // 显示相关课程信息
        let courseForPage = null;
        if (r) {
          courseForPage = r;
          insert(r);
        } else {
          if (!id || !title) return;
          try {
            const courseInfo = await searchCourse(id, title);
            if (courseInfo) {
              courseForPage = courseInfo;
              insert(courseInfo);
              set(id, courseInfo);
            }
          } catch (e) {
            console.error("获取课程信息失败", e);
          }
        }
        if (courseForPage) watchAssignmentCourse(courseForPage);
      }

      // 处理资源预览和下载
      try {
        const detail = (await getDetail(id)).data;
        if (!detail || !detail.assignmentResource) return;

        const filenames = detail.assignmentResource.map((x) => x.resourceName);
        const urls = await Promise.all(
          detail.assignmentResource.map((x) => {
            return getPreviewURL(x.resourceId);
          })
        );

        const getAttachNodes = () =>
          $x('//*[@id="assignment-info"]/div[2]/div[2]/div[2]/div');
        const attachNodes = await wait(() => {
          const list = getAttachNodes();
          return list.length > 0 ? list : null;
        });
        if (!attachNodes) return;

        attachNodes.forEach(
          (x, index) => {
            x.querySelector(".by-icon-eye-grey")?.remove();
            x.querySelector(".by-icon-yundown-grey")?.remove();

            // 添加预览按钮
            const i = document.createElement("i");
            i.title = "预览";
            i.classList.add("by-icon-eye-grey");
            i.addEventListener("click", () => {
              const url = urls[index];
              const filename = filenames[index];
              if (settings.preview.autoDownload) {
                downloadFile(url, filename).catch(() => {});
                console.debug("Autodownload");
              }
              if (OFFICE_EXT_RE.test(filename) && settings.preview.autoSwitchOffice) {
                openTab(
                  "https://view.officeapps.live.com/op/view.aspx?src=" +
                    encodeURIComponent(url),
                  { active: true, insert: true }
                );
              } else if (onlinePreview !== null) {
                openTab(onlinePreview + encodeURIComponent(url), {
                  active: true,
                  insert: true,
                });
              } else {
                openTab(url, { active: true, insert: true });
              }
            });

            // 添加下载按钮
            const i2 = document.createElement("i");
            i2.title = "下载";
            i2.classList.add("by-icon-yundown-grey");
            i2.addEventListener("click", () => {
              downloadFile(urls[index], filenames[index]).catch(() => {});
            });

            // 插入按钮
            if (x.children.length >= 3) {
              x.children[3]?.remove();
              x.children[2]?.insertAdjacentElement("afterend", i);
              x.children[2]?.remove();
              x.children[1]?.insertAdjacentElement("afterend", i2);
            } else {
              x.appendChild(i2);
              x.appendChild(i);
            }
          }
        );
      } catch (e) {
        console.error("处理资源失败", e);
      }
    }

    // 主页面
    else if (
      location.href.startsWith(
        "https://ucloud.bupt.edu.cn/uclass/#/student/homePage"
      ) ||
      location.href.startsWith(
        "https://ucloud.bupt.edu.cn/uclass/index.html#/student/homePage"
      )
    ) {
      if (settings.system.betterTitle) {
        const pageTitle = "个人主页 - 教学云空间";
        document.title = pageTitle;
      }
      if (settings.home.showTodoCourseName) {
        // 未完成任务列表（异常时不中断后续布局与滚轮翻页初始化）
        let list = glist;
        if (!list) {
          try {
            const undoneRes = await getUndoneList();
            list = undoneRes && undoneRes.data && undoneRes.data.undoneList;
          } catch (e) {
            console.warn("[ucloud-Enhanced] 主页获取待办列表失败:", e);
            list = null;
          }
        }
        if (Array.isArray(list)) {
          glist = list;

          let pageCheckTimer = null;
          let todoInjecting = false;
          if (homePageObserver) {
            homePageObserver.disconnect();
            homePageObserver = null;
          }
          const pageIndicatorSelector =
            "#layout-container > div.main-content > div.router-container > div > div.teacher-home-page > div.home-left-container.home-inline-block > div.in-progress-section.home-card > div.in-progress-header > div > div:nth-child(2) > div > div.banner-indicator.home-inline-block";
          homePageObserver = new MutationObserver(() => {
            // 防抖：任何 DOM 变动都会触发回调，集中处理避免重复解析
            clearTimeout(pageCheckTimer);
            pageCheckTimer = setTimeout(async () => {
              if (todoInjecting) return;
              const pageElement = document.querySelector(pageIndicatorSelector);
              let pageChanged = false;
              if (pageElement) {
                const currentPage = parseInt(
                  pageElement.innerHTML.trim().split("/")[0]
                );
                if (!isNaN(currentPage) && currentPage !== gpage) {
                  gpage = currentPage;
                  pageChanged = true;
                }
              }
              const hasUnprocessed = queryTodoCardNodes().some(
                (n) => !n.querySelector(".yz-course-line") && n.dataset.yzCourseDone !== "1"
              );
              if (pageChanged || hasUnprocessed) {
                todoInjecting = true;
                try {
                  await updateAssignmentDisplay(list);
                } finally {
                  todoInjecting = false;
                }
              }
            }, 120);
          });

          homePageObserver.observe(document.body, {
            childList: true,
            subtree: true,
            attributes: false,
            characterData: true,
          });

          // 初始化页码
          const pageElement = document.querySelector(pageIndicatorSelector);
          if (pageElement) {
            gpage = parseInt(pageElement.innerHTML.trim().split("/")[0]);
          }

          // 更新作业显示
          await updateAssignmentDisplay(list);
        }
      }
      function wheelPageTurner() {
        const pageConfigs = [
          {
            // 待办
            targetSelector:
              "#layout-container > div.main-content > div.router-container > div > div.teacher-home-page > div.home-left-container.home-inline-block > div.in-progress-section.home-card > div.in-progress-body",
            prevPageSelector:
              '#layout-container > div.main-content > div.router-container > div > div.teacher-home-page > div.home-left-container.home-inline-block > div.in-progress-section.home-card > div.in-progress-header div[title="上一页"]',
            nextPageSelector:
              '#layout-container > div.main-content > div.router-container > div > div.teacher-home-page > div.home-left-container.home-inline-block > div.in-progress-section.home-card > div.in-progress-header div[title="下一页"]',
            pageIndicatorSelector:
              "#layout-container > div.main-content > div.router-container > div > div.teacher-home-page > div.home-left-container.home-inline-block > div.in-progress-section.home-card > div.in-progress-header div.banner-indicator.home-inline-block",
          },
          {
            // 本学期课程
            targetSelector:
              "#layout-container > div.main-content > div.router-container > div > div.teacher-home-page > div.home-left-container.home-inline-block > div.my-lesson-section.home-card > div.my-lesson-body",
            prevPageSelector:
              '#layout-container > div.main-content > div.router-container > div > div.teacher-home-page > div.home-left-container.home-inline-block > div.my-lesson-section.home-card > div.my-lesson-header div[title="上一页"]',
            nextPageSelector:
              '#layout-container > div.main-content > div.router-container > div > div.teacher-home-page > div.home-left-container.home-inline-block > div.my-lesson-section.home-card > div.my-lesson-header div[title="下一页"]',
            pageIndicatorSelector:
              "#layout-container > div.main-content > div.router-container > div > div.teacher-home-page > div.home-left-container.home-inline-block > div.my-lesson-section.home-card > div.my-lesson-header div.banner-indicator.home-inline-block",
          },
        ];
        function parsePageIndicator(pageIndicator) {
          const text = pageIndicator.textContent.trim();
          const [currentPage, totalPages] = text.split("/").map(Number);
          return { currentPage, totalPages };
        }
        function createWheelHandler(
          prevPageElement,
          nextPageElement,
          pageIndicator
        ) {
          return function (event) {
            const { currentPage, totalPages } =
              parsePageIndicator(pageIndicator);
            if (event.deltaY > 0 && currentPage < totalPages) {
              event.preventDefault();
              nextPageElement.click();
            } else if (event.deltaY < 0 && currentPage > 1) {
              event.preventDefault();
              prevPageElement.click();
            }
          };
        }
        const bindConfig = (config, attempt) => {
          const targetDiv = document.querySelector(config.targetSelector);
          const prevPageElement = document.querySelector(config.prevPageSelector);
          const nextPageElement = document.querySelector(config.nextPageSelector);
          const pageIndicator = document.querySelector(config.pageIndicatorSelector);
          if (!targetDiv || !prevPageElement || !nextPageElement || !pageIndicator) {
            if (attempt < 40) setTimeout(() => bindConfig(config, attempt + 1), 150);
            return;
          }
          if (targetDiv.dataset.yzWheelBound === "1") return;
          targetDiv.dataset.yzWheelBound = "1";
          targetDiv.addEventListener(
            "wheel",
            createWheelHandler(prevPageElement, nextPageElement, pageIndicator),
            { passive: false }
          );
        };
        pageConfigs.forEach((config) => bindConfig(config, 0));
        // 平台可能晚于脚本渲染或在切换后重建列表，延迟补绑
        setTimeout(() => pageConfigs.forEach((config) => bindConfig(config, 0)), 1500);
        setTimeout(() => pageConfigs.forEach((config) => bindConfig(config, 0)), 4000);
      }
      if (settings.home.useWheelPageTurner) wheelPageTurner();
    }

    // 课程主页
    else if (
      location.href.startsWith(
        "https://ucloud.bupt.edu.cn/uclass/course.html#/student/courseHomePage"
      )
    ) {
      try {
        const site = JSON.parse(localStorage.getItem("site"));
        if (!site || !site.id) return;
        if (settings.system.betterTitle) {
          const pageTitle = "[课程] " + site.siteName + " - 教学云空间";
          document.title = pageTitle;
        }

        const id = site.id;
        const resources = await getSiteResource(id);

        // 添加下载按钮到每个资源
        const resourceItems = Array.from(
          document.querySelectorAll(".resource-item > .right")
        );
        const previewItems = Array.from(
          document.querySelectorAll(".resource-item > .left")
        );

        if (resourceItems.length > 0) {
          resourceItems.forEach((x, index) => {
            if (index >= resources.length) return;

            if (
              settings.preview.autoDownload &&
              previewItems[index] &&
              previewItems[index].dataset.yzAutoDlBound !== "1"
            ) {
              previewItems[index].dataset.yzAutoDlBound = "1";
              previewItems[index].addEventListener(
                "click",
                async () => {
                  try {
                    const url = await getPreviewURL(resources[index].id);
                    await downloadFile(url, resources[index].name);
                    console.debug("Autodownload");
                  } catch (err) {
                    console.warn("[ucloud-Enhanced] 自动下载失败:", err);
                  }
                },
                false
              );
            }
            if (
              settings.course.showAllDownloadButoon &&
              x.dataset.yzDlInjected !== "1"
            ) {
              x.dataset.yzDlInjected = "1";
              const i = document.createElement("i");
              i.title = "下载";
              i.classList.add("by-icon-download");
              i.classList.add("btn-icon");
              i.classList.add("visible");
              i.style.cssText = `
                display: inline-block !important;
                visibility: visible !important;
                cursor: pointer !important;
            `;

              // 获取data-v属性
              const dataAttr = Array.from(x.attributes).find((attr) =>
                attr.localName.startsWith("data-v")
              );
              if (dataAttr) {
                i.setAttribute(dataAttr.localName, "");
              }

              i.addEventListener(
                "click",
                async (e) => {
                  e.stopPropagation();
                  try {
                    const url = await getPreviewURL(resources[index].id);
                    await downloadFile(url, resources[index].name);
                  } catch (err) {
                    showNotification("下载失败", "无法下载该课件，请稍后重试");
                  }
                },
                false
              );
              if (x.children.length) x.children[0].remove();
              x.insertAdjacentElement("afterbegin", i);
            }
          });

          // "下载全部"按钮
          if (
            !document.getElementById("downloadAllButton") &&
            resources.length > 0 &&
            settings.course.addBatchDownload
          ) {
            const downloadAllButton = `<div style="display: flex;flex-direction: row;justify-content: end;margin-right: 24px;margin-top: 20px;">
                      <button type="button" class="el-button submit-btn el-button--primary" id="downloadAllButton">
                      下载全部
                      </button>
                      </div>`;

            const resourceList = $x(
              "/html/body/div/div/div[2]/div[2]/div/div/div"
            );
            const anchor =
              resourceList[0] ||
              resourceItems[0].closest(".resource-item")?.parentElement;
            if (anchor) {
              const containerElement = document.createElement("div");
              containerElement.innerHTML = downloadAllButton;
              anchor.before(containerElement);

              document.getElementById("downloadAllButton").onclick =
                async () => {
                  downloading = !downloading;
                  const btn = document.getElementById("downloadAllButton");
                  if (!btn) return;
                  if (downloading) {
                    const totalCount = resources.length;
                    btn.textContent = "取消下载 (0/" + totalCount + ")";
                    try {
                      for (let index = 0; index < resources.length; index++) {
                        if (!downloading) return;
                        const file = resources[index];
                        const shortName = file.name.length > 20 ? file.name.substring(0, 17) + "..." : file.name;
                        btn.textContent =
                          "取消下载 " + shortName + " (" + (index + 1) + "/" + totalCount + ")";
                        try {
                          await downloadFile(
                            await getPreviewURL(file.id),
                            file.name,
                            () => !downloading,
                            (pct) => {
                              if (downloading && btn.isConnected) {
                                btn.textContent =
                                  pct === null
                                    ? "取消下载 " + shortName + " (" + (index + 1) + "/" + totalCount + ")"
                                    : "取消下载 " + shortName + " (" + (index + 1) + "/" + totalCount + " · " + pct + "%)";
                              }
                            }
                          );
                        } catch (err) {
                          console.warn("[ucloud-Enhanced] 批量下载单文件失败:", file.name, err);
                        }
                        if (!downloading) return;
                      }
                    } finally {
                      downloading = false;
                      if (btn.isConnected) btn.textContent = "下载全部";
                    }
                  } else {
                    btn.textContent = "下载全部";
                  }
                };
            }
          }
        }
      } catch (e) {
        console.error("课程主页处理失败", e);
      }
    } else if (location.href == "https://ucloud.bupt.edu.cn/#/") {
      if (settings.system.betterTitle) {
        const pageTitle = "首页 - 教学云空间";
        document.title = pageTitle;
      }
    }
    // 通知页
    else if (
      location.href ==
      "https://ucloud.bupt.edu.cn/uclass/index.html#/set/notice_fullpage"
    ) {
      if (settings.system.betterTitle) {
        const pageTitle = "通知 - 教学云空间";
        document.title = pageTitle;
      }

    }
  }
})();
