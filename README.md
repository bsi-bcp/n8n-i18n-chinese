
# 安装教程

## 自带中文docker镜像
> ⚠️ `blowsnow/n8n-chinese` 为原上游作者的镜像，**已停止更新（停在 n8n 2.33.7）**。本仓库不再向该地址发布。
> 推荐改用下方「docker安装」方式：官方 n8n 镜像 + 挂载 editor-ui dist 目录。

```shell
docker run -it --rm --name n8ntest \
-p 15678:5678 \
-v ~/.n8n:/home/node/.n8n \
-e N8N_SECURE_COOKIE=false \
blowsnow/n8n-chinese
```

## docker安装
> 其他命令参考n8n官方文档
```shell
docker run -it --rm --name n8ntest \
-p 15678:5678 \
-v 【替换为下载的编辑器UI目录】:/usr/local/lib/node_modules/n8n/node_modules/n8n-editor-ui/dist \
-v ~/.n8n:/home/node/.n8n \
-e N8N_DEFAULT_LOCALE=zh-CN \
-e N8N_SECURE_COOKIE=false \
n8nio/n8n
```


## npx本地启动n8n替换安装
> 其他本地方式启动的话参考这个即可
1. 找到路径：C:\Users\xxxxxx\AppData\Local\npm-cache\_npx\n8n\node_modules\n8n-editor-ui\dist
   （新版本也可能是C:\Users\xxxxxx\AppData\Roaming\npm\node_modules\n8n\node_modules\n8n-editor-ui\dist）
2. 下载对应版本editor-ui.tar.gz文件
3. 解压到 dist目录下替换
4. 设置环境变量 N8N_DEFAULT_LOCALE=zh-CN，自行咨询AI设置方法
5. 重启 n8n 服务

# n8n 版本兼容说明

> 选型原则：**editor-ui dist 版本与 n8n 后端版本保持一致**。汉化包只替换前端静态文件，不碰后端、数据库与配置，替换/回滚零风险。

| n8n 后端版本 | 推荐汉化包 | 获取渠道 | 说明 |
|---|---|---|---|
| ≤ 2.33.7 | 与后端**精确匹配**的版本 | [上游 Release](https://github.com/other-blowsnow/n8n-i18n-chinese/releases)（已归档停更） | 旧版 editor-ui 对版本敏感，错位可能白屏 |
| 2.34 ~ 2.38.6 | `release/2.39.6`（首选）或 `release/2.38.7` | 本仓库 Releases | 实测可用（2.38.4 / 2.38.7 后端实证）；新 dist 配旧后端安全 |
| 2.38.7 | `release/2.38.7`（精确匹配）或 `release/2.39.6` | 本仓库 Releases | 8341 条全量汉化 |
| **2.39.0 ~ 2.39.6** | **`release/2.39.6`（精确匹配）或 `release/2.39.7-v3`（就近，YTJ1 实测）** | 本仓库 Releases / 镜像 | 8372 条全量汉化，AI 助手新界面含中文；镜像 `swr.cn-north-4.myhuaweicloud.com/bcphub/n8n-chinese:2.39.6`（2.39.6 及更早 tag 由旧库迁入，尚未回填新库） |
| **2.39.7** | **`release/2.39.7-v3`（精确匹配）** | 本仓库 Releases / 镜像 | 9374 键全量汉化（含 v2 术语大修）+ 节点面板第二/三层汉化（568 节点描述 + 456 操作标题）+ Data tables 等弹窗硬编码标签修复；镜像 `swr.cn-north-4.myhuaweicloud.com/bcphub/n8n-chinese:2.39.7`（v3 内容，同上待回填） |
| > 2.39.7 | 就近低版本 dist 搭配 | 本仓库 Releases | 等本仓库跟进发版；期间新文案回退英文，功能不受影响 |

补充规则：

- dist 与后端小版本不一致时，**优先“dist 略新于后端”而不是“dist 旧于后端”**——新 dist 对旧后端只是多几个用不到的文案；旧 dist 对新后端则新界面全是英文
- n8n 升级后若出现**白屏**，说明 dist 与后端差异过大，请换就近匹配的版本
- n8n 官方发新版本后，本仓库会跟进构建对应汉化包并发布到 Releases

# 原理
> editor-ui是支持i18n的，但是未开放语言包

1. 手动添加 zh-CN.json 到 editor-ui `/src/plugins/i18n/locales/` 里面，然后重新编译
2. 环境里面设置语言即可正常使用中文  `N8N_DEFAULT_LOCALE=zh-CN`

# 参考n8n官方i18n介绍
https://github.com/n8n-io/n8n/blob/master/packages/frontend/%40n8n/i18n/docs/README.md

# 语言环境变量
> 其他语言参考：https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Accept-Language

N8N_DEFAULT_LOCALE=zh-CN


# 版权与来源声明

- 本仓库 fork 自 [other-blowsnow/n8n-i18n-chinese](https://github.com/other-blowsnow/n8n-i18n-chinese)（原作者 **imblowsnow**，该项目已于 2026-08-21 归档停更，最终版本 `release/2.33.7`）。
- 原项目的全部内容（翻译词典、脚本、补丁、文档）版权归原作者所有。原作者 imblowsnow 已于 2026-09-14 在 [issue #67](https://github.com/other-blowsnow/n8n-nodes-feishu-lite/issues/67) 中**明确授权本 fork 以 MIT 协议继续修改和分发**继承的翻译词典、脚本与补丁。本仓库据此补充 [LICENSE](LICENSE) 文件，其中完整保留原作者的版权声明。
- 本仓库为社区延续维护 fork：在原项目停止维护后，继续跟进 n8n 新版本的简体中文翻译。通过 GitHub Release、Docker 镜像等渠道分发的构建产物同样适用上述 MIT 授权（n8n 本体除外，见下条）。
- n8n 本体为 [Sustainable Use License](https://docs.n8n.io/license/)（fair-code），本项目的语言包为其界面文案的社区翻译，n8n 的使用须遵守其自身许可。
- **修改声明（SUL Notices 条款合规）**：本仓库产物（editor-ui dist / 汉化镜像）为 n8n 的**本地化修改版**，修改仅为注入 zh-CN 语言包与注册语言，未删除或遮盖 n8n 的任何许可与版权声明（含页脚许可链接）。n8n® 为 n8n GmbH 商标，本项目与 n8n 官方无隶属关系、亦非官方背书。
- 本仓库在 fork 之后新增或修改的内容（构建脚本、文档、翻译增补等）版权归维护方（商软信息 BSI）所有，一并以 MIT 协议授权，见 [LICENSE](LICENSE)。

