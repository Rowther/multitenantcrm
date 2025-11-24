from pymongo import MongoClient

# Connect to MongoDB
client = MongoClient('mongodb://localhost:27017/')
db = client['erp_crm']

# Find all admin users
admins = list(db.users.find({'role': 'ADMIN'}, {'email': 1, 'display_name': 1, 'company_id': 1}))

print("Admin Users:")
print("=" * 60)
for admin in admins:
    print(f"Email: {admin['email']}")
    print(f"Name: {admin.get('display_name', 'N/A')}")
    print(f"Company ID: {admin.get('company_id', 'N/A')}")
    print("-" * 60)

if not admins:
    print("No admin users found in the database")
