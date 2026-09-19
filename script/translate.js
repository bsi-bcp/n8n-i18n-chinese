require('dotenv').config()
const fs = require('fs');
const path = require('path');
const lodash = require("lodash")
const pLimit = require('p-limit');

if (!process.env.OPENAI_API_KEY){
    console.error("请设置环境变量 OPENAI_API_KEY");
    process.exit(1);
}
if (!process.env.OPENAI_API_BASE){
    console.error("请设置环境变量 OPENAI_API_BASE");
    process.exit(1);
}

const targetLanguages = [
    {
        "name": "zh-CN",
        "label": "简体中文",
    }
]

function retry(fn, maxRetry = 5, interval = 1000) {
    return new Promise((resolve, reject) => {
        let retryCount = 0
        const retry = () => {
            fn()
                .then(resolve)
                .catch(err => {
                    if (retryCount >= maxRetry) {
                        reject(err)
                    } else {
                        retryCount++
                        setTimeout(retry, interval)
                    }
                })
        }
        retry()
    })
}

function stripThink(s) {
    return s.replace(/<think>[\s\S]*>?<\/think>/g, '').trim();
}

// 批量翻译：messages 为 JSON 字符串数组，返回等长译文数组。
// 批协议用 JSON 数组进出（而非按行编号），无行映射歧义，多行文本也安全。
async function doTranslate(messages, language) {
    // 🔴 非 200（5xx 过载等）也要重试——所以状态检查放进 retry 回调内；
    //    429 单独放行到外层做 5s 退避（retry 的 1s 间隔对限流太激进）
    const response = await retry(() => fetch(process.env.OPENAI_API_BASE + "/chat/completions", {
        method: "POST",
        headers: {
            "Authorization": "Bearer " + process.env.OPENAI_API_KEY,
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            "model": process.env.OPENAI_MODEL,
            "messages": [
                {
                    "role": "system",
                    "content": `
你是n8n项目的翻译助手，你的任务是将英文文本翻译成指定的语言。请将输入 JSON 字符串数组中的每个英文文本翻译成 ${language}
## 限制：
- 输入是 JSON 字符串数组，输出必须是**等长**的 JSON 字符串数组，顺序与输入一一对应
- 仅输出 JSON 数组本身，不要输出解释或 markdown 代码块标记
- 不要处理 {} 里面包裹的变量名称（保持原样）
- 保留原文中的 HTML 标签、换行符和特殊占位符
`
                },
                {
                    "role": "user",
                    "content": JSON.stringify(messages)
                }
            ],
        }),
    }).then(res => {
        if (res.status === 429) return res;
        if (res.status !== 200) throw new Error(`翻译请求失败: ${res.status} ${res.statusText}`);
        return res;
    }));

    // 请求过多，等待重试
    if (response.status === 429){
        const body = await response.text();
        // 免费档 LLM（如 Gemini flash）有 RPM 限制，退避 5s 防打爆循环
        // 🔴 setTimeout 回调内必须 try/catch——否则重试再抛错会变成 unhandledRejection 直接崩进程
        console.log('翻译请求过多，等待5s后重试...', response.status, response.statusText, body.slice(0, 200));
        return new Promise((resolve, reject) => {
            setTimeout(async () => {
                try {
                    resolve(await doTranslate(messages, language));
                } catch (e) {
                    reject(e);
                }
            }, 5000);
        });
    }

    if (response.status !== 200){
        throw new Error(`翻译请求失败: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();

    if (data.error){
        throw new Error("翻译失败: " + data.error.message);
    }

    let content = stripThink(data.choices[0].message.content);
    // 兼容模型无视指令包裹 markdown 代码块的情况
    content = content.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');

    let results;
    try {
        results = JSON.parse(content);
    } catch (e) {
        throw new Error(`批量翻译结果 JSON 解析失败: ${e.message}; 响应前200字符: ${content.slice(0, 200)}`);
    }
    if (!Array.isArray(results) || results.length !== messages.length){
        throw new Error(`批量翻译结果数量不匹配: 期望 ${messages.length} 实际 ${Array.isArray(results) ? results.length : typeof results}`);
    }
    return results.map(x => (typeof x === 'string' ? x : String(x)));
}

function putObjectValue(obj, key, value) {
    const keys = key.split('##');
    let current = obj;

    for (let i = 0; i < keys.length - 1; i++) {
        const k = keys[i];
        if (!current[k]) {
            current[k] = {};
        }
        current = current[k];
    }

    current[keys[keys.length - 1]] = value;
}

// 🔴 内容级安全校验：LLM 译文直进编译产物、交付客户浏览器（曾实锤指令串泄漏进 UI）。
//    拒绝：脚本/事件注入标签（源无同等标签时）、原文没有的 URL、长度异常膨胀、指令回显特征。
//    命中即跳过该条（不写入，下次运行自动补翻），留痕日志。
function isSuspiciousTranslation(source, output) {
    if (typeof output !== 'string') return true;
    const danger = /<script|<iframe|<svg|onerror\s*=|onclick\s*=|javascript:/i;
    if (danger.test(output) && !danger.test(source)) return true;
    const urls = output.match(/https?:\/\/[^\s"'<>]+/gi) || [];
    for (const u of urls) {
        if (!source.includes(u)) return true;
    }
    if (source && output.length > Math.max(source.length * 5, 200)) return true;
    if (/限制[:：]\s*仅输出|不包含任何额外信息|作为\s*AI|as an AI/i.test(output)) return true;
    return false;
}

// 批次翻译 + 二分降级：反复失败（模型输出抖动/格式不服从）时拆半重试直到单条，
// 单条时「等长校验」天然无歧义；仍失败则放弃并记日志（key 不写入，下次运行自动补翻）
async function translateBatchWithSplit(items, targetObject, targetLanguage, depth = 0) {
    try {
        const results = await retry(
            () => doTranslate(items.map(item => item.message), targetLanguage),
            2, 2000
        );
        items.forEach((item, idx) => {
            const out = results[idx];
            if (isSuspiciousTranslation(item.message, out)) {
                console.log("🚨 译文未通过内容安全校验，跳过:", item.key, "=>", String(out).slice(0, 100));
                return;
            }
            putObjectValue(targetObject, item.key, out);
            console.log("翻译 key", item.key, "为", targetLanguage, ":", item.message, ' => ', out);
        })
    } catch (e) {
        if (items.length > 1) {
            console.log(`批次翻译失败(${String(e.message).slice(0, 80)})，二分重试: ${items.length} 条 → ${Math.ceil(items.length / 2)} + ${Math.floor(items.length / 2)}`);
            const mid = Math.ceil(items.length / 2);
            await translateBatchWithSplit(items.slice(0, mid), targetObject, targetLanguage, depth + 1);
            await translateBatchWithSplit(items.slice(mid), targetObject, targetLanguage, depth + 1);
        } else {
            console.log("翻译失败放弃", items.map(item => item.key).join(','), ":", e.message);
        }
    }
}

async function translate(waitTranslateList, targetObject, targetLanguage) {
    let promises = [];
    let doNum = 0;
    let concurrentNum = parseInt(process.env.OPENAI_API_CONCURRENT || 2);
    // 批量大小：一次 LLM 调用翻译的条数。默认 1 = 上游逐条行为；
    // 免费档 API 有 RPM 限制时调大批次（如 15）可把请求数降一个数量级
    let batchSize = parseInt(process.env.OPENAI_BATCH_SIZE || 1);

    console.log('concurrentNum', concurrentNum, 'batchSize', batchSize);

    const limit = pLimit(concurrentNum);

    for (let i = 0; i < waitTranslateList.length; i += batchSize) {
        const batch = waitTranslateList.slice(i, i + batchSize);

        promises.push(limit(async () => {
            await translateBatchWithSplit(batch, targetObject, targetLanguage);
            doNum += batch.length;
            if (doNum % 100 < batchSize) console.log("剩余翻译数量", waitTranslateList.length - doNum);
        }))
    }

    await Promise.all(promises);
}

// 收集需要翻译的key和message
function collectMessages(oldSourceLanguages, newSourceLanguages, targetLanguages, parentKey = '', waitTranslateList=[]){
    for (const key in newSourceLanguages) {
        let currentKey = parentKey ? parentKey + "##" + key : key;
        if (newSourceLanguages[key] instanceof Object) {
            collectMessages(oldSourceLanguages[key]  || {}, newSourceLanguages[key], targetLanguages[key] || {}, currentKey, waitTranslateList);
        } else {
            // 🔴 空源值防护：无内容可翻必须跳过。曾实锤 LLM 收到空串后把协议指令
            //    （"限制：仅输出翻译内容…"）当译文写回 zh-CN.json 泄漏到 UI（存档弹窗取消按钮）。
            //    同时镜像清空目标侧存量污染，使其与上游空源保持一致。
            if (typeof newSourceLanguages[key] !== "string" || newSourceLanguages[key].trim() === "") {
                if (typeof targetLanguages[key] === "string" && targetLanguages[key] !== "") {
                    targetLanguages[key] = "";
                }
                continue;
            }
            if (targetLanguages[key] === undefined
                || oldSourceLanguages[key] === undefined
                || oldSourceLanguages[key] !== newSourceLanguages[key]) {
                waitTranslateList.push({
                    key: currentKey,
                    message: newSourceLanguages[key]
                })
            }
        }
    }
}


async function run(){
    const oldEnLanguages = require("./en.json");
    const newEnNodesLanguages = fs.existsSync("./en-nodes.json") ? require("./en-nodes.json") : {};
    // 可用 N8N_EN_JSON_URL 覆盖源，支持 http(s) URL 或本地文件路径：
    //   URL（pin 到指定版本 tag）: https://raw.githubusercontent.com/n8n-io/n8n/n8n%402.38.7/packages/frontend/%40n8n/i18n/src/locales/en.json
    //   本地文件: 提前 curl 下载好再传路径（国内直连 raw.githubusercontent.com 常超时，
    //            且 Node fetch 不消费 http_proxy 环境变量，curl 会走代理而 node 不会）
    // 默认 master（可能领先最新 Release）
    const enSourceUrl = process.env.N8N_EN_JSON_URL || "https://raw.githubusercontent.com/n8n-io/n8n/master/packages/frontend/%40n8n/i18n/src/locales/en.json";
    // 🔴 Fastly 变体分裂实锤（2026-09-19 三炸复盘）：上游 force-push 回退 tag 后，raw 的
    //    gzip/br 压缩变体缓存未随 purge 刷新（Node fetch 默认带压缩头），词条数相同而内容
    //    不同；cache-bust query 亦无效（Fastly 对该域丢弃 query）。根治=raw URL 转 GitHub
    //    contents API——直读 git 对象（base64），不经 CDN 内容缓存。
    const rawMatch = enSourceUrl.match(/^https:\/\/raw\.githubusercontent\.com\/([^/]+)\/([^/]+)\/([^/]+)\/(.+)$/);
    let newEnLanguages;
    if (rawMatch) {
        const apiUrl = `https://api.github.com/repos/${rawMatch[1]}/${rawMatch[2]}/contents/${rawMatch[4]}?ref=${rawMatch[3]}`;
        const res = await fetch(apiUrl, { headers: { "User-Agent": "n8n-i18n-translate", "Accept": "application/vnd.github+json" } });
        if (!res.ok) throw new Error(`GitHub contents API ${res.status}: ${(await res.text()).slice(0, 120)}`);
        const j = await res.json();
        newEnLanguages = JSON.parse(Buffer.from(j.content, "base64").toString("utf8"));
    } else if (/^https?:\/\//.test(enSourceUrl)) {
        newEnLanguages = await fetch(enSourceUrl).then(res => res.json());
    } else {
        newEnLanguages = JSON.parse(fs.readFileSync(enSourceUrl, "utf8"));
    }

    for (const targetLanguage of targetLanguages) {
        let targetLanguages = {};
        // 🔴 以脚本所在目录锚定（__dirname），与 CWD 无关——否则从仓库根目录运行时
        //    "../languages/..." 解析到仓库外，误判语言文件不存在 → 全量重翻
        let fileName = path.join(__dirname, `../languages/${targetLanguage.name}.json`);
        if (fs.existsSync(fileName)){
            targetLanguages = JSON.parse(fs.readFileSync(fileName, "utf8"))
        }else{
            console.warn(targetLanguage + "语言文件不存在，创建新文件: ", fileName);
        }
        const waitTranslateList = []

        // 🔴 评审 D-E4-9：排除 en-nodes 的 _meta 元数据键——否则伪键进入词典并被送 LLM「翻译」
        newEnLanguages = lodash.merge({}, newEnLanguages, lodash.omit(newEnNodesLanguages, '_meta'));
        collectMessages(oldEnLanguages, newEnLanguages , targetLanguages, "", waitTranslateList)
        await translate(waitTranslateList, targetLanguages, targetLanguage.label);
        // 最后使用 enLanguages的key  排序 targetLanguages key
        const sortedTargetLanguages = {};
        for (const key in newEnLanguages) {
            if (targetLanguages[key] !== undefined) {
                sortedTargetLanguages[key] = targetLanguages[key];
            }
        }
        // 将翻译后的语言写入文件
        fs.writeFileSync(fileName, JSON.stringify(sortedTargetLanguages, null, 4));
    }
    fs.writeFileSync(path.join(__dirname, "./en.json"), JSON.stringify(newEnLanguages, null, 4));
}

run();
