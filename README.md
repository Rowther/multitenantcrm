# Enterprise Hub - Multi-Tenant ERP+CRM Platform

A comprehensive cloud-based multi-tenant ERP & CRM web application for managing three companies (Sama Al Jazeera, Vigor Automotive, and MSAM Technical Solutions) from a single platform.

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

## 🛠️ Tech Stack

**Backend**: FastAPI + MongoDB + JWT + ReportLab (PDF)
**Frontend**: React 19 + Shadcn/UI + Tailwind CSS + Recharts

## 🚀 Quick Start

```bash
# Seed database
cd /app/backend && python seed.py

# Restart services
sudo supervisorctl restart backend frontend
```

## 📞 Support

Check logs: `tail -f /var/log/supervisor/backend.err.log`
