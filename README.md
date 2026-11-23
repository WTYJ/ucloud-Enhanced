# ucloud-Enhanced

<p align="center">
  <img src="https://img.shields.io/badge/版本-2.7.2-blue" alt="版本">
  <a href="https://opensource.org/licenses/MIT"><img src="https://img.shields.io/badge/License-MIT-yellow.svg" alt="License: MIT"></a>
  <img src="https://img.shields.io/badge/平台-北邮云邮教学空间-4A90D9" alt="平台">
</p>

**ucloud-Enhanced** 是一款北邮云邮教学空间（[ucloud.bupt.edu.cn](https://ucloud.bupt.edu.cn/)）的零外部依赖用户增强脚本，基于 [uarix/ucloud-Evolved](https://github.com/uarix/ucloud-Evolved) 二次开发，安装 Tampermonkey 后即可使用。

## ✨ 核心特性

- **独立「工作台」**（Shadow DOM 隔离，现代风亮/暗双主题，支持全屏模式记忆、滚动位置记忆与流畅渲染优化）
  - **待办**：支持「待完成 / 已提交（未截止）」分段切换、截止紧迫度倒计时与色条、截止日期右侧「今天 / 明天 / 周几」标注、班级已交进度、多课程筛选胶囊；**自动折叠收纳「已过期 · 不可补交」作业**并同步扣减待办红点与课程角标
  - **课程 & 课程空间**：支持课程搜索、星标置顶、待办角标；进入课程空间可直接按章节搜索/预览/单文件或批量下载课件（均带实时百分比进度与随时取消），并查看本课全部作业与测试
  - **作业详情**：工作台内直接查看富文本要求、作业附件、班级进度，以及「我的提交与批改」（得分、教师评语/驳回原因、已交附件预览下载），一键直达原页提交
  - **通知**：支持关键词搜索、「仅看未读」筛选、单条/全部已读与安全外链渲染
- **自动深色模式（CSSOM 样式表引擎）**：跟随系统深色外观即时切换，零鼠标悬停重排；同时覆盖云平台一级主页与云邮二级空间，保留彩色元素与图片原貌
- **SSO Ticket 跳转循环修复**：自动处理 `/uclass` 登录过期后的 ticket 循环跳转与地址栏残留
- **助手 UI 重设计**：可拖动贴边悬浮球 + 快捷开关面板 + 4 分组现代设置中心（轻量设置热生效，免刷新）
- **可靠自动更新检查**：每次打开页面启动时多源容灾检查（带超时降级与逐段数值版本比较），弹窗直达 GitHub Releases

## 🧩 继承与保留的原页增强

- **个人主页**：待办显示所属课程（含测试类待办）、滚轮翻页与加大翻页按钮
- **作业详情页**：显示所属课程可点击胶囊，一键直达课程主页
- **课件预览**：Office 365 在线预览、浏览器原生 PDF 阅读器、预览自动下载、自动关闭学习弹窗、隐藏预览倒计时
- **课程资源页**：下载按钮常驻显示、全部下载（带实时百分比进度）
- **系统增强**：解除复制限制、页面标题优化

## 📥 安装

1. 安装 [Tampermonkey](https://www.tampermonkey.net/)（或 ScriptCat）浏览器扩展
2. [点击安装 ucloud-Enhanced](https://github.com/WTYJ/ucloud-Enhanced/raw/refs/heads/main/ucloud-Enhanced.user.js)，或复制 `ucloud-Enhanced.user.js` 内容到脚本管理器新建脚本
3. 访问云邮教学空间，进入个人主页后默认自动打开工作台，也可随时点击右下角悬浮球 ⚙️ 或工作台顶栏齿轮按钮打开设置

> [!IMPORTANT]
> **安装后脚本不生效？（Chrome / Edge 等 Chromium 内核高版本必看）**
>
> Chromium 内核浏览器在高版本（Manifest V3）中收紧了用户脚本执行权限，仅开启开发者模式已不够，需要手动授权：
> 1. 地址栏输入 `chrome://extensions/`（Edge 输入 `edge://extensions/`）并回车
> 2. 打开页面右上角的 **开发者模式（开发人员模式）**
> 3. 找到 **Tampermonkey（篡改猴）** 或 **ScriptCat（脚本猫）**，点击 **详情（详细信息）**
> 4. 向下滚动，开启 **允许运行用户脚本（或「允许用户脚本」）**
> 5. 返回云邮教学空间，按 `Ctrl + F5`（Mac 为 `Cmd + Shift + R`）强制刷新页面

## ⚙️ 助手入口

- **右下角悬浮球**：点击弹出工作台直达入口与高频开关，可拖动、贴边吸附并记忆位置
- **工作台顶栏设置按钮**：随时直达 4 分组设置中心（轻量开关即时生效）
- **Tampermonkey 扩展菜单**：即使隐藏悬浮球，也可通过扩展菜单一键打开设置

## 🛠️ 本地开发与构建

源码按职责拆分为 `src/` 下 4 个模块，通过零依赖构建脚本拼接为纯单文件 `ucloud-Enhanced.user.js`（用户安装与油猴自动更新直链指向根目录单文件）：

- `src/00-header.js`：UserScript 元数据头与 `/office/` 预览拦截（Office 365 / 原生 PDF）
- `src/10-core.js`：设置体系、SSO Ticket 修复、CSSOM 深色引擎、通知与更新检查、助手 UI、下载器与平台共享 API
- `src/20-workbench.js`：Shadow DOM 独立工作台（待办、课程、通知、作业详情、课程空间）
- `src/30-page-mods.js`：原页面轻量增强（主页、作业详情、课程资源、预览页）及入口 `main()`

修改 `src/` 后运行以下命令即可重新生成并校验语法：

```bash
python3 build.py
```

## 🙏 致谢

- [uarix/ucloud-Evolved](https://github.com/uarix/ucloud-Evolved) 及作者 Quarix —— 本项目的前身与绝大部分原页功能的作者
- [Youxam · 云邮教学空间助手](https://greasyfork.org/zh-CN/scripts/478125-%E4%BA%91%E9%82%AE%E6%95%99%E5%AD%A6%E7%A9%BA%E9%97%B4%E5%8A%A9%E6%89%8B) —— 原版项目的灵感来源

## ⚖️ 许可证

[MIT](./LICENSE)。本项目与北京邮电大学无关，仅供学习与个人使用，使用时请遵守学校相关规定。
