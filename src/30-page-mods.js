  // 右侧栏为空时收起，让左栏（课程/待办）填满并保持居中
  function syncHomeLayout() {
    const page = document.querySelector(".teacher-home-page");
    if (!page) return;
    const right = page.querySelector(".home-right-container");
    let hasVisible = false;
    if (right) {
      hasVisible = Array.from(right.children).some((c) => {
        const cs = getComputedStyle(c);
        return cs.display !== "none" && cs.visibility !== "hidden" && c.offsetHeight > 8;
      });
    }
    page.classList.toggle("yz-no-right", !hasVisible);
  }

  // ===== 连续待办列表（不分页）=====
  const yzTodoCountdowns = new Map();
  let yzTodoTimer = null;

  function removeTodoContinuous() {
    const section = document.querySelector(".in-progress-section");
    if (section) {
      section.classList.remove("yz-todo-continuous-on");
      const wrap = section.querySelector(".yz-todo-continuous");
      if (wrap) wrap.remove();
    }
    yzTodoCountdowns.clear();
  }

  function updateTodoCountdown(card) {
    const rec = yzTodoCountdowns.get(card);
    if (!rec) return;
    const d = parseDeadline(rec.endTime);
    if (!d) return;
    const info = formatRemain(d - Date.now());
    rec.badge.className = "yz-overdue-badge " + info.cls;
    rec.badge.textContent = info.text;
  }

  function startTodoTicker() {
    if (yzTodoTimer) return;
    yzTodoTimer = setInterval(() => {
      let alive = 0;
      for (const card of yzTodoCountdowns.keys()) {
        if (!card.isConnected) {
          yzTodoCountdowns.delete(card);
          continue;
        }
        alive++;
        updateTodoCountdown(card);
      }
      if (!alive) {
        clearInterval(yzTodoTimer);
        yzTodoTimer = null;
      }
    }, 60 * 1000);
  }

  function renderTodoChips(card, task, info) {
    const meta = card.querySelector(".yz-todo-meta");
    if (!meta) return;
    const headMeta = card.querySelector(".yz-todo-headmeta");
    meta.textContent = "";
    if (headMeta) headMeta.textContent = "";
    yzTodoCountdowns.delete(card);
    const attrHost = headMeta || meta;

    const d = parseDeadline(task.endTime);
    if (d) {
      const chip = document.createElement("span");
      chip.className = "yz-deadline-chip";
      chip.textContent = "截止 " + fmtDeadline(d);
      attrHost.appendChild(chip);

      const badge = document.createElement("span");
      const rem = formatRemain(d - Date.now());
      badge.className = "yz-overdue-badge " + rem.cls;
      badge.textContent = rem.text;
      meta.appendChild(badge);
      yzTodoCountdowns.set(card, { badge: badge, endTime: task.endTime });
      startTodoTicker();
    }
    const mode = (info && info.mode) || pickModeName(task.assignmentType);
    if (mode) {
      const chip = document.createElement("span");
      chip.className = "yz-task-chip mode";
      chip.textContent = (mode === "小组作业" ? "👥 " : "👤 ") + mode;
      attrHost.appendChild(chip);
    }
    if (info && info.attachments) {
      const chip = document.createElement("span");
      chip.className = "yz-task-chip info";
      chip.textContent = "附件 " + info.attachments;
      meta.appendChild(chip);
    }
    if (info && info.evaluation) {
      const chip = document.createElement("span");
      chip.className = "yz-task-chip info";
      chip.textContent = "互评";
      meta.appendChild(chip);
    }
    if (info && info.stat) {
      const chip = document.createElement("span");
      chip.className = "yz-task-chip";
      chip.textContent =
        "班级已交 " + info.stat.submitted + " / " + info.stat.total + " 人";
      meta.appendChild(chip);
    }
  }

  function buildTodoCard(task) {
    const card = document.createElement("div");
    card.className = "yz-todo-item";
    card.dataset.activityId = task.activityId || task.id || "";

    const icon = document.createElement("div");
    icon.className = "yz-todo-icon";
    icon.innerHTML =
      '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 3h7l5 5v13H7z"/><path d="M14 3v5h5"/><path d="M9.5 13h6"/><path d="M9.5 16.5h4"/></svg>';
    card.appendChild(icon);

    const box = document.createElement("div");
    box.className = "yz-todo-box";
    card.appendChild(box);

    const head = document.createElement("div");
    head.className = "yz-todo-head";
    box.appendChild(head);
    const title = document.createElement("div");
    title.className = "yz-todo-title";
    title.textContent = task.activityName || task.assignmentTitle || "未命名作业";
    head.appendChild(title);
    const headMeta = document.createElement("div");
    headMeta.className = "yz-todo-headmeta";
    head.appendChild(headMeta);

    const course = document.createElement("div");
    course.className = "yz-todo-course";
    course.textContent = "课程加载中…";
    box.appendChild(course);

    const meta = document.createElement("div");
    meta.className = "yz-todo-meta";
    box.appendChild(meta);

    card.addEventListener("click", () => openTaskUrl(buildTaskUrl(task)));

    renderTodoChips(card, task, null);
    return card;
  }

  function renderTodoContinuous(list) {
    const section = document.querySelector(".in-progress-section");
    if (!section || !list || !list.length) return;
    const body = section.querySelector(".in-progress-body");
    if (!body) return;
    section.classList.add("yz-todo-continuous-on");
    let wrap = section.querySelector(".yz-todo-continuous");
    if (!wrap) {
      wrap = document.createElement("div");
      wrap.className = "yz-todo-continuous";
      body.parentNode.insertBefore(wrap, body.nextSibling);
    }
    wrap.textContent = "";
    yzTodoCountdowns.clear();

    const tasks = sortTasksByDeadline(list);

    const cards = new Map();
    tasks.forEach((task) => {
      const card = buildTodoCard(task);
      wrap.appendChild(card);
      cards.set(task.activityId || task.id, card);
    });

    const ids = tasks.map((t) => t.activityId || t.id).filter(Boolean);
    searchCourses(ids)
      .then((infos) => {
        tasks.forEach((task) => {
          const id = task.activityId || task.id;
          const card = cards.get(id);
          if (!card || !card.isConnected) return;
          const info = infos[id];
          const el = card.querySelector(".yz-todo-course");
          if (el) el.textContent = info ? info.name + "(" + info.teachers + ")" : "未知课程";
        });
      })
      .catch(() => {});

    tasks.forEach((task) => {
      const id = task.activityId || task.id;
      fetchAssignmentInfo(task).then((info) => {
        const card = cards.get(id);
        if (!card || !card.isConnected || !info) return;
        renderTodoChips(card, task, info);
      });
    });
  }

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

  // 更新待办显示：改版开启时用连续列表；关闭时保持平台结构，仅按需注入课程名
  async function updateAssignmentDisplay(list) {
    if (!list || list.length === 0) return;
    if (!settings.experimental.todoRedesign) {
      removeTodoContinuous();
      if (settings.home.showTodoCourseName) injectTodoCourseNames(list);
      return;
    }
    renderTodoContinuous(list);
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

  async function setupLessonSearch() {
    if (!settings.experimental.courseSearchBox) return;
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

    header.appendChild(toolbar);
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
    if (settings.experimental.hideUserPanel) {
      cssParts.push(`
      .teacher-home-page .teacher-driver-section {
        display: none !important;
      }
      `);
    }
    if (settings.experimental.hideSideNav) {
      cssParts.push(`
      .main-content .router-container .menu-nav {
        display: none !important;
      }
      .main-content:has(.teacher-home-page),
      .main-content:has(.teacher-home-page) .router-container {
        width: 100% !important;
      }
      .main-content:has(.teacher-home-page) .router-container .box {
        width: 100% !important;
        max-width: none !important;
        display: block !important;
        margin: 0 auto !important;
      }
      .teacher-home-page {
        box-sizing: border-box !important;
        width: 100% !important;
        max-width: 1680px !important;
        margin-left: auto !important;
        margin-right: auto !important;
        padding: 0 16px !important;
      }
      .teacher-home-page .home-left-container {
        width: calc(100% - 588px) !important;
      }
      .teacher-home-page .home-right-container {
        width: 540px !important;
        margin-right: 16px !important;
      }
      .teacher-home-page.yz-no-right {
        max-width: 1180px !important;
      }
      .teacher-home-page.yz-no-right .home-left-container {
        display: block !important;
        width: 100% !important;
        max-width: none !important;
        margin-left: 0 !important;
        margin-right: 0 !important;
      }
      .teacher-home-page.yz-no-right .home-right-container {
        display: none !important;
      }
      `);
    }
    if (settings.experimental.hideVisitHistory) {
      cssParts.push(`
      .visit-history-section {
        display: none !important;
      }
      `);
    }
    if (settings.experimental.todoRedesign) {
      cssParts.push(`
      .yz-deadline-chip {
        display: inline-flex;
        align-items: center;
        padding: 1px 8px;
        border-radius: 999px;
        border: 1px solid rgba(148, 163, 184, 0.45);
        background: rgba(148, 163, 184, 0.18);
        color: #94a3b8;
        font-size: 12px;
        line-height: 1.4;
        white-space: nowrap;
      }
      .yz-task-chip {
        display: inline-flex;
        align-items: center;
        padding: 1px 8px;
        font-size: 12px;
        line-height: 1.4;
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
      .yz-overdue-badge.overdue { background: #b91c1c; color: #fff; }
      .yz-overdue-badge.urgent { background: #ef4444; color: #fff; }
      .yz-overdue-badge.soon { background: #e6a23c; color: #fff; }
      .yz-overdue-badge.later {
        background: rgba(148, 163, 184, 0.22);
        border: 1px solid rgba(148, 163, 184, 0.45);
        color: #94a3b8;
      }
      .in-progress-section.yz-todo-continuous-on .in-progress-body,
      .in-progress-section.yz-todo-continuous-on .in-progress-header .header-control {
        display: none !important;
      }
      .yz-todo-continuous {
        display: flex;
        flex-direction: column;
        gap: 10px;
        padding: 0 0 24px;
      }
      .yz-todo-item {
        display: flex;
        align-items: flex-start;
        gap: 14px;
        padding: 14px 16px;
        border-radius: 14px;
        background-color: #fff;
        box-shadow: inset 0 0 0 1px rgba(59, 130, 246, 0.3);
        cursor: pointer;
        transition: box-shadow 0.2s ease, transform 0.2s ease;
      }
      .yz-todo-item:hover {
        box-shadow: inset 0 0 0 1px rgba(59, 130, 246, 0.55), 0 8px 20px rgba(15, 23, 42, 0.08);
        transform: translateY(-1px);
      }
      .yz-todo-icon {
        flex: none;
        width: 44px;
        height: 44px;
        border-radius: 12px;
        display: flex;
        align-items: center;
        justify-content: center;
        background: rgba(59, 130, 246, 0.18);
        border: 1px solid rgba(59, 130, 246, 0.45);
        color: #1d4ed8;
        font-size: 20px;
      }
      html.ue-dark-mode .yz-todo-icon {
        background: rgba(59, 130, 246, 0.28);
        border-color: rgba(59, 130, 246, 0.55);
        color: #93c5fd;
      }
      .yz-todo-box {
        flex: 1;
        min-width: 0;
      }
      .yz-todo-head {
        display: flex;
        align-items: center;
        gap: 10px;
      }
      .yz-todo-title {
        flex: 1;
        min-width: 0;
        font-size: 14px;
        font-weight: 600;
        line-height: 20px;
        color: #171725;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .yz-todo-headmeta {
        flex: none;
        display: flex;
        align-items: center;
        gap: 6px;
      }
      .yz-todo-course {
        margin-top: 2px;
        font-size: 12px;
        line-height: 16px;
        font-weight: 600;
        color: #2563eb;
      }
      .yz-todo-meta {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        gap: 6px;
        margin-top: 6px;
        font-size: 12px;
        line-height: 1.4;
      }
      `);
    }
    if (settings.notification.betterNotificationHighlight) {
      cssParts.push(`
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
    if (settings.experimental.courseSearchBox) {
      cssParts.push(`
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
      /* 深色模式：本工具栏已豁免页面深色引擎，显式指定深色配色 */
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
    GM_addStyle(cssParts.join("\n"));
  }

  let homePageObserver = null;

  // 主函数
  async function main() {
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
      const title = q.get("assignmentTitle");
      if (settings.system.betterTitle) {
        const pageTitle = "[作业] " + title + " - 教学云空间";
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
                downloadFile(url, filename);
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
              }
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
      if (settings.experimental.courseSearchBox) {
        setupLessonSearch().catch((e) =>
          console.error("[ucloud-Enhanced] 初始化课程搜索失败", e)
        );
      }
      if (settings.experimental.todoRedesign || settings.home.showTodoCourseName) {
        // 未完成任务列表
        const list = glist || (await getUndoneList()).data.undoneList;
        if (!list || !Array.isArray(list)) return;
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
      syncHomeLayout();
      setTimeout(syncHomeLayout, 600);
      setTimeout(syncHomeLayout, 1800);

      function wheelPageTurner() {
        const pageConfigs = [
          {
            // 待办
            skip: () => !!settings.experimental.todoRedesign,
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
          if (config.skip && config.skip()) return;
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

            if (settings.preview.autoDownload && previewItems[index]) {
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
                  if (downloading) {
                    const btn = document.getElementById("downloadAllButton");
                    const totalCount = resources.length;
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
            item.classList.toggle("notification-with-dot", !!hasRedDot);
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
