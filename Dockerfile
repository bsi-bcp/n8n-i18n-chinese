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
# 2026-09-20 扩展：@n8n/n8n-nodes-langchain 同构注入（AI Agent/Chat Model/记忆等
# 全 langchain 系节点；该包为 packages/cli 直接依赖 workspace:*，与 nodes-base 同一
# pnpm deploy 物化机制，映射表按英文原文锚定故两包共用一份）。
# 🔴 主路径=JSON 注入：运行时 /types/nodes.json 直接 serve dist/types/nodes.json
# 静态预生成缓存（节点 dist JS 不被重新执行）；JS 扫描为动态路径兜底。
# 注入器只动显示语境属性（displayName/description/placeholder/hint/label + 非标识符 name），
# JSON 写前 parse 校验 / JS 每文件 --check，回滚>0 即失败退出。映射表按英文原文锚定。
COPY ./script/params-zh-map.json /opt/i18n-params/params-zh-map.json
COPY ./script/inject-params.cjs /opt/i18n-params/inject-params.cjs
COPY ./script/check-ee-gate.cjs /opt/i18n-params/check-ee-gate.cjs
# 🔴 官方镜像默认 USER=node，无权写 /usr/local/lib/node_modules（EACCES 实锤）——提权注入后回落
USER root
RUN NB=/usr/local/lib/node_modules/n8n/node_modules/n8n-nodes-base/dist \
    && LC=/usr/local/lib/node_modules/n8n/node_modules/@n8n/n8n-nodes-langchain/dist \
    && node /opt/i18n-params/inject-params.cjs "$NB/types/nodes.json" /opt/i18n-params/params-zh-map.json \
    && node /opt/i18n-params/inject-params.cjs "$NB" /opt/i18n-params/params-zh-map.json \
    && node /opt/i18n-params/inject-params.cjs "$LC/types/nodes.json" /opt/i18n-params/params-zh-map.json \
    && node /opt/i18n-params/inject-params.cjs "$LC" /opt/i18n-params/params-zh-map.json \
# 🔴 EE 合规断言（2026-09-21 评审 P1-3，E5-P1-A 复发防线）：注入恰好发生在镜像构建内，
#    此处是唯一能拦住 JS 兜底路径改写 EE 专有文件的位置——EE 保护路径出现 CJK 即构建失败
#    （2026-09-21 取证实证：旧映射表 47 条 EE 残留曾经此路径污染现售 2.39.8 的
#    Evaluation/Description.node.js 等 3 个文件）
    && node /opt/i18n-params/check-ee-gate.cjs --dist "$NB" \
    && node /opt/i18n-params/check-ee-gate.cjs --dist "$LC"
USER node
