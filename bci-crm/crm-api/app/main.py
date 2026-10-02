from fastapi import Depends, FastAPI, HTTPException
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.config import settings
from app.db import SessionLocal, check_db

app = FastAPI(
    title="BCI CRM API",
    version="0.1.0",
    description="Belt Collins CRM — Phase 1 (health + users). Port 8100.",
)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@app.get("/health")
def health():
    try:
        db_info = check_db()
        return {
            "status": "ok",
            "service": "bci-crm-api",
            "listen": f"{settings.crm_api_host}:{settings.crm_api_port}",
            "database": db_info,
        }
    except Exception as exc:
        raise HTTPException(status_code=503, detail=f"database unavailable: {exc}") from exc


@app.get("/users")
def list_users(db: Session = Depends(get_db)):
    rows = db.execute(
        text(
            """
            SELECT id, name, wechat_work_id, email, role, is_active, created_at
            FROM users
            ORDER BY id
            """
        )
    ).mappings().all()
    users = []
    for r in rows:
        item = dict(r)
        if item.get("created_at") is not None:
            item["created_at"] = item["created_at"].isoformat()
        users.append(item)
    return {"count": len(users), "users": users}


@app.get("/")
def root():
    return {
        "service": "bci-crm-api",
        "docs": "/docs",
        "health": "/health",
        "users": "/users",
    }
