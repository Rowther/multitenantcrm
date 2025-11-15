import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
import os

load_dotenv()

async def check_expenses():
    client = AsyncIOMotorClient(os.environ['MONGO_URL'])
    db = client[os.environ['DB_NAME']]
    expenses = await db.expenses.find({}, {'_id': 0}).to_list(100)
    print(f'Found {len(expenses)} expenses')
    if expenses:
        print('Sample expenses:', expenses[:3])
        # Check work order IDs
        wo_ids = [exp['work_order_id'] for exp in expenses[:3]]
        print('Sample work order IDs:', wo_ids)
    else:
        print('No expenses found')
    client.close()

asyncio.run(check_expenses())