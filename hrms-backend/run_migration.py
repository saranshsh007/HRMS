import os
import sys
import logging
from app.database import engine, Base
from app.database.migrations import setup_database

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def run_migrations():
    try:
        logger.info("Beginning database migrations...")
        
        # Initialize database
        setup_database()
        
        logger.info("All migrations completed successfully!")
    except Exception as e:
        logger.error(f"Error during migration: {str(e)}")
        sys.exit(1)

if __name__ == "__main__":
    run_migrations() 