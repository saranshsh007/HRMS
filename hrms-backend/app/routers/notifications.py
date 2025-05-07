from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from .. import models, schemas
from ..database import get_db
from ..routers.users import get_current_user
import logging
from datetime import datetime

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

router = APIRouter()

@router.get("/user", response_model=List[schemas.Notification])
async def get_user_notifications(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get notifications for the current user"""
    try:
        logger.info(f"Fetching notifications for user: {current_user.id}, role: {current_user.role}")
        
        # Direct query without nested session
        notifications = db.query(models.Notification)\
            .filter(models.Notification.user_id == current_user.id)\
            .order_by(models.Notification.created_at.desc())\
            .all()
        
        logger.info(f"Found {len(notifications)} notifications for user {current_user.id}")
        for notification in notifications:
            logger.info(f"Notification ID: {notification.id}, message: {notification.message[:30]}..., read: {notification.read}")
        
        return notifications
    except Exception as e:
        logger.error(f"Error fetching notifications: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch notifications: {str(e)}")

@router.get("/unread-count", response_model=int)
async def get_unread_notification_count(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get count of unread notifications for the current user"""
    try:
        logger.info(f"Getting unread notification count for user: {current_user.id}, role: {current_user.role}")
        
        # Direct query without nested session
        count = db.query(models.Notification)\
            .filter(models.Notification.user_id == current_user.id, models.Notification.read == False)\
            .count()
            
        logger.info(f"User {current_user.id} has {count} unread notifications")
        return count
    except Exception as e:
        logger.error(f"Error getting unread notification count: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to get notification count: {str(e)}")

@router.put("/{notification_id}/mark-read")
async def mark_notification_as_read(
    notification_id: int,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Mark a notification as read"""
    try:
        logger.info(f"Marking notification {notification_id} as read for user: {current_user.id}")
        notification = db.query(models.Notification)\
            .filter(models.Notification.id == notification_id, models.Notification.user_id == current_user.id)\
            .first()
            
        if not notification:
            raise HTTPException(status_code=404, detail="Notification not found")
            
        notification.read = True
        db.commit()
        
        return {"success": True, "message": "Notification marked as read"}
    except Exception as e:
        logger.error(f"Error marking notification as read: {str(e)}")
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to mark notification as read: {str(e)}")

@router.put("/mark-all-read")
async def mark_all_notifications_as_read(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Mark all notifications as read for the current user"""
    try:
        logger.info(f"Marking all notifications as read for user: {current_user.id}")
        
        # Update all unread notifications
        db.query(models.Notification)\
            .filter(models.Notification.user_id == current_user.id, models.Notification.read == False)\
            .update({models.Notification.read: True})
            
        db.commit()
        
        return {"success": True, "message": "All notifications marked as read"}
    except Exception as e:
        logger.error(f"Error marking all notifications as read: {str(e)}")
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to mark all notifications as read: {str(e)}")

@router.post("/test-notification/{user_id}")
async def create_test_notification(
    user_id: int,
    db: Session = Depends(get_db)
):
    """Create a test notification for the specified user (for debugging)"""
    try:
        logger.info(f"Creating test notification for user: {user_id}")
        
        # Check if user exists
        user = db.query(models.User).filter(models.User.id == user_id).first()
        if not user:
            logger.error(f"User not found with ID: {user_id}")
            raise HTTPException(status_code=404, detail="User not found")
        
        # Create notification
        notification = models.Notification(
            user_id=user_id,
            message=f"This is a test notification created at {datetime.utcnow()}",
            read=False,
            created_at=datetime.utcnow()
        )
        
        db.add(notification)
        db.commit()
        db.refresh(notification)
        
        logger.info(f"Created test notification with ID: {notification.id} for user: {user_id}")
        
        # Return the created notification
        return {
            "success": True, 
            "message": "Test notification created",
            "notification": {
                "id": notification.id,
                "user_id": notification.user_id,
                "message": notification.message,
                "read": notification.read,
                "created_at": notification.created_at
            }
        }
    except Exception as e:
        logger.error(f"Error creating test notification: {str(e)}")
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to create test notification: {str(e)}")

@router.get("/test-users")
async def get_test_users(
    db: Session = Depends(get_db)
):
    """Get all users for testing purposes (for debugging)"""
    try:
        logger.info("Getting all users for testing")
        
        # Get all users
        users = db.query(models.User).all()
        
        # Return user details
        return [
            {
                "id": user.id,
                "email": user.email,
                "role": user.role,
                "first_name": user.first_name,
                "last_name": user.last_name
            }
            for user in users
        ]
    except Exception as e:
        logger.error(f"Error getting test users: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to get test users: {str(e)}") 