from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

from app.config import settings

engine = create_engine(
    settings.database_url,
    pool_pre_ping=True,
    pool_size=5,
    max_overflow=10,
)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)


def check_db() -> dict:
    with engine.connect() as conn:
        row = conn.execute(text("SELECT current_database(), inet_server_port()")).one()
        return {"database": row[0], "port": row[1]}
