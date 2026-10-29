#!/usr/bin/env bash
# ── 镜像双库对账自愈（2026-10-30 上线；2.44.7 bcp-hub 缺腿躺 3 天事故沉淀）────────
# 职责：SWR（不退役、全版本永久保留 = 期望全集锚点）与 bcp-hub（边端消费主通道）
#       按 tag 对账 manifest digest；发现缺失/漂移即调同目录 replay-mirror.sh 幂等
#       补齐（境内快线 + 断点续传 + digest 校验）。
# 辅对账：本仓 GitHub Releases ↔ SWR（best-effort，api.github.com 不可达则静默跳过，
#       CI 红卡兜底）——发现「Release 已发而 SWR 缺」只告警不动作，并注明语言包底线
#       （Release tarball 已在，镜像缺失不阻塞语言包交付）。
# 范围：chinese + runners 双镜像双库（image.yml 的「双库四镜像」）。sandbox 三件套
#       暂不覆盖（扩展位：同法对比 bcp-hub↔ghcr）。
# 通知：仅「有补齐动作 / 有无法自愈的缺失 / 脚本自身异常」发飞书；全绿静默。
#       飞书 webhook 从同目录 notify.env 读（600，不入任何仓）。
# 安装（TX-43，/home/ubuntu/registry/）：
#   - 本脚本 + replay-mirror.sh + migrate.env（REG_USER/REG_PASS=bcp-hub、
#     SWR_USER/SWR_PASS）+ notify.env（FEISHU_WEBHOOK=...，chmod 600）
#   - /etc/cron.d/reconcile-mirrors：
#     12,42 * * * * root /home/ubuntu/registry/reconcile-mirrors.sh >> /home/ubuntu/registry/reconcile-cron.log 2>&1
# ⚠️ 唯一真值源 = 仓内 host-tx43/reconcile-mirrors.sh（本文件），TX-43 侧为部署副本，
#    改规则/改链路先改仓内再同步过去；TX-43 整机重建时按本头注重新安装。
set -u
cd "$(dirname "$0")" || exit 1
[ -f ./migrate.env ] && . ./migrate.env
HAVE_WEBHOOK=0
[ -f ./notify.env ] && { . ./notify.env; [ -n "${FEISHU_WEBHOOK:-}" ] && HAVE_WEBHOOK=1; }

exec 9>/tmp/reconcile-mirrors.lock
flock -n 9 || { echo "[$(date '+%F %T')] [skip] 已有实例在跑"; exit 0; }

SWR="https://swr.cn-north-4.myhuaweicloud.com"
HUB="https://registry.bcpcloud.cn"
OUR_REPO="bsi-bcp/n8n-i18n-chinese"
ACCEPT='application/vnd.docker.distribution.manifest.v2+json, application/vnd.oci.image.manifest.v1+json, application/vnd.docker.distribution.manifest.list.v2+json, application/vnd.oci.image.index.v1+json'

notify() { # $1=文本（多行）；webhook 缺失时静默降级
  [ "$HAVE_WEBHOOK" = "1" ] || return 0
  jq -n --arg t "$1" '{msg_type:"text",content:{text:$t}}' \
    | curl -sS -m 15 -X POST -H 'Content-Type: application/json' -d @- "$FEISHU_WEBHOOK" >/dev/null 2>&1 || true
}

hdr_digest() { # 从响应头滤 Docker-Content-Digest（去 \r，取最后一个）
  tr -d '\r' | awk 'tolower($1)=="docker-content-digest:"{print $2}' | tail -1
}

swr_token() { # $1=repo → 匿名 pull token
  curl -sS -m 20 "${SWR}/swr/auth/v2/registry/auth/?service=dockyard&scope=repository:bcphub/$1:pull" \
    | jq -r '.token // empty' 2>/dev/null
}
swr_digest() { # $1=repo $2=tag → digest 或空（含 404）
  local tok; tok=$(swr_token "$1"); [ -n "$tok" ] || return 0
  curl -sS -m 20 -o /dev/null -D - -H "Authorization: Bearer $tok" -H "Accept: $ACCEPT" \
    "${SWR}/v2/bcphub/$1/manifests/$2" | hdr_digest
}
swr_tags() { # $1=repo → tag 全集（每行一个）
  local tok; tok=$(swr_token "$1"); [ -n "$tok" ] || return 0
  curl -sS -m 20 -H "Authorization: Bearer $tok" "${SWR}/v2/bcphub/$1/tags/list" | jq -r '.tags[]?' 2>/dev/null
}
hub_digest() { # $1=repo $2=tag → digest 或空（Basic 凭证；未配凭证时空=缺失）
  local u="${REG_USER:-}" p="${REG_PASS:-}"
  [ -n "$u" ] && [ -n "$p" ] || { echo "__NO_CRED__"; return 0; }
  curl -sS -m 20 -o /dev/null -D - -u "$u:$p" -H "Accept: $ACCEPT" \
    "${HUB}/v2/bcp-hub/$1/manifests/$2" | hdr_digest
}

