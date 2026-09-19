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
