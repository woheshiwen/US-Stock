from fastapi import APIRouter, Depends, Query
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.db import get_db
from app.schemas.models import LeadOut

router = APIRouter(prefix="/leads", tags=["leads"])


def _serialize(row) -> dict:
    item = dict(row)
    for key in ("created_at", "publish_date"):
        if item.get(key) is not None:
            item[key] = str(item[key])
    return LeadOut(**item).model_dump()


@router.get("")
def list_leads(
    track: str | None = None,
    status: str | None = None,
    assigned_to: int | None = None,
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
):
    clauses = ["1=1"]
    params: dict = {"limit": size, "offset": (page - 1) * size}
    if track:
        clauses.append("track = :track")
        params["track"] = track
    if status:
        clauses.append("status = :status")
        params["status"] = status
    if assigned_to is not None:
        clauses.append("assigned_to = :assigned_to")
        params["assigned_to"] = assigned_to

    where = " AND ".join(clauses)
    total = db.execute(text(f"SELECT COUNT(*) FROM project_leads WHERE {where}"), params).scalar() or 0
    rows = (
        db.execute(
            text(
                f"""
                SELECT id, title, source_url, source_type, province, city, track, stage,
                       estimated_amount, publish_date, owner_company, ai_summary,
                       ai_match_score, status, assigned_to, linked_client, created_at
                FROM project_leads
                WHERE {where}
                ORDER BY COALESCE(ai_match_score, 0) DESC, id DESC
                LIMIT :limit OFFSET :offset
                """
            ),
            params,
        )
        .mappings()
        .all()
    )
    return {
        "count": total,
        "page": page,
        "size": size,
        "leads": [_serialize(r) for r in rows],
    }
