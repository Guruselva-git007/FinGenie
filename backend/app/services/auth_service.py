from __future__ import annotations

import base64
import hashlib
import hmac
import os
import re
from datetime import datetime, timedelta, timezone

import jwt

from app.core.config import settings


def normalize_email(value: str) -> str:
    return value.strip().lower()


def build_username_seed(email: str) -> str:
    local = normalize_email(email).split("@")[0]
    slug = re.sub(r"[^a-z0-9_]+", "_", local).strip("_")
    return slug or "fingenie_user"


def hash_password(password: str) -> str:
    salt = os.urandom(16)
    digest = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, 120000)
    return f"{base64.b64encode(salt).decode()}${base64.b64encode(digest).decode()}"


def verify_password(password: str, password_hash: str) -> bool:
    try:
        raw_salt, raw_digest = password_hash.split("$", 1)
        salt = base64.b64decode(raw_salt.encode())
        expected = base64.b64decode(raw_digest.encode())
    except Exception:
        return False

    actual = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, 120000)
    return hmac.compare_digest(actual, expected)


def create_access_token(user_id: int, email: str) -> str:
    now = datetime.now(timezone.utc)
    payload = {
        "sub": str(user_id),
        "email": normalize_email(email),
        "iat": int(now.timestamp()),
        "exp": int((now + timedelta(minutes=settings.access_token_expire_minutes)).timestamp()),
    }
    return jwt.encode(payload, settings.auth_secret_key, algorithm="HS256")


def decode_access_token(token: str) -> dict:
    return jwt.decode(token, settings.auth_secret_key, algorithms=["HS256"])
