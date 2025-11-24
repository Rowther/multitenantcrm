import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { API } from '../App';
import DashboardLayout from '../components/DashboardLayout';
import DashboardSkeleton from '../components/DashboardSkeleton';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { FileText, DollarSign, Users, TrendingUp, Plus, Download } from 'lucide-react';
import WorkOrderModal from '../components/WorkOrderModal';
import WorkOrdersList from '../components/WorkOrdersList';
import WorkOrderFilters from '../components/WorkOrderFilters';
import UserModal from '../components/UserModal';
import EditUserModal from '../components/EditUserModal';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

const AdminDashboard = ({ user, onLogout }) => {
  const [stats, setStats] = useState(null);
  const [workOrders, setWorkOrders] = useState([]);
  const [filteredWorkOrders, setFilteredWorkOrders] = useState([]);
  const [showWorkOrderModal, setShowWorkOrderModal] = useState(false);
  const [showUserModal, setShowUserModal] = useState(false);
  const [showEditUserModal, setShowEditUserModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [company, setCompany] = useState(null);
  const [loading, setLoading] = useState(true);
  const [clients, setClients] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, pages: 1 });
  const [reportData, setReportData] = useState(null);
  const [activeTab, setActiveTab] = useState('dashboard'); // dashboard or reports
  const navigate = useNavigate();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async (page = 1, filters = {}) => {
    try {
      setLoading(true);
      const params = { page, limit: 10, ...filters };

      const [workOrdersRes, clientsRes, employeesRes, companyRes] = await Promise.all([
        axios.get(`${API}/companies/${user.company_id}/workorders`, { params }),
        axios.get(`${API}/companies/${user.company_id}/clients`),
        axios.get(`${API}/companies/${user.company_id}/employees`),
        axios.get(`${API}/companies/${user.company_id}`)
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
      setClients(clientsRes.data);
      setEmployees(employeesRes.data);
      setCompany(companyRes.data);

      // Calculate stats
      const totalRevenue = workOrdersData.reduce((sum, wo) => sum + (wo.paid_amount || 0), 0);
      const workOrdersByStatus = workOrdersData.reduce((acc, wo) => {
        acc[wo.status] = (acc[wo.status] || 0) + 1;
        return acc;
      }, {});

      setStats({
        total_work_orders: workOrdersData.length,
        totalWorkOrders: workOrdersData.length,
        total_revenue: totalRevenue,
        totalRevenue: totalRevenue,
        active_clients: clientsRes.data.length,
        activeClients: clientsRes.data.length,
        profit_margin: totalRevenue * 0.3, // Assuming 30% profit margin
        profitMargin: totalRevenue * 0.3,
        status_breakdown: workOrdersByStatus,
        workOrdersByStatus
      });

      setPagination(paginationData);
    } catch (error) {
      toast.error('Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  // Fetch report data for the reports tab
  const fetchReportData = async () => {
    try {
      setLoading(true);
      const [overviewRes, detailedRes] = await Promise.all([
        axios.get(`${API}/companies/${user.company_id}/reports/overview`),
        axios.get(`${API}/companies/${user.company_id}/reports/profit-loss-details`)
      ]);

      setReportData({
        overview: overviewRes.data,
        detailed: detailedRes.data.details || detailedRes.data
      });
    } catch (error) {
      console.error('Failed to fetch report data:', error);
      toast.error('Failed to fetch report data: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleUserCreated = () => {
    setShowUserModal(false);
    fetchData();
    toast.success('User created successfully');
  };

  const handleUserUpdated = () => {
    setShowEditUserModal(false);
    setSelectedUser(null);
    fetchData();
    toast.success('User updated successfully');
  };

  const handleEditUser = (user) => {
    setSelectedUser(user);
    setShowEditUserModal(true);
  };

  const handleDeleteUser = async (userId) => {
    toast(
      <div className="flex flex-col gap-4">
        <p>Are you sure you want to delete this user?</p>
        <div className="flex gap-2">
          <Button
            variant="destructive"
            size="sm"
            onClick={async () => {
              try {
                await axios.delete(`${API}/users/${userId}`);
                fetchData();
                toast.success('User deleted successfully');
              } catch (error) {
                toast.error('Failed to delete user: ' + error.message);
              }
            }}
          >
            Delete
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => toast.dismiss()}
          >
            Cancel
          </Button>
        </div>
      </div>,
      {
        duration: 10000,
        dismissible: true
      }
    );
  };

  const handleWorkOrderCreated = () => {
    setShowWorkOrderModal(false);
    fetchData();
    toast.success('Work order created successfully');
  };

  // Handle view work order - navigate to work order details page
  const handleViewWorkOrder = (workOrder) => {
    // console.log('Navigating to work order details for:', workOrder);
    navigate(`/companies/${user.company_id}/workorders/${workOrder.id}`);
  };

  // Handle filter changes
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

  // Export to Excel function
  const exportToExcel = () => {
    if (!reportData || !reportData.detailed) {
      toast.error('No report data available to export');
      return;
    }

    const ws = XLSX.utils.json_to_sheet(reportData.detailed.map(item => ({
      'Order Number': item.order_number,
      'Title': item.title,
      'Client': item.client_name,
      'Status': item.status,
      'Quoted Price': item.quoted_price,
      'Total Expenses': item.total_expenses,
      'Total Revenue': item.total_revenue,
      'Profit/Loss': item.profit_loss
    })));

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Work Order Reports');
    XLSX.writeFile(wb, `work-order-reports-${user.company_id}.xlsx`);

    toast.success('Report exported to Excel successfully');
  };

  // Export to PDF function
  const exportToPDF = () => {
    if (!reportData || !reportData.detailed) {
      toast.error('No report data available to export');
      return;
    }

    const doc = new jsPDF();

    // Add title
    doc.setFontSize(18);
    doc.text('Work Order Reports', 14, 20);
    doc.setFontSize(12);
    doc.text(`Company ID: ${user.company_id}`, 14, 30);
    doc.text(`Export Date: ${new Date().toLocaleDateString()}`, 14, 40);

    // Add table
    const tableData = reportData.detailed.map(item => [
      item.order_number,
      item.title,
      item.client_name,
      item.status,
      `AED ${item.quoted_price?.toFixed(2) || '0.00'}`,
      `AED ${item.total_expenses?.toFixed(2) || '0.00'}`,
      `AED ${item.total_revenue?.toFixed(2) || '0.00'}`,
      `AED ${item.profit_loss?.toFixed(2) || '0.00'}`
    ]);

    doc.autoTable({
      head: [['Order #', 'Title', 'Client', 'Status', 'Quoted Price', 'Expenses', 'Revenue', 'Profit/Loss']],
      body: tableData,
      startY: 50,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [59, 130, 246] },
      alternateRowStyles: { fillColor: [245, 245, 245] }
    });

    doc.save(`work-order-reports-${user.company_id}.pdf`);

    toast.success('Report exported to PDF successfully');
  };

  // Function to get status class for detailed table
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

  // Function to get profit/loss class
  const getProfitLossClass = (amount) => {
    if (amount > 0) return 'text-green-600 font-bold';
    if (amount < 0) return 'text-red-600 font-bold';
    return 'text-slate-600';
  };

  if (loading && activeTab === 'dashboard' && !stats) {
    return (
      <DashboardLayout user={user} onLogout={onLogout}>
        <DashboardSkeleton />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout user={user} onLogout={onLogout}>
      <div className="space-y-4 md:space-y-6" data-testid="admin-dashboard">
        {/* Header with Tabs - Responsive */}
        <div className="flex flex-col gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold text-slate-800 break-words" style={{ fontFamily: 'Space Grotesk' }}>
              {activeTab === 'dashboard' ? company?.name : 'Reports'}
            </h1>
            <p className="text-sm md:text-base text-slate-600 mt-1 md:mt-2">
              {activeTab === 'dashboard' ? 'Admin Dashboard' : 'Detailed Work Order Reports'}
            </p>
          </div>

          {/* Tab Navigation - Responsive */}
          <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
            <div className="flex gap-2">
              <Button
                onClick={() => setActiveTab('dashboard')}
                variant={activeTab === 'dashboard' ? 'default' : 'outline'}
                className="w-12 h-12 p-0 sm:w-auto sm:h-auto sm:px-4 sm:py-2 flex items-center justify-center"
              >
                <Home className="w-5 h-5" />
                <span className="hidden sm:inline sm:ml-2">Dashboard</span>
              </Button>
              <Button
                onClick={() => {
                  setActiveTab('reports');
                  if (!reportData) {
                    fetchReportData();
                  }
                }}
                variant={activeTab === 'reports' ? 'default' : 'outline'}
                className="w-12 h-12 p-0 sm:w-auto sm:h-auto sm:px-4 sm:py-2 flex items-center justify-center"
              >
                <BarChart3 className="w-5 h-5" />
                <span className="hidden sm:inline sm:ml-2">Reports</span>
              </Button>
            </div>

            <div className="flex gap-2">
              {activeTab === 'dashboard' ? (
                <>
                  <Button onClick={() => setShowUserModal(true)} variant="outline" data-testid="create-user-button" className="flex-1 sm:flex-none min-h-[44px]">
                    <Plus className="w-4 h-4 mr-2" /> User
                  </Button>
                  <div className="hidden sm:block flex-1 sm:flex-none">
                    <Button onClick={() => setShowWorkOrderModal(true)} className="bg-gradient-to-r from-blue-500 to-indigo-600 w-full min-h-[44px]" data-testid="create-workorder-button">
                      <Plus className="w-4 h-4 mr-2" /> Work Order
                    </Button>
                  </div>
                </>
              ) : (
                <>
                  <Button onClick={exportToExcel} variant="outline" size="sm" className="flex-1 sm:flex-none min-h-[44px]">
                    <Download className="w-4 h-4 mr-2" />
                    <span className="hidden sm:inline">Export</span> XLS
                  </Button>
                  <Button onClick={exportToPDF} variant="outline" size="sm" className="flex-1 sm:flex-none min-h-[44px]">
                    <Download className="w-4 h-4 mr-2" />
                    <span className="hidden sm:inline">Export</span> PDF
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>

        {activeTab === 'dashboard' ? (
          <>
            {/* Stats Cards - Responsive Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
              <Card className="p-4 md:p-6 bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200" data-testid="work-orders-card">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs md:text-sm text-blue-700 font-medium">Total Work Orders</p>
                    <p className="text-2xl md:text-3xl font-bold text-blue-900 mt-1 md:mt-2">{stats?.total_work_orders || stats?.totalWorkOrders || 0}</p>
                  </div>
                  <div className="w-10 h-10 md:w-12 md:h-12 bg-blue-500 rounded-xl flex items-center justify-center flex-shrink-0">
                    <FileText className="w-5 h-5 md:w-6 md:h-6 text-white" />
                  </div>
                </div>
              </Card>

              <Card className="p-4 md:p-6 bg-gradient-to-br from-green-50 to-green-100 border-green-200" data-testid="revenue-card">
                <div className="flex items-center justify-between">
                  <div className="min-w-0">
                    <p className="text-xs md:text-sm text-green-700 font-medium">Revenue</p>
                    <p className="text-2xl md:text-3xl font-bold text-green-900 mt-1 md:mt-2 truncate">AED {(stats?.total_revenue || stats?.totalRevenue || 0).toFixed(0)}</p>
                  </div>
                  <div className="w-10 h-10 md:w-12 md:h-12 bg-green-500 rounded-xl flex items-center justify-center flex-shrink-0">
                    <DollarSign className="w-5 h-5 md:w-6 md:h-6 text-white" />
                  </div>
                </div>
              </Card>

              <Card className="p-4 md:p-6 bg-gradient-to-br from-amber-50 to-amber-100 border-amber-200" data-testid="profit-card">
                <div className="flex items-center justify-between">
                  <div className="min-w-0">
                    <p className="text-xs md:text-sm text-amber-700 font-medium">Profit Margin</p>
                    <p className="text-2xl md:text-3xl font-bold text-amber-900 mt-1 md:mt-2 truncate">AED {(stats?.profit_margin || stats?.profitMargin || 0).toFixed(0)}</p>
                  </div>
                  <div className="w-10 h-10 md:w-12 md:h-12 bg-amber-500 rounded-xl flex items-center justify-center flex-shrink-0">
                    <TrendingUp className="w-5 h-5 md:w-6 md:h-6 text-white" />
                  </div>
                </div>
              </Card>

              <Card className="p-4 md:p-6 bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200" data-testid="clients-card">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs md:text-sm text-purple-700 font-medium">Active Clients</p>
                    <p className="text-2xl md:text-3xl font-bold text-purple-900 mt-1 md:mt-2">{stats?.active_clients || stats?.activeClients || 0}</p>
                  </div>
                  <div className="w-10 h-10 md:w-12 md:h-12 bg-purple-500 rounded-xl flex items-center justify-center flex-shrink-0">
                    <Users className="w-5 h-5 md:w-6 md:h-6 text-white" />
                  </div>
                </div>
              </Card>
            </div>

            {/* Work Orders by Status - Replaced Chart with Cards */}
            {(stats?.status_breakdown || stats?.workOrdersByStatus) && (
              <Card className="p-4 md:p-6">
                <h2 className="text-lg md:text-xl font-bold text-slate-800 mb-4" style={{ fontFamily: 'Space Grotesk' }}>Work Orders by Status</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {Object.entries(stats.status_breakdown || stats.workOrdersByStatus).map(([status, count]) => (
                    <Card key={status} className="p-4 hover:shadow-md transition-shadow">
                      <div className="flex justify-between items-center">
                        <h3 className="font-semibold text-slate-800 text-sm md:text-base">{status}</h3>
                        <span className="text-xl md:text-2xl font-bold text-blue-600">{count}</span>
                      </div>
                      <div className="mt-2 w-full bg-slate-200 rounded-full h-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full"
                          style={{ width: `${(count / Math.max(...Object.values(stats.status_breakdown || stats.workOrdersByStatus)) * 100)}%` }}
                        ></div>
                      </div>
                    </Card>
                  ))}
                </div>
              </Card>
            )}

            {/* Work Orders Table */}
            <Card className="p-4 md:p-6">
              <h2 className="text-lg md:text-xl font-bold text-slate-800 mb-4" style={{ fontFamily: 'Space Grotesk' }}>Recent Work Orders</h2>
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
                onViewWorkOrder={handleViewWorkOrder}
                pagination={pagination}
                onPageChange={handlePageChange}
              />
            </Card>
          </>
        ) : (
          /* Reports Tab Content */
          <div className="space-y-6">
            {loading ? (
              <div className="flex items-center justify-center h-64">Loading reports...</div>
            ) : reportData ? (
              <>
                {/* Key Metrics */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <Card className="p-6 bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-blue-700 font-medium">Total Work Orders</p>
                        <p className="text-3xl font-bold text-blue-900 mt-2">{reportData.overview?.total_work_orders || 0}</p>
                      </div>
                      <div className="w-12 h-12 bg-blue-500 rounded-xl flex items-center justify-center">
                        <FileText className="w-6 h-6 text-white" />
                      </div>
                    </div>
                  </Card>

                  <Card className="p-6 bg-gradient-to-br from-green-50 to-green-100 border-green-200">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-green-700 font-medium">Revenue</p>
                        <p className="text-3xl font-bold text-green-900 mt-2">AED {reportData.overview?.total_revenue?.toFixed(2) || '0.00'}</p>
                      </div>
                      <div className="w-12 h-12 bg-green-500 rounded-xl flex items-center justify-center">
                        <DollarSign className="w-6 h-6 text-white" />
                      </div>
                    </div>
                  </Card>

                  <Card className="p-6 bg-gradient-to-br from-amber-50 to-amber-100 border-amber-200">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-amber-700 font-medium">Profit Margin</p>
                        <p className="text-3xl font-bold text-amber-900 mt-2">AED {reportData.overview?.profit_margin?.toFixed(2) || '0.00'}</p>
                      </div>
                      <div className="w-12 h-12 bg-amber-500 rounded-xl flex items-center justify-center">
                        <TrendingUp className="w-6 h-6 text-white" />
                      </div>
                    </div>
                  </Card>

                  <Card className="p-6 bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-purple-700 font-medium">Active Clients</p>
                        <p className="text-3xl font-bold text-purple-900 mt-2">{reportData.overview?.active_clients || 0}</p>
                      </div>
                      <div className="w-12 h-12 bg-purple-500 rounded-xl flex items-center justify-center">
                        <Users className="w-6 h-6 text-white" />
                      </div>
                    </div>
                  </Card>
                </div>

                {/* Profit & Loss Summary */}
                <Card className="p-6">
                  <h2 className="text-xl font-bold text-slate-800 mb-4" style={{ fontFamily: 'Space Grotesk' }}>Profit & Loss Summary</h2>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="p-4 bg-green-50 rounded-lg">
                      <p className="text-sm text-green-700 font-medium">Total Revenue</p>
                      <p className="text-2xl font-bold text-green-900 mt-2">AED {reportData.overview?.total_revenue?.toFixed(2) || '0.00'}</p>
                    </div>
                    <div className="p-4 bg-red-50 rounded-lg">
                      <p className="text-sm text-red-700 font-medium">Total Expenses</p>
                      <p className="text-2xl font-bold text-red-900 mt-2">AED {reportData.overview?.total_expenses?.toFixed(2) || '0.00'}</p>
                    </div>
                    <div className="p-4 bg-blue-50 rounded-lg">
                      <p className="text-sm text-blue-700 font-medium">Net Profit</p>
                      <p className="text-2xl font-bold text-blue-900 mt-2">AED {reportData.overview?.profit_margin?.toFixed(2) || '0.00'}</p>
                    </div>
                  </div>
                </Card>

                {/* Detailed Profit/Loss Table */}
                <Card className="p-6">
                  <h2 className="text-xl font-bold text-slate-800 mb-4" style={{ fontFamily: 'Space Grotesk' }}>Detailed Profit/Loss per Work Order</h2>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-slate-200">
                          <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Order #</th>
                          <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Title</th>
                          <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Client</th>
                          <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Status</th>
                          <th className="text-right py-3 px-4 text-sm font-semibold text-slate-700">Quoted Price</th>
                          <th className="text-right py-3 px-4 text-sm font-semibold text-slate-700">Expenses</th>
                          <th className="text-right py-3 px-4 text-sm font-semibold text-slate-700">Revenue</th>
                          <th className="text-right py-3 px-4 text-sm font-semibold text-slate-700">Profit/Loss</th>
                        </tr>
                      </thead>
                      <tbody>
                        {reportData.detailed && reportData.detailed.length > 0 ? (
                          reportData.detailed.map((order) => (
                            <tr key={order.work_order_id} className="border-b border-slate-100 hover:bg-slate-50">
                              <td className="py-3 px-4 font-medium">{order.order_number}</td>
                              <td className="py-3 px-4">{order.title}</td>
                              <td className="py-3 px-4">{order.client_name}</td>
                              <td className="py-3 px-4">
                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusClass(order.status)}`}>
                                  {order.status}
                                </span>
                              </td>
                              <td className="py-3 px-4 text-right">AED {order.quoted_price?.toFixed(2) || '0.00'}</td>
                              <td className="py-3 px-4 text-right">AED {order.total_expenses?.toFixed(2) || '0.00'}</td>
                              <td className="py-3 px-4 text-right">AED {order.total_revenue?.toFixed(2) || '0.00'}</td>
                              <td className={`py-3 px-4 text-right ${getProfitLossClass(order.profit_loss)}`}>
                                AED {order.profit_loss?.toFixed(2) || '0.00'}
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan="8" className="text-center py-8 text-slate-500">
                              No detailed data available
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </Card>
              </>
            ) : (
              <div className="flex items-center justify-center h-64">
                <p className="text-slate-500">No report data available</p>
              </div>
            )}
          </div>
        )}
      </div>

      {showWorkOrderModal && (
        <WorkOrderModal
          companyId={user.company_id}
          onClose={() => setShowWorkOrderModal(false)}
          onSuccess={handleWorkOrderCreated}
          userId={user.id}
        />
      )}
      {showUserModal && (
        <UserModal
          onClose={() => setShowUserModal(false)}
          onSuccess={handleUserCreated}
          companyId={user.company_id}
          isSuperAdmin={false}
          clients={clients}
          companies={[]}
        />
      )}
      {showEditUserModal && selectedUser && (
        <EditUserModal
          user={selectedUser}
          onClose={() => {
            setShowEditUserModal(false);
            setSelectedUser(null);
          }}
          onSuccess={handleUserUpdated}
          companyId={user.company_id}
          isSuperAdmin={false}
          clients={clients}
        />
      )}
    </DashboardLayout>
  );
};

export default AdminDashboard;