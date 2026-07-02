from fastapi import APIRouter, Depends, HTTPException, status, Request
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from backend.core.database import get_db
from backend.services.auth_service import verify_password, create_access_token
from backend.models.user import User
from backend.core.config import settings
from datetime import timedelta
from jose import JWTError, jwt
import bcrypt
import os
import json

router = APIRouter()
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/auth/login")

async def get_current_user(token: str = Depends(oauth2_scheme), db=Depends(get_db)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, settings.JWT_SECRET, algorithms=[settings.JWT_ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
        
    user_data = await db.users.find_one({"email": email})
    if user_data is None:
        raise credentials_exception
    return User(**user_data)

@router.post("/login")
async def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends()):
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": form_data.username}, expires_delta=access_token_expires
    )
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": {
            "name": "Teacher",
            "email": form_data.username,
            "school": "Z.P. High School, Hyderabad",
            "subjects": ["Biology", "Physics", "Chemistry", "Maths", "Social Science", "Hindi", "English", "Telugu"],
        }
    }

@router.post("/google")
async def google_login(request: Request, db=Depends(get_db)):
    body = await request.json()
    credential = body.get("credential")
    display_name = body.get("displayName", "")
    print(f"[Google] Request received, credential length: {len(credential or '')}, display_name: {display_name}")

    if not credential:
        raise HTTPException(status_code=400, detail="Missing Google credential")

    if not settings.GOOGLE_CLIENT_ID:
        raise HTTPException(status_code=500, detail="Google OAuth not configured (GOOGLE_CLIENT_ID missing)")
    print(f"[Google] Client ID configured: {settings.GOOGLE_CLIENT_ID[:20]}...")

    try:
        from google.oauth2 import id_token
        from google.auth.transport import requests as google_requests

        idinfo = id_token.verify_oauth2_token(
            credential,
            google_requests.Request(),
            settings.GOOGLE_CLIENT_ID,
        )
        print(f"[Google] Token verified. email={idinfo.get('email')}, name={idinfo.get('name')}")
    except Exception as e:
        print(f"[Google] Token verification FAILED: {str(e)}")
        raise HTTPException(status_code=401, detail=f"Invalid Google token: {str(e)}")

    google_email = idinfo.get("email")
    if not google_email:
        raise HTTPException(status_code=400, detail="Google account has no email")

    google_name = idinfo.get("name", "")

    existing = await db.users.find_one({"email": google_email})
    print(f"[Google] User lookup: {google_email} -> {'found' if existing else 'not found'}")
    if existing:
        access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
        access_token = create_access_token(
            data={"sub": existing["email"]}, expires_delta=access_token_expires
        )
        print(f"[Google] Returning existing user, token created: {access_token[:20]}...")
        return {
            "access_token": access_token,
            "token_type": "bearer",
            "user": {
                "name": existing.get("name", google_name),
                "email": existing["email"],
                "school": existing.get("school", ""),
                "subjects": existing.get("subjects", ["Biology"]),
            },
        }

    user_name = display_name or google_name or "Teacher"
    try:
        hashed = bcrypt.hashpw("google-oauth-no-password".encode("utf-8"), bcrypt.gensalt()).decode("utf-8")
        user_doc = {
            "_id": f"google-{google_email.replace('@', '-at-')}",
            "name": user_name,
            "email": google_email,
            "school": "",
            "subjects": ["Biology"],
            "password_hash": hashed,
        }
        await db.users.insert_one(user_doc)
        print(f"[Google] New user created: {google_email}")
    except Exception as e:
        print(f"[Google] User creation FAILED: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to create user: {str(e)}")

    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": google_email}, expires_delta=access_token_expires
    )
    print(f"[Google] New user token created: {access_token[:20]}...")
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": {
            "name": user_name,
            "email": google_email,
            "school": "",
            "subjects": ["Biology"],
        },
    }


@router.get("/google-config")
async def get_google_config():
    return {"clientId": settings.GOOGLE_CLIENT_ID}

@router.get("/health")
async def health_check(db=Depends(get_db)):
    # Ping MongoDB with a short timeout so WarmUp can distinguish "backend up
    # but DB unreachable" from "backend up and healthy". Returns 503 if DB
    # isn't answering — the frontend WarmUp component shows the wake-up UI.
    try:
        await db.command("ping")
        return {"status": "ok", "db": "ok"}
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"db unreachable: {e.__class__.__name__}")

@router.post("/feedback")
async def submit_feedback(request: Request):
    body = await request.json()
    feedback_dir = os.path.join(os.path.dirname(__file__), "..", "..", "feedback_logs")
    os.makedirs(feedback_dir, exist_ok=True)
    log_path = os.path.join(feedback_dir, "feedback.jsonl")
    with open(log_path, "a") as f:
        f.write(json.dumps(body) + "\n")
    return {"status": "ok", "message": "Feedback saved"}

@router.get("/me", response_model=User)
async def read_users_me(current_user: User = Depends(get_current_user)):
    return current_user
