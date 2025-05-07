from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from .. import models, schemas
from ..database import get_db
from passlib.context import CryptContext
from datetime import datetime, timedelta
from jose import JWTError, jwt
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

router = APIRouter()
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/token")  # Update the tokenUrl with leading slash

# JWT Configuration
SECRET_KEY = "your-secret-key-here"  # Change this to a secure secret key
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password):
    return pwd_context.hash(password)

def authenticate_user(db: Session, email: str, password: str):
    user = db.query(models.User).filter(models.User.email == email).first()
    if not user:
        return False
    if not verify_password(password, user.hashed_password):
        return False
    return user

def create_access_token(data: dict, expires_delta: timedelta = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

async def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    
    user = db.query(models.User).filter(models.User.email == email).first()
    if user is None:
        raise credentials_exception
    return user

async def get_current_hr_user(current_user: models.User = Depends(get_current_user)):
    if current_user.role.lower() != "hr":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to perform this action"
        )
    return current_user

@router.post("/users/", response_model=schemas.User)
async def create_user(
    user: schemas.UserCreate,
    current_user: models.User = Depends(get_current_hr_user),
    db: Session = Depends(get_db)
):
    try:
        logger.info(f"Creating new user with email: {user.email}")
        
        # Check if user already exists
        db_user = db.query(models.User).filter(models.User.email == user.email).first()
        if db_user:
            logger.error(f"Email already registered: {user.email}")
            raise HTTPException(status_code=400, detail="Email already registered")
        
        # Check if employee_id already exists
        if user.employee_id:
            existing_employee = db.query(models.User).filter(models.User.employee_id == user.employee_id).first()
            if existing_employee:
                logger.error(f"Employee ID already exists: {user.employee_id}")
                raise HTTPException(status_code=400, detail="Employee ID already exists")
        
        # Hash the password
        hashed_password = pwd_context.hash(user.password)
        
        # Create new user with all fields
        db_user = models.User(
            email=user.email,
            hashed_password=hashed_password,
            full_name=user.full_name,
            role=user.role,
            employee_id=user.employee_id,
            first_name=user.first_name,
            last_name=user.last_name,
            phone=user.phone,
            department=user.department,
            position=user.position,
            hire_date=user.hire_date,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow()
        )
        
        db.add(db_user)
        db.commit()
        db.refresh(db_user)
        
        # Create default leave balance
        leave_balance = models.LeaveBalance(
            employee_id=db_user.id,
            annual_leave=10.0,
            sick_leave=5.0,
            casual_leave=5.0,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow()
        )
        db.add(leave_balance)
        db.commit()
        
        logger.info(f"Successfully created user with ID: {db_user.id}")
        return db_user
    except Exception as e:
        logger.error(f"Error creating user: {str(e)}")
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to create user: {str(e)}")

@router.get("/users/", response_model=List[schemas.User])
async def read_users(
    skip: int = 0,
    limit: int = 100,
    current_user: models.User = Depends(get_current_hr_user),
    db: Session = Depends(get_db)
):
    try:
        logger.info("Fetching users list")
        users = db.query(models.User).offset(skip).limit(limit).all()
        return users
    except Exception as e:
        logger.error(f"Error fetching users: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch users: {str(e)}")

@router.get("/users/{user_id}", response_model=schemas.User)
async def read_user(
    user_id: int,
    current_user: models.User = Depends(get_current_hr_user),
    db: Session = Depends(get_db)
):
    try:
        logger.info(f"Fetching user with ID: {user_id}")
        db_user = db.query(models.User).filter(models.User.id == user_id).first()
        if db_user is None:
            logger.error(f"User not found with ID: {user_id}")
            raise HTTPException(status_code=404, detail="User not found")
        return db_user
    except Exception as e:
        logger.error(f"Error fetching user: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch user: {str(e)}")

@router.put("/users/{user_id}", response_model=schemas.User)
async def update_user(
    user_id: int,
    user: schemas.UserUpdate,
    current_user: models.User = Depends(get_current_hr_user),
    db: Session = Depends(get_db)
):
    try:
        logger.info(f"Updating user with ID: {user_id}")
        db_user = db.query(models.User).filter(models.User.id == user_id).first()
        if db_user is None:
            logger.error(f"User not found with ID: {user_id}")
            raise HTTPException(status_code=404, detail="User not found")
        
        update_data = user.model_dump(exclude_unset=True)
        if "password" in update_data:
            update_data["hashed_password"] = pwd_context.hash(update_data.pop("password"))
        
        for key, value in update_data.items():
            setattr(db_user, key, value)
        
        db_user.updated_at = datetime.utcnow()
        db.commit()
        db.refresh(db_user)
        logger.info(f"Successfully updated user with ID: {user_id}")
        return db_user
    except Exception as e:
        logger.error(f"Error updating user: {str(e)}")
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to update user: {str(e)}")

@router.delete("/users/{user_id}")
async def delete_user(
    user_id: int,
    current_user: models.User = Depends(get_current_hr_user),
    db: Session = Depends(get_db)
):
    try:
        logger.info(f"Deleting user with ID: {user_id}")
        db_user = db.query(models.User).filter(models.User.id == user_id).first()
        if db_user is None:
            logger.error(f"User not found with ID: {user_id}")
            raise HTTPException(status_code=404, detail="User not found")
        
        # Prevent deleting the last HR user
        if db_user.role.lower() == "hr":
            hr_count = db.query(models.User).filter(models.User.role.lower() == "hr").count()
            if hr_count <= 1:
                logger.error("Cannot delete the last HR user")
                raise HTTPException(status_code=400, detail="Cannot delete the last HR user")
        
        db.delete(db_user)
        db.commit()
        logger.info(f"Successfully deleted user with ID: {user_id}")
        return {"message": "User deleted successfully"}
    except Exception as e:
        logger.error(f"Error deleting user: {str(e)}")
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to delete user: {str(e)}") 