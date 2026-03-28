from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.router import api_router
from app.core.config import settings
from app.db.base import Base
from app.db.session import engine
from app.models import (  # noqa: F401
    assistant_task,
    branch_account,
    budget,
    donation,
    feedback_entry,
    net_worth_snapshot,
    savings_goal,
    transaction,
    user,
    user_preference,
    user_profile,
    wealth_account,
)
from app.services.db_migration_service import ensure_runtime_schema

app = FastAPI(title=settings.app_name, version=settings.app_version)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def on_startup() -> None:
    Base.metadata.create_all(bind=engine)
    ensure_runtime_schema(engine)


@app.get("/health")
def health_check():
    return {"status": "ok"}


app.include_router(api_router, prefix=settings.api_prefix)
