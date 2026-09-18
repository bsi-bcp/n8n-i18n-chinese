#!/usr/bin/env node
/**
 * 从 n8n 源码静态提取节点级描述 → script/en-nodes.json（headers 扁平段）
 *
 * 用途：节点面板第二层条目（editor-ui NodeItem.vue）对每个节点做
 *   i18n.headerText({ key: `headers.<短名>.description`, fallback: 原文 })
 * 词典缺 key 时回退英文——本脚本产出 `headers.<节点name>.description` key 补上汉化。
 * 刻意不产出 displayName key：节点名/画布标题保持英文（i18n.nodeTypeName 同走 headers 查表）。
 *
 * 实现：TypeScript 编译器 API 解析 .node.ts 源文件中类属性 description 的对象字面量，
 * 只取 name / description 两个字符串字面量。无需构建 n8n、无原生依赖（规避 isolated-vm）。
 * 版本化节点（v1/v2 子目录）按目录深度去重，浅者（根注册类）胜出。
 *
 * 用法：
 *   NODE_PATH=<typescript安装目录>/node_modules node script/extract-node-headers.js <n8n源码根目录>
 * 源码根目录须与目标发版 tag 一致（git worktree add <dir> "n8n@<ver>" 后传入 worktree 路径）。
 * 产物为扁平 key（与 languages/zh-CN.json 同构），translate.js 会自动 merge 增翻。
 */
const fs = require('fs');
const path = require('path');

let ts;
try {
    ts = require('typescript');
} catch {
    console.error('找不到 typescript，请先隔离安装并以 NODE_PATH 指向：');
    console.error('  mkdir -p /tmp/n8n-ts-extract && cd /tmp/n8n-ts-extract && npm init -y && npm i typescript@5');
    process.exit(1);
}

const N8N_ROOT = process.argv[2];
if (!N8N_ROOT || !fs.existsSync(path.join(N8N_ROOT, 'package.json'))) {
    console.error('用法: node script/extract-node-headers.js <n8n源码根目录>');
    process.exit(1);
}
const version = JSON.parse(fs.readFileSync(path.join(N8N_ROOT, 'package.json'), 'utf8')).version;
console.log('n8n 源码版本:', version);

// 面板节点只来自这两个包（langchain 包目录叫 @n8n/nodes-langchain，
// 节点源码 name 字段是裸名（如 'agent'），运行时全名 = 包名.name → '@n8n/n8n-nodes-langchain.agent'）
const SOURCES = [
    { dir: 'packages/nodes-base/nodes', prefix: '' },
    { dir: 'packages/@n8n/nodes-langchain/nodes', prefix: '@n8n/n8n-nodes-langchain.' },
];

function listNodeTsFiles(dir) {
    const out = [];
    const walk = (d) => {
        for (const e of fs.readdirSync(d, { withFileTypes: true })) {
            const p = path.join(d, e.name);
            if (e.isDirectory()) walk(p);
            else if (e.isFile() && e.name.endsWith('.node.ts')) out.push(p);
        }
    };
    if (fs.existsSync(dir)) walk(dir);
    return out;
}

// 剥掉 as/括号/非空断言等包装，取到真正的对象字面量
function unwrap(node) {
    while (node && (ts.isAsExpression(node) || ts.isParenthesizedExpression(node)
        || ts.isNonNullExpression(node) || ts.isTypeAssertionExpression(node))) {
        node = node.expression;
    }
    return node;
}

// 从对象字面量取指定字段的纯字符串值（字符串字面量或无插值模板串）；非纯字符串返回 undefined
function getStringLiteral(objLiteral, field) {
    for (const prop of objLiteral.properties) {
        if (!ts.isPropertyAssignment(prop)) continue;
        const nameNode = prop.name;
        const fieldName = (ts.isIdentifier(nameNode) || ts.isStringLiteral(nameNode)) ? nameNode.text : undefined;
        if (fieldName !== field) continue;
        const init = unwrap(prop.initializer);
        if (ts.isStringLiteral(init) || ts.isNoSubstitutionTemplateLiteral(init)) return init.text;
        return undefined; // 字段存在但非纯字符串字面量（表达式/插值模板），宁可放弃也不给错值
    }
    return undefined;
}

