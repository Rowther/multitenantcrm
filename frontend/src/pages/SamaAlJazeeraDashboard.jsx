import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { API } from '../App';
import DashboardLayout from '../components/DashboardLayout';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { FileText, DollarSign, Users, TrendingUp, Plus } from 'lucide-react';
import WorkOrderModal from '../components/WorkOrderModal';
import WorkOrdersList from '../components/WorkOrdersList';
import WorkOrderFilters from '../components/WorkOrderFilters';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const SamaAlJazeeraDashboard = ({ user, onLogout }) => {
  const [stats, setStats] = useState(null);
  const [workOrders, setWorkOrders] = useState([]);
  const [filteredWorkOrders, setFilteredWorkOrders] = useState([]);
  const [showWorkOrderModal, setShowWorkOrderModal] = useState(false);
  const [company, setCompany] = useState(null);
  const [loading, setLoading] = useState(true);
  const [clients, setClients] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, pages: 1 });

  const fetchData = async (page = 1, filters = {}) => {
    try {
      const params = { page, limit: 10, ...filters };
      
      const [statsRes, workOrdersRes, companyRes, clientsRes, employeesRes] = await Promise.all([
        axios.get(`${API}/companies/${user.company_id}/reports/overview`),
        axios.get(`${API}/companies/${user.company_id}/workorders`, { params }),
        axios.get(`${API}/companies/${user.company_id}`),
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
      
      setStats(statsRes.data);
      setWorkOrders(workOrdersData);
      setFilteredWorkOrders(workOrdersData);
      setCompany(companyRes.data);
      setClients(clientsRes.data);
      setEmployees(employeesRes.data);
      setPagination(paginationData);
    } catch (error) {
      toast.error('Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleWorkOrderCreated = () => {
    setShowWorkOrderModal(false);
    fetchData();
    toast.success('Work order created successfully');
  };

  const handleFilterChange = async (filters) => {
    try {
      const params = { page: 1, limit: 10 };
      
      if (filters.search) params.search = filters.search;
      if (filters.status && filters.status !== 'all') params.status = filters.status;
      if (filters.priority && filters.priority !== 'all') params.priority = filters.priority;
      if (filters.clientId && filters.clientId !== 'all') params.client_id = filters.clientId;
      if (filters.assignedTo && filters.assignedTo !== 'all') params.assigned_to = filters.assignedTo;
      
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
    return (
      <DashboardLayout user={user} onLogout={onLogout}>
        <div className="flex items-center justify-center h-screen">Loading...</div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout user={user} onLogout={onLogout}>
      <div className="space-y-6" data-testid="sama-al-jazeera-dashboard">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-4xl font-bold text-slate-800" style={{fontFamily: 'Space Grotesk'}}>Sama Al Jazeera</h1>
            <p className="text-slate-600 mt-2">Furniture & Interior Design Dashboard</p>
          </div>
          <div className="flex gap-2">
            <Button onClick={() => setShowWorkOrderModal(true)} className="bg-gradient-to-r from-blue-500 to-indigo-600" data-testid="create-workorder-button">
              <Plus className="w-4 h-4 mr-2" /> Create Work Order
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="p-6 bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200" data-testid="work-orders-card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-blue-700 font-medium">Total Work Orders</p>
                <p className="text-3xl font-bold text-blue-900 mt-2">{stats?.total_work_orders || 0}</p>
              </div>
              <div className="w-12 h-12 bg-blue-500 rounded-xl flex items-center justify-center">
                <FileText className="w-6 h-6 text-white" />
              </div>
            </div>
          </Card>

          <Card className="p-6 bg-gradient-to-br from-green-50 to-green-100 border-green-200" data-testid="revenue-card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-green-700 font-medium">Revenue</p>
                <p className="text-3xl font-bold text-green-900 mt-2">AED {stats?.total_revenue.toFixed(0) || 0}</p>
              </div>
              <div className="w-12 h-12 bg-green-500 rounded-xl flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-white" />
              </div>
            </div>
          </Card>

          <Card className="p-6 bg-gradient-to-br from-amber-50 to-amber-100 border-amber-200" data-testid="profit-card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-amber-700 font-medium">Profit Margin</p>
                <p className="text-3xl font-bold text-amber-900 mt-2">AED {stats?.profit_margin.toFixed(0) || 0}</p>
              </div>
              <div className="w-12 h-12 bg-amber-500 rounded-xl flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-white" />
              </div>
            </div>
          </Card>

          <Card className="p-6 bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200" data-testid="clients-card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-purple-700 font-medium">Active Clients</p>
                <p className="text-3xl font-bold text-purple-900 mt-2">{stats?.active_clients || 0}</p>
              </div>
              <div className="w-12 h-12 bg-purple-500 rounded-xl flex items-center justify-center">
                <Users className="w-6 h-6 text-white" />
              </div>
            </div>
          </Card>
        </div>

        {/* Work Orders by Status - Replaced Chart with Cards */}
        {stats?.status_breakdown && (
          <Card className="p-6">
            <h2 className="text-xl font-bold text-slate-800 mb-4" style={{fontFamily: 'Space Grotesk'}}>Work Orders by Status</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Object.entries(stats.status_breakdown).map(([status, count]) => (
                <Card key={status} className="p-4 hover:shadow-md transition-shadow">
                  <div className="flex justify-between items-center">
                    <h3 className="font-semibold text-slate-800">{status}</h3>
                    <span className="text-2xl font-bold text-blue-600">{count}</span>
                  </div>
                  <div className="mt-2 w-full bg-slate-200 rounded-full h-2">
                    <div 
                      className="bg-blue-600 h-2 rounded-full" 
                      style={{ width: `${(count / Math.max(...Object.values(stats.status_breakdown)) * 100)}%` }}
                    ></div>
                  </div>
                </Card>
              ))}
            </div>
          </Card>
        )}

        {/* Work Orders Table */}
        <Card className="p-6">
          <h2 className="text-xl font-bold text-slate-800 mb-4" style={{fontFamily: 'Space Grotesk'}}>Recent Work Orders</h2>
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
            pagination={pagination}
            onPageChange={handlePageChange}
          />

        </Card>
      </div>

      {showWorkOrderModal && (
        <WorkOrderModal
          companyId={user.company_id}
          onClose={() => setShowWorkOrderModal(false)}
          onSuccess={handleWorkOrderCreated}
          userId={user.id}
        />
      )}
    </DashboardLayout>
  );
};

export default SamaAlJazeeraDashboard;