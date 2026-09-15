from fastapi import APIRouter

from app.config import settings
from app.db import check_db

router = APIRouter(tags=["health"])


@router.get("/health")
def health():
    db_info = check_db()
    return {
        "status": "ok",
        "service": "bci-crm-api",
        "listen": f"{settings.crm_api_host}:{settings.crm_api_port}",
        "database": db_info,
    }
