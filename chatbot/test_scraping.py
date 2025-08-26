#!/usr/bin/env python3
"""
Test Scraping Functionality

This script tests the new website scraping and crawling functionality.
Run this to verify that the scraper integration works correctly.

Usage:
    python test_scraping.py
"""

import os
import sys
from dotenv import load_dotenv

# Add the current directory to Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from scraper import scrape_website, compute_hash, crawl_site
from vectorstore import index_text, get_knowledge_base_stats

def test_single_page_scraping():
    """Test single page scraping functionality"""
    print("Testing single page scraping...")
    
    url = "https://www.hotelsbyday.com"
    print(f"Scraping: {url}")
    
    try:
        content = scrape_website(url)
        if content.startswith("Error"):
            print(f"❌ Scraping failed: {content}")
            return False
        
        print(f"✅ Scraping successful! Content length: {len(content)} characters")
        
        # Test content hashing
        content_hash = compute_hash(content)
        print(f"✅ Content hash: {content_hash[:16]}...")
        
        return True
        
    except Exception as e:
        print(f"❌ Scraping error: {e}")
        return False

def test_site_crawling():
    """Test comprehensive site crawling functionality"""
    print("\nTesting comprehensive site crawling...")
    
    url = "https://www.hotelsbyday.com"
    print(f"Crawling: {url}")
    
    try:
        # Test with limited pages for testing
        crawled_pages = crawl_site(
            base_url=url,
            max_pages=5,  # Small number for testing
            delay_sec=0.1,  # Fast for testing
            allow_subdomains=False  # Disable for testing
        )
        
        if not crawled_pages:
            print("❌ No pages were crawled")
            return False
        
        print(f"✅ Crawling successful! Crawled {len(crawled_pages)} pages")
        
        # Show some details about crawled pages
        for i, page in enumerate(crawled_pages[:3]):  # Show first 3 pages
            print(f"  Page {i+1}: {page['url']}")
            print(f"    Title: {page['title'][:50]}...")
            print(f"    Content: {len(page['text'])} characters")
            print(f"    Hash: {page['hash'][:16]}...")
        
        return True
        
    except Exception as e:
        print(f"❌ Crawling error: {e}")
        return False

def test_vector_indexing():
    """Test vector database indexing functionality"""
    print("\nTesting vector database indexing...")
    
    try:
        # Test with sample content
        test_content = """
        HotelsByDay is a service that allows you to book hotel rooms for day use.
        Perfect for travelers who need a place to rest, work, or freshen up between flights.
        Time periods range from 3 to 11 hours during the day.
        """
        
        # Index the test content
        index_text(test_content, metadata={
            "source": "test_scraping",
            "type": "test_content",
            "test": True
        })
        print("✅ Test content indexed successfully")
        
        # Get knowledge base stats
        stats = get_knowledge_base_stats()
        print(f"✅ Knowledge base stats retrieved: {stats['total_documents']} documents")
        
        return True
        
    except Exception as e:
        print(f"❌ Indexing error: {e}")
        return False

def main():
    """Run all scraping tests"""
    load_dotenv()
    
    print("=" * 50)
    print("Website Scraping & Crawling Tests")
    print("=" * 50)
    
    tests = [
        ("Single Page Scraping", test_single_page_scraping),
        ("Site Crawling", test_site_crawling),
        ("Vector Indexing", test_vector_indexing)
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
        print("🎉 All scraping tests passed! The backend is ready for website crawling.")
        print("\nNext steps:")
        print("1. Start the backend server: python start_backend.py")
        print("2. Use the admin panel to crawl websites")
        print("3. Test the new crawling endpoints")
    else:
        print("❌ Some tests failed. Please check the errors above.")
        sys.exit(1)

if __name__ == "__main__":
    main()
