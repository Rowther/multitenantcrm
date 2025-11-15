import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os
from dotenv import load_dotenv

load_dotenv()

async def test_indexes():
    """Test that database indexes are created correctly"""
    client = AsyncIOMotorClient(os.environ.get('MONGO_URL', 'mongodb://localhost:27017'))
    db = client[os.environ.get('DB_NAME', 'erp_crm_database')]
    
    print("Checking database indexes...")
    
    # Check indexes for each collection
    collections = ['users', 'companies', 'clients', 'employees', 'work_orders', 'invoices', 'vehicles', 'comments', 'preventive_tasks', 'notifications']
    
    for collection_name in collections:
        try:
            collection = getattr(db, collection_name)
            indexes = await collection.index_information()
            print(f"✅ {collection_name}: {len(indexes)} indexes found")
            
            # Show some key indexes
            if collection_name == 'users':
                if 'email_1' in indexes:
                    print(f"  - Email index: {indexes['email_1']['unique'] if 'unique' in indexes['email_1'] else 'Not unique'}")
                if 'company_id_1' in indexes:
                    print(f"  - Company ID index: Found")
                    
            elif collection_name == 'work_orders':
                if 'company_id_1_status_1' in indexes:
                    print(f"  - Company+Status index: Found")
                if 'created_at_1' in indexes:
                    print(f"  - Created At index: Found")
        except Exception as e:
            print(f"❌ {collection_name}: Error checking indexes - {e}")
    
    client.close()

if __name__ == "__main__":
    asyncio.run(test_indexes())