import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
import os
from pathlib import Path

# Load environment variables from backend/.env
ROOT_DIR = Path(__file__).parent / "backend"
load_dotenv(ROOT_DIR / ".env")

async def list_collections():
    try:
        mongo_url = os.environ.get('MONGO_URL')
        db_name = os.environ.get('DB_NAME')
        
        client = AsyncIOMotorClient(mongo_url)
        db = client[db_name]
        collections = await db.list_collection_names()
        print('Available collections:', collections)
        
        # Count documents in each collection
        print('\nDocument counts:')
        for collection in collections:
            count = await db[collection].count_documents({})
            print(f'  {collection}: {count} documents')
        
        client.close()
    except Exception as e:
        print(f"Error checking collections: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(list_collections())