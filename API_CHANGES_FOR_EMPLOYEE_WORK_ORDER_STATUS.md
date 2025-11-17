# API Changes for Employee Work Order Status Updates

## Overview

This document describes the changes made to the backend API to allow employees to update work order status.

## Modified Endpoints

### PUT /companies/{company_id}/workorders/{work_order_id}

#### Previous Behavior
- Only SUPERADMIN and ADMIN roles could access this endpoint
- No restrictions on which work orders could be updated

#### New Behavior
- SUPERADMIN, ADMIN, and EMPLOYEE roles can access this endpoint
- Additional validation for EMPLOYEE role:
  - EMPLOYEES can only access their own company's work orders
  - EMPLOYEES can only update the status field
  - EMPLOYEES can only update status on work orders assigned to them

#### Request Validation
- For EMPLOYEE role:
  - If updating status: Check if employee is assigned to the work order
  - If updating other fields: Return 403 Forbidden error

#### Response Codes
- 200 OK: Status updated successfully
- 403 Forbidden: Access denied (employee not assigned to work order or trying to update non-status fields)
- 404 Not Found: Work order not found

## Security Considerations

1. Role-based access control is maintained
2. Employees cannot bypass the assigned work order restriction
3. Employees cannot update fields other than status
4. All existing permissions for SUPERADMIN and ADMIN roles remain unchanged

## Implementation Details

### server.py Changes

```python
# Allow SUPERADMIN, ADMIN, and EMPLOYEE roles
# SUPERADMIN can access any company
# ADMIN and EMPLOYEE can only access their own company
if current_user['role'] == 'SUPERADMIN':
    # SUPERADMIN can access any company
    pass
elif current_user['role'] in ['ADMIN', 'EMPLOYEE'] and current_user['company_id'] == company_id:
    # ADMIN and EMPLOYEE can access their own company
    pass
else:
    raise HTTPException(status_code=403, detail="Access denied")

# Additional check for EMPLOYEE role - they can only update work orders assigned to them
if current_user['role'] == 'EMPLOYEE':
    # If updating status, check if employee is assigned to this work order
    update_dict = update_data.model_dump(exclude_unset=True)
    if 'status' in update_dict and update_dict['status'] is not None:
        # Allow employees to update status on work orders assigned to them
        if current_user['id'] not in work_order.get('assigned_technicians', []):
            raise HTTPException(status_code=403, detail="Employees can only update status on work orders assigned to them")
    else:
        # For other updates, employees should not be allowed
        raise HTTPException(status_code=403, detail="Employees can only update status on work orders assigned to them")
```

## Testing

To test these changes:

1. Create an employee user
2. Assign the employee to a work order
3. Log in as the employee
4. Try to update the status of the assigned work order (should succeed)
5. Try to update the status of a work order not assigned to the employee (should fail with 403)
6. Try to update other fields of an assigned work order (should fail with 403)
7. Verify that SUPERADMIN and ADMIN roles still work as before