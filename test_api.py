import requests
import json

# Test login
login_data = {
    "email": "superadmin@erp.com",
    "password": "password123"
}

try:
    # Login
    login_response = requests.post("http://localhost:8000/api/auth/login", json=login_data)
    print("Login response:", login_response.status_code)
    print("Login data:", login_response.json())
    
    if login_response.status_code == 200:
        token = login_response.json()["token"]
        print("Token:", token)
        
        # Test companies endpoint
        headers = {"Authorization": f"Bearer {token}"}
        companies_response = requests.get("http://localhost:8000/api/companies", headers=headers)
        print("Companies response:", companies_response.status_code)
        print("Companies data:", companies_response.json())
        
        # Test summary endpoint
        summary_response = requests.get("http://localhost:8000/api/superadmin/reports/companies-summary", headers=headers)
        print("Summary response:", summary_response.status_code)
        print("Summary data:", summary_response.json())
    else:
        print("Login failed")
        
except Exception as e:
    print("Error:", str(e))