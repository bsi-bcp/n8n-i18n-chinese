# Changelog

本文件记录 n8n 简体中文汉化包的所有重要变更。

格式基于 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/)。
版本号与所支持的 **n8n 版本**一致（tag 形如 `release/x.y.z`），遵循 n8n 自身的补丁发布节奏。

各版本详细兼容矩阵见 README「[n8n 版本兼容说明](README.md#n8n-版本兼容说明)」，选型总原则：

- **兼容** = 汉化 dist 精确匹配该 n8n 后端版本，全部界面文案有中文
- **就近兼容** = 搭配相邻后端版本实测可用；旧 dist 配新后端时，新增文案回退英文（功能不受影响）
- **不兼容** = 跨大版本区间错配可能白屏，请勿使用

## [2.39.10] - 2026-09-21（上游零前端变更补丁版；修复后管线首个全自动发版）

**兼容**：n8n 2.39.10（精确匹配）；**就近兼容** 2.39.9（dist 与 2.39.9 逐字节一致）。

上游 2.39.10 无前端变更、词典零增量（9519 键），dist 不另立构建（tag/Release 交付完整性照常；`创建 git tag` 步骤因本版实锤补加 dist 无变更守卫）。watcher 评估绿灯后全自动跟进（翻译→构建→Release→镜像全链无人值守），完整走 2026-09-21 修复后管线（EE 四层门禁 + SHA 锚定）。

## [2.39.9] - 2026-09-21（同日以修复后管线重建的干净版）

**兼容**：n8n 2.39.9（精确匹配）；**就近兼容** 2.39.0 ~ 2.39.10（同大版本线）。

上游 2.39.9 词典 9519 键（较 2.39.8 净减 3 键，上游删词）。首版（当日 08:49 UTC）构建于 EE 清理前旧管线——editor-ui 语义脚本路径带菌（见下方 Unreleased 段）；同日删除重发，以修复后管线构建（Release 说明含上游锚定 SHA）。

## [Unreleased] - 2026-09-21（EE 前端路径合规修复 + 独立回归门禁 + 流水线四席专家评审加固）

### Fixed（合规）

- **EE 专有前端文件修改产物随公开 dist 分发（2026-09-21 四席专家评审实锤，E5-P1-A 同类第二路径）**：`apply-hardcoded-labels.cjs` 规则表曾修改 `promotions.ee/module.descriptor.ts` 与 `sourceControl.ee/components/SourceControl{Pull,Push}Modal.vue` 三个 EE 专有源码文件，中文串（如「在环境间晋级工作流变更」）随 2.39.7-v3 起的 Release tarball 与镜像内 editor-ui dist 公开分发（dist chunk 实证，词典 0 命中排除其他来源）。三组规则已拔除，相关面板标签保持英文原文
- **params-zh-map.json 剔除 47 条 EE 评估节点参数译文**（Correctness/Helpfulness/Expected Answer 等指标预设与校验消息；对照上游 n8n@2.39.8 Evaluation 节点源码逐一锚定，`Value Input Mode` 等被 SUL 节点共用的通用词保留）。该映射表随镜像分发至 `/opt/i18n-params/`
- **注入器 JS 兜底模式补 EE 目录段防护**：原仅过滤 `*.ee.*` 文件名，无 `.ee.` 后缀的 EE 节点编译产物（`nodes/Evaluation/…`，含 `Description.node.js`）会被命中改写——**2026-09-20 重推的 2.39.8 镜像取证确认 3 个 EE 文件已被 JS 路径污染**（JSON 主路径因 EE_NODE_SKIP 幸免）；现按 LICENSE 的 dirname 口径补目录段排除 + EE 节点目录跳过
- `extract-node-headers.js` 文件扫描段补同款 `.ee.`/Evaluation 排除（三提取器对齐，堵潜伏回归面）

### Added

- **`script/check-ee-gate.cjs` EE 合规独立回归门禁**（评审 P1-3 落地，此前排除逻辑只活在各脚本内部无产物级校验）：`--map` 扫映射表（values 复用 scan-zh-dict 危险模式 EN 锚定 + keys 的 EE 特征词黑名单，白名单机制防误报）；`--diff` 断言构建后无任何 `.ee.`/`.ee`/nodes-base `Evaluation` 路径改动；`--dist` 断言 EE 保护路径无 CJK（**唯一能拦住镜像内 JS 兜底注入的位置**）。接线：node.js.yml ×2（映射表 + 补丁后改动路径）、image.yml（构建前映射表复核）、Dockerfile（注入后双包断言，污染即构建失败）
- 端到端验证：现售 2.39.8 镜像 dist → 门禁准确命中 3 个污染文件；npm 原版 2.39.6 dist + 清洗后映射表 + 修复后注入器 → 69603 处替换 0 回滚、42 个 EE 保护路径全部无 CJK

### Changed（流水线加固，四席评审 P1/P2）

- watcher（n8n-stable-watch.yml）：上游 tag **SHA 锚定**（评估记录 commit SHA 随 dispatch 传递，防上游 force-push 内容漂移）；**双镜像探测**（n8n+runners，守住同版配对红线）；**失败退避**（连续 3 次失败停自动重试转 Issue，消灭小时级告警轰炸）；en.json 改 GitHub contents API（对齐排障实录 #2 口径）；轮询 45→75min/job 超时 60→90min（minor 不再超时误报，超时改蓝卡）；**残缺发版红灯**（tag 在而 Release 缺失→Issue 转人工，不再假绿静默）；待确认版本建跟踪 Issue（单次通知不再静默搁浅）；watcher 自身失败建 Issue（webhook 失效时的带外通道）；全部卡片发送校验补齐
- node.js.yml：checkout 按 SHA 锚定（未传回退 tag 并告警）；**幂等升级**——「tag 存在」早退改为 Release+tarball 完整性审计（残缺响亮失败，拒绝假绿早退）；EE 门禁 ×2；词典 push 前 rebase（翻译窗口 main 竞争不再中断整链）；setup-node 提前（翻译环节 Node 版本锚定 22）；typescript@5.9.3/pnpm@10.34.5 exact-pin（contents:write job 内浮动依赖投毒面拔除）；Release 说明记录锚定 SHA
- image.yml：**SWR tag 覆盖防护**（已存在同名 tag 须显式 `allow_overwrite=true`，合规重推显式留痕）；EE 门禁；checkout `persist-credentials: false`
- Dockerfile：注入后 EE 断言 RUN（防复发）；Dockerfile.runners 补来源/许可 OCI LABEL（未修改再分发的名义性合规标注）

> ⚠️ **待办（重推范围待定，执行前人工确认）**：①现售 2.39.8 镜像与 Release tarball 携带 EE 前端修改串 + Evaluation 子树 3 文件 CJK，需以修复后管线重建（删 tag 重跑或 dispatch image.yml + 重建 dist，因镜像覆盖防护需显式 allow_overwrite）；②2.39.7-v3 的 Release tarball 含 sourceControl.ee 弹窗中文串，重建成本高，可结合版本退役决策处理。

## [2.39.8] - 2026-09-19（首次全自动无人值守发版 + 交付渠道切华为云 SWR + 产物命名规则）

**兼容**：n8n 2.39.8（精确匹配）；**就近兼容** 2.39.0 ~ 2.39.7（同大版本线）；**不兼容** > 2.39.8 后端。

上游 2.39.8 为补丁版共 3 修复：AI Assistant 工作流预览空白（#38915，前端）、数据加密 key 修复（#38911）、子执行 parked 清理（#38949），词典零增量。**YTJ1 实战升级验证通过（2026-09-19）**：bcphub-bsi 全栈 2.39.7→2.39.8（main+3worker+webhook+runners），dist 换装+品牌重放，四件套+Task Broker+真实域名 healthz 全绿。**本版为 CI 全自动完整包产线首次端到端无人值守发版**：watcher 三项评估绿灯后自动「翻译 → 覆盖率门禁 → 构建 → Release → 镜像」全链无人工动作；同窗口完成交付渠道迁移与产物命名规则落地。

> 📌 **2026-09-20 追记（发布后资产更新）**：部署包回填 `dist/THIRD_PARTY_LICENSES.md`（第三方依赖许可清单，取自上游 n8n@2.39.8 Release 同名附件，与上游附件 sha256 逐字节一致）；分发链路同步固化——node.js.yml 打包步骤随包分发、Dockerfile COPY 至镜像 `/usr/local/lib/node_modules/n8n/THIRD_PARTY_LICENSES.md`，下版起 CI 自动携带。本地按生产 Dockerfile 实测构建验证：容器内两处落点 sha256 与仓库一致、node 运行用户可读、参数注入 71301 处替换零回滚。SWR 存量 4 tag 按策略不重建（不含该文件），2.40 起自然携带。

### Added

- **产物命名规则（2026-09-19 定）**：GitHub Releases 部署包统一 `n8n-editor-ui@<版本号>.tar.gz`（Release 标题同名）；中文镜像统一 `swr.cn-north-4.myhuaweicloud.com/bcphub/n8n-chinese:<版本号>`；`-vN` 发布序号只进 tag 不进产物名。现有 4 个 Release 已按新规则重建（tag 与正文保留）
- image.yml v3：构建源改为 Release 资产下载（不再依赖 tag 内是否提交 dist，Dockerfile 与基础镜像恒用 main 最新）；版本白名单支持 `-vN` 后缀（如 `2.39.7-v3` → 镜像 tag `2.39.7`）
- 旧版本全量回填 SWR：`2.39.7`（v3 内容）/`2.39.6`/`2.38.7`，全部 docker manifest list 双架构（amd64 + arm64）；同批回填 Queue Mode 用的 `n8n-runners` 镜像（`2.39.8`/`2.39.7`/`2.39.6`/`2.38.7`，官方镜像搬运，image.yml 自此每版自动附带）

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

> 📌 2026-09-19 追注：交付渠道已迁移华为云 SWR，2.39.6 镜像已回填 `swr.cn-north-4.myhuaweicloud.com/bcphub/n8n-chinese:2.39.6`（amd64 + arm64，Queue Mode 的 `n8n-runners:2.39.6` 同批回填）；上文旧库地址仅作历史记录。

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
