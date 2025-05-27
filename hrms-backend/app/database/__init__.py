from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
import os

# Get the absolute path to the database file
BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
DATABASE_URL = os.path.join(BASE_DIR, "hrms.db")

# Log the database path
import logging
logger = logging.getLogger(__name__)
logger.info(f"Using database at: {DATABASE_URL}")

# SQLite Database configuration
SQLALCHEMY_DATABASE_URL = f"sqlite:///{DATABASE_URL}"

# Create SQLAlchemy engine with better error handling
engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={
        "check_same_thread": False,  # Needed for SQLite
        "timeout": 30  # Increase timeout
    },
    echo=True  # Enable SQL query logging
)

# Create SessionLocal class
SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine,
    expire_on_commit=False  # Prevent expired object issues
)

# Create Base class
Base = declarative_base()

# Dependency to get DB session
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close() 