from pymongo import MongoClient

# Connect to MongoDB
client = MongoClient('mongodb://localhost:27017/')
db = client['erp_crm']

# Delete all old notifications
result = db.notifications.delete_many({})
print(f"Deleted {result.deleted_count} old notifications")
print("New notifications will be created with proper format when work orders are updated")
