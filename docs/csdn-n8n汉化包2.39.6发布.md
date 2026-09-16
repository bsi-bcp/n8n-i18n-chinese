# n8n 简体中文汉化包 2.39.6 发布：自托管工作流编辑器全中文界面

> GitHub：[bsi-bcp/n8n-i18n-chinese](https://github.com/bsi-bcp/n8n-i18n-chinese) ｜ 免费获取（汉化包本身 MIT；n8n 本体 fair-code）｜ 持续跟进 n8n 官方版本

## TL;DR

- **8372 条编辑器界面文案 100% 中文**，精确匹配 n8n **2.39.6**（2026-09-16 发布）
- 换 dist 或拉镜像，**5 分钟完成汉化**，不碰后端、数据库与配置，替换/回滚零风险
- 上游社区经典汉化项目归档停更后，由商软信息（BSI）**经原作者明确授权**以 MIT 协议延续维护，已发布 2.38.7 / 2.39.6 两个版本

## 背景：n8n 的中文界面，为什么官方一直没有？

[n8n](https://github.com/n8n-io/n8n) 是目前最流行的 fair-code（源码可得）自托管工作流自动化平台（Zapier / Make / 各种 iPaaS 的开源平替，最近凭 AI Agent 编排更是大热）。但它的编辑器 UI 至今只有英文——n8n 前端其实内置了 vue-i18n 框架，官方却从未发布中文语言包。

社区长期依赖 [other-blowsnow/n8n-i18n-chinese](https://github.com/other-blowsnow/n8n-i18n-chinese) 这个经典汉化项目，但它已于 2026-08-21 归档停更，最终版本停在 **2.33.7**。而 n8n 官方仍在高速迭代（现已到 2.39.x，AI 助手 / agents 面板大改），老汉化包配新后端，越来越多界面回退英文。

我们把这个项目接了过来：fork 至 [bsi-bcp/n8n-i18n-chinese](https://github.com/bsi-bcp/n8n-i18n-chinese)，并征得原作者 imblowsnow 的**明确授权**（[授权记录](https://github.com/other-blowsnow/n8n-nodes-feishu-lite/issues/67)），以 MIT 协议持续维护。已对 2.38.7、2.39.6 两轮全链路构建发布，并在生产级 Queue Mode 集群上完成灰度验证。

## 技术原理

n8n editor-ui 内置 vue-i18n，但上游未随包发布中文 locale。本项目的做法：

1. 以官方 `en.json` 为基准做**三方对比增量翻译**（LLM 辅助初译 + 人工审校，仅翻新增/变更 key，2.39.6 轮增量 104 条）；
2. 将 `zh-CN.json` 注入 n8n 源码 `packages/frontend/@n8n/i18n/src/locales/`，打补丁注册语言后**重新编译 editor-ui**；
3. 用户侧只需设环境变量 `N8N_DEFAULT_LOCALE=zh-CN` 生效。

产物经 GitHub Release 与 Docker 镜像分发，构建脚本/补丁/词典全部开源。

## 使用方式

### 方式一：替换 editor-ui dist（任意部署方式）

1. 下载 [Release 附件](https://github.com/bsi-bcp/n8n-i18n-chinese/releases/tag/release/2.39.6) `editor-ui-2.39.6.tar.gz`；
2. 解压得到 `dist/`，挂到 n8n 安装路径（Docker 部署对应容器内 `/usr/local/lib/node_modules/n8n/node_modules/n8n-editor-ui/dist`）；
3. 设环境变量 `N8N_DEFAULT_LOCALE=zh-CN`，重启服务。

docker-compose 示例：

```yaml
services:
  n8n:
    image: n8nio/n8n:2.39.6
    environment:
      - N8N_DEFAULT_LOCALE=zh-CN
    volumes:
      - ./dist:/usr/local/lib/node_modules/n8n/node_modules/n8n-editor-ui/dist
```

### 方式二：现成 Docker 镜像

```bash
# 默认已启用中文（ENV N8N_DEFAULT_LOCALE=zh-CN 已内置）
docker pull registry.bcpcloud.cn/bcp/bcphub-n8n/n8n-chinese:2.39.6
```

国内网络拉取稳定；若该仓库需要 `docker login`，或你更信任自建：用官方镜像三行构建即可——

```dockerfile
FROM n8nio/n8n:2.39.6
ENV N8N_DEFAULT_LOCALE=zh-CN
COPY ./dist /usr/local/lib/node_modules/n8n/node_modules/n8n-editor-ui/dist
```

## 版本兼容矩阵

| n8n 后端版本 | 推荐汉化包 | 说明 |
|---|---|---|
| ≤ 2.33.7 | 上游精确匹配版本 | 旧版 editor-ui 对版本敏感，错位可能白屏 |
| 2.34 ~ 2.38.6 | `release/2.39.6`（首选）或 `release/2.38.7` | 实测可用，新 dist 配旧后端安全 |
| 2.38.7 | `release/2.38.7` 或 `release/2.39.6` | 8341 键全量 |
| **2.39.0 ~ 2.39.6** | **`release/2.39.6`（精确匹配）** | 8372 键全量，AI 助手新界面含中文 |
| > 2.39.6 | 就近低版本搭配 | 新文案暂时回退英文，功能不受影响；等本仓库跟进 |

选型总原则：**"dist 略新于后端"优于"dist 旧于后端"**。

## FAQ

- **升级后白屏？** dist 与后端版本跨度过大，换就近匹配版本即可（纯静态文件，回滚无风险）。
- **个别地方还是英文？** 你的 n8n 后端比汉化包新，新增文案回退英文；等下一版或提 issue 催更。
- **会一直跟进吗？** 已建立标准 SOP（翻译→构建→灰度→发版），本仓库随 n8n 官方 Release 持续跟进，发版史与兼容区间见仓库 `CHANGELOG.md`。
- **许可？** MIT；继承内容版权归属原作者 imblowsnow（详见 README「版权与来源声明」）。注意 n8n 本体为 [Sustainable Use License](https://docs.n8n.io/license/)（fair-code），本汉化包仅覆盖界面文案翻译。
- **想参与？** 词典翻译 PR、漏翻反馈、构建问题，仓库 Issues 开放。

## 相关链接

- 汉化包仓库：https://github.com/bsi-bcp/n8n-i18n-chinese
- 2.39.6 Release：https://github.com/bsi-bcp/n8n-i18n-chinese/releases/tag/release/2.39.6
- n8n 官方：https://github.com/n8n-io/n8n
- 上游原作者项目（已归档，感谢付出）：https://github.com/other-blowsnow/n8n-i18n-chinese

---

> 声明：本项目为社区独立维护的 n8n 本地化修改版，与 n8n 官方无隶属关系；n8n® 为 n8n GmbH 商标，此处仅作描述性引用。

*本文同步步于 BCP 技术博客。如果帮到你，欢迎 GitHub 点 Star ⭐ 支持持续维护。*
