# Performance Optimization Guide

This guide explains how to optimize the Multi-Tenant ERP/CRM application for lightning-fast performance on localhost.

## Backend Optimizations

### 1. Server Configuration
The backend is configured with the following performance optimizations:

- **Increased Workers**: 8 workers instead of 4 for better concurrent request handling
- **Enhanced MongoDB Connection Pooling**: 
  - Max pool size increased to 100 connections
  - Min pool size increased to 20 connections
  - Extended idle timeout to 60 seconds
  - Reduced timeouts for server selection and connections

### 2. Caching
- **User Cache TTL**: Extended from 5 minutes to 10 minutes to reduce database queries
- **GZip Compression**: Reduced minimum size threshold to 500 bytes for more aggressive response compression

## Frontend Optimizations

### 1. Build Configuration
- **Hot Reload Disabled**: By default for better performance (can be re-enabled with `DISABLE_HOT_RELOAD=false`)
- **Production Optimizations**: Enabled automatically in production builds

## Database Optimizations

### 1. Indexing Strategy
The application now automatically creates database indexes on startup for optimal performance:

- **Users collection**: email (unique), company_id, role
- **Companies collection**: id (unique)
- **Clients collection**: company_id
- **Employees collection**: company_id, user_id (unique)
- **Work Orders collection**: company_id+status, company_id+assigned_technicians, company_id+requested_by_client_id, created_at, order_number (unique)
- **Invoices collection**: company_id+status, work_order_id, invoice_number (unique)
- **Vehicles collection**: company_id, plate_number
- **Comments collection**: work_order_id, company_id
- **Preventive Tasks collection**: company_id, vehicle_id
- **Notifications collection**: user_id, sent_at

These indexes are created automatically when the application starts, ensuring optimal query performance.

## Running the Application for Maximum Performance

### 1. Start Servers
Use the optimized `start-servers.bat` script which:
- Starts the backend with 8 workers
- Disables hot reload for the frontend
- Uses production-ready configurations

### 2. Environment Variables
Set these environment variables for optimal performance:

```bash
# Backend .env
WEB_CONCURRENCY=8
DISABLE_HOT_RELOAD=true
```

## Monitoring Performance

### 1. Built-in Health Checks
The application includes health check endpoints:
- `/health` - Detailed status
- `/health/simple` - Simple OK/ERROR response
- `/health/ready` - Readiness check for load balancers
- `/health/live` - Liveness check
- `/health/stats` - Performance statistics

### 2. Response Times
With these optimizations, you should see:
- API response times under 100ms for most endpoints
- Page load times under 2 seconds
- Concurrent user handling for 100+ simultaneous requests

## Additional Tips

### 1. Hardware Considerations
- Use SSD storage for MongoDB data files
- Allocate at least 4GB RAM to the application
- Use a multi-core CPU for better worker utilization

### 2. Network Optimization
- Keep MongoDB on the same machine as the application for localhost development
- Use wired connections instead of WiFi when possible

### 3. Browser Optimization
- Use modern browsers (Chrome, Firefox, Edge)
- Clear browser cache regularly
- Disable browser extensions during performance testing

## Troubleshooting Performance Issues

### 1. Slow API Responses
- Check MongoDB indexes
- Monitor connection pool usage
- Review query complexity

### 2. Slow Frontend Loading
- Check network tab for large asset files
- Enable React DevTools Profiler
- Review component re-rendering

### 3. High Memory Usage
- Monitor worker memory consumption
- Check for memory leaks in custom code
- Adjust WEB_CONCURRENCY based on available RAM

By following these optimizations, the application should run significantly faster and handle more concurrent users efficiently.