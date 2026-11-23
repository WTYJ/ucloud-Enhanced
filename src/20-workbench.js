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
              await downloadFile(url, f.resourceName, () => job.cancelled);
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
