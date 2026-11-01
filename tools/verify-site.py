# -*- coding: utf-8 -*-
"""一恒体系站（GitHub Pages）上线自检 —— 跑绿了才允许说「完成」。

用法：
    python tools/verify-site.py            # 线上 + 本地
    python tools/verify-site.py --local    # 只查本地
    python tools/verify-site.py --base http://127.0.0.1:8850/

退出码：0 全过；1 有失败项。
"""
import argparse
import json
import os
import re
import struct
import sys
import urllib.request
import xml.etree.ElementTree as ET

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
URL = "https://qin-zhi-peng.github.io/gzli/"
WECHAT = "xy1618fff"
UA_WECHAT = ("Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 "
             "MicroMessenger/8.0.40")

# 部署清单：少一个线上就是白屏
ASSETS = [
    ("index.html", "text/html"),
    ("theme.css", "text/css"),
    ("mingli.css", "text/css"),
    ("zhanbu.css", "text/css"),
    ("zhongyi.css", "text/css"),
    ("app.js", "javascript"),
    ("mingli.js", "javascript"),
    ("zhanbu.js", "javascript"),
    ("zhanbu-data.js", "javascript"),
    ("zhongyi.js", "javascript"),
    ("zhongyi-data.js", "javascript"),
    ("engine.js", "javascript"),
    ("data.js", "javascript"),
    ("report.js", "javascript"),
    ("qr.png", "image"),
    ("favicon.png", "image"),
    ("apple-touch-icon.png", "image"),
    ("icon-192.png", "image"),
    ("icon-512.png", "image"),
    ("og.png", "image"),
    ("site.webmanifest", "manifest"),
    ("robots.txt", "text"),
    ("sitemap.xml", "xml"),
    ("LICENSE", "text"),
]

# 页面里必须出现的一恒体系标识（微信号在 app.js 里，单独查）
MUST = ["一恒体系", "命理", "占卜", "中医调理"]

# 内部口径/出处词由 D:\dsh\scripts\skill-ip-check.ps1 单独查（不写进本仓库脚本，
# 否则自检脚本本身就会被 IP 检查命中）。这里只查「明文解锁码 / 占位符」。

# 解锁码明文绝不许进仓库（只存 FNV-1a hash）
PLAIN_CODES = ["yh1618fff"]

results = []


def check(name, ok, detail=""):
    results.append((name, bool(ok), detail))
    print(("PASS " if ok else "FAIL ") + name + (("  — " + detail) if detail else ""))
    return ok


def png_size(data):
    if data[:8] != b"\x89PNG\r\n\x1a\n" or len(data) < 24:
        return None
    return struct.unpack(">II", data[16:24])


def ctype_ok(kind, ct):
    ct = (ct or "").lower()
    if kind == "image":
        return "image" in ct
    if kind == "javascript":
        return "javascript" in ct or "text/plain" in ct
    if kind == "manifest":
        return "manifest" in ct or "json" in ct or "text/plain" in ct or "octet-stream" in ct
    if kind == "xml":
        return "xml" in ct or "text/plain" in ct
    if kind == "text":
        # 无扩展名的 LICENSE 会被静态服务器当 octet-stream，不影响使用
        return "text" in ct or "octet-stream" in ct
    return kind in ct


def fetch(url, ua=None, timeout=25):
    req = urllib.request.Request(url)
    if ua:
        req.add_header("User-Agent", ua)
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return r.status, {k.lower(): v for k, v in r.headers.items()}, r.read()


