from dataclasses import dataclass

import httpx
import jwt
from fastapi import Depends, HTTPException, Request
from jwt import PyJWKClient

from app.config import settings
from app.db import connect, new_id, now, row_to_dict

_jwks_clients: dict[str, PyJWKClient] = {}


@dataclass
class AuthUser:
    id: str
    email: str
    name: str
    oid: str
    provider: str


def _jwks_client(tenant: str) -> PyJWKClient:
    if tenant not in _jwks_clients:
        url = f"https://login.microsoftonline.com/{tenant}/discovery/v2.0/keys"
        _jwks_clients[tenant] = PyJWKClient(url, cache_keys=True)
    return _jwks_clients[tenant]


def upsert_user(*, email: str, name: str, oid: str, provider: str) -> AuthUser:
    with connect() as conn:
        existing = conn.execute("SELECT * FROM users WHERE oid = ?", (oid,)).fetchone()
        if existing:
            conn.execute(
                "UPDATE users SET email = ?, name = ? WHERE id = ?",
                (email, name, existing["id"]),
            )
            conn.commit()
            row = conn.execute("SELECT * FROM users WHERE id = ?", (existing["id"],)).fetchone()
        else:
            uid = new_id("u_")
            conn.execute(
                "INSERT INTO users (id, email, name, oid, provider, created_at) VALUES (?,?,?,?,?,?)",
                (uid, email, name, oid, provider, now()),
            )
            conn.commit()
            row = conn.execute("SELECT * FROM users WHERE id = ?", (uid,)).fetchone()
    data = row_to_dict(row)
    assert data
    return AuthUser(
        id=data["id"],
        email=data["email"],
        name=data.get("name") or "",
        oid=data["oid"],
        provider=data["provider"],
    )


def verify_microsoft_token(access_token: str) -> AuthUser:
    if not settings.azure_client_id:
        raise HTTPException(status_code=503, detail="AZURE_CLIENT_ID not configured on server")

    tenants = [settings.azure_tenant_id]
    if settings.azure_tenant_id != "common":
        tenants.append("common")

    last_err: Exception | None = None
    claims = None
    for tenant in tenants:
        try:
            client = _jwks_client(tenant)
            signing_key = client.get_signing_key_from_jwt(access_token)
            claims = jwt.decode(
                access_token,
                signing_key.key,
                algorithms=["RS256"],
                audience=settings.azure_client_id,
                options={"verify_iss": False},
            )
            break
        except Exception as exc:  # noqa: BLE001 — try next tenant
            last_err = exc
            claims = None

    if claims is None:
        # Fallback: call Graph /me with the token (works for delegated Graph tokens)
        try:
            with httpx.Client(timeout=15.0) as http:
                resp = http.get(
                    "https://graph.microsoft.com/v1.0/me",
                    headers={"Authorization": f"Bearer {access_token}"},
                )
            if resp.status_code == 200:
                me = resp.json()
                return upsert_user(
                    email=me.get("mail") or me.get("userPrincipalName") or "unknown@bci",
                    name=me.get("displayName") or "",
                    oid=me.get("id") or new_id("oid_"),
                    provider="microsoft",
                )
        except Exception as exc:  # noqa: BLE001
            last_err = exc
        raise HTTPException(status_code=401, detail=f"invalid Microsoft token: {last_err}")

    email = claims.get("preferred_username") or claims.get("email") or claims.get("upn") or ""
    name = claims.get("name") or ""
    oid = claims.get("oid") or claims.get("sub") or new_id("oid_")
    return upsert_user(email=email, name=name, oid=oid, provider="microsoft")


def get_current_user(request: Request) -> AuthUser:
    auth = request.headers.get("Authorization", "")
    if not auth.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="missing bearer token")
    token = auth.removeprefix("Bearer ").strip()
    if token.startswith("dev:"):
        if not settings.allow_dev_auth:
            raise HTTPException(status_code=401, detail="dev auth disabled")
        # format: dev:email|name
        payload = token[4:]
        email, _, name = payload.partition("|")
        return upsert_user(
            email=email or "designer@beltcollins.local",
            name=name or "BCI Designer",
            oid=f"dev:{email or 'designer'}",
            provider="dev",
        )
    return verify_microsoft_token(token)


CurrentUser = Depends(get_current_user)
