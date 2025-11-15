import requests
import json

# Debug work orders endpoint
base_url = "http://localhost:8000/api"

def debug_workorders():
    try:
        # Step 1: Login as SuperAdmin
        print("Step 1: Logging in as SuperAdmin...")
        login_data = {
            "email": "superadmin@erp.com",
            "password": "password123"
        }
        
        login_response = requests.post(f"{base_url}/auth/login", json=login_data)
        print(f"Login Status: {login_response.status_code}")
        
        if login_response.status_code != 200:
            print(f"Login failed: {login_response.text}")
            return
            
        login_result = login_response.json()
        token = login_result.get("token")
        print(f"Token: {token[:20]}...")
        
        # Step 2: Get companies list to find a company ID
        print("\nStep 2: Fetching companies list...")
        headers = {"Authorization": f"Bearer {token}"}
        companies_response = requests.get(f"{base_url}/companies", headers=headers)
        print(f"Companies Status: {companies_response.status_code}")
        
        if companies_response.status_code != 200:
            print(f"Failed to fetch companies: {companies_response.text}")
            return
            
        companies = companies_response.json()
        if not companies:
            print("No companies found")
            return
            
        company_id = companies[0]['id']
        company_name = companies[0]['name']
        print(f"Using company: {company_name} (ID: {company_id})")
        
        # Step 3: Test work orders endpoint with detailed error info
        print("\nStep 3: Fetching work orders with detailed error info...")
        workorders_response = requests.get(
            f"{base_url}/companies/{company_id}/workorders", 
            headers=headers,
            params={"page": 1, "limit": 10}
        )
        print(f"Work Orders Status: {workorders_response.status_code}")
        
        if workorders_response.status_code == 200:
            workorders_data = workorders_response.json()
            print("Work Orders loaded successfully!")
            print(f"Number of work orders: {len(workorders_data.get('work_orders', []))}")
        else:
            print(f"Work orders failed: {workorders_response.text}")
            print(f"Response headers: {workorders_response.headers}")
            
    except Exception as e:
        print(f"Error during testing: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    debug_workorders()