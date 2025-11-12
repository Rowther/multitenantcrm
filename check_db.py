import asyncio
from motor.motor_asyncio import AsyncIOMotorClient

async def check_data():
    client = AsyncIOMotorClient('mongodb://localhost:27017')
    db = client.erp_crm_database
    
    # Check companies
    companies = await db.companies.find({}, {'_id': 0}).to_list(100)
    print('Companies:', len(companies))
    for company in companies:
        print(f'  {company["name"]}: {company["id"]}')
    
    # Check invoices
    invoices = await db.invoices.find({}, {'_id': 0}).to_list(100)
    print('\nInvoices:', len(invoices))
    for inv in invoices:
        print(f'  Invoice {inv["id"]}: {inv["status"]} - AED {inv["total_amount"]}')
    
    # Check work orders
    work_orders = await db.work_orders.find({}, {'_id': 0}).to_list(100)
    print('\nWork Orders:', len(work_orders))
    
    client.close()

if __name__ == "__main__":
    asyncio.run(check_data())