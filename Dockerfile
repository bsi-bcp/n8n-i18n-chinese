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
