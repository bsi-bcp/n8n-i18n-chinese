#!/usr/bin/env python3
"""带外飞书告警（不依赖 GitHub Actions）。

用法:
    python3 -I notify-feishu.py "<标题>" ["<详情>"]

环境变量:
    BCP_CREDENTIALS  凭证库路径（默认 /Users/paul/Documents/GitHub/00-docs/bcp-credentials.json）
    FEISHU_GROUP     凭证库内群组名（默认 alarm → feishu.group.alarm）
    FEISHU_DRY_RUN   设为 1 时只打印 payload，不发送

设计要点:
- 凭证只从凭证库动态读取，本文件不含任何 secret，可入公开仓；
- webhookUrl 不落日志、不随错误信息输出（URL 内含 token）；
- 无签名密钥时按普通自定义机器人发送（两个群的 signatureSecret 均为空）。
"""
import json
import os
import sys
import urllib.error
import urllib.request

CRED_PATH = os.environ.get(
    "BCP_CREDENTIALS", "/Users/paul/Documents/GitHub/00-docs/bcp-credentials.json"
)
GROUP = os.environ.get("FEISHU_GROUP", "alarm")
TIMEOUT = 20


def build_payload(text: str, secret: str) -> dict:
    payload = {"msg_type": "text", "content": {"text": text}}
    if secret:
        import base64
        import hashlib
        import hmac
        import time

        ts = str(int(time.time()))
        string_to_sign = f"{ts}\n{secret}".encode()
        sign = base64.b64encode(
            hmac.new(string_to_sign, b"", hashlib.sha256).digest()
        ).decode()
        payload["timestamp"] = ts
        payload["sign"] = sign
    return payload


def main() -> int:
    if len(sys.argv) < 2:
        print('usage: notify-feishu.py "<title>" ["detail"]', file=sys.stderr)
        return 2

    title = sys.argv[1]
    detail = sys.argv[2] if len(sys.argv) > 2 else ""
    text = title if not detail else f"{title}\n{detail[:1500]}"

    try:
        with open(CRED_PATH, encoding="utf-8") as f:
            cred = json.load(f)
    except Exception as exc:  # noqa: BLE001 - 告警失败不得抛出栈
        print(f"读取凭证库失败: {type(exc).__name__}", file=sys.stderr)
        return 1

    group = cred.get("feishu", {}).get("group", {}).get(GROUP, {})
    url = group.get("webhookUrl", "")
    if not url:
        print(f"凭证库缺少 feishu.group.{GROUP}.webhookUrl", file=sys.stderr)
        return 1

    payload = build_payload(text, group.get("signatureSecret") or "")
    if os.environ.get("FEISHU_DRY_RUN") == "1":
        print(json.dumps(payload, ensure_ascii=False))
        return 0

    req = urllib.request.Request(
        url,
        data=json.dumps(payload, ensure_ascii=False).encode("utf-8"),
        headers={"Content-Type": "application/json; charset=utf-8"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=TIMEOUT) as resp:
            body = json.loads(resp.read().decode("utf-8", "ignore") or "{}")
    except (urllib.error.URLError, TimeoutError, ValueError) as exc:
        print(f"飞书发送失败: {type(exc).__name__}", file=sys.stderr)
        return 1

    code = body.get("code", body.get("StatusCode"))
    if code not in (0, None):
        print(f"飞书返回错误 code={code} msg={body.get('msg', '')}", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
