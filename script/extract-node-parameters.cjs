#!/usr/bin/env node
// 节点参数全量提取器（2026-09-19 立项 M1，评审 D-E4-2/D-E4-5 配套）
// 从 n8n 实例的 types/nodes.json 提取全量参数面板字符串，产出：
//   1) params-strings.json  按节点分组的全量清单（含路径与类型标注，供人工核查）
//   2) params-unique.json   去重串映射（en → {count, nodes, kind[]}, 供 M2 批量翻译）
//   3) stdout 统计报告
// 用法: node extract-node-parameters.cjs <types/nodes.json> <输出目录>
// 豁免规则（不提取）: name/value/action/codewords 等技术字段、builderHint（LLM 提示词）、
//   URL、纯技术串（无空格短串/纯数字/版本号）
'use strict';
const fs = require('fs');
const path = require('path');

const [inFile, outDir] = [process.argv[2], process.argv[3]];
if (!inFile || !fs.existsSync(inFile) || !outDir) {
  console.error('usage: node extract-node-parameters.cjs <types.json> <outDir>');
  process.exit(2);
}

const EXCLUDE_FIELDS = new Set(['name', 'value', 'action', 'codewords', 'builderHint', 'type', 'version']);
// 技术串判据：URL / 纯数字版本号 / 小写开头标识符形态（camelCase/snake/dot.path，如 jsCode、runOnceForAllItems）。
// 🔴 不可用"无空格"判据——会把单词型 displayName（Mode/Code/Language/JavaScript）全部误杀（首轮实锤缺口）
const isTechnical = (s) =>
  /^https?:\/\//.test(s) ||
  /^[\d.v\-]+$/.test(s) ||
  (/^[a-z][A-Za-z0-9_.-]*$/.test(s) && !/[一-鿿]/.test(s));

let nodes = [];
const raw = JSON.parse(fs.readFileSync(inFile, 'utf8'));
if (Array.isArray(raw)) nodes = raw;
else if (Array.isArray(raw.nodes)) nodes = raw.nodes;
else { console.error('❌ 结构异常：types.json 无节点数组'); process.exit(1); }

const KIND_DISPLAY = 'label', KIND_OPTION = 'option', KIND_DESC = 'desc', KIND_HINT = 'hint', KIND_PLACEHOLDER = 'placeholder';

const perNode = [];
const unique = new Map();
let totalStrings = 0, technical = 0;

function collect(nodeType, nodeDisplay, rel, kind, value) {
  if (typeof value !== 'string' || !value.trim()) return;
  totalStrings++;
  if (isTechnical(value)) { technical++; return; }
  const entry = { path: rel, kind, en: value };
  perNode.push({ node: nodeType, display: nodeDisplay, ...entry });
  const u = unique.get(value) || { count: 0, nodes: new Set(), kinds: new Set() };
  u.count++; u.nodes.add(nodeType); u.kinds.add(kind);
  unique.set(value, u);
  void entry;
}

function walkParams(props, nodeType, nodeDisplay, base) {
  for (const p of props) {
    if (!p || typeof p !== 'object') continue;
    const here = base ? `${base}.${p.name}` : p.name;
    if (p.displayName) collect(nodeType, nodeDisplay, `${here}.displayName`, KIND_DISPLAY, p.displayName);
    if (p.description) collect(nodeType, nodeDisplay, `${here}.description`, KIND_DESC, p.description);
    if (p.hint) collect(nodeType, nodeDisplay, `${here}.hint`, KIND_HINT, p.hint);
    if (p.placeholder) collect(nodeType, nodeDisplay, `${here}.placeholder`, KIND_PLACEHOLDER, p.placeholder);
    if (Array.isArray(p.options)) {
      p.options.forEach((o, i) => {
        if (o && typeof o.name === 'string') collect(nodeType, nodeDisplay, `${here}.options[${i}].name`, KIND_OPTION, o.name);
        if (o && typeof o.description === 'string') collect(nodeType, nodeDisplay, `${here}.options[${i}].description`, KIND_DESC, o.description);
      });
    }
    if (Array.isArray(p.fixedCollectionValues)) {
      p.fixedCollectionValues.forEach((fc, i) => {
        if (fc && fc.displayName) collect(nodeType, nodeDisplay, `${here}.fixedCollectionValues[${i}].displayName`, KIND_DISPLAY, fc.displayName);
      });
    }
    if (Array.isArray(p.options) === false && Array.isArray(p.properties)) walkParams(p.properties, nodeType, nodeDisplay, here);
  }
}

for (const n of nodes) {
  const type = n.name || '(unknown)';
  const display = n.displayName || type;
  if (n.subtitle) collect(type, display, 'subtitle', KIND_DISPLAY, n.subtitle);
  if (n.description) collect(type, display, 'description', KIND_DESC, n.description);
  if (Array.isArray(n.properties)) walkParams(n.properties, type, display, '');
}

// 输出 1：按节点分组清单
fs.mkdirSync(outDir, { recursive: true });
const grouped = {};
for (const e of perNode) {
  (grouped[e.node] ||= { displayName: e.display, strings: [] }).strings.push({ path: e.path, kind: e.kind, en: e.en });
}
fs.writeFileSync(path.join(outDir, 'params-strings.json'), JSON.stringify({
  _meta: { source: 'types/nodes.json', extractedAt: new Date().toISOString().slice(0, 10), nodes: nodes.length },
  nodes: grouped,
}, null, 2));

// 输出 2：去重映射（M2 翻译输入）
const uniqOut = {};
for (const [en, u] of [...unique.entries()].sort((a, b) => b[1].count - a[1].count)) {
  uniqOut[en] = { count: u.count, nodes: [...u.nodes].slice(0, 5), kinds: [...u.kinds] };
}
fs.writeFileSync(path.join(outDir, 'params-unique.json'), JSON.stringify(uniqOut, null, 2));

const uniqCount = unique.size;
console.log(`节点: ${nodes.length} | 参数串总量: ${totalStrings} | 技术串跳过: ${technical} | 去重后: ${uniqCount}`);
console.log(`产出: ${path.join(outDir, 'params-strings.json')} / params-unique.json`);
