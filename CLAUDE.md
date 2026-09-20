# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目性质

n8n 编辑器 UI 简体中文汉化包的**构建与分发流水线**，仓库本身不含 n8n 代码。产出三样东西：

- `languages/zh-CN.json` — 中文语言包（自动翻译产物）
- Release 部署包 `n8n-editor-ui@<版本号>.tar.gz` — 编译后的 editor-ui dist（CI 生成，GitHub Release 附件）
- Docker 镜像 → 交付渠道为华为云 SWR **`swr.cn-north-4.myhuaweicloud.com/bcphub/n8n-chinese:<ver>`**（2026-09-19 自 TX-43 自建库 registry.bcpcloud.cn 迁移，旧库存量 tag 见凭证库 `swr/txc_43_registry`；image.yml 需配 `BCP_REGISTRY_USERNAME` / `BCP_REGISTRY_PASSWORD` secrets，真值见凭证库 `swr.hwc_bj4`——username=`cn-north-4@AK`，password=登录指令 `swr_docker_login` 中 `-p` 的密钥；若 SWR 侧重置登录指令需同步更新 secrets；原上游 DockerHub `blowsnow/n8n-chinese` 无发布权限且已冻结在 2.33.7）

**产物命名规则（2026-09-19 定）**：GitHub Releases 部署包 = `n8n-editor-ui@<版本号>.tar.gz`（Release 标题同名）；中文镜像 = `swr.cn-north-4.myhuaweicloud.com/bcphub/n8n-chinese:<版本号>`。版本号跟随上游 n8n；发布序号 `-vN` 只进 release tag（如 `release/2.39.7-v3`），不进产物名（镜像 tag 与部署包名取基础版本号）

**版本保留策略（2026-09-19 定）**：chinese 与 runners 镜像严格同版本一一配对（runner 协议与后端版本强绑定，混搭属未定义行为）；SWR 保留集合 = README 兼容矩阵内全部版本（当前 4 个）；矩阵退役某版本时，SWR 双仓同版本 tag **成对**清理（避免 Queue Mode 升级断点），删除前发退役广播（给存量客户 ≥30 天升级窗口）；两仓均为公开拉取属性（匿名可 pull，客户零凭证）。⚠️ release 事件触发 image.yml 用的是 **tag 指向提交里的 workflow 版本**，不是 main——重建历史 release 会 firing 旧逻辑（2026-09-19 实锤：重建 4 个旧 release 全部触发 v2 时代 workflow 失败）；重推历史版本一律走 `workflow_dispatch`（main 最新逻辑）

原理：n8n editor-ui 内置 vue-i18n 但上游未发布中文包。把 zh-CN.json 编入 n8n 源码的 `packages/frontend/@n8n/i18n/src/locales/` 并打补丁注册语言后重新编译；用户端设 `N8N_DEFAULT_LOCALE=zh-CN` 生效。

