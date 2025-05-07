from sqlalchemy import create_engine, MetaData, Table, Column, Integer, String, DateTime, Boolean, ForeignKey, Float, Text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, relationship
from datetime import datetime, date
from passlib.context import CryptContext
import logging
import os

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Database URL
SQLALCHEMY_DATABASE_URL = "sqlite:///./hrms.db"

# Create engine
engine = create_engine(
    SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False}
)

# Create SessionLocal class
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Create Base class
Base = declarative_base()

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Define all models
class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True)
    hashed_password = Column(String)
    full_name = Column(String)
    role = Column(String, default="employee")
    employee_id = Column(String, unique=True, nullable=True)
    first_name = Column(String, nullable=True)
    last_name = Column(String, nullable=True)
    phone = Column(String, nullable=True)
    department = Column(String, nullable=True)
    position = Column(String, nullable=True)
    hire_date = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    attendance_records = relationship("Attendance", back_populates="user")
    leave_requests = relationship("LeaveRequest", back_populates="user")
    leave_balance = relationship("LeaveBalance", back_populates="user", uselist=False)

class Attendance(Base):
    __tablename__ = "attendance"

    id = Column(Integer, primary_key=True, index=True)
    employee_id = Column(Integer, ForeignKey("users.id"))
    date = Column(DateTime)
    check_in = Column(DateTime)
    check_out = Column(DateTime, nullable=True)
    status = Column(String)
    late_entry = Column(Boolean, default=False)
    early_exit = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    user = relationship("User", back_populates="attendance_records")

class LeaveRequest(Base):
    __tablename__ = "leave_requests"

    id = Column(Integer, primary_key=True, index=True)
    employee_id = Column(Integer, ForeignKey("users.id"))
    leave_type = Column(String)
    start_date = Column(DateTime)
    end_date = Column(DateTime)
    reason = Column(Text)
    status = Column(String, default="pending")
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    user = relationship("User", back_populates="leave_requests")

class LeaveBalance(Base):
    __tablename__ = "leave_balance"

    id = Column(Integer, primary_key=True, index=True)
    employee_id = Column(Integer, ForeignKey("users.id"), unique=True)
    annual_leave = Column(Float, default=0)
    sick_leave = Column(Float, default=0)
    casual_leave = Column(Float, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    user = relationship("User", back_populates="leave_balance")

def init_db():
    """Initialize the database by creating all tables."""
    try:
        logger.info("Creating database tables...")
        Base.metadata.create_all(bind=engine)
        logger.info("Database tables created successfully!")
    except Exception as e:
        logger.error(f"Error creating database tables: {str(e)}")
        raise

def create_default_users():
    """Create default HR and employee users."""
    try:
        db = SessionLocal()
        
        # Check if HR user exists
        hr_user = db.query(User).filter(User.role == "hr").first()
        if not hr_user:
            # Create HR user
            hr_user = User(
                email="hr@example.com",
                hashed_password=pwd_context.hash("hr123"),
                full_name="HR Admin",
                role="hr",
                employee_id="HR001",
                first_name="HR",
                last_name="Admin",
                department="Human Resources",
                position="HR Manager",
                hire_date=datetime.utcnow()
            )
            db.add(hr_user)
            logger.info("Default HR user created successfully!")

        # Check if employee user exists
        emp_user = db.query(User).filter(User.role == "employee").first()
        if not emp_user:
            # Create employee user
            emp_user = User(
                email="employee@example.com",
                hashed_password=pwd_context.hash("emp123"),
                full_name="John Employee",
                role="employee",
                employee_id="EMP001",
                first_name="John",
                last_name="Employee",
                phone="9876543210",
                department="IT",
                position="Software Developer",
                hire_date=datetime.utcnow()
            )
            db.add(emp_user)
            logger.info("Default employee user created successfully!")

        # Create leave balances for users
        for user in [hr_user, emp_user]:
            if not user.leave_balance:
                leave_balance = LeaveBalance(
                    employee_id=user.id,
                    annual_leave=20.0,  # 20 days annual leave
                    sick_leave=10.0,    # 10 days sick leave
                    casual_leave=5.0    # 5 days casual leave
                )
                db.add(leave_balance)
                logger.info(f"Leave balance created for user {user.email}")

        db.commit()
        logger.info("Default users and leave balances created successfully!")
    except Exception as e:
        logger.error(f"Error creating default users: {str(e)}")
        db.rollback()
        raise
    finally:
        db.close()

def setup_database():
    """Main function to set up the database."""
    try:
        # Remove existing database file if it exists
        if os.path.exists("hrms.db"):
            os.remove("hrms.db")
            logger.info("Existing database file removed.")

        # Initialize database
        init_db()
        
        # Create default users and leave balances
        create_default_users()
        
        logger.info("Database setup completed successfully!")
        return True
    except Exception as e:
        logger.error(f"Database setup failed: {str(e)}")
        return False

if __name__ == "__main__":
    setup_database() 
 