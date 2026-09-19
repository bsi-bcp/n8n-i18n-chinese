#!/bin/bash
# 产线自动化 → paul_docs 离线备份同步（2026-09-19）
# 触发：launchd WatchPaths 监听源仓库（任何文件变化即启动；脚本内 30s 防抖合并高频保存）
# 行为：rsync 产线文件 → 00-docs/n8n/n8n-chinese → 有差异才 commit+push；无差异静默退出
set -uo pipefail
sleep 30  # 防抖：合并短时间内的连续变更

SRC=/Users/paul/Documents/GitHub/n8n-i18n-chinese
DOCS=/Users/paul/Documents/GitHub/00-docs
DEST="$DOCS/n8n/n8n-chinese"
LOG="$HOME/.claude/logs/n8n-backup-sync.log"

SHA=$(git -C "$SRC" rev-parse --short HEAD 2>/dev/null) || exit 0
DATE=$(date +%F)

# 同步产线文件（镜像源仓库结构；--delete 保持与源一致）
rsync -a --delete \
  --exclude '.git' \
  "$SRC/.github" "$SRC/script" "$SRC/patches" "$SRC/host-launchd" "$DEST/" 2>/dev/null
rsync -a "$SRC/Dockerfile" "$SRC/Dockerfile.runners" "$SRC/NOTICE-n8n-localization.md" "$SRC/CLAUDE.md" "$DEST/" 2>/dev/null

# 更新备份说明的基准信息
python3 - "$DEST/备份说明.md" "$SHA" "$DATE" <<'EOF' 2>/dev/null || true
import sys, re
p, sha, date = sys.argv[1], sys.argv[2], sys.argv[3]
try:
    s = open(p, encoding='utf-8').read()
    s = re.sub(r'- 备份日期：.*', f'- 备份日期：{date}', s)
    s = re.sub(r'(@ commit )`[0-9a-f]+`', f'@ commit `{sha}`', s)
    open(p, 'w', encoding='utf-8').write(s)
except Exception:
    pass
EOF

# 有差异才提交推送
cd "$DOCS" || exit 0
if [ -n "$(git status --porcelain n8n/n8n-chinese)" ]; then
  git add n8n/n8n-chinese
  git commit -m "backup: n8n-i18n-chinese 产线自动化备份 @$SHA（自动同步）" || exit 0
  git push origin main >> "$LOG" 2>&1 && \
    echo "$(date '+%F %T') synced @$SHA" >> "$LOG" || \
    echo "$(date '+%F %T') push FAILED @$SHA" >> "$LOG"
else
  echo "$(date '+%F %T') no pipeline changes @$SHA" >> "$LOG"
fi
