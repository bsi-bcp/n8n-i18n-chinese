#!/usr/bin/env node
// EE 合规独立回归门禁（2026-09-21 专家评审 P1-3 落地）：
// E5-P1-A 的 .ee. 排除只活在各脚本内部，2026-09-21 评审实锤语义脚本前端路径漏网
// （promotions.ee/sourceControl.ee 被改写随 2.39.7-v3+/2.39.8 dist 公开分发），
// 映射表另查出 45 条 EE 评估节点残留。本脚本=独立于各脚本的产物级校验层，三种模式：
//
//   node check-ee-gate.cjs --map <params-zh-map.json>   # ①映射表扫描：values 复用
//       scan-zh-dict 同级危险模式（EN 锚定=key 本身）+ keys 的 EE 特征词黑名单
//   node check-ee-gate.cjs --diff <git仓库根>            # ②构建后断言：工作区相对
//       上游基线的全部改动路径不得触碰 .ee. / .ee 目录段（nodes-base 下含 Evaluation）
//   node check-ee-gate.cjs --dist <dist目录>             # ③镜像内断言：EE 保护路径
//       （*.ee.* 文件 / .ee 目录段 / nodes-base Evaluation 目录）含 CJK 即 fail
//       ——JS 兜底注入恰好发生在镜像构建内，这是唯一能拦住它的位置
//
// HIGH 命中退出码 1（阻断发版/构建）。误报处理：key 白名单 ALLOW_KEYS 显式豁免并注明理由。
'use strict';
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const argv = process.argv.slice(2);
const mode = argv[0];
const wantHelp = !((mode === '--map' || mode === '--diff' || mode === '--dist') && argv[1]);

// ── EE 特征判定（对 key/路径通用）──
// LICENSE 口径：文件名含 .ee. 不适用 SUL；NOTICE 照录「.ee in their dirname」同不适用；
// EE 节点 = evaluation/evaluationTrigger（nodes-base 下，dist 目录名 PascalCase）。
const isEEName = (name) => name.includes('.ee.') || name.endsWith('.ee');
const isEEPath = (rel) => {
  const segs = rel.split('/');
  if (segs.some(isEEName)) return true;
  // Evaluation 目录段仅在 nodes-base 语境算 EE（前端 features/evaluations 是 SUL 的 UI 模块）
  return segs.some((s, i) => s === 'Evaluation' && segs.slice(0, i).join('/').includes('nodes-base'));
};

// ── ①映射表扫描 ──
// EE 特征词黑名单（2026-09-21 实锤剔除的 45 条所共享的表达特征）。
// 🔴 不用裸 /evaluat/i：webhook 的 "Expression evaluated against…"、Airtable 公式的
//    "will be evaluated" 等合法 SUL 文本含 evaluate/evaluated——只匹配独立词 evaluation(s)。
const EE_KEY_PATTERNS = [
  [/\bevaluations?\b/i, 'EE 评估节点特征词 evaluation(s)'],
  [/ground truth/i, 'EE 评估节点特征（ground truth）'],
  [/reference answer/i, 'EE 评估节点特征（reference answer）'],
  [/\bcorrectness\b|\bhelpfulness\b/i, 'EE 评估指标名'],
  [/make sure to fill in|make sure each metric|make sure you add at least one/i, 'EE 评估校验消息'],
  [/expected (answer|tools)\b|actual answer|user query/i, 'EE 评估参数名'],
  [/intermediateSteps/i, 'EE 评估字段映射提示'],
  [/metric-based-evaluations|custom name to the metric|Add (Input|Output).{0,12}button/i, 'EE 评估描述'],
];
// 已复核为合法 SUL 内容的豁免键（命中特征词但确认非 EE 专有）——新增豁免必须注明出处
// ① "Timezone used for date filter evaluation"：非 EE 源码（2026-09-21 对 Evaluation 节点源码 grep=0），
//    属 SUL 节点的日期筛选说明文本，"evaluation" 为普通名词用法
const ALLOW_KEYS = new Set([
  'Timezone used for date filter evaluation, e.g. UTC or Europe/Berlin',
]);

