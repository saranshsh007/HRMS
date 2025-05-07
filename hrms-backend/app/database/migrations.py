from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from app.models import Base  # Ensure you import your models

# SQLite Database configuration
SQLALCHEMY_DATABASE_URL = "sqlite:///./hrms.db"

# Create SQLAlchemy engine
engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False}  # Needed for SQLite
)

# Create SessionLocal class
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def setup_database():
    try:
        # Create all tables
        Base.metadata.create_all(bind=engine)
        return True
    except Exception as e:
        print(f"Error setting up database: {e}")
        return False

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close() 