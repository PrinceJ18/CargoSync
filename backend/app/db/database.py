import logging
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from app.core.config import settings

logger = logging.getLogger(__name__)

engine = None
SessionLocal = None

if settings.DATABASE_URL:
    try:
        engine = create_engine(
            settings.DATABASE_URL,
            pool_pre_ping=True,
            pool_size=50,
            max_overflow=20,
        )
        SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    except Exception as e:
        logger.error(f"Failed to create database engine: {e}")
else:
    logger.warning("DATABASE_URL is not set. Database operations will fail.")

Base = declarative_base()

def get_db():
    if not SessionLocal:
        raise RuntimeError("Database connection is not configured")
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
