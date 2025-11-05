from fastapi import FastAPI, APIRouter, HTTPException, Depends, File, UploadFile, Query, Form
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field, ConfigDict, EmailStr
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone, timedelta
import os
import logging
import uuid
import bcrypt
import jwt
from pathlib import Path
import json
import base64
from reportlab.lib.pagesizes import letter
from reportlab.pdfgen import canvas
from reportlab.lib.units import inch
from io import BytesIO
import shutil

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# JWT Configuration
JWT_SECRET = os.environ.get('JWT_SECRET', 'your-secret-key-change-in-production')
JWT_ALGORITHM = 'HS256'
JWT_EXPIRATION = 24  # hours

# Create uploads directory
UPLOADS_DIR = ROOT_DIR / 'uploads'
UPLOADS_DIR.mkdir(exist_ok=True)

app = FastAPI()
api_router = APIRouter(prefix="/api")
security = HTTPBearer()

# =======================
# Pydantic Models
# =======================

class User(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    company_id: Optional[str] = None
    role: str  # SUPERADMIN, ADMIN, EMPLOYEE, CLIENT
    email: EmailStr
    phone: Optional[str] = None
    display_name: str
    is_active: bool = True
    notifications_enabled: bool = True
    metadata: Optional[Dict[str, Any]] = {}
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    last_login: Optional[str] = None

class UserCreate(BaseModel):
    company_id: Optional[str] = None
    role: str
    email: EmailStr
    password: str
    phone: Optional[str] = None
    display_name: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class Company(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    industry: str  # furniture, automotive, technical_solutions
    description: Optional[str] = None
    address: Optional[str] = None
    contact_email: Optional[str] = None
    contact_phone: Optional[str] = None
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class CompanyCreate(BaseModel):
    name: str
    industry: str
    description: Optional[str] = None
    address: Optional[str] = None
    contact_email: Optional[str] = None
    contact_phone: Optional[str] = None

class Client(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    company_id: str
    name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    contact_person: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = {}
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class ClientCreate(BaseModel):
    name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    contact_person: Optional[str] = None

class Employee(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    company_id: str
    user_id: str
    position: Optional[str] = None
    skills: Optional[List[str]] = []
    hourly_rate: Optional[float] = None
    metadata: Optional[Dict[str, Any]] = {}
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class EmployeeCreate(BaseModel):
    user_id: str
    position: Optional[str] = None
    skills: Optional[List[str]] = []
    hourly_rate: Optional[float] = None

class Vehicle(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    company_id: str
    plate_number: str
    make: str
    model: str
    year: Optional[int] = None
    vin: Optional[str] = None
    owner_client_id: Optional[str] = None
    registration_details: Optional[Dict[str, Any]] = {}
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class VehicleCreate(BaseModel):
    plate_number: str
    make: str
    model: str
    year: Optional[int] = None
    vin: Optional[str] = None
    owner_client_id: Optional[str] = None
    registration_details: Optional[Dict[str, Any]] = {}

class WorkOrder(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    company_id: str
    order_number: str
    title: str
    description: Optional[str] = None
    created_by: str
    requested_by_client_id: Optional[str] = None
    vehicle_id: Optional[str] = None
    assigned_technicians: List[str] = []
    status: str = "PENDING"  # DRAFT, PENDING, APPROVED, IN_PROGRESS, COMPLETED, CANCELLED
    priority: str = "MEDIUM"  # LOW, MEDIUM, HIGH, URGENT
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    estimated_cost: Optional[float] = None
    quoted_price: Optional[float] = None
    attachments: List[str] = []
    preventive_flag: bool = False
    scheduled_date: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = {}
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    updated_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class WorkOrderCreate(BaseModel):
    title: str
    description: Optional[str] = None
    requested_by_client_id: Optional[str] = None
    vehicle_id: Optional[str] = None
    assigned_technicians: List[str] = []
    priority: str = "MEDIUM"
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    estimated_cost: Optional[float] = None
    quoted_price: Optional[float] = None
    preventive_flag: bool = False
    scheduled_date: Optional[str] = None

class WorkOrderUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    requested_by_client_id: Optional[str] = None
    vehicle_id: Optional[str] = None
    assigned_technicians: Optional[List[str]] = None
    status: Optional[str] = None
    priority: Optional[str] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    estimated_cost: Optional[float] = None
    quoted_price: Optional[float] = None
    scheduled_date: Optional[str] = None

class Expense(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    work_order_id: str
    company_id: str
    description: str
    amount: float
    currency: str = "USD"
    date: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    uploaded_by: str
    receipts: List[str] = []
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class ExpenseCreate(BaseModel):
    description: str
    amount: float
    currency: str = "USD"
    date: Optional[str] = None

class Invoice(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    company_id: str
    work_order_id: str
    invoice_number: str
    items: List[Dict[str, Any]] = []
    total_amount: float
    tax_amount: float = 0
    paid_amount: float = 0
    status: str = "DRAFT"  # DRAFT, ISSUED, PAID, CANCELLED
    issued_date: Optional[str] = None
    due_date: Optional[str] = None
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class InvoiceCreate(BaseModel):
    work_order_id: str
    items: List[Dict[str, Any]] = []
    tax_amount: float = 0
    due_days: int = 30

class PreventiveTask(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    company_id: str
    title: str
    description: Optional[str] = None
    asset_location: Optional[str] = None
    frequency: str  # daily, weekly, monthly, yearly
    next_due_date: str
    assigned_technicians: List[str] = []
    last_completed_date: Optional[str] = None
    status: str = "ACTIVE"  # ACTIVE, PAUSED, COMPLETED
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class PreventiveTaskCreate(BaseModel):
    title: str
    description: Optional[str] = None
    asset_location: Optional[str] = None
    frequency: str
    start_date: Optional[str] = None
    assigned_technicians: List[str] = []

class Notification(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    company_id: str
    type: str
    payload: Dict[str, Any]
    read_at: Optional[str] = None
    sent_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    channel: str = "in-app"  # in-app, email, sms

# =======================
# Utility Functions
# =======================

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))

def create_token(user_id: str, company_id: Optional[str], role: str) -> str:
    payload = {
        'user_id': user_id,
        'company_id': company_id,
        'role': role,
        'exp': datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRATION)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

def decode_token(token: str) -> Dict[str, Any]:
    try:
        return jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    token = credentials.credentials
    payload = decode_token(token)
    user = await db.users.find_one({"id": payload['user_id']}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    user['token_payload'] = payload
    return user

async def generate_order_number(company_id: str) -> str:
    """Generate unique order number for company"""
    count = await db.work_orders.count_documents({"company_id": company_id})
    return f"WO-{count + 1:06d}"

async def generate_invoice_number(company_id: str) -> str:
    """Generate unique invoice number for company"""
    count = await db.invoices.count_documents({"company_id": company_id})
    return f"INV-{count + 1:06d}"

async def send_notification(user_id: str, company_id: str, notification_type: str, payload: Dict[str, Any]):
    """Mock notification sender - logs to console"""
    notification = Notification(
        user_id=user_id,
        company_id=company_id,
        type=notification_type,
        payload=payload
    )
    await db.notifications.insert_one(notification.model_dump())
    logging.info(f"Notification sent to {user_id}: {notification_type}")

def calculate_next_due_date(start_date: str, frequency: str) -> str:
    """Calculate next due date based on frequency"""
    start = datetime.fromisoformat(start_date) if start_date else datetime.now(timezone.utc)
    
    if frequency == "daily":
        next_date = start + timedelta(days=1)
    elif frequency == "weekly":
        next_date = start + timedelta(weeks=1)
    elif frequency == "monthly":
        next_date = start + timedelta(days=30)
    elif frequency == "yearly":
        next_date = start + timedelta(days=365)
    else:
        next_date = start + timedelta(days=30)  # default monthly
    
    return next_date.isoformat()

# =======================
# Authentication Routes
# =======================

@api_router.post("/auth/login")
async def login(credentials: UserLogin):
    user_doc = await db.users.find_one({"email": credentials.email}, {"_id": 0})
    if not user_doc or not verify_password(credentials.password, user_doc.get('password_hash', '')):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    if not user_doc.get('is_active'):
        raise HTTPException(status_code=403, detail="Account is inactive")
    
    # Update last login
    await db.users.update_one(
        {"id": user_doc['id']},
        {"$set": {"last_login": datetime.now(timezone.utc).isoformat()}}
    )
    
    token = create_token(user_doc['id'], user_doc.get('company_id'), user_doc['role'])
    user_doc.pop('password_hash', None)
    
    return {"token": token, "user": user_doc}

@api_router.get("/users/me")
async def get_me(current_user: dict = Depends(get_current_user)):
    current_user.pop('password_hash', None)
    current_user.pop('token_payload', None)
    return current_user

# =======================
# User Management
# =======================

@api_router.post("/users")
async def create_user(user_data: UserCreate, current_user: dict = Depends(get_current_user)):
    # Role-based authorization
    if current_user['role'] == 'ADMIN':
        # Admins can only create CLIENT or EMPLOYEE for their company
        if user_data.role not in ['CLIENT', 'EMPLOYEE']:
            raise HTTPException(status_code=403, detail="Admins can only create CLIENT or EMPLOYEE users")
        if user_data.company_id != current_user['company_id']:
            raise HTTPException(status_code=403, detail="Can only create users for your company")
    elif current_user['role'] != 'SUPERADMIN':
        raise HTTPException(status_code=403, detail="Insufficient permissions")
    
    # Check if email exists
    existing = await db.users.find_one({"email": user_data.email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already exists")
    
    # Create user
    user = User(
        company_id=user_data.company_id,
        role=user_data.role,
        email=user_data.email,
        phone=user_data.phone,
        display_name=user_data.display_name
    )
    
    user_dict = user.model_dump()
    user_dict['password_hash'] = hash_password(user_data.password)
    
    await db.users.insert_one(user_dict)
    user_dict.pop('password_hash')
    return user_dict

@api_router.get("/users")
async def get_users(current_user: dict = Depends(get_current_user)):
    query = {}
    if current_user['role'] == 'ADMIN':
        query['company_id'] = current_user['company_id']
    
    users = await db.users.find(query, {"_id": 0, "password_hash": 0}).to_list(1000)
    return users

@api_router.get("/users/{user_id}")
async def get_user(user_id: str, current_user: dict = Depends(get_current_user)):
    user = await db.users.find_one({"id": user_id}, {"_id": 0, "password_hash": 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Check permissions
    if current_user['role'] != 'SUPERADMIN' and user.get('company_id') != current_user['company_id']:
        raise HTTPException(status_code=403, detail="Access denied")
    
    return user

# =======================
# Company Management
# =======================

@api_router.post("/companies")
async def create_company(company_data: CompanyCreate, current_user: dict = Depends(get_current_user)):
    if current_user['role'] != 'SUPERADMIN':
        raise HTTPException(status_code=403, detail="Only SuperAdmin can create companies")
    
    company = Company(**company_data.model_dump())
    await db.companies.insert_one(company.model_dump())
    return company

@api_router.get("/companies")
async def get_companies(current_user: dict = Depends(get_current_user)):
    if current_user['role'] == 'SUPERADMIN':
        companies = await db.companies.find({}, {"_id": 0}).to_list(100)
    else:
        companies = await db.companies.find({"id": current_user['company_id']}, {"_id": 0}).to_list(1)
    return companies

@api_router.get("/companies/{company_id}")
async def get_company(company_id: str, current_user: dict = Depends(get_current_user)):
    if current_user['role'] != 'SUPERADMIN' and current_user['company_id'] != company_id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    company = await db.companies.find_one({"id": company_id}, {"_id": 0})
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")
    return company

# =======================
# Client Management
# =======================

@api_router.post("/companies/{company_id}/clients")
async def create_client(company_id: str, client_data: ClientCreate, current_user: dict = Depends(get_current_user)):
    if current_user['role'] not in ['SUPERADMIN', 'ADMIN']:
        raise HTTPException(status_code=403, detail="Insufficient permissions")
    
    if current_user['role'] == 'ADMIN' and current_user['company_id'] != company_id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    client = Client(company_id=company_id, **client_data.model_dump())
    await db.clients.insert_one(client.model_dump())
    return client

@api_router.get("/companies/{company_id}/clients")
async def get_clients(company_id: str, current_user: dict = Depends(get_current_user)):
    if current_user['role'] != 'SUPERADMIN' and current_user['company_id'] != company_id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    clients = await db.clients.find({"company_id": company_id}, {"_id": 0}).to_list(1000)
    return clients

# =======================
# Employee Management
# =======================

@api_router.post("/companies/{company_id}/employees")
async def create_employee(company_id: str, emp_data: EmployeeCreate, current_user: dict = Depends(get_current_user)):
    if current_user['role'] not in ['SUPERADMIN', 'ADMIN']:
        raise HTTPException(status_code=403, detail="Insufficient permissions")
    
    if current_user['role'] == 'ADMIN' and current_user['company_id'] != company_id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    employee = Employee(company_id=company_id, **emp_data.model_dump())
    await db.employees.insert_one(employee.model_dump())
    return employee

@api_router.get("/companies/{company_id}/employees")
async def get_employees(company_id: str, current_user: dict = Depends(get_current_user)):
    if current_user['role'] != 'SUPERADMIN' and current_user['company_id'] != company_id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    employees = await db.employees.find({"company_id": company_id}, {"_id": 0}).to_list(1000)
    return employees

# =======================
# Vehicle Management (Vigor)
# =======================

@api_router.post("/companies/{company_id}/vehicles")
async def create_vehicle(company_id: str, vehicle_data: VehicleCreate, current_user: dict = Depends(get_current_user)):
    if current_user['role'] not in ['SUPERADMIN', 'ADMIN', 'EMPLOYEE']:
        raise HTTPException(status_code=403, detail="Insufficient permissions")
    
    if current_user['role'] != 'SUPERADMIN' and current_user['company_id'] != company_id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    vehicle = Vehicle(company_id=company_id, **vehicle_data.model_dump())
    await db.vehicles.insert_one(vehicle.model_dump())
    return vehicle

@api_router.get("/companies/{company_id}/vehicles")
async def get_vehicles(company_id: str, current_user: dict = Depends(get_current_user)):
    if current_user['role'] != 'SUPERADMIN' and current_user['company_id'] != company_id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    vehicles = await db.vehicles.find({"company_id": company_id}, {"_id": 0}).to_list(1000)
    return vehicles

# =======================
# Work Order Management
# =======================

@api_router.post("/companies/{company_id}/workorders")
async def create_work_order(company_id: str, wo_data: WorkOrderCreate, current_user: dict = Depends(get_current_user)):
    if current_user['role'] != 'SUPERADMIN' and current_user['company_id'] != company_id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Check company-specific rules
    company = await db.companies.find_one({"id": company_id})
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")
    
    # Sama Al Jazeera: Only Admins can create work orders
    if company['industry'] == 'furniture' and current_user['role'] not in ['SUPERADMIN', 'ADMIN']:
        raise HTTPException(status_code=403, detail="Only Admins can create work orders for this company")
    
    # For other companies, both Admins and Employees can create
    if current_user['role'] not in ['SUPERADMIN', 'ADMIN', 'EMPLOYEE']:
        raise HTTPException(status_code=403, detail="Insufficient permissions")
    
    order_number = await generate_order_number(company_id)
    
    work_order = WorkOrder(
        company_id=company_id,
        order_number=order_number,
        created_by=current_user['id'],
        **wo_data.model_dump()
    )
    
    await db.work_orders.insert_one(work_order.model_dump())
    
    # Send notifications to assigned technicians
    for tech_id in work_order.assigned_technicians:
        await send_notification(
            tech_id,
            company_id,
            "work_order_assigned",
            {"work_order_id": work_order.id, "title": work_order.title}
        )
    
    return work_order

@api_router.get("/companies/{company_id}/workorders")
async def get_work_orders(
    company_id: str,
    status: Optional[str] = None,
    assigned_to: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    if current_user['role'] != 'SUPERADMIN' and current_user['company_id'] != company_id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    query = {"company_id": company_id}
    
    if status:
        query['status'] = status
    
    if assigned_to:
        query['assigned_technicians'] = assigned_to
    
    # Role-based filtering
    if current_user['role'] == 'EMPLOYEE':
        # Employees see only work orders they're assigned to or approved orders
        query['$or'] = [
            {'assigned_technicians': current_user['id']},
            {'status': 'APPROVED'}
        ]
    elif current_user['role'] == 'CLIENT':
        # Clients see only their own work orders
        query['requested_by_client_id'] = current_user['id']
    
    work_orders = await db.work_orders.find(query, {"_id": 0}).to_list(1000)
    return work_orders

@api_router.get("/companies/{company_id}/workorders/{work_order_id}")
async def get_work_order(company_id: str, work_order_id: str, current_user: dict = Depends(get_current_user)):
    if current_user['role'] != 'SUPERADMIN' and current_user['company_id'] != company_id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    work_order = await db.work_orders.find_one({"id": work_order_id, "company_id": company_id}, {"_id": 0})
    if not work_order:
        raise HTTPException(status_code=404, detail="Work order not found")
    
    # Check visibility
    if current_user['role'] == 'EMPLOYEE':
        if current_user['id'] not in work_order['assigned_technicians'] and work_order['status'] != 'APPROVED':
            raise HTTPException(status_code=403, detail="Access denied")
    elif current_user['role'] == 'CLIENT':
        if work_order['requested_by_client_id'] != current_user['id']:
            raise HTTPException(status_code=403, detail="Access denied")
    
    return work_order

@api_router.put("/companies/{company_id}/workorders/{work_order_id}")
async def update_work_order(
    company_id: str,
    work_order_id: str,
    update_data: WorkOrderUpdate,
    current_user: dict = Depends(get_current_user)
):
    if current_user['role'] != 'SUPERADMIN' and current_user['company_id'] != company_id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    work_order = await db.work_orders.find_one({"id": work_order_id, "company_id": company_id})
    if not work_order:
        raise HTTPException(status_code=404, detail="Work order not found")
    
    # Prepare update
    update_dict = {k: v for k, v in update_data.model_dump().items() if v is not None}
    update_dict['updated_at'] = datetime.now(timezone.utc).isoformat()
    
    if update_dict:
        await db.work_orders.update_one(
            {"id": work_order_id},
            {"$set": update_dict}
        )
        
        # Send notification on status change
        if 'status' in update_dict:
            await send_notification(
                work_order['created_by'],
                company_id,
                "work_order_status_changed",
                {"work_order_id": work_order_id, "new_status": update_dict['status']}
            )
    
    updated_wo = await db.work_orders.find_one({"id": work_order_id}, {"_id": 0})
    return updated_wo

@api_router.post("/companies/{company_id}/workorders/{work_order_id}/approve")
async def approve_work_order(company_id: str, work_order_id: str, current_user: dict = Depends(get_current_user)):
    if current_user['role'] not in ['SUPERADMIN', 'ADMIN']:
        raise HTTPException(status_code=403, detail="Only Admins can approve work orders")
    
    if current_user['role'] == 'ADMIN' and current_user['company_id'] != company_id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    work_order = await db.work_orders.find_one({"id": work_order_id, "company_id": company_id})
    if not work_order:
        raise HTTPException(status_code=404, detail="Work order not found")
    
    await db.work_orders.update_one(
        {"id": work_order_id},
        {"$set": {"status": "APPROVED", "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    # Notify assigned technicians
    for tech_id in work_order['assigned_technicians']:
        await send_notification(
            tech_id,
            company_id,
            "work_order_approved",
            {"work_order_id": work_order_id, "title": work_order['title']}
        )
    
    return {"message": "Work order approved"}

# =======================
# Expense Management
# =======================

@api_router.post("/companies/{company_id}/workorders/{work_order_id}/expenses")
async def add_expense(
    company_id: str,
    work_order_id: str,
    expense_data: ExpenseCreate,
    current_user: dict = Depends(get_current_user)
):
    if current_user['role'] != 'SUPERADMIN' and current_user['company_id'] != company_id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    work_order = await db.work_orders.find_one({"id": work_order_id, "company_id": company_id})
    if not work_order:
        raise HTTPException(status_code=404, detail="Work order not found")
    
    expense = Expense(
        work_order_id=work_order_id,
        company_id=company_id,
        uploaded_by=current_user['id'],
        date=expense_data.date or datetime.now(timezone.utc).isoformat(),
        **expense_data.model_dump(exclude={'date'})
    )
    
    await db.expenses.insert_one(expense.model_dump())
    return expense

@api_router.get("/companies/{company_id}/workorders/{work_order_id}/expenses")
async def get_expenses(company_id: str, work_order_id: str, current_user: dict = Depends(get_current_user)):
    if current_user['role'] != 'SUPERADMIN' and current_user['company_id'] != company_id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    expenses = await db.expenses.find({"work_order_id": work_order_id, "company_id": company_id}, {"_id": 0}).to_list(1000)
    return expenses

# =======================
# Invoice Management
# =======================

@api_router.post("/companies/{company_id}/invoices")
async def create_invoice(company_id: str, invoice_data: InvoiceCreate, current_user: dict = Depends(get_current_user)):
    if current_user['role'] not in ['SUPERADMIN', 'ADMIN']:
        raise HTTPException(status_code=403, detail="Only Admins can create invoices")
    
    if current_user['role'] == 'ADMIN' and current_user['company_id'] != company_id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Get work order
    work_order = await db.work_orders.find_one({"id": invoice_data.work_order_id, "company_id": company_id})
    if not work_order:
        raise HTTPException(status_code=404, detail="Work order not found")
    
    # Calculate total
    total = work_order.get('quoted_price', 0)
    
    # Add expenses if items not provided
    if not invoice_data.items:
        expenses = await db.expenses.find({"work_order_id": invoice_data.work_order_id}, {"_id": 0}).to_list(1000)
        items = [
            {"description": "Quoted Price", "amount": work_order.get('quoted_price', 0)}
        ]
        for exp in expenses:
            items.append({"description": exp['description'], "amount": exp['amount']})
            total += exp['amount']
    else:
        items = invoice_data.items
        total = sum(item['amount'] for item in items)
    
    total_with_tax = total + invoice_data.tax_amount
    invoice_number = await generate_invoice_number(company_id)
    
    invoice = Invoice(
        company_id=company_id,
        work_order_id=invoice_data.work_order_id,
        invoice_number=invoice_number,
        items=items,
        total_amount=total_with_tax,
        tax_amount=invoice_data.tax_amount,
        status="ISSUED",
        issued_date=datetime.now(timezone.utc).isoformat(),
        due_date=(datetime.now(timezone.utc) + timedelta(days=invoice_data.due_days)).isoformat()
    )
    
    await db.invoices.insert_one(invoice.model_dump())
    
    # Notify client
    if work_order.get('requested_by_client_id'):
        await send_notification(
            work_order['requested_by_client_id'],
            company_id,
            "invoice_issued",
            {"invoice_id": invoice.id, "invoice_number": invoice_number}
        )
    
    return invoice

@api_router.get("/companies/{company_id}/invoices")
async def get_invoices(company_id: str, current_user: dict = Depends(get_current_user)):
    if current_user['role'] != 'SUPERADMIN' and current_user['company_id'] != company_id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    query = {"company_id": company_id}
    
    if current_user['role'] == 'CLIENT':
        # Get work orders for this client
        client_wos = await db.work_orders.find({"requested_by_client_id": current_user['id']}, {"_id": 0}).to_list(1000)
        wo_ids = [wo['id'] for wo in client_wos]
        query['work_order_id'] = {"$in": wo_ids}
    
    invoices = await db.invoices.find(query, {"_id": 0}).to_list(1000)
    return invoices

@api_router.get("/companies/{company_id}/invoices/{invoice_id}")
async def get_invoice(company_id: str, invoice_id: str, current_user: dict = Depends(get_current_user)):
    if current_user['role'] != 'SUPERADMIN' and current_user['company_id'] != company_id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    invoice = await db.invoices.find_one({"id": invoice_id, "company_id": company_id}, {"_id": 0})
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    
    return invoice

@api_router.get("/companies/{company_id}/invoices/{invoice_id}/pdf")
async def generate_invoice_pdf(company_id: str, invoice_id: str, current_user: dict = Depends(get_current_user)):
    from fastapi.responses import StreamingResponse
    
    if current_user['role'] != 'SUPERADMIN' and current_user['company_id'] != company_id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    invoice = await db.invoices.find_one({"id": invoice_id, "company_id": company_id}, {"_id": 0})
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    
    company = await db.companies.find_one({"id": company_id}, {"_id": 0})
    
    # Create PDF
    buffer = BytesIO()
    c = canvas.Canvas(buffer, pagesize=letter)
    width, height = letter
    
    # Header
    c.setFont("Helvetica-Bold", 20)
    c.drawString(1*inch, height - 1*inch, company['name'])
    c.setFont("Helvetica", 10)
    c.drawString(1*inch, height - 1.3*inch, company.get('address', ''))
    
    # Invoice details
    c.setFont("Helvetica-Bold", 16)
    c.drawString(1*inch, height - 2*inch, f"Invoice #{invoice['invoice_number']}")
    c.setFont("Helvetica", 10)
    c.drawString(1*inch, height - 2.3*inch, f"Issued: {invoice['issued_date'][:10]}")
    c.drawString(1*inch, height - 2.5*inch, f"Due: {invoice['due_date'][:10]}")
    
    # Items
    y = height - 3*inch
    c.setFont("Helvetica-Bold", 12)
    c.drawString(1*inch, y, "Description")
    c.drawString(5*inch, y, "Amount")
    y -= 0.3*inch
    
    c.setFont("Helvetica", 10)
    for item in invoice['items']:
        c.drawString(1*inch, y, item['description'])
        c.drawString(5*inch, y, f"${item['amount']:.2f}")
        y -= 0.25*inch
    
    # Total
    y -= 0.3*inch
    c.setFont("Helvetica-Bold", 12)
    c.drawString(4*inch, y, "Tax:")
    c.drawString(5*inch, y, f"${invoice['tax_amount']:.2f}")
    y -= 0.3*inch
    c.drawString(4*inch, y, "Total:")
    c.drawString(5*inch, y, f"${invoice['total_amount']:.2f}")
    
    c.save()
    buffer.seek(0)
    
    return StreamingResponse(buffer, media_type="application/pdf", headers={"Content-Disposition": f"attachment; filename=invoice_{invoice['invoice_number']}.pdf"})

# =======================
# Preventive Maintenance (MSAM)
# =======================

@api_router.post("/companies/{company_id}/preventive_tasks")
async def create_preventive_task(company_id: str, task_data: PreventiveTaskCreate, current_user: dict = Depends(get_current_user)):
    if current_user['role'] not in ['SUPERADMIN', 'ADMIN']:
        raise HTTPException(status_code=403, detail="Only Admins can create preventive tasks")
    
    if current_user['role'] == 'ADMIN' and current_user['company_id'] != company_id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    start_date = task_data.start_date or datetime.now(timezone.utc).isoformat()
    next_due = calculate_next_due_date(start_date, task_data.frequency)
    
    task = PreventiveTask(
        company_id=company_id,
        next_due_date=next_due,
        **task_data.model_dump(exclude={'start_date'})
    )
    
    await db.preventive_tasks.insert_one(task.model_dump())
    return task

@api_router.get("/companies/{company_id}/preventive_tasks")
async def get_preventive_tasks(company_id: str, current_user: dict = Depends(get_current_user)):
    if current_user['role'] != 'SUPERADMIN' and current_user['company_id'] != company_id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    tasks = await db.preventive_tasks.find({"company_id": company_id}, {"_id": 0}).to_list(1000)
    return tasks

@api_router.put("/companies/{company_id}/preventive_tasks/{task_id}/complete")
async def complete_preventive_task(company_id: str, task_id: str, current_user: dict = Depends(get_current_user)):
    if current_user['role'] not in ['SUPERADMIN', 'ADMIN', 'EMPLOYEE']:
        raise HTTPException(status_code=403, detail="Insufficient permissions")
    
    if current_user['role'] != 'SUPERADMIN' and current_user['company_id'] != company_id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    task = await db.preventive_tasks.find_one({"id": task_id, "company_id": company_id})
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    now = datetime.now(timezone.utc).isoformat()
    next_due = calculate_next_due_date(now, task['frequency'])
    
    await db.preventive_tasks.update_one(
        {"id": task_id},
        {"$set": {"last_completed_date": now, "next_due_date": next_due}}
    )
    
    return {"message": "Task completed", "next_due_date": next_due}

# =======================
# Notifications
# =======================

@api_router.get("/users/{user_id}/notifications")
async def get_notifications(user_id: str, current_user: dict = Depends(get_current_user)):
    if current_user['id'] != user_id and current_user['role'] != 'SUPERADMIN':
        raise HTTPException(status_code=403, detail="Access denied")
    
    notifications = await db.notifications.find({"user_id": user_id}, {"_id": 0}).sort("sent_at", -1).to_list(100)
    return notifications

@api_router.put("/notifications/{notification_id}/read")
async def mark_notification_read(notification_id: str, current_user: dict = Depends(get_current_user)):
    notification = await db.notifications.find_one({"id": notification_id})
    if not notification:
        raise HTTPException(status_code=404, detail="Notification not found")
    
    if notification['user_id'] != current_user['id'] and current_user['role'] != 'SUPERADMIN':
        raise HTTPException(status_code=403, detail="Access denied")
    
    await db.notifications.update_one(
        {"id": notification_id},
        {"$set": {"read_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    return {"message": "Notification marked as read"}

# =======================
# Reports
# =======================

@api_router.get("/companies/{company_id}/reports/overview")
async def get_overview_report(company_id: str, current_user: dict = Depends(get_current_user)):
    if current_user['role'] != 'SUPERADMIN' and current_user['company_id'] != company_id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Count work orders by status
    work_orders = await db.work_orders.find({"company_id": company_id}, {"_id": 0}).to_list(10000)
    status_counts = {}
    for wo in work_orders:
        status = wo['status']
        status_counts[status] = status_counts.get(status, 0) + 1
    
    # Count invoices
    invoices = await db.invoices.find({"company_id": company_id}, {"_id": 0}).to_list(10000)
    total_revenue = sum(inv['total_amount'] for inv in invoices if inv['status'] == 'PAID')
    pending_invoices = sum(1 for inv in invoices if inv['status'] == 'ISSUED')
    
    # Count expenses
    expenses = await db.expenses.find({"company_id": company_id}, {"_id": 0}).to_list(10000)
    total_expenses = sum(exp['amount'] for exp in expenses)
    
    return {
        "total_work_orders": len(work_orders),
        "status_breakdown": status_counts,
        "total_revenue": total_revenue,
        "total_expenses": total_expenses,
        "profit_margin": total_revenue - total_expenses,
        "pending_invoices": pending_invoices,
        "active_clients": len(await db.clients.find({"company_id": company_id}, {"_id": 0}).to_list(10000)),
        "active_employees": len(await db.employees.find({"company_id": company_id}, {"_id": 0}).to_list(10000))
    }

@api_router.get("/companies/{company_id}/reports/workorder-trends")
async def get_workorder_trends(
    company_id: str,
    from_date: Optional[str] = None,
    to_date: Optional[str] = None,
    group_by: str = "month",
    current_user: dict = Depends(get_current_user)
):
    if current_user['role'] != 'SUPERADMIN' and current_user['company_id'] != company_id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    query = {"company_id": company_id}
    if from_date:
        query['created_at'] = {"$gte": from_date}
    if to_date:
        query.setdefault('created_at', {})['$lte'] = to_date
    
    work_orders = await db.work_orders.find(query, {"_id": 0}).to_list(10000)
    
    # Group by date
    trends = {}
    for wo in work_orders:
        date_str = wo['created_at'][:10]  # YYYY-MM-DD
        if group_by == "month":
            key = date_str[:7]  # YYYY-MM
        elif group_by == "week":
            key = date_str[:7]  # Simplified to month
        else:
            key = date_str
        
        trends[key] = trends.get(key, 0) + 1
    
    return {"trends": trends, "group_by": group_by}

@api_router.get("/superadmin/reports/companies-summary")
async def get_companies_summary(current_user: dict = Depends(get_current_user)):
    if current_user['role'] != 'SUPERADMIN':
        raise HTTPException(status_code=403, detail="Only SuperAdmin can access this report")
    
    companies = await db.companies.find({}, {"_id": 0}).to_list(100)
    summary = []
    
    for company in companies:
        company_id = company['id']
        work_orders = await db.work_orders.count_documents({"company_id": company_id})
        invoices = await db.invoices.find({"company_id": company_id}, {"_id": 0}).to_list(10000)
        revenue = sum(inv['total_amount'] for inv in invoices if inv['status'] == 'PAID')
        
        summary.append({
            "company_id": company_id,
            "company_name": company['name'],
            "industry": company['industry'],
            "total_work_orders": work_orders,
            "total_revenue": revenue
        })
    
    return {"companies": summary}

# File upload endpoint
@api_router.post("/upload")
async def upload_file(file: UploadFile = File(...), current_user: dict = Depends(get_current_user)):
    file_id = str(uuid.uuid4())
    file_extension = Path(file.filename).suffix
    file_path = UPLOADS_DIR / f"{file_id}{file_extension}"
    
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    
    return {"file_id": file_id, "filename": file.filename, "path": str(file_path)}

# Include router
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
