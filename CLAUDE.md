# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目性质

n8n 编辑器 UI 简体中文汉化包的**构建与分发流水线**，仓库本身不含 n8n 代码。产出三样东西：

- `languages/zh-CN.json` — 中文语言包（自动翻译产物）
- `editor-ui.tar.gz` — 编译后的 editor-ui dist（CI 生成，GitHub Release 附件）
- Docker 镜像 `blowsnow/n8n-chinese`（多架构，tag 触发）

原理：n8n editor-ui 内置 vue-i18n 但上游未发布中文包。把 zh-CN.json 编入 n8n 源码的 `packages/frontend/@n8n/i18n/src/locales/` 并打补丁注册语言后重新编译；用户端设 `N8N_DEFAULT_LOCALE=zh-CN` 生效。

**仓库现状（2026-09-12 核实）**：本仓库 fork 自 `other-blowsnow/n8n-i18n-chinese`，上游**已归档**（2026-08-21 停更，最终 Release 为 `release/2.33.7`）。本 fork 的 GitHub Actions 从未运行（无 tag、无 Release、无 workflow run），翻译提交同样停在 2026-08-21 —— 下文「发布流水线」是 workflow 的设计行为，在本仓库从未实际执行。BCP 侧的实际消费方式：n8n >2.33.7 的部署**沿用 2.33.7 的 editor-ui dist**（bind mount 覆盖，实测兼容 2.38.x 后端），细节见 bcp-deploy-n8n skill；若要恢复追新，跑 `npm run i18n:translate`（en.json 拉自 n8n **master** 分支，注意 master 可能领先最新 Release）+ 手动走构建发布流程。

## 常用命令

```shell
npm run i18n:translate        # 增量翻译（script/translate.js）
node script/get-n8n-nodes.js  # 从 node_modules/n8n-nodes-base 提取节点文案 → script/en-nodes.json（需先 npm install）
```

无测试、无 lint。

translate.js 环境变量（OpenAI 兼容接口，可放 `.env`）：

- `OPENAI_API_KEY`、`OPENAI_API_BASE` — 必填，请求发往 `BASE + "/chat/completions"`
- `OPENAI_MODEL` — 模型名
- `OPENAI_API_CONCURRENT` — 并发数，默认 2

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

## patch 注意事项

- `patches/feat__i18n_zhCn.patch` 修改 n8n 上游 `packages/frontend/@n8n/i18n/src/index.ts`：import zh-CN 语言 + 注册进 vue-i18n messages。上游该文件变动会导致 `git apply` 失败，需对照新版文件重新生成 patch（IDEA 导出格式，含 revision/date 头）
- 手动更新 patch 后，本地可用 `git -C <n8n源码目录> apply <patch路径>` 验证
