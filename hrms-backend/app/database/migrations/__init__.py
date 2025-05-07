import logging
from ... import database
from ...database import engine, Base
import sqlalchemy as sa
from sqlalchemy import inspect

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def table_exists(engine, table_name):
    """Check if a table exists in the database"""
    inspector = inspect(engine)
    return table_name in inspector.get_table_names()

def setup_database():
    """Creates all tables defined in the models"""
    try:
        logger.info("Setting up database tables...")
        from ... import models  # Import models to ensure they're registered with SQLAlchemy
        
        # Create all tables that don't exist yet
        Base.metadata.create_all(bind=engine)
        logger.info("Main database tables created")
        
        # We'll skip running migrations for tables that already exist
        if not table_exists(engine, "notifications"):
            # Import migrations
            from .add_notifications_table import run_migration as add_notifications
            # Run additional migrations
            add_notifications()
        else:
            logger.info("Notifications table already exists, skipping migration")
        
        logger.info("Database setup completed successfully")
    except Exception as e:
        logger.error(f"Database setup failed: {str(e)}")
        raise 