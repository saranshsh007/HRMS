from sqlalchemy import create_engine
from datetime import date, timedelta
from sqlalchemy.orm import sessionmaker
from app.database import Base
from app.models import User, LeaveBalance, LeaveRequest, Asset, Attendance, Policy
from app.routers.users import get_password_hash
import logging
from datetime import datetime

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Database URL
SQLALCHEMY_DATABASE_URL = "sqlite:///./hrms.db"

# Create engine
engine = create_engine(
    SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False}
)

# Create SessionLocal
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def setup_database():
    try:
        # Create all tables
        logger.info("Creating database tables...")
        Base.metadata.create_all(bind=engine)
        
        # Create a session
        db = SessionLocal()
        
        # Check if HR user exists
        hr_user = db.query(User).filter(User.email == "hr@example.com").first()
        if not hr_user:
            logger.info("Creating HR user...")
            hr_user = User(
                email="hr@example.com",
                hashed_password=get_password_hash("hr123"),
                full_name="HR Admin",
                role="hr",
                first_name="HR",
                last_name="Admin",
                department="Human Resources",
                position="HR Manager"
            )
            db.add(hr_user)
            db.commit()
            db.refresh(hr_user)
            
            # Create leave balance for HR
            hr_leave_balance = LeaveBalance(
                employee_id=hr_user.id,
                annual_leave=20.0,
                sick_leave=10.0,
                casual_leave=10.0
            )
            db.add(hr_leave_balance)
            db.commit()
        
        # Check if regular user exists
        regular_user = db.query(User).filter(User.email == "employee@example.com").first()
        if not regular_user:
            logger.info("Creating regular user...")
            regular_user = User(
                email="employee@example.com",
                hashed_password=get_password_hash("emp123"),
                full_name="John Doe",
                role="employee",
                first_name="John",
                last_name="Doe",
                department="IT",
                position="Software Engineer"
            )
            db.add(regular_user)
            db.commit()
            db.refresh(regular_user)
            
            # Create leave balance for regular user
            emp_leave_balance = LeaveBalance(
                employee_id=regular_user.id,
                annual_leave=15.0,
                sick_leave=7.0,
                casual_leave=7.0
            )
            db.add(emp_leave_balance)
            db.commit()
        
        # Create default policies


        today = date.today()
        expiry = today + timedelta(days=365)

        policies = [
            Policy(
                title="Leave Policy",
                description="Details about annual, sick, and casual leaves.",
                content="Employees are entitled to annual leave, sick leave, and casual leave as per company policy.",
                category="Leave",
                effective_date=today,
                expiry_date=expiry,
                created_at=datetime.now(),
                updated_at=datetime.now(),
                created_by=hr_user.id
            ),
            Policy(
                title="Attendance Policy",
                description="Expectations for employee attendance.",
                content="Employees must check in and out daily. Late arrivals and early departures must be justified.",
                category="Attendance",
                effective_date=today,
                expiry_date=expiry,
                created_at=datetime.now(),
                updated_at=datetime.now(),
                created_by=hr_user.id
            ),
            Policy(
                title="Asset Management Policy",
                description="Guidelines for handling company assets.",
                content="Company assets must be properly maintained and returned when no longer needed.",
                category="Asset Management",
                effective_date=today,
                expiry_date=expiry,
                created_at=datetime.now(),
                updated_at=datetime.now(),
                created_by=hr_user.id
            )
        ]
        
        for policy in policies:
            existing_policy = db.query(Policy).filter(Policy.title == policy.title).first()
            if not existing_policy:
                db.add(policy)
        
        db.commit()
        logger.info("Database setup completed successfully!")
        
    except Exception as e:
        logger.error(f"Error setting up database: {str(e)}")
        raise
    finally:
        db.close()

if __name__ == "__main__":
    setup_database()