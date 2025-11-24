import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os
from dotenv import load_dotenv

load_dotenv()

async def verify_work_order():
    client = AsyncIOMotorClient(os.environ['MONGO_URL'])
    db = client[os.environ['DB_NAME']]
    
    # Find all work orders
    work_orders = await db.work_orders.find().to_list(100)
    
    print(f"Found {len(work_orders)} work orders:")
    for wo in work_orders:
        print(f"  ID: {wo['id']}")
        print(f"  Title: {wo['title']}")
        print(f"  Company ID: {wo['company_id']}")
        print(f"  Client ID: {wo['requested_by_client_id']}")
        print(f"  Assigned Technicians: {wo['assigned_technicians']}")
        print(f"  Status: {wo['status']}")
        print(f"  Priority: {wo['priority']}")
        print("---")
    
    client.close()

if __name__ == "__main__":
    asyncio.run(verify_work_order())