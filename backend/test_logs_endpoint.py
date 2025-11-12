import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os
from dotenv import load_dotenv
import uuid
from datetime import datetime, timezone

load_dotenv()

async def test_logs_endpoint():
    client = AsyncIOMotorClient(os.environ['MONGO_URL'])
    db = client[os.environ['DB_NAME']]
    
    # Test the structure of logs we would generate
    logs = []
    
    # Get recent work orders
    work_orders = await db.work_orders.find({}, {"_id": 0}).sort("created_at", -1).limit(10).to_list(10)
    for wo in work_orders:
        logs.append({
            "id": str(uuid.uuid4()),
            "timestamp": wo.get("created_at", ""),
            "user_id": wo.get("created_by", ""),
            "action": "CREATE_WORK_ORDER",
            "resource_type": "WorkOrder",
            "resource_id": wo.get("id", ""),
            "details": {
                "title": wo.get("title", ""),
                "company_id": wo.get("company_id", ""),
                "status": wo.get("status", "")
            }
        })
    
    # Get recent clients
    clients = await db.clients.find({}, {"_id": 0}).sort("created_at", -1).limit(10).to_list(10)
    for client_data in clients:
        logs.append({
            "id": str(uuid.uuid4()),
            "timestamp": client_data.get("created_at", ""),
            "user_id": client_data.get("created_by", "") if "created_by" in client_data else "system",
            "action": "CREATE_CLIENT",
            "resource_type": "Client",
            "resource_id": client_data.get("id", ""),
            "details": {
                "name": client_data.get("name", ""),
                "company_id": client_data.get("company_id", "")
            }
        })
    
    # Get recent employees
    employees = await db.employees.find({}, {"_id": 0}).sort("created_at", -1).limit(10).to_list(10)
    for emp in employees:
        logs.append({
            "id": str(uuid.uuid4()),
            "timestamp": emp.get("created_at", ""),
            "user_id": emp.get("created_by", "") if "created_by" in emp else "system",
            "action": "CREATE_EMPLOYEE",
            "resource_type": "Employee",
            "resource_id": emp.get("id", ""),
            "details": {
                "user_id": emp.get("user_id", ""),
                "company_id": emp.get("company_id", "")
            }
        })
    
    # Sort logs by timestamp
    logs.sort(key=lambda x: x["timestamp"], reverse=True)
    
    print(f"Generated {len(logs)} log entries")
    if logs:
        print("Sample log entry:")
        print(logs[0])
    
    # Don't close the client here as it's not needed for this test

if __name__ == "__main__":
    asyncio.run(test_logs_endpoint())