// ==UserScript==
// @name         ucloud-Enhanced
// @namespace    https://github.com/WTYJ/ucloud-Enhanced
// @version      2.5.6
// @description  主页作业显示所属课程（含测试类待办），自动深色模式，主页课程搜索，使用Office 365预览课件，通知按时间排序，去除悬浮窗，解除复制限制，课件自动下载，批量下载，资源页展示全部下载按钮，更好的页面标题
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
const IMAGE_EXT_RE = /\.((jpe?|pn)g|gif|webp|bmp|tiff|svg)$/i;

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
  "use strict";
  // 默认关闭「在新标签中打开详情页」时无需劫持 webpackJsonp，避免全量模块扫描与控制台告警
  if (!GM_getValue("home_openInNewTab", false)) return;

  const patchJobs = [
    // 原“通知列表 size:10→1000”补丁已移除：大分页疑似导致“标记已读”失效，且展示上千条通知并无必要
    {
      name: "studentHomepage",
      identifiers: ['name:"studentHomepage"', "tapUndone", "tapSiteItem"],
      patched: false,
      replacements: [
        // 规则来自 'tapUndone'
        [
          /window\.location\.href\s*=\s*("course\.html#\/teacher\/forum\/topicDetail_fullpage\?tid="\s*\+\s*e\.activityId)/g,
          'window.open($1, "_blank")',
        ],
        [
          /window\.location\.href\s*=\s*("course\.html#\/student\/assignmentDetails_fullpage\?activeTabName="\s*\+\s*t\s*\+\s*"&assignmentId="\s*\+\s*e\.activityId\s*\+\s*"&assignmentType="\s*\+\s*e\.assignmentType\s*\+\s*"&assignmentTitle="\s*\+\s*e\.activityName\s*\+\s*"&evaluationStatus="\s*\+\s*e\.evaluationStatus\s*\+\s*"&studentGroupId="\s*\+\s*e\.studentGroupId\s*\+\s*"&isOpenEvaluation="\s*\+\s*e\.isOpenEvaluation)/g,
          'window.open($1, "_blank")',
        ],
        [
          /window\.location\.href\s*=\s*("course\.html#\/answer\?id="\s*\+\s*e\.activityId)/g,
          'window.open($1, "_blank")',
        ],
        // 规则来自 'tapSiteItem'
        [
          /window\.location\.href\s*=\s*(["']course\.html#\/student\/courseHomePage\?ind=1["'])/g,
          'window.open($1, "_blank")',
        ],
        [
          /window\.location\.href\s*=\s*(["']course\.html#\/courseCenterDetail_fullpage["'])/g,
          'window.open($1, "_blank")',
        ],
      ],
    },
  ];

  /**
   * @param {object} modules - webpack 模块对象
   */
  function patchModules(modules) {
    if (!modules || patchJobs.every((j) => j.patched)) return;

    /**
     * 尝试对模块字符串应用一个补丁任务
     * @param {string} moduleString - 原始模块代码
     * @param {object} job - patchJobs 数组中的一个补丁任务
     * @returns {{modifiedSource: string, isTarget: boolean}}
     */
    function applyPatchJob(moduleString, job) {
      const isTarget = job.identifiers.every((id) => moduleString.includes(id));
      if (!isTarget) {
        return { modifiedSource: moduleString, isTarget: false };
      }
      const modifiedSource = job.replacements.reduce(
        (currentSource, [regex, replacement]) => {
          return currentSource.replace(regex, replacement);
        },
        moduleString // reduce 的初始值
      );

      return { modifiedSource, isTarget: true };
    }

    for (const moduleId in modules) {
      if (patchJobs.every((j) => j.patched)) {
        break;
      }
      const originalModule = modules[moduleId];
      if (typeof originalModule !== "function") continue;
      let currentModuleString = originalModule.toString();
      let moduleHasBeenModified = false;

      try {
        for (const job of patchJobs) {
          if (job.patched) {
            continue;
          }

          const { modifiedSource, isTarget } = applyPatchJob(
            currentModuleString,
            job
          );

          if (isTarget) {
            if (modifiedSource !== currentModuleString) {
              currentModuleString = modifiedSource;
              moduleHasBeenModified = true;
              job.patched = true;
            } else {
              console.warn(
                `[ucloud-Enhanced] 找到 '${job.name}' (ID: ${moduleId})，但正则表达式替换失败!`
              );
            }
          }
        }

        if (moduleHasBeenModified) {
          const hookedModule = new Function(`return (${currentModuleString})`)();
          modules[moduleId] = hookedModule; // 在内存中替换模块
        }
      } catch (error) {
        console.error(
          `[ucloud-Enhanced] Patch 模块 ${moduleId} 失败! 错误:`,
          error
        );
        console.error(
          "[ucloud-Enhanced] 发生错误的模块代码 (可能已部分 patch):",
          currentModuleString
        );
      }
    }
  }
  let originalWebpackJsonp = unsafeWindow.webpackJsonp;
  let webpackJsonp_ = undefined;

  function hookWebpackFunction(originalFunc) {
    return function (chunkIds, modules, ...rest) {
      patchModules(modules);
      return originalFunc.apply(this, [chunkIds, modules, ...rest]);
    };
  }

  function hookWebpackArray(array) {
    array.forEach((chunk) => patchModules(chunk[1]));
    const originalPush = array.push;
    array.push = function (...args) {
      const chunk = args[0];
      if (chunk && chunk[1]) {
        patchModules(chunk[1]);
      }
      return originalPush.apply(this, args);
    };
    return array;
  }

  if (typeof originalWebpackJsonp === "function") {
    webpackJsonp_ = hookWebpackFunction(originalWebpackJsonp);
  } else if (Array.isArray(originalWebpackJsonp)) {
    webpackJsonp_ = hookWebpackArray(originalWebpackJsonp);
  } else {
    webpackJsonp_ = originalWebpackJsonp;
  }

  Object.defineProperty(unsafeWindow, "webpackJsonp", {
    configurable: true,
    enumerable: true,
    get() {
      return webpackJsonp_;
    },
    set(newValue) {
      console.debug("[ucloud-Enhanced] `webpackJsonp` assignment captured.");
      if (Array.isArray(newValue)) {
        webpackJsonp_ = hookWebpackArray(newValue);
      } else if (typeof newValue === "function") {
        webpackJsonp_ = hookWebpackFunction(newValue);
      } else {
        webpackJsonp_ = newValue;
      }
    },
  });
})();

(function () {
  if (location.href.startsWith("https://ucloud.bupt.edu.cn/office/")) {
    if (
      GM_getValue("preview_autoSwitchOffice", false) ||
      GM_getValue("preview_autoSwitchPdf", true) ||
      GM_getValue("preview_autoSwitchImg", true)
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
      } else if (IMAGE_EXT_RE.test(filename)) {
        if (!GM_getValue("preview_autoSwitchImg", true)) {
          return;
        }
        if (window.stop) window.stop();
        function createModernImageViewer(imageUrl) {
          const style = document.createElement("style");
          style.textContent = `
          .modern-image-viewer {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background-color: rgba(0, 0, 0, 0.9);
            z-index: 9999;
            display: flex;
            flex-direction: column;
            color: white;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
          }

          .viewer-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 12px 20px;
            background-color: rgba(0, 0, 0, 0.7);
            z-index: 1;
          }

          .viewer-title {
            font-size: 16px;
            font-weight: 500;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            max-width: 70%;
          }

          .viewer-controls {
            display: flex;
            gap: 15px;
          }

          .viewer-button {
            background: none;
            border: none;
            color: white;
            cursor: pointer;
            font-size: 16px;
            padding: 5px;
            border-radius: 4px;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: background-color 0.2s;
          }

          .viewer-button:hover {
            background-color: rgba(255, 255, 255, 0.1);
          }

          .viewer-content {
            flex: 1;
            display: flex;
            align-items: center;
            justify-content: center;
            position: relative;
            overflow: hidden;
          }

          .viewer-image {
            max-width: 100%;
            max-height: 100%;
            object-fit: contain;
            transform-origin: center center;
            transition: transform 0.05s linear;
            cursor: grab;
          }

          .viewer-image.dragging {
            cursor: grabbing;
            transition: none;
          }

          .viewer-toolbar {
            display: flex;
            justify-content: center;
            align-items: center;
            padding: 12px;
            background-color: rgba(0, 0, 0, 0.7);
            gap: 20px;
          }

          .zoom-level {
            font-size: 14px;
            min-width: 60px;
            text-align: center;
          }

          .viewer-help {
            position: absolute;
            bottom: 80px;
            left: 50%;
            transform: translateX(-50%);
            background-color: rgba(0, 0, 0, 0.7);
            padding: 15px 20px;
            border-radius: 8px;
            max-width: 400px;
            font-size: 14px;
            display: none;
            z-index: 2;
          }

          .viewer-help h3 {
            margin-top: 0;
            margin-bottom: 10px;
            font-size: 16px;
          }

          .viewer-help ul {
            margin: 0;
            padding-left: 20px;
          }

          .viewer-help li {
            margin-bottom: 5px;
          }

          .keyboard-shortcut {
            display: inline-block;
            background-color: rgba(255, 255, 255, 0.1);
            padding: 2px 6px;
            border-radius: 3px;
            margin: 0 2px;
          }

          @media (max-width: 768px) {
            .viewer-controls {
              gap: 10px;
            }

            .viewer-button {
              font-size: 14px;
            }

            .viewer-toolbar {
              padding: 10px;
              gap: 15px;
            }
          }
        `;
          document.head.appendChild(style);

          // 创建预览器DOM结构
          document.body.innerHTML = `
          <div class="modern-image-viewer">
            <div class="viewer-header">
              <div class="viewer-title">${escapeHtml(getImageFileName(imageUrl))}</div>
              <div class="viewer-controls">
                <button class="viewer-button" id="help-btn" title="帮助">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-4h2v2h-2zm2.07-7.75l-.9.92c-.5.51-.86.97-1.04 1.69-.08.32-.13.68-.13 1.14h2c0-.47.08-.91.22-1.31.2-.58.53-.97.98-1.42l.9-.92c.35-.36.58-.82.58-1.35 0-1.1-.9-2-2-2s-2 .9-2 2h2c0-.55.45-1 1-1s1 .45 1 1c0 .28-.12.53-.31.72z"/>
                  </svg>
                </button>
                <button class="viewer-button" id="download-btn" title="下载">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/>
                  </svg>
                </button>
              </div>
            </div>

            <div class="viewer-content">
              <img id="viewer-img" class="viewer-image" src="${escapeHtml(imageUrl)}" alt="预览图片" draggable="false">
            </div>

            <div class="viewer-toolbar">
              <button class="viewer-button" id="rotate-left" title="向左旋转">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M7.11 8.53L5.7 7.11C4.8 8.27 4.24 9.61 4.07 11h2.02c.14-.87.49-1.72 1.02-2.47zM6.09 13H4.07c.17 1.39.72 2.73 1.62 3.89l1.41-1.42c-.52-.75-.87-1.59-1.01-2.47zm1.01 5.32c1.16.9 2.51 1.44 3.9 1.61V17.9c-.87-.15-1.71-.49-2.46-1.03L7.1 18.32zM13 4.07V1L8.45 5.55 13 10V6.09c2.84.48 5 2.94 5 5.91s-2.16 5.43-5 5.91v2.02c3.95-.49 7-3.85 7-7.93s-3.05-7.44-7-7.93z"/>
                </svg>
              </button>
              <button class="viewer-button" id="zoom-out" title="缩小">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14zM7 9h5v1H7z"/>
                </svg>
              </button>
              <span class="zoom-level" id="zoom-level">100%</span>
              <button class="viewer-button" id="zoom-in" title="放大">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
                  <path d="M12 10h-2v2H9v-2H7V9h2V7h1v2h2z"/>
                </svg>
              </button>
              <button class="viewer-button" id="zoom-reset" title="重置">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"/>
                </svg>
              </button>
              <button class="viewer-button" id="rotate-right" title="向右旋转">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M15.55 5.55L11 1v3.07C7.06 4.56 4 7.92 4 12s3.05 7.44 7 7.93v-2.02c-2.84-.48-5-2.94-5-5.91s2.16-5.43 5-5.91V10l4.55-4.45zM19.93 11c-.17-1.39-.72-2.73-1.62-3.89l-1.42 1.42c.54.75.88 1.6 1.02 2.47h2.02zM13 17.9v2.02c1.39-.17 2.74-.71 3.9-1.61l-1.44-1.44c-.75.54-1.59.89-2.46 1.03zm3.89-2.42l1.42 1.41c.9-1.16 1.45-2.5 1.62-3.89h-2.02c-.14.87-.48 1.72-1.02 2.48z"/>
                </svg>
              </button>
            </div>

            <div class="viewer-help" id="help-panel">
              <h3>键盘快捷键</h3>
              <ul>
                <li><span class="keyboard-shortcut">+</span> 或 <span class="keyboard-shortcut">-</span> 放大/缩小</li>
                <li><span class="keyboard-shortcut">0</span> 重置缩放</li>
                <li><span class="keyboard-shortcut">←</span> <span class="keyboard-shortcut">→</span> 左右旋转</li>
                <li><span class="keyboard-shortcut">R</span> 重置所有变换</li>
                <li><span class="keyboard-shortcut">D</span> 下载图片</li>
                <li><span class="keyboard-shortcut">Esc</span> 关闭预览器</li>
              </ul>
            </div>
          </div>
        `;

          document.body.style.overflow = "hidden";

          // 获取元素引用
          const viewer = document.querySelector(".modern-image-viewer");
          const image = document.getElementById("viewer-img");
          const helpBtn = document.getElementById("help-btn");
          const helpPanel = document.getElementById("help-panel");
          const downloadBtn = document.getElementById("download-btn");
          const rotateLeftBtn = document.getElementById("rotate-left");
          const rotateRightBtn = document.getElementById("rotate-right");
          const zoomInBtn = document.getElementById("zoom-in");
          const zoomOutBtn = document.getElementById("zoom-out");
          const zoomResetBtn = document.getElementById("zoom-reset");
          const zoomLevelDisplay = document.getElementById("zoom-level");

          // 图片变换状态
          const state = {
            scale: 1,
            rotation: 0,
            translateX: 0,
            translateY: 0,
            dragging: false,
            lastX: 0,
            lastY: 0,
            loaded: false,
          };

          // 图片加载完成事件
          image.onload = () => {
            state.loaded = true;
            image.style.opacity = 1;
            applyTransform();
          };

          // 应用变换
          function applyTransform() {
            image.style.transform = `translate(${state.translateX}px, ${state.translateY}px) rotate(${state.rotation}deg) scale(${state.scale})`;
            zoomLevelDisplay.textContent = `${Math.round(state.scale * 100)}%`;
          }

          // 缩放图片
          function zoom(delta) {
            if (!state.loaded) return;

            const oldScale = state.scale;
            state.scale = Math.max(0.1, Math.min(10, state.scale + delta));

            // Only adjust position if we have mouse coordinates
            if (state.lastClientX !== undefined) {
              const imageRect = image.getBoundingClientRect();

              // Calculate the point on the original image that was under the cursor
              const viewportX = state.lastClientX - imageRect.left;
              const viewportY = state.lastClientY - imageRect.top;

              // Convert to coordinates relative to the image center in the current scale
              const imageX = viewportX - imageRect.width / 2;
              const imageY = viewportY - imageRect.height / 2;

              // Calculate how this point's position changes with the new scale
              const scaleDiff = state.scale - oldScale;

              // Adjust translation to keep the point under cursor
              state.translateX -= (imageX * scaleDiff) / oldScale;
              state.translateY -= (imageY * scaleDiff) / oldScale;
            }

            applyTransform();
          }

          // 旋转图片
          function rotate(degrees) {
            if (!state.loaded) return;
            state.rotation = (state.rotation + degrees) % 360;
            applyTransform();
          }

          // 重置变换
          function resetTransform() {
            if (!state.loaded) return;
            state.scale = 1;
            state.rotation = 0;
            state.translateX = 0;
            state.translateY = 0;
            applyTransform();
          }

          // 下载图片
          function downloadImage() {
            const a = document.createElement("a");
            a.href = imageUrl;
            a.download = getImageFileName(imageUrl);
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
          }

          // 从URL中提取文件名
          function getImageFileName(url) {
            try {
              const urlObj = new URL(url);
              const pathParts = urlObj.pathname.split("/");
              const fileName = decodeURIComponent(
                pathParts[pathParts.length - 1]
              );
              return fileName || "图片预览";
            } catch (e) {
              return "图片预览";
            }
          }

          image.addEventListener("mousedown", (e) => {
            if (!state.loaded) return;
            e.preventDefault();
            state.dragging = true;
            state.lastX = e.clientX;
            state.lastY = e.clientY;
            image.classList.add("dragging");
          });

          document.addEventListener("mousemove", (e) => {
            state.lastClientX = e.clientX;
            state.lastClientY = e.clientY;

            if (!state.dragging) return;
            e.preventDefault();

            state.translateX += e.clientX - state.lastX;
            state.translateY += e.clientY - state.lastY;
            state.lastX = e.clientX;
            state.lastY = e.clientY;

            applyTransform();
          });

          document.addEventListener("mouseup", () => {
            state.dragging = false;
            image.classList.remove("dragging");
          });

          let lastTouchDistance = 0;
          let touchRotationStart = 0;

          image.addEventListener(
            "touchstart",
            (e) => {
              if (!state.loaded) return;
              if (e.touches.length === 1) {
                e.preventDefault();
                state.dragging = true;
                state.lastX = e.touches[0].clientX;
                state.lastY = e.touches[0].clientY;
                image.classList.add("dragging");
              } else if (e.touches.length === 2) {
                const dx = e.touches[0].clientX - e.touches[1].clientX;
                const dy = e.touches[0].clientY - e.touches[1].clientY;
                lastTouchDistance = Math.hypot(dx, dy);
                touchRotationStart =
                  (Math.atan2(
                    e.touches[1].clientY - e.touches[0].clientY,
                    e.touches[1].clientX - e.touches[0].clientX
                  ) *
                    180) /
                  Math.PI;
              }
            },
            { passive: false }
          );

          image.addEventListener(
            "touchmove",
            (e) => {
              if (!state.loaded) return;
              e.preventDefault();

              if (e.touches.length === 1 && state.dragging) {
                state.translateX += e.touches[0].clientX - state.lastX;
                state.translateY += e.touches[0].clientY - state.lastY;
                state.lastX = e.touches[0].clientX;
                state.lastY = e.touches[0].clientY;
                applyTransform();
              } else if (e.touches.length === 2) {
                const dx = e.touches[0].clientX - e.touches[1].clientX;
                const dy = e.touches[0].clientY - e.touches[1].clientY;
                const touchDistance = Math.sqrt(dx * dx + dy * dy);
                const scaleFactor = touchDistance / lastTouchDistance;

                if (
                  !isNaN(scaleFactor) &&
                  isFinite(scaleFactor) &&
                  scaleFactor > 0
                ) {
                  state.scale = Math.max(
                    0.1,
                    Math.min(10, state.scale * scaleFactor)
                  );

                  const centerX =
                    (e.touches[0].clientX + e.touches[1].clientX) / 2;
                  const centerY =
                    (e.touches[0].clientY + e.touches[1].clientY) / 2;
                  const imageRect = image.getBoundingClientRect();

                  const x = centerX - imageRect.left;
                  const y = centerY - imageRect.top;

                  // 这是关键修复 - 调整以保持缩放点位置不变
                  state.translateX +=
                    (1 - scaleFactor) * (x - state.translateX);
                  state.translateY +=
                    (1 - scaleFactor) * (y - state.translateY);

                  lastTouchDistance = touchDistance;
                }

                const touchRotation =
                  (Math.atan2(
                    e.touches[1].clientY - e.touches[0].clientY,
                    e.touches[1].clientX - e.touches[0].clientX
                  ) *
                    180) /
                  Math.PI;

                const rotationDelta = touchRotation - touchRotationStart;
                if (!isNaN(rotationDelta) && isFinite(rotationDelta)) {
                  state.rotation = (state.rotation + rotationDelta) % 360;
                  touchRotationStart = touchRotation;
                }

                applyTransform();
              }
            },
            { passive: false }
          );

          image.addEventListener("touchend", () => {
            state.dragging = false;
            image.classList.remove("dragging");
          });

          // 鼠标滚轮缩放
          viewer.addEventListener(
            "wheel",
            (e) => {
              if (!state.loaded) return;
              e.preventDefault();
              const delta = e.deltaY < 0 ? 0.1 : -0.1;

              // 保存鼠标位置
              state.lastClientX = e.clientX;
              state.lastClientY = e.clientY;

              zoom(delta);
            },
            { passive: false }
          );

          // 按钮点击事件
          helpBtn.addEventListener("click", () => {
            helpPanel.style.display =
              helpPanel.style.display === "block" ? "none" : "block";
          });
          downloadBtn.addEventListener("click", downloadImage);
          rotateLeftBtn.addEventListener("click", () => rotate(-90));
          rotateRightBtn.addEventListener("click", () => rotate(90));
          zoomInBtn.addEventListener("click", () => zoom(0.1));
          zoomOutBtn.addEventListener("click", () => zoom(-0.1));
          zoomResetBtn.addEventListener("click", resetTransform);

          // 键盘快捷键
          document.addEventListener("keydown", (e) => {
            if (!state.loaded) return;

            switch (e.key) {
              case "Escape":
                if (helpPanel.style.display === "block") {
                  helpPanel.style.display = "none";
                } else if (window.opener || history.length <= 1) {
                  window.close();
                } else {
                  history.back();
                }
                break;
              case "+":
              case "=":
                zoom(0.1);
                break;
              case "-":
                zoom(-0.1);
                break;
              case "0":
                state.scale = 1;
                applyTransform();
                break;
              case "ArrowLeft":
                rotate(-90);
                break;
              case "ArrowRight":
                rotate(90);
                break;
              case "r":
              case "R":
                resetTransform();
                break;
              case "d":
              case "D":
                downloadImage();
                break;
              case "h":
              case "H":
              case "?":
                helpPanel.style.display =
                  helpPanel.style.display === "block" ? "none" : "block";
                break;
            }
          });

          // 点击背景关闭帮助面板
          viewer.addEventListener("click", (e) => {
            if (e.target === viewer && helpPanel.style.display === "block") {
              helpPanel.style.display = "none";
            }
          });

          // 双击图片重置缩放
          image.addEventListener("dblclick", (e) => {
            if (!state.loaded) return;
            e.preventDefault();

            if (state.scale === 1) {
              state.lastClientX = e.clientX;
              state.lastClientY = e.clientY;
              zoom(1);
            } else {
              resetTransform();
            }
          });
        }
        createModernImageViewer(viewURL.toString());
        return;
      }
      return;
    }
  }
})();
(function interceptXHR() {
  const originalOpen = XMLHttpRequest.prototype.open;

  XMLHttpRequest.prototype.open = function (
    method,
    url,
    async,
    user,
    password
  ) {
    // hook XHR：课程历史列表单页数量调整为 15 条
    if (
      typeof url === "string" &&
      url.includes("/ykt-site/site/list/student/history")
    ) {
      url = url.replace(/size=\d+/, "size=15");
    }

    return originalOpen.call(this, method, url, async, user, password);
  };
})();
