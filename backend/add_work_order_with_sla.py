import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os
from dotenv import load_dotenv
import uuid
from datetime import datetime, timezone, timedelta

load_dotenv()

async def add_work_order_with_sla():
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
    
    # Calculate promise date (3 days from now)
    promise_date = datetime.now(timezone.utc) + timedelta(days=3)
    
    # Create a work order with SLA and promise date
    work_order = {
        "id": str(uuid.uuid4()),
        "company_id": company_id,
        "order_number": "WO-000008",  # Adjust as needed
        "title": "Work Order with SLA and Categories",
        "description": "Work order created with SLA fields and product categories",
        "created_by": employee_doc["user_id"],
        "requested_by_client_id": client_doc["id"],
        "vehicle_id": None,
        "assigned_technicians": [employee_doc["id"]],
        "status": "PENDING",
        "priority": "HIGH",
        "start_date": None,
        "end_date": None,
        "estimated_cost": None,
        "quoted_price": 1500.0,
        "paid_amount": 0.0,
        "attachments": ["/uploads/2c5ba732-28f5-4a2a-b9dc-08f0a6f1d513.jpg"],  # Using existing image
        "preventive_flag": False,
        "scheduled_date": None,
        "sla_hours": 48,  # 48 hours SLA
        "promise_date": promise_date.isoformat(),  # Promise completion date
        "products": [
            {
                "name": "Modern Wardrobe",
                "description": "Custom built wardrobe with sliding doors",
                "quantity": 1,
                "price": 800.0,
                "category": "WARDROBE"
            },
            {
                "name": "Designer Sofa",
                "description": "3-seater premium fabric sofa",
                "quantity": 1,
                "price": 700.0,
                "category": "SOFA"
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
    asyncio.run(add_work_order_with_sla())