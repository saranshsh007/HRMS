from sqlalchemy import Boolean, Column, ForeignKey, Integer, String, Date, Time, DateTime, Float
from sqlalchemy.orm import relationship
from .database import Base
from datetime import datetime
from pydantic import BaseModel
from datetime import date, time

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True)
    hashed_password = Column(String(255))
    full_name = Column(String(255))
    role = Column(String(50))  # 'hr' or 'user'
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    employee_id = Column(String, unique=True)
    first_name = Column(String)
    last_name = Column(String)
    phone = Column(String)
    department = Column(String)
    position = Column(String)
    hire_date = Column(Date)

    # Relationships
    attendance_records = relationship("Attendance", back_populates="employee")
    leave_requests = relationship("LeaveRequest", back_populates="employee")
    leave_balance = relationship("LeaveBalance", back_populates="employee", uselist=False)
    notifications = relationship("Notification", back_populates="user", cascade="all, delete-orphan")


class AttendanceCheckOut(BaseModel):
    employee_id: int
    date: date
    check_out: time  # this will auto-parse from "HH:mm" string
    early_exit: bool
class Attendance(Base):
    __tablename__ = "attendance"

    id = Column(Integer, primary_key=True, index=True)
    employee_id = Column(Integer, ForeignKey("users.id"))
    date = Column(Date)
    check_in = Column(Time)
    check_out = Column(Time)
    status = Column(String(50))  # 'present', 'absent', 'late', 'early_exit'
    late_entry = Column(Boolean, default=False)
    early_exit = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    employee = relationship("User", back_populates="attendance_records") 

class LeaveRequest(Base):
    __tablename__ = "leave_requests"

    id = Column(Integer, primary_key=True, index=True)
    employee_id = Column(Integer, ForeignKey("users.id"))
    leave_type = Column(String)
    start_date = Column(Date)
    end_date = Column(Date)
    reason = Column(String)
    status = Column(String, default="pending")  # pending, approved, rejected
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    employee = relationship("User", back_populates="leave_requests")

class LeaveBalance(Base):
    __tablename__ = "leave_balance"

    id = Column(Integer, primary_key=True, index=True)
    employee_id = Column(Integer, ForeignKey("users.id"), unique=True)
    annual_leave = Column(Float, default=0)
    sick_leave = Column(Float, default=0)
    casual_leave = Column(Float, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    employee = relationship("User", back_populates="leave_balance") 

class Notification(Base):
    __tablename__ = "notifications"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    message = Column(String, nullable=False)
    read = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Define relationship with User
    user = relationship("User", back_populates="notifications") 