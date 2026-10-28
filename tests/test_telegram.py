import io
import json
import os
import sys
import tempfile
import unittest
import urllib.error
from pathlib import Path
from unittest import mock

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from bot import engine, llm  # noqa: E402
from bot import telegram as tg  # noqa: E402

TOKEN = "123456789:ABCdefGHIjklMNOpqrsTUVwxyz0123456789"


def j(reply="OK", intent="faq", lead=None, handoff=False, reason=None):
    return json.dumps({"reply": reply, "intent": intent, "lead": lead or {}, "handoff": handoff, "handoff_reason": reason}, ensure_ascii=False)


class FakeApi:
    """Запоминает вызовы; методы возвращают заготовки."""
    def __init__(self, updates=None):
        self.calls, self.updates = [], list(updates or [])

    def call(self, method, params=None, timeout=70):
        self.calls.append((method, params))
        if method == "getUpdates":
            u, self.updates = self.updates, []
            return u
        return {}

    def sent(self, chat=None):
        return [p["text"] for m, p in self.calls if m == "sendMessage" and (chat is None or p["chat_id"] == chat)]


def upd(i, chat, text=None, ctype="private", **extra):
    m = {"chat": {"id": chat, "type": ctype}}
    if text is not None:
        m["text"] = text
    m.update(extra)
    return {"update_id": i, "message": m}


def runner(fn=None, operator=None, api=None, clock=None):
    api = api or FakeApi()
    return tg.Runner(api, engine.Bot(llm.Mock(fn or (lambda s, u: j("Hello from the bot")))), operator=operator, clock=clock or (lambda: 1000.0), sleep=lambda s: None, log=lambda *a: None), api


class TokenSafetyTests(unittest.TestCase):
    def test_redact_removes_token_and_lookalikes(self):
        self.assertNotIn(TOKEN, tg.redact("failed https://api.telegram.org/bot%s/getMe" % TOKEN, TOKEN))
        self.assertNotIn("AAH", tg.redact("url bot987654321:AAHxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx/getMe"))
        self.assertEqual(tg.redact("plain text"), "plain text")

    def test_api_errors_never_contain_the_token(self):
        for exc in (urllib.error.URLError("cannot reach https://api.telegram.org/bot%s/getMe" % TOKEN), RuntimeError("x " + TOKEN),
                    urllib.error.HTTPError("https://api.telegram.org/bot%s/getMe" % TOKEN, 401, "Unauthorized", {}, io.BytesIO(b""))):
            def opener(req, timeout=0, _e=exc):
                raise _e
            with self.assertRaises(tg.TelegramError) as cm:
                tg.Api(TOKEN, opener).call("getMe")
            self.assertNotIn(TOKEN, str(cm.exception))
            self.assertNotIn("bot123456789", str(cm.exception))

    def test_api_ok_false_is_an_error_without_token(self):
        class R:
            def __enter__(s): return s
            def __exit__(s, *a): return False
            def read(s): return json.dumps({"ok": False, "description": "Unauthorized " + TOKEN}).encode()
        with self.assertRaises(tg.TelegramError) as cm:
            tg.Api(TOKEN, lambda req, timeout=0: R()).call("getMe")
        self.assertNotIn(TOKEN, str(cm.exception))

    def test_api_request_shape(self):
        seen = {}

        class R:
            def __enter__(s): return s
            def __exit__(s, *a): return False
            def read(s): return b'{"ok": true, "result": {"username": "demo_bot"}}'

        def opener(req, timeout=0):
            seen["url"], seen["data"] = req.full_url, json.loads(req.data)
            return R()
        self.assertEqual(tg.Api(TOKEN, opener).call("sendMessage", {"chat_id": 1, "text": "hi"}), {"username": "demo_bot"})
        self.assertTrue(seen["url"].endswith("/bot%s/sendMessage" % TOKEN))
        self.assertEqual(seen["data"], {"chat_id": 1, "text": "hi"})

    def test_get_token_sources_and_validation(self):
        with tempfile.TemporaryDirectory() as d:
            envf = os.path.join(d, ".env")
            self.assertEqual(tg.get_token(env={"TELEGRAM_BOT_TOKEN": TOKEN}, keychain=False, dotenv=envf), TOKEN)
            self.assertIsNone(tg.get_token(env={"TELEGRAM_BOT_TOKEN": "not-a-token"}, keychain=False, dotenv=envf))
            open(envf, "w").write('OTHER=1\nTELEGRAM_BOT_TOKEN="%s"\n' % TOKEN)
            self.assertEqual(tg.get_token(env={}, keychain=False, dotenv=envf), TOKEN)
            self.assertIsNone(tg.get_token(env={}, keychain=False, dotenv=os.path.join(d, "missing")))

    def test_operator_id_parsing(self):
        with tempfile.TemporaryDirectory() as d:
            self.assertEqual(tg.get_operator(env={"OPERATOR_CHAT_ID": "123456"}, dotenv=os.path.join(d, "x")), 123456)
            self.assertIsNone(tg.get_operator(env={"OPERATOR_CHAT_ID": "abc"}, dotenv=os.path.join(d, "x")))
            self.assertIsNone(tg.get_operator(env={}, dotenv=os.path.join(d, "x")))

    def test_main_without_token_prints_help_not_secrets_and_returns_2(self):
        with mock.patch.object(tg, "get_token", return_value=None), mock.patch("sys.stdout", new=io.StringIO()) as out:
            self.assertEqual(tg.main(), 2)
        self.assertIn("@BotFather", out.getvalue())

    def test_token_never_reaches_messages_or_logs(self):
        logs = []
        r, api = runner()
        r.log = logs.append
        r.api = api
        r.handle(upd(1, 5, "hello"))
        blob = json.dumps(api.calls) + "".join(logs)
        self.assertNotIn(TOKEN, blob)


