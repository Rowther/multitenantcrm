# Multi-Tenant ERP/CRM System

A comprehensive multi-tenant ERP/CRM solution designed for three distinct business models:
- Sama Al Jazeera (Interior Design)
- MSAM Technical Solutions (Technical Services)
- Vigor Automotive (Automotive Services)

## 🚀 Key Features

- **Multi-Tenant Architecture**: Single codebase serving multiple companies with distinct business models
- **Role-Based Access Control**: SuperAdmin, Admin, Employee, and Client roles with appropriate permissions
- **Work Orders Management**: Create, track, and manage work orders with status workflows
- **Expenses & Invoices**: Track expenses and generate PDF invoices
- **Client Management**: Comprehensive client database
- **Employee Management**: Employee records with skills and rates
- **Vehicle Registry**: Vehicle management for Vigor Automotive
- **Preventive Maintenance**: Scheduled maintenance tasks for MSAM
- **Notifications**: In-app notifications (email/SMS mocked)
- **Reports**: Rich dashboards and analytics

## 🛠️ Tech Stack

- **Backend**: Python/FastAPI with MongoDB (Motor/Pymongo drivers)
- **Frontend**: React with Tailwind CSS
- **Deployment**: Render (Backend), Vercel (Frontend)
- **Authentication**: JWT-based authentication

## 📁 File Storage

The application now uses Render's persistent disk storage for uploaded files to prevent them from disappearing after deployments or periods of inactivity. Files are stored in `/opt/render/project/uploads` when deployed on Render, or in the local `uploads` directory during development.

## 🔧 Environment Variables

### Backend (.env)
```
MONGO_URL=your_mongodb_connection_string
DB_NAME=your_database_name
CORS_ORIGINS=comma_separated_list_of_allowed_origins
JWT_SECRET=your_jwt_secret_key
```

### Frontend (.env)
```
REACT_APP_API_URL=your_backend_api_url
```

## 🚀 Quick Start

1. Clone the repository
2. Install backend dependencies: `pip install -r backend/requirements.txt`
3. Install frontend dependencies: `cd frontend && npm install`
4. Set up environment variables in both backend and frontend
5. Start MongoDB locally or use MongoDB Atlas
6. Run backend: `cd backend && python server.py`
7. Run frontend: `cd frontend && npm start`

## 📱 Access Levels

- **SuperAdmin**: Full system access across all companies
- **Admin**: Full access within their company
- **Employee**: Work order management and status updates
- **Client**: View and comment on their work orders

## 🔄 Work Order Status Flow

```
APPROVED → IN_PROGRESS → COMPLETED
```

## 📊 Reporting

Real-time dashboards with financial metrics, work order tracking, and performance analytics tailored to each business model.

## 🛡️ Security

- JWT-based authentication
- Role-based access control
- Input validation and sanitization
- Secure password hashing with bcrypt
