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
        
        # Test user creation with a unique email
        user_data = {
            "display_name": "Test User",
            "email": "testuser123@example.com",  # Changed to a unique email
            "password": "testpassword123",
            "phone": "+971-555555555",
            "role": "EMPLOYEE",
            "company_id": "f6d6ff67-ee52-45e7-8be5-7bd1c46431bd"  # Sama Al Jazeera
        }
        
        headers = {"Authorization": f"Bearer {token}"}
        create_response = requests.post("http://localhost:8000/api/users", json=user_data, headers=headers)
        print("Create user response:", create_response.status_code)
        print("Create user data:", create_response.json())
        
        # If user creation successful, test user update
        if create_response.status_code == 200:
            user_id = create_response.json()["id"]
            update_data = {
                "display_name": "Updated Test User",
                "email": "testuser123@example.com",
                "password": "newpassword123",
                "phone": "+971-444444444",
                "role": "CLIENT",
                "company_id": "f6d6ff67-ee52-45e7-8be5-7bd1c46431bd"
            }
            
            update_response = requests.put(f"http://localhost:8000/api/users/{user_id}", json=update_data, headers=headers)
            print("Update user response:", update_response.status_code)
            print("Update user data:", update_response.json())
            
            # Test user deletion
            delete_response = requests.delete(f"http://localhost:8000/api/users/{user_id}", headers=headers)
            print("Delete user response:", delete_response.status_code)
            print("Delete user data:", delete_response.json())
        else:
            print("User creation failed")
        
    else:
        print("Login failed")
        
except Exception as e:
    print("Error:", str(e))