function runMap(mapFile) {
  const map = JSON.parse(fs.readFileSync(mapFile, 'utf8'));
  const HIGH_PATTERNS = [
    [/<script[\s>]|<iframe[\s>]|<svg[\s>]|onerror\s*=|onclick\s*=|onload\s*=/i, '脚本/事件注入标签（EN 锚无）'],
    [/javascript\s*:/i, 'javascript: 伪协议（EN 锚无）'],
    [/data\s*:\s*(text|application|image)\//i, 'data: URI（EN 锚无）'],
    [/限制[:：]\s*仅输出|不包含任何额外信息|作为\s*(一个)?\s*AI|as an AI\b/i, 'LLM 指令回显'],
  ];
  let high = 0;
  const report = [];
  const flag = (why, en, val) => {
    high++;
    report.push(`HIGH  ${en.slice(0, 80)}\n      ${why}\n      值: ${String(val).slice(0, 120)}`);
  };
  for (const [en, val] of Object.entries(map)) {
    // keys：EE 特征扫描
    if (!ALLOW_KEYS.has(en)) {
      for (const [re, why] of EE_KEY_PATTERNS) {
        if (re.test(en)) { flag(`映射表 key ${why}（EE 专有内容不得随镜像分发）`, en, val); break; }
      }
    }
    // values：与 scan-zh-dict 同级危险模式，EN 锚 = key 本身
    for (const [re, why] of HIGH_PATTERNS) {
      if (re.test(val) && !re.test(en)) { flag(why, en, val); }
    }
    if (/\{\{/.test(val) && !en.includes('{{')) flag('vue 模板插值 {{}}（EN 锚无）', en, val);
    // URL 用严格 ASCII 字符类：中文译文会在 URL 后紧跟全角标点（，。；），宽松类会把
    // 标点吞进 URL 导致「EN 锚中没有」误报（2026-09-21 首跑 6 连误报实证）
    for (const m of val.matchAll(/https?:\/\/[A-Za-z0-9._~:/?#[\]@!$&'()*+,;=%-]+/gi)) {
      if (!en.includes(m[0])) flag('value 含 EN 锚中没有的 URL', en, val);
    }
  }
  console.log(`EE 门禁(--map): ${Object.keys(map).length} 条, HIGH=${high}`);
  if (report.length) console.log(report.join('\n'));
  if (high > 0) process.exit(1);
}

// ── ②构建后改动路径断言 ──
function runDiff(repoRoot) {
  const out = execFileSync('git', ['status', '--porcelain'], { cwd: repoRoot, encoding: 'utf8', maxBuffer: 1 << 24 });
  const bad = [];
  for (const line of out.split('\n')) {
    if (!line.trim()) continue;
    const rel = line.slice(3).replace(/^"|"$/g, '').trim(); // 去掉 XY 状态前缀与引号包裹
    if (isEEPath(rel)) bad.push(line);
  }
  console.log(`EE 门禁(--diff): ${out.split('\n').filter((l) => l.trim()).length} 个改动路径, 违规=${bad.length}`);
  if (bad.length) {
    console.error('🔴 检测到对 EE 专有路径的改动（LICENSE: *.ee.* 文件与 .ee 目录段不适用 SUL，禁止修改后随公开产物分发）:');
    console.error(bad.join('\n'));
    process.exit(1);
  }
}

// ── ③镜像内 EE 保护路径 CJK 断言 ──
function runDist(distDir) {
  let files = 0, eeFiles = 0, cjkHits = [];
  const CJK = /[一-鿿]/;
  (function walk(d) {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) { if (!isEEName(e.name)) walk(p); }
      else {
        files++;
        const rel = path.relative(distDir, p);
        // dist 模式相对路径无 nodes-base 前缀段（首跑漏报实证）——扫描对象就是包 dist，
        // Evaluation 目录段无条件算 EE 保护；.ee 规则与 --diff 一致
        const segs = rel.split('/');
        if (!(isEEName(rel) || segs.includes('Evaluation'))) continue;
        eeFiles++;
        const src = fs.readFileSync(p, 'utf8');
        if (CJK.test(src)) cjkHits.push(rel);
      }
    }
  })(distDir);
  console.log(`EE 门禁(--dist): ${files} 文件, EE 保护路径 ${eeFiles} 个, CJK 污染=${cjkHits.length}`);
  if (cjkHits.length) {
    console.error('🔴 EE 专有文件出现中文内容=被注入管线改写（合规违规，注入泄漏）:');
    console.error(cjkHits.slice(0, 20).join('\n'));
    process.exit(1);
  }
}

// ── 入口分发（置尾：常量/函数声明先就位，避免 TDZ）──
if (wantHelp) {
  console.error(`usage: node ${process.argv[1]} (--map <params-zh-map.json> | --diff <git仓库根> | --dist <dist目录>)`);
  process.exit(2);
}
if (mode === '--map') runMap(argv[1]);
else if (mode === '--diff') runDiff(argv[1]);
else runDist(argv[1]);
