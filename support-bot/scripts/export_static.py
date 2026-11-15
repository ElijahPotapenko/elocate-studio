"""Статичная версия демо (запись настоящих разговоров, без сервера и без ключей): python3 scripts/export_static.py [куда]
По умолчанию кладёт dist/index.html; для сайта студии: python3 scripts/export_static.py ../elocate-studio/public/demos/support-bot/index.html"""
import json
import os
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def build():
    html = open(os.path.join(ROOT, "ui", "index.html"), encoding="utf-8").read()
    data = json.load(open(os.path.join(ROOT, "transcripts", "all.json"), encoding="utf-8"))
    for sc in data["scenarios"]:                       # во внешнюю страницу идёт только нужное для показа
        for t in sc["turns"]:
            t.pop("handoff_reason", None) if not t.get("handoff") else None
    blob = json.dumps(data, ensure_ascii=False).replace("</", "<\\/")
    marker = "const REPLAY=window.REPLAY||null;"
    assert marker in html
    return html.replace(marker, "const REPLAY=" + blob + ";").replace("<title>Support bot demo</title>", "<title>Support bot demo · Elocate Studio</title>")


if __name__ == "__main__":
    dst = sys.argv[1] if len(sys.argv) > 1 else os.path.join(ROOT, "dist", "index.html")
    os.makedirs(os.path.dirname(os.path.abspath(dst)), exist_ok=True)
    open(dst, "w", encoding="utf-8").write(build())
    print("записано:", dst)
