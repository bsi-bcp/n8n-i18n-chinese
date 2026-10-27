# 本机 watcher 外置触发（Mac launchd）

每小时 :37 触发一次 `gh workflow run n8n-stable-watch.yml`（绕开 GitHub schedule 节流）。

## 换机/重装恢复

```bash
mkdir -p ~/.claude/scripts ~/.claude/logs
cp n8n-watcher-trigger.sh notify-feishu.py ~/.claude/scripts/
chmod +x ~/.claude/scripts/n8n-watcher-trigger.sh ~/.claude/scripts/notify-feishu.py
# ⚠️ 编辑 plist：把 /Users/fish 换成新机的用户 home 路径；确认脚本内 gh 绝对路径
cp com.bsi.n8n-watcher-trigger.plist ~/Library/LaunchAgents/
launchctl load ~/Library/LaunchAgents/com.bsi.n8n-watcher-trigger.plist
# 验证：launchctl kickstart gui/$(id -u)/com.bsi.n8n-watcher-trigger
# 告警通道自测（dry-run 只打印 payload，不发送）：
#   FEISHU_DRY_RUN=1 python3 -I ~/.claude/scripts/notify-feishu.py "自测" "detail"
```

前置：本机 `gh` 已登录（有 bsi-bcp/n8n-i18n-chinese 的 dispatch 权限）。

## 带外告警（2026-10-27 起）

GitHub Actions 被整体禁用时（如 fork 用量限制），GitHub 侧的飞书卡与 Issue 告警全部失效。触发器因此在本地判活：

- dispatch 失败 → 带时间戳追加到 `~/.claude/logs/n8n-watcher-trigger.log`，并累计连续失败次数；
- 连续失败 ≥3 次 → 直接发飞书告警群（`feishu.group.alarm`，12h 冷却）；
- 恢复且此前连续失败 ≥3 次 → 发恢复通知，计数归零。

状态文件在 `~/.claude/logs/.n8n-watcher/`（`consecutive-failures`、`last-alert-epoch`）。
`notify-feishu.py` 只从凭证库动态读取 webhook，不含明文 secret，可入公开仓。
