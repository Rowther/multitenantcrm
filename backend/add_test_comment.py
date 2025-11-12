import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os
from dotenv import load_dotenv
import uuid
from datetime import datetime, timezone

load_dotenv()

async def add_test_comment():
    client = AsyncIOMotorClient(os.environ['MONGO_URL'])
    db = client[os.environ['DB_NAME']]
    
    # Find a work order to add a comment to
    work_order = await db.work_orders.find_one({}, {"_id": 0})
    
    if not work_order:
        print("No work orders found")
        return
    
    # Find a user to associate with the comment
    user = await db.users.find_one({}, {"_id": 0})
    
    if not user:
        print("No users found")
        return
    
    # Create a test comment
    comment = {
        "id": str(uuid.uuid4()),
        "work_order_id": work_order["id"],
        "company_id": work_order["company_id"],
        "user_id": user["id"],
        "content": "This is a test comment to verify the logs functionality.",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    # Insert the comment
    result = await db.comments.insert_one(comment)
    print(f"Test comment created with ID: {result.inserted_id}")
    
    client.close()

if __name__ == "__main__":
    asyncio.run(add_test_comment())