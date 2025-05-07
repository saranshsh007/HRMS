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

@router.post("/check-in", response_model=schemas.Attendance)
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

@router.put("/check-out", response_model=schemas.Attendance)
async def check_out_by_employee_id(
    attendance_update: schemas.AttendanceCheckOut,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    try:
        logger.info(f"Check-out request received for employee {attendance_update.employee_id}")
        logger.info(f"Check-out data: {attendance_update}")
        logger.info(f"Check-out time type: {type(attendance_update.check_out)}")
        
        # Verify that the current user is checking out for themselves or is HR
        if current_user.id != attendance_update.employee_id and current_user.role.lower() != "hr":
            logger.error(f"User {current_user.id} attempted to check out for user {attendance_update.employee_id}")
            raise HTTPException(status_code=403, detail="Not authorized to check out for another user")
        
        # Find today's attendance record for the user
        today = date.today()
        
        # If a date is provided, use it, otherwise use today
        query_date = today
        if hasattr(attendance_update, 'date') and attendance_update.date:
            try:
                if isinstance(attendance_update.date, str):
                    query_date = datetime.strptime(attendance_update.date, '%Y-%m-%d').date()
                else:
                    query_date = attendance_update.date
            except ValueError:
                logger.error(f"Invalid date format: {attendance_update.date}")
                # Fall back to today if date parsing fails
        
        attendance = db.query(models.Attendance).filter(
            models.Attendance.employee_id == attendance_update.employee_id,
            models.Attendance.date == query_date
        ).first()
        
        if not attendance:
            logger.error(f"No check-in record found for user {attendance_update.employee_id} on {query_date}")
            raise HTTPException(status_code=404, detail="No check-in record found for today")
        
        if attendance.check_out:
            logger.error(f"User {attendance_update.employee_id} already checked out today")
            raise HTTPException(status_code=400, detail="Already checked out today")
        
        # Process the check-out time
        if attendance_update.check_out:
            check_out_time = None
            
            # Extract the actual time value based on type
            if isinstance(attendance_update.check_out, str):
                try:
                    # If it's a string, parse it
                    check_out_time = datetime.strptime(attendance_update.check_out, '%H:%M').time()
                except ValueError as e:
                    logger.error(f"Invalid time format: {attendance_update.check_out}, error: {str(e)}")
                    raise HTTPException(status_code=400, detail="Invalid time format. Use HH:MM")
            elif isinstance(attendance_update.check_out, time):
                # If it's already a time object, use it directly
                check_out_time = attendance_update.check_out
            else:
                # For any other format, convert to string representation and try to parse
                try:
                    time_str = str(attendance_update.check_out)
                    if ':' in time_str:
                        # Try to extract hours and minutes from the string
                        hours, minutes = time_str.split(':')[:2]
                        check_out_time = time(int(hours), int(minutes))
                    else:
                        raise ValueError("Cannot parse time from given value")
                except Exception as e:
                    logger.error(f"Unsupported time format: {attendance_update.check_out}, error: {str(e)}")
                    raise HTTPException(status_code=400, detail=f"Unsupported time format: {str(attendance_update.check_out)}")
            
            # Update the attendance record
            attendance.check_out = check_out_time
            attendance.early_exit = attendance_update.early_exit
            attendance.updated_at = datetime.utcnow()
            
            db.commit()
            db.refresh(attendance)
            logger.info(f"Check-out successful for user {attendance_update.employee_id}")
            return attendance
        else:
            logger.error("No check-out time provided")
            raise HTTPException(status_code=400, detail="Check-out time is required")
    except Exception as e:
        logger.error(f"Error during check-out: {str(e)}")
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to check out: {str(e)}")

@router.get("/today/{user_id}", response_model=schemas.Attendance)
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

@router.get("/records", response_model=List[schemas.Attendance])
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

@router.get("/summary", response_model=schemas.AttendanceSummary)
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

@router.get("/all-records", response_model=List[dict])
async def get_all_attendance_records(
    date: str = Query(None),
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    try:
        logger.info(f"Fetching all attendance records")
        
        # Verify that the current user is HR
        if current_user.role.lower() != "hr":
            logger.error(f"User {current_user.id} (role: {current_user.role}) attempted to access all attendance records")
            raise HTTPException(status_code=403, detail="Only HR can view all attendance records")
        
        # Use today's date if not specified
        if not date:
            query_date = date.today()
        else:
            try:
                query_date = datetime.strptime(date, '%Y-%m-%d').date()
            except ValueError:
                logger.error(f"Invalid date format: {date}")
                raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD")
        
        # Get all users and their attendance for the specified date
        records = []
        users = db.query(models.User).all()
        
        for user in users:
            # Find attendance record for this user on the specified date
            attendance = db.query(models.Attendance).filter(
                models.Attendance.employee_id == user.id,
                models.Attendance.date == query_date
            ).first()
            
            # Create a record with user details and attendance status
            if attendance:
                record = {
                    "id": attendance.id,
                    "employee_id": user.id,
                    "employee_name": f"{user.first_name} {user.last_name}",
                    "date": str(attendance.date),
                    "check_in": str(attendance.check_in) if attendance.check_in else None,
                    "check_out": str(attendance.check_out) if attendance.check_out else None,
                    "status": attendance.status,
                    "late_entry": attendance.late_entry,
                    "early_exit": attendance.early_exit
                }
            else:
                # Create a placeholder for users without attendance record
                record = {
                    "id": 0,
                    "employee_id": user.id,
                    "employee_name": f"{user.first_name} {user.last_name}",
                    "date": str(query_date),
                    "check_in": None,
                    "check_out": None,
                    "status": "absent",
                    "late_entry": False,
                    "early_exit": False
                }
            
            records.append(record)
        
        logger.info(f"Found {len(records)} attendance records")
        return records
    except Exception as e:
        logger.error(f"Error fetching all attendance records: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch attendance records: {str(e)}") 