import requests
import json

# Debug the SuperAdmin summary endpoint data structure
base_url = "http://localhost:8000/api"

def debug_superadmin_summary():
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
            print("\nRaw response data:")
            print(json.dumps(summary_data, indent=2))
            
            companies = summary_data.get("companies", [])
            print(f"\nNumber of companies: {len(companies)}")
            
            total_revenue = 0
            for i, company in enumerate(companies):
                print(f"\nCompany {i+1}:")
                print(f"  Full data: {company}")
                company_name = company.get("company_name", "Unknown")
                revenue = company.get("total_revenue", 0)
                work_orders = company.get("total_work_orders", 0)
                print(f"  Name: {company_name}")
                print(f"  Revenue: {revenue} (type: {type(revenue)})")
                print(f"  Work Orders: {work_orders}")
                total_revenue += revenue if isinstance(revenue, (int, float)) else 0
                
            print(f"\nCalculated Total Revenue: {total_revenue} AED")
        else:
            print(f"Summary failed: {summary_response.text}")
            
    except Exception as e:
        print(f"Error during testing: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    debug_superadmin_summary()