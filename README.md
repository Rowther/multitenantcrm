# Multi-Tenant ERP + CRM Web Platform

A comprehensive cloud-based multi-tenant ERP & CRM web application for managing three companies from a single platform.

## 🚀 Getting Started

### Performance Optimizations
This application includes several performance optimizations for lightning-fast operation:
- Backend configured with 8 workers for better concurrent request handling
- Enhanced MongoDB connection pooling (100 max connections)
- Extended user cache TTL to 10 minutes
- More aggressive GZip compression
- Hot reload disabled by default for frontend
- Automatic database indexing for all collections
- Background cache cleanup for optimal memory usage

For detailed optimization information, see [PERFORMANCE_OPTIMIZATION.md](PERFORMANCE_OPTIMIZATION.md).

### Prerequisites
- MongoDB database
- Python 3.8+
- Node.js 14+
- Yarn package manager

### Installation

1. **Start MongoDB** (make sure MongoDB is running on your system)

2. **Backend Setup**:
   ```bash
   cd backend
   pip install -r requirements.txt
   python seed.py  # Seed the database with sample data
   ```

3. **Frontend Setup**:
   ```bash
   cd frontend
   yarn install
   ```

4. **Start Servers**:
   ```bash
   # Run the bat file to start both servers
   start-servers.bat
   ```
   
   Or start manually:
   ```bash
   # Backend (from backend directory)
   python server.py
   
   # Frontend (from frontend directory)
   yarn start
   ```

## 🏢 Companies

### 1. Sama Al Jazeera (Furniture & Interior Design)
- **Special Rule**: Only Admins can create work orders
- **Login**: admin@samaaljazeera.com / password123

### 2. Vigor Automotive (Automotive Workshop)
- **Special Feature**: Vehicle registry
- **Login**: admin@vigorautomotive.com / password123

### 3. MSAM Technical Solutions (Technical Solutions & Maintenance)
- **Special Feature**: Preventive maintenance scheduling
- **Login**: admin@msamtechnicalsolutions.com / password123

## 🔐 Demo Accounts

### SuperAdmin
- **Email**: superadmin@erp.com
- **Password**: password123

### Company Admins
- Sama: admin@samaaljazeera.com / password123
- Vigor: admin@vigorautomotive.com / password123
- MSAM: admin@msamtechnicalsolutions.com / password123

### Employees
- Email: employee1@{company}.com / password123

### Clients
- Email: client1@example.com / password123

## 🌟 Features

### Multi-Tenancy
- Single login & central user database
- Strict tenant data separation
- Role-based access control (RBAC)

### Core Modules
- **Work Orders Management**: Create, track, and manage work orders with status workflows
- **Expenses & Invoices**: Track expenses and generate PDF invoices
- **Client Management**: Comprehensive client database
- **Employee Management**: Employee records with skills and rates
- **Vehicle Registry**: Vehicle management for Vigor Automotive
- **Preventive Maintenance**: Scheduled maintenance tasks for MSAM
- **Notifications**: In-app notifications (email/SMS mocked)
- **Reports**: Rich dashboards and analytics

## 🛠️ Tech Stack

**Backend**: FastAPI + MongoDB + JWT + ReportLab (PDF)
**Frontend**: React 19 + Shadcn/UI + Tailwind CSS + Recharts

## 📁 Project Structure

```
project/
├── backend/
│   ├── server.py          # FastAPI server
│   ├── seed.py            # Database seeding
│   └── requirements.txt   # Python dependencies
├── frontend/
│   ├── src/
│   │   ├── components/    # Reusable UI components
│   │   ├── pages/         # Page components
│   │   └── App.js         # Main application
│   └── package.json       # Frontend dependencies
└── start-servers.bat      # Script to start both servers
```

## 🎨 UI Features

- Glassmorphism login page
- Clean modern dashboard with dark/light mode
- Sidebar navigation
- Data tables with search and export capabilities
- Responsive design for all devices

## 📞 Support

For support, please contact the development team.