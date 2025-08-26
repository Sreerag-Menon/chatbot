#!/usr/bin/env python3
"""
Startup script for the chatbot backend.
This script initializes the database and starts the FastAPI server.
"""

import os
import sys
import subprocess
from dotenv import load_dotenv

def check_dependencies():
    """Check if required dependencies are installed"""
    try:
        import fastapi
        import uvicorn
        import sqlalchemy
        import psycopg2
        print("✓ All required dependencies are installed")
        return True
    except ImportError as e:
        print(f"✗ Missing dependency: {e}")
        print("Please run: pip install -r requirements.txt")
        return False

def check_environment():
    """Check if environment variables are set"""
    load_dotenv()
    
    required_vars = ["DATABASE_URL", "SECRET_KEY"]
    missing_vars = []
    
    for var in required_vars:
        if not os.getenv(var):
            missing_vars.append(var)
    
    if missing_vars:
        print(f"✗ Missing environment variables: {', '.join(missing_vars)}")
        print("Please create a .env file with the required variables")
        print("See SETUP.md for details")
        return False
    
    print("✓ Environment variables are configured")
    return True

def initialize_database():
    """Initialize the database tables"""
    try:
        from database import init_db
        print("Initializing database...")
        init_db()
        print("✓ Database initialized successfully")
        return True
    except Exception as e:
        print(f"✗ Database initialization failed: {e}")
        return False



def start_server():
    """Start the FastAPI server"""
    try:
        print("Starting FastAPI server...")
        print("Server will be available at: http://localhost:8000")
        print("API Documentation: http://localhost:8000/docs")
        print("Press Ctrl+C to stop the server")
        print("-" * 50)
        
        # Start the server
        subprocess.run([
            sys.executable, "-m", "uvicorn", 
            "main:app", 
            "--reload", 
            "--host", "0.0.0.0", 
            "--port", "8000"
        ])
        
    except KeyboardInterrupt:
        print("\n✓ Server stopped by user")
    except Exception as e:
        print(f"✗ Server failed to start: {e}")

def main():
    """Main startup function"""
    print("=" * 50)
    print("Chatbot Backend Startup")
    print("=" * 50)
    
    # Check prerequisites
    if not check_dependencies():
        sys.exit(1)
    
    if not check_environment():
        sys.exit(1)
    
    # Initialize database
    if not initialize_database():
        print("Continuing anyway... (database might already be initialized)")
    
    print("\n" + "=" * 50)
    print("Starting backend server...")
    print("=" * 50)
    print("Note: If you need to create your first user, run 'python create_first_user.py'")
    print("=" * 50)
    
    # Start the server
    start_server()

if __name__ == "__main__":
    main()
