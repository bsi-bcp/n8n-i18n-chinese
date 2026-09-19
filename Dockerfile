ARG VERSION

# 基础镜像走 ghcr.io（n8n 官方双源之一，与 DockerHub 镜像内容一致）：
# GitHub runner 拉 DockerHub 常被匿名限流（429 退避，2.39.8 实测卡 35min+ 未完成），
# ghcr 与 runner 同为微软系网络，拉取快且稳。交付层无差异——最终镜像整包推 SWR。
FROM ghcr.io/n8n-io/n8n:${VERSION}

ENV N8N_DEFAULT_LOCALE=zh-CN

# 📌 SUL 合规（评审 D-E5-1）：镜像层声明许可构成与修改声明
LABEL org.opencontainers.image.licenses="Sustainable Use License (n8n core, see NOTICE-n8n-localization.md in editor-ui dist); MIT (localization dictionary & scripts)"
LABEL org.opencontainers.image.description="n8n localized build (zh-CN) by bsi-bcp/n8n-i18n-chinese — modified version of n8n, not affiliated with n8n GmbH"

# 📌 第三方依赖许可清单（2026-09-19）：镜像含完整 node_modules，清单为精确口径
COPY ./THIRD_PARTY_LICENSES.md /usr/local/lib/node_modules/n8n/THIRD_PARTY_LICENSES.md

COPY ./editor-ui-dist /usr/local/lib/node_modules/n8n/node_modules/n8n-editor-ui/dist

# 📌 节点参数汉化（M3，2026-09-19 立项；YTJ1 灰度同日全绿）：参数面板串硬编码于
# n8n-nodes-base、经后端 types payload 直出、前端渲染不过 i18n 查表。
# 🔴 主路径=JSON 注入：运行时 /types/nodes.json 直接 serve dist/types/nodes.json
# 静态预生成缓存（节点 dist JS 不被重新执行）；JS 扫描为动态路径兜底。
# 注入器只动显示语境属性（displayName/description/placeholder/hint/label + 非标识符 name），
# JSON 写前 parse 校验 / JS 每文件 --check，回滚>0 即失败退出。映射表按英文原文锚定。
COPY ./script/params-zh-map.json /opt/i18n-params/params-zh-map.json
COPY ./script/inject-params.cjs /opt/i18n-params/inject-params.cjs
# 🔴 官方镜像默认 USER=node，无权写 /usr/local/lib/node_modules（EACCES 实锤）——提权注入后回落
USER root
RUN NB=/usr/local/lib/node_modules/n8n/node_modules/n8n-nodes-base/dist \
    && node /opt/i18n-params/inject-params.cjs "$NB/types/nodes.json" /opt/i18n-params/params-zh-map.json \
    && node /opt/i18n-params/inject-params.cjs "$NB" /opt/i18n-params/params-zh-map.json
USER node
