#!/bin/bash
# n8n watcher 外置触发（每小时 :37，绕开 GitHub schedule 节流；watcher 幂等，多触发无副作用）
export PATH="/usr/local/bin:/usr/bin:/bin"
/usr/local/bin/gh workflow run n8n-stable-watch.yml -R bsi-bcp/n8n-i18n-chinese
