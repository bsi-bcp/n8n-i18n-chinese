# 本机 watcher 外置触发（Mac launchd）

每小时 :37 触发一次 `gh workflow run n8n-stable-watch.yml`（绕开 GitHub schedule 节流）。

## 换机/重装恢复

```bash
mkdir -p ~/.claude/scripts ~/.claude/logs
cp n8n-watcher-trigger.sh ~/.claude/scripts/ && chmod +x ~/.claude/scripts/n8n-watcher-trigger.sh
# ⚠️ 编辑 plist：把 /Users/fish 换成新机的用户 home 路径；确认脚本内 gh 绝对路径
cp com.bsi.n8n-watcher-trigger.plist ~/Library/LaunchAgents/
launchctl load ~/Library/LaunchAgents/com.bsi.n8n-watcher-trigger.plist
# 验证：launchctl kickstart gui/$(id -u)/com.bsi.n8n-watcher-trigger
```

前置：本机 `gh` 已登录（有 bsi-bcp/n8n-i18n-chinese 的 dispatch 权限）。
