import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { API } from '../App';
import DashboardLayout from '../components/DashboardLayout';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { FileText, DollarSign, Users, TrendingUp, Plus, Car, PieChart as PieChartIcon, BarChartIcon, Download } from 'lucide-react';
import WorkOrderModal from '../components/WorkOrderModal';
import WorkOrdersList from '../components/WorkOrdersList';
import WorkOrderFilters from '../components/WorkOrderFilters';
import WorkOrderDetails from '../components/WorkOrderDetails';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { useNavigate } from 'react-router-dom';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

const VigorAutomotiveDashboard = ({ user, onLogout }) => {
  const [stats, setStats] = useState(null);
  const [workOrders, setWorkOrders] = useState([]);
  const [filteredWorkOrders, setFilteredWorkOrders] = useState([]);
  const [showWorkOrderModal, setShowWorkOrderModal] = useState(false);
  const [selectedWorkOrder, setSelectedWorkOrder] = useState(null);
  const [company, setCompany] = useState(null);
  const [loading, setLoading] = useState(true);
  const [clients, setClients] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, pages: 1 });
  const [detailedReportData, setDetailedReportData] = useState([]);
  const [activeTab, setActiveTab] = useState('dashboard'); // dashboard or reports
  const navigate = useNavigate();

  useEffect(() => {
    fetchData();
  }, []);

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

  // Fetch detailed report data for export
  const fetchDetailedReportData = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API}/companies/${user.company_id}/reports/profit-loss-details`);
      setDetailedReportData(response.data.details || response.data);
    } catch (error) {
      console.error('Failed to fetch detailed report data:', error);
      toast.error('Failed to fetch detailed report data: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleWorkOrderCreated = () => {
    setShowWorkOrderModal(false);
    fetchData();
    toast.success('Work order created successfully');
  };

  // Handle when a work order is selected from the list
  const handleWorkOrderSelect = (workOrder) => {
    setSelectedWorkOrder(workOrder);
  };

  // Handle edit work order
  const handleEditWorkOrder = (workOrder) => {
    // For now, just go back to list view
    // In the future, we can implement edit functionality
    setSelectedWorkOrder(null);
  };

  // Prepare data for charts
  const statusData = stats?.status_breakdown ? 
    Object.entries(stats.status_breakdown).map(([name, value]) => ({ name, value })) : [];

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

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
    if (!detailedReportData || detailedReportData.length === 0) {
      toast.error('No report data available to export');
      return;
    }
    
    const ws = XLSX.utils.json_to_sheet(detailedReportData.map(item => ({
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
    if (!detailedReportData || detailedReportData.length === 0) {
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
    const tableData = detailedReportData.map(item => [
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

  // If a work order is selected, show its details
  if (selectedWorkOrder) {
    return (
      <DashboardLayout user={user} onLogout={onLogout}>
        <WorkOrderDetails 
          workOrderId={selectedWorkOrder.id} 
          companyId={user.company_id} 
          onBack={() => setSelectedWorkOrder(null)}
          onEdit={handleEditWorkOrder}
          user={user}
        />
      </DashboardLayout>
    );
  }

  if (loading && activeTab === 'dashboard') {
    return (
      <DashboardLayout user={user} onLogout={onLogout}>
        <div className="flex items-center justify-center h-screen">Loading...</div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout user={user} onLogout={onLogout}>
      <div className="space-y-6" data-testid="vigor-automotive-dashboard">
        {/* Header with Tabs */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-4xl font-bold text-slate-800" style={{fontFamily: 'Space Grotesk'}}>
              {activeTab === 'dashboard' ? 'Vigor Automotive' : 'Reports'}
            </h1>
            <p className="text-slate-600 mt-2">
              {activeTab === 'dashboard' ? 'Automotive Workshop Dashboard' : 'Detailed Work Order Reports'}
            </p>
          </div>
          <div className="flex gap-2">
            <Button 
              onClick={() => setActiveTab('dashboard')}
              variant={activeTab === 'dashboard' ? 'default' : 'outline'}
              className="mr-2"
            >
              Dashboard
            </Button>
            <Button 
              onClick={() => {
                setActiveTab('reports');
                if (detailedReportData.length === 0) {
                  fetchDetailedReportData();
                }
              }}
              variant={activeTab === 'reports' ? 'default' : 'outline'}
              className="mr-4"
            >
              Reports
            </Button>
            
            {activeTab === 'dashboard' ? (
              <>
                <Button variant="outline" onClick={() => navigate('/vehicles')}>
                  <Car className="w-4 h-4 mr-2" /> Vehicles
                </Button>
                <Button variant="outline" onClick={() => navigate('/reports')}>
                  <BarChartIcon className="w-4 h-4 mr-2" /> Reports
                </Button>
                <Button variant="outline" onClick={() => navigate('/clients')}>
                  <Users className="w-4 h-4 mr-2" /> Clients
                </Button>
                <Button variant="outline" onClick={() => navigate('/employees')}>
                  <Users className="w-4 h-4 mr-2" /> Employees
                </Button>
                <Button onClick={() => setShowWorkOrderModal(true)} className="bg-gradient-to-r from-blue-500 to-indigo-600" data-testid="create-workorder-button">
                  <Plus className="w-4 h-4 mr-2" /> Create Work Order
                </Button>
              </>
            ) : (
              <>
                <Button onClick={exportToExcel} variant="outline" size="sm">
                  <Download className="w-4 h-4 mr-2" />
                  Export XLS
                </Button>
                <Button onClick={exportToPDF} variant="outline" size="sm">
                  <Download className="w-4 h-4 mr-2" />
                  Export PDF
                </Button>
              </>
            )}
          </div>
        </div>

        {activeTab === 'dashboard' ? (
          <>
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
                    <p className="text-3xl font-bold text-green-900 mt-2">AED {stats?.total_revenue?.toFixed(2) || '0.00'}</p>
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
                    <p className="text-3xl font-bold text-amber-900 mt-2">AED {stats?.profit_margin?.toFixed(2) || '0.00'}</p>
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

            {/* Profit & Loss Summary */}
            <Card className="p-6">
              <h2 className="text-xl font-bold text-slate-800 mb-4" style={{fontFamily: 'Space Grotesk'}}>Profit & Loss Summary</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="p-4 bg-green-50 rounded-lg">
                  <p className="text-sm text-green-700 font-medium">Total Revenue</p>
                  <p className="text-2xl font-bold text-green-900 mt-2">AED {stats?.total_revenue?.toFixed(2) || '0.00'}</p>
                </div>
                <div className="p-4 bg-red-50 rounded-lg">
                  <p className="text-sm text-red-700 font-medium">Total Expenses</p>
                  <p className="text-2xl font-bold text-red-900 mt-2">AED {stats?.total_expenses?.toFixed(2) || '0.00'}</p>
                </div>
                <div className="p-4 bg-blue-50 rounded-lg">
                  <p className="text-sm text-blue-700 font-medium">Net Profit</p>
                  <p className="text-2xl font-bold text-blue-900 mt-2">AED {stats?.profit_margin?.toFixed(2) || '0.00'}</p>
                </div>
              </div>
            </Card>

            {/* Work Orders by Status - Replaced Charts with Cards */}
            <Card className="p-6">
              <h2 className="text-xl font-bold text-slate-800 mb-4" style={{fontFamily: 'Space Grotesk'}}>Work Orders by Status</h2>
              {statusData.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {statusData.map((item, index) => (
                    <Card key={item.name} className="p-4 hover:shadow-md transition-shadow">
                      <div className="flex justify-between items-center">
                        <h3 className="font-semibold text-slate-800">{item.name}</h3>
                        <span className="text-2xl font-bold" style={{ color: COLORS[index % COLORS.length] }}>
                          {item.value}
                        </span>
                      </div>
                      <p className="text-sm text-slate-600 mt-1">
                        {((item.value / statusData.reduce((sum, d) => sum + d.value, 0)) * 100).toFixed(1)}% of total
                      </p>
                      <div className="mt-2 w-full bg-slate-200 rounded-full h-2">
                        <div 
                          className="h-2 rounded-full" 
                          style={{ 
                            width: `${(item.value / Math.max(...statusData.map(d => d.value)) * 100)}%`,
                            backgroundColor: COLORS[index % COLORS.length]
                          }}
                        ></div>
                      </div>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="flex items-center justify-center h-32 text-slate-500">
                  No data available
                </div>
              )}
            </Card>

            {/* Work Order Trends - Replaced Chart with Cards */}
            <Card className="p-6">
              <h2 className="text-xl font-bold text-slate-800 mb-4" style={{fontFamily: 'Space Grotesk'}}>Work Order Trends</h2>
              {statusData.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-slate-200">
                        <th className="text-left py-2 px-4 text-sm font-semibold text-slate-700">Status</th>
                        <th className="text-left py-2 px-4 text-sm font-semibold text-slate-700">Count</th>
                        <th className="text-left py-2 px-4 text-sm font-semibold text-slate-700">Percentage</th>
                        <th className="text-left py-2 px-4 text-sm font-semibold text-slate-700">Visual</th>
                      </tr>
                    </thead>
                    <tbody>
                      {statusData.map((item, index) => {
                        const percentage = ((item.value / statusData.reduce((sum, d) => sum + d.value, 0)) * 100).toFixed(1);
                        return (
                          <tr key={item.name} className="border-b border-slate-100">
                            <td className="py-3 px-4">
                              <div className="flex items-center">
                                <div 
                                  className="w-3 h-3 rounded-full mr-2" 
                                  style={{ backgroundColor: COLORS[index % COLORS.length] }}
                                ></div>
                                {item.name}
                              </div>
                            </td>
                            <td className="py-3 px-4 font-medium">{item.value}</td>
                            <td className="py-3 px-4">{percentage}%</td>
                            <td className="py-3 px-4">
                              <div className="w-full bg-slate-200 rounded-full h-2">
                                <div 
                                  className="h-2 rounded-full" 
                                  style={{ 
                                    width: `${percentage}%`,
                                    backgroundColor: COLORS[index % COLORS.length]
                                  }}
                                ></div>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="flex items-center justify-center h-32 text-slate-500">
                  No data available
                </div>
              )}
            </Card>

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
                onSelectWorkOrder={handleWorkOrderSelect}
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
            ) : detailedReportData ? (
              <>
                {/* Key Metrics */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <Card className="p-6 bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
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

                  <Card className="p-6 bg-gradient-to-br from-green-50 to-green-100 border-green-200">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-green-700 font-medium">Revenue</p>
                        <p className="text-3xl font-bold text-green-900 mt-2">AED {stats?.total_revenue?.toFixed(2) || '0.00'}</p>
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
                        <p className="text-3xl font-bold text-amber-900 mt-2">AED {stats?.profit_margin?.toFixed(2) || '0.00'}</p>
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
                        <p className="text-3xl font-bold text-purple-900 mt-2">{stats?.active_clients || 0}</p>
                      </div>
                      <div className="w-12 h-12 bg-purple-500 rounded-xl flex items-center justify-center">
                        <Users className="w-6 h-6 text-white" />
                      </div>
                    </div>
                  </Card>
                </div>

                {/* Profit & Loss Summary */}
                <Card className="p-6">
                  <h2 className="text-xl font-bold text-slate-800 mb-4" style={{fontFamily: 'Space Grotesk'}}>Profit & Loss Summary</h2>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="p-4 bg-green-50 rounded-lg">
                      <p className="text-sm text-green-700 font-medium">Total Revenue</p>
                      <p className="text-2xl font-bold text-green-900 mt-2">AED {stats?.total_revenue?.toFixed(2) || '0.00'}</p>
                    </div>
                    <div className="p-4 bg-red-50 rounded-lg">
                      <p className="text-sm text-red-700 font-medium">Total Expenses</p>
                      <p className="text-2xl font-bold text-red-900 mt-2">AED {stats?.total_expenses?.toFixed(2) || '0.00'}</p>
                    </div>
                    <div className="p-4 bg-blue-50 rounded-lg">
                      <p className="text-sm text-blue-700 font-medium">Net Profit</p>
                      <p className="text-2xl font-bold text-blue-900 mt-2">AED {stats?.profit_margin?.toFixed(2) || '0.00'}</p>
                    </div>
                  </div>
                </Card>

                {/* Detailed Profit/Loss Table */}
                <Card className="p-6">
                  <h2 className="text-xl font-bold text-slate-800 mb-4" style={{fontFamily: 'Space Grotesk'}}>Detailed Profit/Loss per Work Order</h2>
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
                        {detailedReportData && detailedReportData.length > 0 ? (
                          detailedReportData.map((order) => (
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
    </DashboardLayout>
  );
};

export default VigorAutomotiveDashboard;