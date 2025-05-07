from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from typing import List, Optional
from datetime import date, time, datetime
from sqlalchemy import and_, extract

from database import get_db, engine, Base
from models import Attendance, User
from schemas import (
    AttendanceCreate, AttendanceResponse, AttendanceSummary,
    UserCreate, UserResponse
)
import mock_data

# Create database tables
Base.metadata.create_all(bind=engine)

# Populate mock data
mock_data.create_mock_data()

app = FastAPI(title="HR Management System")

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:5174", "http://localhost:5175", "http://localhost:5176", "http://localhost:5177"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# User Management Endpoints
@app.post("/users/", response_model=UserResponse)
def create_user(user: UserCreate, db: Session = Depends(get_db)):
    try:
        db_user = User(**user.model_dump())
        db.add(db_user)
        db.commit()
        db.refresh(db_user)
        return db_user
    except IntegrityError as e:
        db.rollback()
        if "UNIQUE constraint failed: users.employee_id" in str(e):
            raise HTTPException(
                status_code=409,
                detail="Employee ID already exists"
            )
        elif "UNIQUE constraint failed: users.email" in str(e):
            raise HTTPException(
                status_code=409,
                detail="Email already exists"
            )
        else:
            raise HTTPException(
                status_code=500,
                detail="An error occurred while creating the user"
            )

@app.get("/users/", response_model=List[UserResponse])
def read_users(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    users = db.query(User).offset(skip).limit(limit).all()
    return users

@app.get("/users/{user_id}", response_model=UserResponse)
def read_user(user_id: int, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")
    return user

@app.put("/users/{user_id}", response_model=UserResponse)
def update_user(user_id: int, user: UserCreate, db: Session = Depends(get_db)):
    db_user = db.query(User).filter(User.id == user_id).first()
    if db_user is None:
        raise HTTPException(status_code=404, detail="User not found")
    
    for key, value in user.model_dump().items():
        setattr(db_user, key, value)
    
    db.commit()
    db.refresh(db_user)
    return db_user

@app.delete("/users/{user_id}")
def delete_user(user_id: int, db: Session = Depends(get_db)):
    db_user = db.query(User).filter(User.id == user_id).first()
    if db_user is None:
        raise HTTPException(status_code=404, detail="User not found")
    
    db.delete(db_user)
    db.commit()
    return {"message": "User deleted successfully"}

# Existing Attendance Endpoints
@app.get("/attendance/", response_model=List[AttendanceResponse])
def read_attendance(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    attendance = db.query(Attendance).offset(skip).limit(limit).all()
    return attendance

@app.post("/attendance/", response_model=AttendanceResponse)
def create_attendance_record(attendance: AttendanceCreate, db: Session = Depends(get_db)):
    db_attendance = Attendance(**attendance.model_dump())
    db.add(db_attendance)
    db.commit()
    db.refresh(db_attendance)
    return db_attendance

@app.get("/attendance/summary", response_model=AttendanceSummary)
def get_summary(
    date: Optional[str] = None,
    month: Optional[int] = None,
    year: Optional[int] = None,
    db: Session = Depends(get_db)
):
    try:
        # If no date is provided, use today's date
        if not date:
            target_date = datetime.now().date()
        else:
            try:
                target_date = datetime.strptime(date, "%Y-%m-%d").date()
            except ValueError:
                raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD")

        # If no month/year is provided, use current month/year
        if not month:
            month = datetime.now().month
        if not year:
            year = datetime.now().year

        # Get today's attendance
        today_attendance = db.query(Attendance).filter(Attendance.date == target_date).all()
        
        # Calculate summary for today
        total_employees = len(today_attendance)
        present_today = sum(1 for a in today_attendance if a.status == "Present")
        late_arrivals = sum(1 for a in today_attendance if a.late_entry)
        early_exits = sum(1 for a in today_attendance if a.early_exit)
        
        # Calculate absentee percentage
        absentee_percentage = ((total_employees - present_today) / total_employees * 100) if total_employees > 0 else 0
        
        # Calculate monthly working hours per employee
        monthly_attendance = db.query(Attendance).filter(
            and_(
                extract('month', Attendance.date) == month,
                extract('year', Attendance.date) == year,
                Attendance.status == "Present"
            )
        ).all()
        
        monthly_hours = {}
        for record in monthly_attendance:
            if record.check_in and record.check_out:
                # Calculate hours worked
                check_in_dt = datetime.combine(record.date, record.check_in)
                check_out_dt = datetime.combine(record.date, record.check_out)
                hours_worked = (check_out_dt - check_in_dt).total_seconds() / 3600
                
                # Add to employee's total
                if record.employee_id in monthly_hours:
                    monthly_hours[record.employee_id] += hours_worked
                else:
                    monthly_hours[record.employee_id] = hours_worked
        
        return AttendanceSummary(
            total_present_today=present_today,
            absentee_percentage=absentee_percentage,
            late_arrivals_count=late_arrivals,
            early_exits_count=early_exits,
            monthly_working_hours=monthly_hours
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e)) 