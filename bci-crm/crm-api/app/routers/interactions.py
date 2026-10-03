from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.db import get_db
from app.schemas.models import InteractionCreate, InteractionOut

router = APIRouter(prefix="/interactions", tags=["interactions"])


def _serialize(row) -> dict:
    item = dict(row)
    for key in ("created_at", "next_action_date"):
        if item.get(key) is not None:
            item[key] = str(item[key])
    return InteractionOut(**item).model_dump()


@router.get("")
def list_interactions(client_id: int | None = None, db: Session = Depends(get_db)):
    if client_id is None:
        rows = (
            db.execute(
                text(
                    """
                    SELECT id, client_id, contact_id, user_id, interaction_type, summary,
                           raw_content, sentiment, next_action, next_action_date, created_at
                    FROM interactions
                    ORDER BY id DESC
                    LIMIT 100
                    """
                )
            )
            .mappings()
            .all()
        )
    else:
        rows = (
            db.execute(
                text(
                    """
                    SELECT id, client_id, contact_id, user_id, interaction_type, summary,
                           raw_content, sentiment, next_action, next_action_date, created_at
                    FROM interactions
                    WHERE client_id = :client_id
                    ORDER BY id DESC
                    """
                ),
                {"client_id": client_id},
            )
            .mappings()
            .all()
        )
    return {"count": len(rows), "interactions": [_serialize(r) for r in rows]}


@router.post("")
def create_interaction(data: InteractionCreate, db: Session = Depends(get_db)):
    client = db.execute(
        text("SELECT id FROM clients WHERE id = :id"), {"id": data.client_id}
    ).first()
    if not client:
        raise HTTPException(status_code=404, detail="client not found")

    user = db.execute(text("SELECT id FROM users WHERE id = :id"), {"id": data.user_id}).first()
    if not user:
        raise HTTPException(status_code=404, detail="user not found")

    result = db.execute(
        text(
            """
            INSERT INTO interactions
              (client_id, contact_id, user_id, interaction_type, summary,
               raw_content, sentiment, next_action, next_action_date)
            VALUES
              (:client_id, :contact_id, :user_id, :interaction_type, :summary,
               :raw_content, :sentiment, :next_action, :next_action_date)
            """
        ),
        data.model_dump(),
    )
    db.execute(
        text(
            """
            INSERT INTO audit_logs (user_id, action, entity_type, entity_id, detail)
            VALUES (:user_id, 'create', 'interaction', :entity_id, :detail)
            """
        ),
        {
            "user_id": data.user_id,
            "entity_id": result.lastrowid or 0,
            "detail": data.summary[:200],
        },
    )
    db.commit()
    new_id = result.lastrowid or db.execute(text("SELECT MAX(id) FROM interactions")).scalar()
    row = (
        db.execute(
            text(
                """
                SELECT id, client_id, contact_id, user_id, interaction_type, summary,
                       raw_content, sentiment, next_action, next_action_date, created_at
                FROM interactions WHERE id = :id
                """
            ),
            {"id": new_id},
        )
        .mappings()
        .one()
    )
    return {"created": True, "interaction": _serialize(row)}
