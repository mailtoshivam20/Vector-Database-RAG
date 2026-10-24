"""File + SQLite logging for the chat server.

- logs/app.log   : rotating text log (1 MB x 5 files) of every event
- logs/app.db    : SQLite tables `events` (logins, sign-ups, errors) and `chat_logs` (questions + answers)
Passwords are never logged.
"""
import logging
import sqlite3
import threading
import time
from logging.handlers import RotatingFileHandler
from pathlib import Path

LOG_DIR = Path(__file__).parent / "logs"
LOG_DIR.mkdir(exist_ok=True)
DB_PATH = LOG_DIR / "app.db"

logger = logging.getLogger("insurellm")
logger.setLevel(logging.INFO)
if not logger.handlers:
    handler = RotatingFileHandler(LOG_DIR / "app.log", maxBytes=1_000_000, backupCount=5, encoding="utf-8")
    handler.setFormatter(logging.Formatter("%(asctime)s %(levelname)s %(message)s"))
    logger.addHandler(handler)

_lock = threading.Lock()
with sqlite3.connect(DB_PATH) as _db:
    _db.executescript(
        """
        CREATE TABLE IF NOT EXISTS events (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            ts TEXT NOT NULL, level TEXT NOT NULL, event TEXT NOT NULL,
            username TEXT, ip TEXT, detail TEXT
        );
        CREATE TABLE IF NOT EXISTS chat_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            ts TEXT NOT NULL, username TEXT, ip TEXT,
            question TEXT NOT NULL, answer TEXT, sources TEXT,
            duration_ms INTEGER, error TEXT
        );
        """
    )


def _now() -> str:
    return time.strftime("%Y-%m-%d %H:%M:%S")


def _insert(sql: str, params: tuple) -> None:
    try:
        with _lock, sqlite3.connect(DB_PATH) as db:
            db.execute(sql, params)
    except sqlite3.Error:
        logger.exception("Database logging failed")


def log_event(event: str, username: str | None = None, ip: str | None = None,
              detail: str = "", level: str = "INFO") -> None:
    logger.log(getattr(logging, level), "%s user=%s ip=%s %s", event, username, ip, detail)
    _insert("INSERT INTO events (ts, level, event, username, ip, detail) VALUES (?,?,?,?,?,?)",
            (_now(), level, event, username, ip, detail))


def log_chat(username: str | None, ip: str | None, question: str, answer: str | None,
             sources: list[str], duration_ms: int, error: str | None = None) -> None:
    logger.info("chat user=%s ip=%s q_chars=%d duration_ms=%d error=%s",
                username, ip, len(question), duration_ms, error)
    _insert("INSERT INTO chat_logs (ts, username, ip, question, answer, sources, duration_ms, error) "
            "VALUES (?,?,?,?,?,?,?,?)",
            (_now(), username, ip, question, answer, ", ".join(sources), duration_ms, error))
