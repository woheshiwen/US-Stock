from fastapi import APIRouter, Depends
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.db import get_db
from app.schemas.models import UserOut

router = APIRouter(prefix="/users", tags=["users"])


@router.get("", response_model=dict)
def list_users(db: Session = Depends(get_db)):
    rows = (
        db.execute(
            text(
                """
                SELECT id, name, wechat_work_id, email, role, is_active, created_at
                FROM users
                ORDER BY id
                """
            )
        )
        .mappings()
        .all()
    )
    users = []
    for r in rows:
        item = dict(r)
        if item.get("created_at") is not None:
            item["created_at"] = str(item["created_at"])
        item["is_active"] = bool(item.get("is_active", True))
        users.append(UserOut(**item).model_dump())
    return {"count": len(users), "users": users}
