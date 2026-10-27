#!/bin/bash
# n8n watcher 外置触发（每小时 :37，绕开 GitHub schedule 节流；watcher 幂等，多触发无副作用）
#
# 2026-10-27 增加带外告警：GitHub Actions 被整体禁用时（如 fork 用量限制，实测 2026-10-23~27
# 静默停摆 4 天），GitHub 侧所有告警通道都会一起哑火。本脚本是唯一不依赖 Actions 的探针：
#   - dispatch 失败：带时间戳落日志 + 连续失败计数；
#   - 连续失败 ≥3 次：直接发飞书告警群（12h 内不重复）；
#   - 恢复时若此前连续失败 ≥3 次：发一条恢复通知。
export PATH="/usr/local/bin:/usr/bin:/bin"

REPO="bsi-bcp/n8n-i18n-chinese"
LOG="$HOME/.claude/logs/n8n-watcher-trigger.log"
STATE_DIR="$HOME/.claude/logs/.n8n-watcher"
NOTIFY="${N8N_WATCHER_NOTIFY:-$HOME/.claude/scripts/notify-feishu.py}"
GH_BIN="${N8N_WATCHER_GH:-/usr/local/bin/gh}"
FAIL_FILE="$STATE_DIR/consecutive-failures"
ALERT_FILE="$STATE_DIR/last-alert-epoch"
ALERT_COOLDOWN=43200   # 12h，避免小时级重复轰炸

mkdir -p "$STATE_DIR"
now=$(date +%s)
ts=$(date '+%Y-%m-%d %H:%M:%S')

err=$("$GH_BIN" workflow run n8n-stable-watch.yml -R "$REPO" 2>&1)
rc=$?

if [ "$rc" -eq 0 ]; then
  prev=$(cat "$FAIL_FILE" 2>/dev/null || echo 0)
  echo 0 > "$FAIL_FILE"
  if [ "${prev:-0}" -ge 3 ]; then
    python3 -I "$NOTIFY" "✅ n8n watcher 已恢复（此前连续失败 ${prev} 次）" \
      "dispatch 成功，GitHub Actions 产线恢复。" >/dev/null 2>&1 || true
  fi
  exit 0
fi

n=$(( $(cat "$FAIL_FILE" 2>/dev/null || echo 0) + 1 ))
echo "$n" > "$FAIL_FILE"
printf '%s [连续失败#%s] %s\n' "$ts" "$n" "$err" >> "$LOG"

if [ "$n" -ge 3 ]; then
  last=$(cat "$ALERT_FILE" 2>/dev/null || echo 0)
  if [ $((now - last)) -ge "$ALERT_COOLDOWN" ]; then
    if python3 -I "$NOTIFY" "🔴 n8n watcher 触发连续失败 ${n} 次" "$err" >/dev/null 2>&1; then
      echo "$now" > "$ALERT_FILE"
    fi
  fi
fi

exit 1
