#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""registry-copy.py —— 跨 registry 复制镜像（保多架构 + attestation），供 image.yml 的私有库镜像步使用。

【为什么不用 docker / buildx】
  * `docker pull` + `tag` + `push` **会丢多架构**（pull 只取宿主架构，日志仅一行 INFO）——2026-09-25 实测踩中；
  * `docker buildx imagetools create`（Go / HTTP/2）在本环境**跨库复制会卡死**：
    私有库前面的 Caddy 对 h2 大 blob 流会 `stream error: ... INTERNAL_ERROR`，
    加 `GODEBUG=http2client=0` 后则表现为**无进展挂起**（2026-09-25 实测：43 分钟零进展，撞 90min 作业超时）。
  * 本脚本走 **Python urllib（HTTP/1.1）直连 Registry v2 API** —— 2026-09-25 用它修复受损镜像，
    外部逐层拉取验证通过，是本案已验证可用的方法。

【保真】
  - 逐层按 OCI/Docker **index → 子 manifest → config/layers** 递归复制，arm64 与 attestation 子清单一并保留
  - 复制后**校验**：目标 tag 的 digest 与源一致（内容寻址 ⇒ digest 不变即逐字节等价，
    顺带保证"平台集合不丢"——丢架构必然改变 digest）
  - 同库复制走 **blob 挂载**（`?mount=&from=`），零数据传输

【凭证】（按 host 取，均支持匿名回退）
  环境变量：SWR_USER / SWR_PASS（华为云 SWR）、REG_USER / REG_PASS（registry.bcpcloud.cn）
  或文件：CREDS_FILE（默认 /home/ubuntu/registry/migrate.env，TX-43 本机用）

用法：
  python3 script/registry-copy.py --from <host/repo:tag> --to <host/repo:tag> [--dry-run]
