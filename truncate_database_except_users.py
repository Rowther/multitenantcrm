import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
import os
from pathlib import Path

# Load environment variables from backend/.env
ROOT_DIR = Path(__file__).parent / "backend"
load_dotenv(ROOT_DIR / ".env")

# Collections to preserve (user-related collections)
PRESERVE_COLLECTIONS = ['users', 'employees', 'companies']

async def truncate_database_except_users():
    try:
        mongo_url = os.environ.get('MONGO_URL')
        db_name = os.environ.get('DB_NAME')
        
        client = AsyncIOMotorClient(mongo_url)
        db = client[db_name]
        
        # Get all collections
        all_collections = await db.list_collection_names()
        print(f'All collections: {all_collections}')
        
        # Determine which collections to truncate
        collections_to_truncate = [col for col in all_collections if col not in PRESERVE_COLLECTIONS]
        print(f'\nCollections to truncate: {collections_to_truncate}')
        print(f'\nCollections to preserve: {PRESERVE_COLLECTIONS}')
        
        # Confirm with user before proceeding
        print(f'\n⚠️  WARNING: This will delete ALL data from the collections listed above.')
        print(f'   Only collections {PRESERVE_COLLECTIONS} will be preserved.')
        response = input('\nDo you want to proceed? Type "YES" to confirm: ')
        
        if response.strip().upper() != 'YES':
            print('Operation cancelled.')
            return
        
        # Truncate collections
        for collection in collections_to_truncate:
            result = await db[collection].delete_many({})
            print(f'Deleted {result.deleted_count} documents from {collection}')
        
        print('\n✅ Database truncation completed!')
        print(f'Preserved collections: {PRESERVE_COLLECTIONS}')
        
        client.close()
    except Exception as e:
        print(f"Error truncating database: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(truncate_database_except_users())