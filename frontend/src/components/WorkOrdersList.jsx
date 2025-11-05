import React from 'react';
import { Button } from '@/components/ui/button';
import { Eye, Edit } from 'lucide-react';

const WorkOrdersList = ({ workOrders, companyId, onRefresh, isEmployee }) => {
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

  const getPriorityClass = (priority) => {
    const classes = {
      LOW: 'bg-slate-100 text-slate-600',
      MEDIUM: 'bg-blue-100 text-blue-600',
      HIGH: 'bg-orange-100 text-orange-600',
      URGENT: 'bg-red-100 text-red-600'
    };
    return classes[priority] || 'bg-slate-100 text-slate-600';
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-slate-200">
            <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Order #</th>
            <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Title</th>
            <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Status</th>
            <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Priority</th>
            <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Created</th>
            <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Actions</th>
          </tr>
        </thead>
        <tbody>
          {workOrders.map((wo) => (
            <tr key={wo.id} className="border-b border-slate-100 hover:bg-slate-50" data-testid={`workorder-row-${wo.id}`}>
              <td className="py-4 px-4 font-medium text-slate-800">{wo.order_number}</td>
              <td className="py-4 px-4">
                <div>
                  <p className="font-semibold text-slate-800">{wo.title}</p>
                  <p className="text-xs text-slate-500">{wo.description?.slice(0, 50)}...</p>
                </div>
              </td>
              <td className="py-4 px-4">
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusClass(wo.status)}`}>
                  {wo.status}
                </span>
              </td>
              <td className="py-4 px-4">
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${getPriorityClass(wo.priority)}`}>
                  {wo.priority}
                </span>
              </td>
              <td className="py-4 px-4 text-slate-700 text-sm">
                {new Date(wo.created_at).toLocaleDateString()}
              </td>
              <td className="py-4 px-4">
                <div className="flex gap-2">
                  <Button variant="ghost" size="sm" data-testid={`view-workorder-${wo.id}`}>
                    <Eye className="w-4 h-4" />
                  </Button>
                  {!isEmployee && (
                    <Button variant="ghost" size="sm" data-testid={`edit-workorder-${wo.id}`}>
                      <Edit className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default WorkOrdersList;
