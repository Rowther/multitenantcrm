import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API } from '../App';
import DashboardLayout from '../components/DashboardLayout';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Plus } from 'lucide-react';
import EmployeesList from '../components/EmployeesList';
import EmployeeModal from '../components/EmployeeModal';
import EmployeeDetailsModal from '../components/EmployeeDetailsModal';
import { toast } from 'sonner';

const EmployeesPage = ({ user, onLogout }) => {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState(null);

  useEffect(() => {
    fetchEmployees();
  }, []);

  const fetchEmployees = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API}/companies/${user.company_id}/employees`);
      setEmployees(response.data);
    } catch (error) {
      toast.error('Failed to fetch employees');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (employee) => {
    setSelectedEmployee(employee);
    setShowModal(true);
  };

  const handleDelete = async (employeeId) => {
    if (window.confirm('Are you sure you want to delete this employee?')) {
      try {
        await axios.delete(`${API}/companies/${user.company_id}/employees/${employeeId}`);
        fetchEmployees();
        toast.success('Employee deleted successfully');
      } catch (error) {
        toast.error('Failed to delete employee');
      }
    }
  };

  const handleSuccess = () => {
    setShowModal(false);
    setSelectedEmployee(null);
    fetchEmployees();
  };

  if (loading) {
    return (
      <DashboardLayout user={user} onLogout={onLogout}>
        <div className="flex items-center justify-center h-screen">Loading...</div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout user={user} onLogout={onLogout}>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-4xl font-bold text-slate-800" style={{fontFamily: 'Space Grotesk'}}>Employees</h1>
          <Button 
            onClick={() => setShowModal(true)} 
            className="bg-gradient-to-r from-blue-500 to-indigo-600"
          >
            <Plus className="w-4 h-4 mr-2" /> Add Employee
          </Button>
        </div>

        <Card className="p-6">
          <EmployeesList 
            employees={employees} 
            onEdit={handleEdit}
            onDelete={handleDelete}
            companyId={user.company_id}
          />
        </Card>

        {showModal && (
          <EmployeeModal
            companyId={user.company_id}
            employee={selectedEmployee}
            onClose={() => {
              setShowModal(false);
              setSelectedEmployee(null);
            }}
            onSuccess={handleSuccess}
          />
        )}
      </div>
    </DashboardLayout>
  );
};

export default EmployeesPage;