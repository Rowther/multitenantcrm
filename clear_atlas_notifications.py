from pymongo import MongoClient

# Try the actual MongoDB URL from .env
MONGO_URL = "mongodb+srv://Mohammed_Tariq:hussain123@sjfcrm.prfxihy.mongodb.net/erp_crm_database?retryWrites=true&w=majority"

try:
    client = MongoClient(MONGO_URL)
    db = client['erp_crm_database']
    
    # Count notifications
    count = db.notifications.count_documents({})
    print(f"Found {count} notifications in erp_crm_database")
    
    if count > 0:
        # Delete them
        result = db.notifications.delete_many({})
        print(f"Deleted {result.deleted_count} old notifications")
        print("\n✅ Old notifications cleared!")
        print("Now update a work order status to create new notifications with proper format")
    else:
        print("No notifications to delete")
        
except Exception as e:
    print(f"Error: {e}")
