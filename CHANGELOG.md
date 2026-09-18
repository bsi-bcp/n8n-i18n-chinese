# Changelog

本文件记录 n8n 简体中文汉化包的所有重要变更。

格式基于 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/)。
版本号与所支持的 **n8n 版本**一致（tag 形如 `release/x.y.z`），遵循 n8n 自身的补丁发布节奏。

各版本详细兼容矩阵见 README「[n8n 版本兼容说明](README.md#n8n-版本兼容说明)」，选型总原则：

- **兼容** = 汉化 dist 精确匹配该 n8n 后端版本，全部界面文案有中文
- **就近兼容** = 搭配相邻后端版本实测可用；旧 dist 配新后端时，新增文案回退英文（功能不受影响）
- **不兼容** = 跨大版本区间错配可能白屏，请勿使用

## [2.39.8] - 2026-09-19（首次全自动无人值守发版 + 交付渠道切华为云 SWR + 产物命名规则）

**兼容**：n8n 2.39.8（精确匹配）；**就近兼容** 2.39.0 ~ 2.39.7（同大版本线）；**不兼容** > 2.39.8 后端。

上游 2.39.8 为补丁版共 3 修复：AI Assistant 工作流预览空白（#38915，前端）、数据加密 key 修复（#38911）、子执行 parked 清理（#38949），词典零增量。**本版为 CI 全自动完整包产线首次端到端无人值守发版**：watcher 三项评估绿灯后自动「翻译 → 覆盖率门禁 → 构建 → Release → 镜像」全链无人工动作；同窗口完成交付渠道迁移与产物命名规则落地。

### Added

- **产物命名规则（2026-09-19 定）**：GitHub Releases 部署包统一 `n8n-editor-ui@<版本号>.tar.gz`（Release 标题同名）；中文镜像统一 `swr.cn-north-4.myhuaweicloud.com/bcphub/n8n-chinese:<版本号>`；`-vN` 发布序号只进 tag 不进产物名。现有 4 个 Release 已按新规则重建（tag 与正文保留）
- image.yml v3：构建源改为 Release 资产下载（不再依赖 tag 内是否提交 dist，Dockerfile 与基础镜像恒用 main 最新）；版本白名单支持 `-vN` 后缀（如 `2.39.7-v3` → 镜像 tag `2.39.7`）
- 旧版本全量回填 SWR：`2.39.7`（v3 内容）/`2.39.6`/`2.38.7`，全部 docker manifest list 双架构（amd64 + arm64）

### Changed

- **交付渠道迁移**：`registry.bcpcloud.cn`（TX-43 自建 registry:2）→ 华为云 SWR `swr.cn-north-4.myhuaweicloud.com/bcphub/n8n-chinese`；`BCP_REGISTRY_*` secrets 切 SWR 登录指令（凭证库 `swr.hwc_bj4`）；旧库冻结为存量服务，被污染的 2.39.8 tag 已删除
- 基础镜像构建源 DockerHub → ghcr.io（runner 匿名限流致构建卡死 35min+ 实锤；交付层无差异）

### Fixed

- 🔴 **SWR 拒收 buildx 默认输出**：buildx 0.13+ 默认 OCI 媒体类型 + zstd 压缩层，SWR 解析器不认（`Invalid image, fail to parse 'manifest.json'` 三连复现）；仅 `--provenance=false --sbom=false` 不够，须 `--output type=registry,oci-mediatypes=false,compression=gzip`。排障方法论：registry v2 API 实证——SWR 对 docker manifest list / OCI index 实际都接受，问题纯在 buildx 输出侧
- 🔴 **editor-ui-dist 嵌套污染**：`cp -r …/dist editor-ui-dist` 在目录已存在时嵌套成 `editor-ui-dist/dist`（1013 文件新旧混放，镜像 COPY 错位）——node.js.yml 打包前先 `rm -rf`；仓库树已从干净 Release 资产重建
- **CodeQL 误报清零（130 → 0）**：① 对提交进仓库的 editor-ui-dist 构建产物加 `.github/codeql.yml` paths-ignore；② pinned codeql-action 不自动发现配置文件，init 必须显式 `config-file`（augmented config 为空 `{}` 实锤，告警一度翻倍）
- ⚠️ release 事件触发 image.yml 用的是 **tag 指向提交里的 workflow 版本**而非 main——重建历史 release 会触发旧逻辑（本次 4 个旧 release 重建全部空跑失败、无实害）；重推历史版本一律走 `workflow_dispatch`

## [2.39.7-v3] - 2026-09-18（v3 增强：节点面板第二/三层汉化 + Data tables 修复）

**兼容**：n8n 2.39.7（精确匹配）；**就近兼容** 2.39.0 ~ 2.39.6（新词典键在旧后端无对应面板文案时静默回退，无害）；**不兼容** > 2.39.7 后端。

YTJ1 灰度四件套 + 面板新项抽查全绿（bundle hash 三文件与本机构建一致、两层文案命中、index chunk 硬编码清零）；本版手动构建，CI 流水线自下个上游版本起自动携带新词典与补丁。

### Added
- 节点面板第二层节点描述汉化：568 节点（含 AI/langchain 包 117 个），走上游原生 `headers.<短名>.description` 查表，无需源码补丁
- 节点面板第三层操作标题汉化：456 条，新增 `feat__node_creator_actions_i18n.patch`（ActionItem 标题查表 `headers.actionTitles.*`，未命中回退原文，触发器 onEvent 模板等已有中文的自动免疫）
- `script/extract-node-headers.js`：TS 编译器 API 静态提取节点描述与操作标题（免编译 n8n，版本化节点深度去重 + baseDescription/构造函数赋值双回退），词典管线化随版本增量维护

### Fixed
- 🔴 **「Data tables」未翻译**：根因为 Source Control Pull/Push 弹窗 6 处硬编码标签（Workflows/Credentials/Data Tables，线上 bundle 取证实锤），新增 `fix__hardcoded_labels.patch` 改走既有词典 key
- 灰度实测发现 Code / Date & Time 等带操作子面板的节点点击异常：`feat__node_creator_actions_i18n.patch` 漏声明 i18n 实例（`const i18n = useI18n()`），发版窗口内修复重发；vue-i18n 全量 9500 键解析扫描 0 抛错背书

### Changed
- 语言包 8350 → 9374 键；镜像 `n8n-chinese:2.39.7` 已覆写为 v3 内容

## [2.39.7] - 2026-09-18（v2 重发：翻译质量大修 + 安全加固）

> 📌 2026-09-18 晚：该版本的 GitHub Release（v1/v2）已**并入 [`release/2.39.7-v3`](https://github.com/bsi-bcp/n8n-i18n-chinese/releases/tag/release%2F2.39.7-v3)** 统一发布（含本节全部内容），旧 Release 对象已删除、`release/2.39.7` tag 保留作历史指针。2.39.7 现仅此一个发布。

**兼容**：n8n 2.39.7（精确匹配）；**就近兼容** 2.39.0 ~ 2.39.6（YTJ1 2.39.6 后端 + 2.39.7 dist 灰度实测，四件套全绿）；**不兼容** > 2.39.7 后端（新文案回退英文）。

CI 流水线 v2 首次实战发版（watcher 评估 → 手动 dispatch → 构建 → Release → 自动联动镜像）。翻译质量评审：4 位翻译专家 + 2 位安全评估 subagent 并行，落地 **728 处修订**（评审明细见 docs-inner 评审表）。

### Added
- 发布说明自动生成（`script/gen-release-notes.sh`：上游 notes DeepSeek 中文总结 + 本仓库变更段 + 兼容区间；LLM 失败降级原文）
- translate.js 内容级安全校验 `isSuspiciousTranslation`（注入标签/外链/超长/指令回显→跳过）与空源值防护（镜像清空存量污染）

### Changed
- **术语全库统一**：agent→智能体（164）、credential→凭据（154）、workflow→工作流（60）、定价 plan→套餐（52，AI planMode 保留「计划」）、你→您（135）、previous node→上游节点（15）、thread→对话线程、sandbox/owner/workspace/insight/member 收口
- **redaction 六种译法归一**为「脱敏」（编辑/遮蔽/删减/隐藏/涂改 全清），reveal 统一「显示」
- Published 统一「已发布」；MFA 统一「双重身份验证（2FA）」

### Fixed
- 🔴 **安全**：清除泄漏进 UI 的 LLM 指令串（存档弹窗取消按钮显示「限制：仅输出翻译内容…」，根因=空源值进翻译队列）
- 错译修正 60+：返回人工客服→返回智能体、跑步→运行中、总病例数→用例总数、定时→耗时、出版者→发布者、活动→已发布、编写→写入、SSO 表达式占位符恢复原样、MFA strong 标签恢复等
- 文风收口：已被→已（32）、按钮句号（3）、数字空格、拼接片段（askMode 引导语）整句校对、补译漏翻 3 键（展开/输入/蹦跶中）

### Security
- CI：全权限 classic PAT 退役（Release/gh 改内置 GITHUB_TOKEN；发版末步 workflow_dispatch 联动 image.yml）；version/force_version 经 env + semver 白名单校验；image.yml 补 permissions；第三方 action 全部 SHA-pin；security-events 降 read

## [2.39.6] - 2026-09-16

**兼容**：n8n 2.39.6（精确匹配，8372 键全量汉化）；**就近兼容** 2.38.8 ~ 2.39.5（新 dist 配旧后端安全）；**不兼容** > 2.39.6 的后端（届时新文案回退英文，等本仓库跟进发版）。

bcphub-bsi（YTJ1 Queue Mode 集群 main + 3×worker + webhook + runners）灰度升级验证通过：healthz/readiness 200、品牌 title 保留、bundle hash 与本机构建一致、2.39.x 新增文案线上命中且词典 chunk md5 一致。

镜像：`registry.bcpcloud.cn/bcp/bcphub-n8n/n8n-chinese:2.39.6`（同步推送基础镜像 `bcp/n8n:2.39.6`、`bcp/n8n-runners:2.39.6`；DockerHub 对境内边端不可达时可用此私有库替代）。

> 📌 2026-09-19 追注：交付渠道已迁移华为云 SWR，2.39.6 镜像已回填 `swr.cn-north-4.myhuaweicloud.com/bcphub/n8n-chinese:2.39.6`（amd64 + arm64）；上文旧库地址仅作历史记录，Queue Mode 的 runners 镜像仍在旧库。

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
