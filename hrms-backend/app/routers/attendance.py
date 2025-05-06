from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from datetime import date, time, datetime
from .. import models, schemas
from ..database import get_db

router = APIRouter()

@router.post("/attendance/check-in", response_model=schemas.Attendance)
def check_in(attendance: schemas.AttendanceCreate, db: Session = Depends(get_db)):
    # Check if user exists
    user = db.query(models.User).filter(models.User.id == attendance.employee_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Check if already checked in today
    today = date.today()
    existing_check_in = db.query(models.Attendance).filter(
        models.Attendance.employee_id == attendance.employee_id,
        models.Attendance.date == today
    ).first()
    
    if existing_check_in:
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
    return db_attendance

@router.put("/attendance/check-out/{attendance_id}", response_model=schemas.Attendance)
def check_out(attendance_id: int, check_out_time: time, db: Session = Depends(get_db)):
    attendance = db.query(models.Attendance).filter(models.Attendance.id == attendance_id).first()
    if not attendance:
        raise HTTPException(status_code=404, detail="Attendance record not found")
    
    if attendance.check_out:
        raise HTTPException(status_code=400, detail="Already checked out")
    
    attendance.check_out = check_out_time
    attendance.updated_at = datetime.utcnow()
    
    # Check for early exit
    if check_out_time < time(17, 0):  # Assuming 5 PM is the standard end time
        attendance.early_exit = True
    
    db.commit()
    db.refresh(attendance)
    return attendance

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