import requests
import os
from dotenv import load_dotenv
import json

# Load environment variables
load_dotenv()

def test_timeline_filtering():
    # Get the API base URL from environment or use default
    base_url = os.getenv('API_BASE_URL', 'http://localhost:8000/api')
    
    # Test login
    login_data = {
        'email': 'superadmin@erp.com',
        'password': 'password123'
    }
    
    print("Testing timeline filtering functionality...")
    
    # Login
    login_response = requests.post(f'{base_url}/auth/login', json=login_data)
    print('Login status:', login_response.status_code)
    
    if login_response.status_code == 200:
        token = login_response.json()['token']
        print('Login successful')
        
        # Test the profit/loss details endpoint with date filtering
        headers = {'Authorization': f'Bearer {token}'}
        
        # Test with date parameters for past week
        params = {
            'from_date': '2023-01-01',
            'to_date': '2023-12-31'
        }
        
        # Test company-specific report endpoint
        company_id = 'test-company-id'  # This should be replaced with a real company ID
        response = requests.get(
            f'{base_url}/companies/{company_id}/reports/profit-loss-details', 
            headers=headers, 
            params=params
        )
        print('Company report with date filter status:', response.status_code)
        
        if response.status_code == 200:
            print('Company report with date filter successful')
            # Print first few items to verify
            data = response.json()
            details = data.get('details', [])
            print(f'Number of work orders: {len(details)}')
            if details:
                print('First work order:', json.dumps(details[0], indent=2))
        else:
            print('Company report with date filter failed:', response.text)
            
        # Test SuperAdmin report endpoint with date filtering
        response = requests.get(
            f'{base_url}/superadmin/reports/all-workorders-profit', 
            headers=headers, 
            params=params
        )
        print('SuperAdmin report with date filter status:', response.status_code)
        
        if response.status_code == 200:
            print('SuperAdmin report with date filter successful')
            # Print first few items to verify
            data = response.json()
            details = data.get('details', [])
            print(f'Number of work orders: {len(details)}')
            if details:
                print('First work order:', json.dumps(details[0], indent=2))
        else:
            print('SuperAdmin report with date filter failed:', response.text)
    else:
        print('Login failed:', login_response.text)

if __name__ == "__main__":
    test_timeline_filtering()