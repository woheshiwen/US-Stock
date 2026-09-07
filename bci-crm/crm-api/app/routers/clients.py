from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.db import get_db
from app.schemas.models import ClientCreate, ClientOut

router = APIRouter(prefix="/clients", tags=["clients"])


def _row_to_client(row) -> dict:
    item = dict(row)
    for key in ("created_at", "updated_at"):
        if item.get(key) is not None:
            item[key] = str(item[key])
    return ClientOut(**item).model_dump()


@router.get("")
def list_clients(
    track: str | None = None,
    level: str | None = None,
    assigned_to: int | None = None,
    search: str | None = None,
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
):
    clauses = ["1=1"]
    params: dict = {"limit": size, "offset": (page - 1) * size}
    if track:
        clauses.append("track = :track")
        params["track"] = track
    if level:
        clauses.append("level = :level")
        params["level"] = level
    if assigned_to is not None:
        clauses.append("assigned_to = :assigned_to")
        params["assigned_to"] = assigned_to
    if search:
        clauses.append("company_name LIKE :search")
        params["search"] = f"%{search}%"

    where = " AND ".join(clauses)
    total = db.execute(text(f"SELECT COUNT(*) FROM clients WHERE {where}"), params).scalar() or 0
    rows = (
        db.execute(
            text(
                f"""
                SELECT id, company_name, industry, track, level, city, province,
                       status, assigned_to, source, created_at, updated_at
                FROM clients
                WHERE {where}
                ORDER BY id DESC
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
        "clients": [_row_to_client(r) for r in rows],
    }


@router.post("")
def create_client(data: ClientCreate, db: Session = Depends(get_db)):
    # Collision detection (撞单)
    existing = (
        db.execute(
            text(
                """
                SELECT c.id, c.company_name, c.assigned_to, u.name AS owner_name
                FROM clients c
                LEFT JOIN users u ON u.id = c.assigned_to
                WHERE LOWER(c.company_name) = LOWER(:name)
                LIMIT 1
                """
            ),
            {"name": data.company_name},
        )
        .mappings()
        .first()
    )
    if existing:
        return {
            "warning": "撞单预警",
            "existing_client": dict(existing),
            "created": False,
        }

    result = db.execute(
        text(
            """
            INSERT INTO clients
              (company_name, industry, track, level, city, province, status, assigned_to, source)
            VALUES
              (:company_name, :industry, :track, :level, :city, :province, :status, :assigned_to, :source)
            """
        ),
        data.model_dump(),
    )
    db.commit()
    new_id = result.lastrowid
    if not new_id:
        new_id = db.execute(text("SELECT MAX(id) FROM clients")).scalar()

    row = (
        db.execute(
            text(
                """
                SELECT id, company_name, industry, track, level, city, province,
                       status, assigned_to, source, created_at, updated_at
                FROM clients WHERE id = :id
                """
            ),
            {"id": new_id},
        )
        .mappings()
        .one()
    )
    return {"created": True, "client": _row_to_client(row)}


@router.get("/{client_id}")
def get_client(client_id: int, db: Session = Depends(get_db)):
    row = (
        db.execute(
            text(
                """
                SELECT id, company_name, industry, track, level, city, province,
                       status, assigned_to, source, created_at, updated_at
                FROM clients WHERE id = :id
                """
            ),
            {"id": client_id},
        )
        .mappings()
        .first()
    )
    if not row:
        raise HTTPException(status_code=404, detail="client not found")
    return _row_to_client(row)


@router.get("/{client_id}/timeline")
def client_timeline(client_id: int, db: Session = Depends(get_db)):
    client = (
        db.execute(text("SELECT id, company_name FROM clients WHERE id = :id"), {"id": client_id})
        .mappings()
        .first()
    )
    if not client:
        raise HTTPException(status_code=404, detail="client not found")

    interactions = (
        db.execute(
            text(
                """
                SELECT id, client_id, contact_id, user_id, interaction_type, summary,
                       sentiment, next_action, next_action_date, created_at
                FROM interactions
                WHERE client_id = :id
                ORDER BY created_at DESC, id DESC
                """
            ),
            {"id": client_id},
        )
        .mappings()
        .all()
    )
    leads = (
        db.execute(
            text(
                """
                SELECT id, title, stage, status, ai_match_score, created_at
                FROM project_leads
                WHERE linked_client = :id
                ORDER BY created_at DESC, id DESC
                """
            ),
            {"id": client_id},
        )
        .mappings()
        .all()
    )

    def _serialize(rows):
        out = []
        for r in rows:
            item = dict(r)
            for k, v in list(item.items()):
                if v is not None and not isinstance(v, (str, int, float, bool)):
                    item[k] = str(v)
            out.append(item)
        return out

    return {
        "client": dict(client),
        "interactions": _serialize(interactions),
        "leads": _serialize(leads),
    }
