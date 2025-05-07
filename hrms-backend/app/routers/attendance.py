from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import date, time, datetime
from .. import models, schemas
from ..database import get_db
from ..routers.users import oauth2_scheme, SECRET_KEY, ALGORITHM
from jose import JWTError, jwt
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

router = APIRouter()

async def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        logger.info("Attempting to decode token")
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            logger.error("No email found in token payload")
            raise credentials_exception
        logger.info(f"Token decoded successfully for email: {email}")
    except JWTError as e:
        logger.error(f"JWT decode error: {str(e)}")
        raise credentials_exception
    
    user = db.query(models.User).filter(models.User.email == email).first()
    if user is None:
        logger.error(f"No user found for email: {email}")
        raise credentials_exception
    
    logger.info(f"User authenticated successfully: {user.email}")
    return user

@router.post("/attendance/check-in", response_model=schemas.Attendance)
async def check_in(
    attendance: schemas.AttendanceCreate,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    try:
        logger.info(f"Check-in request received for user {current_user.id}")
        
        # Check if user exists
        user = db.query(models.User).filter(models.User.id == attendance.employee_id).first()
        if not user:
            logger.error(f"User not found with ID: {attendance.employee_id}")
            raise HTTPException(status_code=404, detail="User not found")
        
        # Verify that the current user is checking in for themselves
        if current_user.id != attendance.employee_id:
            logger.error(f"User {current_user.id} attempted to check in for user {attendance.employee_id}")
            raise HTTPException(status_code=403, detail="Not authorized to check in for another user")
        
        # Check if already checked in today
        today = date.today()
        existing_check_in = db.query(models.Attendance).filter(
            models.Attendance.employee_id == attendance.employee_id,
            models.Attendance.date == today
        ).first()
        
        if existing_check_in:
            logger.error(f"User {attendance.employee_id} already checked in today")
            raise HTTPException(status_code=400, detail="Already checked in today")
        
        # Create new attendance record
        db_attendance = models.Attendance(
            employee_id=attendance.employee_id,
            date=today,
            check_in=attendance.check_in,
            status="present",
            late_entry=attendance.late_entry,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow()
        )
        
        db.add(db_attendance)
        db.commit()
        db.refresh(db_attendance)
        logger.info(f"Check-in successful for user {attendance.employee_id}")
        return db_attendance
    except Exception as e:
        logger.error(f"Error during check-in: {str(e)}")
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to check in: {str(e)}")

@router.put("/attendance/check-out/{attendance_id}", response_model=schemas.Attendance)
async def check_out(
    attendance_id: int,
    check_out: str = Query(...),
    early_exit: bool = Query(False),
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    try:
        logger.info(f"Check-out request received for attendance {attendance_id}")
        
        try:
            check_out_time = datetime.strptime(check_out, '%H:%M').time()
        except ValueError:
            logger.error(f"Invalid time format: {check_out}")
            raise HTTPException(status_code=400, detail="Invalid time format. Use HH:MM")
        
        attendance = db.query(models.Attendance).filter(models.Attendance.id == attendance_id).first()
        if not attendance:
            logger.error(f"Attendance record not found: {attendance_id}")
            raise HTTPException(status_code=404, detail="Attendance record not found")
        
        # Verify that the current user is checking out their own attendance
        if current_user.id != attendance.employee_id:
            logger.error(f"User {current_user.id} attempted to check out attendance {attendance_id}")
            raise HTTPException(status_code=403, detail="Not authorized to check out another user's attendance")
        
        if attendance.check_out:
            logger.error(f"Attendance {attendance_id} already checked out")
            raise HTTPException(status_code=400, detail="Already checked out")
        
        attendance.check_out = check_out_time
        attendance.early_exit = early_exit
        attendance.updated_at = datetime.utcnow()
        
        db.commit()
        db.refresh(attendance)
        logger.info(f"Check-out successful for attendance {attendance_id}")
        return attendance
    except Exception as e:
        logger.error(f"Error during check-out: {str(e)}")
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to check out: {str(e)}")

@router.get("/attendance/today/{user_id}", response_model=schemas.Attendance)
async def get_today_attendance(
    user_id: int,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    try:
        logger.info(f"Fetching today's attendance for user {user_id}")
        
        # Verify that the current user is requesting their own attendance
        if current_user.id != user_id:
            logger.error(f"User {current_user.id} attempted to view attendance for user {user_id}")
            raise HTTPException(status_code=403, detail="Not authorized to view another user's attendance")
        
        today = date.today()
        attendance = db.query(models.Attendance).filter(
            models.Attendance.employee_id == user_id,
            models.Attendance.date == today
        ).first()
        
        if not attendance:
            # Return an empty attendance record instead of None
            logger.info(f"No attendance record found for user {user_id} today")
            return models.Attendance(
                id=0,
                employee_id=user_id,
                date=today,
                check_in=None,
                check_out=None,
                status="absent",
                late_entry=False,
                early_exit=False,
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow()
            )
        
        logger.info(f"Found attendance record for user {user_id}")
        return attendance
    except Exception as e:
        logger.error(f"Error fetching today's attendance: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch attendance: {str(e)}")

@router.get("/attendance/records", response_model=List[schemas.Attendance])
async def get_attendance_records(
    employee_id: int = Query(...),
    start_date: str = Query(...),
    end_date: str = Query(...),
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    try:
        logger.info(f"Fetching attendance records for user {employee_id}")
        
        # Verify that the current user is requesting their own records
        if current_user.id != employee_id:
            logger.error(f"User {current_user.id} attempted to view records for user {employee_id}")
            raise HTTPException(status_code=403, detail="Not authorized to view another user's records")
        
        try:
            start = datetime.strptime(start_date, '%Y-%m-%d').date()
            end = datetime.strptime(end_date, '%Y-%m-%d').date()
        except ValueError:
            logger.error(f"Invalid date format: {start_date} or {end_date}")
            raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD")
        
        records = db.query(models.Attendance).filter(
            models.Attendance.employee_id == employee_id,
            models.Attendance.date >= start,
            models.Attendance.date <= end
        ).order_by(models.Attendance.date.desc()).all()
        
        logger.info(f"Found {len(records)} attendance records for user {employee_id}")
        return records
    except Exception as e:
        logger.error(f"Error fetching attendance records: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch attendance records: {str(e)}")

@router.get("/attendance/summary", response_model=schemas.AttendanceSummary)
def get_attendance_summary(db: Session = Depends(get_db)):
    today = date.today()
    
    # Get total present today
    total_present = db.query(models.Attendance).filter(
        models.Attendance.date == today,
        models.Attendance.status == "present"
    ).count()
    
    # Get total users
    total_users = db.query(models.User).count()
    
    # Calculate absentee percentage
    absentee_percentage = ((total_users - total_present) / total_users) * 100 if total_users > 0 else 0
    
    # Get late arrivals
    late_arrivals = db.query(models.Attendance).filter(
        models.Attendance.date == today,
        models.Attendance.late_entry == True
    ).count()
    
    # Get early exits
    early_exits = db.query(models.Attendance).filter(
        models.Attendance.date == today,
        models.Attendance.early_exit == True
    ).count()
    
    # Get monthly working hours
    monthly_working_hours = []
    current_month = today.replace(day=1)
    
    # Get all attendance records for the current month
    month_attendances = db.query(models.Attendance).filter(
        models.Attendance.date >= current_month,
        models.Attendance.date <= today
    ).all()
    
    # Group attendance by date
    daily_hours = {}
    for attendance in month_attendances:
        if attendance.check_in and attendance.check_out:
            hours = (datetime.combine(date.today(), attendance.check_out) - 
                    datetime.combine(date.today(), attendance.check_in)).seconds / 3600
            daily_hours[attendance.date.isoformat()] = hours
    
    # Convert to list format
    for day in range(1, today.day + 1):
        current_date = today.replace(day=day)
        hours = daily_hours.get(current_date.isoformat(), 0)
        monthly_working_hours.append({
            "date": current_date.isoformat(),
            "hours": hours
        })
    
    # Return summary with default values if no data exists
    if not month_attendances and total_users == 0:
        return schemas.AttendanceSummary(
            total_present=0,
            absentee_percentage=0,
            late_arrivals=0,
            early_exits=0,
            monthly_working_hours=[]
        )
    
    return schemas.AttendanceSummary(
        total_present=total_present,
        absentee_percentage=absentee_percentage,
        late_arrivals=late_arrivals,
        early_exits=early_exits,
        monthly_working_hours=monthly_working_hours
    ) 