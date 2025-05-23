from pydantic import BaseModel, ConfigDict, EmailStr, field_validator
from typing import Optional, List
from datetime import date, time, datetime

class UserBase(BaseModel):
    email: EmailStr
    role: str
    full_name: Optional[str] = None
    employee_id: Optional[str] = None
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    phone: Optional[str] = None
    department: Optional[str] = None
    position: Optional[str] = None
    hire_date: Optional[date] = None

class UserCreate(UserBase):
    password: str

class UserUpdate(BaseModel):
    email: Optional[EmailStr] = None
    full_name: Optional[str] = None
    password: Optional[str] = None
    role: Optional[str] = None
    employee_id: Optional[str] = None
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    phone: Optional[str] = None
    department: Optional[str] = None
    position: Optional[str] = None
    hire_date: Optional[date] = None

class User(UserBase):
    id: int
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    email: Optional[str] = None

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

class AttendanceUpdate(BaseModel):
    employee_id: int
    date: Optional[str] = None
    check_out: Optional[str] = None
    status: Optional[str] = None
    early_exit: Optional[bool] = None

class AttendanceCheckOut(BaseModel):
    employee_id: int
    date: Optional[str] = None
    check_out: str
    early_exit: bool = False

class Attendance(AttendanceBase):
    id: int
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)

class AttendanceSummary(BaseModel):
    total_present: int
    absentee_percentage: float
    late_arrivals: int
    early_exits: int
    monthly_working_hours: List[dict]

class LeaveRequestBase(BaseModel):
    employee_id: int
    leave_type: str
    start_date: date
    end_date: date
    reason: str
    status: str = "pending"

class LeaveRequestCreate(LeaveRequestBase):
    pass

class LeaveRequest(LeaveRequestBase):
    id: int
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)

class LeaveBalanceBase(BaseModel):
    employee_id: int
    annual_leave: float
    sick_leave: float
    casual_leave: float

class LeaveBalanceCreate(LeaveBalanceBase):
    pass

class LeaveBalanceDB(LeaveBalanceBase):
    id: int
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)

class LeaveBalance(BaseModel):
    employee_id: int
    total_days: int
    days_taken: int
    days_remaining: int

    model_config = ConfigDict(from_attributes=True)

class NotificationBase(BaseModel):
    message: str
    
class NotificationCreate(NotificationBase):
    user_id: int
    
class Notification(NotificationBase):
    id: int
    user_id: int
    read: bool
    created_at: datetime
    
    model_config = ConfigDict(from_attributes=True) 