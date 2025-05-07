from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from app.routers.users import router as users_router, authenticate_user, create_access_token, ACCESS_TOKEN_EXPIRE_MINUTES
from app.routers.attendance import router as attendance_router
from app.routers.leave import router as leave_router
from app.routers.notifications import router as notifications_router
from app.database.migrations import setup_database
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from app.database import get_db
from datetime import timedelta
import logging
import os

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Create FastAPI app
app = FastAPI(
    title="HRMS API",
    description="Human Resource Management System API",
    version="1.0.0"
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, replace with specific origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Add token endpoint at the app level
@app.post("/api/token")
async def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = authenticate_user(db, form_data.username, form_data.password)
    if not user:
        logger.error(f"Failed login attempt for user: {form_data.username}")
        from fastapi import HTTPException, status
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.email, "role": user.role}, expires_delta=access_token_expires
    )
    logger.info(f"Successful login for user: {user.email}")
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "role": user.role,
        "user_id": user.id
    }

# Include routers with /api prefix
app.include_router(users_router, tags=["users"], prefix="/api")
app.include_router(attendance_router, tags=["attendance"], prefix="/api/attendance")
app.include_router(leave_router, tags=["leave"], prefix="/api/leave")
app.include_router(notifications_router, tags=["notifications"], prefix="/api/notifications")

@app.on_event("startup")
async def startup_event():
    """Initialize database on startup."""
    try:
        logger.info("Setting up database...")
        setup_database()
        logger.info("Database setup completed successfully!")
    except Exception as e:
        logger.error(f"Error during startup: {str(e)}")

@app.get("/")
async def root():
    return {"message": "Welcome to HRMS API"}

if __name__ == "__main__":
    import uvicorn
    
    # Create any required directories
    database_path = os.path.dirname("app/database/hrms.db")
    if not os.path.exists(database_path):
        os.makedirs(database_path, exist_ok=True)
        
    # Development server
    uvicorn.run(
        app,
        host="0.0.0.0",
        port=8000,
        reload=False,
        log_level="info"
    ) 