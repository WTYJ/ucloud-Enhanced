# ucloud-Enhanced

<p align="center">
  <img src="https://img.shields.io/badge/版本-1.2.0-blue" alt="版本">
  <a href="https://opensource.org/licenses/MIT"><img src="https://img.shields.io/badge/License-MIT-yellow.svg" alt="License: MIT"></a>
  <img src="https://img.shields.io/badge/平台-北邮云邮教学空间-4A90D9" alt="平台">
</p>

**ucloud-Enhanced** 是一款北邮云邮教学空间（[ucloud.bupt.edu.cn](https://ucloud.bupt.edu.cn/)）的用户增强脚本，基于 [uarix/ucloud-Evolved](https://github.com/uarix/ucloud-Evolved) 二次开发，安装 Tampermonkey 后即可使用。

## ✨ 相对原版的改进

- **修复**：测试类待办无法显示所属课程的问题（原版 [#12](https://github.com/uarix/ucloud-Evolved/issues/12)）——课程匹配现在同时扫描作业与测试列表
- **修复**：待办课程名偶发与条目错位——改为按活动标题与页面卡片对齐
- **新增**：深色模式（动态主题引擎：浅底转深底、深字转浅字，彩色与图片保持原样），设置面板或油猴菜单均可开关
- **改进**：自动更新检查的版本比较按数值逐段进行（原版的字符串比较在 x.10 这类版本号上会误判）

## 🧩 继承自原版的功能

- 个人主页：作业显示来源课程、课程搜索（课程名/教师/院系）、最近使用课程、翻页增强
- 课件预览：Office 365 / 浏览器原生 PDF / 内置图片预览器、预览自动下载
- 课程资源：批量下载（带进度显示）、展示全部下载选项
- 通知：按时间排序、未读高亮
- 系统：新标签页打开、解除复制限制、页面标题优化、可配置悬浮窗

## 📥 安装

1. 安装 [Tampermonkey](https://www.tampermonkey.net/) 浏览器扩展
2. [点击安装 ucloud-Enhanced](https://github.com/WTYJ/ucloud-Enhanced/raw/refs/heads/main/ucloud-Enhanced.user.js)，或复制 `ucloud-Enhanced.user.js` 内容到脚本管理器新建脚本
3. 访问云邮教学空间，右下角 ⚙️ 打开设置面板

## ⚙️ 深色模式

- 设置面板 → 系统设置 → 深色模式，保存后刷新生效
- 或使用 Tampermonkey 图标菜单中的「深色模式」一键切换

## 🔄 更新日志

### 1.2.0

- 重写：深色模式改为动态主题引擎（处理思路参考 Dark Reader）——逐元素在 HSL 空间重映射亮度，色相与饱和度原样保留；彩色内容、图片、渐变装饰天然不受影响；悬停实时适配，新元素在浏览器绘制前同步处理，无闪白
- 修复：从主页"在新标签页打开"的详情页，返回按钮无反应（无历史可退时关闭标签页）
- 移除：通知列表"显示 1000 条"的继承功能（导致"标记已读"失效，且并无必要）
- 重构：平台 API 请求统一走 `apiFetch` 封装（公共鉴权头 + JSON 解析）；待办课程匹配复用带缓存的课程列表，教师账号亦可正确获取；主页翻页监听防抖
- 撤回：1.1.0 的"解除作业附件 50MB 上传限制"

### 1.1.0（已撤回）

- 曾加入"解除作业附件 50MB 上传限制"，经评估不属于合理修改，已回滚，从未发布

### 1.0.0

- 首个版本：基于 ucloud-Evolved 0.39 二次开发
- 修复：测试类待办无法显示所属课程、课程名偶发错位
- 新增：深色模式；改进自动更新版本比较

## 🙏 致谢

- [uarix/ucloud-Evolved](https://github.com/uarix/ucloud-Evolved) 及作者 Quarix —— 本项目的前身与绝大部分功能的作者
- [Youxam · 云邮教学空间助手](https://greasyfork.org/zh-CN/scripts/478125-%E4%BA%91%E9%82%AE%E6%95%99%E5%AD%A6%E7%A9%BA%E9%97%B4%E5%8A%A9%E6%89%8B) —— 原版项目的灵感来源

## ⚖️ 许可证

[MIT](./LICENSE)。本项目与北京邮电大学无关，仅供学习与个人使用，使用时请遵守学校相关规定。
