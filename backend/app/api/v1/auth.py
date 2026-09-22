from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.db.models import Profile, Operator
from app.api.dependencies import get_current_profile
from app.core.security import get_current_user
from app.schemas.profile import ProfileResponse

router = APIRouter()

@router.get("/me", response_model=ProfileResponse)
def get_me(
    profile: Profile = Depends(get_current_profile),
    payload: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    email = payload.get("email")
    
    operator_name = None
    if profile.operator_id:
        operator = db.query(Operator).filter(Operator.id == profile.operator_id).first()
        if operator:
            operator_name = operator.name

    return ProfileResponse(
        id=profile.id,
        role=profile.role,
        operator_id=profile.operator_id,
        operator_name=operator_name,
        email=email
    )
