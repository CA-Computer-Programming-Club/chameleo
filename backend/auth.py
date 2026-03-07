from fastapi import APIRouter, HTTPException, Header
from pydantic import BaseModel
from google.oauth2 import id_token
from google.auth.transport import requests as google_requests
from jose import jwt
from datetime import datetime, timedelta, timezone
from config import SECRET_KEY, ALGORITHM

GOOGLE_CLIENT_ID = (
    "131708705239-02b01cemnlljld61bp6vgmmstf7c96ov.apps.googleusercontent.com"
)

SESSION_EXPIRE_MINUTES = 60 * 24 * 90  # 90 days


router = APIRouter()


class GoogleAuthRequest(BaseModel):
    id_token: str


class GoogleAuthResponse(BaseModel):
    session_token: str
    user: dict


class CurrentUser(BaseModel):
    id: str
    email: str | None = None
    name: str | None = None


async def get_current_user(authorization: str = Header(None)) -> CurrentUser:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing or invalid auth header")
    token = authorization.split(" ", 1)[1]

    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str | None = payload.get("sub")
        if user_id is None:
            raise HTTPException(status_code=401, detail="Invalid token payload")

        return CurrentUser(
            id=user_id,
            email=payload.get("email"),
            name=payload.get("name"),
        )
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid or expired token")


@router.post("/auth/google", response_model=GoogleAuthResponse)
def auth_google(payload: GoogleAuthRequest):
    try:
        # Verify the token with Google
        idinfo = id_token.verify_oauth2_token(
            payload.id_token,
            google_requests.Request(),
            GOOGLE_CLIENT_ID,
        )

        user_id = idinfo["sub"]  # Google unique ID
        email = idinfo.get("email")
        name = idinfo.get("name")
        raw_picture = idinfo.get("picture")
        if raw_picture and "=s96-c" in raw_picture:
            picture = raw_picture.replace("=s96-c", "=s512-c")
        else:
            picture = raw_picture

        user_data = {
            "id": user_id,
            "name": name,
            "email": email,
            "photo": picture,
        }

        expire = datetime.now(timezone.utc) + timedelta(minutes=SESSION_EXPIRE_MINUTES)
        to_encode = {
            "sub": user_id,
            "email": email,
            "name": name,
            "exp": expire,
        }

        session_token = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

        return GoogleAuthResponse(session_token=session_token, user=user_data)

    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid Google ID token")