def local_checks():
    print("== 本地文件 ==")
    files = {}
    for name, _ in ASSETS:
        p = os.path.join(ROOT, name)
        if not os.path.exists(p):
            check("文件存在 " + name, False, "缺失")
            continue
        files[name] = open(p, "rb").read()
        need = 20 if name == "robots.txt" else 100
        check("文件存在 " + name, len(files[name]) > need, "%d bytes" % len(files[name]))

    html = files.get("index.html", b"").decode("utf-8", "ignore")
    app = files.get("app.js", b"").decode("utf-8", "ignore")
    check("本地标题含一恒体系", "一恒体系" in html)
    check("本地引入三板块样式", all(x in html for x in ("mingli.css", "zhanbu.css", "zhongyi.css")))
    eager = re.findall(r'<script[^>]+src=["\']([^"\']+)', html)
    check("首页只直载 app.js", eager == ["app.js"], "、".join(eager) or "无")
    check("板块脚本按需加载",
          all(x in app for x in ("mingli.js", "zhanbu.js", "zhongyi.js")) and "loadBoard" in app)
    check("本地有微信二维码", 'qr.png' in html or 'qr.png' in app)
    check("本地微信号正确", WECHAT in app)

    # 首页资源：全部本地、文件都在
    loads = re.findall(r'<script[^>]+src=["\']([^"\']+)', html)
    loads += re.findall(r'<link(?![^>]*rel=["\']canonical)[^>]+href=["\']([^"\']+)', html)
    loads += re.findall(r'<img[^>]+src=["\']([^"\']+)', html)
    remote = [u for u in loads if re.match(r'^(?:https?:)?//', u)]
    check("首页无外部资源依赖", not remote, "、".join(remote))
    local_refs = [u for u in loads if not re.match(r'^(?:https?:|data:|mailto:)', u)]
    missing_refs = [u for u in local_refs if u not in files]
    check("首页引用的本地文件都在仓库", not missing_refs, "、".join(missing_refs))

    # 分享图 / PWA / 抓取入口
    check("首页有分享图 og.png", "og:image" in html and "og.png" in html)
    check("首页有 PWA 图标与 manifest",
          "apple-touch-icon.png" in html and "site.webmanifest" in html and "favicon.png" in html)
    check("首页有 canonical", 'rel="canonical"' in html or "rel='canonical'" in html)
    check("首页 lang 是中文", 'lang="zh-CN"' in html)
    check("首页有结构化数据", 'application/ld+json' in html and "schema.org" in html)

    # 板块脚本必须注册到 YH.boards
    for name, marker in (("mingli.js", "boards.mingli"), ("zhanbu.js", "boards.zhanbu"),
                         ("zhongyi.js", "boards.zhongyi")):
        src = files.get(name, b"").decode("utf-8", "ignore")
        check(name + " 注册板块", marker in src)
    check("app.js 有微信联系卡", "YH.contact" in app)
    check("页面上不生成完整内容", "YH.gate" not in app and "CODE_HASH" not in app)
    check("LICENSE 声明著作权", "保留所有权利" in files.get("LICENSE", b"").decode("utf-8", "ignore"))

    # manifest（PWA）
    try:
        mf = json.loads(files.get("site.webmanifest", b"{}").decode("utf-8"))
        check("manifest 是合法 JSON", True)
    except Exception as e:
        mf = {}
        check("manifest 是合法 JSON", False, str(e)[:80])
    check("manifest 名称正确", "一恒体系" in (mf.get("name", "") + mf.get("short_name", "")))
    check("manifest 相对路径可部署子目录",
          str(mf.get("start_url", "")).startswith(".") and str(mf.get("scope", "")).startswith("."))
    check("manifest 底色与站点一致",
          str(mf.get("background_color", "")).lower() == "#0d0b09"
          and str(mf.get("theme_color", "")).lower() == "#0d0b09")
    icons = mf.get("icons") or []
    check("manifest 有 192/512 图标",
          sorted(i.get("sizes", "") for i in icons) == ["192x192", "512x512"])
    for i in icons:
        name = i.get("src", "")
        size = png_size(files.get(name, b""))
        m = re.match(r"^(\d+)x(\d+)$", i.get("sizes", ""))
        check("manifest 图标文件与尺寸 " + name,
              bool(size and m and size == (int(m.group(1)), int(m.group(2)))),
              "%s %s" % (name, size))

    # robots / sitemap
    robots = files.get("robots.txt", b"").decode("utf-8", "ignore")
    check("robots 允许抓取", "User-agent: *" in robots and "Allow: /" in robots)
    check("robots 指向 sitemap", "sitemap.xml" in robots)
    sm = files.get("sitemap.xml", b"").decode("utf-8", "ignore")
    check("sitemap 含首页 URL", "https://qin-zhi-peng.github.io/gzli/" in sm)
    try:
        ET.fromstring(files.get("sitemap.xml", b""))
        check("sitemap 是合法 XML", True)
    except Exception as e:
        check("sitemap 是合法 XML", False, str(e)[:80])

    # 图标都是真 PNG（不是占位/空文件）
    for name, kind in ASSETS:
        if kind == "image" and name != "qr.png":
            check(name + " 是 PNG", files.get(name, b"")[:8] == b"\x89PNG\r\n\x1a\n")
    og = png_size(files.get("og.png", b""))
    check("og.png 尺寸适合分享", bool(og and og[0] >= 600 and og[1] >= 300), str(og))

    # 明文解锁码 / 出处词 / 占位符
    all_text = ""
    for name, _ in ASSETS:
        if name.endswith((".html", ".js", ".css")):
            all_text += files.get(name, b"").decode("utf-8", "ignore")
    hit = [c for c in PLAIN_CODES if c in all_text]
    check("仓库无解锁码明文", not hit, "、".join(hit))
    check("无占位微信号", "请填" not in all_text and "your-wechat" not in all_text)

    # QR 体积与格式
    qr = files.get("qr.png", b"")
    check("二维码是 PNG", qr[:8] == b"\x89PNG\r\n\x1a\n", "%d bytes" % len(qr))
    return files


