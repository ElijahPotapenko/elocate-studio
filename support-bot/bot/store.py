"""Очереди для людей: handoffs.jsonl (позвать человека) и leads.jsonl (готовая заявка на запись). Пишем в папку data/ (в .gitignore)."""
import json
import os
import threading

_lock = threading.Lock()


class Store:
    def __init__(self, folder):
        self.folder = folder
        os.makedirs(folder, exist_ok=True)

    def append(self, kind, record):
        with _lock, open(os.path.join(self.folder, kind + ".jsonl"), "a", encoding="utf-8") as f:
            f.write(json.dumps(record, ensure_ascii=False) + "\n")

    def read(self, kind):
        p = os.path.join(self.folder, kind + ".jsonl")
        if not os.path.exists(p):
            return []
        with open(p, encoding="utf-8") as f:
            return [json.loads(l) for l in f if l.strip()]
