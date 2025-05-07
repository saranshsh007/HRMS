from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import date, datetime
from .. import models, schemas
from ..database import get_db
from ..routers.users import oauth2_scheme, SECRET_KEY, ALGORITHM, get_current_user
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

router = APIRouter()

@router.post("/request", response_model=schemas.LeaveRequest)
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

        # Check leave balance from separate leave_balance table
        leave_balance = db.query(models.LeaveBalance).filter(models.LeaveBalance.employee_id == user.id).first()
        available_leave = 0
        if leave_balance:
            available_leave = leave_balance.annual_leave + leave_balance.sick_leave + leave_balance.casual_leave
        else:
            # Create default leave balance if not exists
            leave_balance = models.LeaveBalance(
                employee_id=user.id,
                annual_leave=10.0,
                sick_leave=5.0,
                casual_leave=5.0
            )
            db.add(leave_balance)
            db.commit()
            available_leave = 20.0  # Default

        if available_leave < days_requested:
            logger.error(f"Insufficient leave balance. User has {available_leave} days, requested {days_requested} days")
            raise HTTPException(
                status_code=400,
                detail=f"Insufficient leave balance. You have {available_leave} days remaining."
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
            
            # Create notifications for all HR users
            try:
                hr_users = db.query(models.User).filter(models.User.role.ilike("HR")).all()
                logger.info(f"Found {len(hr_users)} HR users to notify")
                
                if not hr_users:
                    logger.warning("No HR users found to notify about the leave request")
                
                for hr_user in hr_users:
                    try:
                        notification_message = f"New {leave.leave_type} leave request from {user.first_name} {user.last_name} for {start_date} to {end_date}."
                        notification = models.Notification(
                            user_id=hr_user.id,
                            message=notification_message,
                            read=False,
                            created_at=datetime.utcnow()
                        )
                        db.add(notification)
                        logger.info(f"Created notification for HR user {hr_user.id}: {notification_message}")
                    except Exception as notification_error:
                        logger.error(f"Error creating notification for HR user {hr_user.id}: {str(notification_error)}")
            except Exception as hr_error:
                logger.error(f"Error finding HR users or creating notifications: {str(hr_error)}")
                # Continue with the leave request even if notification fails
            
            db.commit()
            logger.info("Committed leave request to database")
            
            # Double-check that the notification was actually created
            try:
                hr_notifications = db.query(models.Notification).filter(
                    models.Notification.user_id.in_([hr_user.id for hr_user in hr_users])
                ).all()
                logger.info(f"Verified {len(hr_notifications)} notifications were created")
            except Exception as e:
                logger.error(f"Error verifying notifications: {str(e)}")
            
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

@router.put("/request/{request_id}/approve", response_model=schemas.LeaveRequest)
def approve_leave_request(
    request_id: int, 
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    try:
        # Verify that the current user is HR
        if current_user.role.lower() != "hr":
            logger.error(f"User {current_user.id} (role: {current_user.role}) attempted to approve leave request")
            raise HTTPException(status_code=403, detail="Only HR can approve leave requests")
            
        leave_request = db.query(models.LeaveRequest).filter(models.LeaveRequest.id == request_id).first()
        if not leave_request:
            logger.error(f"Leave request not found with ID: {request_id}")
            raise HTTPException(status_code=404, detail="Leave request not found")

        # Get the user
        user = db.query(models.User).filter(models.User.id == leave_request.employee_id).first()
        if not user:
            logger.error(f"User not found with ID: {leave_request.employee_id}")
            raise HTTPException(status_code=404, detail="User not found")

        # Calculate number of days
        start_date = leave_request.start_date if isinstance(leave_request.start_date, date) else datetime.strptime(str(leave_request.start_date), "%Y-%m-%d").date()
        end_date = leave_request.end_date if isinstance(leave_request.end_date, date) else datetime.strptime(str(leave_request.end_date), "%Y-%m-%d").date()
        days_requested = (end_date - start_date).days + 1
        logger.info(f"Approving leave request {request_id} for {days_requested} days")

        # Update leave balance in leave_balance table
        leave_balance = db.query(models.LeaveBalance).filter(models.LeaveBalance.employee_id == user.id).first()
        if not leave_balance:
            # Create default leave balance if not exists
            logger.info(f"Creating default leave balance for user {user.id}")
            leave_balance = models.LeaveBalance(
                employee_id=user.id,
                annual_leave=10.0,
                sick_leave=5.0,
                casual_leave=5.0
            )
            db.add(leave_balance)
        
        # Reduce from appropriate leave type
        leave_type = leave_request.leave_type.lower()
        if leave_type == 'annual':
            leave_balance.annual_leave = max(0, leave_balance.annual_leave - days_requested)
            logger.info(f"Reduced annual leave balance to {leave_balance.annual_leave}")
        elif leave_type == 'sick':
            leave_balance.sick_leave = max(0, leave_balance.sick_leave - days_requested)
            logger.info(f"Reduced sick leave balance to {leave_balance.sick_leave}")
        elif leave_type == 'casual':
            leave_balance.casual_leave = max(0, leave_balance.casual_leave - days_requested)
            logger.info(f"Reduced casual leave balance to {leave_balance.casual_leave}")
        else:
            # Default to annual leave
            leave_balance.annual_leave = max(0, leave_balance.annual_leave - days_requested)
            logger.info(f"Reduced annual leave balance to {leave_balance.annual_leave} (default)")
        
        # Update leave request status
        leave_request.status = "approved"
        leave_request.updated_at = datetime.utcnow()
        logger.info(f"Updated leave request status to approved")
        
        # Create notification for the user
        try:
            notification_message = f"Your {leave_type} leave request from {start_date} to {end_date} has been approved."
            notification = models.Notification(
                user_id=user.id,
                message=notification_message,
                read=False,
                created_at=datetime.utcnow()
            )
            db.add(notification)
            logger.info(f"Created approval notification for user {user.id}: {notification_message}")
            
            # Commit changes to database
            db.commit()
            logger.info(f"Successfully committed leave approval and notification")
            
            # Refresh leave request object
            db.refresh(leave_request)
            return leave_request
        except Exception as notification_error:
            logger.error(f"Error creating notification: {str(notification_error)}")
            db.rollback()
            raise HTTPException(status_code=500, detail=f"Failed to create notification: {str(notification_error)}")
            
    except Exception as e:
        logger.error(f"Error approving leave request: {str(e)}")
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to approve leave request: {str(e)}")

@router.put("/request/{request_id}/reject", response_model=schemas.LeaveRequest)
def reject_leave_request(
    request_id: int, 
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    try:
        # Verify that the current user is HR
        if current_user.role.lower() != "hr":
            logger.error(f"User {current_user.id} (role: {current_user.role}) attempted to reject leave request")
            raise HTTPException(status_code=403, detail="Only HR can reject leave requests")
            
        leave_request = db.query(models.LeaveRequest).filter(models.LeaveRequest.id == request_id).first()
        if not leave_request:
            logger.error(f"Leave request not found with ID: {request_id}")
            raise HTTPException(status_code=404, detail="Leave request not found")

        # Get the user for notification
        user = db.query(models.User).filter(models.User.id == leave_request.employee_id).first()
        if not user:
            logger.error(f"User not found with ID: {leave_request.employee_id}")
            raise HTTPException(status_code=404, detail="User not found")

        # Get leave dates for notification
        start_date = leave_request.start_date if isinstance(leave_request.start_date, date) else datetime.strptime(str(leave_request.start_date), "%Y-%m-%d").date()
        end_date = leave_request.end_date if isinstance(leave_request.end_date, date) else datetime.strptime(str(leave_request.end_date), "%Y-%m-%d").date()
        logger.info(f"Rejecting leave request {request_id} for {start_date} to {end_date}")
        
        # Update leave request status
        leave_request.status = "rejected"
        leave_request.updated_at = datetime.utcnow()
        logger.info(f"Updated leave request status to rejected")
        
        # Create notification for the user
        try:
            notification_message = f"Your {leave_request.leave_type} leave request from {start_date} to {end_date} has been rejected."
            notification = models.Notification(
                user_id=user.id,
                message=notification_message,
                read=False,
                created_at=datetime.utcnow()
            )
            db.add(notification)
            logger.info(f"Created rejection notification for user {user.id}: {notification_message}")
            
            # Commit changes to database
            db.commit()
            logger.info(f"Successfully committed leave rejection and notification")
            
            # Refresh leave request object
            db.refresh(leave_request)
            return leave_request
        except Exception as notification_error:
            logger.error(f"Error creating notification: {str(notification_error)}")
            db.rollback()
            raise HTTPException(status_code=500, detail=f"Failed to create notification: {str(notification_error)}")
            
    except Exception as e:
        logger.error(f"Error rejecting leave request: {str(e)}")
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to reject leave request: {str(e)}")

@router.get("/requests", response_model=List[schemas.LeaveRequest])
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

@router.get("/balance/{employee_id}", response_model=schemas.LeaveBalance)
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
                    "employee_id": request.employee_id,
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