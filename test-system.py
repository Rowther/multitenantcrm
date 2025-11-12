"""
Simple test script to verify the system is working correctly
"""

import requests
import time

def test_system():
    print("Testing Multi-Tenant ERP/CRM System...")
    
    # Test backend API
    try:
        backend_response = requests.get("http://localhost:8000/docs")
        if backend_response.status_code == 200:
            print("✅ Backend API is running")
        else:
            print("❌ Backend API is not responding correctly")
    except:
        print("❌ Backend API is not running")
    
    # Test backend API endpoints
    try:
        api_response = requests.get("http://localhost:8000/api/companies")
        if api_response.status_code == 401:
            print("✅ Backend API endpoints are protected (as expected)")
        else:
            print("⚠️  Backend API endpoints behavior:", api_response.status_code)
    except:
        print("❌ Could not access backend API endpoints")
    
    print("\nTo access the system:")
    print("1. Make sure both servers are running")
    print("2. Open your browser and go to http://localhost:3000")
    print("3. Use one of the demo accounts to log in:")
    print("   - SuperAdmin: superadmin@erp.com / password123")
    print("   - Sama Admin: admin@samaaljazeera.com / password123")
    print("   - Vigor Admin: admin@vigorautomotive.com / password123")
    print("   - MSAM Admin: admin@msamtechnicalsolutions.com / password123")

if __name__ == "__main__":
    test_system()