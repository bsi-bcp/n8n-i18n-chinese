#!/usr/bin/env node
// 语义化硬编码标签修复（2026-09-19 评审后鲁棒化方案，取代 fix__hardcoded_labels.patch 的 git apply）：
// git apply 依赖上下文精确匹配，上游模块定义重构（2.40 对象字面量→defineFrontendModule）即失效；
// 本脚本按精确文本做定向替换（对 2.39 对象字面量与 2.40 defineFrontendModule 两种结构通吃），
// 支持 --check 干跑（watcher 门禁用：只验证可应用性，不写盘）。
// 用法: node script/apply-hardcoded-labels.mjs <n8n源码目录> [--check]
'use strict';
const fs = require('fs');
const path = require('path');

const root = process.argv[2];
const check = process.argv.includes('--check');
if (!root) {
  console.error('usage: node apply-hardcoded-labels.mjs <n8n源码目录> [--check]');
  process.exit(2);
}

// 替换登记表：[文件, [查找文本, 替换文本, 说明]]。查找文本为逐字精确匹配（含制表符缩进）。
// 新增修复项时在此登记。替换文本缩进需与查找文本一致。
const T = (s) => s.replace(/\\t/g, '\t');
const RULES = [
  // ── 便签默认模板 + 底部提示（2026-09-19 用户报告画布新建便签全英文）──
  // 模板在 StickyNote 节点参数 default（经 types payload 直出）；提示在 design-system
  // 独立 locale 体系（不走主 @n8n/i18n 词典，管线结构性不可见）
  ['packages/nodes-base/nodes/StickyNote/StickyNote.node.ts', [
    [T("\"## I'm a note \\n**Double click** to edit me. [Guide](https://docs.n8n.io/workflows/components/sticky-notes/)\""),
     T("\"## 我是便签 \\n**双击**编辑我。[指南](https://docs.n8n.io/workflows/components/sticky-notes/)\""),
     '便签默认模板', 1],
  ], 1],
  ['packages/frontend/@n8n/design-system/src/locale/lang/en.ts', [
    [T("'You can style with <a href=\"https://docs.n8n.io/workflows/components/sticky-notes/\" target=\"_blank\">Markdown</a>'"),
     T("'可用 <a href=\"https://docs.n8n.io/workflows/components/sticky-notes/\" target=\"_blank\">Markdown</a> 美化便签'"),
     '便签底部 Markdown 提示', 1],
  ], 1],
  // ── settings/侧栏模块描述符族（2026-09-19 用户报告：设置菜单 AI Assistant/Chat 未翻译）──
  // module.descriptor.ts 的 name 在应用启动时静态求值（dataTable 同坑），直接换中文字面量最稳
  // （术语决策 2026-09-19：AI Assistant→AI 助手、Chat→聊天、OpenTelemetry 保留英文）
  ['packages/frontend/editor-ui/src/features/ai/instanceAi/module.descriptor.ts', [
    [[[// 2.39 name='AI Assistant' / 2.40.3 起上游改名 'n8n Assistant'——版式变体，任一版本恰命中其一
      T("\tid: 'instance-ai',\n\tname: 'AI Assistant',\n\tdescription: 'Chat with your n8n instance.',"),
      T("\tid: 'instance-ai',\n\tname: 'AI 助手',\n\tdescription: '与您的 n8n 实例对话',")],
     [T("\tid: 'instance-ai',\n\tname: 'n8n Assistant',\n\tdescription: 'Chat with your n8n instance.',"),
      T("\tid: 'instance-ai',\n\tname: 'AI 助手',\n\tdescription: '与您的 n8n 实例对话',")]],
     'AI Assistant 模块名+描述（2.39/2.40 双版式）', 1],
    // settingsPages label 启动时求值冻结英文（dataTable 同坑，YTJ1 实测侧栏 'AI Assistant'）——getter 延迟求值
    [T("\t\t\tlabel: i18n.baseText('settings.n8nAgent'),"),
     T("\t\t\tget label() {\n\t\t\t\treturn i18n.baseText('settings.n8nAgent');\n\t\t\t},"),
     'AI Assistant settingsPages label 懒求值', 1],
  ], 2],
  ['packages/frontend/editor-ui/src/features/ai/chatHub/module.descriptor.ts', [
    [T("\tid: 'chat-hub',\n\tname: 'Chat',\n\tdescription: 'Chat with LLM models or your n8n AI agents.',"),
     T("\tid: 'chat-hub',\n\tname: '聊天',\n\tdescription: '与 LLM 模型或您的 n8n 智能体对话',"),
     'Chat 模块名+描述', 1],
    [T("\t\t\tlabel: i18n.baseText('settings.chatHub'),"),
     T("\t\t\tget label() {\n\t\t\t\treturn i18n.baseText('settings.chatHub');\n\t\t\t},"),
     'Chat settingsPages label 懒求值', 1],
  ], 2],
  ['packages/frontend/editor-ui/src/features/agents/module.descriptor.ts', [
    [T("\tid: 'agents',\n\tname: 'Agents',\n\tdescription: 'Build and manage AI agents',"),
     T("\tid: 'agents',\n\tname: '智能体',\n\tdescription: '构建和管理 AI 智能体',"),
     'Agents 模块名+描述', 1],
    [T("label: 'Agents',"), T("label: '智能体',"), 'Agents settingsPages 硬编码 label', 2],
  ], 3],
  ['packages/frontend/editor-ui/src/features/core/dataTable/module.descriptor.ts', [
    [T("\tname: 'Data Table',\n\tdescription: 'Manage and store data efficiently with the Data Table module.',"),
     T("\tname: '数据表',\n\tdescription: '用数据表模块高效管理与存储数据',"),
     'Data Table 模块名+描述', 1],
  ], 1],
  // 2.40.3 起 insights 迁 packages/modules/insights/frontend/src/insights.module.ts（内容不变只搬家）——路径候选
  [['packages/frontend/editor-ui/src/features/execution/insights/module.descriptor.ts',
    'packages/modules/insights/frontend/src/insights.module.ts'], [
    [T("\tname: 'Insights',\n\tdescription: 'Provides insights and analytics features for projects.',"),
     T("\tname: '洞察',\n\tdescription: '为项目提供洞察与分析功能',"),
     'Insights 模块名+描述', 1],
  ], 1],
  ['packages/frontend/editor-ui/src/features/workflow-reviews/module.descriptor.ts', [
    [T("\tname: 'Workflow Reviews',\n\tdescription: 'Cross-project workflow review inbox.',"),
     T("\tname: '工作流评审',\n\tdescription: '跨项目工作流评审收件箱',"),
     'Workflow Reviews 模块名+描述', 1],
  ], 1],
  // 🔴 EE 专有文件规则已移除（2026-09-21 专家评审实锤）：promotions.ee/sourceControl.ee
  //    属上游 EE 专有源码（LICENSE.md 明文 *.ee.* 不适用 SUL），修改它们并随公开 dist
  //    分发构成合规违规（与 E5-P1-A 同类，当时只堵了 params 注入端、漏了本脚本前端端）。
  //    相关面板标签保持英文原文。防回潜：script/check-ee-gate.cjs --diff 拦截任何
  //    触碰 .ee. / .ee 目录段的新规则。
  ['packages/frontend/editor-ui/src/features/ai/mcpAccess/module.descriptor.ts', [
    [T("\tname: 'MCP Server',\n\tdescription: 'Access your n8n instance through MCP clients',"),
     T("\tname: 'MCP 服务器',\n\tdescription: '通过 MCP 客户端访问您的 n8n 实例',"),
     'MCP Server 模块名+描述', 1],
    [T("\t\t\tlabel: i18n.baseText('settings.mcp'),"),
     T("\t\t\tget label() {\n\t\t\t\treturn i18n.baseText('settings.mcp');\n\t\t\t},"),
     'MCP settingsPages label 懒求值', 1],
  ], 2],
  ['packages/frontend/editor-ui/src/features/core/dataTable/module.descriptor.ts', [
    [T("label: i18n.baseText('dataTable.dataTables'),"),
     T("get label() {\n\t\t\t\t\treturn i18n.baseText('dataTable.dataTables');\n\t\t\t\t},"),
     'projectTabs label 懒求值', 2],
  ], 2],
  ['packages/frontend/editor-ui/src/features/core/dataTable/module.descriptor.ts', [
    [T("displayName: 'Data Table',"),
     T("get displayName() {\n\t\t\t\treturn i18n.baseText('settings.mcp.oAuthClients.resource.dataTable');\n\t\t\t},"),
     'resources displayName 懒求值'],
  ], 1],
];

