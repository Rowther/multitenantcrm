import requests
import time

def test_performance():
    """Test the performance improvements"""
    print("Testing performance improvements...")
    
    # First, login to get a token
    login_data = {
        "email": "superadmin@erp.com",
        "password": "password123"
    }
    
    try:
        login_response = requests.post("http://localhost:8000/api/auth/login", json=login_data, timeout=10)
        if login_response.status_code != 200:
            print(f"❌ Login failed with status {login_response.status_code}")
            return
            
        token = login_response.json()["token"]
        headers = {"Authorization": f"Bearer {token}"}
        
        # Test a protected endpoint
        start_time = time.time()
        response = requests.get("http://localhost:8000/api/companies", headers=headers, timeout=10)
        end_time = time.time()
        
        response_time = (end_time - start_time) * 1000  # Convert to milliseconds
        print(f"Response time: {response_time:.2f}ms")
        print(f"Status code: {response.status_code}")
        
        if response.status_code == 200:
            print("✅ Server is responding correctly")
            # Print first company if available
            companies = response.json()
            if companies:
                print(f"First company: {companies[0].get('name', 'Unknown')}")
        else:
            print("❌ Server returned an error")
            
    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == "__main__":
    test_performance()