退出码：0=成功 1=失败
"""

import argparse
import base64
import json
import os
import re
import shutil
import ssl
import sys
import tempfile
import urllib.error
import urllib.request

CREDS_FILE = os.environ.get("CREDS_FILE", "/home/ubuntu/registry/migrate.env")
TIMEOUT = 300
ACCEPT = ", ".join([
    "application/vnd.oci.image.index.v1+json",
    "application/vnd.docker.distribution.manifest.list.v2+json",
    "application/vnd.oci.image.manifest.v1+json",
    "application/vnd.docker.distribution.manifest.v2+json",
])


def load_creds():
    """host → Authorization 头值。优先环境变量，其次 CREDS_FILE（KEY=VALUE）。

    ⚠️ 表里没有的 host 一律按**匿名**处理（返回 None ⇒ 调用方不再报"缺凭证"）：
    ghcr.io 等公共库正是靠匿名 token 挑战流读取，不需要也不该配凭证。
    """
    env = {}
    try:
        with open(CREDS_FILE, encoding="utf-8") as f:
            for line in f:
                if "=" in line and not line.startswith("#"):
                    k, v = line.strip().split("=", 1)
                    env[k] = v
    except FileNotFoundError:
        pass
    for k in ("SWR_USER", "SWR_PASS", "REG_USER", "REG_PASS"):
        if os.environ.get(k):
            env[k] = os.environ[k]

    def b64(u, p):
        return "Basic " + base64.b64encode(("%s:%s" % (u, p)).encode()).decode()

    return {
        "swr.cn-north-4.myhuaweicloud.com": b64(env.get("SWR_USER", ""), env.get("SWR_PASS", "")),
        "registry.bcpcloud.cn": b64(env.get("REG_USER", ""), env.get("REG_PASS", "")),
        # 公共库：匿名（走 token 挑战流）。显式列出以免被当成"缺凭证"。
        "ghcr.io": None,
        "docker.io": None,
        "registry-1.docker.io": None,
    }


def split_ref(ref):
    host, _, rest = ref.partition("/")
    repo, _, tag = rest.rpartition(":")
    return host, repo, tag


CTX = ssl.create_default_context()
CTX.check_hostname = False
CTX.verify_mode = ssl.CERT_NONE

# 🔴 SWR 走 **token 挑战流**：直连 Basic 一律 401，必须先取 401 响应里的
#    `WWW-Authenticate: Bearer realm=... service=...` 去换 token，再用 Bearer 访问。
#    且读挑战头必须用 `HTTPMessage.get()`（大小写不敏感）——用 dict(headers) 会误判"无挑战头"。
_TOKEN = {}


def _token_for(host, repo, basic):
    key = (host, repo)
    if key in _TOKEN:
        return _TOKEN[key]
    challenge = None
    try:
        # 🔴 匿名库（ghcr 等）**不能**带 Authorization 去探测：带 `anon` 会返回 **403 且无挑战头**
        #    （2026-09-26 实测 ghcr：不带 → 401+`WWW-Authenticate: Bearer realm=…`；带 anon → 403+无头）
        #    → basic 为空时必须彻底不发这个头，否则拿不到挑战、换不到 token。
        with req("GET", "https://%s/v2/" % host, basic or None, timeout=30):
            _TOKEN[key] = None
            return None
    except urllib.error.HTTPError as e:
        if e.code != 401:
            _TOKEN[key] = None
            return None
        challenge = e.headers.get("WWW-Authenticate", "")
    m_realm = re.search(r'realm="([^"]+)"', challenge or "")
    m_svc = re.search(r'service="([^"]+)"', challenge or "")
    if not m_realm:
        _TOKEN[key] = None
        return None
    url = "%s?service=%s&scope=repository:%s:pull" % (m_realm.group(1), m_svc.group(1) if m_svc else "", repo)
    hdr = {"Authorization": basic} if basic and basic != "anon" else {}
    try:
        with urllib.request.urlopen(urllib.request.Request(url, headers=hdr), timeout=40, context=CTX) as r:
            data = json.loads(r.read())
        tok = data.get("token") or data.get("access_token")
    except Exception:                                          # noqa: BLE001
        tok = None
    _TOKEN[key] = tok
    return tok


def auth_for(host, repo, basic):
    """该 host/repo 实际可用的 Authorization 头值（优先 Bearer，退回 Basic；匿名则返回 None）。"""
    tok = _token_for(host, repo, basic)
    return "Bearer " + tok if tok else (basic or None)


def req(method, url, auth, accept=None, data=None, timeout=TIMEOUT, ctype=None):
    hdr = {}
    if auth:                       # 匿名库（ghcr 等）auth 为空 ⇒ 不发送 Authorization 头
        hdr["Authorization"] = auth
    if accept:
        hdr["Accept"] = accept
    if ctype:
        hdr["Content-Type"] = ctype      # 🔴 PUT manifest 必须带正确 Content-Type，否则 registry 拒收
    r = urllib.request.Request(url, headers=hdr, data=data, method=method)
    return urllib.request.urlopen(r, timeout=timeout, context=CTX)


def get_manifest(host, repo, tag, auth):
    with req("GET", "https://%s/v2/%s/manifests/%s" % (host, repo, tag), auth, ACCEPT) as resp:
        return resp.headers.get("Content-Type"), resp.read(), resp.headers.get("Docker-Content-Digest")


def mount_blob(thost, trepo, srepo, digest, auth_t):
    """同库复制的正解：跨仓**挂载**已有 blob（零传输）。
    True=已挂载/已存在；False=blob 不在本库（需真实复制）。"""
    try:
        with req("POST", "https://%s/v2/%s/blobs/uploads/?mount=%s&from=%s" % (thost, trepo, digest, srepo),
                 auth_t, data=b"", timeout=60) as r:
            return r.status in (201, 200)
    except urllib.error.HTTPError as e:
        if e.code == 202:            # 回落成"开上传会话" = blob 不在本库
            return False
        raise


def blob_exists(host, repo, digest, auth):
    try:
        with req("HEAD", "https://%s/v2/%s/blobs/%s" % (host, repo, digest), auth, timeout=60) as resp:
            return resp.status == 200
    except urllib.error.HTTPError as e:
        if e.code == 404:
            return False
        raise


def copy_blob(shost, srepo, thost, trepo, digest, auth_s, auth_t, log):
    """跨库搬一个 blob。🔴 先落临时文件再 PUT：CI runner 内存小，
    逐层 read() 进内存对 GB 级层不稳；临时文件带明确 Content-Length，registry 才收单体 PUT。"""
    if blob_exists(thost, trepo, digest, auth_t):
        return False
    fd, tmp = tempfile.mkstemp(prefix="blob-", dir=os.environ.get("TMPDIR", "/tmp"))
    os.close(fd)
    try:
        with req("GET", "https://%s/v2/%s/blobs/%s" % (shost, srepo, digest), auth_s) as src, \
                open(tmp, "wb") as out:
            shutil.copyfileobj(src, out, length=1 << 20)
        size = os.path.getsize(tmp)
        with req("POST", "https://%s/v2/%s/blobs/uploads/" % (thost, trepo), auth_t, data=b"") as up:
            loc = up.headers.get("Location")
        sep = "&" if "?" in loc else "?"
        url = loc if loc.startswith("http") else "https://%s%s" % (thost, loc)
        with open(tmp, "rb") as body, \
                req("PUT", "%s%sdigest=%s" % (url, sep, digest), auth_t, data=body,
                    timeout=TIMEOUT + 300, ctype="application/octet-stream") as done:
            if done.status not in (201, 202):
                raise RuntimeError("blob PUT 返回 %s" % done.status)
        log("      ↑ blob %s (%.1f MB)" % (digest[7:19], size / 1048576))
        return True
    finally:
        try:
            os.unlink(tmp)
        except OSError:
            pass


def copy_tree(shost, srepo, thost, trepo, tag, auth_s, auth_t, log, dry):
    """把源 tag 完整复制到目标；返回顶层 manifest 的 digest。"""
    auth_s = auth_for(shost, srepo, auth_s)      # 解析 token 挑战（SWR 等）
    auth_t = auth_for(thost, trepo, auth_t)
    ctype, body, digest = get_manifest(shost, srepo, tag, auth_s)
    m = json.loads(body)
    same_registry = (shost == thost)
    subs = m.get("manifests")                    # index / manifest list（多架构）
    blobs_of = lambda mm: ([mm["config"]["digest"]] if mm.get("config") else []) + \
                          [l["digest"] for l in mm.get("layers", [])]

    def transfer(blobs):
        for d in blobs:
            if same_registry:
                # 同库：blob 内容寻址天然共享，只需挂载到目标仓（零传输）
                if not mount_blob(thost, trepo, srepo, d, auth_t):
                    raise RuntimeError("blob 无法挂载（不在本库，需真实复制）: %s" % d[:24])
            else:
                copy_blob(shost, srepo, thost, trepo, d, auth_s, auth_t, log)

    if subs is not None:
        for sub in subs:
            sd = sub["digest"]
            sct, sbody, _ = get_manifest(shost, srepo, sd, auth_s)
            if dry:
                continue
            transfer(blobs_of(json.loads(sbody)))
            # 子 manifest 必须在**目标仓库路径**下可寻址（blob 全局共享，manifest 是仓库级）
            with req("PUT", "https://%s/v2/%s/manifests/%s" % (thost, trepo, sd), auth_t,
                     data=sbody, timeout=180, ctype=sct) as r:
                if r.status not in (201, 202):
                    raise RuntimeError("子 manifest PUT 返回 %s" % r.status)
    elif not dry:
        transfer(blobs_of(m))

    if not dry:
        with req("PUT", "https://%s/v2/%s/manifests/%s" % (thost, trepo, tag), auth_t,
                 data=body, timeout=180, ctype=ctype) as r:
            if r.status not in (201, 202):
                raise RuntimeError("manifest PUT 返回 %s" % r.status)
    return digest


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--from", dest="src", required=True)
    ap.add_argument("--to", dest="dst", required=True)
    ap.add_argument("--dry-run", action="store_true")
    a = ap.parse_args()

    creds = load_creds()
    shost, srepo, stag = split_ref(a.src)
    thost, trepo, ttag = split_ref(a.dst)
    if not ttag:
        ttag = stag
    if not (shost and srepo and stag and thost and trepo and ttag):
        print("🔴 镜像引用解析失败：--from %s / --to %s（都需 <host>/<repo>:<tag>）" % (a.src, a.dst))
        return 1
    # 源/目标任一不在凭证表里 ⇒ 匿名（ghcr/docker.io 等公共库走 token 挑战流）；
    # 私有库仍需凭证，故此处只对"表里没有的 host"放行，不再直接判失败。
    auth_s = creds.get(shost)
    auth_t = creds.get(thost)
    if shost not in creds or thost not in creds:
        print("🔴 host 未登记：--from %s / --to %s 的 host 不在凭证表（%s）"
              % (shost, thost, CREDS_FILE))
        return 1
    if thost == "registry.bcpcloud.cn" and not auth_t:
        print("🔴 目标私有库缺凭证（环境变量 REG_USER/REG_PASS 或 %s）" % CREDS_FILE)
        return 1

    log = lambda x: print(x, flush=True)         # noqa: E731
    same = (shost == thost)
    log("  %s → %s  [%s]" % (a.src, a.dst, "同库 manifest 直拷" if same else "跨库 blob 复制"))
    try:
        digest = copy_tree(shost, srepo, thost, trepo, stag, auth_s, auth_t, log, a.dry_run)
        if a.dry_run:
            log("    （dry-run：未写入）")
            return 0
        _, _, got = get_manifest(thost, trepo, ttag, auth_t)
        if got == digest:
            log("    ✅ 校验通过（digest 一致 %s…，多架构保真）" % digest[7:19])
            return 0
        log("    ⚠️ digest 不一致：源 %s / 目标 %s" % (digest[7:19], (got or "?")[7:19]))
        return 1
    except urllib.error.HTTPError as e:
        try:
            detail = e.read().decode("utf-8", "replace")[:300]
        except Exception:                                      # noqa: BLE001
            detail = ""
        log("    ❌ HTTP %s: %s" % (e.code, detail))
        return 1
    except Exception as e:                                     # noqa: BLE001
        log("    ❌ %s: %s" % (type(e).__name__, e))
        return 1


if __name__ == "__main__":
    sys.exit(main())