class SaveTokenTests(unittest.TestCase):
    def test_bad_token_is_rejected_without_echoing_it(self):
        from bot import save_token
        ok, msg = save_token.save("hunter2-not-a-token", runner=mock.Mock())
        self.assertFalse(ok)
        self.assertNotIn("hunter2", msg)

    def test_good_token_goes_through_stdin_not_argv(self):
        from bot import save_token
        run = mock.Mock(return_value=mock.Mock(returncode=0, stdout="", stderr=""))
        ok, msg = save_token.save("  " + TOKEN + "\n", user="eli", runner=run)
        self.assertTrue(ok)
        args = run.call_args[0][0]
        self.assertEqual(args, ["security", "-i"])
        self.assertNotIn(TOKEN, " ".join(args))                  # в аргументах процесса токена нет
        self.assertIn(TOKEN, run.call_args[1]["input"])
        self.assertNotIn(TOKEN, msg)                              # и в сообщении пользователю тоже

    def test_keychain_failure_is_reported_without_token(self):
        from bot import save_token
        ok, msg = save_token.save(TOKEN, runner=mock.Mock(return_value=mock.Mock(returncode=44, stdout="", stderr="err " + TOKEN)))
        self.assertFalse(ok)
        self.assertNotIn(TOKEN, msg)


