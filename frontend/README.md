# Frontend Documentation

## New Components Added

### 1. PreventiveTaskModal.jsx
A modal component for creating and editing preventive maintenance tasks.

**Props:**
- `companyId`: The ID of the company
- `onClose`: Function to close the modal
- `onSuccess`: Function to call after successful creation
- `taskId`: (Optional) ID of task to edit

### 2. PreventiveTasksList.jsx
A component to display a list of preventive maintenance tasks with completion functionality.

### 3. VehicleModal.jsx
A modal component for adding and editing vehicles in the registry.

**Props:**
- `companyId`: The ID of the company
- `onClose`: Function to close the modal
- `onSuccess`: Function to call after successful creation
- `vehicleId`: (Optional) ID of vehicle to edit

### 4. VehiclesList.jsx
A component to display a list of vehicles in the registry.

### 5. PreventiveMaintenancePage.jsx
A full page for managing preventive maintenance tasks (accessible only to Admins).

### 6. VehiclesPage.jsx
A full page for managing vehicle registry (accessible only to Admins).

### 7. ReportsPage.jsx
A comprehensive reporting page with charts and metrics.

## Routing

New routes have been added to App.js:
- `/preventive-maintenance`: Preventive maintenance management
- `/vehicles`: Vehicle registry management
- `/reports`: Reporting and analytics

## Navigation

The DashboardLayout has been updated to show company-specific navigation items:
- Vehicle Registry link for automotive companies (Vigor)
- Preventive Maintenance link for technical solutions companies (MSAM)

## Authentication

All new pages are protected with role-based access control:
- Preventive Maintenance and Vehicles: Admins only
- Reports: Admins and SuperAdmins