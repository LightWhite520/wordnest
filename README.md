# 拾词 WordNest

[![CI](https://github.com/LightWhite520/wordnest/actions/workflows/ci.yml/badge.svg)](https://github.com/LightWhite520/wordnest/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-58744b.svg)](LICENSE)

**[下载最新版 HTML](https://github.com/LightWhite520/wordnest/releases/latest/download/index.html)** · [更新记录](https://github.com/LightWhite520/wordnest/releases) · [反馈问题](https://github.com/LightWhite520/wordnest/issues)

奶油白与墨绿色的本地英语学习书房。最终交付只有 **`dist/index.html`** 一个文件；脚本、样式、SVG 图标、插画和课程词汇全部内嵌，无 CDN、无后端、无登录。

![拾词 WordNest 桌面界面](docs/preview.png)

## 直接使用

运行构建后，双击 `dist/index.html`，用 Edge 或 Chrome 打开。可以断网使用，不需要启动服务器。Windows Edge 已完成真实 `file://` 路径、断网、持久化和本地语音播放回调验证。

不需要开发环境的用户，直接从 Releases 下载 `index.html` 即可。

初次打开仅加载用户提供的 **43 个课程词条**：10 个重点动词、9 个形容词、14 个高频短语、10 个必背翻译。不同表达已拆分，补齐释义及原创双语例句，没有其他演示词库。删除词书后不会再次自动生成。

## 学习功能

- 今日目标与考试倒计时：四六级、考研、雅思、托福和自定义目标；默认每日 20 个新词。
- FSRS 间隔复习：目标保持率 90%，到期词优先，四级评分，支持英中两个回忆方向。
- 评分后自动保存，重新打开继续；“结束本轮”保留完成记录并允许下次重新生成队列。
- 看义拼写、听音拼写、错词回访；支持当前词书、收藏词和错词范围。专项练习不会修改正式复习时间。
- 拼写忽略大小写、多余空白和弯直引号的排版差异；仍检查词尾、连字符等有意义的差别。提示、跳过不计为独立正确。
- 搜索、分类、收藏、词条编辑、笔记、例句、词书管理、CSV 导出。
- 7/30 天趋势、可点击日期详情、91 天热力图、每日新学/复习/去重词数、专项正确率。
- 桌面侧边导航、手机底部导航、深浅主题、减少动画偏好。

学习快捷键：`Space` 查看答案，`1–4` 评分，`P` 发音；编辑字段或弹窗内不触发快捷键。

## 导入自己的词表

支持 XLSX（可选择工作表）、CSV、TSV、UTF-8 TXT 和粘贴文本。英文、释义必填，音标、词性、例句、译文、标签和笔记可选。CSV/TSV 按分隔符处理，简单 TXT 也可使用冒号或两个以上空格分隔英文和释义。

导入流程：选择材料 → 指定列映射与标题行 → 查看错误/重复词 → 确认。提供空白 CSV 模板。一次文件最大 10 MB、最多 20,000 行。错误行不导入，其他有效行在同一事务提交。同书重复词默认跳过，也可更新内容并保留复习状态。新建词书和导入一并提交，失败不会留下半批数据。

## 数据与离线说明

- 数据存放在当前浏览器的 IndexedDB，不写回 HTML。文件本身是应用，不是个人进度备份。
- 在设置中导出“完整备份”JSON，可迁移词书、复习状态、历史、会话和偏好。恢复前验证格式与版本，并要求确认整体替换。
- 移动文件、更换浏览器、无痕窗口或清理浏览器数据可能使旧记录不可见；迁移前先导出完整备份。
- 删除词书/词条会删除对应内容与当前复习进度，但历史统计仍保留。备份格式允许这些历史记录独立存在。
- 本地发音只选择浏览器标为 `localService` 的英语声音；未安装英语语音包时显示提示并禁用听写。没有在线语音回退。音色随操作系统而异。
- 按用户单 HTML 要求，不使用需要独立文件/HTTP 服务的 Service Worker 或 PWA 安装机制。HTML 文件自身可离线打开。
- 同一浏览器多个页面通过 Dexie 同步数据；评分事务核验会话和词条版本，避免重复评分。备份恢复更换会话实例，但保留历史归属。

## 开发与构建

环境：Node.js 24，pnpm 10。

```sh
pnpm install
pnpm dev
pnpm check
pnpm test
pnpm build
pnpm test:e2e
```

开发保留现有 SvelteKit 工程。生产使用 `vite.standalone.config.ts`、独立 Svelte 入口和 `vite-plugin-singlefile`，将动态模块也合并进 HTML。构建末尾自动验证 `dist` 中只有 `index.html`，且没有外部脚本、样式或远程资源引用。

可选本地预览：`pnpm preview --host 127.0.0.1`。预览地址和直接打开文件属于不同的存储环境，迁移数据请使用完整备份。

核心模块在 `src/lib`：`db.ts` 负责事务与会话，`scheduler.ts` 负责 FSRS，`importer.ts` 负责词表解析，`backup.ts` 负责校验与恢复，`stats.ts` 负责本地日期统计，`course.ts` 保存用户提供的课程内容。

## 验证

- Vitest + fake-indexeddb：评分并发、写入失败回滚、每日配额、到期排序、删词续学、导入去重/事务、备份恢复、拼写判定与跨日统计。
- Playwright：默认使用已安装的 Windows Edge，直接打开最终 HTML，在独立浏览器上下文内执行，不修改日常浏览器数据。
- 浏览器流程覆盖离线零外部请求、刷新续学、创建/导入/收藏、专项练习不修改调度、备份恢复、Excel 多工作表、错误备份、多标签同步、快捷键与完成页。
- 视觉检查包括桌面、深色模式、390px 手机、820px 平板、长短语、弹窗及缩小至 460px 高度的键盘可视区域模拟；不等同于真实手机设备键盘测试。
- 截图位于 `artifacts/`，测试结果位于 `test-results/`，都不进入单文件交付目录。

测试用 XLSX 位于 `tests/fixtures/two-sheets.xlsx`；可用 Python 标准库脚本 `python tests/create-fixtures.py` 重新生成。更换测试浏览器时修改 `playwright.config.ts` 的 `channel`。

## 许可证与贡献

本项目以 [MIT](LICENSE) 许可证开源。欢迎参阅 [贡献指南](CONTRIBUTING.md)。所用第三方依赖保留其各自的许可证。
