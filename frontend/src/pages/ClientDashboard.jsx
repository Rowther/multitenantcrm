import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { API } from '../App';
import DashboardLayout from '../components/DashboardLayout';
import { Card } from '../components/ui/card';
import { FileText, DollarSign } from 'lucide-react';
import WorkOrdersList from '../components/WorkOrdersList';
import WorkOrderFilters from '../components/WorkOrderFilters';

const ClientDashboard = ({ user, onLogout }) => {
  const [workOrders, setWorkOrders] = useState([]);
  const [filteredWorkOrders, setFilteredWorkOrders] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [clients, setClients] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, pages: 1 });
  const navigate = useNavigate();

  const fetchData = async (page = 1, filters = {}) => {
    try {
      // Use the correct client ID for filtering
      const clientId = user.client_id || user.id;
      const params = { page, limit: 10, client_id: clientId, ...filters };
      
      const [workOrdersRes, invoicesRes, clientsRes, employeesRes] = await Promise.all([
        axios.get(`${API}/companies/${user.company_id}/workorders`, { params }),
        axios.get(`${API}/companies/${user.company_id}/invoices`),
        axios.get(`${API}/companies/${user.company_id}/clients`),
        axios.get(`${API}/companies/${user.company_id}/employees`)
      ]);
      
      // Handle both old and new API response formats
      let workOrdersData, paginationData;
      if (workOrdersRes.data.work_orders) {
        workOrdersData = workOrdersRes.data.work_orders;
        paginationData = workOrdersRes.data.pagination;
      } else {
        workOrdersData = workOrdersRes.data;
        paginationData = {
          page: 1,
          limit: 10,
          total: workOrdersData.length,
          pages: Math.ceil(workOrdersData.length / 10)
        };
      }
      
      setWorkOrders(workOrdersData);
      setFilteredWorkOrders(workOrdersData);
      setInvoices(invoicesRes.data);
      setClients(clientsRes.data);
      setEmployees(employeesRes.data);
      setPagination(paginationData);
    } catch (error) {
      console.error('Failed to fetch data:', error);
      toast.error('Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Handle view work order details (clients can only view, not edit)
  const handleViewWorkOrder = (workOrder) => {
    // Navigate to work order details page
    navigate(`/companies/${user.company_id}/workorders/${workOrder.id}`);
  };

  const handleFilterChange = async (filters) => {
    try {
      const params = { page: 1, limit: 10, client_id: user.client_id || user.id };
      
      if (filters.search) params.search = filters.search;
      if (filters.status && filters.status !== 'all') params.status = filters.status;
      if (filters.priority && filters.priority !== 'all') params.priority = filters.priority;
      
      const response = await axios.get(`${API}/companies/${user.company_id}/workorders`, { params });
      
      // Handle both old and new API response formats
      let workOrdersData, paginationData;
      if (response.data.work_orders) {
        workOrdersData = response.data.work_orders;
        paginationData = response.data.pagination;
      } else {
        workOrdersData = response.data;
        paginationData = {
          page: 1,
          limit: 10,
          total: workOrdersData.length,
          pages: Math.ceil(workOrdersData.length / 10)
        };
      }
      
      setFilteredWorkOrders(workOrdersData);
      setPagination(paginationData);
    } catch (error) {
      toast.error('Failed to filter work orders');
    }
  };

  // Handle page change
  const handlePageChange = (newPage) => {
    fetchData(newPage);
  };

  if (loading) {
    return <div className="flex items-center justify-center h-screen">Loading...</div>;
  }

  // Calculate total spent correctly
  const totalSpent = invoices
    .filter(inv => inv.status === 'PAID')
    .reduce((sum, inv) => sum + (inv.total_amount || 0), 0);

  // Filter invoices for this client
  const clientInvoices = invoices.filter(invoice => {
    return workOrders.some(wo => wo.id === invoice.work_order_id);
  });

  return (
    <DashboardLayout user={user} onLogout={onLogout}>
      <div className="space-y-6" data-testid="client-dashboard">
        <div>
          <h1 className="text-4xl font-bold text-slate-800" style={{fontFamily: 'Space Grotesk'}}>My Account</h1>
          <p className="text-slate-600 mt-2">Client Dashboard</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="p-6 bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200" data-testid="my-orders-card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-blue-700 font-medium">My Orders</p>
                <p className="text-3xl font-bold text-blue-900 mt-2">{workOrders.length}</p>
              </div>
              <div className="w-12 h-12 bg-blue-500 rounded-xl flex items-center justify-center">
                <FileText className="w-6 h-6 text-white" />
              </div>
            </div>
          </Card>
          
          <Card className="p-6 bg-gradient-to-br from-green-50 to-green-100 border-green-200" data-testid="total-spent-card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-green-700 font-medium">Total Spent</p>
                <p className="text-3xl font-bold text-green-900 mt-2">AED {totalSpent.toFixed(2)}</p>
              </div>
              <div className="w-12 h-12 bg-green-500 rounded-xl flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-white" />
              </div>
            </div>
          </Card>
          
          <Card className="p-6 bg-gradient-to-br from-amber-50 to-amber-100 border-amber-200" data-testid="pending-invoices-card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-amber-700 font-medium">Pending Invoices</p>
                <p className="text-3xl font-bold text-amber-900 mt-2">{clientInvoices.filter(inv => inv.status === 'ISSUED').length}</p>
              </div>
              <div className="w-12 h-12 bg-amber-500 rounded-xl flex items-center justify-center">
                <FileText className="w-6 h-6 text-white" />
              </div>
            </div>
          </Card>
        </div>

        {/* Work Orders */}
        <Card className="p-6">
          <h2 className="text-xl font-bold text-slate-800 mb-4" style={{fontFamily: 'Space Grotesk'}}>My Work Orders</h2>
          <WorkOrderFilters 
            onFilterChange={handleFilterChange}
            companyId={user.company_id}
            clients={clients}
            employees={employees}
          />
          {/* Pass isEmployee=true to disable editing capabilities for clients */}
          <WorkOrdersList 
            workOrders={filteredWorkOrders} 
            companyId={user.company_id} 
            onRefresh={() => fetchData(pagination.page)} 
            isEmployee={true} // This will disable edit buttons for clients
            onSelectWorkOrder={handleViewWorkOrder} // Handle view only
            pagination={pagination}
            onPageChange={handlePageChange}
          />
        </Card>

        {/* Invoices */}
        <Card className="p-6">
          <h2 className="text-xl font-bold text-slate-800 mb-4" style={{fontFamily: 'Space Grotesk'}}>My Invoices</h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Invoice #</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Date</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Amount</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Status</th>
                </tr>
              </thead>
              <tbody>
                {clientInvoices.length > 0 ? (
                  clientInvoices.map((invoice) => (
                    <tr key={invoice.id} className="border-b border-slate-100 hover:bg-slate-50" data-testid={`invoice-row-${invoice.id}`}>
                      <td className="py-4 px-4 font-medium text-slate-800">{invoice.invoice_number}</td>
                      <td className="py-4 px-4 text-slate-700">{invoice.issued_date ? new Date(invoice.issued_date).toLocaleDateString() : 'N/A'}</td>
                      <td className="py-4 px-4 text-slate-700">AED {typeof invoice.total_amount === 'number' ? invoice.total_amount.toFixed(2) : '0.00'}</td>
                      <td className="py-4 px-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                          invoice.status === 'PAID' ? 'bg-green-100 text-green-700' :
                          invoice.status === 'ISSUED' ? 'bg-yellow-100 text-yellow-700' :
                          'bg-slate-100 text-slate-700'
                        }`}>
                          {invoice.status}
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="4" className="py-8 px-4 text-center text-slate-500">
                      No invoices found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default ClientDashboard;