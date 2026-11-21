# ucloud-Enhanced

<p align="center">
  <img src="https://img.shields.io/badge/版本-2.5.12-blue" alt="版本">
  <a href="https://opensource.org/licenses/MIT"><img src="https://img.shields.io/badge/License-MIT-yellow.svg" alt="License: MIT"></a>
  <img src="https://img.shields.io/badge/平台-北邮云邮教学空间-4A90D9" alt="平台">
</p>

**ucloud-Enhanced** 是一款北邮云邮教学空间（[ucloud.bupt.edu.cn](https://ucloud.bupt.edu.cn/)）的用户增强脚本，基于 [uarix/ucloud-Evolved](https://github.com/uarix/ucloud-Evolved) 二次开发，安装 Tampermonkey 后即可使用。

## ✨ 相对原版的改进

- **新增**：独立「工作台」（Shadow DOM 隔离，现代风亮/暗双主题，支持 `Esc` 逐级返回、`/` 聚焦搜索、`1/2/3` 切页签与滚动位置记忆）
  - **待办**：支持「待完成 / 已提交（未截止）」分段切换、截止紧迫度倒计时与色条、班级已交进度、多课程筛选胶囊
  - **课程 & 课程空间**：支持课程搜索、星标置顶、待办角标；点击进入课程空间可直接按章节浏览/预览/按组或整课批量下载课件，并查看本课全部作业与测试
  - **作业详情**：工作台内直接查看富文本要求、作业附件、班级进度，以及「我的提交与批改」（得分、教师评语/驳回原因、已交附件预览下载）
  - **通知**：支持关键词搜索、「仅看未读」筛选、单条/全部已读与安全外链渲染
- **修复**：测试类待办无法显示所属课程的问题（原版 [#12](https://github.com/uarix/ucloud-Evolved/issues/12)）——课程匹配现在同时扫描作业与测试列表
- **修复**：待办课程名偶发与条目错位——改为按活动标题与页面卡片对齐
- **新增**：自动深色模式（跟随系统深色外观即时切换；动态主题引擎：浅底转深底、深字转浅字，彩色与图片保持原样），默认开启
- **重构**：助手 UI 全面重设计——可拖动悬浮球 + 快捷开关面板 + 现代设置中心（轻量设置热生效，免强刷）
- **改进**：自动更新检查的版本比较按数值逐段进行（原版的字符串比较在 x.10 这类版本号上会误判）

## 🧩 继承自原版的功能

- 个人主页：作业显示来源课程、课程搜索（课程名/教师/院系）、翻页增强
- 课件预览：Office 365 / 浏览器原生 PDF / 内置图片预览器、预览自动下载
- 课程资源：全部下载（带进度显示）、下载按钮常驻显示
- 通知：按时间排序、未读高亮
- 系统：新标签页打开、解除复制限制、页面标题优化、可配置悬浮窗

## 📥 安装

1. 安装 [Tampermonkey](https://www.tampermonkey.net/)（或 ScriptCat）浏览器扩展
2. [点击安装 ucloud-Enhanced](https://github.com/WTYJ/ucloud-Enhanced/raw/refs/heads/main/ucloud-Enhanced.user.js)，或复制 `ucloud-Enhanced.user.js` 内容到脚本管理器新建脚本
3. 访问云邮教学空间，点击右下角悬浮球 ⚙️ 即可打开工作台或设置面板

> [!IMPORTANT]
> **安装后脚本不生效？（Chrome / Edge 等 Chromium 内核高版本必看）**
>
> Chromium 内核浏览器在高版本（Manifest V3）中收紧了用户脚本执行权限，仅开启开发者模式已不够，需要手动授权：
> 1. 地址栏输入 `chrome://extensions/`（Edge 输入 `edge://extensions/`）并回车
> 2. 打开页面右上角的 **开发者模式（开发人员模式）**
> 3. 找到 **Tampermonkey（篡改猴）** 或 **ScriptCat（脚本猫）**，点击 **详情（详细信息）**
> 4. 向下滚动，开启 **允许运行用户脚本（或「允许用户脚本」）**
> 5. 返回云邮教学空间，按 `Ctrl + F5`（Mac 为 `Cmd + Shift + R`）强制刷新页面

## ⚙️ 助手 UI

- 右下角悬浮球：点击弹出快捷开关（深色、翻页、作业来源等高频项），可拖动、贴边吸附、位置记忆
- 「全部设置」进入设置中心：轻量开关热生效，结构性开关自动刷新生效
- 也可通过 Tampermonkey 菜单或页面右上角个人菜单打开设置

## 🛠️ 本地开发与构建

源码按职责拆分为 `src/` 下 4 个模块，通过零依赖构建脚本拼接为单文件 `ucloud-Enhanced.user.js`（用户安装与油猴自动更新直链仍指向根目录单文件）：

- `src/00-header.js`：UserScript 元数据头、Webpack 路由 Hook、图片/Office 预览器与 XHR 拦截
- `src/10-core.js`：设置体系、动态深色引擎、通知与更新检查、助手 UI、平台共享 API 与导航/缓存工具
- `src/20-workbench.js`：Shadow DOM 独立工作台（待办、课程、通知、作业详情、课程空间）
- `src/30-page-mods.js`：原页面注入与改版（主页、详情页、课程资源、通知页）及入口 `main()`

修改 `src/` 后运行以下命令即可重新生成并校验语法：

```bash
python3 build.py
```

## 🙏 致谢

- [uarix/ucloud-Evolved](https://github.com/uarix/ucloud-Evolved) 及作者 Quarix —— 本项目的前身与绝大部分功能的作者
- [Youxam · 云邮教学空间助手](https://greasyfork.org/zh-CN/scripts/478125-%E4%BA%91%E9%82%AE%E6%95%99%E5%AD%A6%E7%A9%BA%E9%97%B4%E5%8A%A9%E6%89%8B) —— 原版项目的灵感来源

## ⚖️ 许可证

[MIT](./LICENSE)。本项目与北京邮电大学无关，仅供学习与个人使用，使用时请遵守学校相关规定。
