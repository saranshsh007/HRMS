from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from ..database import get_db
from .. import schemas, models
from .users import get_current_user
from datetime import date, datetime
import logging

router = APIRouter(
    prefix="/assets",
    tags=["assets"]
)

logger = logging.getLogger(__name__)

@router.post("/", response_model=schemas.Asset)
async def create_asset(
    asset: schemas.AssetCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    try:
        if current_user.role != "hr":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only HR can create assets"
            )
        
        db_asset = models.Asset(
            **asset.model_dump(),
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow()
        )
        db.add(db_asset)
        db.commit()
        db.refresh(db_asset)
        return db_asset
    except Exception as e:
        db.rollback()
        logger.error(f"Error creating asset: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/", response_model=List[schemas.Asset])
async def read_assets(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    try:
        if current_user.role == "hr":
            assets = db.query(models.Asset).all()
        else:
            assets = db.query(models.Asset).filter(models.Asset.assigned_to == current_user.id).all()
        return assets
    except Exception as e:
        logger.error(f"Error fetching assets: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/asset/{asset_id}", response_model=schemas.Asset)
async def read_asset(
    asset_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    try:
        asset = db.query(models.Asset).filter(models.Asset.id == asset_id).first()
        if asset is None:
            raise HTTPException(status_code=404, detail="Asset not found")
        
        if current_user.role != "hr" and asset.assigned_to != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized to access this asset"
            )
        
        return asset
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching asset: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/{asset_id}", response_model=schemas.Asset)
async def update_asset(
    asset_id: int,
    asset: schemas.AssetUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    try:
        if current_user.role != "hr":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only HR can update assets"
            )
        
        db_asset = db.query(models.Asset).filter(models.Asset.id == asset_id).first()
        if db_asset is None:
            raise HTTPException(status_code=404, detail="Asset not found")
        
        update_data = asset.model_dump(exclude_unset=True)
        for key, value in update_data.items():
            setattr(db_asset, key, value)
        
        db_asset.updated_at = datetime.utcnow()
        db.commit()
        db.refresh(db_asset)
        return db_asset
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error updating asset: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/{asset_id}")
async def delete_asset(
    asset_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    try:
        if current_user.role != "hr":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only HR can delete assets"
            )
        
        db_asset = db.query(models.Asset).filter(models.Asset.id == asset_id).first()
        if db_asset is None:
            raise HTTPException(status_code=404, detail="Asset not found")
        
        db.delete(db_asset)
        db.commit()
        return {"message": "Asset deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error deleting asset: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/{asset_id}/maintenance")
async def schedule_maintenance(
    asset_id: int,
    maintenance_date: date,
    notes: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    try:
        if current_user.role != "hr":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only HR can schedule maintenance"
            )
        
        db_asset = db.query(models.Asset).filter(models.Asset.id == asset_id).first()
        if db_asset is None:
            raise HTTPException(status_code=404, detail="Asset not found")
        
        db_asset.maintenance_schedule = maintenance_date
        db_asset.notes = notes
        db_asset.updated_at = datetime.utcnow()
        db.commit()
        db.refresh(db_asset)
        return {"message": "Maintenance scheduled successfully"}
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error scheduling maintenance: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/user/{user_id}", response_model=List[schemas.Asset])
async def read_user_assets(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    try:
        # HR can view any user's assets, regular users can only view their own
        if current_user.role != "hr" and current_user.id != user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized to view these assets"
            )
        
        assets = db.query(models.Asset).filter(models.Asset.assigned_to == user_id).all()
        return assets
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching user assets: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e)) 