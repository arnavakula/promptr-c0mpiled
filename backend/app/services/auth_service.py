from datetime import datetime, timedelta

from jose import JWTError, jwt
from sqlalchemy.orm import Session

from app.config import settings
from app.models.user import User


def create_access_token(data: dict) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def decode_access_token(token: str) -> dict | None:
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        return payload
    except JWTError:
        return None


def get_user_by_email(db: Session, email: str) -> User | None:
    return db.query(User).filter(User.email == email).first()


def create_or_get_google_user(db: Session, google_id: str, email: str, full_name: str) -> User:
    user = get_user_by_email(db, email)
    if user:
        if not user.google_id:
            user.google_id = google_id
            db.commit()
            db.refresh(user)
        return user

    user = User(
        email=email,
        full_name=full_name,
        google_id=google_id,
        password_hash=None,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user
