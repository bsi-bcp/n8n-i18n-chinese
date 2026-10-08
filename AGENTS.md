# AGENTS.md

本文件供 OpenAI Codex CLI 等代理工具在本仓库作业时读取。

**完整作业规范见 [CLAUDE.md](CLAUDE.md)**——它是本仓库的单一事实源（随每次发版持续维护），本文件只放跨代理通用要点，不复制正文，也不随版本刷新。

## 硬性规则（与维护者全局规范一致，Codex 侧无全局对应文件故在此重申）

- **破坏性命令必须裸执行**：删除/批量清理类命令（`rm`、`rmdir`、`git push --force`、`git reset --hard`、`git clean`、`docker system prune`、`docker volume rm`、`kubectl delete` 等）必须单独执行，严禁包装进 `zsh -lc` / `bash -lc` / `sh -c` 等复合字符串。
- **BCP 命名规范（2026-09-29 定稿）**：`bcp-gateway` = bcp-ide 的边端引擎容器（BCP 1.0）；`bcphub-` 前缀特指 n8n 客户容器（BCP 2.0/N8N 边端）；历史 tag（≤ v3.1.0.4）已发布镜像仍为 SWR 旧仓名 `bcphub-gateway`，带日期历史文档按史实保留。

## 仓库性质（30 秒版）

n8n 编辑器 UI 简体中文汉化包的**构建与分发流水线**，不含 n8n 本体代码。三产物：`languages/zh-CN.json` 词典 → Release 部署包 `n8n-editor-ui@<版本号>.tar.gz` → 华为云 SWR 中文镜像。CI 全自动（watcher 每小时巡检上游稳定版，绿灯即全链发版），人工仅红灯时适配。

**开工前必读 CLAUDE.md 三节**：「项目性质」（🔴 合规红线：`.ee` 专有内容排除、SUL 修改声明）；「常用命令」；「目录与文档纪律」（`docs/` 对外发布物、`docs-inner/` 内部过程文档已 gitignore）。

## 最易踩的坑（详情都在 CLAUDE.md 对应节）

- `languages/zh-CN.json` 与 `script/en.json` 是**自动生成物**：CI 以 `chore: auto translate` 提交；勿手工改结构；手工补译保持 key 不变即可被下次运行保留。改前先 `git pull --rebase`（bot 提交可能与本地竞争）。
- 根 `docker-compose.yml` 的 image 版本号由 CI 自动跟进，**勿手改**。
- 术语表单一大源在 `script/terms.cjs`，修订须经终审，**不得顺手改**。
- 新增 CI 步骤/门禁必须真实跑一轮流水线验证，本地/语法审查不算数（历史教训见 CLAUDE.md「CI 重跑排障实录」）。
