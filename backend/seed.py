import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from datetime import datetime, timezone
import os
from dotenv import load_dotenv
from pathlib import Path
import bcrypt
import uuid

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
db_name = os.environ['DB_NAME']

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

async def seed_database():
    mongo_client = AsyncIOMotorClient(mongo_url)
    db = mongo_client[db_name]
    
    print("🌱 Seeding database...")
    
    # Clear existing data
    collections = ['companies', 'users', 'clients', 'employees', 'work_orders', 
                   'expenses', 'invoices', 'vehicles', 'preventive_tasks', 'notifications']
    for collection in collections:
        await db[collection].delete_many({})
    print("✅ Cleared existing data")
    
    # Create Companies
    companies_data = [
        {
            'id': str(uuid.uuid4()),
            'name': 'Sama Al Jazeera',
            'industry': 'furniture',
            'description': 'Furniture & Interior Design Company',
            'address': 'Dubai, UAE',
            'contact_email': 'contact@sama.com',
            'contact_phone': '+971-123456789',
            'created_at': datetime.now(timezone.utc).isoformat()
        },
        {
            'id': str(uuid.uuid4()),
            'name': 'Vigor Automotive',
            'industry': 'automotive',
            'description': 'Automotive Workshop & Repairs',
            'address': 'Abu Dhabi, UAE',
            'contact_email': 'contact@vigor.com',
            'contact_phone': '+971-987654321',
            'created_at': datetime.now(timezone.utc).isoformat()
        },
        {
            'id': str(uuid.uuid4()),
            'name': 'MSAM Technical Solutions',
            'industry': 'technical_solutions',
            'description': 'Technical Solutions & Maintenance',
            'address': 'Sharjah, UAE',
            'contact_email': 'contact@msam.com',
            'contact_phone': '+971-555555555',
            'created_at': datetime.now(timezone.utc).isoformat()
        }
    ]
    
    await db.companies.insert_many(companies_data)
    print(f"✅ Created {len(companies_data)} companies")
    
    # Create SuperAdmin
    superadmin_id = str(uuid.uuid4())
    superadmin = {
        'id': superadmin_id,
        'company_id': None,
        'role': 'SUPERADMIN',
        'email': 'superadmin@erp.com',
        'password_hash': hash_password('password123'),
        'phone': '+971-111111111',
        'display_name': 'Super Admin',
        'is_active': True,
        'notifications_enabled': True,
        'metadata': {},
        'created_at': datetime.now(timezone.utc).isoformat(),
        'last_login': None
    }
    await db.users.insert_one(superadmin)
    print("✅ Created SuperAdmin (email: superadmin@erp.com, password: password123)")
    
    # Create Admins for each company
    admins = []
    for company in companies_data:
        admin_id = str(uuid.uuid4())
        admin = {
            'id': admin_id,
            'company_id': company['id'],
            'role': 'ADMIN',
            'email': f"admin@{company['name'].lower().replace(' ', '')}.com",
            'password_hash': hash_password('password123'),
            'phone': company['contact_phone'],
            'display_name': f"{company['name']} Admin",
            'is_active': True,
            'notifications_enabled': True,
            'metadata': {},
            'created_at': datetime.now(timezone.utc).isoformat(),
            'last_login': None
        }
        admins.append(admin)
    
    await db.users.insert_many(admins)
    print(f"✅ Created {len(admins)} company admins (password: password123)")
    
    # Create sample employees and clients for each company
    for idx, company in enumerate(companies_data):
        # Create 2 employees
        for i in range(2):
            emp_user_id = str(uuid.uuid4())
            employee_user = {
                'id': emp_user_id,
                'company_id': company['id'],
                'role': 'EMPLOYEE',
                'email': f"employee{i+1}@{company['name'].lower().replace(' ', '')}.com",
                'password_hash': hash_password('password123'),
                'phone': f"+971-{idx+1}000000{i+1}",
                'display_name': f"Employee {i+1}",
                'is_active': True,
                'notifications_enabled': True,
                'metadata': {},
                'created_at': datetime.now(timezone.utc).isoformat(),
                'last_login': None
            }
            await db.users.insert_one(employee_user)
            
            # Create employee record
            employee = {
                'id': str(uuid.uuid4()),
                'company_id': company['id'],
                'user_id': emp_user_id,
                'position': 'Technician',
                'skills': ['Repair', 'Installation'],
                'hourly_rate': 50.0 + (i * 10),
                'metadata': {},
                'created_at': datetime.now(timezone.utc).isoformat()
            }
            await db.employees.insert_one(employee)
        
        # Create 3 clients
        for i in range(3):
            client_id = str(uuid.uuid4())
            client = {
                'id': client_id,
                'company_id': company['id'],
                'name': f"Client {i+1} - {company['name']}",
                'email': f"client{i+1}@example.com",
                'phone': f"+971-{idx+1}111111{i+1}",
                'address': f"Address {i+1}, UAE",
                'contact_person': f"Contact Person {i+1}",
                'metadata': {},
                'created_at': datetime.now(timezone.utc).isoformat()
            }
            await db.clients.insert_one(client)
    
    print("✅ Created sample employees and clients")
    
    # Create vehicles for Vigor Automotive
    vigor_company = next((c for c in companies_data if c['name'] == 'Vigor Automotive'), None)
    if vigor_company:
        clients = await db.clients.find({'company_id': vigor_company['id']}).to_list(10)
        for i, client in enumerate(clients):
            vehicle = {
                'id': str(uuid.uuid4()),
                'company_id': vigor_company['id'],
                'plate_number': f"DXB-{1000+i}",
                'make': ['Toyota', 'Honda', 'BMW'][i % 3],
                'model': ['Camry', 'Accord', 'X5'][i % 3],
                'year': 2020 + i,
                'vin': f"VIN{uuid.uuid4().hex[:10].upper()}",
                'owner_client_id': client['id'],
                'registration_details': {},
                'created_at': datetime.now(timezone.utc).isoformat()
            }
            await db.vehicles.insert_one(vehicle)
        print("✅ Created sample vehicles for Vigor Automotive")
    
    # Create sample work orders
    for company in companies_data:
        employees = await db.employees.find({'company_id': company['id']}).to_list(10)
        clients = await db.clients.find({'company_id': company['id']}).to_list(10)
        
        if employees and clients:
            for i in range(3):
                work_order = {
                    'id': str(uuid.uuid4()),
                    'company_id': company['id'],
                    'order_number': f"WO-{str(i+1).zfill(6)}",
                    'title': f"Sample Work Order {i+1}",
                    'description': f"Description for work order {i+1}",
                    'created_by': admins[companies_data.index(company)]['id'],
                    'requested_by_client_id': clients[0]['id'],
                    'vehicle_id': None,
                    'assigned_technicians': [employees[0]['user_id']],
                    'status': ['PENDING', 'APPROVED', 'IN_PROGRESS'][i % 3],
                    'priority': ['LOW', 'MEDIUM', 'HIGH'][i % 3],
                    'start_date': None,
                    'end_date': None,
                    'estimated_cost': 500.0 * (i + 1),
                    'quoted_price': 600.0 * (i + 1),
                    'attachments': [],
                    'preventive_flag': False,
                    'scheduled_date': None,
                    'metadata': {},
                    'created_at': datetime.now(timezone.utc).isoformat(),
                    'updated_at': datetime.now(timezone.utc).isoformat()
                }
                await db.work_orders.insert_one(work_order)
    
    print("✅ Created sample work orders")
    
    print("\n🎉 Database seeding completed!")
    print("\n📝 Login Credentials:")
    print("SuperAdmin: superadmin@erp.com / password123")
    print("Sama Admin: admin@samaaljazeera.com / password123")
    print("Vigor Admin: admin@vigorautomotive.com / password123")
    print("MSAM Admin: admin@msamtechnicalsolutions.com / password123")
    print("\nEmployees: employee1@{company}.com / password123")
    
    client.close()

if __name__ == "__main__":
    asyncio.run(seed_database())
