from datetime import datetime

from pydantic import BaseModel, Field


class AuthRegisterRequest(BaseModel):
    full_name: str = Field(min_length=2, max_length=120)
    email: str = Field(min_length=5, max_length=180)
    password: str = Field(min_length=4, max_length=128)


class AuthLoginRequest(BaseModel):
    email: str = Field(min_length=5, max_length=180)
    password: str = Field(min_length=4, max_length=128)


class GuestAccessRequest(BaseModel):
    full_name: str = Field(default="Guest User", min_length=2, max_length=120)


class AuthenticatedUserRead(BaseModel):
    id: int
    full_name: str
    email: str
    username: str
    is_guest: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class AuthSessionResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: AuthenticatedUserRead
