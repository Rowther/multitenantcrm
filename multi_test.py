import requests
import time

def test_multiple_requests():
    """Test multiple requests to see performance improvements"""
    print("Testing multiple requests for performance...")
    
    # First, login to get a token
    login_data = {
        "email": "superadmin@erp.com",
        "password": "password123"
    }
    
    login_response = requests.post("http://localhost:8000/api/auth/login", json=login_data, timeout=10)
    if login_response.status_code != 200:
        print(f"❌ Login failed with status {login_response.status_code}")
        return
        
    token = login_response.json()["token"]
    headers = {"Authorization": f"Bearer {token}"}
    
    # Test multiple requests
    times = []
    for i in range(5):
        start_time = time.time()
        response = requests.get("http://localhost:8000/api/companies", headers=headers, timeout=10)
        end_time = time.time()
        
        response_time = (end_time - start_time) * 1000  # Convert to milliseconds
        times.append(response_time)
        print(f"Request {i+1}: {response_time:.2f}ms - Status: {response.status_code}")
    
    avg_time = sum(times) / len(times)
    print(f"\nAverage response time: {avg_time:.2f}ms")
    print(f"Fastest request: {min(times):.2f}ms")
    print(f"Slowest request: {max(times):.2f}ms")

if __name__ == "__main__":
    test_multiple_requests()