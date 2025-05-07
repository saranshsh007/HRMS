from app.database.migrations import setup_database
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def main():
    """Run database migrations."""
    try:
        logger.info("Starting database migration...")
        if setup_database():
            logger.info("Database migration completed successfully!")
        else:
            logger.error("Database migration failed!")
    except Exception as e:
        logger.error(f"Error during database migration: {str(e)}")

if __name__ == "__main__":
    main() 