class RunnerTests(unittest.TestCase):
    def test_private_text_gets_a_reply_and_typing_action(self):
        r, api = runner()
        r.handle(upd(1, 5, "hi"))
        self.assertEqual(api.sent(5), ["Hello from the bot"])
        self.assertIn("sendChatAction", [m for m, _ in api.calls])

    def test_groups_and_channels_are_ignored(self):
        r, api = runner()
        for t in ("group", "supergroup", "channel"):
            r.handle(upd(1, -100, "hi", ctype=t))
        self.assertEqual(api.calls, [])

    def test_non_text_gets_a_polite_note(self):
        r, api = runner()
        r.handle(upd(1, 5, None, photo=[{"file_id": "x"}]))
        self.assertIn("text messages only", api.sent(5)[0])

    def test_commands(self):
        r, api = runner()
        r.handle(upd(1, 5, "/start"))
        r.handle(upd(2, 5, "/myid"))
        r.handle(upd(3, 5, "/reset"))
        r.handle(upd(4, 5, "/start@demo_bot"))
        sent = api.sent(5)
        self.assertIn("virtual assistant", sent[0])
        self.assertEqual(sent[1], "Your chat id: 5")
        self.assertIn("reset", sent[2].lower())
        self.assertIn("virtual assistant", sent[3])

    def test_sessions_are_per_chat_and_reset_clears(self):
        seen = []
        r, api = runner(lambda s, u: (seen.append(u), j("ok"))[1])
        r.handle(upd(1, 5, "first message"))
        r.handle(upd(2, 6, "other chat"))
        self.assertNotIn("first message", seen[1])             # чужой чат не видит историю
        r.handle(upd(3, 5, "second"))
        self.assertIn("first message", seen[2])
        r.handle(upd(4, 5, "/reset"))
        r.handle(upd(5, 5, "third"))
        self.assertNotIn("first message", seen[3])

    def test_rate_limit_warns_once_then_ignores(self):
        r, api = runner()
        for i in range(30):
            r.handle(upd(i, 7, "spam"))
        self.assertEqual(len([t for t in api.sent(7) if "Too many" in t]), 1)
        self.assertEqual(len([t for t in api.sent(7) if t == "Hello from the bot"]), tg.RATE[0])

    def test_rate_limit_window_expires(self):
        now = [1000.0]
        r, api = runner(clock=lambda: now[0])
        for i in range(tg.RATE[0] + 1):
            r.handle(upd(i, 7, "x"))
        now[0] += 120
        r.handle(upd(99, 7, "after pause"))
        self.assertEqual(api.sent(7)[-1], "Hello from the bot")

    def test_operator_is_notified_once_on_handoff_and_on_booking(self):
        steps = iter([j("Calling you.", "handoff", handoff=True, reason="pain"), j("Still calling.", "handoff", handoff=True, reason="pain"),
                      j("Done", "booking", {"name": "Ana", "service": "cleaning", "when": "Fri 10", "contact": "+351 900"})])
        r, api = runner(lambda s, u: next(steps), operator=999)
        r.handle(upd(1, 5, "severe pain"))
        r.handle(upd(2, 5, "still"))
        ops = api.sent(999)
        self.assertEqual(len([t for t in ops if t.startswith("HANDOFF")]), 1)
        self.assertIn("Reason:", ops[0])
        r2, api2 = runner(lambda s, u: next(steps), operator=999)
        r2.handle(upd(3, 6, "book me"))
        self.assertTrue(any(t.startswith("NEW BOOKING") and "Ana" in t for t in api2.sent(999)))

    def test_no_operator_means_no_extra_messages(self):
        r, api = runner(lambda s, u: j("Calling.", "handoff", handoff=True, reason="x"))
        r.handle(upd(1, 5, "pain"))
        self.assertEqual({p["chat_id"] for m, p in api.calls if m == "sendMessage"}, {5})

    def test_step_advances_offset_and_survives_a_bad_update(self):
        def boom(s, u):
            raise RuntimeError("model down")
        logs = []
        api = FakeApi([upd(10, 5, "a"), {"update_id": 11}, upd(12, 6, "b")])
        r = tg.Runner(api, engine.Bot(llm.Mock(boom)), clock=lambda: 1.0, sleep=lambda s: None, log=logs.append)
        self.assertEqual(r.step(), 3)
        self.assertEqual(r.offset, 13)
        r.api = FakeApi([upd(20, 5, "again")])
        self.assertEqual(r.step(), 1)

    def test_run_forever_backs_off_on_telegram_errors(self):
        sleeps = []

        class Stop(Exception):
            pass

        def sleep(s):
            sleeps.append(s)
            if len(sleeps) == 4:
                raise Stop()
        api = FakeApi()
        api.call = mock.Mock(side_effect=tg.TelegramError("net down"))
        r = tg.Runner(api, engine.Bot(llm.Mock()), sleep=sleep, log=lambda *a: None)
        with self.assertRaises(Stop):
            r.run_forever()
        self.assertEqual(sleeps, [2, 4, 8, 16])

    def test_long_reply_is_cut_to_telegram_limit(self):
        r, api = runner()
        r.send(5, "x" * 9000)
        self.assertEqual(len(api.sent(5)[0]), 4000)


if __name__ == "__main__":
    unittest.main()
