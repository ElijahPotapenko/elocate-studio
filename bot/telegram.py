"""Telegram-канал для бота: python3 -m bot.telegram  (long polling, Bot API через стандартную библиотеку).

ТОКЕН: берётся из переменной TELEGRAM_BOT_TOKEN, из Keychain macOS (service «support-bot-telegram») или из файла .env (в .gitignore). Он нигде не печатается:
ни в логах, ни в ошибках (redact), ни в аргументах процесса. Работает только в личных чатах. Команды: /start, /reset, /myid.
Если задан OPERATOR_CHAT_ID, при передаче человеку и готовой заявке боту приходит сообщение оператору (ему же можно написать /myid, чтобы узнать свой id)."""
import json
import os
import re
import subprocess
import sys
import time
import urllib.error
import urllib.request
from collections import defaultdict, deque

from bot import llm as llms
from bot.engine import Bot, Session
from bot.store import Store

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TOKEN_RE = re.compile(r"^\d{6,12}:[A-Za-z0-9_-]{30,50}$")
KEYCHAIN_SERVICE = "support-bot-telegram"
GREETING = "Hello! I'm the virtual assistant of Clínica Sorriso Porto (a demo company). Ask me about prices and opening hours, or book a visit, in any language. / Olá! / Cześć! / Здравствуйте!"
RATE = (20, 60)              # не больше 20 сообщений за 60 секунд с одного чата


def redact(text, token=None):
    """Убирает токен (и всё, что на него похоже) из любого текста, который может попасть в лог или ошибку."""
    s = str(text)
    if token:
        s = s.replace(token, "<hidden>")
    return re.sub(r"bot\d{6,12}:[A-Za-z0-9_-]{20,}", "bot<hidden>", s)


def get_token(env=None, keychain=True, dotenv=None):
    """Токен из окружения, Keychain или .env. None, если не найден или формат неверный (значение не показываем)."""
    env = os.environ if env is None else env
    cands = [env.get("TELEGRAM_BOT_TOKEN")]
    if keychain and sys.platform == "darwin":
        try:
            r = subprocess.run(["security", "find-generic-password", "-a", env.get("USER", ""), "-s", KEYCHAIN_SERVICE, "-w"], capture_output=True, text=True, timeout=10)
            cands.append(r.stdout.strip() if r.returncode == 0 else None)
        except Exception:
            pass
    path = dotenv or os.path.join(ROOT, ".env")
    if os.path.exists(path):
        for line in open(path, encoding="utf-8"):
            if line.startswith("TELEGRAM_BOT_TOKEN="):
                cands.append(line.split("=", 1)[1].strip().strip('"').strip("'"))
    for c in cands:
        if c and TOKEN_RE.match(c):
            return c
    return None


def get_operator(env=None, dotenv=None):
    env = os.environ if env is None else env
    v = env.get("OPERATOR_CHAT_ID")
    path = dotenv or os.path.join(ROOT, ".env")
    if not v and os.path.exists(path):
        for line in open(path, encoding="utf-8"):
            if line.startswith("OPERATOR_CHAT_ID="):
                v = line.split("=", 1)[1].strip()
    return int(v) if v and re.match(r"^-?\d{3,15}$", v) else None


class TelegramError(Exception):
    pass


class Api:
    def __init__(self, token, opener=urllib.request.urlopen):
        self._token, self._open = token, opener

    def call(self, method, params=None, timeout=70):
        req = urllib.request.Request("https://api.telegram.org/bot%s/%s" % (self._token, method), data=json.dumps(params or {}).encode(), headers={"Content-Type": "application/json"})
        try:
            with self._open(req, timeout=timeout) as r:
                d = json.loads(r.read())
        except urllib.error.HTTPError as e:
            raise TelegramError("HTTP %s на %s" % (e.code, method))      # не печатаем e.url: в нём токен
        except Exception as e:
            raise TelegramError(redact("%s: %s" % (type(e).__name__, e), self._token))
        if not d.get("ok"):
            raise TelegramError(redact("%s: %s" % (method, d.get("description", "error")), self._token))
        return d["result"]


