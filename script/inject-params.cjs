#!/usr/bin/env node
// M3 参数注入器（2026-09-19 立项 M3）：把 params-zh-map.json 的 en→zh 映射
// 替换进 n8n-nodes-base 的参数串——参数面板串硬编码于节点类文件、
// 经后端 types payload 直出、前端渲染不过 i18n 查表（审计实证）。
//
// 🔴 2.39 实证（YTJ1 灰度 2026-09-19）：运行时 /types/nodes.json 直接 serve
// n8n-nodes-base/dist/types/nodes.json **静态预生成缓存**（M0 POC 即改此文件），
// 各节点 dist JS 不被重新执行——故**必须注入该 JSON**；JS 扫描保留为动态路径兜底。
//
// 用法:
//   node inject-params.cjs <nodes-base dist 目录> <params-zh-map.json>   # JS 扫描（兜底）
//   node inject-params.cjs <types/nodes.json 文件> <params-zh-map.json>  # JSON 结构化替换（主路径）
//
// 安全设计（立项风险表 D-P1/B）：
// - 只动显示语境属性：displayName/description/placeholder/hint/label 全量；
//   name 仅替换"非标识符形态"的值（参数键 name:'mode' 是行为标识符绝不能换）——
//   判据：值匹配 ^[a-z][A-Za-z0-9_]*$ 视为标识符跳过（自然语言显示串 "Return All"/"JSON" 均不匹配）
// - 值经反转义后与映射表按原文精确匹配，非模糊包含
// - 输出统一双引号风格字面量（单/双引号转义风格与包裹引号混用会炸语法——曾 1982 文件回滚）
// - 每文件替换后 node --check 语法校验，坏即回滚该文件并计数告警（JSON 模式写前 JSON.parse 校验）
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const [distDir, mapFile] = [process.argv[2], process.argv[3]];
if (!distDir || !mapFile) { console.error('usage: inject-params.cjs <distDir> <zh-map.json>'); process.exit(2); }

const zhMap = JSON.parse(fs.readFileSync(mapFile, 'utf8'));
// 过滤掉替换后无意义的条目：原文为空或过短（<2 字符）不做
const entries = Object.entries(zhMap).filter(([en]) => en.trim() && en.length >= 2);
console.log(`映射表 ${Object.keys(zhMap).length} 条（有效 ${entries.length}）`);

const IDENT = /^[a-z][A-Za-z0-9_]*$/; // 参数键/行为标识符形态（小写开头无空格）
const DISPLAY_KEYS = new Set(['displayName', 'description', 'placeholder', 'hint', 'label']);
// 🔴 EE 专有内容排除（2026-09-20 评审 E5-P1-A 实锤）：上游 LICENSE.md 明文 *.ee.* 文件与
// EE 节点不适用 SUL、须企业授权——注入器修改它们=无权修改专有代码且随镜像公开分发。
// 曾实锤 24 条 .ee.js 静态串 + 93 条 types EE 子树串被改写进已发布镜像（已重推清理）。
const EE_FILE_MARK = '.ee.';
const EE_NODE_SKIP = new Set(['evaluation', 'evaluationTrigger']);
const hitEn = new Set(); // 实际生效原文（利用率口径）

// ── JSON 结构化模式（主路径：dist/types/nodes.json 预生成缓存）──
function injectJson(file) {
  const raw = fs.readFileSync(file, 'utf8');
  let data;
  try { data = JSON.parse(raw); } catch (e) { console.error(`❌ JSON 解析失败: ${file}: ${e.message}`); process.exit(1); }
  const walk = (node) => {
    if (Array.isArray(node)) { for (const v of node) walk(v); return; }
    if (!node || typeof node !== 'object') return;
    for (const [k, v] of Object.entries(node)) {
      if (typeof v === 'string' && (DISPLAY_KEYS.has(k) || k === 'name' || k === 'action') && v.length >= 2) {
        // name/action 是行为标识符重灾区（参数键/选项值），仅放行自然语言形态——
        // options[].action 如 'Code in JavaScript' 是面板第三层标题+节点实例名来源（2026-09-19 实证）
        if ((k === 'name' || k === 'action') && IDENT.test(v)) continue;
        const zh = zhMap[v];
        if (zh !== undefined) { node[k] = zh; hitEn.add(v); }
      } else if (typeof v === 'object') walk(v);
    }
  };
  if (Array.isArray(data)) {
    // 节点数组根：EE 专有节点整棵子树跳过
    for (const entry of data) {
      if (entry && typeof entry === 'object' && EE_NODE_SKIP.has(String(entry.name))) continue;
      walk(entry);
    }
  } else walk(data);
  const out = JSON.stringify(data);
  try { JSON.parse(out); } catch (e) { console.error(`❌ 序列化校验失败已中止: ${e.message}`); process.exit(1); }
  fs.writeFileSync(file, out);
  console.log(`✅ JSON 注入完成: ${file}`);
  console.log(`   映射表利用率: ${hitEn.size}/${entries.length} (${Math.round(hitEn.size * 100 / entries.length)}%) 条实际生效`);
  return;
}

