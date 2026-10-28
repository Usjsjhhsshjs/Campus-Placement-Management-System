"""Password hashing, JWT creation/decoding and password-reset token helpers."""
import hashlib
import secrets
from datetime import datetime, timedelta, timezone

import bcrypt
import jwt

from app.core.config import get_settings

ALGORITHM = "HS256"


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(password: str, password_hash: str) -> bool:
    try:
        return bcrypt.checkpw(password.encode("utf-8"), password_hash.encode("utf-8"))
    except ValueError:
        return False


def create_access_token(user_id: int, role: str) -> str:
    settings = get_settings()
    expires = datetime.now(timezone.utc) + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    payload = {"sub": str(user_id), "role": role, "exp": expires}
    return jwt.encode(payload, settings.SECRET_KEY, algorithm=ALGORITHM)


def decode_access_token(token: str) -> dict:
    """Raises jwt.ExpiredSignatureError / jwt.PyJWTError for bad tokens."""
    return jwt.decode(token, get_settings().SECRET_KEY, algorithms=[ALGORITHM])


def hash_token(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def generate_reset_token() -> tuple[str, str]:
    """Returns (token_for_the_user, hash_to_store_in_db)."""
    token = secrets.token_urlsafe(32)
    return token, hash_token(token)
