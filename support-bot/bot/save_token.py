"""Кладёт токен Telegram-бота в Keychain, НЕ показывая его: скопируйте токен из @BotFather (он в буфере обмена) и выполните
    pbpaste | python3 -m bot.save_token --clear-clipboard
Токен читается из stdin и передаётся в `security -i` тоже через stdin, а не в аргументах (в `ps` его не видно). Нигде не печатается."""
import getpass
import subprocess
import sys

from bot.telegram import KEYCHAIN_SERVICE, TOKEN_RE


def save(token, user=None, runner=subprocess.run):
    token = (token or "").strip()
    if not TOKEN_RE.match(token):
        return False, "это не похоже на токен бота (формат 123456789:ABC…). Скопируйте токен из @BotFather ещё раз."
    user = user or getpass.getuser()
    r = runner(["security", "-i"], input="add-generic-password -a %s -s %s -U -w %s\n" % (user, KEYCHAIN_SERVICE, token), capture_output=True, text=True, timeout=20)
    if r.returncode != 0:
        return False, "Keychain не принял запись (код %s)." % r.returncode
    return True, "токен сохранён в Keychain (service %s)" % KEYCHAIN_SERVICE


def main():
    ok, msg = save(sys.stdin.read())
    print(msg)
    if ok and "--clear-clipboard" in sys.argv:
        subprocess.run(["pbcopy"], input="", text=True)
        print("буфер обмена очищен")
    return 0 if ok else 1


if __name__ == "__main__":
    raise SystemExit(main())
