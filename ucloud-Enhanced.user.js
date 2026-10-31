// ==UserScript==
// @name         ucloud-Enhanced
// @namespace    https://github.com/WTYJ/ucloud-Enhanced
// @version      1.3.11
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

(function () {
  "use strict";
  /**
   * @param {object} modules - webpack 模块对象
   */
  function patchModules(modules) {
    const patchJobs = [
      // 原“通知列表 size:10→1000”补丁已移除：大分页疑似导致“标记已读”失效，且展示上千条通知并无必要
      {
        name: "studentHomepage",
        identifiers: ['name:"studentHomepage"', "tapUndone", "tapSiteItem"],
        patched: !GM_getValue("home_openInNewTab", true),
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
      // ,{
      //     name: 'anotherModule',
      //     identifiers: ['...'],
      //     patched: false,
      //     replacements: [ ... ]
      // } // <-- 新 Hook 示例
    ];

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

    const totalPatchesNeeded = patchJobs.length;
    let patchesApplied = 0;

    for (const moduleId in modules) {
      if (patchesApplied === totalPatchesNeeded) {
        break;
      }
      const originalModule = modules[moduleId];
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
              patchesApplied++;
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

    if (patchesApplied < totalPatchesNeeded) {
      console.warn(
        `[ucloud-Enhanced] Patch 结束，但未完成全部 patch：${patchesApplied}/${totalPatchesNeeded}。`
      );
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
      const url = new URLSearchParams(location.search).get("furl");
      const filename =
        new URLSearchParams(location.search).get("fullfilename") || url;
      const viewURL = new URL(url);
      if (new URLSearchParams(location.search).get("oauthKey")) {
        const viewURLsearch = new URLSearchParams(viewURL.search);
        viewURLsearch.set(
          "oauthKey",
          new URLSearchParams(location.search).get("oauthKey")
        );
        viewURL.search = viewURLsearch.toString();
      }
      if (
        filename.endsWith(".xls") ||
        filename.endsWith(".xlsx") ||
        filename.endsWith(".doc") ||
        filename.endsWith(".docx") ||
        filename.endsWith(".ppt") ||
        filename.endsWith(".pptx")
      ) {
        if (!GM_getValue("preview_autoSwitchOffice", false)) {
          return;
        }
        if (window.stop) window.stop();
        location.href =
          "https://view.officeapps.live.com/op/view.aspx?src=" +
          encodeURIComponent(viewURL.toString());
        return;
      } else if (filename.endsWith(".pdf")) {
        if (!GM_getValue("preview_autoSwitchPdf", true)) {
          return;
        }
        if (window.stop) window.stop();
        // 使用浏览器内置预览器，转blob避免出现下载动作
        fetch(viewURL.toString())
          .then((response) => response.blob())
          .then((blob) => {
            const blobUrl = URL.createObjectURL(blob);
            location.href = blobUrl;
          })
          .catch((err) => console.error("PDF加载失败:", err));
        return;
      } else if (
        filename.endsWith(".jpg") ||
        filename.endsWith(".png") ||
        filename.endsWith(".jpeg") ||
        filename.endsWith(".gif") ||
        filename.endsWith(".webp") ||
        filename.endsWith(".bmp") ||
        filename.endsWith(".tiff") ||
        filename.endsWith(".svg")
      ) {
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
              <div class="viewer-title">${getImageFileName(imageUrl)}</div>
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
              <img id="viewer-img" class="viewer-image" src="${imageUrl}" alt="预览图片" draggable="false">
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

              // Get the position relative to the image's natural center
              const naturalWidth = image.naturalWidth;
              const naturalHeight = image.naturalHeight;

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
                const touchDistance = Math.sqrt(dx * dx + dy * dy);
                const scaleFactor = touchDistance / lastTouchDistance;

                if (
                  !isNaN(scaleFactor) &&
                  isFinite(scaleFactor) &&
                  scaleFactor > 0
                ) {
                  const oldScale = state.scale;
                  state.scale = Math.max(
                    0.1,
                    Math.min(10, state.scale * scaleFactor)
                  );

                  const centerX =
                    (e.touches[0].clientX + e.touches[1].clientX) / 2;
                  const centerY =
                    (e.touches[0].clientY + e.touches[1].clientY) / 2;

                  const imageRect = image.getBoundingClientRect();

                  const imageX =
                    centerX - (imageRect.left + imageRect.width / 2);
                  const imageY =
                    centerY - (imageRect.top + imageRect.height / 2);

                  state.translateX += imageX * (1 - scaleFactor);
                  state.translateY += imageY * (1 - scaleFactor);

                  lastTouchDistance = touchDistance;
                }

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
                  const oldScale = state.scale;
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
                closeViewer();
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
(function () {
  document.addEventListener("DOMContentLoaded", initializeExtension);
  const settingsConfig = {
    home: {
      emoji: '👤',
      title: '个人主页',
      items: {
        useBiggerButton: {
          type: 'checkbox',
          quick: true,
          label: '加大翻页按钮尺寸',
          description: '增大个人主页翻页按钮的尺寸和点击区域，提升操作便捷性。',
          defaultValue: true
        },
        openInNewTab: {
          type: 'checkbox',
          quick: true,
          label: '在新标签中打开详情页',
          description: '个人主页中的课程和作业详情链接将在新标签页中打开，方便多任务处理。',
          defaultValue: true
        },
        addHomeworkSource: {
          type: 'checkbox',
          quick: true,
          label: '待办显示所属课程',
          description: '在主页待办列表的条目上显示其所属课程。',
          defaultValue: true
        },
        showTaskMeta: {
          type: 'checkbox',
          label: '待办显示班级进度',
          description: '在待办条目上显示班级已交人数。待办接口无该字段时，会自动读取一次作业详情；两者都取不到时静默不显示。',
          defaultValue: true
        },
        todoCardSkin: {
          type: 'checkbox',
          label: '待办卡片新样式（试验）',
          description: '为待办卡片加上卡片化外观：圆角描边、课程名标签、截止时间右对齐、状态胶囊；关闭后恢复平台原样。',
          defaultValue: true
        },
        useWheelPageTurner: {
          type: 'checkbox',
          quick: true,
          label: '使用鼠标滚轮翻页',
          description: '可以使用鼠标滚轮来翻动个人主页的"本学期课程"和"待办"。',
          defaultValue: true
        },
        showOverdueBadge: {
          type: 'checkbox',
          quick: true,
          label: '待办截止倒计时',
          description: '在待办旁显示截止倒计时：3天内到期显示橙色剩余时间（精确到天/时/分，每分钟自动更新），已逾期显示红色逾期时长。',
          defaultValue: false
        },
        courseSearchBox: {
          type: 'checkbox',
          label: '本学期课程搜索框',
          description: '在个人主页的"本学期课程"区域增加搜索框，可按课程名、教师或院系快速搜索并打开课程。',
          defaultValue: true
        }
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
        autoSwitchImg: {
          type: 'checkbox',
          label: '使用内置阅读器预览图片文件',
          description: '使用脚本内置的阅读器预览图片，支持缩放、旋转与下载。',
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
    notification: {
      emoji: '📢',
      title: '消息通知',
      items: {
        sortNotificationsByTime: {
          type: 'checkbox',
          label: '通知按时间排序',
          description: '将通知按照时间先后顺序排列，更容易找到最新或最早的通知。',
          defaultValue: true,
        },
        betterNotificationHighlight: {
          type: 'checkbox',
          label: '优化未读通知高亮',
          description: '为未读通知添加更显眼的视觉效果，避免遗漏重要信息。',
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
          description: '每天检查一次新版本，发现更新时弹窗提醒（油猴的原生更新是静默的，弹窗能让你感知版本变化）。',
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

  // 深色模式（Dynamic 主题引擎，处理思路参考 Dark Reader）
  // 不用整页像素级滤镜：遍历元素读取计算样式，在 HSL 空间只重映射亮度——
  // 浅色背景→深色、深色文字→浅色，色相与饱和度原样保留。
  // 彩色内容（品牌蓝、彩色按钮）、图片、渐变装饰天然不受影响，无整体降饱和的"灰蒙蒙"
  const DARK_CANVAS = "#1f2223"; // 页面画布目标色

  function parseRGB(str) {
    if (!str) return null;
    const m = str.match(
      /rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)(?:[,\s/]+([\d.]+)\s*)?\)/
    );
    if (!m) return null;
    return { r: +m[1], g: +m[2], b: +m[3], a: m[4] === undefined ? 1 : +m[4] };
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

  // 背景/边框：接近白的浅色映射为深色（纯白落在 #1f2223 的亮度档）；彩色（饱和度高）与深色保持原样
  // 文字：偏深及中灰的文字映射为浅色，保证深底上的可读性；浅色文字保持原样
  function remapColor(c, kind) {
    const [h, s, l] = rgbToHsl(c.r, c.g, c.b);
    let nl = l;
    if (kind === "text") {
      if (l < 0.62) nl = Math.min(0.86, 0.66 + (0.62 - l) * 0.6);
    } else {
      const grayish = s < 0.25;
      if (l > 0.86 || (grayish && l > 0.6)) nl = 0.115 + (1 - l) * 0.06;
    }
    if (Math.abs(nl - l) < 0.01) return null;
    const [r, g, b] = hslToRGB(h, s, nl);
    return `rgba(${r}, ${g}, ${b}, ${c.a})`;
  }

  function darkenElement(el) {
    // 脚本自身的 UI（悬浮球/面板/通知/主页课程搜索工具栏）自带亮暗双主题配色，不参与引擎重映射
    if (
      el.closest &&
      el.closest(
        "#yzHelper-ball,#yzHelper-quick,#yzHelper-settings,.yz-notify,.yz-lesson-toolbar"
      )
    )
      return;
    // 处理期间临时禁用过渡动画：避免读到插值中的中间色、以及摘除/写入覆盖时反复重启动画
    // （这是悬停样式"卡死不恢复"的根源）；同一次 JS 执行内还原，用户无感知
    const prevTransition = el.style.transition;
    el.style.transition = "none";
    // 先摘除本脚本上次写入的 !important 覆盖，确保读到平台当前真实样式（含 hover/激活态）
    ["background-color", "color", "border-color"].forEach((p) => {
      if (el.style.getPropertyPriority(p) === "important") {
        el.style.removeProperty(p);
      }
    });
    const cs = getComputedStyle(el);
    // 有背景图/渐变的元素整体保留原样（品牌装饰、彩色横幅、图片纹理）
    if (cs.backgroundImage === "none") {
      const bg = parseRGB(cs.backgroundColor);
      if (bg && bg.a > 0) {
        const nb = remapColor(bg, "bg");
        if (nb) el.style.setProperty("background-color", nb, "important");
      }
    }
    const fg = parseRGB(cs.color);
    if (fg) {
      const nc = remapColor(fg, "text");
      if (nc) el.style.setProperty("color", nc, "important");
    }
    const bd = parseRGB(cs.borderTopColor);
    if (bd && bd.a > 0) {
      const nb = remapColor(bd, "border");
      if (nb) el.style.setProperty("border-color", nb, "important");
    }
    el.style.transition = prevTransition;
    el.dataset.ueDark = "1";
  }

  let darkThemeObserver = null;

  // 自动深色：开关开启且系统为深色外观时才生效，系统切换时即时响应
  const darkMediaQuery =
    window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)");
  const systemPrefersDark = () => !!(darkMediaQuery && darkMediaQuery.matches);
  const isDarkActive = () => !!settings.system.darkMode && systemPrefersDark();

  function applyDynamicDarkTheme() {
    if (darkThemeObserver) {
      darkThemeObserver.disconnect();
      darkThemeObserver = null;
    }
    if (!isDarkActive() || !document.body) return;
    document.querySelectorAll("html, body, body *").forEach(darkenElement);
    // SPA 动态渲染的元素在 MutationObserver 回调内同步处理：
    // 回调运行在 DOM 变更之后、浏览器绘制之前，处理完才绘制，从原理上消除闪白
    darkThemeObserver = new MutationObserver((records) => {
      for (const r of records) {
        r.addedNodes.forEach((node) => {
          if (node.nodeType !== Node.ELEMENT_NODE) return;
          darkenElement(node);
          node.querySelectorAll("*").forEach(darkenElement);
        });
      }
    });
    darkThemeObserver.observe(document.body, { childList: true, subtree: true });
  }

  // 悬停处理：hover 是 CSS 伪类改变计算样式，MutationObserver 感知不到；
  // 在 pointerover 时对目标及少量祖先链当场重跑映射（此刻读到的即悬停色），
  // pointerout 后延迟重跑恢复常态
  function buildAncestorChain(el) {
    const chain = [];
    let node = el;
    for (let i = 0; node && node !== document.body && i < 6; i++) {
      chain.push(node);
      node = node.parentElement;
    }
    return chain;
  }

  function installHoverHandler() {
    document.addEventListener(
      "pointerover",
      (e) => {
        if (!isDarkActive() || !e.target || e.target === document)
          return;
        // 悬停发生的瞬间处理目标及其祖先链，此刻读到的即悬停色
        buildAncestorChain(e.target).forEach(darkenElement);
      },
      true
    );
    document.addEventListener(
      "pointerout",
      (e) => {
        if (!isDarkActive() || !e.target || e.target === document)
          return;
        const chain = buildAncestorChain(e.target);
        // 鼠标只是移入链内子元素：交给后续 pointerover，此处不处理
        if (e.relatedTarget && chain.includes(e.relatedTarget)) return;
        // 真正离开：延迟重映射恢复正常态；双保险覆盖 hover 状态更新与残余动画时序。
        // darkenElement 每次都读实时计算样式且处理期间禁用过渡，重复处理天然自纠错
        setTimeout(() => chain.forEach(darkenElement), 80);
        setTimeout(() => chain.forEach(darkenElement), 320);
      },
      true
    );
  }

  function applyDarkMode() {
    document.documentElement.classList.toggle("ue-dark-mode", isDarkActive());
    applyDynamicDarkTheme();
  }

  const DARK_MODE_CSS = `
    html.ue-dark-mode, html.ue-dark-mode body { background: ${DARK_CANVAS} !important; }
    /* SPA 路由切换时新容器先于引擎处理渲染，静态深色兜底消除白屏闪烁 */
    html.ue-dark-mode #layout-container,
    html.ue-dark-mode .main-content,
    html.ue-dark-mode .router-container { background-color: ${DARK_CANVAS} !important; }
  `;
  // document-start 阶段先铺画布色，DOM 就绪后由引擎做完整处理（见 initializeExtension）
  GM_addStyle(DARK_MODE_CSS);
  applyDarkMode();
  // 跟随系统深色外观的变化即时切换（无需刷新）
  if (darkMediaQuery && darkMediaQuery.addEventListener) {
    darkMediaQuery.addEventListener("change", () => applyDarkMode());
  }

  // 辅助变量
  let sumBytes = 0,
    loadedBytes = 0,
    downloading = false;
  let gpage = -1;
  let glist = null;
  let onlinePreview = null;

  // 修复：主页"在新标签页打开"的详情页没有历史记录，页面内任何返回入口（标题栏左箭头等，
  // 底层都是 $router.back() → history.go(-1)）都是空操作。这里直接拦截 history.go/back：
  // 无历史可退且本页由 window.open 打开时改为关闭标签页，行为上等同返回。不依赖按钮选择器
  function installBackButtonFix() {
    const win = typeof unsafeWindow !== "undefined" ? unsafeWindow : window;
    const hist = win.history;
    const originalGo = hist.go.bind(hist);
    const originalBack = hist.back.bind(hist);
    const noHistory = () => hist.length <= 1 && win.opener;
    hist.go = function (delta) {
      if (delta === -1 && noHistory()) return win.close();
      return originalGo(delta);
    };
    hist.back = function () {
      if (noHistory()) return win.close();
      return originalBack();
    };
  }

  // 初始化扩展功能
  function initializeExtension() {
    // 注册菜单命令
    registerMenuCommands();

    const nprogressCSS = GM_getResourceText("NPROGRESS_CSS");
    GM_addStyle(nprogressCSS);

    loadui();

    addFunctionalCSS();
    installBackButtonFix();
    applyDynamicDarkTheme();
    installHoverHandler();
    setTimeout(main, 100);

    if (settings.system.autoUpdate) {
      checkForUpdates();
    }

    window.addEventListener("hashchange", () => {
      setTimeout(main, 500);
    });
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

    GM_registerMenuCommand("⚙️ 打开插件设置", () => {
      if (
        document
          .getElementById("yzHelper-settings")
          .classList.contains("visible")
      ) {
        document
          .getElementById("yzHelper-settings")
          .classList.remove("visible");
        setTimeout(() => {
          document.getElementById("yzHelper-settings").style.display = "none";
        }, 300);
        return;
      }
      document.getElementById("yzHelper-settings").style.display = "flex";
      void document.getElementById("yzHelper-settings").offsetWidth;
      document.getElementById("yzHelper-settings").classList.add("visible");
    });
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
  // ===== 通知组件（更新提醒 / 通用提示）：与助手 UI 同一套设计语言，亮/暗自适应 =====
  const NOTIFY_CSS = `
    .yz-notify {
      position: fixed;
      bottom: 84px;
      right: 20px;
      z-index: 10002;
      max-width: 300px;
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
    .yz-notify .notify-actions { display: flex; gap: 8px; margin-top: 12px; }
    .yz-notify .notify-btn {
      border: none; border-radius: 8px; padding: 6px 14px;
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

  function showUpdateNotification(newVersion) {
    const notification = document.createElement("div");
    notification.className = "yz-notify";
    notification.innerHTML = `
      <div class="notify-title"><span class="notify-dot"></span>发现新版本 v${newVersion}</div>
      <div class="notify-msg">当前版本 v${GM_info.script.version}，更新后可在 README 查看变更内容。</div>
      <div class="notify-actions">
        <button class="notify-btn primary" data-act="update">立即更新</button>
        <button class="notify-btn ghost" data-act="later">稍后提醒</button>
      </div>
    `;
    document.body.appendChild(notification);
    requestAnimationFrame(() => notification.classList.add("visible"));
    notification.addEventListener("click", (e) => {
      const act = e.target.dataset && e.target.dataset.act;
      if (act === "update") openTab(GM_info.script.downloadURL, { active: true });
      if (act) {
        notification.classList.remove("visible");
        setTimeout(() => notification.remove(), 300);
      }
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
    const ONE_DAY = 24 * 60 * 60 * 1000; // 一天的毫秒数

    if (!force && now - lastCheckTime <= ONE_DAY) {
      if (onDone) onDone();
      return;
    }
    GM_setValue("lastUpdateCheck", now);

    const trySource = (index) => {
      if (index >= UPDATE_CHECK_SOURCES.length) {
        if (force) {
          showNotification("检查失败", "所有更新源均无法访问，请稍后再试");
        }
        if (onDone) onDone();
        return;
      }
      GM_xmlhttpRequest({
        method: "GET",
        url: UPDATE_CHECK_SOURCES[index],
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
            showUpdateNotification(latestVersion);
          } else if (force) {
            showNotification("已是最新版本", "当前版本 v" + currentVersion);
          }
          if (onDone) onDone();
        },
        onerror: function () {
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
      #yzHelper-quick .quick-footer {
          display: flex;
          align-items: center;
          justify-content: space-between;
          border-top: 1px solid var(--ue-border);
          margin-top: 6px;
          padding: 8px 8px 2px;
      }
      #yzHelper-quick .quick-all {
          background: var(--ue-accent-weak);
          color: var(--ue-accent);
          border: none;
          border-radius: 8px;
          padding: 6px 12px;
          font-size: 12.5px;
          font-weight: 600;
          cursor: pointer;
      }
      #yzHelper-quick .quick-all:hover {
          background: var(--ue-accent);
          color: #fff;
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
          z-index: 10001;
          width: 560px;
          height: 480px;
          color: var(--ue-text);
          overflow: hidden;
          display: flex;
          flex-direction: column;
          display: none;
          opacity: 0;
          transform: translateY(10px) scale(0.98);
          transition: opacity 0.25s ease, transform 0.25s ease;
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

    // ===== 即改即存：改动立即写入并自动刷新生效 =====
    let applyReloadTimer = null;

    function saveSettingAndApply(category, key, value) {
      settings[category][key] = value;
      GM_setValue(`${category}_${key}`, value);
      // 深色模式先即时生效，随后的刷新保证所有设置整体一致
      if (category === "system" && key === "darkMode") applyDarkMode();
      showNotification("已保存", "即将刷新生效…");
      clearTimeout(applyReloadTimer);
      applyReloadTimer = setTimeout(() => location.reload(), 700);
    }

    function bindAutoSave(container) {
      container.addEventListener("change", (e) => {
        const input = e.target;
        if (!input || !input.id || !input.id.includes("_")) return;
        const [category, settingName] = input.id.split("_");
        if (!settings[category]) return;
        if (input.type === "checkbox") {
          saveSettingAndApply(category, settingName, input.checked);
        }
      });
    }

    // ===== 快捷面板：高频开关直拨 =====
    const quickPanel = document.createElement("div");
    quickPanel.id = "yzHelper-quick";

    function buildQuickPanel() {
      const rows = [];
      for (const [category, config] of Object.entries(settingsConfig)) {
        for (const [key, item] of Object.entries(config.items)) {
          if (!item.quick) continue;
          const settingId = `${category}_${key}`;
          rows.push(`
            <div class="quick-item">
              <span class="setting-label">${item.label}</span>
              <label class="switch">
                <input type="checkbox" id="${settingId}" ${
            settings[category][key] ? "checked" : ""
          }>
                <span class="slider"></span>
              </label>
            </div>
          `);
        }
      }
      quickPanel.innerHTML = `
        <div class="quick-title">快捷开关</div>
        ${rows.join("")}
        <div class="quick-footer">
          <button class="quick-all" id="yzHelper-quick-all">⚙ 全部设置</button>
          <span class="quick-ver">v${GM_info.script.version}</span>
        </div>
      `;
    }

    function positionQuickPanel() {
      const rect = ball.getBoundingClientRect();
      const width = 262;
      let left = rect.left + rect.width / 2 - width / 2;
      left = Math.max(10, Math.min(left, window.innerWidth - width - 10));
      quickPanel.style.left = left + "px";
      if (rect.top > 320) {
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
      if (e.target.closest("#yzHelper-quick-all")) {
        closeQuickPanel();
        settingsTrigger();
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

    // 生成单个设置项的HTML（当前全部设置项均为开关型；数字输入型已随"最近使用"功能移除）
    function generateSettingItem(category, key, item) {
      const settingId = `${category}_${key}`;
      const value = settings[category][key];
      const disabledAttr = item.disabled ? 'disabled' : '';
      const checkedAttr = value ? 'checked' : '';
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

    // 生成设置区块的HTML（标题不在内容区重复显示，由侧边栏高亮指示当前分类）
    function generateSettingsSection(category, config, isActive = false) {
      const activeClass = isActive ? 'active' : '';
      const items = config.items;
      const itemsHTML = Object.keys(items).map(key =>
        generateSettingItem(category, key, items[key])
      ).join('');

      return `
        <div class="settings-section ${activeClass}" id="section-${category}">
          ${itemsHTML}
        </div>
      `;
    }

    // 生成侧边栏菜单HTML
    function generateSidebarMenu() {
      const categories = Object.keys(settingsConfig);
      return categories.map((category, index) => {
        const config = settingsConfig[category];
        const activeClass = index === 0 ? 'active' : '';
        return `
          <div class="menu-item ${activeClass}" data-section="${category}">
            <span class="emoji">${config.emoji}</span>
            <span>${config.title.replace(/^[^\s]+\s/, '')}</span>
          </div>
        `;
      }).join('') + `
        <div class="menu-item" data-section="about">
          <span class="emoji">ℹ️</span>
          <span>关于助手</span>
        </div>
      `;
    }

    // 生成所有设置区块HTML
    function generateAllSections() {
      let sectionsHTML = '';
      let isFirst = true;
      
      const categories = Object.keys(settingsConfig);
      for (const category of categories) {
        sectionsHTML += generateSettingsSection(category, settingsConfig[category], isFirst);
        isFirst = false;
      }
      
      // 添加关于助手区块
      sectionsHTML += `
        <div class="settings-section" id="section-about">
          <div class="about-content">
            <p>云邮教学空间助手是一款专为云邮教学空间平台设计的浏览器增强脚本。</p>

            <h4>🚀 主要功能</h4>
            <ul>
              <li>📍 个人主页优化 - 智能布局，提升交互体验</li>
              <li>🔍 课程搜索 - 快速搜索并打开"本学期课程"</li>
              <li>📄 课件预览增强 - 流畅浏览，轻松获取学习资源</li>
              <li>📥 课程管理优化 - 批量下载，多样化下载选项</li>
              <li>📋 作业管理助手 - 精准显示课程归属，提高管理效率</li>
              <li>🔔 通知管理优化 - 智能整理，突出重点通知</li>
              <li>🛠️ 系统功能增强 - 页面标题优化，解除复制限制等实用功能</li>
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
              <span class="about-update-tip">每天自动检查一次，也可手动检查</span>
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
    document.querySelectorAll(".setting-label").forEach((label) => {
      label.addEventListener("click", function () {
        const descriptionId = this.getAttribute("data-for");
        const description = document.getElementById(descriptionId);

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

    function settingsTrigger() {
      const isVisible = settingsPanel.classList.contains("visible");
      if (isVisible) {
        settingsPanel.classList.remove("visible");
        setTimeout(() => {
          settingsPanel.style.display = "none";
        }, 300);
      } else {
        settingsPanel.style.display = "flex";
        void settingsPanel.offsetWidth;
        settingsPanel.classList.add("visible");
      }
    }

    // 主面板关闭按钮（与 settingsTrigger 等效切换）
    document
      .getElementById("yzHelper-close")
      .addEventListener("click", settingsTrigger);

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

    const ul_observer = new MutationObserver((mutations) => {
      const dropdownMenus = document.querySelectorAll(
        'ul.el-dropdown-menu.el-popper.dropdown-info[id*="dropdown-menu"]'
      );

      if (dropdownMenus.length > 0) {
        dropdownMenus.forEach((menu) => {
          if (!menu.querySelector(".plugin-settings-item")) {
            const settingsItem = document.createElement("li");
            settingsItem.setAttribute("tabindex", "-1");
            settingsItem.classList.add(
              "el-dropdown-menu__item",
              "plugin-settings-item"
            );
            settingsItem.innerHTML = "<!---->插件设置";
            settingsItem.addEventListener("click", settingsTrigger);
            menu.appendChild(settingsItem);
          }
        });
        ul_observer.disconnect();
      }
    });
    ul_observer.observe(document.body, {
      childList: true,
      subtree: true,
    });
  }

  // 通知函数
  function showNotification(title, message) {
    const notification = document.createElement("div");
    notification.className = "yz-notify";
    notification.innerHTML = `
      <div class="notify-title"><span class="notify-dot"></span>${title}</div>
      <div class="notify-msg">${message}</div>
    `;
    document.body.appendChild(notification);
    requestAnimationFrame(() => notification.classList.add("visible"));
    setTimeout(() => {
      notification.classList.remove("visible");
      setTimeout(() => notification.remove(), 300);
    }, 3000);
  }

  // 获取Token
  function getToken() {
    const cookieMap = new Map();
    document.cookie.split("; ").forEach((cookie) => {
      const [key, value] = cookie.split("=");
      cookieMap.set(key, value);
    });
    const token = cookieMap.get("iClass-token");
    const userid = cookieMap.get("iClass-uuid");
    return [userid, token];
  }

  // 平台 API 请求统一封装：公共鉴权头 + JSON 解析
  // 所有 apiucloud.bupt.edu.cn 的接口调用都应走这里（getPreviewURL 除外：其 CORS 不带鉴权头，保持原样）
  const API_BASE = "https://apiucloud.bupt.edu.cn/";

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
    return res.json();
  }

  // 文件下载相关函数
  async function downloadFile(url, filename) {
    console.debug("Call download");
    downloading = true;
    NProgress.configure({ trickle: false, speed: 0 });
    try {
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const contentLength = response.headers.get("content-length");
      if (!contentLength) {
        throw new Error("Content-Length response header unavailable");
      }

      const total = parseInt(contentLength, 10);
      sumBytes += total;
      const reader = response.body.getReader();
      const chunks = [];
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (!downloading) {
          NProgress.done();
          return;
        }
        chunks.push(value);
        loadedBytes += value.length;
        NProgress.set(loadedBytes / sumBytes);
      }
      NProgress.done();
      sumBytes -= total;
      loadedBytes -= total;
      const blob = new Blob(chunks);
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = downloadUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(downloadUrl);
    } catch (error) {
      console.error("Download failed:", error);
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

  // 搜索课程：把一批活动ID匹配到所属课程（作业与测试两类活动并行扫描）
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
        batch.map(async (x) => {
          const [works, exams] = await Promise.all([
            getTasks(x.id),
            getExams(x.id),
          ]);
          const worksRecords =
            (works && works.data && works.data.records) || [];
          return { course: x, records: worksRecords.concat(exams) };
        })
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

  // 获取站点资源
  async function getSiteResource(id) {
    const [userid] = getToken();
    const json = await apiFetch(
      "ykt-site/site-resource/tree/student?siteId=" + id + "&userId=" + userid,
      { method: "POST" }
    );
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
    foreach(json.data);
    return result;
  }

  // 待办截止倒计时：把剩余毫秒差换算成分档文案与配色
  // 只保留 3 天内的提醒（3 天以上返回 null，不显示），避免卡片被长期待办淹没
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
    return null;
  }

  // 已渲染倒计时徽标的节点 → 截止时间，供每分钟刷新；节点失效后自动剔除
  const countdownBadges = new Map();
  let countdownTimer = null;

  function parseDeadline(endTime) {
    if (!endTime) return null;
    const d = new Date(String(endTime).replace(" ", "T"));
    return isNaN(d.getTime()) ? null : d;
  }

  // 待办卡片统一的信息行（倒计时 + 班级进度共用），不存在时创建
  function ensureTaskMeta(host) {
    if (!host) return null;
    let meta = host.querySelector(".yz-task-meta");
    if (!meta) {
      meta = document.createElement("div");
      meta.className = "yz-task-meta";
      host.appendChild(meta);
    }
    return meta;
  }

  function renderCountdownBadge(node, endTime) {
    if (!node || !node.isConnected) return;
    const titleEl = node.querySelector(".activity-title");
    if (!titleEl) return;
    const end = parseDeadline(endTime);
    if (!end) return;
    const info = formatRemain(end - Date.now());
    const meta = ensureTaskMeta(node.children && node.children[1]);
    const scope = meta || titleEl;
    let badge = scope.querySelector(".yz-overdue-badge");
    if (!info) {
      if (badge) badge.remove();
      countdownBadges.delete(node);
      return;
    }
    if (!badge) {
      badge = document.createElement("span");
      if (meta) meta.insertBefore(badge, meta.firstChild);
      else titleEl.appendChild(badge);
    }
    badge.className = "yz-overdue-badge " + info.cls;
    badge.textContent = info.text;
    countdownBadges.set(node, endTime);
    ensureCountdownTicker();
  }

  // 每 60 秒重算一次，让倒计时在页面停留时自然走动；全部节点消失后自动停表
  function ensureCountdownTicker() {
    if (countdownTimer) return;
    countdownTimer = setInterval(() => {
      for (const [node, endTime] of countdownBadges) {
        if (!node.isConnected) {
          countdownBadges.delete(node);
          continue;
        }
        renderCountdownBadge(node, endTime);
      }
      if (countdownBadges.size === 0) {
        clearInterval(countdownTimer);
        countdownTimer = null;
      }
    }, 60 * 1000);
  }

  // 待办卡片补充信息：满分、作业模式、附件数、互评、班级已交人数
  // 待办接口字段优先；缺失时按 activityId 拉一次作业详情并缓存
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

  function collectDirectInfo(task) {
    const info = {};
    const stat = normalizeStat(task.totalNum, task.noSubmitNum);
    if (stat) info.stat = stat;
    const mode = pickModeName(task.assignmentType);
    if (mode) info.mode = mode;
    if (Number(task.isOpenEvaluation) === 1) info.evaluation = true;
    return info;
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

  function paintTaskChips(host, info) {
    if (!host || !host.isConnected) return;
    const meta = ensureTaskMeta(host);
    if (!meta) return;
    meta.querySelectorAll(".yz-task-chip").forEach((c) => c.remove());
    if (!info) return;
    const chips = [];
    if (info.mode) {
      chips.push({
        text: (info.mode === "小组作业" ? "👥 " : "👤 ") + info.mode,
        cls: "mode",
      });
    }
    if (info.attachments) chips.push({ text: "附件 " + info.attachments, cls: "info" });
    if (info.evaluation) chips.push({ text: "互评", cls: "info" });
    if (info.stat) {
      chips.push({
        text: "班级已交 " + info.stat.submitted + " / " + info.stat.total + " 人",
        cls: "",
      });
    }
    chips.forEach((c) => {
      const chip = document.createElement("span");
      chip.className = "yz-task-chip" + (c.cls ? " " + c.cls : "");
      chip.textContent = c.text;
      meta.appendChild(chip);
    });
  }

  function renderTaskMeta(node, task) {
    if (!node || !node.isConnected || !task) return;
    const host = node.children && node.children[1];
    if (!host) return;
    const direct = collectDirectInfo(task);
    if (Object.keys(direct).length) paintTaskChips(host, direct);
    fetchAssignmentInfo(task).then((info) => {
      if (!node.isConnected) return;
      paintTaskChips(host, info || direct);
    });
  }

  // 更新作业显示
  async function updateAssignmentDisplay(list, page) {
    if (!list || list.length === 0) return;

    // 获取当前页的作业
    const tlist = list.slice((page - 1) * 6, page * 6);
    if (tlist.length === 0) return;

    // 获取课程信息
    const ids = tlist.map((x) => x.activityId);
    const infos = await searchCourses(ids);

    // 确保所有信息都已获取到
    if (Object.keys(infos).length === 0) return;

    // 准备显示文本
    // 课程扫描已结束仍无结果的，如实显示"未知课程"，而不是永远停留在"加载中..."
    const texts = tlist.map((x) => {
      const info = infos[x.activityId];
      return info ? `${info.name}(${info.teachers})` : "未知课程";
    });

    // 按活动标题把待办项与 DOM 节点对齐，避免渲染顺序与列表顺序不一致时课程名贴错
    const titleIndexes = new Map();
    tlist.forEach((x, i) => {
      const title = (x.activityName || "").trim();
      if (!title) return;
      if (!titleIndexes.has(title)) titleIndexes.set(title, []);
      titleIndexes.get(title).push(i);
    });
    const usedIndexes = new Set();
    const pickTextIndex = (node, fallback) => {
      const titleEl = node.querySelector(".activity-title");
      if (titleEl) {
        const clone = titleEl.cloneNode(true);
        clone.querySelectorAll(".yz-overdue-badge").forEach((b) => b.remove());
        const queue = titleIndexes.get((clone.textContent || "").trim());
        while (queue && queue.length) {
          const idx = queue.shift();
          if (!usedIndexes.has(idx)) {
            usedIndexes.add(idx);
            return idx;
          }
        }
      }
      if (!usedIndexes.has(fallback)) {
        usedIndexes.add(fallback);
        return fallback;
      }
      const free = tlist.findIndex((_, k) => !usedIndexes.has(k));
      if (free >= 0) {
        usedIndexes.add(free);
        return free;
      }
      return fallback;
    };

    // 等待作业元素显示
    const timeout = 5000; // 5秒超时
    const startTime = Date.now();

    let nodes;
    while (Date.now() - startTime < timeout) {
      nodes = $x(
        '//*[@id="layout-container"]/div[2]/div[2]/div/div[2]/div[1]/div[3]/div[2]/div/div'
      );
      if (
        nodes.length > 0 &&
        nodes.some((node) => node.children[0] && node.children[0].innerText)
      ) {
        break;
      }
      await sleep(100);
    }

    // 更新课程信息显示
    const skin = !!settings.home.todoCardSkin;
    for (let i = 0; i < Math.min(nodes.length, texts.length); i++) {
      const idx = pickTextIndex(nodes[i], i);
      const card = nodes[i];
      if (card && card.classList) card.classList.toggle("yz-task-card", skin);
      if (card && card.children[1]) {
        const host = card.children[1];
        if (host.children.length === 0) {
          const p = document.createElement("div");
          p.className = "yz-task-course";
          const t = document.createTextNode(texts[idx]);
          p.appendChild(t);
          p.style.color = "#0066cc";
          host.insertAdjacentElement("afterbegin", p);
        } else {
          host.children[0].innerHTML = texts[idx];
          host.children[0].style.color = "#0066cc";
          if (host.children[0].classList) host.children[0].classList.add("yz-task-course");
        }
      }
      if (settings.home.showTaskMeta && tlist[idx]) {
        renderTaskMeta(nodes[i], tlist[idx]);
      }
      if (settings.home.showOverdueBadge && tlist[idx] && tlist[idx].endTime) {
        renderCountdownBadge(nodes[i], tlist[idx].endTime);
      }
    }

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

  // 本地存储
  function set(k, v) {
    const h = JSON.parse(localStorage.getItem("zzxw") || "{}");
    h[k] = v;
    localStorage.setItem("zzxw", JSON.stringify(h));
  }

  function get(k) {
    const h = JSON.parse(localStorage.getItem("zzxw") || "{}");
    return h[k];
  }

  // 插入课程信息
  function insert(x) {
    if (!x) return;
    if (
      $x(
        "/html/body/div[1]/div/div[2]/div[2]/div/div/div[2]/div/div[2]/div[1]/div/div/div[1]/div/p"
      ).length > 2
    )
      return;
    const d = $x(
      "/html/body/div[1]/div/div[2]/div[2]/div/div/div[2]/div/div[2]/div[1]/div/div/div[1]/div/p[1]"
    );
    if (!d.length) {
      setTimeout(() => insert(x), 50);
      return;
    }
    // 检查是否已经插入过
    const existingText = Array.from(d[0].parentNode.childNodes).some(
      (node) => node.textContent && node.textContent.includes(x.name)
    );

    if (!existingText) {
      const p = document.createElement("p");
      const label = x.name + "(" + x.teachers + ")";
      // 有课程 ID 时渲染成可点击链接，复用主页搜索框的跳转逻辑；
      // 早期版本缓存下来的无 ID 记录仍按纯文本显示，避免点击无响应
      if (x.id) {
        const link = document.createElement("span");
        link.className = "yz-course-link";
        link.textContent = label;
        link.title = "点击进入课程主页";
        link.addEventListener("click", (e) => {
          e.preventDefault();
          e.stopPropagation();
          openCoursePage(x);
        });
        p.appendChild(link);
      } else {
        p.appendChild(document.createTextNode(label));
      }
      d[0].after(p);
    }
  }

  // 辅助函数
  function sleep(n) {
    return new Promise((res) => setTimeout(res, n));
  }

  async function wait(func) {
    let r = func();
    if (r instanceof Promise) r = await r;
    if (r) return r;
    await sleep(50);
    return await wait(func);
  }

  // 首页"本学期课程"：课程搜索框
  let courseListCache = null;
  let courseListPromise = null;
  let courseListLoading = false;

  function getCookie(name) {
    const target = name + "=";
    for (const part of document.cookie.split("; ")) {
      if (part.startsWith(target)) return part.slice(target.length);
    }
    return null;
  }

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
    if (settings.home.openInNewTab) {
      window.open(url, "_blank");
    } else {
      window.location.href = url;
    }
  }

  function findLessonSection() {
    const sections = document.querySelectorAll(
      "#layout-container .teacher-home-page .home-left-container .my-lesson-section"
    );
    let fallback = null;
    for (const section of sections) {
      const label = section.querySelector(".my-lesson-header .header-label");
      const text = label ? label.textContent.trim() : "";
      if (text === "本学期课程") return section;
      if (
        !fallback &&
        (text === "我的主讲课程" || text === "我担任助教的课堂") &&
        section.querySelector(".my-lesson-banner")
      ) {
        fallback = section;
      }
    }
    return fallback;
  }

  async function waitForLessonSection(timeout = 15000) {
    const start = Date.now();
    while (Date.now() - start < timeout) {
      const section = findLessonSection();
      if (section) return section;
      await sleep(200);
    }
    return null;
  }

  async function setupLessonSearch() {
    if (!settings.home.courseSearchBox) return;
    const section = await waitForLessonSection();
    if (!section || section.querySelector(".yz-lesson-toolbar")) return;
    const header = section.querySelector(".my-lesson-header");
    if (!header) return;

    const toolbar = document.createElement("div");
    toolbar.className = "yz-lesson-toolbar";

    let input = null;
    let results = null;
    let activeIndex = -1;

    const hideResults = () => {
      if (!results) return;
      results.hidden = true;
      activeIndex = -1;
    };

    const renderResults = () => {
      if (!results || !input) return;
      const list = courseListCache || [];
      const keyword = input.value.trim().toLowerCase();
      results.innerHTML = "";
      if (courseListLoading || !list.length) {
        const tip = document.createElement("div");
        tip.className = "yz-lesson-search-empty";
        tip.textContent = courseListLoading ? "正在加载课程…" : "暂无课程数据";
        results.appendChild(tip);
        results.hidden = false;
        activeIndex = -1;
        return;
      }
      const scored = [];
      for (const course of list) {
        const name = course.name.toLowerCase();
        let score;
        if (!keyword) score = 0;
        else if (name.startsWith(keyword)) score = 0;
        else if (name.includes(keyword)) score = 1;
        else if (course.teachers.toLowerCase().includes(keyword)) score = 2;
        else if (course.department.toLowerCase().includes(keyword)) score = 3;
        else continue;
        scored.push({ course, score });
      }
      scored.sort((a, b) => a.score - b.score);
      const matched = scored.slice(0, 50).map((x) => x.course);
      if (!matched.length) {
        const tip = document.createElement("div");
        tip.className = "yz-lesson-search-empty";
        tip.textContent = "未找到匹配的课程";
        results.appendChild(tip);
        results.hidden = false;
        activeIndex = -1;
        return;
      }
      matched.forEach((course) => {
        const item = document.createElement("div");
        item.className = "yz-lesson-search-item";
        item.dataset.id = course.id;
        const nameEl = document.createElement("div");
        nameEl.className = "yz-lesson-search-name";
        nameEl.textContent = course.name;
        item.appendChild(nameEl);
        const meta = [course.teachers, course.department]
          .filter(Boolean)
          .join(" · ");
        if (meta) {
          const metaEl = document.createElement("div");
          metaEl.className = "yz-lesson-search-meta";
          metaEl.textContent = meta;
          item.appendChild(metaEl);
        }
        item.addEventListener("click", () => {
          hideResults();
          openCoursePage(course);
        });
        results.appendChild(item);
      });
      activeIndex = -1;
      results.hidden = false;
    };

    if (settings.home.courseSearchBox) {
      const searchWrap = document.createElement("div");
      searchWrap.className = "yz-lesson-search";

      input = document.createElement("input");
      input.type = "text";
      input.className = "yz-lesson-search-input";
      input.placeholder = "搜索课程 / 教师 / 院系";
      input.autocomplete = "off";
      input.spellcheck = false;

      const icon = document.createElement("span");
      icon.className = "yz-lesson-search-icon";
      icon.innerHTML =
        '<svg viewBox="0 0 1024 1024" width="13" height="13" aria-hidden="true"><path d="M448 128a320 320 0 1 1 0 640 320 320 0 0 1 0-640zm0 64a256 256 0 1 0 0 512 256 256 0 0 0 0-512z" fill="#b2b7c2"/><path d="M697.7 651.5l155.4 155.4-45.2 45.2-155.4-155.4z" fill="#b2b7c2"/></svg>';

      results = document.createElement("div");
      results.className = "yz-lesson-search-results";
      results.hidden = true;
      results.addEventListener("mousedown", (e) => e.preventDefault());

      input.addEventListener("focus", async () => {
        renderResults();
        await getCourseList();
        if (document.activeElement === input) renderResults();
      });
      input.addEventListener("input", async () => {
        renderResults();
        await getCourseList();
        if (document.activeElement === input) renderResults();
      });
      input.addEventListener("keydown", (e) => {
        const items = results
          ? Array.from(results.querySelectorAll(".yz-lesson-search-item"))
          : [];
        if (e.key === "ArrowDown" || e.key === "ArrowUp") {
          if (!items.length) return;
          e.preventDefault();
          if (e.key === "ArrowDown") {
            activeIndex = (activeIndex + 1) % items.length;
          } else {
            activeIndex = (activeIndex - 1 + items.length) % items.length;
          }
          items.forEach((item, index) =>
            item.classList.toggle("active", index === activeIndex)
          );
          items[activeIndex].scrollIntoView({ block: "nearest" });
        } else if (e.key === "Enter") {
          if (!items.length) return;
          e.preventDefault();
          const target = items[activeIndex >= 0 ? activeIndex : 0];
          const course = (courseListCache || []).find(
            (c) => c.id === target.dataset.id
          );
          if (course) {
            hideResults();
            openCoursePage(course);
          }
        } else if (e.key === "Escape") {
          hideResults();
          input.blur();
        }
      });
      input.addEventListener("blur", () => setTimeout(hideResults, 150));

      searchWrap.appendChild(input);
      searchWrap.appendChild(icon);
      searchWrap.appendChild(results);
      toolbar.appendChild(searchWrap);
    }

    header.appendChild(toolbar);
  }

  // 预览URL相关
  async function getPreviewURL(storageId) {
    const res = await fetch(
      "https://apiucloud.bupt.edu.cn/blade-source/resource/preview-url?resourceId=" +
        storageId
    );
    const json = await res.json();
    onlinePreview = json.data.onlinePreview;
    return json.data.previewUrl;
  }

  // 启用文本选择 修改按钮尺寸
  function addFunctionalCSS() {
    GM_addStyle(`
    .teacher-home-page .home-left-container .in-progress-section .in-progress-body .in-progress-item .activity-box .activity-title {
      height: auto !important;
    }
    #layout-container > div.main-content > div.router-container > div > div.my-course-page {
      max-height: none !important;
    }
    `);
    if (settings.homework.showHomeworkSource) {
      GM_addStyle(`
      .yz-course-link {
        color: #0066cc;
        cursor: pointer;
      }
      .yz-course-link:hover {
        text-decoration: underline;
      }
      `);
    }
    if (settings.home.showOverdueBadge) {
      GM_addStyle(`
      .yz-overdue-badge {
        display: inline-block;
        padding: 2px 8px;
        border-radius: 10px;
        font-size: 12px;
        font-weight: 600;
        margin-left: 8px;
        vertical-align: middle;
        line-height: 1.4;
        white-space: nowrap;
        font-variant-numeric: tabular-nums;
      }
      .yz-overdue-badge.overdue {
        background: #b91c1c;
        color: #fff;
      }
      .yz-overdue-badge.urgent {
        background: #ef4444;
        color: #fff;
      }
      .yz-overdue-badge.soon {
        background: #e6a23c;
        color: #fff;
      }
      `);
    }
    if (settings.home.showTaskMeta) {
      GM_addStyle(`
      .yz-task-meta {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        gap: 6px;
        margin-top: 4px;
        font-size: 12px;
        line-height: 1.4;
      }
      .yz-task-chip {
        display: inline-flex;
        align-items: center;
        padding: 1px 8px;
        border-radius: 999px;
        border: 1px solid rgba(59, 130, 246, 0.35);
        color: #2563eb;
        background: rgba(59, 130, 246, 0.08);
        white-space: nowrap;
      }
      .yz-task-chip.mode {
        border-color: rgba(139, 92, 246, 0.35);
        color: #7c3aed;
        background: rgba(139, 92, 246, 0.1);
      }
      .yz-task-chip.info {
        border-color: rgba(148, 163, 184, 0.35);
        color: #64748b;
        background: rgba(148, 163, 184, 0.1);
      }
      `);
    }
    if (settings.home.todoCardSkin) {
      GM_addStyle(`
      .in-progress-section .in-progress-item.yz-task-card {
        box-sizing: border-box;
        border-radius: 14px;
        background-color: #fff;
        box-shadow: inset 0 0 0 1px #eceff4;
        transition: box-shadow 0.2s ease, transform 0.2s ease;
      }
      .in-progress-section .in-progress-item.yz-task-card:hover {
        box-shadow: inset 0 0 0 1px #d7e0ec, 0 8px 20px rgba(15, 23, 42, 0.08);
        transform: translateY(-1px);
      }
      .yz-task-card .activity-post {
        border-radius: 12px;
      }
      .yz-task-course {
        display: block;
        font-size: 12px;
        line-height: 16px;
        font-weight: 600;
        color: #2563eb !important;
      }
      .yz-task-card .activity-title {
        height: auto !important;
        font-size: 14px;
        line-height: 20px;
        font-weight: 600;
        color: #171725;
      }
      .yz-task-card .yz-task-meta {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        gap: 6px;
        margin-top: 3px;
      }
      .yz-task-card .acitivity-dateline {
        font-size: 12px;
        line-height: 16px;
        color: #94a3b8;
      }
      .yz-task-card .yz-overdue-badge {
        margin-left: 0;
      }
      `);
    }
    if (settings.notification.betterNotificationHighlight) {
      GM_addStyle(`
      .notification-with-dot {
        background-color: #fff8f8 !important;
        border-left: 5px solid #f56c6c !important;
        box-shadow: 0 2px 6px rgba(245, 108, 108, 0.2) !important;
        padding: 0 22px !important;
        margin-bottom: 8px !important;
        border-radius: 4px !important;
        transition: all 0.3s ease !important;
    }
    .notification-with-dot:hover {
        background-color: #fff0f0 !important;
        box-shadow: 0 4px 12px rgba(245, 108, 108, 0.3) !important;
        transform: translateY(-2px) !important;
    }
    `);
    }
    if (settings.system.unlockCopy) {
      GM_addStyle(`
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
      GM_addStyle(`
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
    if (settings.home.courseSearchBox) {
      GM_addStyle(`
      .yz-lesson-toolbar {
        display: flex;
        align-items: center;
        flex-wrap: wrap;
        gap: 8px 12px;
        padding: 12px 24px 0;
        box-sizing: border-box;
      }
      .yz-lesson-search {
        position: relative;
        width: 260px;
        max-width: 100%;
      }
      .yz-lesson-search-input {
        width: 100%;
        height: 34px;
        box-sizing: border-box;
        padding: 0 12px 0 32px;
        border: 1px solid transparent;
        border-radius: 10px;
        background: #f2f3f7;
        color: #171725;
        font-size: 13px;
        outline: none;
        transition: border-color .2s, background .2s, box-shadow .2s;
      }
      .yz-lesson-search-input::placeholder {
        color: #b2b7c2;
      }
      .yz-lesson-search-input:focus {
        border-color: #2962ff;
        background: #fff;
        box-shadow: 0 0 0 3px rgba(41, 98, 255, .12);
      }
      .yz-lesson-search-icon {
        position: absolute;
        top: 50%;
        left: 10px;
        display: flex;
        transform: translateY(-50%);
        pointer-events: none;
      }
      .yz-lesson-search-results {
        position: absolute;
        top: 40px;
        left: 0;
        z-index: 100;
        width: 340px;
        max-width: 70vw;
        max-height: 300px;
        overflow-y: auto;
        padding: 6px;
        box-sizing: border-box;
        background: #fff;
        border: 1px solid rgba(31, 35, 41, .08);
        border-radius: 12px;
        box-shadow: 0 10px 30px rgba(31, 35, 41, .16);
      }
      .yz-lesson-search-item {
        padding: 8px 10px;
        border-radius: 8px;
        cursor: pointer;
        transition: background .15s;
      }
      .yz-lesson-search-item:hover,
      .yz-lesson-search-item.active {
        background: rgba(41, 98, 255, .09);
      }
      .yz-lesson-search-item.active .yz-lesson-search-name {
        color: #2962ff;
      }
      .yz-lesson-search-name {
        font-size: 13px;
        font-weight: 500;
        line-height: 18px;
        color: #171725;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .yz-lesson-search-meta {
        margin-top: 2px;
        font-size: 12px;
        line-height: 16px;
        color: #92929d;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .yz-lesson-search-empty {
        padding: 18px 8px;
        text-align: center;
        font-size: 12px;
        color: #92929d;
      }

      /* 深色模式：本工具栏已豁免页面深色引擎，显式指定深色配色，
         下拉卡片用浅色描边与页面底色明确分层 */
      html.ue-dark-mode .yz-lesson-search-input {
        background: #2a2e31;
        border-color: transparent;
        color: #e8eaed;
      }
      html.ue-dark-mode .yz-lesson-search-input::placeholder {
        color: #8a9099;
      }
      html.ue-dark-mode .yz-lesson-search-input:focus {
        background: #202325;
        border-color: #2962ff;
      }
      html.ue-dark-mode .yz-lesson-search-results {
        background: #202325;
        border-color: rgba(232, 234, 237, 0.16);
        box-shadow: 0 12px 34px rgba(0, 0, 0, 0.55);
      }
      html.ue-dark-mode .yz-lesson-search-name {
        color: #e8eaed;
      }
      html.ue-dark-mode .yz-lesson-search-meta,
      html.ue-dark-mode .yz-lesson-search-empty {
        color: #9aa0a6;
      }
    `);
    }
  }

  // 主函数
  async function main() {
    "use strict";

    // 获取开关的状态（是否开启）
    const fixTicketEnabled = settings.system.fixTicketBug;

    // ticket跳转：仅当开关开启且存在ticket参数时执行
    if (fixTicketEnabled && new URLSearchParams(location.search).get("ticket")?.length) {
      setTimeout(() => {
        location.href = "https://ucloud.bupt.edu.cn/uclass/#/student/homePage";
      }, 500);
      return;
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
      const q = new URLSearchParams(location.href);
      const id = q.get("assignmentId");
      const r = get(id);
      const [userid, token] = getToken();
      const title = q.get("assignmentTitle");
      if (settings.system.betterTitle) {
        const pageTitle = "[作业] " + title + " - 教学云空间";
        document.title = pageTitle;
      }
      if (settings.homework.showHomeworkSource) {
        // 显示相关课程信息
        if (r) {
          insert(r);
        } else {
          if (!id || !title) return;
          try {
            const courseInfo = await searchCourse(id, title);
            if (courseInfo) {
              insert(courseInfo);
              set(id, courseInfo);
            }
          } catch (e) {
            console.error("获取课程信息失败", e);
          }
        }
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

        await wait(
          () =>
            $x('//*[@id="assignment-info"]/div[2]/div[2]/div[2]/div').length > 0
        );

        $x('//*[@id="assignment-info"]/div[2]/div[2]/div[2]/div').forEach(
          (x, index) => {
            if (
              x.querySelector(".by-icon-eye-grey") ||
              x.querySelector(".by-icon-yundown-grey")
            ) {
              x.querySelector(".by-icon-eye-grey").remove();
              x.querySelector(".by-icon-yundown-grey").remove();
            }

            // 添加预览按钮
            const i = document.createElement("i");
            i.title = "预览";
            i.classList.add("by-icon-eye-grey");
            i.addEventListener("click", () => {
              const url = urls[index];
              const filename = filenames[index];
              if (settings.preview.autoDownload) {
                downloadFile(url, filename);
                console.debug("Autodownload");
              }
              if (
                filename.endsWith(".xls") ||
                filename.endsWith(".xlsx") ||
                url.endsWith(".doc") ||
                url.endsWith(".docx") ||
                url.endsWith(".ppt") ||
                url.endsWith(".pptx")
              ) {
                if (settings.preview.autoSwitchOffice) {
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
                }
              } else if (onlinePreview !== null)
                openTab(onlinePreview + encodeURIComponent(url), {
                  active: true,
                  insert: true,
                });
            });

            // 添加下载按钮
            const i2 = document.createElement("i");
            i2.title = "下载";
            i2.classList.add("by-icon-yundown-grey");
            i2.addEventListener("click", () => {
              downloadFile(urls[index], filenames[index]);
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
      if (settings.home.courseSearchBox) {
        setupLessonSearch().catch((e) =>
          console.error("[ucloud-Enhanced] 初始化课程搜索失败", e)
        );
      }
      if (settings.home.addHomeworkSource) {
        // 未完成任务列表
        const list = glist || (await getUndoneList()).data.undoneList;
        if (!list || !Array.isArray(list)) return;
        glist = list;

        let pageCheckTimer = null;
        const observer = new MutationObserver(() => {
          // 防抖：任何 DOM 变动都会触发回调，集中处理避免重复解析
          clearTimeout(pageCheckTimer);
          pageCheckTimer = setTimeout(async () => {
            const pageElement = document.querySelector(
              "#layout-container > div.main-content > div.router-container > div > div.teacher-home-page > div.home-left-container.home-inline-block > div.in-progress-section.home-card > div.in-progress-header > div > div:nth-child(2) > div > div.banner-indicator.home-inline-block"
            );

            if (!pageElement) return;

            // 解析页码
            const currentPage = parseInt(
              pageElement.innerHTML.trim().split("/")[0]
            );
            if (isNaN(currentPage)) return;

            // 页码变化则更新显示
            if (currentPage !== gpage) {
              gpage = currentPage;
              await updateAssignmentDisplay(list, currentPage);
            }
          }, 120);
        });

        observer.observe(document.body, {
          childList: true,
          subtree: true,
          attributes: false,
          characterData: true,
        });

        // 初始化页码
        let page = 1;
        const pageElement = document.querySelector(
          "#layout-container > div.main-content > div.router-container > div > div.teacher-home-page > div.home-left-container.home-inline-block > div.in-progress-section.home-card > div.in-progress-header > div > div:nth-child(2) > div > div.banner-indicator.home-inline-block"
        );

        if (pageElement) {
          page = parseInt(pageElement.innerHTML.trim().split("/")[0]);
          gpage = page;
        }

        // 更新作业显示
        await updateAssignmentDisplay(list, page);
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
        pageConfigs.forEach((config) => {
          const targetDiv = document.querySelector(config.targetSelector);
          const prevPageElement = document.querySelector(
            config.prevPageSelector
          );
          const nextPageElement = document.querySelector(
            config.nextPageSelector
          );
          const pageIndicator = document.querySelector(
            config.pageIndicatorSelector
          );

          if (
            !targetDiv ||
            !prevPageElement ||
            !nextPageElement ||
            !pageIndicator
          )
            return;
          targetDiv.addEventListener(
            "wheel",
            createWheelHandler(prevPageElement, nextPageElement, pageIndicator),
            { passive: false }
          );
        });
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
        const resourceItems = $x(
          '//div[@class="resource-item"]/div[@class="right"]'
        );
        const previewItems = $x(
          '//div[@class="resource-item"]/div[@class="left"]'
        );

        if (resourceItems.length > 0) {
          resourceItems.forEach((x, index) => {
            if (index >= resources.length) return;

            if (settings.preview.autoDownload) {
              previewItems[index].addEventListener(
                "click",
                async (e) => {
                  const url = await getPreviewURL(resources[index].id);
                  downloadFile(url, resources[index].name);
                  console.debug("Autodownload");
                },
                false
              );
            }
            if (settings.course.showAllDownloadButoon) {
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
                  const url = await getPreviewURL(resources[index].id);
                  downloadFile(url, resources[index].name);
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
            if (resourceList.length > 0) {
              const containerElement = document.createElement("div");
              containerElement.innerHTML = downloadAllButton;
              resourceList[0].before(containerElement);

              document.getElementById("downloadAllButton").onclick =
                async () => {
                  downloading = !downloading;
                  if (downloading) {
                    const btn = document.getElementById("downloadAllButton");
                    const totalCount = resources.length;
                    let completedCount = 0;
                    btn.innerHTML = "取消下载 (0/" + totalCount + ")";
                    for (let index = 0; index < resources.length; index++) {
                      if (!downloading) return;
                      const file = resources[index];
                      const shortName = file.name.length > 20 ? file.name.substring(0, 17) + "..." : file.name;
                      btn.innerHTML =
                        "取消下载 " + shortName + " (" + (index + 1) + "/" + totalCount + ")";
                      await downloadFile(
                        await getPreviewURL(file.id),
                        file.name
                      );
                      if (!downloading) return;
                      completedCount++;
                    }
                    if (downloading) {
                      downloading = false;
                      btn.innerHTML = "下载全部";
                    }
                  } else {
                    document.getElementById("downloadAllButton").innerHTML =
                      "下载全部";
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

      function processNotifications() {
        const noticeContainer = document.querySelector(
          "#layout-container > div.main-content > div.router-container > div > div > div.setNotice-body > ul"
        );
        if (!noticeContainer) {
          console.warn("通知容器未找到");
          return;
        }
        const noticeItems = Array.from(noticeContainer.querySelectorAll("li"));
        if (noticeItems.length === 0) {
          console.warn("未找到通知项");
          return;
        }
        if (settings.notification.sortNotificationsByTime) {
          noticeItems.sort((a, b) => {
            const timeA = a.querySelector("span._left-time");
            const timeB = b.querySelector("span._left-time");
            if (!timeA || !timeB) {
              return 0;
            }
            const timeTextA = timeA.textContent.trim();
            const timeTextB = timeB.textContent.trim();
            const dateA = new Date(timeTextA);
            const dateB = new Date(timeTextB);
            return dateB - dateA;
          });
        }
        noticeItems.forEach((item) => {
          if (settings.notification.betterNotificationHighlight) {
            const hasRedDot = item.querySelector(
              "div.el-badge sup.el-badge__content.is-dot"
            );
            if (hasRedDot) {
              item.classList.remove("notification-with-dot");
              item.classList.add("notification-with-dot");
            } else {
              item.classList.remove("notification-with-dot");
            }
          }
          noticeContainer.appendChild(item);
        });
      }
      if (
        settings.notification.sortNotificationsByTime ||
        settings.notification.betterNotificationHighlight
      ) {
        // 等待通知元素加载好了再处理
        const loadingMaskSelector =
          "#layout-container > div.main-content > div.router-container > div > div > div.setNotice-body > div.el-loading-mask";
        const observer = new MutationObserver((mutations) => {
          const loadingMask = document.querySelector(loadingMaskSelector);
          if (loadingMask && loadingMask.style.display === "none") {
            processNotifications();
            observer.disconnect();
          }
        });

        const loadingMask = document.querySelector(loadingMaskSelector);
        if (loadingMask && loadingMask.style.display === "none") {
          processNotifications();
        } else {
          observer.observe(document.body, {
            attributes: true,
            attributeFilter: ["style"],
            subtree: true,
          });
          setTimeout(() => observer.disconnect(), 10000);
        }
      }
    }
  }
})();
