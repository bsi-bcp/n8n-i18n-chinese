
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
- 原项目的全部内容（翻译词典、脚本、补丁、文档）版权归原作者所有。**原项目未附带开源许可证**，按默认版权保留处理；在 GitHub 平台内的使用遵循 [GitHub 服务条款](https://docs.github.com/zh/site-policy/github-terms/github-terms-of-service)。
- 本仓库为社区延续维护 fork：在原项目停止维护后，继续跟进 n8n 新版本的简体中文翻译。通过 GitHub Release、Docker 镜像等渠道分发构建产物时，沿用原作者此前公开发布同类型产物的惯例。
- n8n 本体为 [Sustainable Use License](https://docs.n8n.io/license/)（fair-code），本项目的语言包为其界面文案的社区翻译，n8n 的使用须遵守其自身许可。
- 本仓库在 fork 之后新增或修改的内容（构建脚本、文档、翻译增补等）由本仓库维护方持有。

