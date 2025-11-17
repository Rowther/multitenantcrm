# Work Order Details Visibility

## Overview

This document outlines what work order details are visible to different user roles in the system.

## Employee Role Visibility

Employees can view the following work order details:

### Basic Information
- Order Number
- Title
- Description
- Status
- Priority
- Created Date

### Client Information
- Client Name
- Client Contact Person

### Technician Information
- Assigned Technicians

### Vehicle Information
- Vehicle Plate Number
- Vehicle Make/Model/Year

### Financial Information
- Quoted Price

### SLA Information
- SLA Hours
- Promise Completion Date

### Attachments
- View attachments
- View attachment images

### Status Updates
- Update work order status (only for assigned work orders)

## Restrictions for Employees

Employees cannot access the following features:

### Financial Management
- Expense Tracker
- Invoice Generator

### Work Order Management
- Edit work order details
- Delete work order
- Approve work order
- Cancel work order
- Reassign work order
- Change priority
- Change quoted price
- Change SLA
- Change promise date
- Change client
- Change vehicle
- Change assigned technicians
- Change title
- Change description

### Comment Management
- Add comments (this may vary based on implementation)
- Edit comments
- Delete comments

### Attachment Management
- Upload attachments
- Delete attachments

## Admin Role Visibility

Admins have full access to all work order details and features, including:

- All employee features
- Expense Tracker
- Invoice Generator
- Full work order editing
- Work order approval
- All comment management features
- All attachment management features

## Super Admin Role Visibility

Super Admins have the same access as Admins plus additional system-wide features.

## Client Role Visibility

Clients have limited access to work order details:

- View their own work orders only
- View basic work order information
- View status updates
- View comments
- Add comments
- Cannot update work order status
- Cannot access financial information
- Cannot access technician information