def live_checks(base):
    print("== 线上 ==")
    base = base.rstrip("/") + "/"
    try:
        status, headers, body = fetch(base, UA_WECHAT)
    except Exception as e:
        check("线上可访问", False, str(e)[:140])
        return
    check("HTTP 200", status == 200, str(status))
    ctype = headers.get("content-type", "")
    check("Content-Type 是 html", "text/html" in ctype.lower(), ctype)
    check("没有被强制下载", "attachment" not in headers.get("content-disposition", "").lower(),
          headers.get("content-disposition", "无"))
    text = body.decode("utf-8", "ignore")
    title = re.search(r"<title>(.*?)</title>", text, re.S)
    check("线上标题正确", bool(title and "一恒体系" in title.group(1)),
          title.group(1).strip() if title else "无")
    for w in MUST:
        check("线上含 " + w, w in text)
    check("线上体积正常", 800 < len(text) < 20000, "%d chars" % len(text))

    # 全部静态资源可达 + 类型对
    for name, kind in ASSETS:
        try:
            s, h, b = fetch(base + name, UA_WECHAT)
        except Exception as e:
            check("资源可达 " + name, False, str(e)[:80])
            continue
        ct = h.get("content-type", "").lower()
        check("资源可达 " + name, s == 200 and ctype_ok(kind, ct),
              "%d %s %d bytes" % (s, ct, len(b)))

    # 关键内容抽查
    try:
        js_app = fetch(base + "app.js", UA_WECHAT)[2].decode("utf-8", "ignore")
        check("线上 app.js 含微信联系卡", "YH.contact" in js_app)
        check("线上页不生成完整内容", "YH.gate" not in js_app)
        check("线上 app.js 含微信号", WECHAT in js_app)
        for name, marker in (("mingli.js", "boards.mingli"), ("zhanbu.js", "boards.zhanbu"),
                             ("zhongyi.js", "boards.zhongyi")):
            src = fetch(base + name, UA_WECHAT)[2].decode("utf-8", "ignore")
            check("线上 " + name + " 注册板块", marker in src)
        check("线上首页只直载 app.js",
              re.findall(r'<script[^>]+src=["\']([^"\']+)', text) == ["app.js"])
        mf = json.loads(fetch(base + "site.webmanifest", UA_WECHAT)[2].decode("utf-8"))
        check("线上 manifest 是 JSON", "一恒体系" in mf.get("name", ""))
        rb = fetch(base + "robots.txt", UA_WECHAT)[2].decode("utf-8", "ignore")
        check("线上 robots 有 sitemap", "sitemap.xml" in rb)
        sm = fetch(base + "sitemap.xml", UA_WECHAT)[2].decode("utf-8", "ignore")
        check("线上 sitemap 有首页", "<loc>" in sm and "gzli" in sm)
        qr = fetch(base + "qr.png", UA_WECHAT)[2]
        check("线上二维码 PNG", qr[:8] == b"\x89PNG\r\n\x1a\n", "%d bytes" % len(qr))
    except Exception as e:
        check("线上资源内容抽查", False, str(e)[:120])


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--local", action="store_true", help="只查本地")
    ap.add_argument("--base", default=None, help="改线上基址（本地联调时用）")
    args = ap.parse_args()

    local_checks()
    if not args.local:
        live_checks(args.base or URL)

    fails = [x for x in results if not x[1]]
    print("-" * 56)
    print("共 %d 项，通过 %d，失败 %d" % (len(results), len(results) - len(fails), len(fails)))
    if fails:
        print("失败项：" + "；".join(x[0] for x in fails))
    return 0 if not fails else 1


if __name__ == "__main__":
    sys.exit(main())
