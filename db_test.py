import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import time
import os
from dotenv import load_dotenv

load_dotenv()

async def test_db_performance():
    """Test database performance directly"""
    print("Testing database performance...")
    
    client = AsyncIOMotorClient(os.environ.get('MONGO_URL', 'mongodb://localhost:27017'))
    db = client[os.environ.get('DB_NAME', 'erp_crm_database')]
    
    # Test direct database query performance
    start_time = time.time()
    companies = await db.companies.find({}, {"_id": 0}).to_list(100)
    end_time = time.time()
    
    db_time = (end_time - start_time) * 1000  # Convert to milliseconds
    print(f"Database query time: {db_time:.2f}ms")
    print(f"Number of companies retrieved: {len(companies)}")
    
    # Test with indexes
    start_time = time.time()
    # This should use the index we created
    companies_with_index = await db.companies.find({"id": {"$exists": True}}, {"_id": 0}).to_list(100)
    end_time = time.time()
    
    indexed_time = (end_time - start_time) * 1000  # Convert to milliseconds
    print(f"Indexed query time: {indexed_time:.2f}ms")
    print(f"Number of companies retrieved: {len(companies_with_index)}")
    
    client.close()

if __name__ == "__main__":
    asyncio.run(test_db_performance())