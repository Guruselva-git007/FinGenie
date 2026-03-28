from fastapi import APIRouter

from app.api import advisor, analytics, assistant, auth, automation, budgets, dashboard, demo, planning, profile, transactions

api_router = APIRouter()
api_router.include_router(transactions.router)
api_router.include_router(auth.router)
api_router.include_router(budgets.router)
api_router.include_router(analytics.router)
api_router.include_router(advisor.router)
api_router.include_router(assistant.router)
api_router.include_router(automation.router)
api_router.include_router(planning.router)
api_router.include_router(profile.router)
api_router.include_router(dashboard.router)
api_router.include_router(demo.router)
