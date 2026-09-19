ARG VERSION

# 基础镜像走 ghcr.io（n8n 官方双源之一，与 DockerHub 镜像内容一致）：
# GitHub runner 拉 DockerHub 常被匿名限流（429 退避，2.39.8 实测卡 35min+ 未完成），
# ghcr 与 runner 同为微软系网络，拉取快且稳。交付层无差异——最终镜像整包推 SWR。
FROM ghcr.io/n8n-io/n8n:${VERSION}

ENV N8N_DEFAULT_LOCALE=zh-CN

# 📌 SUL 合规（评审 D-E5-1）：镜像层声明许可构成与修改声明
LABEL org.opencontainers.image.licenses="Sustainable Use License (n8n core, see NOTICE-n8n-localization.md in editor-ui dist); MIT (localization dictionary & scripts)"
LABEL org.opencontainers.image.description="n8n localized build (zh-CN) by bsi-bcp/n8n-i18n-chinese — modified version of n8n, not affiliated with n8n GmbH"

COPY ./editor-ui-dist /usr/local/lib/node_modules/n8n/node_modules/n8n-editor-ui/dist

# 📌 节点参数汉化（M3，2026-09-19 立项）：参数面板串硬编码于 n8n-nodes-base dist、
# 经后端 types payload 直出、前端渲染不过 i18n 查表——构建期对 dist 做定向替换。
# 注入器仅动显示语境属性（displayName/description/placeholder/hint/label + 非标识符 name），
# 每文件 node --check 校验（ESM 须 .mjs 判定），回滚>0 即失败退出。
# 映射表按英文原文锚定（结构无关），由 script/translate-params.cjs 增量维护。
COPY ./script/params-zh-map.json /opt/i18n-params/params-zh-map.json
COPY ./script/inject-params.cjs /opt/i18n-params/inject-params.cjs
RUN node /opt/i18n-params/inject-params.cjs \
      /usr/local/lib/node_modules/n8n/node_modules/n8n-nodes-base/dist \
      /opt/i18n-params/params-zh-map.json