main() {
  local changed=0 failed=0 report="" repo tag tags sd hd leg hd2 out
  for repo in n8n-chinese n8n-runners; do
    tags=$(swr_tags "$repo")
    if [ -z "$tags" ]; then
      # 🔴 防假绿守卫：SWR 该仓 tag 全集拉空 = 对账器自身失明（token/网络/接口变化），
      # 静默当「全绿」比报错危险——直接告警（SWR 在册 20+ 版本，正常永不为空）
      failed=$((failed + 1))
      report="${report}- ❌ SWR ${repo} tag 列表拉空——匿名 token 流或接口异常，对账失明，需人工核查"$'\n'
      continue
    fi
    while IFS= read -r tag; do
      [ -n "$tag" ] || continue
      sd=$(swr_digest "$repo" "$tag"); [ -n "$sd" ] || continue   # SWR 无此 tag 不在本库锚点内
      hd=$(hub_digest "$repo" "$tag")
      if [ "$hd" = "__NO_CRED__" ]; then
        notify "镜像对账自愈异常：bcp-hub 凭证缺失（migrate.env REG_USER/REG_PASS），无法对账 $repo。请检修。"
        return 2
      fi
      [ "$sd" = "$hd" ] && continue
      # 缺失或漂移 → 幂等补齐（chinese=SWR→hub；runners=ghcr→SWR→hub，已有腿校验跳过）
      leg=chinese; [ "$repo" = "n8n-runners" ] && leg=runners
      report="${report}- ${repo}:${tag}（hub=${hd:-缺} / swr=${sd}）→ replay ${leg}"$'\n'
      if ./replay-mirror.sh "$leg" "$tag" >>reconcile-action.log 2>&1; then
        hd2=$(hub_digest "$repo" "$tag")
        if [ "$sd" = "$hd2" ]; then
          changed=$((changed + 1)); report="${report}  ✅ 已补齐，digest 一致"$'\n'
        else
          failed=$((failed + 1)); report="${report}  ❌ 补后仍不一致（hub=${hd2:-缺}），需人工核查"$'\n'
        fi
      else
        failed=$((failed + 1)); report="${report}  ❌ replay 失败（详见 reconcile-action.log）"$'\n'
      fi
    done <<< "$tags"
  done

  # 辅对账（best-effort）：Release ↔ SWR chinese——「发了版而 SWR 缺镜像」只告警。
  # 语言包底线不受镜像影响：Release tarball + 词典已随发版落地。
  local rel ver
  rel=$(curl -sS -m 10 "https://api.github.com/repos/${OUR_REPO}/releases?per_page=100" 2>/dev/null \
    | jq -r '.[].tag_name' 2>/dev/null | sed -n 's/^release\/\([0-9.]*\)$/\1/p' | sort -Vu) || rel=""
  if [ -n "$rel" ]; then
    while IFS= read -r ver; do
      [ -n "$ver" ] || continue
      if [ -z "$(swr_digest n8n-chinese "$ver")" ]; then
        failed=$((failed + 1))
        report="${report}- ⚠️ Release release/${ver} 已发布但 SWR 缺 n8n-chinese:${ver}（image.yml 上游腿失败？）
  语言包底线不受影响：tarball 已在 Release 资产（bind mount 通道可用），镜像仅缺增强通道。
  补法：gh workflow run image.yml -f version=${ver} -R ${OUR_REPO}，或 TX-43 手动构建。"$'\n'
      fi
    done <<< "$rel"
  fi

  {
    echo "[$(date '+%F %T')] 对账完成：补齐 ${changed}，异常 ${failed}"
    [ -n "$report" ] && printf '%s' "$report"
  } >>reconcile.log

  if [ "$failed" -gt 0 ]; then
    notify "🔴 镜像对账自愈：${failed} 项异常待人工核查
${report}
（TX-43 reconcile-mirrors · 每 30 分钟对账 SWR↔bcp-hub）"
  elif [ "$changed" -gt 0 ]; then
    notify "🟢 镜像对账自愈：自动补齐 ${changed} 条缺腿，digest 已核验一致
${report}
（TX-43 reconcile-mirrors · 全绿时静默，本条为动作通报）"
  fi
  # changed=0 且 failed=0：全绿静默
}

main || { rc=$?; notify "🔴 镜像对账脚本异常退出 rc=${rc}（TX-43 /home/ubuntu/registry/reconcile-mirrors.sh），请查 reconcile-cron.log"; exit "$rc"; }
