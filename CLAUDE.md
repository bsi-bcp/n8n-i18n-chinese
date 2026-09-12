# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目性质

n8n 编辑器 UI 简体中文汉化包的**构建与分发流水线**，仓库本身不含 n8n 代码。产出三样东西：

- `languages/zh-CN.json` — 中文语言包（自动翻译产物）
- `editor-ui.tar.gz` — 编译后的 editor-ui dist（CI 生成，GitHub Release 附件）
- Docker 镜像 → 2026-09-12 起指向 BCP 私有库 `registry.bcpcloud.cn/bcp/n8n-chinese`（image.yml 需配 `BCP_REGISTRY_USERNAME` / `BCP_REGISTRY_PASSWORD` secrets，真值见凭证库 `swr.txc_43`；原上游 DockerHub `blowsnow/n8n-chinese` 无发布权限且已冻结在 2.33.7）

原理：n8n editor-ui 内置 vue-i18n 但上游未发布中文包。把 zh-CN.json 编入 n8n 源码的 `packages/frontend/@n8n/i18n/src/locales/` 并打补丁注册语言后重新编译；用户端设 `N8N_DEFAULT_LOCALE=zh-CN` 生效。

**仓库现状（2026-09-12 核实）**：本仓库 fork 自 `other-blowsnow/n8n-i18n-chinese`，上游**已归档**（2026-08-21 停更，最终 Release 为 `release/2.33.7`）。本 fork 的 GitHub Actions 从未运行（无 tag、无 Release、无 workflow run），翻译提交同样停在 2026-08-21 —— 下文「发布流水线」是 workflow 的设计行为，在本仓库从未实际执行。BCP 侧的实际消费方式：n8n >2.33.7 的部署**沿用 2.33.7 的 editor-ui dist**（bind mount 覆盖，实测兼容 2.38.x 后端），细节见 bcp-deploy-n8n skill；若要恢复追新，跑 `npm run i18n:translate`（en.json 拉自 n8n **master** 分支，注意 master 可能领先最新 Release）+ 手动走构建发布流程。

## 常用命令

```shell
npm run i18n:translate        # 增量翻译（script/translate.js）
node script/get-n8n-nodes.js  # 从 node_modules/n8n-nodes-base 提取节点文案 → script/en-nodes.json（需先 npm install）
```

无测试、无 lint。Node ≥18（translate.js 用全局 `fetch`），CI 用 Node 22。

translate.js 环境变量（OpenAI 兼容接口，可放 `.env`；dotenv 从**运行时所在目录**加载，CI 在 `script/` 下直接注入环境变量）：

- `OPENAI_API_KEY`、`OPENAI_API_BASE` — 必填，请求发往 `BASE + "/chat/completions"`
- `OPENAI_MODEL` — 模型名
- `OPENAI_API_CONCURRENT` — 并发数，默认 2
- `OPENAI_BATCH_SIZE` — 单次 LLM 调用翻译条数，默认 1（上游逐条行为）。免费档 API 有 RPM 限制时设 15+，请求数降一个数量级
- `N8N_EN_JSON_URL` — 英文源覆盖：http(s) URL（可 pin 到 n8n 版本 tag，`@` 写作 `%40`）或**本地文件路径**。默认 master（可能领先最新 Release）

**国内本机运行注意（2026-09-12 实测）**：

- Node fetch（undici）**不消费 http_proxy 环境变量**——curl 能通不代表 node fetch 能通，LLM 调用须加 `NODE_USE_ENV_PROXY=1`（Node 24+）
- raw.githubusercontent.com 同理：本机跑先 `curl` 把 en.json 下载到本地，`N8N_EN_JSON_URL=/path/en.json` 传入
- 不要 `npm install` 全量依赖——`n8n-nodes-base@latest` 依赖原生模块 `isolated-vm`，新 Node 上 gyp 编译失败。隔离安装：`/tmp` 建目录装 `dotenv lodash p-limit@2`，运行时 `NODE_PATH` 指向
- 实测可用组合：`gemini-3.5-flash-lite` + `OPENAI_BATCH_SIZE=15`（flash 免费档仅 5 RPM 不可用；OpenRouter key 无余额会 402；智谱 key 无模型权限）。2183 条 ≈ 10 分钟
- 一次批量调用失败会记日志并跳过整批，失败的 key 不写入 zh-CN.json，下次运行自动补翻

