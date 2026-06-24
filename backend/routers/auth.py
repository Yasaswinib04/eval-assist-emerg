from fastapi import APIRouter, Depends, HTTPException, status, Request
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from backend.core.database import get_db
from backend.services.auth_service import verify_password, create_access_token
from backend.models.user import User
from backend.core.config import settings
from datetime import timedelta
from jose import JWTError, jwt
import bcrypt

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
async def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends(), db=Depends(get_db)):
    user = await db.users.find_one({"email": form_data.username})
    if not user or not verify_password(form_data.password, user["password_hash"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user["email"]}, expires_delta=access_token_expires
    )
    
    return {
        "access_token": access_token, 
        "token_type": "bearer",
        "user": {
            "name": user["name"],
            "email": user["email"],
            "school": user["school"],
            "subjects": user.get("subjects", ["Biology"])
        }
    }

@router.post("/google")
async def google_login(request: Request, db=Depends(get_db)):
    body = await request.json()
    credential = body.get("credential")
    display_name = body.get("displayName", "")

    if not credential:
        raise HTTPException(status_code=400, detail="Missing Google credential")

    if not settings.GOOGLE_CLIENT_ID:
        raise HTTPException(status_code=500, detail="Google OAuth not configured (GOOGLE_CLIENT_ID missing)")

    try:
        from google.oauth2 import id_token
        from google.auth.transport import requests as google_requests

        idinfo = id_token.verify_oauth2_token(
            credential,
            google_requests.Request(),
            settings.GOOGLE_CLIENT_ID,
        )
    except Exception as e:
        raise HTTPException(status_code=401, detail=f"Invalid Google token: {str(e)}")

    google_email = idinfo.get("email")
    if not google_email:
        raise HTTPException(status_code=400, detail="Google account has no email")

    google_name = idinfo.get("name", "")

    existing = await db.users.find_one({"email": google_email})
    if existing:
        access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
        access_token = create_access_token(
            data={"sub": existing["email"]}, expires_delta=access_token_expires
        )
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

    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": google_email}, expires_delta=access_token_expires
    )
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


@router.get("/me", response_model=User)
async def read_users_me(current_user: User = Depends(get_current_user)):
    return current_user
