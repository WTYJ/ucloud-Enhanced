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
          description: '每 2 小时自动检查一次新版本，发现更新时弹窗提醒（油猴的原生更新是静默的，弹窗能让你感知版本变化）。',
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
    /ue-dark-mode|#yzHelper-|\.yz-notify|#downloadAllButton|#nprogress/;

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
        if (s.backgroundColor && (!s.backgroundImage || s.backgroundImage === "none")) {
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
        txt.includes("html.ue-dark-mode") ||
        txt.includes("#nprogress")
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
  `;
  // document-start 阶段即注入手写精调深色层，并打标避免被 CSSOM 重写器二次处理
  const handTunedDarkStyle = GM_addStyle(DARK_MODE_CSS);
  if (handTunedDarkStyle) {
    handTunedDarkStyle.id = "ue-dark-handtuned";
    handTunedDarkStyle.dataset.ueDarkSheet = "1";
  }

  // 辅助变量
  let sumBytes = 0,
    loadedBytes = 0,
    downloading = false;
  let gpage = -1;
  let glist = null;
  let onlinePreview = null;

  // 初始化扩展功能
  function initializeExtension() {
    // 注册菜单命令
    registerMenuCommands();
    setupWorkbench();

    const nprogressCSS = GM_getResourceText("NPROGRESS_CSS");
    GM_addStyle(nprogressCSS);

    loadui();

    addFunctionalCSS();
    // DOM 就绪后扫描已加载样式表并开启 <head> 新样式监听（不再遍历 body 或监听 pointerover）
    ensureDarkEngine();
    window.addEventListener("load", () => ensureDarkEngine(), { once: true });
    setTimeout(main, 100);

    if (settings.system.autoUpdate) {
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

  function showUpdateNotification(newVersion) {
    const { el, close } = createNotify(`
      <div class="notify-title"><span class="notify-dot"></span>发现新版本 v${escapeHtml(newVersion)}</div>
      <div class="notify-msg">当前版本 v${GM_info.script.version}，可前往 Releases 查看详细更新日志。</div>
      <div class="notify-actions">
        <button class="notify-btn primary" data-act="update">立即更新</button>
        <button class="notify-btn ghost" data-act="notes">查看日志</button>
        <button class="notify-btn ghost" data-act="later">稍后提醒</button>
      </div>
    `);
    el.addEventListener("click", (e) => {
      const act = e.target.dataset && e.target.dataset.act;
      if (act === "update") openTab(GM_info.script.downloadURL, { active: true });
      else if (act === "notes") openTab("https://github.com/WTYJ/ucloud-Enhanced/releases", { active: true });
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
    const lastCheckTime = GM_getValue("lastUpdateCheck", 0);
    const now = Date.now();
    const CHECK_INTERVAL = 2 * 60 * 60 * 1000; // 2 小时自动检查间隔

    if (!force && now - lastCheckTime <= CHECK_INTERVAL) {
      if (onDone) onDone();
      return;
    }

    const bustParam = "_t=" + Math.floor(now / 60000);
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
          // 仅在成功解析到版本号后才写入检查时间戳，避免网络失败锁死冷却期
          GM_setValue("lastUpdateCheck", now);
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
            showUpdateNotification(latestVersion);
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
      #yzHelper-quick .quick-wb-box {
          margin: 4px 6px 8px;
          padding: 8px;
          border-radius: 12px;
          background: var(--ue-bg-2);
          border: 1px solid var(--ue-border);
      }
      #yzHelper-quick .quick-workbench {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          width: 100%;
          padding: 9px 12px;
          border: none;
          border-radius: 9px;
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
      #yzHelper-quick .quick-wb-tabs {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 6px;
          margin-top: 7px;
      }
      #yzHelper-quick .quick-wb-tab {
          border: 1px solid var(--ue-border);
          background: var(--ue-bg);
          color: var(--ue-text-2);
          border-radius: 7px;
          padding: 5px 0;
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.15s ease;
      }
      #yzHelper-quick .quick-wb-tab:hover {
          border-color: var(--ue-accent);
          color: var(--ue-accent);
          background: var(--ue-accent-weak);
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
          background: var(--ue-accent-weak);
          color: var(--ue-accent);
          border: none;
          border-radius: 8px;
          padding: 6px 11px;
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
        ? `<div class="quick-wb-box">
            <button class="quick-workbench" data-wb-open="todo">🧩 打开工作台</button>
            <div class="quick-wb-tabs">
              <button class="quick-wb-tab" data-wb-open="todo">待办</button>
              <button class="quick-wb-tab" data-wb-open="course">课程</button>
              <button class="quick-wb-tab" data-wb-open="notice">通知</button>
            </div>
          </div>`
        : "";
      quickPanel.innerHTML = `
        ${wbBoxHtml}
        <div class="quick-title">快捷开关</div>
        ${rows.join("")}
        <div class="quick-footer">
          <div class="quick-footer-btns">
            <button class="quick-all" id="yzHelper-quick-all">⚙ 全部设置</button>
            <button class="quick-check-btn" id="yzHelper-quick-update" title="立即检查新版本">检查更新</button>
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
        updBtn.disabled = true;
        updBtn.textContent = "检查中…";
        checkForUpdates(true, () => {
          if (updBtn.isConnected) {
            updBtn.disabled = false;
            updBtn.textContent = "检查更新";
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
              <button id="yzHelper-check-update" class="about-btn">立即检查更新</button>
              <span class="about-update-tip">每 2 小时自动检查一次，也可手动检查</span>
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

    // 关于页：立即检查更新（强制绕过每日一次的节流）
    const checkUpdateBtn = document.getElementById("yzHelper-check-update");
    checkUpdateBtn.addEventListener("click", () => {
      checkUpdateBtn.disabled = true;
      const originalText = checkUpdateBtn.textContent;
      checkUpdateBtn.textContent = "检查中…";
      checkForUpdates(true, () => {
        checkUpdateBtn.disabled = false;
        checkUpdateBtn.textContent = originalText;
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

  // 文件下载相关函数（支持无 Content-Length 降级、可选取消回调/进度回调与异常时安全回收进度计数）
  async function downloadFile(url, filename, shouldCancel, onProgress) {
    console.debug("Call download");
    const isCancelled = () =>
      typeof shouldCancel === "function" ? !!shouldCancel() : false;
    NProgress.configure({ trickle: false, speed: 0 });
    let addedTotal = 0;
    let addedLoaded = 0;
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const contentLength = parseInt(response.headers.get("content-length") || "0", 10);
      let blob;
      if (contentLength > 0 && response.body && response.body.getReader) {
        addedTotal = contentLength;
        sumBytes += addedTotal;
        const reader = response.body.getReader();
        const chunks = [];
        let lastPct = -1;
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          if (isCancelled()) {
            reader.cancel().catch(() => {});
            return;
          }
          chunks.push(value);
          addedLoaded += value.length;
          loadedBytes += value.length;
          if (sumBytes > 0) NProgress.set(Math.min(0.99, loadedBytes / sumBytes));
          if (typeof onProgress === "function") {
            const pct = Math.min(99, Math.floor((addedLoaded / contentLength) * 100));
            if (pct !== lastPct) {
              lastPct = pct;
              onProgress(pct);
            }
          }
        }
        blob = new Blob(chunks);
      } else {
        // 服务器未返回 Content-Length 或不支持流式读取时，降级为整块 Blob 下载
        NProgress.start();
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
    } finally {
      sumBytes = Math.max(0, sumBytes - addedTotal);
      loadedBytes = Math.max(0, loadedBytes - addedLoaded);
      if (sumBytes === 0 || isCancelled()) NProgress.done();
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
        return Object.keys(info).length ? info : null;
      })
      .catch(() => null);
    assignmentInfoCache.set(id, p);
    return p;
  }

  // ===== 共享格式化、路由导航、课程列表与资源预览工具（供工作台与原页面模块共用）=====
  function fmtDeadline(d) {
    const pad = (n) => String(n).padStart(2, "0");
    return (
      d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()) +
      " " + pad(d.getHours()) + ":" + pad(d.getMinutes())
    );
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

