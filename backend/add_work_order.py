import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os
from dotenv import load_dotenv
import uuid
from datetime import datetime, timezone

load_dotenv()

async def add_work_order():
    client = AsyncIOMotorClient(os.environ['MONGO_URL'])
    db = client[os.environ['DB_NAME']]
    
    # Sama Al Jazeera company ID
    company_id = "d18bdcd1-4c71-4589-9917-8d6df5d74c08"
    
    # Get a client for this company
    client_doc = await db.clients.find_one({"company_id": company_id})
    if not client_doc:
        print("No client found for Sama Al Jazeera")
        return
    
    # Get an employee for this company
    employee_doc = await db.employees.find_one({"company_id": company_id})
    if not employee_doc:
        print("No employee found for Sama Al Jazeera")
        return
    
    # Create a work order with an image attachment
    work_order = {
        "id": str(uuid.uuid4()),
        "company_id": company_id,
        "order_number": "WO-000007",  # Adjust as needed
        "title": "trrrt",
        "description": "Work order created directly in database",
        "created_by": employee_doc["user_id"],
        "requested_by_client_id": client_doc["id"],
        "vehicle_id": None,
        "assigned_technicians": [employee_doc["id"]],
        "status": "PENDING",
        "priority": "HIGH",
        "start_date": None,
        "end_date": None,
        "estimated_cost": None,
        "quoted_price": 100.0,
        "paid_amount": 0.0,
        "attachments": ["/uploads/2c5ba732-28f5-4a2a-b9dc-08f0a6f1d513.jpg"],  # Using existing image
        "preventive_flag": False,
        "scheduled_date": None,
        "products": [
            {
                "name": "Product 1",
                "description": "Test product",
                "quantity": 1,
                "price": 100.0
            }
        ],
        "metadata": {},
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    # Insert the work order
    result = await db.work_orders.insert_one(work_order)
    print(f"Work order created with ID: {result.inserted_id}")
    
    client.close()

if __name__ == "__main__":
    asyncio.run(add_work_order())