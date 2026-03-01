from fastapi import APIRouter

from app.api import advisor, analytics, assistant, budgets, demo, transactions

api_router = APIRouter()
api_router.include_router(transactions.router)
api_router.include_router(budgets.router)
api_router.include_router(analytics.router)
api_router.include_router(advisor.router)
api_router.include_router(assistant.router)
api_router.include_router(demo.router)
