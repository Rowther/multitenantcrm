import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os
from dotenv import load_dotenv
import uuid
from datetime import datetime, timezone

load_dotenv()

async def test_updated_logs():
    client = AsyncIOMotorClient(os.environ['MONGO_URL'])
    db = client[os.environ['DB_NAME']]
    
    # Test the updated structure of logs
    logs = []
    
    # Get recent work orders with user details
    work_orders = await db.work_orders.find({}, {"_id": 0}).sort("created_at", -1).limit(5).to_list(5)
    for wo in work_orders:
        # Get user details
        user = await db.users.find_one({"id": wo.get("created_by", "")}, {"_id": 0, "display_name": 1, "email": 1})
        user_name = user.get("display_name", user.get("email", "Unknown User")) if user else "Unknown User"
        
        logs.append({
            "id": str(uuid.uuid4()),
            "timestamp": wo.get("created_at", ""),
            "user_id": wo.get("created_by", ""),
            "user_name": user_name,
            "action": "CREATE_WORK_ORDER",
            "resource_type": "WorkOrder",
            "resource_id": wo.get("id", ""),
            "details": {
                "title": wo.get("title", ""),
                "company_id": wo.get("company_id", ""),
                "status": wo.get("status", "")
            }
        })
    
    # Get recent comments with user details
    comments = await db.comments.find({}, {"_id": 0}).sort("created_at", -1).limit(5).to_list(5)
    for comment in comments:
        # Get user details
        user = await db.users.find_one({"id": comment.get("user_id", "")}, {"_id": 0, "display_name": 1, "email": 1})
        user_name = user.get("display_name", user.get("email", "Unknown User")) if user else "Unknown User"
        
        # Get work order title for context
        work_order = await db.work_orders.find_one({"id": comment.get("work_order_id", "")}, {"_id": 0, "title": 1})
        work_order_title = work_order.get("title", "Unknown Work Order") if work_order else "Unknown Work Order"
        
        logs.append({
            "id": str(uuid.uuid4()),
            "timestamp": comment.get("created_at", ""),
            "user_id": comment.get("user_id", ""),
            "user_name": user_name,
            "action": "ADD_COMMENT",
            "resource_type": "Comment",
            "resource_id": comment.get("id", ""),
            "details": {
                "work_order_id": comment.get("work_order_id", ""),
                "work_order_title": work_order_title,
                "comment_preview": comment.get("content", "")[:50] + "..." if len(comment.get("content", "")) > 50 else comment.get("content", "")
            }
        })
    
    # Sort logs by timestamp
    logs.sort(key=lambda x: x["timestamp"], reverse=True)
    
    print(f"Generated {len(logs)} log entries")
    if logs:
        print("Sample log entries:")
        for i, log in enumerate(logs[:3]):  # Show first 3 entries
            print(f"{i+1}. {log['user_name']} - {log['action']} - {log['details']}")
    
    client.close()

if __name__ == "__main__":
    asyncio.run(test_updated_logs())