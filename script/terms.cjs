// 术语表单一事实源（2026-09-20 评审 E3/E5 沉淀）：translate.js 与 translate-params.cjs
// 双引擎共用，杜绝双份手抄漂移。修订须经终审（2.39.7 agent/credential 先例：
// 全库定量 → 术语统一表 → 批量回改），不得顺手改。
'use strict';

// 强约束术语（en=zh；分号分隔）。语境注记条目：翻译器按注记判断。
const TERMS = [
  'agent=智能体',
  'credential=凭据',
  'workflow=工作流',
  'plan(定价)=套餐',
  'you/your=您',
  'previous node=上游节点',
  'redact=脱敏',
  'published=已发布',
  'node=节点',
  'execution=执行',
  'trigger=触发器',
  'expression=表达式',
  'items=数据项',
  // ── AI/LLM 域（2026-09-20 终审：以 zh-CN.json 既有用法 + 向量存储族多数派为准）──
  'embedding=嵌入',
  'vector store=向量存储',
  'rerank=重排序',
  'reranker=重排序器',
  'chunk(名词/文档块)=块；chunking/切分过程=分块',
  'session(AI 对话)=会话；webinar/会议场次=场次',
  'memory(AI 对话记忆节点)=记忆；硬件/RAM/性能语境=内存',
  'prompt(名词)=提示词；prompt(动词，如 prompt the user)=提示',
  'system prompt=系统提示词',
].join('; ');

// 语境化告警规则（en 词根 → 禁用译法）：命中仅记日志告警人工复核，不阻断（避免误杀合法语境）。
const BANNED_IN_CONTEXT = [
  { en: /rerank/i, zh: '重新排序', why: 'rerank 统一译「重排序」' },
  { en: /session/i, zh: '场次', why: 'session 的 AI 对话语境统一译「会话」（webinar/demio 场次除外，告警人工判断）' },
  { en: /(chat\s*memory|motorhead|buffer memory|simple memory)/i, zh: '内存', why: 'AI 对话记忆节点统一译「记忆」' },
];

module.exports = { TERMS, BANNED_IN_CONTEXT };
