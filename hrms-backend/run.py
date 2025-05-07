from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers import users, attendance, leave
from app.database.migrations import setup_database
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Create FastAPI app
app = FastAPI(title="HRMS API")

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, replace with specific origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(users.router, prefix="/api", tags=["users"])
app.include_router(attendance.router, prefix="/api", tags=["attendance"])
app.include_router(leave.router, prefix="/api", tags=["leave"])

@app.on_event("startup")
async def startup_event():
    """Initialize database on startup."""
    try:
        logger.info("Setting up database...")
        if setup_database():
            logger.info("Database setup completed successfully!")
        else:
            logger.error("Database setup failed!")
    except Exception as e:
        logger.error(f"Error during startup: {str(e)}")

@app.get("/")
async def root():
    return {"message": "Welcome to HRMS API"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000) 