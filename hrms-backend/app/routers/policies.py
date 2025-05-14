from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from .. import models
from ..schemas import Policy, PolicyCreate, PolicyUpdate
from ..database import get_db
from datetime import datetime
import uuid
import logging
from .users import get_current_user, get_current_hr_user

router = APIRouter(
    prefix="/policies",
    tags=["policies"]
)
logger = logging.getLogger(__name__)

@router.post("/", response_model=Policy)
async def create_policy(
    policy: PolicyCreate,
    current_user: models.User = Depends(get_current_hr_user),
    db: Session = Depends(get_db)
):
    try:
        # Generate a unique policy ID
        
        db_policy = models.Policy(
            title=policy.title,
            description=policy.description,
            content=policy.content,
            category=policy.category,
            effective_date=policy.effective_date,
            expiry_date=policy.expiry_date,
            created_by=current_user.id,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow()
        )
        db.add(db_policy)
        db.commit()
        db.refresh(db_policy)
        return db_policy
    except Exception as e:
        db.rollback()
        logger.error(f"Error creating policy: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/", response_model=List[Policy])
async def read_policies(
    skip: int = 0,
    limit: int = 100,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    try:
        policies = db.query(models.Policy).offset(skip).limit(limit).all()
        return policies
    except Exception as e:
        logger.error(f"Error fetching policies: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{policy_id}", response_model=Policy)
async def read_policy(
    policy_id: str,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    try:
        policy = db.query(models.Policy).filter(models.Policy.id == policy_id).first()
        if policy is None:
            raise HTTPException(status_code=404, detail="Policy not found")
        return policy
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching policy: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/{policy_id}", response_model=Policy)
async def update_policy(
    policy_id: str,
    policy: PolicyUpdate,
    current_user: models.User = Depends(get_current_hr_user),
    db: Session = Depends(get_db)
):
    try:
        db_policy = db.query(models.Policy).filter(models.Policy.id == policy_id).first()
        if db_policy is None:
            raise HTTPException(status_code=404, detail="Policy not found")
        
        update_data = policy.model_dump(exclude_unset=True)
        for key, value in update_data.items():
            setattr(db_policy, key, value)
        
        db_policy.updated_at = datetime.utcnow()
        db.commit()
        db.refresh(db_policy)
        return db_policy
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error updating policy: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/{policy_id}")
async def delete_policy(
    policy_id: str,
    current_user: models.User = Depends(get_current_hr_user),
    db: Session = Depends(get_db)
):
    try:
    
        # Use policy_id as the primary key for deletion
        result = db.query(models.Policy).filter(models.Policy.id == policy_id).delete()
        if result == 0:
            raise HTTPException(
                status_code=404,
                detail=f"Policy with ID {policy_id} not found"
            )
        
        db.commit()
        return {"message": "Policy deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error deleting policy: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"An error occurred while deleting the policy: {str(e)}"
        ) 