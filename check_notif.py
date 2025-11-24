from pymongo import MongoClient
import json

# Connect to MongoDB
client = MongoClient('mongodb://localhost:27017/')
db = client['erp_crm']

# Get a sample notification to see its structure
notification = db.notifications.find_one()

if notification:
    print("Sample Notification:")
    print("=" * 80)
    print(f"ID: {notification.get('id', 'N/A')}")
    print(f"Type: {notification.get('type', 'N/A')}")
    print(f"User ID: {notification.get('user_id', 'N/A')}")
    print(f"Company ID: {notification.get('company_id', 'N/A')}")
    print(f"\nPayload:")
    print(json.dumps(notification.get('payload', {}), indent=2))
    print(f"\nSent At: {notification.get('sent_at', 'N/A')}")
else:
    print("No notifications found")
