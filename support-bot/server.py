"""Локальный сервер демо: python3 server.py [порт]. Слушает только 127.0.0.1. Модель: BOT_LLM=claude (по умолчанию) | ollama | mock."""
import json
import os
import sys
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

from bot import llm as llms
from bot.engine import Bot, Session
from bot.store import Store

ROOT = os.path.dirname(os.path.abspath(__file__))
PORT = 8765
SESSIONS = {}
STORE = Store(os.path.join(ROOT, "data"))


def make_llm():
    kind = os.environ.get("BOT_LLM", "claude")
    return {"claude": llms.ClaudeCLI, "ollama": llms.Ollama, "mock": llms.Mock}[kind]()


BOT = None


class H(BaseHTTPRequestHandler):
    def log_message(self, *a):
        pass

    def _ok(self):
        return self.headers.get("Host", "") in ("127.0.0.1:%d" % PORT, "localhost:%d" % PORT)

    def _send(self, code, body, ctype="application/json; charset=utf-8"):
        b = body if isinstance(body, bytes) else body.encode("utf-8")
        self.send_response(code)
        self.send_header("Content-Type", ctype)
        self.send_header("Content-Length", str(len(b)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(b)

    def do_GET(self):
        if not self._ok():
            return self._send(403, "{}")
        if self.path == "/":
            with open(os.path.join(ROOT, "ui", "index.html"), "rb") as f:
                return self._send(200, f.read(), "text/html; charset=utf-8")
        if self.path == "/api/queues":
            return self._send(200, json.dumps({"handoffs": STORE.read("handoffs")[-20:], "leads": STORE.read("leads")[-20:]}, ensure_ascii=False))
        self._send(404, "{}")

    def do_POST(self):
        if not self._ok() or self.headers.get("Origin", "") not in ("http://127.0.0.1:%d" % PORT, "http://localhost:%d" % PORT):
            return self._send(403, "{}")
        n = int(self.headers.get("Content-Length", "0") or 0)
        if n > 4000:
            return self._send(413, "{}")
        try:
            d = json.loads(self.rfile.read(n) or b"{}")
        except ValueError:
            return self._send(400, "{}")
        if self.path == "/api/chat":
            text = d.get("text")
            if not isinstance(text, str) or not text.strip():
                return self._send(400, "{}")
            sid = d.get("session") if isinstance(d.get("session"), str) and len(d["session"]) <= 20 else None
            s = SESSIONS.get(sid) or Session()
            SESSIONS[s.id] = s
            out = BOT.reply(s, text)
            out["session"] = s.id
            return self._send(200, json.dumps(out, ensure_ascii=False))
        self._send(404, "{}")


if __name__ == "__main__":
    if len(sys.argv) > 1:
        PORT = int(sys.argv[1])
    BOT = Bot(make_llm(), STORE)
    print("Демо-бот: http://127.0.0.1:%d (модель: %s)" % (PORT, os.environ.get("BOT_LLM", "claude")))
    ThreadingHTTPServer(("127.0.0.1", PORT), H).serve_forever()