const entries = new Map(); // name -> { description, file, depth }
let filesScanned = 0, descLiterals = 0;
const skipped = [];
const conflicts = [];
let fallbackCount = 0;
const actionTitles = new Map(); // 英文动作短语 -> 首个来源节点（全局去重；patch 按 headers.actionTitles.<title> 查表）

// lodash startCase 近似实现（仅用于组合标题；不精确时 patch 端回退英文，无害）
function startCase(s) {
    return (String(s).match(/[A-Z]{2,}(?=[A-Z][a-z]|\b)|[A-Z]?[a-z]+|[A-Z]|\d+/g) || [])
        .map((w) => w[0].toUpperCase() + w.slice(1))
        .join(' ');
}

// 从对象字面量属性里取数组字面量（属性值限定）
function getArrayLiteral(objLiteral, field) {
    for (const prop of objLiteral.properties) {
        if (!ts.isPropertyAssignment(prop)) continue;
        const n = prop.name;
        const fieldName = (ts.isIdentifier(n) || ts.isStringLiteral(n)) ? n.text : undefined;
        if (fieldName === field && ts.isArrayLiteralExpression(unwrap(prop.initializer))) {
            return unwrap(prop.initializer);
        }
    }
    return undefined;
}

function putActionTitle(title, origin) {
    const t = title.trim();
    if (!t || t.length > 200) return;
    if (!actionTitles.has(t)) actionTitles.set(t, origin);
}

// 第三层操作面板（ActionItem.vue → useActionsGeneration.ts）标题提取。
// 规则对齐 useActionsGeneration：
//   operation/mode: title = option.action ?? startCase(option.name)
//   resource 型节点: title = operationOption.action ?? `${resource.name} ${startCase(op.name)}`
//   触发器 event 属性: 仅提取写了 action 的项（无 action 的走 onEvent i18n 模板，词典已有中文）
function extractActionTitles(obj, origin) {
    const propsNode = getArrayLiteral(obj, 'properties');
    if (!propsNode) return;
    for (const propEl of propsNode.elements) {
        if (!ts.isObjectLiteralExpression(propEl)) continue;
        const pname = (getStringLiteral(propEl, 'name') || '').toLowerCase();
        const pdisplay = (getStringLiteral(propEl, 'displayName') || '').toLowerCase();
        const isEvent = ['event', 'events', 'trigger on'].includes(pdisplay);
        if (!['operation', 'mode', 'resource'].includes(pname) && !isEvent) continue;
        const optionsNode = getArrayLiteral(propEl, 'options');
        if (!optionsNode) continue;

        const options = optionsNode.elements.filter((e) => ts.isObjectLiteralExpression(e));
        if (pname === 'resource') {
            // 资源 × 操作 组合标题
            const resources = options.map((o) => ({
                name: getStringLiteral(o, 'name'),
                value: getStringLiteral(o, 'value'),
            })).filter((r) => r.name && r.value && r.name !== 'Custom API Call');
            // 找兄弟 operation 属性
            for (const sib of propsNode.elements) {
                if (!ts.isObjectLiteralExpression(sib)) continue;
                if ((getStringLiteral(sib, 'name') || '').toLowerCase() !== 'operation') continue;
                const opsNode = getArrayLiteral(sib, 'options');
                if (!opsNode) continue;
                // 该 operation 属性的 displayOptions.show.resource 限定
                let limitTo = null; // null = 配全部资源
                const disp = sib.properties.find((p) => ts.isPropertyAssignment(p)
                    && (ts.isIdentifier(p.name) || ts.isStringLiteral(p.name)) && p.name.text === 'displayOptions');
                if (disp && ts.isObjectLiteralExpression(unwrap(disp.initializer))) {
                    const show = getArrayLiteralLike(unwrap(disp.initializer), 'show');
                    if (show) {
                        const resArr = getArrayLiteral(show, 'resource');
                        if (resArr) {
                            limitTo = resArr.elements
                                .filter((e) => ts.isStringLiteral(e)).map((e) => e.text);
                        }
                    }
                }
                for (const opOpt of opsNode.elements) {
                    if (!ts.isObjectLiteralExpression(opOpt)) continue;
                    const oname = getStringLiteral(opOpt, 'name');
                    const oaction = getStringLiteral(opOpt, 'action');
                    if (!oname || oname === 'Custom API Call') continue;
                    if (oaction) { putActionTitle(oaction, origin); continue; }
                    const targets = limitTo ?? resources.map((r) => r.value);
                    for (const rv of targets) {
                        const r = resources.find((x) => x.value === rv);
                        if (r) putActionTitle(`${r.name} ${startCase(oname)}`, origin);
                    }
                }
            }
        } else {
            for (const optEl of options) {
                const oname = getStringLiteral(optEl, 'name');
                const oaction = getStringLiteral(optEl, 'action');
                if (!oname || oname === 'Custom API Call' || ['*', '', ' '].includes(oname)) continue;
                if (isEvent && !oaction) continue; // 模板已覆盖
                putActionTitle(oaction ?? startCase(oname), origin);
            }
        }
    }
}

