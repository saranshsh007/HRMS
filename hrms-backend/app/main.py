from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from .routers import users, attendance, leave
from .routers.users import router as users_router, authenticate_user, create_access_token, ACCESS_TOKEN_EXPIRE_MINUTES
from .routers.attendance import router as attendance_router
from .routers.leave import router as leave_router
from .routers.notifications import router as notifications_router
from .database import engine, Base, get_db
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from datetime import timedelta
import uvicorn

# Create database tables
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="HRMS API",
    description="Human Resource Management System API",
    version="1.0.0"
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Add token endpoint at the app level
@app.post("/api/token")
async def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = authenticate_user(db, form_data.username, form_data.password)
    if not user:
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

@app.get("/")
async def root():
    return {"message": "Welcome to HRMS API"}

if __name__ == "__main__":
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True) 