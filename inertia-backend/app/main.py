import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.routers import audit, dashboard, projects, puzzle, verify

logger = logging.getLogger(__name__)
INSECURE_DEFAULT_JWT_SECRET = "inertia-super-secret-change-in-prod"

app = FastAPI(title="Inertia.edu API", version="2.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_methods=["*"],
    allow_headers=["*"],
)

if settings.JWT_SECRET == INSECURE_DEFAULT_JWT_SECRET:
    logger.warning(
        "SECURITY WARNING: JWT_SECRET is set to the well-known default value. "
        "Set JWT_SECRET to a strong random secret via the .env file or environment "
    )

app.include_router(audit.router)
app.include_router(puzzle.router)
app.include_router(verify.router)
app.include_router(dashboard.router)
app.include_router(projects.router)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok", "version": app.version}
