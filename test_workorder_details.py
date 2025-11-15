import requests
import json

# Test work order details endpoint
base_url = "http://localhost:8000/api"

def test_workorder_details():
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
        
        # Step 3: Get work orders for this company
        print("\nStep 3: Fetching work orders...")
        workorders_response = requests.get(
            f"{base_url}/companies/{company_id}/workorders", 
            headers=headers,
            params={"page": 1, "limit": 5}
        )
        print(f"Work Orders Status: {workorders_response.status_code}")
        
        if workorders_response.status_code != 200:
            print(f"Failed to fetch work orders: {workorders_response.text}")
            return
            
        workorders_data = workorders_response.json()
        work_orders = workorders_data.get('work_orders', [])
        
        if not work_orders:
            print("No work orders found")
            return
            
        # Step 4: Test viewing a specific work order
        work_order_id = work_orders[0]['id']
        work_order_title = work_orders[0]['title']
        print(f"\nStep 4: Fetching work order details for '{work_order_title}' (ID: {work_order_id})...")
        
        workorder_response = requests.get(
            f"{base_url}/companies/{company_id}/workorders/{work_order_id}", 
            headers=headers
        )
        print(f"Work Order Details Status: {workorder_response.status_code}")
        
        if workorder_response.status_code == 200:
            workorder_data = workorder_response.json()
            print("Work Order Details loaded successfully!")
            print(f"Title: {workorder_data.get('title', 'N/A')}")
            print(f"Status: {workorder_data.get('status', 'N/A')}")
            print(f"Priority: {workorder_data.get('priority', 'N/A')}")
        else:
            print(f"Work order details failed: {workorder_response.text}")
            print(f"Response headers: {workorder_response.headers}")
            
    except Exception as e:
        print(f"Error during testing: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    test_workorder_details()