#!/usr/bin/env python3
"""
Create First User Script

This script helps you create your first user account for the chatbot system.
Run this script once to set up your initial admin user.

Usage:
    python create_first_user.py
"""

import os
import sys
from dotenv import load_dotenv

# Add the current directory to Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from database import get_db_session, init_db
from models import User
from auth import get_password_hash

def create_first_user():
    """Create the first user for the system"""
    # Initialize database tables
    init_db()
    
    # Get database session
    with next(get_db_session()) as db:
        # Check if any users already exist
        existing_users = db.query(User).count()
        if existing_users > 0:
            print("Users already exist in the system!")
            print("Use the admin panel or API endpoints to create additional users.")
            return None
        
        print("No users found. Creating your first admin user...")
        print("=" * 50)
        
        # Get user input
        email = input("Enter admin email: ").strip()
        if not email:
            print("Email is required!")
            return None
            
        username = input("Enter admin username: ").strip()
        if not username:
            print("Username is required!")
            return None
            
        password = input("Enter admin password: ").strip()
        if not password:
            print("Password is required!")
            return None
            
        confirm_password = input("Confirm admin password: ").strip()
        if password != confirm_password:
            print("Passwords do not match!")
            return None
        
        # Create admin user
        admin_user = User(
            email=email,
            username=username,
            hashed_password=get_password_hash(password),
            role="admin",
            is_active=True,
            is_verified=True
        )
        
        try:
            db.add(admin_user)
            db.commit()
            db.refresh(admin_user)
            
            print("\n" + "=" * 50)
            print("✅ Admin user created successfully!")
            print("=" * 50)
            print(f"Email: {admin_user.email}")
            print(f"Username: {admin_user.username}")
            print(f"Role: {admin_user.role}")
            print("\nYou can now log in to the admin panel with these credentials.")
            print("Use the admin panel to create additional users as needed.")
            
            return admin_user
            
        except Exception as e:
            print(f"❌ Error creating user: {e}")
            db.rollback()
            return None

if __name__ == "__main__":
    load_dotenv()
    
    print("=" * 50)
    print("Chatbot First User Setup")
    print("=" * 50)
    print("This script will help you create your first admin user.")
    print("Make sure your database is running and configured.")
    print()
    
    try:
        user = create_first_user()
        if user:
            print("\n🎉 Setup complete! You can now start the backend server.")
            print("Run: python start_backend.py")
        else:
            print("\n❌ Setup failed. Please check the errors above.")
            sys.exit(1)
            
    except Exception as e:
        print(f"❌ Unexpected error: {e}")
        sys.exit(1)
