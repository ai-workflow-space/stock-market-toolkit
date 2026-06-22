from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
import uuid
from app.models import User
from app.database import get_db
from app.schemas import UserRegister, UserLogin, TokenResponse, RefreshRequest, UserResponse
from app.auth import (
    hash_password, verify_password,
    create_access_token, create_refresh_token, decode_token,
    get_current_user,
)

router = APIRouter(prefix="/api/auth", tags=["auth"])

@router.post("/register", response_model=UserResponse, status_code=201)
async def register(data: UserRegister, db: AsyncSession = Depends(get_db)):
    # Check existing email
    existing = await db.execute(
        select(User).where(
            (User.email == data.email) | (User.username == data.username.lower())
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Email or username already registered")
    
    user = User(
        id=str(uuid.uuid4()),
        email=data.email,
        username=data.username.lower(),
        hashed_password=hash_password(data.password),
        created_at=func.now(),
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user

@router.post("/login", response_model=TokenResponse)
async def login(data: UserLogin, db: AsyncSession = Depends(get_db)):
    user = await db.execute(
        select(User).where(
            (User.email == data.email_or_username) |
            (User.username == data.email_or_username.lower())
        )
    )
    user = user.scalar_one_or_none()
    
    if not user or not verify_password(data.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    if not user.is_active:
        raise HTTPException(status_code=403, detail="Account disabled")
    
    access = create_access_token({"sub": user.id})
    refresh = create_refresh_token({"sub": user.id})
    
    return TokenResponse(access_token=access, refresh_token=refresh)

@router.post("/refresh", response_model=TokenResponse)
async def refresh(data: RefreshRequest, db: AsyncSession = Depends(get_db)):
    payload = decode_token(data.refresh_token)
    if payload.get("type") != "refresh":
        raise HTTPException(status_code=401, detail="Invalid token type")
    
    user_id = payload.get("sub")
    user = await db.get(User, user_id)
    
    if not user or not user.is_active:
        raise HTTPException(status_code=401, detail="User not found or inactive")
    
    access = create_access_token({"sub": user.id})
    new_refresh = create_refresh_token({"sub": user.id})
    
    return TokenResponse(access_token=access, refresh_token=new_refresh)

@router.get("/me", response_model=UserResponse)
async def get_me(current_user: User = Depends(get_current_user)):
    return current_user

@router.post("/logout")
async def logout(current_user: User = Depends(get_current_user)):
    # In a production app with refresh token rotation, you would blacklist the token here
    return {"message": "Logged out successfully"}
