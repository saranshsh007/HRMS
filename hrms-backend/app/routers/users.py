from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from .. import models
from ..schemas import User, UserUpdate, UserCreate
from ..database import get_db
from passlib.context import CryptContext
from datetime import datetime, timedelta
from jose import JWTError, jwt
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
import logging
from sqlalchemy.sql import text

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

router = APIRouter()
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/token")

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

@router.post("/token")
async def login_for_access_token(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db)
):
    try:
        logger.info(f"Login attempt for user: {form_data.username}")
        user = authenticate_user(db, form_data.username, form_data.password)
        if not user:
            logger.error(f"Invalid credentials for user: {form_data.username}")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect username or password",
                headers={"WWW-Authenticate": "Bearer"},
            )
        access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
        access_token = create_access_token(
            data={"sub": user.email, "role": user.role},
            expires_delta=access_token_expires
        )
        logger.info(f"Login successful for user: {form_data.username}")
        return {
            "access_token": access_token,
            "token_type": "bearer",
            "role": user.role,
            "user_id": user.id
        }
    except Exception as e:
        logger.error(f"Error during login: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Login failed: {str(e)}")

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

@router.get("/users/", response_model=List[User])
async def read_users(
    skip: int = 0,
    limit: int = 100,
    current_user: models.User = Depends(get_current_hr_user),
    db: Session = Depends(get_db)
):
    try:
        logger.debug(f"Fetching users list. Current user: {current_user.email}, Role: {current_user.role}")
        
        # Verify database connection
        try:
            db.execute(text("SELECT 1"))
            logger.debug("Database connection verified")
        except Exception as db_error:
            logger.error(f"Database connection error: {str(db_error)}", exc_info=True)
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Database connection error: {str(db_error)}"
            )
        
        # Attempt to fetch users
        try:
            users = db.query(models.User).offset(skip).limit(limit).all()
            logger.debug(f"Successfully fetched {len(users)} users")
            
            # Log each user's data for debugging
            for user in users:
                logger.debug(f"User data: id={user.id}, email={user.email}, role={user.role}")
            
            return users
        except Exception as query_error:
            logger.error(f"Error executing user query: {str(query_error)}", exc_info=True)
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Error fetching users: {str(query_error)}"
            )
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Unexpected error in read_users: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Unexpected error: {str(e)}"
        )

@router.get("/users/{user_id}", response_model=User)
async def read_user(
    user_id: int,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    try:
        logger.info(f"Fetching user with ID: {user_id}")
        
        # Allow users to access their own details or HR to access any user
        if current_user.id != user_id and current_user.role.lower() != "hr":
            logger.error(f"User {current_user.id} attempted to access details for user {user_id}")
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized to access this user's details"
            )
        
        user = db.query(models.User).filter(models.User.id == user_id).first()
        if user is None:
            logger.error(f"User not found with ID: {user_id}")
            raise HTTPException(status_code=404, detail="User not found")
        
        logger.info(f"Successfully fetched user with ID: {user_id}")
        return user
    except Exception as e:
        logger.error(f"Error fetching user: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to fetch user: {str(e)}")

@router.put("/users/{user_id}", response_model=User)
async def update_user(
    user_id: int,
    user: UserUpdate,
    current_user: models.User = Depends(get_current_hr_user),
    db: Session = Depends(get_db)
):
    try:
        logger.info(f"Updating user with ID: {user_id}")
        db_user = db.query(models.User).filter(models.User.id == user_id).first()
        if db_user is None:
            logger.error(f"User not found with ID: {user_id}")
            raise HTTPException(status_code=404, detail="User not found")
        
        # Update user fields
        for key, value in user.dict(exclude_unset=True).items():
            setattr(db_user, key, value)
        
        db_user.updated_at = datetime.utcnow()
        db.commit()
        db.refresh(db_user)
        
        logger.info(f"Successfully updated user with ID: {user_id}")
        return db_user
    except Exception as e:
        logger.error(f"Error updating user: {str(e)}", exc_info=True)
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
        
        # First check if the user exists
        db_user = db.query(models.User).filter(models.User.id == user_id).first()
        if db_user is None:
            logger.error(f"User not found with ID: {user_id}")
            raise HTTPException(status_code=404, detail="User not found")
        
        # Check if user is trying to delete themselves
        if current_user.id == user_id:
            logger.error(f"User {user_id} attempted to delete themselves")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot delete your own account"
            )
        
        try:
            # Delete related records first
            db.query(models.LeaveBalance).filter(models.LeaveBalance.employee_id == user_id).delete()
            db.query(models.LeaveRequest).filter(models.LeaveRequest.employee_id == user_id).delete()
            db.query(models.Attendance).filter(models.Attendance.employee_id == user_id).delete()
            db.query(models.Asset).filter(models.Asset.user_id == user_id).delete()
            db.query(models.Policy).filter(models.Policy.created_by == user_id).delete()
            
            # Now delete the user
            db.delete(db_user)
            db.commit()
            
            return {"message": "User deleted successfully"}
        except Exception as db_error:
            db.rollback()
            logger.error(f"Database error while deleting user: {str(db_error)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to delete user due to database constraints. Please ensure all related records are properly handled."
            )
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting user: {str(e)}", exc_info=True)
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete user: {str(e)}"
        )

@router.post("/users/", response_model=User)
async def create_user(
    user: UserCreate,
    current_user: models.User = Depends(get_current_hr_user),
    db: Session = Depends(get_db)
):
    try:
        logger.info(f"Creating new user with email: {user.email}")
        
        # Check if user with email already exists
        db_user = db.query(models.User).filter(models.User.email == user.email).first()
        if db_user:
            logger.error(f"User with email {user.email} already exists")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already registered"
            )
        
        # Check if employee_id is provided and unique
        if user.employee_id:
            existing_employee = db.query(models.User).filter(models.User.employee_id == user.employee_id).first()
            if existing_employee:
                logger.error(f"Employee ID {user.employee_id} already exists")
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Employee ID already exists"
                )
        
        # Create new user
        db_user = models.User(
            email=user.email,
            hashed_password=get_password_hash(user.password),
            role=user.role,
            full_name=user.full_name,
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
        
        # Create leave balance for the new user
        leave_balance = models.LeaveBalance(
            employee_id=db_user.id,
            annual_leave=10.0,  # Default annual leave days
            sick_leave=5.0,     # Default sick leave days
            casual_leave=5.0,   # Default casual leave days
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow()
        )
        db.add(leave_balance)
        db.commit()
        
        logger.info(f"Successfully created user with email: {user.email} and leave balance")
        return db_user
    except Exception as e:
        logger.error(f"Error creating user: {str(e)}", exc_info=True)
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to create user: {str(e)}") 