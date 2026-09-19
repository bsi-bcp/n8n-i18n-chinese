#!/usr/bin/env node
// M2 参数串批量翻译器（2026-09-19 立项 M2）
// 用法: node translate-params.mjs <params-unique.json> <输出 params-zh-map.json> [topN]
// 从 M1 去重清单按频次降序取 topN，DeepSeek 批量翻译，术语表强约束，产物 {en: zh} 映射。
const fs = require('fs');

const CREDS = '/Users/paul/Documents/GitHub/00-docs/bcp-credentials.json';
const [inFile, outFile, topNStr] = [process.argv[2], process.argv[3], process.argv[4]];
if (!inFile || !outFile) { console.error('usage: translate-params.mjs <unique.json> <out.json> [topN]'); process.exit(2); }

const creds = JSON.parse(fs.readFileSync(CREDS, 'utf8'));
const ds = creds.llm_api_key_list.llm_api_key.deepseek;
const API_KEY = ds.deepseek_api_token;
const API_BASE = 'https://api.deepseek.com';
const MODEL = 'deepseek-chat';

const unique = JSON.parse(fs.readFileSync(inFile, 'utf8'));
// 增量模式：outFile 已存在时加载为基底，只译未译条目（中断重跑自动续）
let result = {};
if (fs.existsSync(outFile)) {
  result = JSON.parse(fs.readFileSync(outFile, 'utf8'));
  console.log(`增量模式: 已有 ${Object.keys(result).length} 条, 跳过已译`);
}
let items = Object.entries(unique).sort((a, b) => b[1].count - a[1].count);
const topN = topNStr ? parseInt(topNStr) : items.length;
items = items.slice(0, topN).filter(([en]) => !(en in result)).map(([en, meta]) => ({ en, count: meta.count, nodes: meta.nodes }));
console.log(`待译 ${items.length} 条`);

// 术语表（CHANGELOG 2.39.7 v2 修订口径）
const TERMS = `agent=智能体; credential=凭据; workflow=工作流; plan(定价)=套餐; you/your=您; previous node=上游节点; redact=脱敏; published=已发布; node=节点; execution=执行; trigger=触发器; expression=表达式; items=数据项`;

const SYSTEM = `你是 n8n 节点参数界面的简体中文翻译器。把用户给出的英文参数串（界面标签/选项/描述/占位符）翻译成简体中文。
规则：
1. 术语强制：${TERMS}
2. 保留 HTML 标签（<code>/<a href>/<br> 等）与 {placeholder} 占位符原样；专有名词保留英文（n8n/MCP/OpenTelemetry/HTTP/JSON/JavaScript/Python/Webhook/ID/URL）
3. 简洁口语化，符合中文软件界面习惯；句末不加句号（疑问句保留？）
4. 输出：一个 JSON 对象，键为每条的 "i" 序号（字符串形式，如 "0"、"1"），值为中文译文；必须覆盖输入的每一条，不得增删键
5. 用户消息为 JSON 数组，每元素 {"i": 序号, "en": 原文, "ctx": 常见节点名}`;

const isBad = (en, zh) =>
  typeof zh !== 'string' || !zh.trim() ||
  (/<script[\s>]|javascript:/i.test(zh) && !/<script[\s>]|javascript:/i.test(en)) ||
  /限制[:：]\s*仅输出|作为\s*(一个)?\s*AI|as an AI\b/i.test(zh);

async function translateBatch(batch, attempt = 1) {
  // 发送与响应查找共用同一份带 i 的数组（🔴 曾因 batch 元素无 i 字段致 obj[String(b.i)] 恒 miss，
  // 全靠 LLM 自觉用原文当键兜底——prompt 规则矛盾下键风格不稳，两批 30 条全灭即此因）
  const payloadItems = batch.map((b, i) => ({ i, en: b.en, ctx: (b.nodes || [])[0] || '' }));
  const payload = {
    model: MODEL, temperature: 0.3, response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: SYSTEM },
      { role: 'user', content: JSON.stringify(payloadItems) },
    ],
  };
  const res = await fetch(`${API_BASE}/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${API_KEY}` },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${(await res.text()).slice(0, 120)}`);
  const data = await res.json();
  let obj;
  try { obj = JSON.parse(data.choices[0].message.content); } catch { throw new Error('响应非 JSON'); }
  const out = {};
  const missed = [];
  for (const b of payloadItems) {
    const zh = obj[String(b.i)] ?? obj[b.en];
    if (isBad(b.en, zh)) {
      if (process.env.PARAM_DEBUG) console.log(`  [debug] i=${b.i} zh=${JSON.stringify(zh)?.slice(0, 120)} en=${b.en.slice(0, 60)}`);
      missed.push(b); continue;
    }
    out[b.en] = zh;
  }
  // 批级补译：响应缺键/被拦的条目单独再问一轮（LLM 间歇缺键实测会救回；attempt 上限防循环）
  if (missed.length && attempt < 3) {
    console.log(`  ↻ ${missed.length}/${batch.length} 条缺译，补译第 ${attempt} 轮`);
    try { Object.assign(out, await translateBatch(missed, attempt + 1)); }
    catch (e) { console.log(`  补译失败: ${e.message.slice(0, 60)}`); }
  }
  if (missed.length && attempt >= 3) console.log(`  ⚠️ ${missed.length} 条最终被安全校验跳过`);
  return out;
}

(async () => {
  const BATCH = 15;
  let done = 0;
  const t0 = Date.now();
  for (let i = 0; i < items.length; i += BATCH) {
    const batch = items.slice(i, i + BATCH);
    let retries = 0;
    while (retries < 3) {
      try { Object.assign(result, await translateBatch(batch)); break; }
      catch (e) { retries++; console.log(`  批 ${i}-${i + batch.length} 重试 ${retries}: ${e.message.slice(0, 80)}`); if (retries >= 3) console.log(`  ❌ 放弃 ${batch.length} 条`); else await new Promise((r) => setTimeout(r, 3000 * retries)); }
    }
    done += batch.length;
    if (done % 300 === 0 || done >= items.length) {
      // 断点续写：每 300 条落盘，中断不丢进度
      fs.writeFileSync(outFile, JSON.stringify(result, null, 2));
      const rate = done / ((Date.now() - t0) / 60000);
      console.log(`进度 ${done}/${items.length}, 已译 ${Object.keys(result).length}, ${rate.toFixed(0)} 条/分, 预计剩余 ${Math.ceil((items.length - done) / rate)} 分`);
    }
  }
  fs.writeFileSync(outFile, JSON.stringify(result, null, 2));
  console.log(`✅ 完成: ${Object.keys(result).length} 条 → ${outFile}`);
})();
