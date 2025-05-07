from sqlalchemy import Column, Integer, Date, Time, String, Boolean, ForeignKey
from sqlalchemy.orm import declarative_base, relationship
from database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    employee_id = Column(String, unique=True, index=True)
    first_name = Column(String)
    last_name = Column(String)
    email = Column(String, unique=True, index=True)
    phone = Column(String)
    department = Column(String)
    position = Column(String)
    hire_date = Column(Date)
    is_active = Column(Boolean, default=True)
    
    # Relationship with attendance
    attendance_records = relationship("Attendance", back_populates="employee")

class Attendance(Base):
    __tablename__ = "attendance"

    id = Column(Integer, primary_key=True, index=True)
    employee_id = Column(Integer, ForeignKey("users.id"))
    date = Column(Date)
    check_in = Column(Time, nullable=True)
    check_out = Column(Time, nullable=True)
    status = Column(String)
    late_entry = Column(Boolean, default=False)
    early_exit = Column(Boolean, default=False)
    
    # Relationship with user
    employee = relationship("User", back_populates="attendance_records") 