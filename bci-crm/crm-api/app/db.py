from collections.abc import Generator

from sqlalchemy import create_engine, event, text
from sqlalchemy.engine import Engine
from sqlalchemy.orm import Session, sessionmaker

from app.config import settings

connect_args: dict = {}
if settings.database_url.startswith("sqlite"):
    connect_args["check_same_thread"] = False

engine = create_engine(
    settings.database_url,
    pool_pre_ping=True,
    connect_args=connect_args,
)


@event.listens_for(Engine, "connect")
def _set_sqlite_pragma(dbapi_connection, connection_record) -> None:
    if settings.database_url.startswith("sqlite"):
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.close()


SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)


def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def check_db() -> dict:
    with engine.connect() as conn:
        if settings.database_url.startswith("sqlite"):
            row = conn.execute(text("SELECT 'bci_crm_dev', 'sqlite'")).one()
            return {"database": row[0], "port": row[1], "dialect": "sqlite"}
        row = conn.execute(text("SELECT current_database(), inet_server_port()")).one()
        return {"database": row[0], "port": row[1], "dialect": "postgresql"}
