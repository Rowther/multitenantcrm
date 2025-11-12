import requests
import json
import time

# Test login
login_data = {
    "email": "superadmin@erp.com",
    "password": "password123"
}

# Login
login_response = requests.post("http://localhost:8000/api/auth/login", json=login_data)
print("Login response:", login_response.status_code)

if login_response.status_code == 200:
    token = login_response.json()["token"]
    print("Token:", token)
    
    # Use a timestamp to ensure unique email
    timestamp = int(time.time())
    unique_email = f"test_user_{timestamp}@example.com"
    print(f"Using unique email: {unique_email}")
    
    # Test user creation with a unique email
    user_data = {
        "display_name": "Test User",
        "email": unique_email,
        "password": "testpassword123",
        "phone": "+971-555555555",
        "role": "EMPLOYEE",
        "company_id": "f6d6ff67-ee52-45e7-8be5-7bd1c46431bd"
    }
    
    headers = {"Authorization": f"Bearer {token}"}
    create_response = requests.post("http://localhost:8000/api/users", json=user_data, headers=headers)
    print("Create user response:", create_response.status_code)
    print("Create user data:", create_response.text)