from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import date, datetime
from .. import models, schemas
from ..database import get_db
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

router = APIRouter()

@router.post("/leave/request", response_model=schemas.LeaveRequest)
def create_leave_request(leave: schemas.LeaveRequestCreate, db: Session = Depends(get_db)):
    try:
        logger.info(f"Received leave request: {leave.model_dump()}")
        
        # Get the user
        user = db.query(models.User).filter(models.User.id == leave.employee_id).first()
        if not user:
            logger.error(f"User not found with ID: {leave.employee_id}")
            raise HTTPException(status_code=404, detail="User not found")

        # Calculate number of days
        try:
            start_date = leave.start_date if isinstance(leave.start_date, date) else datetime.strptime(str(leave.start_date), "%Y-%m-%d").date()
            end_date = leave.end_date if isinstance(leave.end_date, date) else datetime.strptime(str(leave.end_date), "%Y-%m-%d").date()
            days_requested = (end_date - start_date).days + 1
            logger.info(f"Calculated days requested: {days_requested}")
        except Exception as e:
            logger.error(f"Error processing dates: {str(e)}")
            raise HTTPException(status_code=400, detail=f"Invalid date format: {str(e)}")

        # Validate dates
        if start_date > end_date:
            logger.error("Start date is after end date")
            raise HTTPException(status_code=400, detail="Start date cannot be after end date")
        
        if start_date < date.today():
            logger.error("Attempt to request leave for past date")
            raise HTTPException(status_code=400, detail="Cannot request leave for past dates")

        # Check if user has enough leave balance
        if user.leave_balance < days_requested:
            logger.error(f"Insufficient leave balance. User has {user.leave_balance} days, requested {days_requested} days")
            raise HTTPException(
                status_code=400,
                detail=f"Insufficient leave balance. You have {user.leave_balance} days remaining."
            )

        # Create leave request
        try:
            db_leave = models.LeaveRequest(
                employee_id=leave.employee_id,
                leave_type=leave.leave_type,
                start_date=start_date,
                end_date=end_date,
                reason=leave.reason,
                status="pending",
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow()
            )
            
            logger.info("Created leave request object")
            db.add(db_leave)
            logger.info("Added leave request to session")
            db.commit()
            logger.info("Committed leave request to database")
            db.refresh(db_leave)
            logger.info("Refreshed leave request object")
            return db_leave
        except Exception as e:
            logger.error(f"Database error while creating leave request: {str(e)}")
            db.rollback()
            raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
            
    except ValueError as e:
        logger.error(f"Value error: {str(e)}")
        raise HTTPException(status_code=400, detail=f"Invalid date format: {str(e)}")
    except Exception as e:
        logger.error(f"Unexpected error: {str(e)}")
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to create leave request: {str(e)}")

@router.put("/leave/request/{request_id}/approve", response_model=schemas.LeaveRequest)
def approve_leave_request(request_id: int, db: Session = Depends(get_db)):
    try:
        leave_request = db.query(models.LeaveRequest).filter(models.LeaveRequest.id == request_id).first()
        if not leave_request:
            raise HTTPException(status_code=404, detail="Leave request not found")

        # Get the user
        user = db.query(models.User).filter(models.User.id == leave_request.employee_id).first()
        if not user:
            raise HTTPException(status_code=404, detail="User not found")

        # Calculate number of days
        start_date = leave_request.start_date if isinstance(leave_request.start_date, date) else datetime.strptime(str(leave_request.start_date), "%Y-%m-%d").date()
        end_date = leave_request.end_date if isinstance(leave_request.end_date, date) else datetime.strptime(str(leave_request.end_date), "%Y-%m-%d").date()
        days_requested = (end_date - start_date).days + 1

        # Update leave balance
        user.leave_balance -= days_requested
        leave_request.status = "approved"
        
        db.commit()
        db.refresh(leave_request)
        return leave_request
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to approve leave request: {str(e)}")

@router.put("/leave/request/{request_id}/reject", response_model=schemas.LeaveRequest)
def reject_leave_request(request_id: int, db: Session = Depends(get_db)):
    try:
        leave_request = db.query(models.LeaveRequest).filter(models.LeaveRequest.id == request_id).first()
        if not leave_request:
            raise HTTPException(status_code=404, detail="Leave request not found")

        leave_request.status = "rejected"
        db.commit()
        db.refresh(leave_request)
        return leave_request
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to reject leave request: {str(e)}")

@router.get("/leave/requests", response_model=List[schemas.LeaveRequest])
def get_leave_requests(
    employee_id: int = Query(...),
    status: Optional[str] = None,
    db: Session = Depends(get_db)
):
    try:
        query = db.query(models.LeaveRequest).filter(
            models.LeaveRequest.employee_id == employee_id
        )
        
        if status:
            query = query.filter(models.LeaveRequest.status == status)
        
        return query.order_by(models.LeaveRequest.created_at.desc()).all()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch leave requests: {str(e)}")

@router.get("/leave/balance/{employee_id}", response_model=schemas.LeaveBalance)
def get_leave_balance(employee_id: int, db: Session = Depends(get_db)):
    try:
        # Get approved leaves for the current year
        current_year = date.today().year
        start_date = date(current_year, 1, 1)
        end_date = date(current_year, 12, 31)
        
        # Calculate total leave days (2 days per month)
        current_month = date.today().month
        total_leave_days = current_month * 2  # 2 days per month up to current month
        
        # Initialize total days taken
        total_days_taken = 0
        
        # Get user's leave records
        approved_leaves = db.query(models.LeaveRequest).filter(
            models.LeaveRequest.employee_id == employee_id,
            models.LeaveRequest.status == "approved",
            models.LeaveRequest.start_date >= start_date,
            models.LeaveRequest.end_date <= end_date
        ).all()
        
        # Calculate total days taken
        total_days_taken = sum(
            (leave.end_date - leave.start_date).days + 1
            for leave in approved_leaves
        )
        
        # Create and return the leave balance response
        return {
            "employee_id": employee_id,
            "total_days": total_leave_days,
            "days_taken": total_days_taken,
            "days_remaining": total_leave_days - total_days_taken
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get leave balance: {str(e)}") 