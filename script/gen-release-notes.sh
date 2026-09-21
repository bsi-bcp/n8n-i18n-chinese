#!/usr/bin/env bash
# 生成汉化包 GitHub Release 说明：上游 n8n release notes 中文总结 + 汉化变更 + 兼容区间 + 交付渠道
#
# 用法: gen-release-notes.sh <版本号如 2.39.7> [输出文件] [上游body文件]
#   不传上游 body 文件时自动从 GitHub API 拉取 n8n-io/n8n 的 n8n@<版本号> Release
#
# 环境变量（均可选，缺省时降级为模板化整理）:
#   GH_TOKEN          GitHub API 认证（避免限流）
#   ZH_KEY_COUNT      翻译后 zh-CN.json 键总数（用于"全量汉化"表述）
#   PREV_KEY_COUNT    翻译前键总数（有则计算增量条数）
#   OPENAI_API_KEY / OPENAI_API_BASE / OPENAI_MODEL   LLM 总结（OpenAI 兼容接口）

set -uo pipefail

V="${1:?用法: gen-release-notes.sh <版本号> [输出文件] [上游body文件]}"
OUT="${2:-/dev/stdout}"
UPFILE="${3:-}"

AUTH=()
[ -n "${GH_TOKEN:-}" ] && AUTH=(-H "Authorization: Bearer $GH_TOKEN")

# ---------- 1) 获取上游 release notes ----------
TMPDIR_NOTES=$(mktemp -d)
trap 'rm -rf "$TMPDIR_NOTES"' EXIT
if [ -z "$UPFILE" ]; then
  UPFILE="$TMPDIR_NOTES/upstream.md"
  curl -sSL --retry 3 --max-time 30 ${AUTH[@]+"${AUTH[@]}"} \
    "https://api.github.com/repos/n8n-io/n8n/releases/tags/n8n%40${V}" \
    -o "$TMPDIR_NOTES/rel.json" || true
  if jq -e '.body' "$TMPDIR_NOTES/rel.json" >/dev/null 2>&1; then
    jq -r '.body' "$TMPDIR_NOTES/rel.json" > "$UPFILE"
  else
    : > "$UPFILE"
  fi
fi
# 去掉 cubic 自动生成广告块与 HTML 注释块
sed -e '/<!-- This is an auto-generated description by cubic/,/<!-- End of auto-generated description by cubic/d' \
    -e '/^<a href=/d' -e '/^<\/picture>/d' -e '/^<img /d' -e '/^<picture>/d' -e '/^<source /d' \
    "$UPFILE" > "${UPFILE}.clean" && mv "${UPFILE}.clean" "$UPFILE"

# ---------- 2) LLM 中文总结（可选，失败降级用原文） ----------
UP_SUMMARY=""
LLM_OK=0
if [ -n "${OPENAI_API_KEY:-}" ] && [ -n "${OPENAI_API_BASE:-}" ] && [ -n "${OPENAI_MODEL:-}" ] && [ -s "$UPFILE" ]; then
  PAYLOAD=$(jq -n --arg m "$OPENAI_MODEL" --rawfile notes "$UPFILE" '{
    model: $m,
    temperature: 0.2,
    messages: [
      {role: "system", content: "你是 n8n 上游 Release Notes 的中文摘要助手。把用户提供的 release notes 精炼为简体中文 markdown：按「新功能 / 增强 / Bug Fixes」分类，分类标题用三级标题（###），逐条概括并保留原 PR 编号与链接；若某分类无内容则省略该分类。分类之后追加一节「## 🖥 界面变化速览（业务人员视角）」：用两三句大白话列出本次版本里业务人员在界面上能直接看到的变化（新界面/新按钮/行为变化），没有可见变化则写「本次无可感知的界面变化」；该节之后单独一行输出「破坏性变更：无」或「破坏性变更：有（简述）」。只输出 markdown 正文，不要寒暄。"},
      {role: "user", content: $notes}
    ]}')
  UP_SUMMARY=$(curl -sS --retry 2 --max-time 90 "${OPENAI_API_BASE%/}/chat/completions" \
    -H "Content-Type: application/json" -H "Authorization: Bearer $OPENAI_API_KEY" \
    -d "$PAYLOAD" 2>/dev/null | jq -r '.choices[0].message.content // empty' || true)
  [ -n "$UP_SUMMARY" ] && LLM_OK=1
fi
if [ -z "$UP_SUMMARY" ]; then
  if [ -s "$UPFILE" ]; then
    UP_SUMMARY=$(cat "$UPFILE")
  else
    UP_SUMMARY="（未能获取上游 release notes，请见上游 Release 链接）"
  fi
fi

