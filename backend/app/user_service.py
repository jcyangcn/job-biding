from sqlalchemy import String, cast, or_, select
from sqlalchemy.orm import Session

from app.auth import create_user, hash_password
from app.db_models import User
from app.models import UserCreateRequest, UserUpdateRequest
from app.pagination import (
    normalize_page_params,
    page_dict,
    paginate_select,
    resolve_sort,
)
from app.user_roles import UserRole


def list_users(db: Session) -> list[User]:
    result = list_users_page(db, page=1, page_size=200)
    return result["items"]


def list_users_page(
    db: Session,
    *,
    page: int | None = None,
    page_size: int | None = None,
    search: str | None = None,
    role: str | None = None,
    sort_by: str | None = None,
    sort_dir: str | None = None,
) -> dict:
    params = normalize_page_params(page, page_size)
    query = select(User)

    search_text = (search or "").strip()
    if search_text:
        pattern = f"%{search_text}%"
        query = query.where(
            or_(
                User.username.ilike(pattern),
                User.full_name.ilike(pattern),
                User.description.ilike(pattern),
                cast(User.id, String).ilike(pattern),
            )
        )

    role_text = (role or "").strip()
    if role_text:
        try:
            query = query.where(User.role == UserRole(role_text))
        except ValueError:
            query = query.where(False)

    sort_map = {
        "id": User.id,
        "username": User.username,
        "full_name": User.full_name,
        "role": User.role,
        "description": User.description,
        "created_at": User.created_at,
    }
    column, descending = resolve_sort(sort_by, sort_dir, sort_map, "id")
    order_expr = column.desc() if descending else column.asc()
    query = query.order_by(order_expr, User.id.asc())

    rows, total = paginate_select(db, query, params)
    return page_dict(list(rows), total, params)


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
