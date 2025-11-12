import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os
from dotenv import load_dotenv

load_dotenv()

async def check_companies():
    client = AsyncIOMotorClient(os.environ['MONGO_URL'])
    db = client[os.environ['DB_NAME']]
    
    companies = await db.companies.find().to_list(100)
    for company in companies:
        print(f"{company['id']}: {company['name']} ({company['industry']})")
    
    # Also check for clients and employees
    print("\nClients:")
    clients = await db.clients.find().to_list(100)
    for client in clients:
        print(f"{client['id']}: {client['name']} (Company: {client['company_id']})")
    
    print("\nEmployees:")
    employees = await db.employees.find().to_list(100)
    for employee in employees:
        print(f"{employee['id']}: User {employee['user_id']} (Company: {employee['company_id']})")
    
    client.close()

if __name__ == "__main__":
    asyncio.run(check_companies())