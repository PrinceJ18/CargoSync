from fastapi import Depends, HTTPException, status
from sqlalchemy.orm import Session
from uuid import UUID
from typing import Dict, Any

from app.core.security import get_current_user
from app.db.database import get_db
from app.db.models import Profile

def get_current_profile(
    payload: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> Profile:
    user_id_str = payload.get("sub")
    if not user_id_str:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token payload")
    
    try:
        user_id = UUID(user_id_str)
    except ValueError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid user ID in token")
        
    profile = db.query(Profile).filter(Profile.id == user_id).first()
    if not profile:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Profile not found for authenticated user")
        
    return profile

def require_admin(profile: Profile = Depends(get_current_profile)) -> Profile:
    if profile.role != 'ADMIN':
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin privileges required")
    return profile
