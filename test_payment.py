import requests
import json

# Test payment processing
def test_payment():
    base_url = "http://localhost:8000/api"
    
    # First, let's login as an admin to get a token
    login_data = {
        "email": "admin@samaaljazeera.com",  # Correct email from seed.py
        "password": "password123"  # Correct password from seed.py
    }
    
    try:
        # Login
        login_response = requests.post(f"{base_url}/auth/login", json=login_data)
        if login_response.status_code != 200:
            print(f"Login failed: {login_response.status_code}")
            print(login_response.text)
            return
            
        token = login_response.json()["token"]
        company_id = login_response.json()["user"]["company_id"]
        print(f"Logged in successfully. Company ID: {company_id}")
        
        # Get work orders for the company
        headers = {"Authorization": f"Bearer {token}"}
        work_orders_response = requests.get(f"{base_url}/companies/{company_id}/workorders", headers=headers)
        if work_orders_response.status_code != 200:
            print(f"Failed to get work orders: {work_orders_response.status_code}")
            print(work_orders_response.text)
            return
            
        work_orders = work_orders_response.json()
        if not work_orders:
            print("No work orders found")
            return
            
        # Process a payment for the first work order
        work_order = work_orders[0]
        work_order_id = work_order["id"]
        quoted_price = work_order.get("quoted_price", 0) or 0
        paid_amount = work_order.get("paid_amount", 0) or 0
        remaining_amount = quoted_price - paid_amount
        
        if remaining_amount <= 0:
            print("No remaining amount to pay for this work order")
            return
            
        # Process payment
        payment_data = {
            "work_order_id": work_order_id,
            "amount": min(100.0, remaining_amount),  # Pay 100 AED or remaining amount, whichever is smaller
            "payment_method": "card",
            "reference_number": "TEST123456"
        }
        
        payment_response = requests.post(f"{base_url}/companies/{company_id}/payments", 
                                       headers=headers, json=payment_data)
        
        if payment_response.status_code != 200:
            print(f"Payment failed: {payment_response.status_code}")
            print(payment_response.text)
            return
            
        print("Payment processed successfully!")
        print(json.dumps(payment_response.json(), indent=2))
        
        # Verify the payment updated the work order
        updated_work_order_response = requests.get(f"{base_url}/companies/{company_id}/workorders/{work_order_id}", headers=headers)
        if updated_work_order_response.status_code == 200:
            updated_work_order = updated_work_order_response.json()
            print(f"Updated paid amount: {updated_work_order.get('paid_amount', 0)}")
        
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    test_payment()