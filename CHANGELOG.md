# Changelog

本文件记录 n8n 简体中文汉化包的所有重要变更。

格式基于 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/)。
版本号与所支持的 **n8n 版本**一致（tag 形如 `release/x.y.z`），遵循 n8n 自身的补丁发布节奏。

各版本详细兼容矩阵见 README「[n8n 版本兼容说明](README.md#n8n-版本兼容说明)」，选型总原则：

- **兼容** = 汉化 dist 精确匹配该 n8n 后端版本，全部界面文案有中文
- **就近兼容** = 搭配相邻后端版本实测可用；旧 dist 配新后端时，新增文案回退英文（功能不受影响）
- **不兼容** = 跨大版本区间错配可能白屏，请勿使用

## [2.39.6] - 2026-09-16

**兼容**：n8n 2.39.6（精确匹配，8372 键全量汉化）；**就近兼容** 2.38.8 ~ 2.39.5（新 dist 配旧后端安全）；**不兼容** > 2.39.6 的后端（届时新文案回退英文，等本仓库跟进发版）。

bcphub-bsi（YTJ1 Queue Mode 集群 main + 3×worker + webhook + runners）灰度升级验证通过：healthz/readiness 200、品牌 title 保留、bundle hash 与本机构建一致、2.39.x 新增文案线上命中且词典 chunk md5 一致。

镜像：`registry.bcpcloud.cn/bcp/bcphub-n8n/n8n-chinese:2.39.6`（同步推送基础镜像 `bcp/n8n:2.39.6`、`bcp/n8n-runners:2.39.6`；DockerHub 对境内边端不可达时可用此私有库替代）。

### Added

- 增量翻译 104 条（n8n 2.38.7→2.39.6：+91 新增 / −60 删除 / 13 原文变化），`languages/zh-CN.json` 8372 键全覆盖，主要涉及 AI 助手（agents builder / instanceAi）、工具配置表单、SSO 登录失败提示、promotions 弹窗
- `LICENSE`：MIT 协议（双版权声明：imblowsnow 2025-2026 继承内容 + 商软信息 BSI 2026 新增内容）

### Changed

- README「版权与来源声明」由"版权保留、无许可证"改为引用原作者 MIT 授权（授权依据：[n8n-nodes-feishu-lite#67](https://github.com/other-blowsnow/n8n-nodes-feishu-lite/issues/67)，2026-09-14）

### Fixed

- 修正翻译叠字「的的」共 3 处（`agents.toolConfig.workflow.target.notice` 及 2 处凭证 confirmMessage）

## [2.38.7] - 2026-09-12

**兼容**：n8n 2.38.7（精确匹配，8341 键全量汉化）；**就近兼容** 2.34 ~ 2.38.6（实测，新文案回退英文）；**不兼容** ≤ 2.33.7（旧 editor-ui 结构差异大，错位可能白屏——该区间请用上游 `release/2.33.7` 精确匹配包）与 > 2.39.6 后端（新界面大面积英文）。

首个由 BSI fork 独立发布的版本。tag [`release/2.38.7`](https://github.com/bsi-bcp/n8n-i18n-chinese/releases/tag/release%2F2.38.7)，附件 `editor-ui-2.38.7.tar.gz`。

### Added

- 全量 8341 键简体中文翻译（增量对齐 n8n 2.38.7）
- 原生构建的 editor-ui dist（2.38.7 源码 + zh-CN 注入），bcphub-bsi（YTJ1）灰度验证四件套通过
- Docker 镜像交付渠道：`registry.bcpcloud.cn/bcp/bcphub-n8n/n8n-chinese`（面向国内客户边端，GitHub Releases 仅作公开存档）
- README「n8n 版本兼容说明」矩阵

### Changed

- 仓库迁移至 [bsi-bcp/n8n-i18n-chinese](https://github.com/bsi-bcp/n8n-i18n-chinese)（上游 `other-blowsnow/n8n-i18n-chinese` 已于 2026-08-21 归档停更）
- 批量翻译模式改造：`OPENAI_BATCH_SIZE` 支持、批失败二分降级重试、429 退避
- 移除失效的上游赞助广告

### Fixed

- `patches/feat__i18n_zhCn.patch` 针对 2.38.7 重新生成（上游 `@n8n/i18n/src/index.ts` 已重构，旧 patch 失效）
- `fix_editor-ui.patch` 标记为过时（2.38.x 起上游已自行修复 CredentialConfig 空值问题）

## [2.33.7] - 2026-08-21（上游最终版，本 fork 继承基线）

**兼容**：n8n ≤ 2.33.7 各版本（各版本均以上游当时精确匹配的 Release 为准）；**不兼容** > 2.33.7（该区间请用本仓库 `release/2.38.7` 及后续版本；用旧包时 2.34+ 新增文案全部回退英文）。

上游 `other-blowsnow` 维护时期的最终 Release（GitHub tag `release/2.33.7`，附件 `editor-ui.tar.gz`）。此后上游归档停更；本 fork 的所有翻译词典、构建脚本与补丁均继承自此版本。BCP 侧 ≤2.33.7 的 n8n 部署仍使用上游精确匹配包，>2.33.7 起改用本 fork 的构建产物。

[Unreleased]: https://github.com/bsi-bcp/n8n-i18n-chinese/compare/release/2.39.6...main
[2.39.6]: https://github.com/bsi-bcp/n8n-i18n-chinese/releases/tag/release%2F2.39.6
[2.38.7]: https://github.com/bsi-bcp/n8n-i18n-chinese/releases/tag/release%2F2.38.7
[2.33.7]: https://github.com/other-blowsnow/n8n-i18n-chinese/releases/tag/release/2.33.7
