import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API } from '../App';
import DashboardLayout from '../components/DashboardLayout';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Plus } from 'lucide-react';
import WorkOrderModal from '../components/WorkOrderModal';
import WorkOrdersList from '../components/WorkOrdersList';
import WorkOrderDetails from '../components/WorkOrderDetails';
import WorkOrderFilters from '../components/WorkOrderFilters'; // Added import
import { toast } from 'sonner';

const WorkOrdersPage = ({ user, onLogout }) => {
  const [workOrders, setWorkOrders] = useState([]);
  const [filteredWorkOrders, setFilteredWorkOrders] = useState([]); // Added state for filtered work orders
  const [selectedWorkOrder, setSelectedWorkOrder] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [clients, setClients] = useState([]); // Added state for clients
  const [employees, setEmployees] = useState([]); // Added state for employees
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    pages: 1
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async (page = 1, filters = {}) => {
    try {
      setLoading(true);
      const [workOrdersRes, clientsRes, employeesRes] = await Promise.all([
        axios.get(`${API}/companies/${user.company_id}/workorders`, {
          params: { page, limit: pagination.limit, ...filters }
        }),
        axios.get(`${API}/companies/${user.company_id}/clients`),
        axios.get(`${API}/companies/${user.company_id}/employees`)
      ]);
      
      // Handle both old and new API response formats
      if (workOrdersRes.data.work_orders) {
        // New format with pagination
        setWorkOrders(workOrdersRes.data.work_orders);
        setFilteredWorkOrders(workOrdersRes.data.work_orders);
        setPagination(workOrdersRes.data.pagination);
      } else {
        // Old format without pagination
        setWorkOrders(workOrdersRes.data);
        setFilteredWorkOrders(workOrdersRes.data);
      }
      
      setClients(clientsRes.data);
      setEmployees(employeesRes.data);
    } catch (error) {
      toast.error('Failed to fetch work orders');
    } finally {
      setLoading(false);
    }
  };

  const handleWorkOrderCreated = () => {
    setShowModal(false);
    fetchData(pagination.page);
    toast.success('Work order created successfully');
  };

  const handleEditWorkOrder = (workOrder) => {
    // Implementation for editing work order
    console.log('Edit work order', workOrder);
  };

  // Handle when a work order is selected from the list
  const handleWorkOrderSelect = (workOrder) => {
    setSelectedWorkOrder(workOrder);
  };

  // Handle filter changes
  const handleFilterChange = async (filters) => {
    try {
      const params = { page: 1, limit: pagination.limit };
      
      if (filters.search) params.search = filters.search;
      if (filters.status && filters.status !== 'all') params.status = filters.status;
      if (filters.priority && filters.priority !== 'all') params.priority = filters.priority;
      if (filters.clientId && filters.clientId !== 'all') params.client_id = filters.clientId;
      if (filters.assignedTo && filters.assignedTo !== 'all') params.assigned_to = filters.assignedTo;
      
      const response = await axios.get(`${API}/companies/${user.company_id}/workorders`, { params });
      
      // Handle both old and new API response formats
      if (response.data.work_orders) {
        // New format with pagination
        setFilteredWorkOrders(response.data.work_orders);
        setPagination(response.data.pagination);
      } else {
        // Old format without pagination
        setFilteredWorkOrders(response.data);
      }
    } catch (error) {
      toast.error('Failed to filter work orders');
    }
  };

  // Handle page change
  const handlePageChange = (newPage) => {
    fetchData(newPage);
  };

  if (loading) {
    return (
      <DashboardLayout user={user} onLogout={onLogout}>
        <div className="flex items-center justify-center h-screen">Loading...</div>
      </DashboardLayout>
    );
  }

  // If a work order is selected, show its details
  if (selectedWorkOrder) {
    return (
      <DashboardLayout user={user} onLogout={onLogout}>
        <WorkOrderDetails 
          workOrderId={selectedWorkOrder.id} 
          companyId={user.company_id} 
          onBack={() => setSelectedWorkOrder(null)}
          onEdit={(workOrder) => {
            // For now, just go back to list view
            // In the future, we can implement edit functionality
            setSelectedWorkOrder(null);
          }}
          user={user}
        />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout user={user} onLogout={onLogout}>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-4xl font-bold text-slate-800" style={{fontFamily: 'Space Grotesk'}}>Work Orders</h1>
          <Button onClick={() => setShowModal(true)} className="bg-gradient-to-r from-blue-500 to-indigo-600">
            <Plus className="w-4 h-4 mr-2" /> Create Work Order
          </Button>
        </div>

        <Card className="p-6">
          <WorkOrderFilters 
            onFilterChange={handleFilterChange}
            companyId={user.company_id}
            clients={clients}
            employees={employees}
          />
          <WorkOrdersList 
            workOrders={filteredWorkOrders} 
            companyId={user.company_id} 
            onRefresh={() => fetchData(pagination.page)} 
            isEmployee={user.role === 'EMPLOYEE'}
            onEditWorkOrder={handleEditWorkOrder}
            onSelectWorkOrder={handleWorkOrderSelect}
            pagination={pagination}
            onPageChange={handlePageChange}
          />
        </Card>

        {showModal && (
          <WorkOrderModal
            companyId={user.company_id}
            onClose={() => setShowModal(false)}
            onSuccess={handleWorkOrderCreated}
          />
        )}
      </div>
    </DashboardLayout>
  );
};

export default WorkOrdersPage;