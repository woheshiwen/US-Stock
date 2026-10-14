"""Internal routes for BCI-Brain — require X-Internal-Token."""

from fastapi import APIRouter, Depends, Header, HTTPException, Query
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.config import settings
from app.db import get_db

router = APIRouter(prefix="/internal", tags=["internal"])


def require_internal_token(x_internal_token: str | None = Header(default=None)) -> None:
    if not x_internal_token or x_internal_token != settings.internal_api_token:
        raise HTTPException(status_code=401, detail="invalid or missing X-Internal-Token")


@router.get("/clients", dependencies=[Depends(require_internal_token)])
def internal_list_clients(
    wecom_userid: str | None = Query(None, description="企微 userid → 映射 CRM users"),
    user_id: int | None = None,
    search: str | None = None,
    db: Session = Depends(get_db),
):
    """Brain 调 CRM 拿客户事实；按 userid / user_id 收窄范围（bd 仅自己）。"""
    resolved_user_id = user_id
    role = "admin"

    if wecom_userid:
        user = (
            db.execute(
                text(
                    "SELECT id, role FROM users WHERE wechat_work_id = :wid AND is_active"
                ),
                {"wid": wecom_userid},
            )
            .mappings()
            .first()
        )
        if not user:
            raise HTTPException(status_code=404, detail="wecom user not mapped in CRM")
        resolved_user_id = user["id"]
        role = user["role"]
    elif user_id is not None:
        user = (
            db.execute(text("SELECT id, role FROM users WHERE id = :id"), {"id": user_id})
            .mappings()
            .first()
        )
        if not user:
            raise HTTPException(status_code=404, detail="user not found")
        role = user["role"]

    clauses = ["1=1"]
    params: dict = {}
    if role == "bd" and resolved_user_id is not None:
        clauses.append("assigned_to = :uid")
        params["uid"] = resolved_user_id
    if search:
        clauses.append("company_name LIKE :search")
        params["search"] = f"%{search}%"

    where = " AND ".join(clauses)
    rows = (
        db.execute(
            text(
                f"""
                SELECT id, company_name, track, level, city, status, assigned_to
                FROM clients
                WHERE {where}
                ORDER BY id DESC
                LIMIT 50
                """
            ),
            params,
        )
        .mappings()
        .all()
    )
    return {
        "scope_role": role,
        "scope_user_id": resolved_user_id,
        "count": len(rows),
        "clients": [dict(r) for r in rows],
    }
