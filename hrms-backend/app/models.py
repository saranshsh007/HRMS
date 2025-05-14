from sqlalchemy import Boolean, Column, ForeignKey, Integer, String, Date, Time, DateTime, Float, Text, Enum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from .database import Base
from datetime import datetime
from pydantic import BaseModel
from datetime import date, time
import enum

class UserRole(str, enum.Enum):
    HR = "hr"
    EMPLOYEE = "employee"

class User(Base):
    __tablename__ = "users"

    # Primary key for database relationships
    id = Column(Integer, primary_key=True, index=True)
    
    # Business identifier (e.g., "EMP001")
    employee_id = Column(String, unique=True, index=True)
    
    email = Column(String, unique=True, index=True)
    hashed_password = Column(String)
    full_name = Column(String)
    role = Column(String)
    first_name = Column(String)
    last_name = Column(String)
    phone = Column(String)
    department = Column(String)
    position = Column(String)
    hire_date = Column(Date)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    # Relationships
    attendance_records = relationship("Attendance", back_populates="employee", cascade="all, delete-orphan")
    leave_requests = relationship("LeaveRequest", back_populates="employee", cascade="all, delete-orphan")
    leave_balance = relationship("LeaveBalance", back_populates="employee", uselist=False, cascade="all, delete-orphan")
    policies = relationship("Policy", back_populates="creator", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<User {self.email}>"

    def to_dict(self):
        return {
            "id": self.id,
            "email": self.email,
            "role": self.role,
            "full_name": self.full_name,
            "employee_id": self.employee_id,
            "first_name": self.first_name,
            "last_name": self.last_name,
            "phone": self.phone,
            "department": self.department,
            "position": self.position,
            "hire_date": self.hire_date.isoformat() if self.hire_date else None,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None
        }

class AttendanceCheckOut(BaseModel):
    employee_id: int
    date: date
    check_out: time  # this will auto-parse from "HH:mm" string
    early_exit: bool
class Attendance(Base):
    __tablename__ = "attendance"

    id = Column(Integer, primary_key=True, index=True)
    employee_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"))
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
    employee_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"))
    leave_type = Column(String)
    start_date = Column(Date)
    end_date = Column(Date)
    reason = Column(String)
    status = Column(String, default="pending")  # pending, approved, rejected
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    employee = relationship("User", back_populates="leave_requests")

class LeaveBalance(Base):
    __tablename__ = "leave_balance"

    id = Column(Integer, primary_key=True, index=True)
    employee_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), unique=True)
    annual_leave = Column(Float, default=0)
    sick_leave = Column(Float, default=0)
    casual_leave = Column(Float, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    employee = relationship("User", back_populates="leave_balance") 

class Asset(Base):
    __tablename__ = "assets"

    id = Column(Integer, primary_key=True, index=True)
    asset_name = Column(String, index=True)
    category = Column(String)
    department = Column(String)
    condition = Column(String)
    purchase_date = Column(Date)
    warranty_expiry = Column(Date)
    maintenance_schedule = Column(Date)
    notes = Column(Text)
    assigned_to = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"))
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    # Relationships with explicit foreign keys
    assigned_user = relationship("User", foreign_keys=[assigned_to], backref="assigned_assets")
    created_by = relationship("User", foreign_keys=[user_id], backref="created_assets")

class Policy(Base):
    __tablename__ = "policies"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, index=True)
    description = Column(Text)
    content = Column(Text)
    category = Column(String)
    effective_date = Column(Date)
    expiry_date = Column(Date, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    created_by = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"))

    # Relationships
    creator = relationship("User", back_populates="policies") 