## 翻译流程（script/translate.js）

1. 从 n8n master 拉官方 `en.json`，与本仓库 `script/en-nodes.json`（若存在，由 get-n8n-nodes.js 生成）lodash.merge 作为完整英文基准
2. 三方对比（新 en.json / 旧基准 `script/en.json` / 现有 `languages/zh-CN.json`），只翻译：**新增 key** 或 **英文原文已变化的 key**
3. key 用 `##` 分隔打平传给 LLM，回填时还原嵌套；LLM 输出剥掉 `<think>` 块（兼容推理模型）；429 时等待 1s 重试
4. 产物按新 en.json 的 key 顺序排序写回 `languages/zh-CN.json`，并把新 en.json 存为下次的旧基准
5. 单条翻译失败只记日志不中断，失败的 key 不会出现在 zh-CN.json 中

关键不变量：

- `script/en.json` 是"已翻译基准"，决定下次增量的范围；它的结构必须始终跟随上游 en.json
- `languages/zh-CN.json` 的嵌套结构与 en.json 同构
- 两者都是自动生成物，CI 以 `chore: auto translate` 提交，不要手工改动结构；手工补译时保持 key 不变即可被下次运行保留

## 发布流水线（.github/workflows/node.js.yml，每小时运行；⚠️ 本 fork Actions 从未启用，以下为设计行为）

检测到 n8n 官方新 Release 且本仓库无对应 tag 时串联执行：

1. 运行 translate.js → 提交语言包变更
2. checkout n8n-io/n8n 对应 ref（tag 取自 release 的 target_commitish，去掉 `release/` 前缀）→ `pnpm install --frozen-lockfile` 构建整仓（CI 用 Node 22 + pnpm 10）
3. 拷贝 zh-CN.json 进 `packages/frontend/@n8n/i18n/src/locales/`，应用 `patches/feat__i18n_zhCn.patch`
4. 打包 editor-ui dist → 提交进仓库 → 打与 n8n 同名 tag → GitHub Release 附 editor-ui.tar.gz；tag 再触发 image.yml 推送 Docker 镜像

n8n 新旧目录布局兼容：CI 检测 `packages/frontend/editor-ui`（新布局）vs `packages/editor-ui`（旧布局）来决定 dist 打包路径与所用 fix 补丁。`fix_editor-ui.patch` 与 `fix_editor-ui.old.patch` 内容相同（CredentialConfig.vue 加空值保护），仅目标路径不同。

## 手动构建发布 runbook（2026-09-12 对 2.38.7 全链路实战验证）

Actions 未启用的现状下，追新版本按此 SOP 手动执行：

