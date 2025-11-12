import asyncio
from motor.motor_asyncio import AsyncIOMotorClient

async def check_counts():
    client = AsyncIOMotorClient('mongodb://localhost:27017')
    db = client.erp_crm_database
    
    # Check counts
    company_count = await db.companies.count_documents({})
    invoice_count = await db.invoices.count_documents({})
    work_order_count = await db.work_orders.count_documents({})
    
    print(f'Companies: {company_count}')
    print(f'Invoices: {invoice_count}')
    print(f'Work Orders: {work_order_count}')
    
    client.close()

if __name__ == "__main__":
    asyncio.run(check_counts())