// 入口分流：目标是 .json 文件走结构化模式，目录走 JS 扫描
const stat = fs.statSync(distDir);
if (stat.isFile() && distDir.endsWith('.json')) { injectJson(distDir); return; }
if (!stat.isDirectory()) { console.error('❌ 目标须为 JSON 文件或 dist 目录'); process.exit(2); }

// JS 字符串字面量反转义（lit → 原始文本，用于与映射表按原文精确匹配）
const unescapeJs = (lit) => lit.replace(/\\(.)/g, (_, c) => ({ n: '\n', t: '\t', r: '\r' }[c] ?? c));
// 输出统一双引号风格字面量
const toDqLiteral = (s) => `"${s.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n').replace(/\r/g, '\\r').replace(/\t/g, '\\t')}"`;

// 标识符形态的字面量不可能含转义序列——含 \ 即自然语言串
const isIdentLike = (lit) => !lit.includes('\\') && IDENT.test(lit);

const DISPLAY_PROPS = ['displayName', 'description', 'placeholder', 'hint', 'label'];
// dist 形态实测（2.39.6 tsc 可读产物）: displayName: 'JavaScript' —— 冒号后带空格 + 单引号；
// 兼容 minified 双引号形态（prop:"X"）。捕获组: 1=属性名+冒号+空格 2=整段引号串 3=双引号内容 4=单引号内容
function makeRegex(prop) {
  return new RegExp(`(${prop}: *)("((?:[^"\\\\]|\\\\.)*)"|'((?:[^'\\\\]|\\\\.)*)')`, 'g');
}
const propRegexes = [...DISPLAY_PROPS, 'action'].map((p) => makeRegex(p));
// name 单独：值非标识符形态才替换（action 亦然，在 tryReplace 外统一走标识符保护）
const nameRegex = makeRegex('name');

function replaceInSource(src) {
  let count = 0;
  const hitLocal = new Set();
  let out = src;
  const tryReplace = (lit, propHead, m) => {
    const en = unescapeJs(lit);
    if (isIdentLike(lit) && !/\s/.test(en)) return m; // 标识符形态保护（name/action 行为值）
    const zh = zhMap[en];
    if (zh === undefined) return m;
    count++;
    hitLocal.add(en);
    return `${propHead}${toDqLiteral(zh)}`;
  };
  for (const re of propRegexes) {
    out = out.replace(re, (m, propHead, whole, dq, sq) =>
      tryReplace(dq !== undefined ? dq : sq, propHead, m));
  }
  out = out.replace(nameRegex, (m, propHead, whole, dq, sq) => tryReplace(dq !== undefined ? dq : sq, propHead, m));
  return [out, count, hitLocal];
}

// 收集 JS 文件（🔴 排除 *.ee.* 专有文件，见文件头 EE 注释）
const jsFiles = [];
(function walk(d) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name);
    if (e.isDirectory()) walk(p);
    else if (e.name.endsWith('.js') && !e.name.includes(EE_FILE_MARK)) jsFiles.push(p);
  }
})(distDir);
console.log(`扫描 ${jsFiles.length} 个 JS 文件`);

let totalHits = 0, changedFiles = 0, rolledBack = 0, checked = 0, baselineSkipped = 0;
// node --check 按扩展名判定模块格式：dist 为 ESM，须用 .mjs 后缀（.js 会被按 CJS 解析全挂）
function checkPasses(content, tag) {
  const tmp = path.join('/tmp', `injcheck-${process.pid}-${tag}.mjs`);
  fs.writeFileSync(tmp, content);
  try { execFileSync(process.execPath, ['--check', tmp], { stdio: 'pipe' }); return true; }
  catch { return false; }
  finally { fs.unlinkSync(tmp); }
}
for (const f of jsFiles) {
  const src = fs.readFileSync(f, 'utf8');
  const [out, count, hitLocal] = replaceInSource(src);
  if (!count) continue;
  checked++;
  if (checkPasses(out, 'out')) {
    fs.writeFileSync(f, out);
    totalHits += count; changedFiles++;
    for (const en of hitLocal) hitEn.add(en);
  } else if (checkPasses(src, 'src')) {
    // 原文能过、替换后不能过 = 真·语法坏
    rolledBack++;
    console.error(`  ⚠️ 替换致语法坏已回滚: ${path.relative(distDir, f)}`);
  } else {
    // 原文本身就过不了 ESM check（格式判定限制），放行
    fs.writeFileSync(f, out);
    totalHits += count; changedFiles++; baselineSkipped++;
    for (const en of hitLocal) hitEn.add(en);
  }
  if (checked % 500 === 0) console.log(`  进度 ${checked}, 命中 ${totalHits}`);
}

console.log(`✅ 注入完成: ${totalHits} 处替换 / ${changedFiles} 文件变更 / 回滚 ${rolledBack} / 基线放行 ${baselineSkipped}`);
console.log(`   映射表利用率: ${hitEn.size}/${entries.length} (${Math.round(hitEn.size * 100 / entries.length)}%) 条实际生效`);
if (rolledBack > 0) process.exit(1);
