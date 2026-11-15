"""Провайдеры модели. Бот видит одну функцию: complete(system, user) -> str.
ClaudeCLI: `claude -p` без инструментов и без MCP (бот ничего не может делать, только отвечать текстом). Ollama: локальная модель. Mock: для тестов."""
import json
import subprocess
import urllib.request


class ClaudeCLI:
    def __init__(self, model="claude-haiku-5-5", timeout=120, binary="claude"):
        self.model, self.timeout, self.binary = model, timeout, binary

    def complete(self, system, user):
        # «CONVERSATION:» в начале: текст клиента не может стать флагом командной строки, даже если начинается с «--»
        r = subprocess.run([self.binary, "-p", "CONVERSATION:\n" + user, "--model", self.model, "--tools", "", "--strict-mcp-config", "--no-session-persistence",
                            "--system-prompt", system, "--output-format", "text"], capture_output=True, text=True, timeout=self.timeout)
        if r.returncode != 0:
            raise RuntimeError("claude: " + (r.stderr or r.stdout)[-300:])
        return r.stdout


class Ollama:
    def __init__(self, model="qwen2.5:3b", url="http://127.0.0.1:11434", timeout=120):
        self.model, self.url, self.timeout = model, url, timeout

    def complete(self, system, user):
        body = json.dumps({"model": self.model, "stream": False, "format": "json", "options": {"temperature": 0.2},
                           "messages": [{"role": "system", "content": system}, {"role": "user", "content": user}]}).encode()
        req = urllib.request.Request(self.url + "/api/chat", data=body, headers={"Content-Type": "application/json"})
        with urllib.request.urlopen(req, timeout=self.timeout) as r:
            return json.loads(r.read())["message"]["content"]


class Mock:
    """fn(system, user) -> str; по умолчанию возвращает безопасный ответ-заглушку. calls хранит все обращения для проверок в тестах."""
    def __init__(self, fn=None):
        self.fn, self.calls = fn, []

    def complete(self, system, user):
        self.calls.append((system, user))
        if self.fn:
            return self.fn(system, user)
        return json.dumps({"reply": "OK", "intent": "smalltalk", "lead": {}, "handoff": False, "handoff_reason": None})
