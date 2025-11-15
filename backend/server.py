from fastapi import FastAPI, APIRouter, HTTPException, Depends, File, UploadFile, Query, Form
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.staticfiles import StaticFiles
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from starlette.middleware.gzip import GZipMiddleware
from starlette.responses import Response
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field, ConfigDict, EmailStr
from typing import List, Optional, Dict, Any, Union
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
from contextlib import asynccontextmanager
from functools import lru_cache
import asyncio
from typing import Dict, Any

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection with better error handling and connection pooling
mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
if not mongo_url:
    raise ValueError("MONGO_URL environment variable is not set")

try:
    # Configure connection pooling for better performance
    client = AsyncIOMotorClient(
        mongo_url,
        maxPoolSize=100,  # Maximum number of connections in the pool
        minPoolSize=10,  # Minimum number of connections in the pool
        maxIdleTimeMS=30000,  # Close connections after 30 seconds of inactivity
        serverSelectionTimeoutMS=5000,  # Timeout for server selection
        connectTimeoutMS=5000,  # Timeout for connection
        socketTimeoutMS=5000,  # Timeout for socket operations
        maxConnecting=5,  # Limit concurrent connection attempts
        waitQueueTimeoutMS=5000,  # Timeout for waiting for a connection
        retryWrites=True,  # Enable retryable writes
        retryReads=True,  # Enable retryable reads
        connect=False,  # Connect lazily - don't connect immediately
    )
    db = client[os.environ.get('DB_NAME', 'erp_crm_database')]
except Exception as e:
    logging.error(f"Failed to connect to MongoDB: {e}")
    raise

# JWT Configuration
JWT_SECRET = os.environ.get('JWT_SECRET', 'your-secret-key-change-in-production')
JWT_ALGORITHM = 'HS256'
JWT_EXPIRATION = 24  # hours

# Create uploads directory
UPLOADS_DIR = ROOT_DIR / 'uploads'
UPLOADS_DIR.mkdir(exist_ok=True)

# Simple in-memory cache for frequently accessed data
user_cache: Dict[str, Any] = {}
CACHE_TTL = 600  # Increased to 10 minutes for better performance

class CacheEntry:
    def __init__(self, data: Dict[str, Any]):
        self.data = data
        self.timestamp = datetime.now(timezone.utc)
    
    def is_expired(self) -> bool:
        return (datetime.now(timezone.utc) - self.timestamp).total_seconds() > CACHE_TTL

# Background task to clean expired cache entries
async def clean_expired_cache():
    while True:
        try:
            # Clean expired cache entries every 5 minutes
            await asyncio.sleep(300)
            current_time = datetime.now(timezone.utc)
            expired_keys = []
            
            # Create a copy of keys to avoid modification during iteration
            keys_to_check = list(user_cache.keys())
            
            for key in keys_to_check:
                cache_entry = user_cache.get(key)
                if cache_entry and isinstance(cache_entry, CacheEntry) and cache_entry.is_expired():
                    expired_keys.append(key)
            
            # Remove expired entries
            for key in expired_keys:
                if key in user_cache:
                    del user_cache[key]
            
            if expired_keys:
                logging.info(f"Cleaned {len(expired_keys)} expired cache entries")
        except Exception as e:
            logging.error(f"Error in cache cleanup: {e}")

# Lifespan event handler
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup event
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    )
    logger = logging.getLogger(__name__)
    logger.info("Starting up the application")
    
    # Create database indexes for better performance
    try:
        # Users collection indexes
        try:
            await db.users.create_index("email")
        except Exception as e:
            logger.warning(f"Could not create index on users.email: {e}")
        try:
            await db.users.create_index("company_id")
        except Exception as e:
            logger.warning(f"Could not create index on users.company_id: {e}")
        try:
            await db.users.create_index("role")
        except Exception as e:
            logger.warning(f"Could not create index on users.role: {e}")
        
        # Companies collection indexes
        try:
            await db.companies.create_index("id")
        except Exception as e:
            logger.warning(f"Could not create index on companies.id: {e}")
        
        # Clients collection indexes
        try:
            await db.clients.create_index("company_id")
        except Exception as e:
            logger.warning(f"Could not create index on clients.company_id: {e}")
        
        # Employees collection indexes
        try:
            await db.employees.create_index("company_id")
        except Exception as e:
            logger.warning(f"Could not create index on employees.company_id: {e}")
        try:
            await db.employees.create_index("user_id")
        except Exception as e:
            logger.warning(f"Could not create index on employees.user_id: {e}")
        
        # Work Orders collection indexes
        try:
            await db.work_orders.create_index([("company_id", 1), ("status", 1)])
        except Exception as e:
            logger.warning(f"Could not create index on work_orders company_id+status: {e}")
        try:
            await db.work_orders.create_index([("company_id", 1), ("assigned_technicians", 1)])
        except Exception as e:
            logger.warning(f"Could not create index on work_orders company_id+assigned_technicians: {e}")
        try:
            await db.work_orders.create_index([("company_id", 1), ("requested_by_client_id", 1)])
        except Exception as e:
            logger.warning(f"Could not create index on work_orders company_id+requested_by_client_id: {e}")
        try:
            await db.work_orders.create_index("created_at")
        except Exception as e:
            logger.warning(f"Could not create index on work_orders.created_at: {e}")
        try:
            await db.work_orders.create_index("order_number")
        except Exception as e:
            logger.warning(f"Could not create index on work_orders.order_number: {e}")
        
        # Invoices collection indexes
        try:
            await db.invoices.create_index([("company_id", 1), ("status", 1)])
        except Exception as e:
            logger.warning(f"Could not create index on invoices company_id+status: {e}")
        try:
            await db.invoices.create_index("work_order_id")
        except Exception as e:
            logger.warning(f"Could not create index on invoices.work_order_id: {e}")
        try:
            await db.invoices.create_index("invoice_number")
        except Exception as e:
            logger.warning(f"Could not create index on invoices.invoice_number: {e}")
        
        # Vehicles collection indexes
        try:
            await db.vehicles.create_index("company_id")
        except Exception as e:
            logger.warning(f"Could not create index on vehicles.company_id: {e}")
        try:
            await db.vehicles.create_index("plate_number")
        except Exception as e:
            logger.warning(f"Could not create index on vehicles.plate_number: {e}")
        
        # Comments collection indexes
        try:
            await db.comments.create_index("work_order_id")
        except Exception as e:
            logger.warning(f"Could not create index on comments.work_order_id: {e}")
        try:
            await db.comments.create_index("company_id")
        except Exception as e:
            logger.warning(f"Could not create index on comments.company_id: {e}")
        
        # Preventive Tasks collection indexes
        try:
            await db.preventive_tasks.create_index("company_id")
        except Exception as e:
            logger.warning(f"Could not create index on preventive_tasks.company_id: {e}")
        try:
            await db.preventive_tasks.create_index("vehicle_id")
        except Exception as e:
            logger.warning(f"Could not create index on preventive_tasks.vehicle_id: {e}")
        
        # Notifications collection indexes
        try:
            await db.notifications.create_index("user_id")
        except Exception as e:
            logger.warning(f"Could not create index on notifications.user_id: {e}")
        try:
            await db.notifications.create_index("sent_at")
        except Exception as e:
            logger.warning(f"Could not create index on notifications.sent_at: {e}")
        
        logger.info("Database indexes processed successfully")
    except Exception as e:
        logger.error(f"Failed to create database indexes: {e}")
    
    # Start background cache cleanup task
    cache_cleanup_task = asyncio.create_task(clean_expired_cache())
    
    # Yield control to the application
    yield
    
    # Shutdown event
    cache_cleanup_task.cancel()
    logger.info("Shutting down the application")
    client.close()

