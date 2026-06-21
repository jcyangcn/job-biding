import enum


class UserRole(str, enum.Enum):
    admin = "admin"
    bidder = "bidder"
    caller = "caller"


USER_ROLE_VALUES = tuple(role.value for role in UserRole)
