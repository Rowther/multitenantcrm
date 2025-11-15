import React, { useState } from 'react';
import { Button } from './ui/button';
import { Eye, Edit, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import WorkOrderModal from './WorkOrderModal';

const WorkOrdersList = ({ 
  workOrders, 
  companyId, 
  onRefresh, 
  isEmployee = false, 
  onEditWorkOrder, 
  onViewWorkOrder,
  onSelectWorkOrder,
  pagination,
  onPageChange
}) => {
  const [showEditModal, setShowEditModal] = useState(false);
  const [workOrderToEdit, setWorkOrderToEdit] = useState(null);

  // Handle edit button click
  const handleEditClick = (workOrder) => {
    setWorkOrderToEdit(workOrder);
    setShowEditModal(true);
  };

  // Handle edit success
  const handleEditSuccess = () => {
    setShowEditModal(false);
    setWorkOrderToEdit(null);
    onRefresh(); // Refresh the work orders list
  };

  // Handle view button click - pass the work order to parent
  const handleViewClick = (workOrder) => {
    try {
      // Pass the selected work order to the parent component
      // Check for both onViewWorkOrder and onSelectWorkOrder for backward compatibility
      if (onViewWorkOrder) {
        onViewWorkOrder(workOrder);
      } else if (onSelectWorkOrder) {
        onSelectWorkOrder(workOrder);
      }
    } catch (error) {
      // console.error('Error in handleViewClick:', error);
    }
  };

  if (workOrders.length === 0) {
    return (
      <div className="text-center py-12 text-slate-500">
        No work orders found
      </div>
    );
  }

  const getStatusClass = (status) => {
    const classes = {
      DRAFT: 'bg-slate-100 text-slate-700',
      PENDING: 'bg-yellow-100 text-yellow-700',
      APPROVED: 'bg-blue-100 text-blue-700',
      IN_PROGRESS: 'bg-purple-100 text-purple-700',
      COMPLETED: 'bg-green-100 text-green-700',
      CANCELLED: 'bg-red-100 text-red-700'
    };
    return classes[status] || 'bg-slate-100 text-slate-700';
  };

  const getStatusText = (status) => {
    const texts = {
      DRAFT: 'Draft',
      PENDING: 'Pending',
      APPROVED: 'Approved',
      IN_PROGRESS: 'In Progress',
      COMPLETED: 'Completed',
      CANCELLED: 'Cancelled'
    };
    return texts[status] || status;
  };

  const getPriorityClass = (priority) => {
    const classes = {
      LOW: 'bg-slate-100 text-slate-600',
      MEDIUM: 'bg-blue-100 text-blue-600',
      HIGH: 'bg-orange-100 text-orange-600',
      URGENT: 'bg-red-100 text-red-600'
    };
    return classes[priority] || 'bg-slate-100 text-slate-600';
  };

  const getPriorityText = (priority) => {
    const texts = {
      LOW: 'Low',
      MEDIUM: 'Medium',
      HIGH: 'High',
      URGENT: 'Urgent'
    };
    return texts[priority] || priority;
  };

  // Function to check if deadline is approaching (within 2 days) and work order is not completed
  const isDeadlineApproaching = (promiseDate, status) => {
    // Only highlight if status is not completed
    if (status === 'COMPLETED') return false;
    
    if (!promiseDate) return false;
    
    const deadline = new Date(promiseDate);
    const now = new Date();
    const timeDiff = deadline.getTime() - now.getTime();
    const daysDiff = timeDiff / (1000 * 3600 * 24);
    
    // Highlight if deadline is within 2 days and not yet passed
    return daysDiff <= 2 && daysDiff >= 0;
  };

  // Handle pagination
  const handlePageChange = (newPage) => {
    if (onPageChange && newPage >= 1 && newPage <= pagination.pages) {
      onPageChange(newPage);
    }
  };

  return (
    <div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-full">
          <thead>
            <tr className="border-b border-slate-200">
              <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Order #</th>
              <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Title</th>
              <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Status</th>
              <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Priority</th>
              <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700 hidden md:table-cell">Created</th>
              <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700 hidden md:table-cell">Promise Date</th>
              <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Actions</th>
            </tr>
          </thead>
          <tbody>
            {workOrders.map((wo) => (
              <tr 
                key={wo.id} 
                className={`border-b border-slate-100 hover:bg-slate-50 ${isDeadlineApproaching(wo.promise_date, wo.status) ? 'bg-red-50' : ''}`} 
                data-testid={`workorder-row-${wo.id}`}
              >
                <td className={`py-4 px-4 font-medium ${isDeadlineApproaching(wo.promise_date, wo.status) ? 'text-red-700' : 'text-slate-800'}`}>
                  {wo.order_number}
                  {isDeadlineApproaching(wo.promise_date, wo.status) && (
                    <span className="ml-2 text-xs bg-red-100 text-red-800 px-2 py-1 rounded-full">
                      Deadline Approaching!
                    </span>
                  )}
                </td>
                <td className="py-4 px-4">
                  <div>
                    <p className={`font-semibold ${isDeadlineApproaching(wo.promise_date, wo.status) ? 'text-red-700' : 'text-slate-800'}`}>
                      {wo.title}
                    </p>
                    <p className="text-xs text-slate-500 md:hidden">{wo.description?.slice(0, 30)}...</p>
                    <p className="text-xs text-slate-500 hidden md:block">{wo.description?.slice(0, 50)}...</p>
                  </div>
                </td>
                <td className="py-4 px-4">
                  <div className="flex flex-col gap-1">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusClass(wo.status)}`}>
                      {getStatusText(wo.status)}
                    </span>
                    {isDeadlineApproaching(wo.promise_date, wo.status) && (
                      <span className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded-full md:hidden">
                        Urgent: Complete Soon!
                      </span>
                    )}
                  </div>
                </td>
                <td className="py-4 px-4">
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${getPriorityClass(wo.priority)}`}>
                    {getPriorityText(wo.priority)}
                  </span>
                </td>
                <td className="py-4 px-4 text-slate-700 text-sm hidden md:table-cell">
                  {new Date(wo.created_at).toLocaleDateString()}
                </td>
                <td className="py-4 px-4 text-slate-700 text-sm hidden md:table-cell">
                  {wo.promise_date ? new Date(wo.promise_date).toLocaleDateString() : 'N/A'}
                  {isDeadlineApproaching(wo.promise_date, wo.status) && (
                    <span className="ml-2 text-xs bg-red-100 text-red-800 px-2 py-1 rounded-full hidden md:inline">
                      Urgent: Complete Soon!
                    </span>
                  )}
                </td>
                <td className="py-4 px-4">
                  <div className="flex flex-wrap gap-2">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => {
                        // console.log('Eye button clicked directly with work order:', wo);
                        handleViewClick(wo);
                      }}
                      data-testid={`view-workorder-${wo.id}`}
                    >
                      <Eye className="w-4 h-4" />
                      <span className="sr-only">View</span>
                    </Button>
                    {!isEmployee && (
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => handleEditClick(wo)}
                        data-testid={`edit-workorder-${wo.id}`}
                      >
                        <Edit className="w-4 h-4" />
                        <span className="sr-only">Edit</span>
                      </Button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination Controls */}
      {pagination && pagination.pages > 1 && (
        <div className="flex items-center justify-between border-t border-slate-200 px-4 py-3">
          <div className="text-sm text-slate-700">
            Showing page {pagination.page} of {pagination.pages} ({pagination.total} total work orders)
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(1)}
              disabled={pagination.page === 1}
            >
              <ChevronsLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(pagination.page - 1)}
              disabled={pagination.page === 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(pagination.page + 1)}
              disabled={pagination.page === pagination.pages}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(pagination.pages)}
              disabled={pagination.page === pagination.pages}
            >
              <ChevronsRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && workOrderToEdit && (
        <WorkOrderModal
          companyId={companyId}
          onClose={() => {
            setShowEditModal(false);
            setWorkOrderToEdit(null);
          }}
          onSuccess={handleEditSuccess}
          workOrder={workOrderToEdit}
        />
      )}
    </div>
  );
};

export default WorkOrdersList;