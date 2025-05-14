from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import date, datetime, timezone
from .. import models, schemas
from ..database import get_db
from ..routers.users import oauth2_scheme, SECRET_KEY, ALGORITHM, get_current_user
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/leave",
    tags=["leave"]
)

@router.post("/request", response_model=schemas.LeaveRequest)
async def create_leave_request(
    leave: schemas.LeaveRequestCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Create a new leave request"""
    try:
        # Create leave request
        db_leave = models.LeaveRequest(
            employee_id=leave.employee_id,
            leave_type=leave.leave_type,
            start_date=leave.start_date,
            end_date=leave.end_date,
            reason=leave.reason,
            status="pending",
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow()
        )
        db.add(db_leave)
        db.commit()
        db.refresh(db_leave)
        logger.info(f"Created leave request for user {current_user.id}")
        return db_leave
    except Exception as e:
        logger.error(f"Error creating leave request: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/request/{leave_id}/approve")
async def approve_leave_request(
    leave_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Approve a leave request and deduct from leave balance"""
    if current_user.role != "hr":
        raise HTTPException(status_code=403, detail="Only HR can approve leave requests")

    try:
        # Get the leave request
        leave_request = db.query(models.LeaveRequest).filter(models.LeaveRequest.id == leave_id).first()
        if not leave_request:
            raise HTTPException(status_code=404, detail="Leave request not found")

        # Calculate number of days
        days = (leave_request.end_date - leave_request.start_date).days + 1

        # Get the leave balance
        leave_balance = db.query(models.LeaveBalance).filter(
            models.LeaveBalance.employee_id == leave_request.employee_id
        ).first()

        if not leave_balance:
            raise HTTPException(status_code=404, detail="Leave balance not found")

        # Deduct from appropriate leave type
        if leave_request.leave_type.lower() == "annual":
            if leave_balance.annual_leave < days:
                raise HTTPException(status_code=400, detail="Insufficient annual leave balance")
            leave_balance.annual_leave -= days
        elif leave_request.leave_type.lower() == "sick":
            if leave_balance.sick_leave < days:
                raise HTTPException(status_code=400, detail="Insufficient sick leave balance")
            leave_balance.sick_leave -= days
        elif leave_request.leave_type.lower() == "casual":
            if leave_balance.casual_leave < days:
                raise HTTPException(status_code=400, detail="Insufficient casual leave balance")
            leave_balance.casual_leave -= days
        else:
            raise HTTPException(status_code=400, detail="Invalid leave type")

        # Update leave request status
        leave_request.status = "approved"
        leave_request.updated_at = datetime.utcnow()
        
        # Update leave balance timestamp
        leave_balance.updated_at = datetime.utcnow()

        db.commit()
        logger.info(f"Approved leave request {leave_id} and deducted {days} days from {leave_request.leave_type} leave balance")
        return {
            "message": "Leave request approved successfully",
            "days_deducted": days,
            "leave_type": leave_request.leave_type
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error approving leave request: {str(e)}")
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/request/{leave_id}/reject")
async def reject_leave_request(
    leave_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Reject a leave request"""
    if current_user.role != "hr":
        raise HTTPException(status_code=403, detail="Only HR can reject leave requests")

    try:
        leave_request = db.query(models.LeaveRequest).filter(models.LeaveRequest.id == leave_id).first()
        if not leave_request:
            raise HTTPException(status_code=404, detail="Leave request not found")

        leave_request.status = "rejected"
        db.commit()
        logger.info(f"Rejected leave request {leave_id}")
        return {"message": "Leave request rejected successfully"}
    except Exception as e:
        logger.error(f"Error rejecting leave request: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/requests/{user_id}", response_model=List[schemas.LeaveRequest])
async def get_leave_requests(
    user_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Get all leave requests for the current user"""
    try:
        if current_user.role == "hr":
            if user_id:
                leave_requests = db.query(models.LeaveRequest).filter(
                    models.LeaveRequest.employee_id == user_id
                ).all()
            else:
                leave_requests = db.query(models.LeaveRequest).all()
        else:
            leave_requests = db.query(models.LeaveRequest).filter(
                models.LeaveRequest.employee_id == current_user.id
            ).all()
        return leave_requests
    except Exception as e:
        logger.error(f"Error fetching leave requests: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/balance/{user_id}", response_model=schemas.LeaveBalance)
def get_leave_balance(
    user_id: int,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    try:
        # Get the leave balance from the database

        leave_balance = db.query(models.LeaveBalance).filter(models.LeaveBalance.employee_id == current_user.id).first()
        
        

        # Calculate total days and remaining days
        total_days = leave_balance.annual_leave + leave_balance.sick_leave + leave_balance.casual_leave
        days_taken = 0  # This will be calculated from approved leave requests

        # Get approved leaves for the current year
        current_year = date.today().year
        start_date = date(current_year, 1, 1)
        end_date = date(current_year, 12, 31)

        # Get user's approved leave records
        approved_leaves = db.query(models.LeaveRequest).filter(
            models.LeaveRequest.employee_id == user_id,
            models.LeaveRequest.status == "approved",
            models.LeaveRequest.start_date >= start_date,
            models.LeaveRequest.end_date <= end_date
        ).all()

        # Calculate total days taken
        for leave in approved_leaves:
            days_taken += (leave.end_date - leave.start_date).days + 1

        # Return the leave balance response with required fields
        return {
            "employee_id": user_id,
            "total_days": total_days,
            "days_taken": days_taken,
            "days_remaining": total_days - days_taken,
            "annual_leave": leave_balance.annual_leave,
            "sick_leave": leave_balance.sick_leave,
            "casual_leave": leave_balance.casual_leave
        }
        
    except Exception as e:
        logger.error(f"Error getting leave balance: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to get leave balance: {str(e)}")

@router.get("/all-requests", response_model=List[dict])
async def get_all_leave_requests(
    status: Optional[str] = None,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    try:
        logger.info(f"Fetching all leave requests")
        
        # Verify that the current user is HR
        if current_user.role.lower() != "hr":
            logger.error(f"User {current_user.id} (role: {current_user.role}) attempted to access all leave requests")
            raise HTTPException(status_code=403, detail="Only HR can view all leave requests")
        
        # Build query for leave requests
        query = db.query(models.LeaveRequest).order_by(models.LeaveRequest.created_at.desc())
        
        # Apply status filter if provided
        if status:
            query = query.filter(models.LeaveRequest.status == status)
            
        # Execute query
        requests = query.all()
        
        # Enrich the data with employee information
        enriched_requests = []
        for request in requests:
            # Get the employee details
            employee = db.query(models.User).filter(models.User.id == request.employee_id).first()
            if employee:
                enriched_request = {
                    "id": request.id,
                    "user_id": request.employee_id,
                    "employee_name": f"{employee.first_name} {employee.last_name}",
                    "leave_type": request.leave_type,
                    "start_date": str(request.start_date),
                    "end_date": str(request.end_date),
                    "reason": request.reason,
                    "status": request.status,
                    "created_at": str(request.created_at)
                }
                enriched_requests.append(enriched_request)
        
        logger.info(f"Found {len(enriched_requests)} leave requests")
        return enriched_requests
    except Exception as e:
        logger.error(f"Error fetching all leave requests: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch leave requests: {str(e)}") 