from pymongo import MongoClient
import json

# Connect to MongoDB
client = MongoClient('mongodb://localhost:27017/')
db = client['erp_crm']

# Get recent notifications
notifications = list(db.notifications.find().sort('sent_at', -1).limit(5))

print("Recent Notifications:")
print("=" * 80)
for notif in notifications:
    print(f"\nNotification ID: {notif.get('id', 'N/A')}")
    print(f"Type: {notif.get('type', 'N/A')}")
    print(f"User ID: {notif.get('user_id', 'N/A')}")
    print(f"Company ID: {notif.get('company_id', 'N/A')}")
    print(f"Payload: {json.dumps(notif.get('payload', {}), indent=2)}")
    print(f"Sent At: {notif.get('sent_at', 'N/A')}")
    print(f"Read At: {notif.get('read_at', 'N/A')}")
    print("-" * 80)
