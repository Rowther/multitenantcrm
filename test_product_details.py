import requests
import os
from dotenv import load_dotenv
import json

# Load environment variables
load_dotenv()

def test_product_details():
    # Get the API base URL from environment or use default
    base_url = os.getenv('API_BASE_URL', 'http://localhost:8000/api')
    
    # Test login
    login_data = {
        'email': 'admin@erp.com',
        'password': 'password123'
    }
    
    print("Testing product details functionality...")
    
    # Login
    login_response = requests.post(f'{base_url}/auth/login', json=login_data)
    print('Login status:', login_response.status_code)
    
    if login_response.status_code == 200:
        token = login_response.json()['token']
        print('Login successful')
        
        # Get company ID from the token
        headers = {'Authorization': f'Bearer {token}'}
        
        # Get user profile to get company ID
        profile_response = requests.get(f'{base_url}/profile', headers=headers)
        if profile_response.status_code == 200:
            company_id = profile_response.json()['company_id']
            print(f'Company ID: {company_id}')
            
            # Get work orders for the company
            work_orders_response = requests.get(
                f'{base_url}/companies/{company_id}/workorders',
                headers=headers
            )
            
            if work_orders_response.status_code == 200:
                work_orders = work_orders_response.json()
                # Get the first work order that has products
                work_order_with_products = None
                for wo in work_orders:
                    if 'products' in wo and wo['products']:
                        work_order_with_products = wo
                        break
                
                if work_order_with_products:
                    work_order_id = work_order_with_products['id']
                    print(f'Work Order ID: {work_order_id}')
                    print('Work Order Products:')
                    print(json.dumps(work_order_with_products['products'], indent=2))
                    
                    # Get detailed work order information
                    details_response = requests.get(
                        f'{base_url}/companies/{company_id}/workorders/{work_order_id}',
                        headers=headers
                    )
                    
                    if details_response.status_code == 200:
                        work_order_details = details_response.json()
                        print('Work Order Details:')
                        print(json.dumps(work_order_details, indent=2))
                        
                        # Check if products are included in the details
                        if 'products' in work_order_details:
                            print('SUCCESS: Product details are included in work order details')
                            print(f'Number of products: {len(work_order_details["products"])}')
                        else:
                            print('WARNING: No product details found in work order details')
                    else:
                        print('Failed to get work order details:', details_response.text)
                else:
                    print('No work orders with products found')
            else:
                print('Failed to get work orders:', work_orders_response.text)
        else:
            print('Failed to get profile:', profile_response.text)
    else:
        print('Login failed:', login_response.text)

if __name__ == "__main__":
    test_product_details()