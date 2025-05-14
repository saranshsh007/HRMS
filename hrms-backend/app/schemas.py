from pydantic import BaseModel, ConfigDict, EmailStr, field_validator, Field
from typing import Optional, List
from datetime import date, time, datetime
from .models import UserRole

class UserBase(BaseModel):
    email: EmailStr
    role: str
    full_name: Optional[str] = None
    # Business identifier (e.g., "EMP001")
    employee_id: Optional[str] = None
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    phone: Optional[str] = None
    department: Optional[str] = None
    position: Optional[str] = None
    hire_date: Optional[date] = None

    @field_validator('hire_date', mode='before')
    def parse_hire_date(cls, value):
        if isinstance(value, datetime):
            return value.date()
        return value

class UserCreate(UserBase):
    password: str

class UserUpdate(BaseModel):
    email: Optional[EmailStr] = None
    full_name: Optional[str] = None
    password: Optional[str] = None
    role: Optional[str] = None
    # Business identifier (e.g., "EMP001")
    employee_id: Optional[str] = None
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    phone: Optional[str] = None
    department: Optional[str] = None
    position: Optional[str] = None
    hire_date: Optional[date] = None

    @field_validator('hire_date', mode='before')
    def parse_hire_date(cls, value):
        if isinstance(value, datetime):
            return value.date()
        return value

class User(UserBase):
    # Primary key for database relationships
    id: int
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(
        from_attributes=True,
        json_encoders={
            datetime: lambda v: v.isoformat() if v else None,
            date: lambda v: v.isoformat() if v else None
        }
    )

    @classmethod
    def from_orm(cls, obj):
        if hasattr(obj, 'to_dict'):
            return cls(**obj.to_dict())
        return super().from_orm(obj)

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    email: Optional[str] = None

class AttendanceBase(BaseModel):
    # Primary key of the user (not employee_id)
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
    # Primary key of the user (not employee_id)
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
    # Primary key of the user (not employee_id)
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
    total_days: float
    days_taken: float
    days_remaining: float
    annual_leave: float
    sick_leave: float
    casual_leave: float
    
    model_config = ConfigDict(from_attributes=True)

class AssetBase(BaseModel):
    asset_name: str
    category: str
    department: Optional[str] = None
    condition: Optional[str] = None
    purchase_date: Optional[date] = None
    warranty_expiry: Optional[date] = None
    maintenance_schedule: Optional[date] = None
    notes: Optional[str] = None
    assigned_to: Optional[int] = None
    user_id: Optional[int] = None

    @field_validator('purchase_date', 'warranty_expiry', 'maintenance_schedule', mode='before')
    def parse_date(cls, value):
        if isinstance(value, datetime):
            return value.date()
        return value

class AssetCreate(AssetBase):
    pass

class AssetUpdate(AssetBase):
    pass

class Asset(AssetBase):
    id: int
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(
        from_attributes=True,
        json_encoders={
            datetime: lambda v: v.isoformat() if v else None,
            date: lambda v: v.isoformat() if v else None
        }
    )

class PolicyBase(BaseModel):
    title: str
    description: str
    content: str
    category: str
    effective_date: date
    expiry_date: Optional[date] = None

class PolicyCreate(PolicyBase):
    pass

class PolicyUpdate(PolicyBase):
    pass

class Policy(PolicyBase):
    id: int
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    created_by: int

    model_config = ConfigDict(
        from_attributes=True,
        json_encoders={
            datetime: lambda v: v.isoformat() if v else None,
            date: lambda v: v.isoformat() if v else None
        }
    ) 