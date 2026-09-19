from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
import logging

from app.db.database import get_db

router = APIRouter()
logger = logging.getLogger(__name__)

@router.get("/health")
def health_check(db: Session = Depends(get_db)):
    """
    Lightweight health endpoint verifying application and database connectivity.
    """
    db_status = "ok"
    try:
        from sqlalchemy import text
        db.execute(text("SELECT 1"))
    except Exception as e:
        logger.error(f"Database health check failed: {e}")
        db_status = "failed"
    
    return {
        "status": "ok",
        "database": db_status
    }
