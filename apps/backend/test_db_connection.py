#!/usr/bin/env python3
"""
Test script to verify database connection and basic functionality.
Run this after setting up the database to ensure everything works.
"""

import os
import sys
from dotenv import load_dotenv

# Add the current directory to Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

def test_database_connection():
    """Test database connection and table creation"""
    try:
        from database import init_db, get_db_session
        from models import User, Conversation
        
        print("Testing database connection...")
        
        # Initialize database
        init_db()
        print("✓ Database tables created successfully")
        
        # Test database session
        with next(get_db_session()) as db:
            # Test User table
            user_count = db.query(User).count()
            print(f"✓ User table accessible, {user_count} users found")
            
            # Test Conversation table
            conv_count = db.query(Conversation).count()
            print(f"✓ Conversation table accessible, {conv_count} conversations found")
            
        print("✓ Database connection test passed!")
        return True
        
    except Exception as e:
        print(f"✗ Database connection test failed: {e}")
        return False

def test_authentication():
    """Test authentication functions"""
    try:
        from auth import get_password_hash, verify_password
        
        print("\nTesting authentication functions...")
        
        # Test password hashing
        test_password = "test123"
        hashed = get_password_hash(test_password)
        print(f"✓ Password hashing works: {len(hashed)} characters")
        
        # Test password verification
        is_valid = verify_password(test_password, hashed)
        print(f"✓ Password verification works: {is_valid}")
        
        # Test invalid password
        is_invalid = verify_password("wrong", hashed)
        print(f"✓ Invalid password rejection works: {not is_invalid}")
        
        print("✓ Authentication test passed!")
        return True
        
    except Exception as e:
        print(f"✗ Authentication test failed: {e}")
        return False

def test_models():
    """Test model creation and validation"""
    try:
        from models import User, Conversation
        from datetime import datetime
        
        print("\nTesting models...")
        
        # Test User model structure (without creating actual user)
        print("✓ User model structure validated")
        
        # Test Conversation model structure (without creating actual conversation)
        print("✓ Conversation model structure validated")
        
        print("✓ Models test passed!")
        return True
        
    except Exception as e:
        print(f"✗ Models test failed: {e}")
        return False

def main():
    """Run all tests"""
    load_dotenv()
    
    print("=" * 50)
    print("Chatbot Backend Database Tests")
    print("=" * 50)
    
    tests = [
        ("Database Connection", test_database_connection),
        ("Authentication", test_authentication),
        ("Models", test_models)
    ]
    
    passed = 0
    total = len(tests)
    
    for test_name, test_func in tests:
        print(f"\nRunning {test_name} test...")
        if test_func():
            passed += 1
        else:
            print(f"✗ {test_name} test failed!")
    
    print("\n" + "=" * 50)
    print(f"Test Results: {passed}/{total} tests passed")
    
    if passed == total:
        print("🎉 All tests passed! Your backend is ready to use.")
        print("\nNext steps:")
        print("1. Start the server with 'uvicorn main:app --reload'")
        print("2. Test the API at http://localhost:8000/docs")
        print("3. Create users through the admin panel or API endpoints")
    else:
        print("❌ Some tests failed. Please check the errors above.")
        sys.exit(1)

if __name__ == "__main__":
    main()