**仓库现状（2026-09-18 核实）**：本仓库 fork 自 `other-blowsnow/n8n-i18n-chinese`，上游**已归档**（2026-08-21 停更，最终 Release 为 `release/2.33.7`）。**CI 全自动已上线（2026-09-18 实战定型，完整包模式）**：watcher 每小时监控 n8n 官方稳定版 → 三项确定性评估（补丁贴合/翻译缺口/基础镜像）→ 飞书研发部群卡片；仓库变量 `AUTO_RELEASE=true`——绿灯即自动「翻译→覆盖率门禁→完整包构建→Release→镜像」全链，红灯自动建 `n8n-compat` Issue 等人工适配（全链唯一人工介入点）。2.39.8 首日实战连爆 3 雷（dispatch 403 假绿 / tag 推送被拒 / workflows scope 非法）均当日修复并沉淀为 workflow 注释与门禁；期间曾短暂收窄为补丁包模式，同日按用户决策恢复完整包自动化。**最新 Release 为 `release/2.39.8`（Release 标题 `n8n-editor-ui@2.39.8`，2026-09-19）——全自动产线首个无人值守发版**：上游补丁版 3 修复（词典零增量，9522 键）；2.39.7 的唯一发布为 `release/2.39.7-v3`（v1/v2 已并入其发布说明，tag 保留）：9374 键 + 节点面板第二/三层汉化 + Data tables 硬编码修复；YTJ1 灰度全绿。前作 `release/2.39.6`/`release/2.38.7`；SWR 现存 chinese+runners 双镜像 × 4 版本（2.39.8/2.39.7/2.39.6/2.38.7，全双架构，旧版为 2026-09-19 回填）；存量边端仍沿用 2.33.7/2.38.7 dist（bind mount 覆盖，实测兼容 2.38.x 后端），细节见 bcp-deploy-n8n skill。正常情况下无需人工动作（CI 承包完整包产线）；下节 runbook 供 CI 不可用/本地验证时使用（已经 2.38.7/2.39.6/2.39.7-v3 三轮实战）。，`CHANGELOG.md` 记录发版史实与兼容区间。**许可（2026-09-14 落实）**：上游原无 LICENSE，原作者 imblowsnow 已在 [n8n-nodes-feishu-lite#67](https://github.com/other-blowsnow/n8n-nodes-feishu-lite/issues/67) 明确授权本 fork 以 MIT 继续修改分发；本仓库已补 LICENSE（双版权声明：imblowsnow 继承内容 + BSI 新增内容），README「版权与来源声明」同步引用。分发产物不再受"版权保留"限制约束。**第三方依赖许可清单**（2026-09-19 起）：`THIRD_PARTY_LICENSES.md`（取自 n8n 官方发行物、原文照录，根目录与 editor-ui-dist 各一份）随部署包与镜像分发，CI 打包步骤与 Dockerfile 已接线；**2026-09-20 起发版时自动刷新**——node.js.yml 新增步骤拉上游对应 Release 附件回写（失败保留副本告警人工），随 dist 提交回写仓根供镜像侧取用（原纯人工步骤 × 全自动发版=结构性错位，评审 E5-P2-A）。**🔴 .ee 专有内容排除（2026-09-20 评审 E5-P1-A 实锤后修复）**：上游 LICENSE.md 明文 `*.ee.*` 文件与 EE 节点（evaluation/evaluationTrigger）不适用 SUL、须企业授权——注入器/提取器曾无排除导致 24+93 条 EE 内容被改写随 2.39.8 镜像公开分发（**合规违规**），已修复（inject/extract 双端 `.ee.` 文件排除 + JSON 模式 EE 节点子树跳过 + 映射表剔除 24 条 EE 专有键）并重推干净 2.39.8 镜像；2.39.7/2.39.6/2.38.7 构建于注入落地前实证干净。**修改声明（NOTICE/README，2026-09-20 枚举化刷新）**：修改范围=语言包注入+面板查表+前端硬编码替换+两包参数串构建期替换（不含 EE）——原「仅为注入语言包」表述在 M3/langchain 之后已失真，声明过窄比不声明更糟；README 另加翻译准确性限责声明。

## 常用命令

```shell
npm run i18n:translate        # 增量翻译（script/translate.js）
NODE_PATH=/tmp/n8n-ts-extract/node_modules node script/extract-node-headers.js <n8n源码worktree>
# ↑ 从 n8n 源码静态提取节点级描述 + 节点面板操作标题 → script/en-nodes.json（TS 编译器 API 解析 .node.ts，无需编译 n8n）
#   typescript 隔离安装：mkdir -p /tmp/n8n-ts-extract && cd /tmp/n8n-ts-extract && npm init -y && npm i typescript@5 dotenv lodash p-limit@2
#   源码用 git worktree pin 到目标 tag：git -C <n8n clone> worktree add /tmp/n8n-<ver>-src "n8n@<ver>" --detach

# ── 节点参数汉化管线（2026-09-19 立项 M1-M3，详见下节）──
node script/extract-node-parameters.cjs <types/nodes.json> docs-inner/参数汉化-M1/   # 主提取（运行实例 types payload）
node script/extract-params-from-dist.cjs <nodes-base dist目录> /tmp/params-dist-unique.json  # dist 对账补缺（多版本节点旧版 + credentials）
node script/translate-params.cjs docs-inner/参数汉化-M1/params-unique.json docs-inner/参数汉化-M1/params-zh-map.json  # 增量翻译（跳过已译、断点续写）
node script/inject-params.cjs <nodes-base dist目录> <params-zh-map.json>  # 注入（显示属性定向替换 + 语法校验）
#   dist 测试床免编译获取：npm pack n8n-nodes-base@<ver> && tar -xzf（⚠️ 上游 npm 不发 patch 版，2.39.7/8 无包，发布序列跳号）
#   langchain 包同管线（2026-09-20 接入）：npm pack @n8n/n8n-nodes-langchain@<ver> 后对同版跑双提取器合并入映射表；
#   其 dist/types/nodes.json 为独立预生成缓存（130 节点条目，AI Agent 等不在 nodes-base 缓存内）
```

无测试、无 lint。Node ≥18（translate.js 用全局 `fetch`），CI 用 Node 22。

translate.js 环境变量（OpenAI 兼容接口，可放 `.env`；dotenv 从**运行时所在目录**加载，CI 在 `script/` 下直接注入环境变量）：

- `OPENAI_API_KEY`、`OPENAI_API_BASE` — 必填，请求发往 `BASE + "/chat/completions"`
- `OPENAI_MODEL` — 模型名
- `OPENAI_API_CONCURRENT` — 并发数，默认 2
- `OPENAI_BATCH_SIZE` — 单次 LLM 调用翻译条数，默认 1（上游逐条行为）。免费档 API 有 RPM 限制时设 15+，请求数降一个数量级
- `OPENAI_429_MAX_RETRIES` — 连续 429 熔断阈值，默认 10：trip → 冷却 60s 自动续翻，二次 trip 永久锁存终止本 run；连续超时 2 批同样锁存
- `OPENAI_TIMEOUT_MS` — 单请求超时毫秒，默认 60000：覆盖推理模型大批次慢生成；GitHub en.json 拉取同用此超时
- `N8N_EN_JSON_URL` — 英文源覆盖：http(s) URL（可 pin 到 n8n 版本 tag，`@` 写作 `%40`）或**本地文件路径**。默认 master（可能领先最新 Release）

**国内本机运行注意（2026-09-12 实测）**：

- Node fetch（undici）**不消费 http_proxy 环境变量**——curl 能通不代表 node fetch 能通，LLM 调用须加 `NODE_USE_ENV_PROXY=1`（Node 24+）
- raw.githubusercontent.com 同理：本机跑先 `curl` 把 en.json 下载到本地，`N8N_EN_JSON_URL=/path/en.json` 传入
- 不要 `npm install` 全量依赖——`n8n-nodes-base@latest` 依赖原生模块 `isolated-vm`，新 Node 上 gyp 编译失败。隔离安装：`/tmp` 建目录装 `dotenv lodash p-limit@2`，运行时 `NODE_PATH` 指向
- 主用组合（2026-09-18 起，CI secrets 已配）：DeepSeek v4（`deepseek-chat`，api.deepseek.com）+ `OPENAI_BATCH_SIZE=15`；备用 gemini-3.5-flash-lite（flash 免费档仅 5 RPM 不可用；OpenRouter key 无余额会 402；智谱 key 无模型权限）。2183 条 ≈ 10 分钟
- 批量调用失败先二分降级重试（拆半直到单条），仅最终仍失败的单条记日志跳过、不写入 zh-CN.json，下次运行自动补翻

## 翻译流程（script/translate.js）

1. 从 n8n master 拉官方 `en.json`，与本仓库 `script/en-nodes.json`（若存在）lodash.merge 作为完整英文基准。en-nodes.json 由 `extract-node-headers.js` 生成：`headers.<节点短名>.description`（面板第二层节点描述，568 节点）+ `headers.actionTitles.<英文短语>`（面板第三层操作标题，582 条），均与 n8n 版本 tag 对齐提取
2. 三方对比（新 en.json / 旧基准 `script/en.json` / 现有 `languages/zh-CN.json`），只翻译：**新增 key** 或 **英文原文已变化的 key**
3. 批协议：key 用 `##` 打平仅用于内部回填，实际传给 LLM 的是等长 JSON 字符串数组（仅原文）；LLM 输出剥掉 `<think>` 块（兼容推理模型）与 markdown 代码围栏；429 退避 5s 重试，其余非 200 交给 retry 重试
4. 产物按新 en.json 的 key 顺序排序写回 `languages/zh-CN.json`，并把新 en.json 存为下次的旧基准
5. 单条翻译失败只记日志不中断，失败的 key 不会出现在 zh-CN.json 中

关键不变量：

- `script/en.json` 是"已翻译基准"，决定下次增量的范围；它的结构必须始终跟随上游 en.json
- `languages/zh-CN.json` 的嵌套结构与 en.json 同构
- 两者都是自动生成物，CI 以 `chore: auto translate` 提交，不要手工改动结构；手工补译时保持 key 不变即可被下次运行保留

## 节点参数汉化管线（2026-09-19 立项，M2 完成 / M3 已灰度全绿）

参数面板串（displayName/options/description/hint/placeholder）硬编码于 nodes-base 源码、经后端 types payload 直出、**前端渲染不过 i18n 查表**（审计实证），故走「构建期定向替换」路线。命令见「常用命令」节。产物：`script/params-zh-map.json`（en→zh 映射 28065 条，2026-09-20 起**双包共用**：nodes-base 26100 + langchain 扩展 1965（2.39.6 与 2.40.2 双版并集，覆盖 AI Agent/Chat Model/记忆/向量存储等全 langchain 系），**按英文原文锚定、结构无关**——上游重构不影响映射表）。

- 🔴 **注入主路径=静态缓存**（YTJ1 灰度 2026-09-19 实证）：运行时 `/types/nodes.json` 直接 serve `n8n-nodes-base/dist/types/nodes.json` **预生成 JSON**（1031 节点版本条目），节点 dist JS 不被重新执行——只注入 JS 目录对 types 零效果（首灰度 16% 全是社区节点自带中文的误判）；必须 JSON 注入该文件，JS 扫描仅作动态路径兜底。`dist/known/nodes.json` 无参数内容无需处理
- **双源提取**：types payload（`extract-node-parameters.cjs`，主源但只含各节点当前版参数）+ dist 对账（`extract-params-from-dist.cjs`，补多版本节点旧版参数与 credentials 描述）。⚠️ types 基线勿从被 POC 污染的实例拉（Code 节点串已中文化，2026-09-19 剔除过 8 条）
- **翻译器**（`translate-params.cjs`）：DeepSeek 批 15 + 术语表强约束 + 增量跳过已译 + 批级补译 + 每 300 条断点落盘。🔴 batch 元素必须带 `i` 字段且发送/响应查找共用同一份数组——曾因缺 `i` 致 `obj[String(b.i)]` 恒 miss，30 条假性"被安全校验拦截"（实为 bug 误诊）
- **注入器**（`inject-params.cjs`，双模式自动分流）：JSON 模式=结构化 walk（displayName/description/placeholder/hint/label 全量；**name 仅替换非标识符形态**——`^[a-z][A-Za-z0-9_]*$` 视为参数键保护），写前 parse 校验；JS 目录模式=反转义精确匹配 + 统一双引号风格输出 + `node --check`（🔴 dist 是 ESM，--check 须 `.mjs` 判定），坏且原文可过才回滚
- **接线**：Dockerfile 构建期四路注入（nodes-base 与 @n8n/n8n-nodes-langchain 各 JSON+JS 两路，2026-09-20 起；langchain 为 packages/cli 直接依赖 workspace:*，与 nodes-base 同一 pnpm deploy 物化路径 `.../node_modules/@n8n/n8n-nodes-langchain/dist`）（运行时零开销）；映射表随 main 走，image.yml checkout main 天然取最新，CI 无需额外步骤
- **验证口径**：测试床 `npm pack n8n-nodes-base@<ver>` tarball（⚠️ 上游 npm 不发 patch 版：2.39.7/8 无包，官方 2.39.8 镜像内 nodes-base 实为 2.39.6）；types 层看 displayName 中文化占比；UI 层开节点参数面板抽查
- **灰度结论（2026-09-19，YTJ1 bcphub-test 五容器）**：JSON 注入 95% 利用率 → types displayName 中文化 84%（残留多为 ID/URL 类术语保留串）→ Slack「发送消息」面板全中文（资源=消息/操作=发送/发送消息至/消息类型=简单文本消息）；节点标题 "Send a message" 英文属 actionTitles 词典缺口（第三层管线，与参数汉化无关）。回滚锚点：各容器 `dist/types/nodes.json.bak-params-m3`（宿主机另存 /tmp/ytj1-nodesbase-dist-bak.tar.gz）
- 待办：译串「全量评审 vs 抽样+客户反馈回路」→ **已定：抽样+客户反馈回路（2026-09-19 用户定）**；~~参数汉化随下版镜像携带~~ **已实证随 2.39.8 镜像分发（2026-09-20 本机拉 SWR 官方镜像跑通：Slack「发送消息」面板全中文——repush 轮 image.yml checkout main 天然带入注入接线）；后续重点是映射表扩充与抽样评审**
- ~~错误消息汉化（下版清单原第 2 项）~~ **已拍板暂缓（2026-09-20 用户定，三方案对比后选 C）**：价值受体错位（交付模式=乙方实施+乙方运维，错误第一读者是己方、需英文原文提工单/搜上游）+ A 路线双语不可逆写执行库的数据侵入顾虑。工具与 553 条译文封存 `docs-inner/错误消息汉化-暂缓/`（提取器/注入器/映射表；A 路线复活=接线 Dockerfile 2 行约 15 分钟）；**触发器**=错译反馈回路「看不懂报错」求助 ≥3 次/季度或客户明确要求，届时优先审计 B 路线（前端显示层，数据零侵入）。对外统一口径：「报错保留英文原文便于乙方排查定位，按需可开启双语」。🔴 设计规则（若重启必守）：错误/诊断类文案**双语追加**（EN 原文在前+ZH 附后——下游 ai-utilities 解析器按英文模式匹配、工单检索依赖原文前缀），界面文案纯中文替换，两类不得混用

## 发布流水线（CI 全自动，2026-09-18 实战定型）

三个 workflow，图文详解+高频问答见 `docs-inner/2026-09-18-n8n汉化自动化工作流介绍.md`（mermaid 流程图+时序图+告警体系）：

1. **`n8n-stable-watch.yml`**（每小时 cron `37 * * * *` + 手动入口）：GitHub API 枚举 n8n releases，过滤 prerelease 且只跟本插件当前大版本线 → 门禁（已有 tag / watched.json 状态机已评估则 8 秒早退）→ 三项评估：补丁 `git apply --check`（失败降级 `patch --fuzz=3` 判黄；`fix_editor-ui.patch` 与 `.old` 同列忽略）、翻译缺口（与 translate.js 同口径）、基础镜像探测 → 飞书卡片（绿/黄/红）。`AUTO_RELEASE=true` 且镜像已发布时绿灯自动 dispatch 发版；红灯自动建 `n8n-compat` Issue（同版本查重）。失败不入 watched 状态，下个整点自动重试。手动入口：`force_version` 演练（semver 白名单校验）/ `report_only` 只报告。
2. **`node.js.yml`**（仅 dispatch，原每小时 cron 已移除）：translate.js 增量翻译（`N8N_EN_JSON_URL` 固定 pin 到同版本 tag，评审 D2）→ **词典覆盖率门禁**（zh 缺失>0 自动补翻一轮，补后 <99% 阻断发版——堵 LLM API 耗尽静默带病发版）→ 提交词典 → checkout n8n **git tag** → 注入词典 + 三个 patch → 构建 dist → 打 `release/x.y.z` tag → GitHub Release（说明由 `gen-release-notes.sh` 生成，LLM 总结失败降级原文）→ dispatch 联动镜像。🔴 两条铁律：**不可声明 `workflows:` scope**（GITHUB_TOKEN 不支持，声明即整文件 startup_failure、dispatch 连锁 403——实锤）；**先提交 dist 再 `git rebase origin/main` 后打 tag**（构建窗口内 main 的 workflow 提交不得进 tag 历史，否则推送被拒——实锤）。`if:failure()` 飞书红卡与 watcher 轮询红卡双保险。
3. **`image.yml`**（node.js.yml dispatch 触发 + 人工重推）：版本 semver 白名单校验 → buildx multi-arch（amd64+arm64）推 SWR → 成功/失败均推飞书研发部群卡片。

告警体系：评估三色卡、发版结果卡、镜像成功绿卡/失败红卡、红灯 Issue；飞书卡片 jq 程序括号层级 = elements 在 card 对象内（`template:$c},elements:...]}}`），改卡片必须先本地 jq 验证。辅助通知：`feishu-pr-notify.yml`（PR 生命周期）、`feishu-security-notify.yml`（每小时 CodeQL 告警去重推送）。

n8n 新旧目录布局兼容：新布局 `packages/frontend/editor-ui`（≥2.38，src 为 `features/` 结构）vs 旧布局 `packages/editor-ui`（≤2.33）。`fix_editor-ui.patch` 与 `fix_editor-ui.old.patch` 内容相同（CredentialConfig.vue 加空值保护），仅目标路径不同，**仅 ≤2.33 手动构建需要**——watcher 已将其与 `.old` 同列忽略（2026-09-18 起，评估卡不再出现误导性 ❌）。

## CI 重跑排障实录（2026-09-19 删 tag 重推 2.39.8 七跑全绿沉淀）

重推同版本流程：`gh release delete release/<ver> --cleanup-tag`（先备份资产）→ dispatch node.js.yml。连炸六关的教训（**新增 CI 步骤/门禁必须真实跑一轮流水线验证，本地/语法审查不算数**）：

1. **词典安全扫描 wd**：仓库检出带 `path: ./n8n-i18n-chinese` 嵌套，步骤漏配三层 working-directory 即「文件不存在」
2. **🔴 raw.githubusercontent Fastly 变体分裂（最大坑）**：en.json 是**半扁平结构**（8350 顶层复合键 + 2 嵌套段），递归 get 在其上查复合键恒 None——**判定内容差异必须用 flat 遍历，勿用递归 get**。Node fetch 默认带压缩头会命中 Fastly 的 gzip/br 变体缓存，与 identity 变体可能内容不同步；cache-bust query 无效（该域 Fastly 丢弃 query）。根治=translate.js 已把 raw URL 自动转 GitHub contents API（base64 直读 git 对象）
3. **扫描器 linked-message 分级**：上游 en 基线自身可能悬空引用（`settings.usageAndPlan.error=@:_reusableBaseText.error` 而 `_reusableBaseText` 无 error），zh 忠实镜像不构成污染——「en 同值同悬空」降级 WARN，仅「en 完好而 zh 悬空」HIGH
4. **语义脚本 CI 路径**：working-directory 已是 n8n 根时参数必须传 `.`（传 `./n8n` 双重拼接成不存在路径）
5. **🔴 勿加 `--ignore-scripts`——上游 allowBuilds 白名单已是精准放行**：上游 pnpm-workspace.yaml 自带 `allowBuilds` 清单（pnpm 11 特性），仅放行 sqlite3/isolated-vm/kafka-javascript/ripgrep 四个合法原生包，其余依赖脚本默认全禁（投毒面已最小化）。加 flag 会**覆盖白名单**把合法构建也禁掉：本地复现实锤 sqlite3 原生模块缺失 → nodes-langchain 的 n8n-generate-metadata require 崩 → turbo 任务 70→65 连锁失败（六跑实锤）。七跑验证白名单机制正常（isolated-vm 构建日志可见）。后续若要强化供应链：审查 allowBuilds 清单本身 + codeql/dependabot 已有，勿动 install flag
6. **上游可能 force-push 已发 tag**（2.39.8 实证回退过功能键）：重推历史版本时核对 git 对象级内容（gh api contents），勿信缓存与记忆
7. 全链 bot 提交（`chore: auto translate`）会与本地修复竞争——推修复前先 fetch --rebase；dispatch 前确认 HEAD 已含全部修复

## 手动构建发布 runbook（2.38.7 / 2.39.6 / 2.39.7-v3 三轮实战验证）

正常情况下 CI 全自动承包完整包产线，本 SOP 供 CI 不可用、补丁红灯本地适配、或需要本地验证时使用（CI 发过补丁包/完整包的版本若需重推资产用 `gh release upload release/<ver> <文件> --clobber -R bsi-bcp/n8n-i18n-chinese`）：

1. **翻译对齐**：按「常用命令」节跑 `translate.js`（`N8N_EN_JSON_URL` pin 到目标 tag 或本地 curl 预下载），提交 `chore: auto translate`
2. **源码准备**：`git clone --depth 1 --branch "n8n@<ver>" https://github.com/n8n-io/n8n.git`（约 320M）。engines 要求 **node≥24 / pnpm≥11.22**——pnpm 用 corepack 解决：`corepack enable --install-directory /tmp/corepack-bin && export PATH=/tmp/corepack-bin:$PATH`（n8n 的 packageManager 字段会自动 pin 到正确版本）
3. **注入 + 补丁**：拷 `languages/zh-CN.json` 到 `packages/frontend/@n8n/i18n/src/locales/`；`git apply patches/feat__i18n_zhCn.patch patches/feat__node_creator_actions_i18n.patch` && `node script/apply-hardcoded-labels.cjs .`（⚠️ 2026-09-19 起 fix__hardcoded_labels.patch 已废弃改语义脚本 apply-hardcoded-labels.cjs——git apply 上下文匹配被 2.40 defineFrontendModule 重构打爆，脚本对 2.39/2.40 双结构通吃；其余补丁失效则手动做等效修改并重新生成 patch，见「patch 注意事项」）
4. **安装**：`CI=1 pnpm install --frozen-lockfile --filter "n8n-editor-ui..."`。🔴 两个关键：**`CI=1` 必须带**——根 `prepare.mjs` 会跑 lefthook 安装，非 CI 环境下因过滤安装没装 lefthook 而秒挂（ELIFECYCLE 无输出）；**过滤安装**只装 editor-ui 子图，避开后端原生依赖（isolated-vm 在新 Node 上 gyp 编译失败）
5. **构建**：`CI=1 pnpm --filter "n8n-editor-ui..." build` → 产物在 `packages/frontend/editor-ui/dist/`
6. **打包**：`cp NOTICE-n8n-localization.md THIRD_PARTY_LICENSES.md packages/frontend/editor-ui/dist/ && tar -czf "n8n-editor-ui@<ver>.tar.gz" -C packages/frontend/editor-ui dist`（SUL 随附条款随包分发，评审 D-E5-1/D-E5-8；第三方依赖许可清单 2026-09-19 起随包分发——**取自上游对应版本 Release 的同名附件**（上游每个 Release 均附带 THIRD_PARTY_LICENSES.md / sbom-source.cdx.json / vex.openvex.json 三件套，发版时下载对应 tag 附件刷新本文件即可），清单覆盖 n8n 全体依赖，对 dist 前端子集属从宽声明，镜像侧 `/usr/local/lib/node_modules/n8n/THIRD_PARTY_LICENSES.md` 为精确口径；macOS tar 的 LIBARCHIVE.xattr 警告在 Linux 解包无害）
6½. **镜像交付（国内客户渠道）**：正常走 CI 自动构建推送华为云 SWR `swr.cn-north-4.myhuaweicloud.com/bcphub/n8n-chinese:<ver>`（Dockerfile FROM `ghcr.io/n8n-io/n8n:<ver>` + `COPY editor-ui-dist` 到 `.../n8n-editor-ui/dist` + `ENV N8N_DEFAULT_LOCALE=zh-CN`，amd64+arm64）。GitHub Releases 拉包对国内客户边端不稳（超时/CDN reset），SWR 是正式交付通道，Releases 仅作公开存档。手动补推可在 TX-43 构建 push 到 SWR（SSH `43.139.228.145:22` root，凭证库 `bcp_ipaas/server/txc_43`）秒级完成；客户实例首次需 `docker login swr.cn-north-4.myhuaweicloud.com`（凭证 `swr.hwc_bj4`）
7. **灰度验证（bcphub-bsi = YTJ1 `/opt/bcphub-test`）**：SSH 经 TX-43 FRP `43.139.228.145:60001`（凭证库 `bcp_ipaas/server/ytj1`）。流程：备份旧 dist（`mv dist dist-bak-<旧版>-<日期>`）→ 解包新 dist（`--strip-components=1`）→ `python3 ui-brand-patch/bsi-ui-brand-patch-*.py` 重放品牌 → `docker compose restart n8n`（重同步容器内 cache）→ 域名验证四件套：`/healthz`+`/healthz/readiness`、页面 title、新 bundle hash 与本机构建一致、**新增文案中文抽查**（挑只有新版才有的串 grep 线上 asset）
8. **发布**：`git tag release/<ver> && git push origin release/<ver>` → `gh release create release/<ver> "n8n-editor-ui@<ver>.tar.gz" --title "n8n-editor-ui@<ver>"`。🔴 **必须加 `-R bsi-bcp/n8n-i18n-chinese`**——本地配了 `upstream` remote 时 gh 会推断成已归档的上游仓库并拒绝（"tag exists locally but has not been pushed to other-blowsnow/..."）。若 CI 已建同名 tag/Release，改用 `gh release upload release/<ver> "n8n-editor-ui@<ver>.tar.gz" --clobber -R bsi-bcp/n8n-i18n-chinese` 追加/替换附件
9. **收尾**：更新 README「n8n 版本兼容说明」矩阵 + CHANGELOG 固化版本段（Unreleased→正式版，含兼容区间/灰度结论/镜像地址）；若上游 index.ts 有变，重新生成 patch 一并提交

### runbook 实战增补（2026-09-16 对 2.39.6 第二轮验证）

- **镜像源绕行**：TX-43 与 YTJ1 均无法稳定拉 DockerHub（pull 直接失败/`unexpected EOF`）。同版本镜像走 `ghcr.io/n8n-io/n8n:<ver>` 与 `ghcr.io/n8n-io/runners:<ver>`（两边 manifest 实测可达），pull 后 retag 为 `n8nio/*` 供 compose 使用；中文镜像与基础镜像（`bcp/n8n:<ver>`、`bcp/n8n-runners:<ver>`）在 TX-43 从 ghcr 拉取后推 SWR。**YTJ1 直拉 SWR 大镜像（~2GB）反复 unexpected EOF**，边端拉取优先 ghcr 或分片传输
- `corepack enable --install-directory <dir>` 要求目录**预先存在**，否则 ENOENT
- pnpm 首跑 install 可能瞬时 ELIFECYCLE 无输出（重试即过）；诊断用 `--ignore-scripts` 对照 + `--reporter=ndjson` 定位 lifecycle
- **bcphub-test compose**：worker 是单服务多副本（`--scale worker=3`）。旧部署遗留的孤儿容器（`bcphub-test-worker-N-1`）升版后仍在跑旧镜像消费队列，须 `docker compose up -d --remove-orphans` 清理——注意它会同时把 scale 缩回 compose 默认值 1，需再 `up -d --scale worker=3 worker`
- **灰度文案抽查注意**：zh 词典在多个 `src-*` chunk 中的**特定一个**（2.39.6 为 `src-Dnwuzjmo.js`，含"部署名称"），别对 `grep -oE 'src-[^"]*\.js' | head -1` 的首个结果做检查；稳妥做法是对比该 chunk 线上 md5 与本机构建
- 翻译耗时参考：104 条增量 batch=15 ≈ 1 分钟；2.39.6 的 i18n `index.ts` 与 2.38.7 **字节级一致**（patch 免重生成，但每次仍需 `git apply --check --reverse` 验证）

### runbook 实战增补三（2026-09-18 对 2.39.7-v3 第三轮验证）

- **pnpm 11 + Node 24 本机构建**：过滤安装会拉进 isolated-vm（gyp 编不过）——用 `--ignore-scripts` 安装（前端工具链全走平台二进制可选依赖，无副作用）；`package.json` 的 `pnpm.neverBuiltDependencies` **pnpm 11 已不读**（配置迁到 pnpm-workspace.yaml 也无效于本场景），别在这上面浪费时间
- **补丁重放铁律**：worktree 里重新生成任一 patch 前的 `git stash`/`checkout -- .` 会清掉**全部**补丁——重建前必须三补丁齐放，并 grep 标记验证（`cnBaseText`×2 / `actionTitles`×2 / `const i18n = useI18n()`×1 / `get label()`×2）
- **产物验证门**：分发前必须 grep 构建产物含 zh 串（`数据转换` + 本版新增译串各一）——曾产出无词典 dist 险些全量交付；@n8n/i18n 的 dist 是词典真正入口，编辑器消费的是它的构建产物
- 仓库 patch 文件改完**必须 git add**（曾漏提交致 HEAD 带旧版 patch，CI 下次发版即复现故障）；patch 内用 `useI18n` 必须同时声明 `const i18n = useI18n()`（vite 构建不报错，运行时才炸）
- 飞书卡片：`elements` 必须在 `card` 对象内（正确形态 `template:$c},elements:...]}}`），发版链三张卡 + PR/安全通知共 5 处，改完逐处 jq 验证

## patch 注意事项

- `patches/feat__i18n_zhCn.patch` 修改 n8n 上游 `packages/frontend/@n8n/i18n/src/index.ts`：import zh-CN 语言 + 注册进 vue-i18n messages（`messages: { en: englishBaseText, 'zh-CN': cnBaseText }`）。**上游该文件每次重构都会使 patch 失效**——`git apply` 报 "patch does not apply" 时，直接在新版源码上手动做等效两行修改，再 `git diff` 重新生成 patch。当前版本：2026-09-12 针对 2.38.7 重新生成（git diff 格式）
- `patches/fix_editor-ui.patch`（旧 `fix_editor-ui.old.patch` 同理）：CredentialConfig.vue 空值保护。**2.38.x 起上游已自行修复，对新版源码不再需要**；仅构建 ≤2.33 旧版时使用。另注意 2.38.x 的 editor-ui src 重构为 `features/` 结构（CredentialConfig.vue 迁至 `src/features/credentials/components/CredentialEdit/`）
- `patches/feat__node_creator_actions_i18n.patch`（2026-09-18 针对 2.39.7 新增）：editor-ui 节点面板第三层 `ActionItem.vue` 标题查表 `headers.actionTitles.<英文短语>`（词典由 extract-node-headers.js 产出，未命中回退原文）。上游重构 ActionItem.vue 或 useActionsGeneration.ts 的 action 生成逻辑会使其失效
- **`fix__hardcoded_labels.patch` 已废弃（2026-09-19 鲁棒化）→ `script/apply-hardcoded-labels.cjs` 语义脚本**：2.40.3 实测上游把模块定义重构为 `defineFrontendModule()`，git apply 上下文匹配失效（脚本对 2.39/2.40 双结构实测 9/9 命中）；2.40.3 另将 insights 迁 `@n8n/frontend-module-insights`（不影响本脚本）。原 patch 说明：①SourceControl Pull/Push 弹窗各 3 处硬编码标签（Workflows/Credentials/Data Tables）改走既有 locale key——同步弹窗「Data Tables」实锤根因（bundle 实证）；②dataTable 模块描述符 `projectTabs` 两处 label 与 resources displayName 改 **getter 延迟求值**——模块描述符在应用启动时（locale 从后端加载前）求值，直接 baseText 会把英文冻结进字符串且永不更新（概述页 Data tables tab 实锤，截图确认）。上游若自行 i18n 化这两处，对应 hunk 应删除。弹窗另有 Variables/Tags/Folders/Projects/New/Modified/Deleted 等硬编码串未处理（低频，按需再扩）
- ⚠️ 节点描述含 "deprecated" 字样的条目，翻译必须保留英文词（NodeItem 靠 `description.includes('deprecated')` 打弃用徽标，翻成「已弃用」会丢徽标）；目前仅 1 条（outputParserAutofixing，已手工修为「已弃用（Deprecated），…」），每次提取新版本后需复查
- 手动修改源码后验证：`git -C <n8n源码目录> apply --check --reverse <patch路径>`（已应用状态应通过，同时证明格式可解析）
