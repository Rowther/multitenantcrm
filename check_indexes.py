import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
import os
from pathlib import Path

# Load environment variables from backend/.env
ROOT_DIR = Path(__file__).parent / "backend"
load_dotenv(ROOT_DIR / ".env")

async def check_indexes():
    try:
        mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
        db_name = os.environ.get('DB_NAME', 'erp_crm_database')
        
        client = AsyncIOMotorClient(mongo_url)
        db = client[db_name]
        indexes = await db.work_orders.index_information()
        print('Work orders indexes:', indexes)
        
        # Check if the specific indexes we're using exist
        print("\nChecking specific indexes:")
        print("company_id index exists:", "_id_" in indexes or "company_id_1" in indexes)
        print("created_at index exists:", "created_at_1" in indexes)
        
        client.close()
    except Exception as e:
        print(f"Error checking indexes: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(check_indexes())