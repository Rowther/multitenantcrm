import requests
import json

# Test the SuperAdmin summary endpoint
base_url = "http://localhost:8000/api"

def test_superadmin_summary():
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
        
        # Step 2: Test SuperAdmin companies summary
        print("\nStep 2: Fetching SuperAdmin companies summary...")
        headers = {"Authorization": f"Bearer {token}"}
        summary_response = requests.get(f"{base_url}/superadmin/reports/companies-summary", headers=headers)
        print(f"Summary Status: {summary_response.status_code}")
        
        if summary_response.status_code == 200:
            summary_data = summary_response.json()
            companies = summary_data.get("companies", [])
            print(f"Number of companies: {len(companies)}")
            
            total_revenue = 0
            for company in companies:
                company_name = company.get("company_name", "Unknown")
                revenue = company.get("total_revenue", 0)
                work_orders = company.get("total_work_orders", 0)
                print(f"  {company_name}: {revenue} AED ({work_orders} work orders)")
                total_revenue += revenue
                
            print(f"\nTotal Revenue: {total_revenue} AED")
        else:
            print(f"Summary failed: {summary_response.text}")
            
    except Exception as e:
        print(f"Error during testing: {e}")

if __name__ == "__main__":
    test_superadmin_summary()