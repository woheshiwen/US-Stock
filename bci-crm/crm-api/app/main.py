from contextlib import asynccontextmanager

from fastapi import FastAPI

from app.config import settings
from app.db import SessionLocal, engine
from app.routers import ai, clients, health, interactions, internal, leads, users, wecom
from app.schema_sql import init_schema, seed_if_empty


@asynccontextmanager
async def lifespan(_app: FastAPI):
    if settings.auto_init_schema:
        init_schema(engine)
        db = SessionLocal()
        try:
            seed_if_empty(db)
        finally:
            db.close()
    yield


app = FastAPI(
    title="BCI CRM API Router Server",
    version="0.2.0",
    description=(
        "Belt Collins CRM — API Router Server on port 8100. "
        "Modular FastAPI APIRouters for health/users/clients/interactions/leads/wecom/internal/ai."
    ),
    lifespan=lifespan,
)

app.include_router(health.router)
app.include_router(users.router)
app.include_router(clients.router)
app.include_router(interactions.router)
app.include_router(leads.router)
app.include_router(wecom.router)
app.include_router(internal.router)
app.include_router(ai.router)


@app.get("/")
def root():
    return {
        "service": "bci-crm-api-router-server",
        "version": "0.2.0",
        "docs": "/docs",
        "routers": [
            "/health",
            "/users",
            "/clients",
            "/interactions",
            "/leads",
            "/wecom/callback",
            "/internal/clients",
            "/ai/ask",
        ],
    }
