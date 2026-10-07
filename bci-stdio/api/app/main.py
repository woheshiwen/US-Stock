from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.config import settings
from app.db import OUTPUT_DIR, init_db
from app.routers import auth, generate, projects


@asynccontextmanager
async def lifespan(_app: FastAPI):
    init_db()
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    yield


app = FastAPI(
    title="Belt Collins Stdio API Router",
    version="0.1.0",
    description="API router server for Belt Collins landscape AI studio.",
    lifespan=lifespan,
)

origins = [o.strip() for o in settings.cors_origins.split(",") if o.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins or ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(projects.router)
app.include_router(generate.router)

OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
app.mount("/outputs", StaticFiles(directory=str(OUTPUT_DIR)), name="outputs")


@app.get("/")
def root():
    return {
        "service": "beltcollins-stdio-api-router",
        "version": "0.1.0",
        "docs": "/docs",
        "routers": ["/auth", "/projects", "/generate", "/outputs"],
    }


@app.get("/health")
def health():
    return {
        "status": "ok",
        "openai_configured": bool(settings.openai_api_key),
        "azure_configured": bool(settings.azure_client_id),
        "image_provider": settings.image_provider,
        "allow_dev_auth": settings.allow_dev_auth,
    }
