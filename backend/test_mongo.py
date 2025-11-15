import os
from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient
import asyncio

# Load environment variables
load_dotenv()

# Get MongoDB URL
mongo_url = os.environ.get('MONGO_URL')
print(f"MongoDB URL: {mongo_url}")

# Test connection
async def test_connection():
    try:
        print("Testing MongoDB connection...")
        client = AsyncIOMotorClient(mongo_url, serverSelectionTimeoutMS=5000)
        await client.admin.command('ping')
        print("MongoDB connection successful!")
        
        # Test accessing database
        db = client[os.environ.get('DB_NAME', 'erp_crm_database')]
        collections = await db.list_collection_names()
        print(f"Available collections: {collections}")
        
        client.close()
    except Exception as e:
        print(f"MongoDB connection failed: {e}")

if __name__ == "__main__":
    asyncio.run(test_connection())