// displayOptions.show 这类"对象字面量属性"取值（getArrayLiteral 的对象版）
function getArrayLiteralLike(objLiteral, field) {
    for (const prop of objLiteral.properties) {
        if (!ts.isPropertyAssignment(prop)) continue;
        const n = prop.name;
        const fieldName = (ts.isIdentifier(n) || ts.isStringLiteral(n)) ? n.text : undefined;
        if (fieldName === field && ts.isObjectLiteralExpression(unwrap(prop.initializer))) {
            return unwrap(prop.initializer);
        }
    }
    return undefined;
}

function putEntry(name, description, file) {
    const depth = file.split(path.sep).length;
    const prev = entries.get(name);
    if (!prev) {
        entries.set(name, { description, file, depth });
    } else if (depth < prev.depth || (depth === prev.depth && file < prev.file)) {
        if (prev.description !== description) {
            conflicts.push(`${name}: ${path.relative(N8N_ROOT, prev.file)} vs ${path.relative(N8N_ROOT, file)}`);
        }
        entries.set(name, { description, file, depth });
    }
}

// 文件级回退：本文件没提到任何节点时，找含 displayName+name+description 的基础描述对象
// （覆盖 Slack/Agent 等 `...baseDescription` 展开、VersionedNodeType 构造注入、顶层 const 描述 等模式）
function fileFallback(file, sf, prefix) {
    let found = null;
    const walk = (node) => {
        if (found) return;
        if (ts.isObjectLiteralExpression(node)) {
            const displayName = getStringLiteral(node, 'displayName');
            const name = getStringLiteral(node, 'name');
            const description = getStringLiteral(node, 'description');
            if (displayName && name && description) {
                found = {
                    name: prefix && !name.startsWith('@') ? prefix + name : name,
                    description,
                    obj: node,
                };
                return;
            }
        }
        ts.forEachChild(node, walk);
    };
    walk(sf);
    if (found) {
        fallbackCount++;
        putEntry(found.name, found.description, file);
        // 回退命中的对象同样是完整节点描述（如 DateTimeV2 顶层 const），操作标题一并提取
        extractActionTitles(found.obj, found.name);
    } else {
        skipped.push(`${path.relative(N8N_ROOT, file)}  (无可识别的节点描述)`);
    }
}