1. **翻译对齐**：按「常用命令」节跑 `translate.js`（`N8N_EN_JSON_URL` pin 到目标 tag 或本地 curl 预下载），提交 `chore: auto translate`
2. **源码准备**：`git clone --depth 1 --branch "n8n@<ver>" https://github.com/n8n-io/n8n.git`（约 320M）。engines 要求 **node≥24 / pnpm≥11.22**——pnpm 用 corepack 解决：`corepack enable --install-directory /tmp/corepack-bin && export PATH=/tmp/corepack-bin:$PATH`（n8n 的 packageManager 字段会自动 pin 到正确版本）
3. **注入 + 补丁**：拷 `languages/zh-CN.json` 到 `packages/frontend/@n8n/i18n/src/locales/`；`git apply patches/feat__i18n_zhCn.patch`（失效则手动做等效两行修改并重新生成 patch，见「patch 注意事项」）
4. **安装**：`CI=1 pnpm install --frozen-lockfile --filter "n8n-editor-ui..."`。🔴 两个关键：**`CI=1` 必须带**——根 `prepare.mjs` 会跑 lefthook 安装，非 CI 环境下因过滤安装没装 lefthook 而秒挂（ELIFECYCLE 无输出）；**过滤安装**只装 editor-ui 子图，避开后端原生依赖（isolated-vm 在新 Node 上 gyp 编译失败）
5. **构建**：`CI=1 pnpm --filter "n8n-editor-ui..." build` → 产物在 `packages/frontend/editor-ui/dist/`
6. **打包**：`tar -czf editor-ui-<ver>.tar.gz -C packages/frontend/editor-ui dist`（macOS tar 的 LIBARCHIVE.xattr 警告在 Linux 解包无害）
6½. **镜像交付（国内客户渠道）**：在 TX-43 上构建推送 `registry.bcpcloud.cn/bcp/n8n-chinese:<ver>`（FROM `registry.bcpcloud.cn/bcp/n8n:<ver>` + `COPY dist` 到 `.../n8n-editor-ui/dist` + `ENV N8N_DEFAULT_LOCALE=zh-CN`）。GitHub Releases 拉包对国内客户边端不稳（超时/CDN reset），registry 是正式交付通道，Releases 仅作公开存档。构建上下文传 TX-43（SSH `43.139.228.145:22` root，凭证库 `bcp_ipaas/server/txc_43`）本地构建推送秒级完成；客户实例首次需 `docker login registry.bcpcloud.cn`（凭证 `swr.txc_43`）
7. **灰度验证（bcphub-bsi = YTJ1 `/opt/bcphub-test`）**：SSH 经 TX-43 FRP `43.139.228.145:60001`（凭证库 `bcp_ipaas/server/ytj1`）。流程：备份旧 dist（`mv dist dist-bak-<旧版>-<日期>`）→ 解包新 dist（`--strip-components=1`）→ `python3 ui-brand-patch/bsi-ui-brand-patch-*.py` 重放品牌 → `docker compose restart n8n`（重同步容器内 cache）→ 域名验证四件套：`/healthz`+`/healthz/readiness`、页面 title、新 bundle hash 与本机构建一致、**新增文案中文抽查**（挑只有新版才有的串 grep 线上 asset）
8. **发布**：`git tag release/<ver> && git push origin release/<ver>` → `gh release create release/<ver> editor-ui-<ver>.tar.gz`
9. **收尾**：更新 README「n8n 版本兼容说明」矩阵；若上游 index.ts 有变，重新生成 patch 一并提交

## patch 注意事项

- `patches/feat__i18n_zhCn.patch` 修改 n8n 上游 `packages/frontend/@n8n/i18n/src/index.ts`：import zh-CN 语言 + 注册进 vue-i18n messages（`messages: { en: englishBaseText, 'zh-CN': cnBaseText }`）。**上游该文件每次重构都会使 patch 失效**——`git apply` 报 "patch does not apply" 时，直接在新版源码上手动做等效两行修改，再 `git diff` 重新生成 patch。当前版本：2026-09-12 针对 2.38.7 重新生成（git diff 格式）
- `patches/fix_editor-ui.patch`（旧 `fix_editor-ui.old.patch` 同理）：CredentialConfig.vue 空值保护。**2.38.x 起上游已自行修复，对新版源码不再需要**；仅构建 ≤2.33 旧版时使用。另注意 2.38.x 的 editor-ui src 重构为 `features/` 结构（CredentialConfig.vue 迁至 `src/features/credentials/components/CredentialEdit/`）
- 手动修改源码后验证：`git -C <n8n源码目录> apply --check --reverse <patch路径>`（已应用状态应通过，同时证明格式可解析）
