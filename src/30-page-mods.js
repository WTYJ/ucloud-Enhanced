  // 仅注入课程名（不改版待办，供“待办显示所属课程”开关使用）
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
    let nodes = Array.from(
      document.querySelectorAll(".in-progress-section .in-progress-body .in-progress-item")
    );
    if (!nodes.length) {
      nodes = $x(
        '//*[@id="layout-container"]/div[2]/div[2]/div/div[2]/div[1]/div[3]/div[2]/div/div'
      );
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

  // 首页"本学期课程"：课程搜索框

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
      .teacher-home-page .home-right-container .my-need-section .my-need-body .my-need-item,
      .yz-todo-item {
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
              const pageElement = document.querySelector(pageIndicatorSelector);
              if (!pageElement) return;

              // 解析页码
              const currentPage = parseInt(
                pageElement.innerHTML.trim().split("/")[0]
              );
              if (isNaN(currentPage)) return;

              // 页码变化则更新显示
              if (currentPage !== gpage) {
                gpage = currentPage;
                await updateAssignmentDisplay(list);
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
                            file.name
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