app = FastAPI(lifespan=lifespan)
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
    client_id: Optional[str] = None  # For linking CLIENT users to client records

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
    paid_amount: float = 0.0
    attachments: List[str] = []
    preventive_flag: bool = False
    scheduled_date: Optional[str] = None
    products: List[Dict[str, Any]] = []  # Added products field
    # SLA and deadline fields
    sla_hours: Optional[int] = None  # SLA in hours
    promise_date: Optional[str] = None  # Promise completion date
    asset_code: Optional[str] = None  # Asset code for MSAM Technical Solutions
    category: Optional[str] = None  # Category for MSAM Technical Solutions
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
    paid_amount: float = 0.0
    preventive_flag: bool = False
    scheduled_date: Optional[str] = None
    products: List[Dict[str, Any]] = []  # Added products field
    # SLA and deadline fields
    sla_hours: Optional[int] = None  # SLA in hours
    promise_date: Optional[str] = None  # Promise completion date
    asset_code: Optional[str] = None  # Asset code for MSAM Technical Solutions
    category: Optional[str] = None  # Category for MSAM Technical Solutions

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
    paid_amount: Optional[float] = None
    scheduled_date: Optional[str] = None
    products: Optional[List[Dict[str, Any]]] = None  # Added products field
    # SLA and deadline fields
    sla_hours: Optional[int] = None  # SLA in hours
    promise_date: Optional[str] = None  # Promise completion date
    asset_code: Optional[str] = None  # Asset code for MSAM Technical Solutions
    category: Optional[str] = None  # Category for MSAM Technical Solutions

