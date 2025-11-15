import requests
import json

# Test company details endpoint
base_url = "http://localhost:8000/api"

def test_company_details():
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
        
        # Step 3: Test company details endpoint
        print("\nStep 3: Fetching company details...")
        company_response = requests.get(f"{base_url}/companies/{company_id}", headers=headers)
        print(f"Company Details Status: {company_response.status_code}")
        
        if company_response.status_code == 200:
            company_data = company_response.json()
            print("Company Details:")
            print(json.dumps(company_data, indent=2))
        else:
            print(f"Company details failed: {company_response.text}")
            
        # Step 4: Test work orders endpoint
        print("\nStep 4: Fetching work orders...")
        workorders_response = requests.get(f"{base_url}/companies/{company_id}/workorders", headers=headers)
        print(f"Work Orders Status: {workorders_response.status_code}")
        
        if workorders_response.status_code == 200:
            workorders_data = workorders_response.json()
            print("Work Orders Response Structure:")
            if isinstance(workorders_data, dict) and 'work_orders' in workorders_data:
                print(f"  Found {len(workorders_data['work_orders'])} work orders")
                print(f"  Pagination: {workorders_data.get('pagination', 'Not found')}")
            else:
                print(f"  Found {len(workorders_data) if isinstance(workorders_data, list) else 'unknown'} work orders")
                print("  No pagination structure found")
        else:
            print(f"Work orders failed: {workorders_response.text}")
            
    except Exception as e:
        print(f"Error during testing: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    test_company_details()