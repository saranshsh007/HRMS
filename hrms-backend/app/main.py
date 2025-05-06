from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .routers import users, attendance
from .database import engine, Base
import uvicorn

# Create database tables
Base.metadata.create_all(bind=engine)

app = FastAPI()

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(users.router, prefix="/api", tags=["users"])
app.include_router(attendance.router, prefix="/api", tags=["attendance"])

@app.get("/")
async def root():
    return {"message": "Welcome to HRMS API"}

if __name__ == "__main__":
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True) 