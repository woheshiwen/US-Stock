import json
import sqlite3
import time
import uuid
from pathlib import Path

from app.config import settings

DB_PATH = Path(settings.data_dir) / "stdio.db"
OUTPUT_DIR = Path(settings.data_dir) / "outputs"


def connect() -> sqlite3.Connection:
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(DB_PATH, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    return conn


def init_db() -> None:
    with connect() as conn:
        conn.executescript(
            """
            CREATE TABLE IF NOT EXISTS users (
                id TEXT PRIMARY KEY,
                email TEXT NOT NULL,
                name TEXT,
                oid TEXT UNIQUE,
                provider TEXT NOT NULL,
                created_at REAL NOT NULL
            );
            CREATE TABLE IF NOT EXISTS projects (
                id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL,
                title TEXT NOT NULL,
                brief TEXT,
                created_at REAL NOT NULL,
                updated_at REAL NOT NULL
            );
            CREATE TABLE IF NOT EXISTS generations (
                id TEXT PRIMARY KEY,
                project_id TEXT NOT NULL,
                user_id TEXT NOT NULL,
                tool TEXT NOT NULL,
                prompt TEXT NOT NULL,
                negative_prompt TEXT,
                status TEXT NOT NULL,
                provider TEXT,
                model TEXT,
                image_path TEXT,
                error TEXT,
                meta_json TEXT,
                created_at REAL NOT NULL
            );
            CREATE TABLE IF NOT EXISTS agent_messages (
                id TEXT PRIMARY KEY,
                project_id TEXT NOT NULL,
                user_id TEXT NOT NULL,
                role TEXT NOT NULL,
                content TEXT NOT NULL,
                created_at REAL NOT NULL
            );
            """
        )


def row_to_dict(row: sqlite3.Row | None) -> dict | None:
    if row is None:
        return None
    return dict(row)


def new_id(prefix: str = "") -> str:
    return f"{prefix}{uuid.uuid4().hex}" if prefix else uuid.uuid4().hex


def now() -> float:
    return time.time()


def dumps(data: dict | list | None) -> str:
    return json.dumps(data or {}, ensure_ascii=False)
