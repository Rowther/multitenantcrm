import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os
from dotenv import load_dotenv
import uuid
from datetime import datetime, timezone

load_dotenv()

async def test_logs_filters():
    client = AsyncIOMotorClient(os.environ['MONGO_URL'])
    db = client[os.environ['DB_NAME']]
    
    # Test date filtering
    start_date = "2025-11-01"
    end_date = "2025-11-30"
    
    # Build query filters
    query = {}
    date_query = {}
    if start_date:
        date_query["$gte"] = start_date
    if end_date:
        date_query["$lte"] = end_date
    if date_query:
        query["created_at"] = date_query
    
    print(f"Testing date filter: {query}")
    
    # Test work order filtering with dates
    work_orders = await db.work_orders.find(query, {"_id": 0}).sort("created_at", -1).limit(5).to_list(5)
    print(f"Found {len(work_orders)} work orders in date range")
    
    # Test user filtering
    user = await db.users.find_one({}, {"_id": 0})
    if user:
        user_query = {**query, "created_by": user["id"]}
        user_work_orders = await db.work_orders.find(user_query, {"_id": 0}).sort("created_at", -1).limit(5).to_list(5)
        print(f"Found {len(user_work_orders)} work orders for user {user['id']}")
    
    # Test action filtering
    print("Testing action filtering...")
    # This would be handled in the API endpoint logic
    
    # Test resource type filtering
    print("Testing resource type filtering...")
    # This would be handled in the API endpoint logic
    
    client.close()

if __name__ == "__main__":
    asyncio.run(test_logs_filters())