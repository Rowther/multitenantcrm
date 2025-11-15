import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
import os
import uuid
from datetime import datetime, timezone

load_dotenv()

async def create_sample_expenses():
    client = AsyncIOMotorClient(os.environ['MONGO_URL'])
    db = client[os.environ['DB_NAME']]
    
    # Get all work orders
    work_orders = await db.work_orders.find({}, {'_id': 0}).to_list(100)
    print(f'Found {len(work_orders)} work orders')
    
    if not work_orders:
        print('No work orders found')
        client.close()
        return
    
    # Create sample expenses for each work order
    expenses_to_create = []
    for i, wo in enumerate(work_orders):
        # Create 1-3 expenses per work order
        num_expenses = (i % 3) + 1
        for j in range(num_expenses):
            expense = {
                'id': str(uuid.uuid4()),
                'company_id': wo['company_id'],
                'work_order_id': wo['id'],
                'description': f'Sample expense {j+1} for {wo["order_number"]}',
                'amount': 100.0 * (j + 1),  # $100, $200, $300
                'category': 'materials' if j % 2 == 0 else 'labor',
                'created_at': datetime.now(timezone.utc).isoformat()
            }
            expenses_to_create.append(expense)
    
    if expenses_to_create:
        await db.expenses.insert_many(expenses_to_create)
        print(f'✅ Created {len(expenses_to_create)} sample expenses')
    else:
        print('No expenses to create')
    
    client.close()

asyncio.run(create_sample_expenses())