"""AI ask entry — Phase 1 local retrieval stub (Brain wiring later)."""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.db import get_db
from app.schemas.models import AskRequest, AskResponse

router = APIRouter(prefix="/ai", tags=["ai"])


@router.post("/ask", response_model=AskResponse)
def ask(data: AskRequest, db: Session = Depends(get_db)):
    user = (
        db.execute(text("SELECT id, name, role FROM users WHERE id = :id"), {"id": data.user_id})
        .mappings()
        .first()
    )
    if not user:
        raise HTTPException(status_code=404, detail="user not found")

    sources: list[dict] = []
    snippets: list[str] = []

    if data.client_id is not None:
        client = (
            db.execute(
                text(
                    """
                    SELECT id, company_name, track, level, city, status, assigned_to
                    FROM clients WHERE id = :id
                    """
                ),
                {"id": data.client_id},
            )
            .mappings()
            .first()
        )
        if not client:
            raise HTTPException(status_code=404, detail="client not found")
        if user["role"] == "bd" and client["assigned_to"] != data.user_id:
            raise HTTPException(status_code=403, detail="no access to this client")
        sources.append({"type": "client", **dict(client)})
        snippets.append(
            f"客户 {client['company_name']}（{client['track']}/{client['level']}，{client['city']}）状态 {client['status']}"
        )

        interactions = (
            db.execute(
                text(
                    """
                    SELECT summary, interaction_type, created_at
                    FROM interactions
                    WHERE client_id = :id
                    ORDER BY id DESC LIMIT 3
                    """
                ),
                {"id": data.client_id},
            )
            .mappings()
            .all()
        )
        for ix in interactions:
            sources.append({"type": "interaction", "summary": ix["summary"]})
            snippets.append(f"沟通[{ix['interaction_type']}]: {ix['summary']}")
    else:
        # Keyword-ish search constrained by role
        params: dict = {"q": f"%{data.question}%"}
        role_filter = ""
        if user["role"] == "bd":
            role_filter = "AND assigned_to = :uid"
            params["uid"] = data.user_id
        rows = (
            db.execute(
                text(
                    f"""
                    SELECT id, company_name, track, level, city, status
                    FROM clients
                    WHERE company_name LIKE :q {role_filter}
                    ORDER BY id DESC LIMIT 5
                    """
                ),
                params,
            )
            .mappings()
            .all()
        )
        for r in rows:
            sources.append({"type": "client", **dict(r)})
            snippets.append(f"{r['company_name']} · {r['track']} · {r['level']}")

    if snippets:
        answer = "基于 CRM 权限内检索：\n- " + "\n- ".join(snippets)
    else:
        answer = "权限范围内未命中客户/沟通记录。可补充客户名或先录入沟通。"

    db.execute(
        text(
            """
            INSERT INTO audit_logs (user_id, action, entity_type, entity_id, detail)
            VALUES (:user_id, 'ai_ask', 'ai', NULL, :detail)
            """
        ),
        {"user_id": data.user_id, "detail": data.question[:300]},
    )
    db.commit()

    return AskResponse(
        answer=answer,
        sources=sources,
        note="Phase 1 local stub — later forward to BCI-Brain Hindsight :8888 with same scope",
    )
