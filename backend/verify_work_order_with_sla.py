import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os
from dotenv import load_dotenv

load_dotenv()

async def verify_work_order_with_sla():
    client = AsyncIOMotorClient(os.environ['MONGO_URL'])
    db = client[os.environ['DB_NAME']]
    
    # Find the work order with the new title
    work_order = await db.work_orders.find_one({"title": "Work Order with SLA and Categories"})
    
    if work_order:
        print("Work order found:")
        print(f"  ID: {work_order['id']}")
        print(f"  Title: {work_order['title']}")
        print(f"  Company ID: {work_order['company_id']}")
        print(f"  Client ID: {work_order['requested_by_client_id']}")
        print(f"  Assigned Technicians: {work_order['assigned_technicians']}")
        print(f"  Status: {work_order['status']}")
        print(f"  Priority: {work_order['priority']}")
        print(f"  SLA Hours: {work_order['sla_hours']}")
        print(f"  Promise Date: {work_order['promise_date']}")
        print(f"  Products: {work_order['products']}")
        print(f"  Attachments: {work_order['attachments']}")
        print(f"  Created at: {work_order['created_at']}")
    else:
        print("Work order with title 'Work Order with SLA and Categories' not found")
    
    client.close()

if __name__ == "__main__":
    asyncio.run(verify_work_order_with_sla())