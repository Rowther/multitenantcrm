import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from datetime import datetime, timezone, timedelta
import os
from dotenv import load_dotenv
from pathlib import Path
import uuid

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / 'backend' / '.env')

mongo_url = os.environ['MONGO_URL']
db_name = os.environ['DB_NAME']

async def create_sample_invoices():
    client = AsyncIOMotorClient(mongo_url)
    db = client.erp_crm_database
    
    print("Creating sample invoices...")
    
    # Get all companies
    companies = await db.companies.find({}, {'_id': 0}).to_list(100)
    print(f"Found {len(companies)} companies")
    
    # Get all work orders
    work_orders = await db.work_orders.find({}, {'_id': 0}).to_list(1000)
    print(f"Found {len(work_orders)} work orders")
    
    # Create sample invoices for each work order
    for idx, work_order in enumerate(work_orders):
        # Alternate between ISSUED and PAID status
        status = 'ISSUED' if idx % 2 == 0 else 'PAID'
        
        invoice = {
            'id': str(uuid.uuid4()),
            'company_id': work_order['company_id'],
            'work_order_id': work_order['id'],
            'invoice_number': f"INV-{str(idx+1).zfill(6)}",
            'items': [
                {
                    'description': 'Work Order Services',
                    'amount': work_order.get('quoted_price', 600.0)
                }
            ],
            'total_amount': work_order.get('quoted_price', 600.0),
            'tax_amount': 0,
            'paid_amount': 0,
            'status': status,
            'issued_date': datetime.now(timezone.utc).isoformat(),
            'due_date': (datetime.now(timezone.utc) + timedelta(days=30)).isoformat(),
            'created_at': datetime.now(timezone.utc).isoformat()
        }
        
        await db.invoices.insert_one(invoice)
        print(f"Created invoice {invoice['invoice_number']} with status {status} for work order {work_order['order_number']}")
    
    print(f"✅ Created {len(work_orders)} sample invoices")
    client.close()

if __name__ == "__main__":
    asyncio.run(create_sample_invoices())