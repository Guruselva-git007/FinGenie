from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db_session
from app.models.user import User
from app.schemas.auth import (
    AuthLoginRequest,
    AuthRegisterRequest,
    AuthSessionResponse,
    AuthenticatedUserRead,
    GuestAccessRequest,
)
from app.services.auth_service import build_username_seed, create_access_token, hash_password, normalize_email, verify_password

router = APIRouter(prefix="/auth", tags=["auth"])


def _ensure_unique_username(db: Session, seed: str) -> str:
    candidate = seed
    counter = 1

    while db.scalar(select(User.id).where(User.username == candidate)):
        counter += 1
        candidate = f"{seed}_{counter}"

    return candidate


def _build_session_response(user: User) -> dict:
    return {
        "access_token": create_access_token(user.id, user.email),
        "token_type": "bearer",
        "user": user,
    }


@router.post("/register", response_model=AuthSessionResponse, status_code=status.HTTP_201_CREATED)
def register(payload: AuthRegisterRequest, db: Session = Depends(get_db_session)):
    email = normalize_email(payload.email)
    if db.scalar(select(User.id).where(func.lower(User.email) == email)):
        raise HTTPException(status_code=409, detail="An account with this email already exists")

    username = _ensure_unique_username(db, build_username_seed(email))
    user = User(
        full_name=payload.full_name.strip(),
        email=email,
        username=username,
        password_hash=hash_password(payload.password),
        is_guest=False,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return _build_session_response(user)


@router.post("/login", response_model=AuthSessionResponse)
def login(payload: AuthLoginRequest, db: Session = Depends(get_db_session)):
    email = normalize_email(payload.email)
    user = db.scalar(select(User).where(func.lower(User.email) == email))
    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    return _build_session_response(user)


@router.post("/guest", response_model=AuthSessionResponse, status_code=status.HTTP_201_CREATED)
def guest_access(payload: GuestAccessRequest, db: Session = Depends(get_db_session)):
    timestamp = datetime.utcnow().strftime("%Y%m%d%H%M%S")
    email = f"guest_{timestamp}@fingenie.local"
    username = _ensure_unique_username(db, f"guest_{timestamp}")
    user = User(
        full_name=payload.full_name.strip(),
        email=email,
        username=username,
        password_hash=hash_password(f"guest-{timestamp}"),
        is_guest=True,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return _build_session_response(user)


@router.get("/me", response_model=AuthenticatedUserRead)
def auth_me(current_user: User = Depends(get_current_user)):
    return current_user