# ---------- 3) 兼容区间（同 minor 补丁线就近兼容，遵循 README/CHANGELOG 惯例） ----------
MAJOR="${V%%.*}"; REST="${V#*.}"; MINOR="${REST%%.*}"; PATCH="${REST#*.}"
KEYS_LINE=""
if [ -n "${ZH_KEY_COUNT:-}" ]; then KEYS_LINE="- 语言包 ${ZH_KEY_COUNT} 键全量汉化"; fi
DELTA_LINE=""
if [ -n "${PREV_KEY_COUNT:-}" ] && [ -n "${ZH_KEY_COUNT:-}" ]; then
  DELTA=$(( ZH_KEY_COUNT - PREV_KEY_COUNT ))
  if [ "$DELTA" -gt 0 ] 2>/dev/null; then DELTA_LINE="- 翻译增量 **${DELTA} 条**"
  else DELTA_LINE="- 翻译增量 **0 条**（补丁版无新文案，语言包沿用上一版）"; fi
fi
if [ "$PATCH" -gt 0 ] 2>/dev/null; then
  NEAR="**就近兼容** ${MAJOR}.${MINOR}.0 ~ ${MAJOR}.${MINOR}.$((PATCH-1))（同 minor 旧补丁线，新增文案回退英文）"
else
  NEAR="**就近兼容** 上一 minor 补丁线（以实测为准，新增文案回退英文）"
fi

# ---------- 3.5) 本仓库变更（上一 Release tag → 本 tag 的提交摘要） ----------
# 需要 GH_REPO（CI 中=github.repository）；本地未设置则跳过
REPO_CHANGES=""
if [ -n "${GH_REPO:-}" ] && [ -n "${GH_TOKEN:-}" ]; then
  gh api "repos/$GH_REPO/releases?per_page=20" > "$TMPDIR_NOTES/rels.json" 2>/dev/null || true
  PREV_TAG=$(jq -r --arg cur "release/$V" \
    '[.[] | select((.tag_name | test("^release/[0-9]+[.][0-9]+[.][0-9]+$")) and .tag_name != $cur) | .tag_name | ltrimstr("release/")] | sort_by(split(".") | map(tonumber)) | last // empty' "$TMPDIR_NOTES/rels.json" 2>/dev/null || true)
  if [ -n "$PREV_TAG" ]; then
    REPO_CHANGES=$(gh api "repos/$GH_REPO/compare/release/$PREV_TAG...release/$V" \
      --jq '[.commits[].commit.message | split("\n")[0]] | unique | .[] | select(startswith("chore:") | not) | "- " + .' 2>/dev/null | head -30 || true)
    [ -n "$REPO_CHANGES" ] && REPO_CHANGES="（${PREV_TAG} → ${V}）"$'\n\n'"$REPO_CHANGES"
  fi
fi

# ---------- 4) 组装 markdown ----------
# 「界面变化速览」节二选一（2026-09-22 修复重复段落）：LLM 摘要成功时该节已含于
# UP_SUMMARY（提示词要求输出），不再拼占位脚手架；仅 LLM 降级路径保留占位供维护者补写
UI_BLOCK=""
if [ "$LLM_OK" != "1" ]; then
  UI_BLOCK=$'\n## 🖥 界面变化速览（业务人员视角）\n\n<!-- LLM 总结自动生成；缺失时请维护者补一句大白话：本次版本业务人员在界面上能看到什么变化 -->\n'
fi
cat > "$OUT" <<EOF
> 本 Release 由 CI 流水线自动构建发布，对应上游 n8n@${V}。

## ⬆️ 本次升级内容（上游）

${UP_SUMMARY}

## 🈶 汉化包变更

${DELTA_LINE:-- 汉化 dist 由 n8n@${V} 源码原生构建，含上游全部 editor 修复}
${KEYS_LINE}
- \`patches/feat__i18n_zhCn.patch\` 与上游 ${V} 源码贴合，CI 全链路构建通过

${REPO_CHANGES:+
## 📝 本仓库变更

$REPO_CHANGES
}
${UI_BLOCK}
## 🔖 兼容版本

**兼容**：n8n ${V}（精确匹配）；${NEAR}；**不兼容** > ${V} 的后端（新增界面文案回退英文，等本仓库跟进发版）。跨大版本区间错配可能白屏，完整矩阵见 README「[n8n 版本兼容说明](https://github.com/bsi-bcp/n8n-i18n-chinese#n8n-版本兼容说明)」。

## 📦 交付渠道

- Release 部署包：\`n8n-editor-ui@${V}.tar.gz\`（解包覆盖容器内 \`n8n-editor-ui/dist\`，bind mount 方式）
- Docker 镜像：\`swr.cn-north-4.myhuaweicloud.com/bcphub/n8n-chinese:${V}\`（华为云 SWR，国内边端正式交付通道）

## ↩ 回滚

- patch 级（x.y.z → x.y.z-1）：镜像改回旧版本 tag 重启即可，数据卷零改动
- minor 跨级回退：n8n 官方不支持直接降级，须按官方指南执行 \`n8n db:revert\`（一次回退一步）后再回镜像 tag，或建议前滚修复

## 🔗 上游

[n8n@${V} Release](https://github.com/n8n-io/n8n/releases/tag/n8n%40${V})
EOF

echo "release notes written: $OUT" >&2
