from pydantic import BaseModel, ConfigDict, EmailStr, field_validator
from datetime import date, time
from typing import Optional, Dict, List
import re

class UserBase(BaseModel):
    employee_id: str
    first_name: str
    last_name: str
    email: EmailStr
    phone: str
    department: str
    position: str
    hire_date: date

    @field_validator('phone')
    def validate_phone(cls, v):
        # Basic phone number validation
        if not re.match(r'^\+?1?\d{9,15}$', v):
            raise ValueError('Invalid phone number format')
        return v

class UserCreate(UserBase):
    pass

class UserResponse(UserBase):
    id: int
    is_active: bool

    model_config = ConfigDict(from_attributes=True)

class AttendanceBase(BaseModel):
    employee_id: int
    date: date
    check_in: Optional[time] = None
    check_out: Optional[time] = None
    status: str
    late_entry: bool = False
    early_exit: bool = False

class AttendanceCreate(AttendanceBase):
    pass

class AttendanceResponse(AttendanceBase):
    id: int

    model_config = ConfigDict(from_attributes=True)

class AttendanceSummary(BaseModel):
    total_present_today: int
    absentee_percentage: float
    late_arrivals_count: int
    early_exits_count: int
    monthly_working_hours: Dict[int, float]  # employee_id -> total hours 