import requests
import time

def test_auth_performance():
    """Test authentication performance"""
    print("Testing authentication performance...")
    
    # Test login
    login_data = {
        "email": "superadmin@erp.com",
        "password": "password123"
    }
    
    start_time = time.time()
    login_response = requests.post("http://localhost:8000/api/auth/login", json=login_data, timeout=10)
    login_time = (time.time() - start_time) * 1000  # Convert to milliseconds
    
    print(f"Login time: {login_time:.2f}ms")
    print(f"Login status: {login_response.status_code}")
    
    if login_response.status_code == 200:
        token = login_response.json()["token"]
        print("✅ Login successful")
        
        # Test authenticated request
        headers = {"Authorization": f"Bearer {token}"}
        
        start_time = time.time()
        response = requests.get("http://localhost:8000/api/companies", headers=headers, timeout=10)
        request_time = (time.time() - start_time) * 1000  # Convert to milliseconds
        
        print(f"Authenticated request time: {request_time:.2f}ms")
        print(f"Request status: {response.status_code}")
        
        if response.status_code == 200:
            print("✅ Authenticated request successful")
        else:
            print("❌ Authenticated request failed")
    else:
        print("❌ Login failed")

if __name__ == "__main__":
    test_auth_performance()