class Runner:
    def __init__(self, api, bot, operator=None, clock=time.time, sleep=time.sleep, log=print):
        self.api, self.bot, self.operator, self.clock, self.sleep, self.log = api, bot, operator, clock, sleep, log
        self.sessions = {}
        self.hits = defaultdict(deque)
        self.warned = set()
        self.offset = 0

    def send(self, chat_id, text):
        self.api.call("sendMessage", {"chat_id": chat_id, "text": text[:4000]})

    def limited(self, chat_id):
        q, now = self.hits[chat_id], self.clock()
        while q and now - q[0] > RATE[1]:
            q.popleft()
        q.append(now)
        return len(q) > RATE[0]

    def handle(self, update):
        msg = update.get("message") or {}
        chat = msg.get("chat") or {}
        cid = chat.get("id")
        if cid is None or chat.get("type") != "private":
            return                                           # группы и каналы игнорируем
        if self.limited(cid):
            if cid not in self.warned:
                self.warned.add(cid)
                self.send(cid, "Too many messages. Please wait a minute. / Muitas mensagens, aguarde um minuto.")
            return
        self.warned.discard(cid)
        text = msg.get("text")
        if not isinstance(text, str):
            self.send(cid, "I can read text messages only for now. / Por enquanto só leio mensagens de texto.")
            return
        cmd = text.strip().split()[0].split("@")[0].lower() if text.strip().startswith("/") else ""
        if cmd == "/start":
            self.sessions[cid] = Session()
            return self.send(cid, GREETING)
        if cmd == "/reset":
            self.sessions[cid] = Session()
            return self.send(cid, "Conversation reset. / Conversa reiniciada.")
        if cmd == "/myid":
            return self.send(cid, "Your chat id: %s" % cid)
        s = self.sessions.setdefault(cid, Session(str(cid)))
        try:
            self.api.call("sendChatAction", {"chat_id": cid, "action": "typing"}, timeout=10)
        except TelegramError:
            pass
        was_handoff, was_booked = s.handoff, s.booked
        out = self.bot.reply(s, text)
        self.send(cid, out["reply"])
        if self.operator:
            if out["handoff"] and not was_handoff:
                self.send(self.operator, "HANDOFF (%s) from chat %s\nReason: %s\nLast messages:\n%s" % (s.id, cid, out["handoff_reason"], self._turns(s)))
            if out["booked"] and not was_booked:
                self.send(self.operator, "NEW BOOKING REQUEST from chat %s\n%s" % (cid, "\n".join("%s: %s" % kv for kv in s.lead.items())))

    @staticmethod
    def _turns(s):
        return "\n".join(("Customer: " if r == "user" else "Bot: ") + t[:200] for r, t in s.history[-6:])

    def step(self):
        """Один опрос Telegram; возвращает число обработанных обновлений."""
        updates = self.api.call("getUpdates", {"offset": self.offset, "timeout": 50, "allowed_updates": ["message"]}, timeout=70)
        for u in updates:
            self.offset = max(self.offset, u["update_id"] + 1)
            try:
                self.handle(u)
            except Exception as e:                      # одно плохое сообщение не должно ронять бота
                self.log("[bot] ошибка обработки: %s" % redact(e))
        return len(updates)

    def run_forever(self):
        fails = 0
        while True:
            try:
                self.step()
                fails = 0
            except TelegramError as e:
                fails += 1
                self.log("[bot] Telegram: %s (повтор через %ds)" % (e, min(60, 2 ** fails)))
                self.sleep(min(60, 2 ** fails))


def main():
    token = get_token()
    if not token:
        print("Токен не найден. Создайте бота в Telegram через @BotFather (/newbot), затем положите токен одним из способов:\n"
              "  1) Keychain:  security add-generic-password -a \"$USER\" -s support-bot-telegram -U -w   (токен попросят ввести, он не виден)\n"
              "  2) файл .env в папке проекта, строка TELEGRAM_BOT_TOKEN=...  (файл в .gitignore)\n"
              "  3) переменная окружения TELEGRAM_BOT_TOKEN")
        return 2
    api = Api(token)
    me = api.call("getMe", timeout=15)
    kind = os.environ.get("BOT_LLM", "claude")
    llm = {"claude": llms.ClaudeCLI, "ollama": llms.Ollama, "mock": llms.Mock}[kind]()
    op = get_operator()
    print("Бот @%s запущен (модель: %s, оператор: %s). Останов: Ctrl+C." % (me.get("username"), kind, "задан" if op else "не задан"))
    Runner(api, Bot(llm, Store(os.path.join(ROOT, "data"))), operator=op).run_forever()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
