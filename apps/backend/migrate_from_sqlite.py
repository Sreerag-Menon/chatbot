#!/usr/bin/env python3
"""
Migration script to move data from old SQLite database to PostgreSQL.
Run this if you have existing data in the old SQLite database.
"""

import os
import sys
import sqlite3
from datetime import datetime
from dotenv import load_dotenv

# Add the current directory to Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

def migrate_sqlite_to_postgres():
    """Migrate data from SQLite to PostgreSQL"""
    sqlite_db_path = "conversations.db"
    
    if not os.path.exists(sqlite_db_path):
        print("No SQLite database found. Nothing to migrate.")
        return
    
    try:
        from database import get_db_session, init_db
        from models import Conversation
        
        print("Starting migration from SQLite to PostgreSQL...")
        
        # Initialize PostgreSQL database
        init_db()
        
        # Connect to SQLite database
        sqlite_conn = sqlite3.connect(sqlite_db_path)
        sqlite_cursor = sqlite_conn.cursor()
        
        # Get all conversations from SQLite
        sqlite_cursor.execute("""
            SELECT timestamp, summary, email, phone, agent_id, session_id, escalated, escalated_at
            FROM conversations
        """)
        
        conversations = sqlite_cursor.fetchall()
        print(f"Found {len(conversations)} conversations to migrate")
        
        if not conversations:
            print("No conversations to migrate.")
            return
        
        # Migrate each conversation
        migrated_count = 0
        with next(get_db_session()) as db:
            for conv_data in conversations:
                timestamp_str, summary, email, phone, agent_id, session_id, escalated, escalated_at = conv_data
                
                # Parse timestamp
                try:
                    if timestamp_str:
                        timestamp = datetime.fromisoformat(timestamp_str)
                    else:
                        timestamp = datetime.now()
                except:
                    timestamp = datetime.now()
                
                # Parse escalated_at
                escalated_at_dt = None
                if escalated_at:
                    try:
                        escalated_at_dt = datetime.fromisoformat(escalated_at)
                    except:
                        escalated_at_dt = None
                
                # Create new conversation in PostgreSQL
                conversation = Conversation(
                    timestamp=timestamp,
                    summary=summary,
                    email=email,
                    phone=phone,
                    agent_id=agent_id,
                    session_id=session_id,
                    escalated=bool(escalated),
                    escalated_at=escalated_at_dt
                )
                
                db.add(conversation)
                migrated_count += 1
        
        # Commit all changes
        db.commit()
        print(f"✓ Successfully migrated {migrated_count} conversations")
        
        # Close SQLite connection
        sqlite_conn.close()
        
        # Optionally backup and remove old SQLite database
        backup_path = f"{sqlite_db_path}.backup"
        os.rename(sqlite_db_path, backup_path)
        print(f"✓ Old SQLite database backed up to {backup_path}")
        print("You can delete this backup file after verifying the migration was successful.")
        
    except Exception as e:
        print(f"✗ Migration failed: {e}")
        print("Your original SQLite database remains unchanged.")
        return False
    
    return True

def main():
    """Main migration function"""
    load_dotenv()
    
    print("=" * 50)
    print("SQLite to PostgreSQL Migration Tool")
    print("=" * 50)
    
    print("This tool will migrate your existing SQLite data to PostgreSQL.")
    print("Make sure you have:")
    print("1. PostgreSQL running with the chatbot database created")
    print("2. Environment variables configured in .env file")
    print("3. All dependencies installed")
    
    response = input("\nDo you want to continue with the migration? (y/N): ")
    if response.lower() != 'y':
        print("Migration cancelled.")
        return
    
    if migrate_sqlite_to_postgres():
        print("\n🎉 Migration completed successfully!")
        print("Your data is now in PostgreSQL and ready to use.")
    else:
        print("\n❌ Migration failed. Please check the errors above.")

if __name__ == "__main__":
    main()
