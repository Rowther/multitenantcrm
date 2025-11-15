import requests
import json

# Test the complete flow
base_url = "http://localhost:8000/api"

def test_complete_flow():
    try:
        # Step 1: Login
        print("Step 1: Logging in...")
        login_data = {
            "email": "admin@samaaljazeera.com",
            "password": "password123"
        }
        
        login_response = requests.post(f"{base_url}/auth/login", json=login_data)
        print(f"Login Status: {login_response.status_code}")
        
        if login_response.status_code != 200:
            print(f"Login failed: {login_response.text}")
            return
            
        login_result = login_response.json()
        token = login_result.get("token")
        user = login_result.get("user")
        company_id = user.get("company_id")
        
        print(f"Token: {token[:20]}...")
        print(f"Company ID: {company_id}")
        
        # Step 2: Test reports overview
        print("\nStep 2: Fetching reports overview...")
        headers = {"Authorization": f"Bearer {token}"}
        overview_response = requests.get(f"{base_url}/companies/{company_id}/reports/overview", headers=headers)
        print(f"Overview Status: {overview_response.status_code}")
        
        if overview_response.status_code == 200:
            overview_data = overview_response.json()
            print(f"Total Revenue: {overview_data.get('total_revenue', 0)}")
            print(f"Profit Margin: {overview_data.get('profit_margin', 0)}")
            print(f"Total Work Orders: {overview_data.get('total_work_orders', 0)}")
        else:
            print(f"Overview failed: {overview_response.text}")
            
        # Step 3: Test detailed reports
        print("\nStep 3: Fetching detailed reports...")
        detailed_response = requests.get(f"{base_url}/companies/{company_id}/reports/profit-loss-details", headers=headers)
        print(f"Detailed Status: {detailed_response.status_code}")
        
        if detailed_response.status_code == 200:
            detailed_data = detailed_response.json()
            details = detailed_data.get("details", [])
            print(f"Number of work orders in details: {len(details)}")
            if details:
                first_order = details[0]
                print(f"First order revenue: {first_order.get('total_revenue', 0)}")
        else:
            print(f"Detailed reports failed: {detailed_response.text}")
            
    except Exception as e:
        print(f"Error during testing: {e}")

if __name__ == "__main__":
    test_complete_flow()