class Expense(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    work_order_id: str
    company_id: str
    description: str
    amount: float
    currency: str = "AED"
    date: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    uploaded_by: str
    receipts: List[str] = []
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class ExpenseCreate(BaseModel):
    description: str
    amount: float
    currency: str = "AED"
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

class InvoiceUpdate(BaseModel):
    items: Optional[List[Dict[str, Any]]] = None
    tax_amount: Optional[float] = None
    due_date: Optional[str] = None
    status: Optional[str] = None

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

class Comment(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    work_order_id: str
    company_id: str
    user_id: str
    content: str
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    updated_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class CommentCreate(BaseModel):
    content: str

class CommentUpdate(BaseModel):
    content: str

# =======================
# Payment Model
# =======================

class Payment(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    work_order_id: str
    company_id: str
    amount: float
    payment_method: str  # 'cash' or 'card'
    reference_number: Optional[str] = None
    created_by: str
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class PaymentCreate(BaseModel):
    work_order_id: str
    amount: float
    payment_method: str  # 'cash' or 'card'
    reference_number: Optional[str] = None

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
    user_id = payload['user_id']
    
    # Check cache first (non-blocking check)
    cache_entry = user_cache.get(user_id)
    # Check if it's a CacheEntry object and not expired
    if cache_entry and isinstance(cache_entry, CacheEntry) and not cache_entry.is_expired():
        user = cache_entry.data.copy()
        user['token_payload'] = payload
        return user
    
    # If not in cache or expired, fetch from database
    user = await db.users.find_one({"id": user_id}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    
    # Update cache (non-blocking update)
    user_cache[user_id] = CacheEntry(user)
    
    user['token_payload'] = payload
    return user

async def generate_order_number(company_id: str) -> str:
    """Generate unique order number for company"""
    count = await db.work_orders.count_documents({"company_id": company_id}, hint=[("company_id", 1)])
    return f"WO-{count + 1:06d}"

async def generate_invoice_number(company_id: str) -> str:
    """Generate unique invoice number for company"""
    count = await db.invoices.count_documents({"company_id": company_id}, hint=[("company_id", 1)])
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

async def update_last_login(user_id: str):
    """Update user's last login time"""
    await db.users.update_one(
        {"id": user_id},
        {"$set": {"last_login": datetime.now(timezone.utc).isoformat()}}
    )

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
    # Use hint to ensure we use the email index for faster lookup
    user_doc = await db.users.find_one({"email": credentials.email}, {"_id": 0})
    if not user_doc or not verify_password(credentials.password, user_doc.get('password_hash', '')):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    if not user_doc.get('is_active'):
        raise HTTPException(status_code=403, detail="Account is inactive")
    
    # Update last login (non-blocking)
    asyncio.create_task(
        update_last_login(user_doc['id'])
    )
    
    token = create_token(user_doc['id'], user_doc.get('company_id'), user_doc['role'])
    user_doc.pop('password_hash', None)
    
    # Pre-cache the user to speed up subsequent requests
    user_cache[user_doc['id']] = CacheEntry(user_doc)
    
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
    try:
        logging.info(f"Creating user with data: {user_data}")
        
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
        logging.info(f"Checking if email exists: {user_data.email}")
        existing = await db.users.find_one({"email": user_data.email})
        logging.info(f"Existing user check result: {existing}")
        if existing:
            raise HTTPException(status_code=400, detail="Email already exists")
        
        # For CLIENT users, verify the client_id if provided
        if user_data.role == 'CLIENT' and user_data.client_id:
            client = await db.clients.find_one({"id": user_data.client_id, "company_id": user_data.company_id})
            if not client:
                raise HTTPException(status_code=400, detail="Invalid client_id provided")
        
        # Create user
        logging.info("Creating User object")
        user = User(
            company_id=user_data.company_id,
            role=user_data.role,
            email=user_data.email,
            phone=user_data.phone,
            display_name=user_data.display_name
        )
        
        logging.info(f"User object created: {user}")
        logging.info("Converting user to dict")
        user_dict = user.model_dump()
        logging.info(f"User dict: {user_dict}")
        logging.info("Hashing password")
        user_dict['password_hash'] = hash_password(user_data.password)
        
        # Add client_id for CLIENT users if provided
        if user_data.role == 'CLIENT' and user_data.client_id:
            user_dict['client_id'] = user_data.client_id
        
        logging.info(f"User dict with password: {user_dict}")
        
        logging.info("Inserting user into database")
        result = await db.users.insert_one(user_dict)
        logging.info(f"Insert result: {result}")
        logging.info("Removing password_hash from response")
        user_dict.pop('password_hash')
        logging.info("User created successfully")
        return user_dict
    except HTTPException as he:
        logging.error(f"HTTP Exception: {he.detail}")
        raise he
    except Exception as e:
        logging.error(f"Error creating user: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Error creating user: {str(e)}")

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

@api_router.put("/users/{user_id}")
async def update_user(user_id: str, user_data: UserCreate, current_user: dict = Depends(get_current_user)):
    # Role-based authorization
    if current_user['role'] == 'ADMIN':
        # Admins can only update CLIENT or EMPLOYEE for their company
        if user_data.role not in ['CLIENT', 'EMPLOYEE']:
            raise HTTPException(status_code=403, detail="Admins can only update CLIENT or EMPLOYEE users")
        if user_data.company_id != current_user['company_id']:
            raise HTTPException(status_code=403, detail="Can only update users for your company")
    elif current_user['role'] != 'SUPERADMIN':
        raise HTTPException(status_code=403, detail="Insufficient permissions")
    
    # Check if user exists
    existing_user = await db.users.find_one({"id": user_id})
    if not existing_user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Check if email is being changed and if it already exists
    if user_data.email != existing_user['email']:
        email_exists = await db.users.find_one({"email": user_data.email})
        if email_exists:
            raise HTTPException(status_code=400, detail="Email already exists")
    
    # Update user
    update_data = user_data.model_dump()
    if user_data.password:
        update_data['password_hash'] = hash_password(user_data.password)
    
    await db.users.update_one(
        {"id": user_id},
        {"$set": update_data}
    )
    
    updated_user = await db.users.find_one({"id": user_id}, {"_id": 0, "password_hash": 0})
    return updated_user

@api_router.delete("/users/{user_id}")
async def delete_user(user_id: str, current_user: dict = Depends(get_current_user)):
    # Check permissions
    if current_user['role'] not in ['SUPERADMIN', 'ADMIN']:
        raise HTTPException(status_code=403, detail="Insufficient permissions")
    
    # Check if user exists
    user = await db.users.find_one({"id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Admins can only delete users from their company
    if current_user['role'] == 'ADMIN' and user.get('company_id') != current_user['company_id']:
        raise HTTPException(status_code=403, detail="Can only delete users from your company")
    
    # Prevent users from deleting themselves
    if user_id == current_user['id']:
        raise HTTPException(status_code=400, detail="Cannot delete yourself")
    
    # Delete user
    await db.users.delete_one({"id": user_id})
    return {"message": "User deleted successfully"}

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
        # Use hint for better performance with SUPERADMIN users
        companies_cursor = db.companies.find({}, {"_id": 0})
        companies = await companies_cursor.to_list(100)
    else:
        # Use index for single company lookup
        companies_cursor = db.companies.find({"id": current_user['company_id']}, {"_id": 0})
        companies = await companies_cursor.to_list(1)
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

@api_router.get("/companies/{company_id}/clients/{client_id}")
async def get_client(company_id: str, client_id: str, current_user: dict = Depends(get_current_user)):
    if current_user['role'] != 'SUPERADMIN' and current_user['company_id'] != company_id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    client = await db.clients.find_one({"id": client_id, "company_id": company_id}, {"_id": 0})
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    
    return client

@api_router.delete("/companies/{company_id}/clients/{client_id}")
async def delete_client(company_id: str, client_id: str, current_user: dict = Depends(get_current_user)):
    if current_user['role'] not in ['SUPERADMIN', 'ADMIN']:
        raise HTTPException(status_code=403, detail="Insufficient permissions")
    
    if current_user['role'] == 'ADMIN' and current_user['company_id'] != company_id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Check if client exists
    client = await db.clients.find_one({"id": client_id, "company_id": company_id})
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    
    # Check if client has any work orders
    work_order_count = await db.work_orders.count_documents({"requested_by_client_id": client_id})
    if work_order_count > 0:
        raise HTTPException(status_code=400, detail="Cannot delete client with existing work orders")
    
    # Delete client
    await db.clients.delete_one({"id": client_id, "company_id": company_id})
    
    # Also delete any users associated with this client
    await db.users.delete_many({"client_id": client_id, "company_id": company_id})
    
    return {"message": "Client deleted successfully"}

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
    
    # Get employees
    employees = await db.employees.find({"company_id": company_id}, {"_id": 0}).to_list(1000)
    
    # Enrich employees with user details
    enriched_employees = []
    for employee in employees:
        # Get user details
        user = await db.users.find_one({"id": employee['user_id']}, {"_id": 0, "password_hash": 0})
        if user:
            # Merge user details into employee object
            enriched_employee = {**employee, "user": user}
            enriched_employees.append(enriched_employee)
        else:
            # If user not found, still include the employee
            enriched_employees.append(employee)
    
    return enriched_employees

# =======================
# Vehicle Management (Vigor)
# =======================

@api_router.post("/companies/{company_id}/vehicles")
async def create_vehicle(company_id: str, vehicle_data: VehicleCreate, current_user: dict = Depends(get_current_user)):
    if current_user['role'] not in ['SUPERADMIN', 'ADMIN', 'EMPLOYEE']:
        raise HTTPException(status_code=403, detail="Insufficient permissions")
    
    if current_user['role'] != 'SUPERADMIN' and current_user['company_id'] != company_id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    try:
        vehicle = Vehicle(company_id=company_id, **vehicle_data.model_dump())
        result = await db.vehicles.insert_one(vehicle.model_dump())
        if result.acknowledged:
            return vehicle
        else:
            raise HTTPException(status_code=500, detail="Failed to save vehicle to database")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error creating vehicle: {str(e)}")

@api_router.get("/companies/{company_id}/vehicles")
async def get_vehicles(company_id: str, current_user: dict = Depends(get_current_user)):
    if current_user['role'] != 'SUPERADMIN' and current_user['company_id'] != company_id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    vehicles = await db.vehicles.find({"company_id": company_id}, {"_id": 0}).to_list(1000)
    
    # Enrich vehicles with client details
    enriched_vehicles = []
    for vehicle in vehicles:
        enriched_vehicle = vehicle.copy()
        owner_client_id = vehicle.get('owner_client_id')
        if owner_client_id:
            client = await db.clients.find_one(
                {"id": owner_client_id, "company_id": company_id}, 
                {"_id": 0, "name": 1}
            )
            if client and 'name' in client:
                enriched_vehicle['owner_client_name'] = client['name']
        enriched_vehicles.append(enriched_vehicle)
    
    return enriched_vehicles

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
    
    # MSAM Technical Solutions: Require asset_code
    if company['industry'] == 'technical_solutions' and not wo_data.asset_code:
        raise HTTPException(status_code=400, detail="Asset code is required for MSAM Technical Solutions work orders")
    
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

# =======================
# File Upload
# =======================

@api_router.post("/upload")
async def upload_file(
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user)
):
    if current_user['role'] not in ['SUPERADMIN', 'ADMIN', 'EMPLOYEE']:
        raise HTTPException(status_code=403, detail="Insufficient permissions")
    
    try:
        # Generate unique filename
        file_extension = ""
        if file.filename:
            file_extension = file.filename.split('.')[-1] if '.' in file.filename else ''
        unique_filename = f"{uuid.uuid4()}.{file_extension}"
        file_path = UPLOADS_DIR / unique_filename
        
        # Save file
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        
        # Return file path
        return {"path": f"/uploads/{unique_filename}"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to upload file: {str(e)}")

# Serve uploaded files
from fastapi.staticfiles import StaticFiles
app.mount("/uploads", StaticFiles(directory=UPLOADS_DIR), name="uploads")

@api_router.get("/companies/{company_id}/workorders")
async def get_work_orders(
    company_id: str,
    status: Optional[str] = None,
    assigned_to: Optional[str] = None,
    client_id: Optional[str] = None,
    priority: Optional[str] = None,
    search: Optional[str] = None,
    page: int = 1,
    limit: int = 10,
    current_user: dict = Depends(get_current_user)
):
    if current_user['role'] != 'SUPERADMIN' and current_user['company_id'] != company_id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    query = {"company_id": company_id}
    
    if status:
        query['status'] = status
    
    if assigned_to:
        query['assigned_technicians'] = assigned_to
    
    if client_id:
        query['requested_by_client_id'] = client_id
        
    if priority:
        query['priority'] = priority
    
    # Role-based filtering
    if current_user['role'] == 'EMPLOYEE':
        # Employees see only work orders they're assigned to or approved orders
        # But we also need to respect the assigned_to filter if provided
        if 'assigned_technicians' in query:
            # A specific technician filter was provided
            # Check if it matches the current employee
            if query['assigned_technicians'] == current_user['id']:
                # Employee is requesting their own work orders, which is allowed
                # We still need to include approved orders
                query['$or'] = [  # pyright: ignore[reportArgumentType]
                    {'assigned_technicians': current_user['id']},
                    {'status': 'APPROVED'}
                ]
                # Remove the original assigned_technicians filter since we're replacing it
                del query['assigned_technicians']
            else:
                # Employee is trying to view another employee's work orders - not allowed
                # Return no results
                query['assigned_technicians'] = 'IMPOSSIBLE_VALUE_TO_RETURN_EMPTY_RESULTS'
        else:
            # No specific technician filter, apply standard role-based filtering
            query['$or'] = [  # pyright: ignore[reportArgumentType]
                {'assigned_technicians': current_user['id']},
                {'status': 'APPROVED'}
            ]
    elif current_user['role'] == 'CLIENT':
        # Clients see only their own work orders
        # But we also need to respect the client_id filter if provided
        if 'requested_by_client_id' in query:
            # A specific client filter was provided
            # Check if it matches the current client
            if query['requested_by_client_id'] == current_user.get('client_id'):
                # Client is requesting their own work orders, which is allowed
                # Keep the filter as is (no need to change it)
                pass
            else:
                # Client is trying to view another client's work orders - not allowed
                # Return no results
                query['requested_by_client_id'] = 'IMPOSSIBLE_VALUE_TO_RETURN_EMPTY_RESULTS'
        else:
            # No specific client filter, apply standard role-based filtering
            client_id = current_user.get('client_id')
            if client_id:
                query['requested_by_client_id'] = client_id
            else:
                # This shouldn't happen for CLIENT users, but just in case
                query['requested_by_client_id'] = 'IMPOSSIBLE_VALUE_TO_RETURN_EMPTY_RESULTS'
    
    # Text search in title or description
    if search:
        query['$or'] = [  # pyright: ignore[reportArgumentType]
            {'title': {'$regex': search, '$options': 'i'}},
            {'description': {'$regex': search, '$options': 'i'}},
            {'order_number': {'$regex': search, '$options': 'i'}}
        ]
    
    # Calculate skip value for pagination
    skip = (page - 1) * limit
    
    # Get total count for pagination info - remove hint that might be causing issues
    total_count = await db.work_orders.count_documents(query)
    
    # Get paginated work orders with sorting
    work_orders_cursor = db.work_orders.find(query, {"_id": 0}).sort("created_at", -1).skip(skip).limit(limit)
    work_orders = await work_orders_cursor.to_list(limit)
    
    # Return work orders with pagination info
    return {
        "work_orders": work_orders,
        "pagination": {
            "page": page,
            "limit": limit,
            "total": total_count,
            "pages": (total_count + limit - 1) // limit  # Ceiling division
        }
    }


@api_router.get("/companies/{company_id}/workorders/{work_order_id}")
async def get_work_order(company_id: str, work_order_id: str, current_user: dict = Depends(get_current_user)):
    if current_user['role'] != 'SUPERADMIN' and current_user['company_id'] != company_id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Remove hint that might be causing issues
    work_order = await db.work_orders.find_one(
        {"id": work_order_id, "company_id": company_id}, 
        {"_id": 0}
    )
    if not work_order:
        raise HTTPException(status_code=404, detail="Work order not found")
    
    # Check visibility
    if current_user['role'] == 'EMPLOYEE':
        if current_user['id'] not in work_order['assigned_technicians'] and work_order['status'] != 'APPROVED':
            raise HTTPException(status_code=403, detail="Access denied")
    elif current_user['role'] == 'CLIENT':
        client_id = current_user.get('client_id')
        if not client_id or work_order['requested_by_client_id'] != client_id:
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
    
    # Check company for MSAM Technical Solutions asset code requirement
    update_dict = update_data.model_dump(exclude_unset=True)
    if update_dict:
        # Check if we're trying to set asset_code to empty/None for MSAM Technical Solutions
        if 'asset_code' in update_dict and (update_dict['asset_code'] is None or update_dict['asset_code'] == ''):
            company = await db.companies.find_one({"id": company_id})
            if company and company['industry'] == 'technical_solutions':
                raise HTTPException(status_code=400, detail="Asset code is required for MSAM Technical Solutions work orders")
    
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
    for tech_id in work_order['assigned_technicians']:  # pyright: ignore[reportGeneralTypeIssues]
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
    
    # Use provided items or default to quoted price only (expenses are for personal tracking only)
    if invoice_data.items:
        items = invoice_data.items
        total = sum(item['amount'] for item in items)
    else:
        # Only include quoted price, not expenses
        items = [
            {"description": "Work Order Services", "amount": work_order.get('quoted_price', 0)}
        ]
    
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
        client_id = current_user.get('client_id')
        if not client_id:
            # This shouldn't happen for CLIENT users, return empty list
            client_wos = []
        else:
            client_wos = await db.work_orders.find({"requested_by_client_id": client_id}, {"_id": 0}).to_list(1000)
        wo_ids = [wo['id'] for wo in client_wos]
        query['work_order_id'] = {"$in": wo_ids}  # pyright: ignore[reportArgumentType]
    
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

@api_router.put("/companies/{company_id}/invoices/{invoice_id}")
async def update_invoice(
    company_id: str,
    invoice_id: str,
    update_data: InvoiceUpdate,
    current_user: dict = Depends(get_current_user)
):
    if current_user['role'] not in ['SUPERADMIN', 'ADMIN']:
        raise HTTPException(status_code=403, detail="Only Admins can update invoices")
    
    if current_user['role'] == 'ADMIN' and current_user['company_id'] != company_id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    invoice = await db.invoices.find_one({"id": invoice_id, "company_id": company_id})
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    
    # Prepare update
    update_dict = {k: v for k, v in update_data.model_dump().items() if v is not None}
    
    if update_dict:
        await db.invoices.update_one(
            {"id": invoice_id},
            {"$set": update_dict}
        )
    
    updated_invoice = await db.invoices.find_one({"id": invoice_id}, {"_id": 0})
    return updated_invoice

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
    c.drawString(1*inch, height - 1*inch, company['name'])  # pyright: ignore[reportOptionalSubscript]
    c.setFont("Helvetica", 10)
    c.drawString(1*inch, height - 1.3*inch, company.get('address', ''))  # pyright: ignore[reportOptionalMemberAccess, reportAttributeAccessIssue]
    
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
    for item in invoice['items']:  # pyright: ignore[reportGeneralTypeIssues]
        c.drawString(1*inch, y, item['description'])
        c.drawString(5*inch, y, f"AED {item['amount']:.2f}")
        y -= 0.25*inch
    
    # Total
    y -= 0.3*inch
    c.setFont("Helvetica-Bold", 12)
    c.drawString(4*inch, y, "Tax:")
    c.drawString(5*inch, y, f"AED {invoice['tax_amount']:.2f}")
    y -= 0.3*inch
    c.drawString(4*inch, y, "Total:")
    c.drawString(5*inch, y, f"AED {invoice['total_amount']:.2f}")

    c.save()
    buffer.seek(0)
    
    return StreamingResponse(buffer, media_type="application/pdf", headers={"Content-Disposition": f"attachment; filename=invoice_{invoice['invoice_number']}.pdf"})

# =======================
# Payment Management
# =======================

@api_router.post("/companies/{company_id}/payments")
async def process_payment(company_id: str, payment_data: PaymentCreate, current_user: dict = Depends(get_current_user)):
    if current_user['role'] not in ['SUPERADMIN', 'ADMIN']:
        raise HTTPException(status_code=403, detail="Only Admins can process payments")
    
    if current_user['role'] == 'ADMIN' and current_user['company_id'] != company_id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Verify work order exists and belongs to the company
    work_order = await db.work_orders.find_one({"id": payment_data.work_order_id, "company_id": company_id})
    if not work_order:
        raise HTTPException(status_code=404, detail="Work order not found")
    
    # Validate payment method
    if payment_data.payment_method not in ['cash', 'card']:
        raise HTTPException(status_code=400, detail="Invalid payment method")
    
    # Validate reference number for card payments
    if payment_data.payment_method == 'card' and not payment_data.reference_number:
        raise HTTPException(status_code=400, detail="Reference number is required for card payments")
    
    # Validate payment amount
    quoted_price = work_order.get('quoted_price', 0) or 0
    paid_amount = work_order.get('paid_amount', 0) or 0
    remaining_amount = quoted_price - paid_amount
    
    if payment_data.amount <= 0:
        raise HTTPException(status_code=400, detail="Payment amount must be greater than zero")
    
    if payment_data.amount > remaining_amount:
        raise HTTPException(status_code=400, detail="Payment amount exceeds remaining balance")
    
    # Create payment record
    payment = Payment(
        work_order_id=payment_data.work_order_id,
        company_id=company_id,
        amount=payment_data.amount,
        payment_method=payment_data.payment_method,
        reference_number=payment_data.reference_number,
        created_by=current_user['id']
    )
    
    # Insert payment record
    await db.payments.insert_one(payment.model_dump())
    
    # Update work order paid amount
    new_paid_amount = paid_amount + payment_data.amount
    await db.work_orders.update_one(
        {"id": payment_data.work_order_id},
        {"$set": {"paid_amount": new_paid_amount, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    return {"message": "Payment processed successfully", "payment": payment}

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
# Comments
# =======================

@api_router.post("/companies/{company_id}/workorders/{work_order_id}/comments")
async def create_comment(
    company_id: str,
    work_order_id: str,
    comment_data: CommentCreate,
    current_user: dict = Depends(get_current_user)
):
    if current_user['role'] != 'SUPERADMIN' and current_user['company_id'] != company_id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Verify work order exists
    work_order = await db.work_orders.find_one({"id": work_order_id, "company_id": company_id})
    if not work_order:
        raise HTTPException(status_code=404, detail="Work order not found")
    
    comment = Comment(
        work_order_id=work_order_id,
        company_id=company_id,
        user_id=current_user['id'],
        content=comment_data.content
    )
    
    await db.comments.insert_one(comment.model_dump())
    
    # Enrich comment with user details
    user = await db.users.find_one({"id": current_user['id']}, {"_id": 0, "password_hash": 0})
    comment_dict = comment.model_dump()
    comment_dict['user'] = user
    
    return comment_dict

@api_router.get("/companies/{company_id}/workorders/{work_order_id}/comments")
async def get_comments(
    company_id: str,
    work_order_id: str,
    current_user: dict = Depends(get_current_user)
):
    if current_user['role'] != 'SUPERADMIN' and current_user['company_id'] != company_id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Verify work order exists
    work_order = await db.work_orders.find_one({"id": work_order_id, "company_id": company_id})
    if not work_order:
        raise HTTPException(status_code=404, detail="Work order not found")
    
    # Check visibility - clients can only see their own work orders
    if current_user['role'] == 'CLIENT' and work_order['requested_by_client_id'] != current_user['id']:
        raise HTTPException(status_code=403, detail="Access denied")
    
    comments = await db.comments.find({"work_order_id": work_order_id, "company_id": company_id}, {"_id": 0}).sort("created_at", 1).to_list(1000)
    
    # Enrich comments with user details
    enriched_comments = []
    for comment in comments:
        user = await db.users.find_one({"id": comment['user_id']}, {"_id": 0, "password_hash": 0})
        enriched_comment = {**comment, "user": user}
        enriched_comments.append(enriched_comment)
    
    return enriched_comments

@api_router.put("/companies/{company_id}/comments/{comment_id}")
async def update_comment(
    company_id: str,
    comment_id: str,
    comment_data: CommentUpdate,
    current_user: dict = Depends(get_current_user)
):
    if current_user['role'] != 'SUPERADMIN' and current_user['company_id'] != company_id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    comment = await db.comments.find_one({"id": comment_id, "company_id": company_id})
    if not comment:
        raise HTTPException(status_code=404, detail="Comment not found")
    
    # Only the comment author or admins can edit
    if current_user['role'] not in ['SUPERADMIN', 'ADMIN'] and comment['user_id'] != current_user['id']:
        raise HTTPException(status_code=403, detail="Access denied")
    
    await db.comments.update_one(
        {"id": comment_id},
        {"$set": {"content": comment_data.content, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    updated_comment = await db.comments.find_one({"id": comment_id}, {"_id": 0})
    
    # Enrich comment with user details
    if updated_comment:
        user = await db.users.find_one({"id": current_user['id']}, {"_id": 0, "password_hash": 0})
        if user:
            updated_comment['user'] = user
    
    return updated_comment

@api_router.delete("/companies/{company_id}/comments/{comment_id}")
async def delete_comment(
    company_id: str,
    comment_id: str,
    current_user: dict = Depends(get_current_user)
):
    if current_user['role'] != 'SUPERADMIN' and current_user['company_id'] != company_id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    comment = await db.comments.find_one({"id": comment_id, "company_id": company_id})
    if not comment:
        raise HTTPException(status_code=404, detail="Comment not found")
    
    # Only the comment author or admins can delete
    if current_user['role'] not in ['SUPERADMIN', 'ADMIN'] and comment['user_id'] != current_user['id']:
        raise HTTPException(status_code=403, detail="Access denied")
    
    await db.comments.delete_one({"id": comment_id})
    
    return {"message": "Comment deleted successfully"}

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
    # Include both issued and paid invoices in revenue calculation
    total_revenue = sum(inv['total_amount'] for inv in invoices if inv['status'] in ['ISSUED', 'PAID'])
    pending_invoices = sum(1 for inv in invoices if inv['status'] == 'ISSUED')
    
    # Count expenses
    expenses = await db.expenses.find({"company_id": company_id}, {"_id": 0}).to_list(10000)
    total_expenses = sum(exp['amount'] for exp in expenses)
    
    # Count vehicles for automotive companies
    vehicle_count = await db.vehicles.count_documents({"company_id": company_id})
    
    # Count preventive tasks for technical solutions companies
    preventive_task_count = await db.preventive_tasks.count_documents({"company_id": company_id})
    
    return {
        "total_work_orders": len(work_orders),
        "status_breakdown": status_counts,
        "total_revenue": total_revenue,
        "total_expenses": total_expenses,
        "profit_margin": total_revenue - total_expenses,
        "pending_invoices": pending_invoices,
        "active_clients": len(await db.clients.find({"company_id": company_id}, {"_id": 0}).to_list(10000)),
        "active_employees": len(await db.employees.find({"company_id": company_id}, {"_id": 0}).to_list(10000)),
        "total_vehicles": vehicle_count,
        "preventive_tasks": {
            "total": preventive_task_count,
            "active": len([t for t in await db.preventive_tasks.find({"company_id": company_id}, {"_id": 0}).to_list(10000) if t.get('status') == 'ACTIVE'])
        }
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
        query['created_at'] = {"$gte": from_date}  # pyright: ignore[reportArgumentType]
    if to_date:
        query.setdefault('created_at', {})['$lte'] = to_date  # pyright: ignore[reportArgumentType, reportIndexIssue]
    
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

@api_router.get("/companies/{company_id}/reports/profit-loss-details")
async def get_profit_loss_details(company_id: str, current_user: dict = Depends(get_current_user)):
    if current_user['role'] != 'SUPERADMIN' and current_user['company_id'] != company_id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Get all work orders for the company
    work_orders = await db.work_orders.find({"company_id": company_id}, {"_id": 0}).to_list(10000)
    
    # Get all invoices for the company
    invoices = await db.invoices.find({"company_id": company_id}, {"_id": 0}).to_list(10000)
    
    # Get all expenses for the company
    expenses = await db.expenses.find({"company_id": company_id}, {"_id": 0}).to_list(10000)
    
    # Create a mapping of work order ID to expenses
    work_order_expenses = {}
    for expense in expenses:
        wo_id = expense['work_order_id']
        if wo_id not in work_order_expenses:
            work_order_expenses[wo_id] = []
        work_order_expenses[wo_id].append(expense)
    
    # Create a mapping of work order ID to invoices
    work_order_invoices = {}
    for invoice in invoices:
        wo_id = invoice['work_order_id']
        if wo_id not in work_order_invoices:
            work_order_invoices[wo_id] = []
        work_order_invoices[wo_id].append(invoice)
    
    # Prepare detailed report data
    details = []
    for wo in work_orders:
        wo_id = wo['id']
        wo_expenses = work_order_expenses.get(wo_id, [])
        wo_invoices = work_order_invoices.get(wo_id, [])
        
        # Calculate totals
        total_expenses = sum(exp['amount'] for exp in wo_expenses)
        # Include both issued and paid invoices in revenue calculation
        total_revenue = sum(inv['total_amount'] for inv in wo_invoices if inv['status'] in ['ISSUED', 'PAID'])
        profit_loss = total_revenue - total_expenses
        
        # Get client information
        client_name = "Unknown"
        if wo.get('requested_by_client_id'):
            client = await db.clients.find_one({
                "id": wo['requested_by_client_id'], 
                "company_id": company_id
            }, {"_id": 0, "name": 1})
            if client:
                client_name = client['name']
        
        details.append({
            "work_order_id": wo_id,
            "order_number": wo.get('order_number', ''),
            "title": wo.get('title', ''),
            "client_name": client_name,
            "status": wo.get('status', ''),
            "quoted_price": wo.get('quoted_price', 0),
            "total_expenses": total_expenses,
            "total_revenue": total_revenue,
            "profit_loss": profit_loss
        })
    
    return {"details": details}

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
        # Include both issued and paid invoices in revenue calculation
        revenue = sum(inv['total_amount'] for inv in invoices if inv['status'] in ['ISSUED', 'PAID'])
        
        summary.append({
            "company_id": company_id,
            "company_name": company['name'],
            "industry": company['industry'],
            "total_work_orders": work_orders,
            "total_revenue": revenue
        })
    
    return {"companies": summary}


@api_router.get("/superadmin/reports/all-workorders-profit")
async def get_all_workorders_profit(current_user: dict = Depends(get_current_user)):
    if current_user['role'] != 'SUPERADMIN':
        raise HTTPException(status_code=403, detail="Only SuperAdmin can access this report")
    
    # Get all companies
    companies = await db.companies.find({}, {"_id": 0}).to_list(100)
    
    # Get all work orders across all companies
    work_orders = await db.work_orders.find({}, {"_id": 0}).to_list(10000)
    
    # Get all invoices across all companies
    invoices = await db.invoices.find({}, {"_id": 0}).to_list(10000)
    
    # Get all expenses across all companies
    expenses = await db.expenses.find({}, {"_id": 0}).to_list(10000)
    
    # Create mappings
    work_order_expenses = {}
    for expense in expenses:
        wo_id = expense['work_order_id']
        if wo_id not in work_order_expenses:
            work_order_expenses[wo_id] = []
        work_order_expenses[wo_id].append(expense)
    
    work_order_invoices = {}
    for invoice in invoices:
        wo_id = invoice['work_order_id']
        if wo_id not in work_order_invoices:
            work_order_invoices[wo_id] = []
        work_order_invoices[wo_id].append(invoice)
    
    # Create company mapping for quick lookup
    company_map = {company['id']: company for company in companies}
    
    # Prepare detailed report data
    details = []
    for wo in work_orders:
        wo_id = wo['id']
        company_id = wo['company_id']
        wo_expenses = work_order_expenses.get(wo_id, [])
        wo_invoices = work_order_invoices.get(wo_id, [])
        
        # Calculate totals
        total_expenses = sum(exp['amount'] for exp in wo_expenses)
        # Include both issued and paid invoices in revenue calculation
        total_revenue = sum(inv['total_amount'] for inv in wo_invoices if inv['status'] in ['ISSUED', 'PAID'])
        profit_loss = total_revenue - total_expenses
        
        # Get client information
        client_name = "Unknown"
        if wo.get('requested_by_client_id'):
            client = await db.clients.find_one({
                "id": wo['requested_by_client_id'], 
                "company_id": company_id
            }, {"_id": 0, "name": 1})
            if client:
                client_name = client['name']
        
        # Get technician information
        assigned_technicians = wo.get('assigned_technicians', [])
        technician_names = []
        for tech_id in assigned_technicians:
            tech_user = await db.users.find_one({"id": tech_id}, {"_id": 0, "display_name": 1})
            if tech_user:
                technician_names.append(tech_user.get('display_name', 'Unknown Technician'))
            else:
                technician_names.append('Unknown Technician')
        
        # Get company name
        company_name = company_map.get(company_id, {}).get('name', 'Unknown Company')
        
        details.append({
            "work_order_id": wo_id,
            "order_number": wo.get('order_number', ''),
            "title": wo.get('title', ''),
            "company_name": company_name,
            "client_name": client_name,
            "status": wo.get('status', ''),
            "quoted_price": wo.get('quoted_price', 0),
            "total_expenses": total_expenses,
            "total_revenue": total_revenue,
            "profit_loss": profit_loss,
            "assigned_technicians": assigned_technicians,
            "technician_names": technician_names
        })
    
    return {"details": details}

# =======================
# Activity Logs Endpoint
# =======================

@api_router.get("/superadmin/logs")
async def get_activity_logs(
    current_user: dict = Depends(get_current_user),
    skip: int = 0,
    limit: int = 100,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    user_id: Optional[str] = None,
    action: Optional[str] = None,
    resource_type: Optional[str] = None
):
    """Get activity logs for all admin actions"""
    if current_user['role'] != 'SUPERADMIN':
        raise HTTPException(status_code=403, detail="Only SuperAdmin can access logs")
    
    # Build query filters
    query = {}
    
    # Date range filter
    if start_date or end_date:
        date_query = {}
        if start_date:
            # Parse the date string properly
            try:
                parsed_start = datetime.fromisoformat(start_date.replace('Z', '+00:00'))
                date_query["$gte"] = parsed_start.isoformat()
            except ValueError:
                # If parsing fails, use the original string
                date_query["$gte"] = start_date
        if end_date:
            # Parse the date string properly
            try:
                parsed_end = datetime.fromisoformat(end_date.replace('Z', '+00:00'))
                date_query["$lte"] = parsed_end.isoformat()
            except ValueError:
                # If parsing fails, use the original string
                date_query["$lte"] = end_date
        if date_query:
            query["created_at"] = date_query
    
    # User filter
    if user_id:
        query["created_by"] = user_id
    
    # Action filter
    if action:
        query["action"] = action
    
    # Resource type filter
    if resource_type:
        query["resource_type"] = resource_type
    
    # For now, we'll create a simple log system by querying the database for recent activities
    # In a production system, you would want to implement a proper logging system
    
    logs = []
    
    # Get recent work orders with user details
    wo_query = {}
    if start_date or end_date:
        date_query = {}
        if start_date:
            # Parse the date string properly
            try:
                parsed_start = datetime.fromisoformat(start_date.replace('Z', '+00:00'))
                date_query["$gte"] = parsed_start.isoformat()
            except ValueError:
                # If parsing fails, use the original string
                date_query["$gte"] = start_date
        if end_date:
            # Parse the date string properly
            try:
                parsed_end = datetime.fromisoformat(end_date.replace('Z', '+00:00'))
                date_query["$lte"] = parsed_end.isoformat()
            except ValueError:
                # If parsing fails, use the original string
                date_query["$lte"] = end_date
        if date_query:
            wo_query["created_at"] = date_query
    if user_id:
        wo_query["created_by"] = user_id
    
    work_orders = await db.work_orders.find(wo_query, {"_id": 0}).sort("created_at", -1).skip(skip).limit(limit//4).to_list(limit//4)
    for wo in work_orders:
        # Get user details
        user = await db.users.find_one({"id": wo.get("created_by", "")}, {"_id": 0, "display_name": 1, "email": 1})
        user_name = user.get("display_name", user.get("email", "Unknown User")) if user else "Unknown User"
        
        # Apply action filter
        if action and action != "CREATE_WORK_ORDER":
            continue
            
        # Apply resource type filter
        if resource_type and resource_type != "WorkOrder":
            continue
        
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
    
    # Get recent clients with user details
    client_query = {}
    if start_date or end_date:
        date_query = {}
        if start_date:
            # Parse the date string properly
            try:
                parsed_start = datetime.fromisoformat(start_date.replace('Z', '+00:00'))
                date_query["$gte"] = parsed_start.isoformat()
            except ValueError:
                # If parsing fails, use the original string
                date_query["$gte"] = start_date
        if end_date:
            # Parse the date string properly
            try:
                parsed_end = datetime.fromisoformat(end_date.replace('Z', '+00:00'))
                date_query["$lte"] = parsed_end.isoformat()
            except ValueError:
                # If parsing fails, use the original string
                date_query["$lte"] = end_date
        if date_query:
            client_query["created_at"] = date_query
    if user_id:
        client_query["created_by"] = user_id
    
    clients = await db.clients.find(client_query, {"_id": 0}).sort("created_at", -1).skip(skip).limit(limit//4).to_list(limit//4)
    for client in clients:
        # Get user details
        user = await db.users.find_one({"id": client.get("created_by", "")}, {"_id": 0, "display_name": 1, "email": 1}) if "created_by" in client else None
        user_name = user.get("display_name", user.get("email", "System")) if user else "System"
        
        # Apply action filter
        if action and action != "CREATE_CLIENT":
            continue
            
        # Apply resource type filter
        if resource_type and resource_type != "Client":
            continue
        
        logs.append({
            "id": str(uuid.uuid4()),
            "timestamp": client.get("created_at", ""),
            "user_id": client.get("created_by", "") if "created_by" in client else "system",
            "user_name": user_name,
            "action": "CREATE_CLIENT",
            "resource_type": "Client",
            "resource_id": client.get("id", ""),
            "details": {
                "name": client.get("name", ""),
                "company_id": client.get("company_id", "")
            }
        })
    
    # Get recent employees with user details
    emp_query = {}
    if start_date or end_date:
        date_query = {}
        if start_date:
            # Parse the date string properly
            try:
                parsed_start = datetime.fromisoformat(start_date.replace('Z', '+00:00'))
                date_query["$gte"] = parsed_start.isoformat()
            except ValueError:
                # If parsing fails, use the original string
                date_query["$gte"] = start_date
        if end_date:
            # Parse the date string properly
            try:
                parsed_end = datetime.fromisoformat(end_date.replace('Z', '+00:00'))
                date_query["$lte"] = parsed_end.isoformat()
            except ValueError:
                # If parsing fails, use the original string
                date_query["$lte"] = end_date
        if date_query:
            emp_query["created_at"] = date_query
    if user_id:
        emp_query["created_by"] = user_id
    
    employees = await db.employees.find(emp_query, {"_id": 0}).sort("created_at", -1).skip(skip).limit(limit//4).to_list(limit//4)
    for emp in employees:
        # Get user details for employee creator
        creator_user = await db.users.find_one({"id": emp.get("created_by", "")}, {"_id": 0, "display_name": 1, "email": 1}) if "created_by" in emp else None
        creator_name = creator_user.get("display_name", creator_user.get("email", "System")) if creator_user else "System"
        
        # Get user details for the employee themselves
        employee_user = await db.users.find_one({"id": emp.get("user_id", "")}, {"_id": 0, "display_name": 1, "email": 1})
        employee_name = employee_user.get("display_name", employee_user.get("email", "Unknown User")) if employee_user else "Unknown User"
        
        # Apply action filter
        if action and action != "CREATE_EMPLOYEE":
            continue
            
        # Apply resource type filter
        if resource_type and resource_type != "Employee":
            continue
        
        logs.append({
            "id": str(uuid.uuid4()),
            "timestamp": emp.get("created_at", ""),
            "user_id": emp.get("created_by", "") if "created_by" in emp else "system",
            "user_name": creator_name,
            "action": "CREATE_EMPLOYEE",
            "resource_type": "Employee",
            "resource_id": emp.get("id", ""),
            "details": {
                "employee_name": employee_name,
                "employee_user_id": emp.get("user_id", ""),
                "company_id": emp.get("company_id", "")
            }
        })
    
    # Get recent comments with user details
    comment_query = {}
    if start_date or end_date:
        date_query = {}
        if start_date:
            # Parse the date string properly
            try:
                parsed_start = datetime.fromisoformat(start_date.replace('Z', '+00:00'))
                date_query["$gte"] = parsed_start.isoformat()
            except ValueError:
                # If parsing fails, use the original string
                date_query["$gte"] = start_date
        if end_date:
            # Parse the date string properly
            try:
                parsed_end = datetime.fromisoformat(end_date.replace('Z', '+00:00'))
                date_query["$lte"] = parsed_end.isoformat()
            except ValueError:
                # If parsing fails, use the original string
                date_query["$lte"] = end_date
        if date_query:
            comment_query["created_at"] = date_query
    if user_id:
        comment_query["user_id"] = user_id
    
    comments = await db.comments.find(comment_query, {"_id": 0}).sort("created_at", -1).skip(skip).limit(limit//4).to_list(limit//4)
    for comment in comments:
        # Get user details
        user = await db.users.find_one({"id": comment.get("user_id", "")}, {"_id": 0, "display_name": 1, "email": 1})
        user_name = user.get("display_name", user.get("email", "Unknown User")) if user else "Unknown User"
        
        # Get work order title for context
        work_order = await db.work_orders.find_one({"id": comment.get("work_order_id", "")}, {"_id": 0, "title": 1})
        work_order_title = work_order.get("title", "Unknown Work Order") if work_order else "Unknown Work Order"
        
        # Apply action filter
        if action and action != "ADD_COMMENT":
            continue
            
        # Apply resource type filter
        if resource_type and resource_type != "Comment":
            continue
        
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
    
    return {"logs": logs[:limit]}

# Include router

# Include router
app.include_router(api_router)

# Add GZip compression middleware
app.add_middleware(GZipMiddleware, minimum_size=500)  # Reduced minimum size for more aggressive compression

# CORS configuration
# Get CORS origins from environment variable, defaulting to '*' if not set
raw_cors_origins = os.environ.get('CORS_ORIGINS', '*')
if raw_cors_origins == '*':
    cors_origins = ["*"]
else:
    # Split by comma and strip whitespace from each origin
    cors_origins = [origin.strip() for origin in raw_cors_origins.split(',')]

# Add custom CORS middleware to ensure proper headers
@app.middleware("http")
async def add_cors_headers(request, call_next):
    origin = request.headers.get('origin')
    
    # Handle preflight OPTIONS requests
    if request.method == "OPTIONS":
        response = Response(status_code=200)
        response.headers['Access-Control-Allow-Credentials'] = 'true'
        response.headers['Access-Control-Allow-Methods'] = 'GET, POST, PUT, DELETE, OPTIONS'
        response.headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization'
        
        # Always allow common localhost origins
        if origin and ('localhost' in origin or '127.0.0.1' in origin):
            response.headers['Access-Control-Allow-Origin'] = origin
        # Also allow production origins
        elif origin and any(allowed_origin in origin for allowed_origin in cors_origins if allowed_origin != "*"):
            response.headers['Access-Control-Allow-Origin'] = origin
        # Allow all origins if configured
        elif "*" in cors_origins:
            response.headers['Access-Control-Allow-Origin'] = '*'
        
        return response
    
    # For non-OPTIONS requests, proceed normally
    response = await call_next(request)
    
    # Set CORS headers for actual requests
    # Always allow common localhost origins
    if origin and ('localhost' in origin or '127.0.0.1' in origin):
        response.headers['Access-Control-Allow-Origin'] = origin
        response.headers['Access-Control-Allow-Credentials'] = 'true'
    # Also allow production origins
    elif origin and any(allowed_origin in origin for allowed_origin in cors_origins if allowed_origin != "*"):
        response.headers['Access-Control-Allow-Origin'] = origin
        response.headers['Access-Control-Allow-Credentials'] = 'true'
    # Allow all origins if configured
    elif "*" in cors_origins:
        response.headers['Access-Control-Allow-Origin'] = '*'
    
    return response

# Add GZip compression middleware
app.add_middleware(GZipMiddleware, minimum_size=500)  # Reduced minimum size for more aggressive compression

# CORS configuration
# Get CORS origins from environment variable
raw_cors_origins = os.environ.get('CORS_ORIGINS', 'https://multitenantcrm.vercel.app,http://localhost:3000,http://localhost:5173')
cors_origins = [origin.strip() for origin in raw_cors_origins.split(',')]

# Add CORSMiddleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

if __name__ == "__main__":
    import uvicorn
    import os
    port = int(os.environ.get("PORT", 8000))
    # Production optimizations for local development
    workers = int(os.environ.get("WEB_CONCURRENCY", 8))  # Increased workers for better performance
    uvicorn.run(
        "server:app",
        host="0.0.0.0",
        port=port,
        workers=workers,
        reload=False,
        timeout_keep_alive=5,
        # Limit memory usage
        limit_concurrency=100,
        limit_max_requests=1000,
        # Enable HTTP/2 if available
        # http='h2',
        # Enable lifespan events
        lifespan="on"
    )
