import requests
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Test login
login_data = {
    'email': 'superadmin@erp.com',
    'password': 'password123'
}

print("Testing SuperAdmin reports endpoint...")

# Login
login_response = requests.post('http://localhost:8000/api/auth/login', json=login_data)
print('Login status:', login_response.status_code)

if login_response.status_code == 200:
    token = login_response.json()['token']
    print('Token:', token[:20] + '...')
    
    # Test the new endpoint
    headers = {'Authorization': f'Bearer {token}'}
    response = requests.get('http://localhost:8000/api/superadmin/reports/all-workorders-profit', headers=headers)
    print('Report status:', response.status_code)
    
    if response.status_code == 200:
        data = response.json()
        print('Report data keys:', list(data.keys()))
        print('Number of work orders:', len(data.get('details', [])))
        if data.get('details'):
            first_order = data['details'][0]
            print('Sample work order keys:', list(first_order.keys()))
            print('Sample work order revenue:', first_order.get('total_revenue', 0))
            print('Sample work order expenses:', first_order.get('total_expenses', 0))
            print('Sample work order profit/loss:', first_order.get('profit_loss', 0))
            print('Sample work order technicians:', first_order.get('technician_names', []))
            
            # Show all work orders with their revenue and technicians
            print('\nAll work orders:')
            for i, order in enumerate(data['details']):
                technicians = ', '.join(order.get('technician_names', [])) if order.get('technician_names') else 'None'
                print(f"{i+1}. {order['order_number']} - Revenue: {order['total_revenue']}, Expenses: {order['total_expenses']}, Profit/Loss: {order['profit_loss']}, Technicians: {technicians}")
    else:
        print('Error response:', response.text)
else:
    print('Login failed:', login_response.text)