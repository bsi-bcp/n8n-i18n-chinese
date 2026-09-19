#!/usr/bin/env node
// 参数串 dist 对账提取器（2026-09-19 M2 补强）：从 n8n-nodes-base dist 的 JS 文件
// 静态提取显示语境串，补 types/nodes.json 的结构性盲区——
// types 只含各节点当前版本参数，dist 里 V1/V2 旧版并存；credentials 描述不在 types。
// 产出与 extract-node-parameters.cjs 的 params-unique.json 同构，供合并后增量翻译。
//
// 用法: node extract-params-from-dist.cjs <nodes-base dist 目录> <输出.json>
'use strict';
const fs = require('fs');
const path = require('path');

const [distDir, outFile] = [process.argv[2], process.argv[3]];
if (!distDir || !outFile) { console.error('usage: extract-params-from-dist.cjs <distDir> <out.json>'); process.exit(2); }

// 显示属性串（与 inject-params.cjs 的注入口径一致）
const PAT = new RegExp("(?:displayName|description|placeholder|hint): *(?:'((?:[^'\\\\]|\\\\.)*)'|\"((?:[^\"\\\\]|\\\\.)*)\")", 'g');
// name 非标识符形态的（option name 等显示串；标识符形态=参数键，跳过）
const NAME_PAT = new RegExp("name: *(?:'((?:[^'\\\\]|\\\\.)*)'|\"((?:[^\"\\\\]|\\\\.)*)\")", 'g');

const unesc = (s) => s.replace(/\\(.)/g, (_, c) => ({ n: '\n', t: '\t', r: '\r' }[c] ?? c));
const IDENT = /^[a-z][A-Za-z0-9_.\-]*$/;
const skip = (v) =>
  !v || v.length < 4 ||           // 超短串（含单词缩写）翻译价值低、多义风险高
  (v.length < 6 && !/\s/.test(v)) || // 短无空格串
  /[一-鿿]/.test(v) ||            // 已是中文（POC 污染/上游汉化）
  v.startsWith('={{') ||          // 表达式
  /^https?:\/\//.test(v) ||       // URL
  /^[\d.v\-\s]+$/.test(v) ||      // 纯数字/版本
  IDENT.test(v);                  // 标识符形态（camelCase 参数键等）

const unique = new Map();
let total = 0;

function add(v, dirTag, kind) {
  total++;
  const u = unique.get(v) || { count: 0, nodes: new Set(), kinds: new Set() };
  u.count++; u.nodes.add(dirTag); u.kinds.add(kind);
  unique.set(v, u);
}

(function walk(d) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name);
    if (e.isDirectory()) { walk(p); continue; }
    if (!e.name.endsWith('.js')) continue;
    const src = fs.readFileSync(p, 'utf8');
    const rel = path.relative(distDir, p);
    const parts = rel.split(path.sep);
    // 上下文标签：nodes/<Node>/... 取节点名；credentials/ 取目录；utils 取文件名
    const dirTag = parts[0] === 'nodes' && parts.length > 1 ? parts[1]
      : parts[0] === 'credentials' && parts.length > 1 ? `credentials/${parts[1]}`
      : parts.slice(0, 2).join('/');
    for (const m of src.matchAll(PAT)) {
      const lit = m[1] !== undefined ? m[1] : m[2];
      if (lit === undefined) continue;
      const v = unesc(lit).trim();
      if (skip(v)) continue;
      add(v, dirTag, 'dist');
    }
    for (const m of src.matchAll(NAME_PAT)) {
      const lit = m[1] !== undefined ? m[1] : m[2];
      if (lit === undefined) continue;
      const v = unesc(lit).trim();
      if (skip(v) || !/\s/.test(v)) continue; // name 额外要求含空格（显示串特征，进一步防参数键）
      add(v, dirTag, 'dist-name');
    }
  }
})(distDir);

const out = {};
for (const [en, u] of [...unique.entries()].sort((a, b) => b[1].count - a[1].count)) {
  out[en] = { count: u.count, nodes: [...u.nodes].slice(0, 5), kinds: [...u.kinds] };
}
fs.writeFileSync(outFile, JSON.stringify(out, null, 2));
console.log(`dist 扫描: 串实例 ${total} | 去重 ${unique.size} → ${outFile}`);
