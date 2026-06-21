from sqlalchemy import select
from sqlalchemy.orm import Session

from app.auth import create_user, hash_password
from app.db_models import User
from app.models import UserCreateRequest, UserUpdateRequest
from app.user_roles import UserRole


def list_users(db: Session) -> list[User]:
    return list(db.scalars(select(User).order_by(User.id)).all())


def get_user(db: Session, user_id: int) -> User | None:
    return db.get(User, user_id)


def update_user(db: Session, user: User, data: UserUpdateRequest) -> User:
    if data.username is not None and data.username != user.username:
        existing = db.scalar(select(User.id).where(User.username == data.username))
        if existing is not None:
            raise ValueError("Username already taken")
        user.username = data.username

    if data.full_name is not None:
        user.full_name = data.full_name
    if data.role is not None:
        user.role = UserRole(data.role)
    if data.description is not None:
        user.description = data.description or None
    if data.password:
        user.password = hash_password(data.password)

    db.commit()
    db.refresh(user)
    return user


def delete_user(db: Session, user: User) -> None:
    db.delete(user)
    db.commit()


def create_user_record(db: Session, data: UserCreateRequest) -> User:
    return create_user(
        db,
        full_name=data.full_name,
        username=data.username,
        password=data.password,
        role=UserRole(data.role),
        description=data.description,
    )
