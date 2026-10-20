from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from app.auth import AuthUser, CurrentUser, upsert_user, verify_microsoft_token
from app.config import settings

router = APIRouter(prefix="/auth", tags=["auth"])


class MicrosoftLoginBody(BaseModel):
    access_token: str = Field(min_length=10)


class DevLoginBody(BaseModel):
    email: str = "designer@beltcollins.local"
    name: str = "BCI Designer"


@router.get("/config")
def auth_config():
    return {
        "azure_client_id_configured": bool(settings.azure_client_id),
        "azure_tenant_id": settings.azure_tenant_id,
        "allow_dev_auth": settings.allow_dev_auth,
        "image_provider": settings.image_provider,
        "openai_configured": bool(settings.openai_api_key),
        "fal_configured": bool(settings.fal_key),
    }


@router.post("/microsoft")
def login_microsoft(body: MicrosoftLoginBody):
    user = verify_microsoft_token(body.access_token)
    return {
        "access_token": body.access_token,
        "token_type": "microsoft",
        "user": {
            "id": user.id,
            "email": user.email,
            "name": user.name,
            "provider": user.provider,
        },
    }


@router.post("/dev")
def login_dev(body: DevLoginBody):
    if not settings.allow_dev_auth:
        raise HTTPException(status_code=403, detail="dev auth disabled")
    user = upsert_user(
        email=body.email,
        name=body.name,
        oid=f"dev:{body.email}",
        provider="dev",
    )
    token = f"dev:{body.email}|{body.name}"
    return {
        "access_token": token,
        "token_type": "dev",
        "user": {
            "id": user.id,
            "email": user.email,
            "name": user.name,
            "provider": user.provider,
        },
    }


@router.get("/me")
def me(user: AuthUser = CurrentUser):
    return {
        "id": user.id,
        "email": user.email,
        "name": user.name,
        "provider": user.provider,
    }
