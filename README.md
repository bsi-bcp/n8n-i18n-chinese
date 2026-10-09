<div align="center">

# n8n 简体中文汉化包

**让 n8n 说中文 —— CI 全自动跟随官方发版**

[![Latest Release](https://img.shields.io/github/v/release/bsi-bcp/n8n-i18n-chinese?style=flat-square)](https://github.com/bsi-bcp/n8n-i18n-chinese/releases)
[![n8n](https://img.shields.io/badge/n8n-2.42.6-EA4B71?style=flat-square)](https://github.com/n8n-io/n8n/releases)
[![License: MIT](https://img.shields.io/badge/License-MIT-green?style=flat-square)](LICENSE)

```shell
docker pull swr.cn-north-4.myhuaweicloud.com/bcphub/n8n-chinese:2.42.6
```

</div>

> 社区延续维护 [fork](https://github.com/other-blowsnow/n8n-i18n-chinese)（原项目已归档停更）：watcher 每小时巡检 n8n 官方稳定版，评估通过后自动完成「增量翻译 → 门禁 → 构建 → Release → 镜像双库分发」。当前覆盖 n8n 2.42.6。
>
> 非 n8n 官方项目；汉化包 MIT 许可（详见文末[版权声明](#版权与来源声明)），n8n 本体受 [Sustainable Use License](https://docs.n8n.io/license/) 约束。

## 📦 交付物（三条获取通道）

| 交付物 | 通道 | 架构 |
|---|---|---|
| 🐳 中文镜像 | `swr.cn-north-4.myhuaweicloud.com/bcphub/n8n-chinese:<版本>`（公开源，免登录） | **仅 amd64** |
| 🐳 中文镜像（BSI 内部） | `registry.bcpcloud.cn/bcp-hub/n8n-chinese:<版本>`（边端统一交付源） | **仅 amd64** |
| 🔧 Task Runners 镜像 | 两库同名 `n8n-runners:<版本>`（均 amd64；Queue Mode 用，**与 n8n 后端版本严格一致**） | 仅 amd64 |
| 📦 汉化补丁包 | [Releases](https://github.com/bsi-bcp/n8n-i18n-chinese/releases) 附件 `n8n-editor-ui@<版本>.tar.gz` | 架构无关 |

> 🔴 **arm64 暂不支持汉化镜像**。arm64 实例的汉化方式：拉官方 `n8nio/n8n` 镜像，用补丁包解包覆盖 `…/n8n-editor-ui/dist` 并设 `N8N_DEFAULT_LOCALE=zh-CN`（即下方「官方镜像 + 挂载 dist」）。

## 🚀 快速开始

```shell
docker run -d --name n8n -p 5678:5678 -v ~/.n8n:/home/node/.n8n \
  swr.cn-north-4.myhuaweicloud.com/bcphub/n8n-chinese:2.42.6
```

打开 `http://localhost:5678` 即中文界面；`curl localhost:5678/healthz` 返回 200 即健康。
切回英文：`N8N_DEFAULT_LOCALE=en`（镜像只默认 zh-CN，不锁语言）。生产请走 HTTPS 反代。

### 官方镜像 + 挂载 dist（arm64 / 不换镜像场景）

```shell
docker run -d --name n8n -p 5678:5678 -v ~/.n8n:/home/node/.n8n \
  -v 【补丁包解压出的 dist 目录】:/usr/local/lib/node_modules/n8n/node_modules/n8n-editor-ui/dist \
  -e N8N_DEFAULT_LOCALE=zh-CN \
  n8nio/n8n
```

### Queue Mode 集群

main / worker / webhook 之外，加一个 Task Runners 容器（同版本 `n8n-runners:<版本>`）。
⚠️ runners 与 n8n 后端**版本必须严格一致**，不可混搭。

## 🔁 升级

1. 备份 compose 与数据卷（`~/.n8n`）
2. chinese 与 runners 镜像版本号**一起**改成同一新版本
3. `docker compose pull && docker compose up -d`
4. 验证：`/healthz` 200 + 界面中文 + 关键工作流试跑一条

> ⚠️ 跨 minor 升级（如 2.41.x → 2.42.x）有数据库迁移，官方不支持直接降级——回滚须先 `n8n db:revert`。

## 📖 n8n 版本兼容说明

**总原则：汉化包与 n8n 后端同版本号精确匹配；同 minor 线内新旧补丁版就近兼容**（界面新文案回退英文，功能不受影响）；跨 minor 升级/回滚涉及数据库迁移，须按 Release 说明执行 `n8n db:revert`。逐版发行说明见 [CHANGELOG](CHANGELOG.md)。

| n8n minor 线 | 汉化最新版（精确匹配） | 就近兼容后端区间 |
|---|---|---|
| 2.42 | **2.42.6** | 2.42.0 ~ 2.42.5 |
| 2.41 | 2.41.7 | 2.41.0 ~ 2.41.7 |
| 2.40 | 2.40.7 | 2.40.0 ~ 2.40.7 |
| 2.39 | 2.39.10 | 2.39.0 ~ 2.39.10 |
| 2.38 | 2.38.7 | 2.38.7 |

- 后端比汉化包新（同 minor 线内）：新增文案回退英文，功能不受影响，等本仓跟进发版即可
- 跨 minor 错配（如 2.41 汉化包配 2.42 后端）：可能白屏，禁止使用
- 历史版本镜像在 SWR / bcp-hub 双库永久保留；SWR 匿名可拉，bcp-hub 需部署侧凭证

## 🔒 安全与合规

- 只替换前端静态文件（editor-ui dist）：注入 zh-CN 词典并注册语言，不碰后端、数据库与配置
- 改动全部公开可审计：[patches/](patches/) 补丁 + [script/](script/) 构建脚本 + GitHub Actions 公开流水线，任意版本可复现
- SUL Notices 修改声明与第三方依赖许可清单（[THIRD_PARTY_LICENSES.md](THIRD_PARTY_LICENSES.md)）随包分发；不含任何 `*.ee.*` 专有文件

## 🧩 工作原理

n8n editor-ui 内置 vue-i18n 但官方无中文包：将 `zh-CN.json` 注入语言包目录并打补丁注册语言，重新编译 editor-ui；`N8N_DEFAULT_LOCALE=zh-CN` 生效。CI 链路细节见 `.github/workflows/` 与 [CHANGELOG](CHANGELOG.md)。

## 💬 反馈

错译/漏译请提 [Issue](https://github.com/bsi-bcp/n8n-i18n-chinese/issues)（界面位置截图 + 建议译文），随下个版本修复。常见问题看[排障指南](docs/排障指南.md)。

## 🌍 English

Community-maintained **Simplified Chinese localization** for n8n — CI rebuilds for every n8n stable release (currently 2.42.6). Docker image (amd64; arm64 via the Release-attached `n8n-editor-ui@<ver>.tar.gz` dist overlay):

```shell
docker run -d --name n8n -p 5678:5678 -v ~/.n8n:/home/node/.n8n \
  swr.cn-north-4.myhuaweicloud.com/bcphub/n8n-chinese:2.42.6
```

Defaults to Chinese UI; set `N8N_DEFAULT_LOCALE=en` for English. MIT-licensed; n8n itself remains under its own [Sustainable Use License](https://docs.n8n.io/license/).

## 版权与来源声明

- Fork 自 [other-blowsnow/n8n-i18n-chinese](https://github.com/other-blowsnow/n8n-i18n-chinese)（原作者 imblowsnow，2026-08-21 归档）。原作者已于 2026-09-14 书面授权继续修改和分发继承的翻译词典、脚本与补丁；本仓库以 MIT 落地（[LICENSE](LICENSE) 保留原作者版权声明），新增内容版权归商软信息 BSI。
- n8n 本体为 [Sustainable Use License](https://docs.n8n.io/license/)（fair-code）；本包仅为其界面文案的社区翻译。n8n® 为 n8n GmbH 商标，本项目与官方无隶属。
- **修改声明（SUL Notices 合规）**：产物为 n8n 本地化修改版，范围 = 注入 zh-CN 语言包并注册语言、节点面板文案查表、前端少量硬编码文案替换（**不含任何 `*.ee.*` 专有文件与 EE 节点内容**）；未删除或遮盖 n8n 的任何许可与版权声明。
- 译文由机器翻译辅助生成、经评审持续修正，仅供界面显示参考；参数含义以 [n8n 官方文档](https://docs.n8n.io/)为准。错误与日志类消息保留英文原文，便于排障检索。