for (const { dir: rel, prefix } of SOURCES) {
    const files = listNodeTsFiles(path.join(N8N_ROOT, rel));
    for (const file of files) {
        filesScanned++;
        const sf = ts.createSourceFile(file, fs.readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true);
        let fileHits = 0;
        const visit = (node) => {
            let obj = null;
            // 形态1：类属性 description: INodeTypeDescription = {...}
            if (ts.isPropertyDeclaration(node) && ts.isIdentifier(node.name) && node.name.text === 'description'
                && node.initializer && ts.isObjectLiteralExpression(unwrap(node.initializer))) {
                obj = unwrap(node.initializer);
            }
            // 形态2：构造函数内 this.description = {...}（DateTimeV2/HttpRequestV3 等 versioned 节点）
            // 🔴 this 是 ThisKeyword 而非 Identifier，不能用 ts.isIdentifier 判断
            if (ts.isBinaryExpression(node) && node.operatorToken.kind === ts.SyntaxKind.EqualsToken
                && ts.isPropertyAccessExpression(node.left) && node.left.expression.kind === ts.SyntaxKind.ThisKeyword
                && node.left.name.text === 'description'
                && ts.isObjectLiteralExpression(unwrap(node.right))) {
                obj = unwrap(node.right);
            }
            if (obj) {
                descLiterals++;
                const name = getStringLiteral(obj, 'name');
                const description = getStringLiteral(obj, 'description');
                const full = name && prefix && !name.startsWith('@') ? prefix + name : name;
                // 只要带内联 properties 就提取操作标题（展开注入 ...baseDescription 的对象没有 name/description 字面量，
                // 但 properties/操作选项是节点真实数据——DateTime/Slack 等_versioned 节点全走这条）
                if (getArrayLiteral(obj, 'properties')) extractActionTitles(obj, full ?? file);
                if (full && description) {
                    fileHits++;
                    putEntry(full, description, file);
                } else {
                    skipped.push(`${path.relative(N8N_ROOT, file)}  (name=${name ? '有' : '缺失'} description=${description ? '非字面量' : '缺失'})`);
                }
            }
            ts.forEachChild(node, visit);
        };
        visit(sf);
        if (fileHits === 0) fileFallback(file, sf, prefix);
    }
}

// 输出扁平 key（与 zh-CN.json 同构；节点 name 内的点不影响——注册与查找用同一 key 串）
const flat = {};
const names = [...entries.keys()].sort();
for (const name of names) {
    flat[`headers.${name}.description`] = entries.get(name).description;
}
const titles = [...actionTitles.keys()].sort();
for (const t of titles) {
    flat[`headers.actionTitles.${t}`] = t; // 恒等映射：翻译后 zh 值即中文标题
}
fs.writeFileSync(path.join(__dirname, 'en-nodes.json'), JSON.stringify(flat, null, 4) + '\n', 'utf8');

// ---- 报告 ----
const deprecated = names.filter((n) => /deprecated/i.test(entries.get(n).description));
const langchain = names.filter((n) => n.startsWith('@n8n/'));
const anomalies = names.filter((n) => !n.startsWith('@n8n/') && !/^[a-zA-Z][a-zA-Z0-9_]*$/.test(n));

console.log('----------------------------------------');
console.log(`扫描 .node.ts: ${filesScanned} 个 | 类描述字面量: ${descLiterals} 个 | 唯一节点: ${names.length} 个`);
console.log(`  其中 langchain 包: ${langchain.length} 个 | nodes-base: ${names.length - langchain.length} 个`);
console.log(`第三层操作标题（全局去重）: ${titles.length} 条`);
console.log('  样例:', titles.slice(0, 8).join(' | '));
console.log(`⚠️ 含 deprecated 字样（翻译须保留该词，否则面板弃用徽标丢失）: ${deprecated.length} 个`);
deprecated.forEach((n) => console.log('   -', n));
if (anomalies.length) {
    console.log('⚠️ 名称模式异常:', anomalies.join(', '));
}
if (conflicts.length) {
    console.log(`⚠️ 同名描述冲突（按浅层目录取胜出）: ${conflicts.length} 处`);
    conflicts.slice(0, 10).forEach((c) => console.log('   -', c));
}
if (skipped.length) {
    console.log(`ℹ️ 未提取（缺 name/description 字面量）: ${skipped.length} 个文件`);
    skipped.slice(0, 20).forEach((s) => console.log('   -', s));
}
console.log('----------------------------------------');
console.log('样例:');
for (const n of ['httpRequest', 'webhook', '@n8n/n8n-nodes-langchain.agent'].filter((k) => flat[`headers.${k}.description`])) {
    console.log(`  headers.${n}.description =`, JSON.stringify(flat[`headers.${n}.description`]));
}
console.log('已写出:', path.join(__dirname, 'en-nodes.json'));
