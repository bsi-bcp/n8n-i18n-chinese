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
  // ── settings/侧栏模块描述符族（2026-09-19 用户报告：设置菜单 AI Assistant/Chat 未翻译）──
  // module.descriptor.ts 的 name 在应用启动时静态求值（dataTable 同坑），直接换中文字面量最稳
  // （术语决策 2026-09-19：AI Assistant→AI 助手、Chat→聊天、OpenTelemetry 保留英文）
  ['packages/frontend/editor-ui/src/features/ai/instanceAi/module.descriptor.ts', [
    [T("\tid: 'instance-ai',\n\tname: 'AI Assistant',\n\tdescription: 'Chat with your n8n instance.',"),
     T("\tid: 'instance-ai',\n\tname: 'AI 助手',\n\tdescription: '与您的 n8n 实例对话',"),
     'AI Assistant 模块名+描述', 1],
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
  ['packages/frontend/editor-ui/src/features/execution/insights/module.descriptor.ts', [
    [T("\tname: 'Insights',\n\tdescription: 'Provides insights and analytics features for projects.',"),
     T("\tname: '洞察',\n\tdescription: '为项目提供洞察与分析功能',"),
     'Insights 模块名+描述', 1],
  ], 1],
  ['packages/frontend/editor-ui/src/features/workflow-reviews/module.descriptor.ts', [
    [T("\tname: 'Workflow Reviews',\n\tdescription: 'Cross-project workflow review inbox.',"),
     T("\tname: '工作流评审',\n\tdescription: '跨项目工作流评审收件箱',"),
     'Workflow Reviews 模块名+描述', 1],
  ], 1],
  ['packages/frontend/editor-ui/src/features/integrations/promotions.ee/module.descriptor.ts', [
    [T("\tname: 'Promotions',\n\tdescription: 'Promote workflow changes between environments',"),
     T("\tname: '晋级',\n\tdescription: '在环境间晋级工作流变更',"),
     'Promotions 模块名+描述', 1],
  ], 1],
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
  ['packages/frontend/editor-ui/src/features/integrations/sourceControl.ee/components/SourceControlPullModal.vue', [
    [T("label: 'Workflows',"), T("label: i18n.baseText('generic.workflows'),"), 'Workflows'],
    [T("label: 'Credentials',"), T("label: i18n.baseText('generic.credentials'),"), 'Credentials'],
    [T("label: 'Data Tables',"), T("label: i18n.baseText('workflows.dependencies.type.dataTables'),"), 'Data Tables'],
  ], 3],
  ['packages/frontend/editor-ui/src/features/integrations/sourceControl.ee/components/SourceControlPushModal.vue', [
    [T("label: 'Workflows',"), T("label: i18n.baseText('generic.workflows'),"), 'Workflows'],
    [T("label: 'Credentials',"), T("label: i18n.baseText('generic.credentials'),"), 'Credentials'],
    [T("label: 'Data Tables',"), T("label: i18n.baseText('workflows.dependencies.type.dataTables'),"), 'Data Tables'],
  ], 3],
];

let failed = 0;
const results = [];
for (const [rel, rules, expectTotal] of RULES) {
  const abs = path.join(root, rel);
  if (!fs.existsSync(abs)) {
    results.push(`❌ ${rel}: 文件不存在`);
    failed++;
    continue;
  }
  const expectSum = rules.reduce((a, r) => a + (r[3] || 1), 0);
  let src = check ? null : fs.readFileSync(abs, 'utf8');
  const original = fs.readFileSync(abs, 'utf8');
  let applied = 0;
  for (const [find, sub, label, expectN = 1] of rules) {
    const hits = original.split(find).length - 1;
    if (hits !== expectN) {
      results.push(`❌ ${rel}: 「${label}」命中 ${hits} 处（预期 ${expectN}）——上游结构变化，需人工核对`);
      failed++;
      continue;
    }
    if (!check) src = src.split(find).join(sub);
    applied += hits;
  }
  if (!check && applied > 0) fs.writeFileSync(abs, src);
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
