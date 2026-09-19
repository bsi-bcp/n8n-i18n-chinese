#!/usr/bin/env node
// 全本词典安全扫描（2026-09-19 评审 D-E3-5）：translate.js 的 isSuspiciousTranslation 只覆盖
// 机器翻译单条路径，人工补译/手改 zh-CN.json 零校验。本脚本对整本词典独立扫描，发版前跑：
//   node script/scan-zh-dict.js languages/zh-CN.json [--strict]
// HIGH 命中退出码 1（阻断发版）；WARN 仅报告（--strict 时也阻断）。
// 口径与 translate.js 对齐：危险模式/新增 URL 以英文基线（script/en.json）为对照——
// 源文本合法包含的标签/URL/表达式示例不算命中。linked-message 引用对「en 基座 ∪ zh」联合判定。
'use strict';
const fs = require('fs');

const file = process.argv[2];
const strict = process.argv.includes('--strict');
const enFile = process.argv.includes('--en') ? process.argv[process.argv.indexOf('--en') + 1] : 'script/en.json';
if (!file || !fs.existsSync(file)) {
  console.error(`usage: node ${process.argv[1]} <zh-CN.json> [--en script/en.json] [--strict]`);
  process.exit(2);
}

// D-E3-7：白名单 = 静态最小集 ∪ 英文基线出现过的主机（动态收集，避免预防性过宽）
const STATIC_HOSTS = ['docs.n8n.io', 'n8n.io', 'community.n8n.io', 'github.com',
  'githubusercontent.com', 'raw.githubusercontent.com'];
const ALLOWED_URL_HOSTS = new Set(STATIC_HOSTS);

function flatten(obj, prefix, out) {
  for (const [k, v] of Object.entries(obj)) {
    if (typeof v === 'string') out.set(prefix ? `${prefix}.${k}` : k, v);
    else if (v && typeof v === 'object') flatten(v, prefix ? `${prefix}.${k}` : k, out);
  }
  return out;
}

const zh = flatten(JSON.parse(fs.readFileSync(file, 'utf8')), '', new Map());
let en = null, enMissing = false;
if (fs.existsSync(enFile)) {
  en = flatten(JSON.parse(fs.readFileSync(enFile, 'utf8')), '', new Map());
  for (const v of en.values()) {
    for (const m of v.matchAll(/https?:\/\/[^\s"'<>\])）】]+/gi)) {
      try { ALLOWED_URL_HOSTS.add(new URL(m[0]).hostname); } catch {}
    }
  }
} else {
  enMissing = true;
}

const HIGH_PATTERNS = [
  [/<script[\s>]|<iframe[\s>]|<svg[\s>]|onerror\s*=|onclick\s*=|onload\s*=/i, '脚本/事件注入标签（源文本无）'],
  [/javascript\s*:/i, 'javascript: 伪协议（源文本无）'],
  [/data\s*:\s*(text|application|image)\//i, 'data: URI（源文本无）'],
  [/限制[:：]\s*仅输出|不包含任何额外信息|作为\s*(一个)?\s*AI|as an AI\b/i, 'LLM 指令回显'],
];

let high = 0, warn = 0;
const report = [];
for (const [key, val] of zh) {
  const src = en ? en.get(key) : undefined;
  const srcHas = (re) => typeof src === 'string' && re.test(src);
  const flag = (level, why) => {
    (level === 'HIGH' ? high++ : warn++);
    report.push(`${level}  ${key}\n      ${why}\n      值: ${val.slice(0, 140).replace(/\n/g, '\\n')}`);
  };

  for (const [re, why] of HIGH_PATTERNS) {
    if (re.test(val) && !srcHas(re)) flag('HIGH', why);
  }
  if (/\{\{/.test(val) && !(typeof src === 'string' && src.includes('{{'))) {
    flag('HIGH', 'vue 模板插值 {{}}（英文源文本无此写法）');
  }

  for (const m of val.matchAll(/https?:\/\/[^\s"'<>\])）】]+/gi)) {
    if (typeof src === 'string' && src.includes(m[0])) continue; // 源文本自带的 URL = 合法
    let host;
    try { host = new URL(m[0]).hostname; } catch { flag('HIGH', `URL 无法解析: ${m[0]}`); continue; }
    if (![...ALLOWED_URL_HOSTS].some((h) => host === h || host.endsWith(`.${h}`))) {
      flag('WARN', `新增 URL 主机不在白名单: ${m[0]}`);
    }
  }

  // linked-message 引用对「en 基座 ∪ zh」联合判定（vue-i18n 回退机制：zh 缺键回退 en）。
  // D-E3-7 复核修正：区分裸形式 @:key 与修饰符形式 @.modifier:key（取冒号后真实键名）
  // 2026-09-19 分级修正：en 基线中同一键的引用同样悬空 = 上游固有结构（2.39.8 实证：
  // settings.usageAndPlan.error=@:_reusableBaseText.error 而 _reusableBaseText 无 error 键），
  // zh 忠实镜像上游不构成污染，降级 WARN；仅「en 引用完好而 zh 悬空」才是 HIGH。
  for (const m of val.matchAll(/@(?::([\w.]+)|[.\w]+:([\w.]+))/g)) {
    const target = m[1] || m[2];
    if (!zh.has(target) && !(en && en.has(target))) {
      const enSame = en && en.has(key) && en.get(key) === val;
      flag(enSame ? 'WARN' : 'HIGH', `linked-message 引用在 en/zh 词典均不存在: ${target}${enSame ? '（en 基线同值悬空，上游固有结构）' : ''}`);
    }
  }
}

if (enMissing) console.log('⚠️ 英文基线 script/en.json 不存在，源对照类检查降级为全量模式');
if (report.length) console.log(report.join('\n'));
console.log(`\n扫描完成: ${zh.size} 词条, HIGH=${high}, WARN=${warn}${strict ? ' (--strict)' : ''}`);
if (high > 0 || (strict && warn > 0)) {
  console.error('存在阻断级问题');
  process.exit(1);
}
