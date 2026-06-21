import bcrypt
from datetime import UTC, datetime, timedelta

import jwt
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.config import settings
from app.db_models import User
from app.models import UserResponse
from app.user_roles import UserRole


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return bcrypt.checkpw(plain_password.encode(), hashed_password.encode())


def create_access_token(user_id: int) -> str:
    expire = datetime.now(UTC) + timedelta(hours=settings.jwt_expire_hours)
    payload = {"sub": str(user_id), "exp": expire}
    return jwt.encode(payload, settings.jwt_secret, algorithm="HS256")


def decode_access_token(token: str) -> int:
    payload = jwt.decode(token, settings.jwt_secret, algorithms=["HS256"])
    return int(payload["sub"])


def get_user_by_id(db: Session, user_id: int) -> User | None:
    return db.get(User, user_id)


def user_to_response(user: User) -> UserResponse:
    return UserResponse(
        id=user.id,
        full_name=user.full_name,
        username=user.username,
        role=user.role.value,
        description=user.description,
    )


def authenticate_user(db: Session, username: str, password: str) -> User | None:
    user = db.scalar(select(User).where(User.username == username))
    if not user or not verify_password(password, user.password):
        return None
    return user


def create_user(
    db: Session,
    *,
    full_name: str,
    username: str,
    password: str,
    role: UserRole = UserRole.bidder,
    description: str | None = None,
) -> User:
    existing = db.scalar(select(User.id).where(User.username == username))
    if existing is not None:
        raise ValueError("Username already taken")

    user = User(
        full_name=full_name,
        username=username,
        password=hash_password(password),
        role=role,
        description=description,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def seed_default_users(db: Session) -> None:
    if db.scalar(select(User.id).limit(1)) is not None:
        return

    db.add(
        User(
            full_name="Administrator",
            username="admin",
            password=hash_password("admin123"),
            role=UserRole.admin,
            description="Default administrator account",
        )
    )
    db.commit()