let failed = 0;
const results = [];
// 路径候选：rel 可为 string 或 string[]（上游搬家场景，如 2.40.3 insights 迁包）——
// 取第一个存在者；全部不存在才算失败。版式变体：find 可为 [find, sub][]（上游改名场景，
// 如 2.40.3 'AI Assistant'→'n8n Assistant'）——跨变体合计命中数须等于 expectN。
for (const [relOrList, rules, expectTotal] of RULES) {
  const candidates = Array.isArray(relOrList) ? relOrList : [relOrList];
  const hit = candidates.map((rel) => ({ rel, abs: path.join(root, rel) })).find((c) => fs.existsSync(c.abs));
  if (!hit) {
    results.push(`❌ ${candidates.join(' / ')}: 候选路径均不存在`);
    failed++;
    continue;
  }
  const rel = hit.rel;
  const expectSum = rules.reduce((a, r) => a + (r[3] || 1), 0);
  let src = check ? null : fs.readFileSync(hit.abs, 'utf8');
  const original = fs.readFileSync(hit.abs, 'utf8');
  let applied = 0;
  for (const rule of rules) {
    const [findV, sub, label, expectN = 1] = rule;
    const pairs = Array.isArray(findV) && Array.isArray(findV[0]) ? findV : [[findV, sub]];
    let hits = 0;
    for (const [f] of pairs) hits += original.split(f).length - 1;
    if (hits !== expectN) {
      results.push(`❌ ${rel}: 「${label}」命中 ${hits} 处（预期 ${expectN}）——上游结构变化，需人工核对`);
      failed++;
      continue;
    }
    if (!check) for (const [f, s] of pairs) src = src.split(f).join(s);
    applied += hits;
  }
  if (!check && applied > 0) fs.writeFileSync(hit.abs, src);
  results.push(`${check ? '🔎' : '✅'} ${rel}: ${applied} 处${check ? '可应用' : '已应用'}（预期合计 ${expectSum}）`);
  if (applied !== expectSum) failed++;
  void expectTotal;
}

console.log(results.join('\n'));
if (failed > 0) {
  console.error(`\n${failed} 个文件存在失败项${check ? '（--check 干跑）' : ''}`);
  process.exit(1);
}
console.log(check ? '\n--check 全部可应用' : '\n全部应用完成');
