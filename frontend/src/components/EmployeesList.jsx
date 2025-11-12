import React, { useState } from 'react';
import { Button } from './ui/button';
import { Eye, Edit, Trash2, User } from 'lucide-react';
import { toast } from 'sonner';
import EmployeeDetailsModal from './EmployeeDetailsModal';

const EmployeesList = ({ employees, onEdit, onDelete, companyId }) => {
  const [showEmployeeDetails, setShowEmployeeDetails] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  
  if (employees.length === 0) {
    return (
      <div className="text-center py-12 text-slate-500">
        No employees found
      </div>
    );
  }

  return (
    <>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-200">
              <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Name</th>
              <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Position</th>
              <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Skills</th>
              <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Hourly Rate</th>
              <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Actions</th>
            </tr>
          </thead>
          <tbody>
            {employees.map((employee) => (
              <tr key={employee.id} className="border-b border-slate-100 hover:bg-slate-50">
                <td className="py-4 px-4 font-medium text-slate-800">
                  <button 
                    onClick={() => {
                      setSelectedEmployee(employee);
                      setShowEmployeeDetails(true);
                    }}
                    className="text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1"
                  >
                    <User className="w-4 h-4" />
                    {employee.user?.display_name || employee.user?.email || 'N/A'}
                  </button>
                </td>
                <td className="py-4 px-4 text-slate-700">{employee.position || 'N/A'}</td>
                <td className="py-4 px-4 text-slate-700">
                  {employee.skills?.length > 0 ? employee.skills.join(', ') : 'N/A'}
                </td>
                <td className="py-4 px-4 text-slate-700">
                  {employee.hourly_rate ? `AED ${employee.hourly_rate.toFixed(2)}` : 'N/A'}
                </td>
                <td className="py-4 px-4">
                  <div className="flex gap-2">
                    <Button variant="ghost" size="sm">
                      <Eye className="w-4 h-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => onEdit(employee)}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="text-red-500 hover:text-red-700"
                      onClick={() => onDelete(employee.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      {showEmployeeDetails && selectedEmployee && (
        <EmployeeDetailsModal 
          employee={selectedEmployee}
          companyId={companyId}
          onClose={() => setShowEmployeeDetails(false)}
        />
      )}
    </>
  );
};

export default EmployeesList;