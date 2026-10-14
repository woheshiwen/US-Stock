"""Portable Phase-1 schema (SQLite + PostgreSQL)."""

from sqlalchemy import text
from sqlalchemy.engine import Engine
from sqlalchemy.orm import Session

SEED_USERS = [
    (1, "Nancy", "bd", None, None, 1),
    (2, "Candy", "bd", None, None, 1),
    (3, "Genie", "bd", None, None, 1),
    (4, "Pipi", "bd", None, None, 1),
    (5, "Fraya", "bd", None, None, 1),
    (6, "Janice", "team_lead", None, None, 1),
    (7, "Celia", "analyst", None, None, 1),
    (8, "Ben", "admin", None, None, 1),
]


def _is_sqlite(engine: Engine) -> bool:
    return engine.dialect.name == "sqlite"


def init_schema(engine: Engine) -> None:
    id_type = "INTEGER PRIMARY KEY AUTOINCREMENT" if _is_sqlite(engine) else "SERIAL PRIMARY KEY"
    ts_default = "CURRENT_TIMESTAMP" if _is_sqlite(engine) else "NOW()"
    bool_true = "1" if _is_sqlite(engine) else "TRUE"

    ddl = f"""
    CREATE TABLE IF NOT EXISTS users (
        id              {id_type},
        name            VARCHAR(50) NOT NULL,
        role            VARCHAR(30) NOT NULL,
        wechat_work_id  VARCHAR(100),
        email           VARCHAR(100),
        is_active       BOOLEAN DEFAULT {bool_true},
        created_at      TIMESTAMP DEFAULT {ts_default}
    );

    CREATE TABLE IF NOT EXISTS clients (
        id              {id_type},
        company_name    VARCHAR(200) NOT NULL,
        industry        VARCHAR(50),
        track           VARCHAR(50),
        level           VARCHAR(5) DEFAULT 'L1',
        city            VARCHAR(50),
        province        VARCHAR(50),
        status          VARCHAR(30) DEFAULT '跟进中',
        assigned_to     INTEGER REFERENCES users(id),
        source          VARCHAR(50),
        created_at      TIMESTAMP DEFAULT {ts_default},
        updated_at      TIMESTAMP DEFAULT {ts_default}
    );

    CREATE TABLE IF NOT EXISTS contacts (
        id              {id_type},
        client_id       INTEGER REFERENCES clients(id),
        name            VARCHAR(100) NOT NULL,
        title           VARCHAR(100),
        phone           VARCHAR(20),
        wechat          VARCHAR(100),
        email           VARCHAR(100),
        decision_power  VARCHAR(20),
        created_at      TIMESTAMP DEFAULT {ts_default}
    );

    CREATE TABLE IF NOT EXISTS interactions (
        id               {id_type},
        client_id        INTEGER REFERENCES clients(id),
        contact_id       INTEGER REFERENCES contacts(id),
        user_id          INTEGER REFERENCES users(id),
        interaction_type VARCHAR(30),
        summary          TEXT NOT NULL,
        raw_content      TEXT,
        sentiment        VARCHAR(20),
        next_action      TEXT,
        next_action_date DATE,
        created_at       TIMESTAMP DEFAULT {ts_default}
    );

    CREATE TABLE IF NOT EXISTS project_leads (
        id               {id_type},
        title            VARCHAR(500) NOT NULL,
        source_url       VARCHAR(1000),
        source_type      VARCHAR(50),
        province         VARCHAR(50),
        city             VARCHAR(50),
        track            VARCHAR(50),
        stage            VARCHAR(30),
        estimated_amount REAL,
        publish_date     DATE,
        owner_company    VARCHAR(200),
        content_raw      TEXT,
        ai_summary       TEXT,
        ai_match_score   REAL,
        status           VARCHAR(20) DEFAULT 'new',
        assigned_to      INTEGER REFERENCES users(id),
        linked_client    INTEGER REFERENCES clients(id),
        created_at       TIMESTAMP DEFAULT {ts_default}
    );

    CREATE TABLE IF NOT EXISTS audit_logs (
        id           {id_type},
        user_id      INTEGER,
        action       VARCHAR(50) NOT NULL,
        entity_type  VARCHAR(50),
        entity_id    INTEGER,
        detail       TEXT,
        created_at   TIMESTAMP DEFAULT {ts_default}
    );
    """

    with engine.begin() as conn:
        for stmt in ddl.split(";"):
            s = stmt.strip()
            if s:
                conn.execute(text(s))


def seed_if_empty(db: Session) -> None:
    count = db.execute(text("SELECT COUNT(*) FROM users")).scalar() or 0
    if count > 0:
        return

    for user_id, name, role, wechat, email, is_active in SEED_USERS:
        db.execute(
            text(
                """
                INSERT INTO users (id, name, role, wechat_work_id, email, is_active)
                VALUES (:id, :name, :role, :wechat, :email, :is_active)
                """
            ),
            {
                "id": user_id,
                "name": name,
                "role": role,
                "wechat": wechat,
                "email": email,
                "is_active": is_active,
            },
        )

    # Demo client + lead so list endpoints are non-empty out of the box.
    db.execute(
        text(
            """
            INSERT INTO clients (company_name, industry, track, level, city, province, assigned_to, source)
            VALUES ('华润置地华南', '房企', '文旅酒店', 'L2', '深圳', '广东', 1, '手动')
            """
        )
    )
    db.execute(
        text(
            """
            INSERT INTO project_leads
              (title, source_type, province, city, track, stage, status, assigned_to, ai_match_score)
            VALUES
              ('某滨海文旅酒店景观提升招标', '手动', '广东', '珠海', '文旅酒店', '招标', 'new', 1, 0.82)
            """
        )
    )
    db.commit()
