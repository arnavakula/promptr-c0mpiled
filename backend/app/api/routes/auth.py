import urllib.parse

import httpx
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.models.user import User
from app.schemas.auth import UserResponse
from app.services.auth_service import (
    create_access_token,
    create_or_get_google_user,
)
from app.api.dependencies import get_current_user

router = APIRouter(prefix="/api/auth", tags=["auth"])

GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth"
GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"
GOOGLE_USERINFO_URL = "https://www.googleapis.com/oauth2/v2/userinfo"


@router.get("/google")
def google_login():
    params = {
        "client_id": settings.GOOGLE_CLIENT_ID,
        "redirect_uri": settings.GOOGLE_REDIRECT_URI,
        "response_type": "code",
        "scope": "openid email profile",
        "access_type": "offline",
        "prompt": "select_account",
    }
    url = f"{GOOGLE_AUTH_URL}?{urllib.parse.urlencode(params)}"
    return RedirectResponse(url=url)


@router.get("/google/callback")
async def google_callback(code: str, db: Session = Depends(get_db)):
    # Exchange auth code for tokens
    async with httpx.AsyncClient() as client:
        token_resp = await client.post(
            GOOGLE_TOKEN_URL,
            data={
                "code": code,
                "client_id": settings.GOOGLE_CLIENT_ID,
                "client_secret": settings.GOOGLE_CLIENT_SECRET,
                "redirect_uri": settings.GOOGLE_REDIRECT_URI,
                "grant_type": "authorization_code",
            },
        )

    if token_resp.status_code != 200:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Failed to exchange authorization code with Google.",
        )

    token_data = token_resp.json()
    access_token = token_data.get("access_token")
    if not access_token:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No access token received from Google.",
        )

    # Fetch user info
    async with httpx.AsyncClient() as client:
        userinfo_resp = await client.get(
            GOOGLE_USERINFO_URL,
            headers={"Authorization": f"Bearer {access_token}"},
        )

    if userinfo_resp.status_code != 200:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Failed to fetch user info from Google.",
        )

    userinfo = userinfo_resp.json()
    email = userinfo.get("email", "").strip().lower()
    google_id = userinfo.get("id", "")
    full_name = userinfo.get("name", email.split("@")[0])

    if not email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No email returned from Google.",
        )

    # Check email domain / whitelist
    allowed_domain = settings.ALLOWED_EMAIL_DOMAIN
    whitelisted = [e.strip().lower() for e in settings.EMAIL_WHITELIST]
    if email not in whitelisted and not email.endswith(f"@{allowed_domain}"):
        redirect_url = (
            f"{settings.FRONTEND_URL}/login"
            f"?error={urllib.parse.quote(f'Only @{allowed_domain} accounts are allowed.')}"
        )
        return RedirectResponse(url=redirect_url)

    # Check user cap (only for new users)
    existing_user = db.query(User).filter(User.email == email).first()
    if not existing_user:
        total_users = db.query(User).count()
        if total_users >= settings.MAX_USERS:
            redirect_url = (
                f"{settings.FRONTEND_URL}/login"
                f"?error={urllib.parse.quote('Beta is full. Maximum number of users reached.')}"
            )
            return RedirectResponse(url=redirect_url)

    user = create_or_get_google_user(db, google_id, email, full_name)
    jwt_token = create_access_token(data={"sub": str(user.id)})

    redirect_url = f"{settings.FRONTEND_URL}/auth/callback?token={jwt_token}"
    return RedirectResponse(url=redirect_url)


@router.get("/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user)):
    return current_user
