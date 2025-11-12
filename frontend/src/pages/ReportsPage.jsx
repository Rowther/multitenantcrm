import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { API } from '../App';
import DashboardLayout from '../components/DashboardLayout';
import { Card } from '../components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';

const ReportsPage = ({ user, onLogout }) => {
  const [reportData, setReportData] = useState(null);
  const [detailedData, setDetailedData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('month');
  const [activeTab, setActiveTab] = useState('summary'); // Added state for tabs

  useEffect(() => {
    fetchReportData();
    fetchDetailedData();
  }, [timeRange]);

  const fetchReportData = async () => {
    try {
      const response = await axios.get(`${API}/companies/${user.company_id}/reports/overview`);
      setReportData(response.data);
    } catch (error) {
      toast.error('Failed to fetch report data');
    }
  };

  const fetchDetailedData = async () => {
    try {
      const response = await axios.get(`${API}/companies/${user.company_id}/reports/profit-loss-details`);
      setDetailedData(response.data.details);
    } catch (error) {
      toast.error('Failed to fetch detailed report data');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout user={user} onLogout={onLogout}>
        <div className="flex items-center justify-center h-full">Loading reports...</div>
      </DashboardLayout>
    );
  }

  // Prepare data for charts
  const statusData = reportData?.status_breakdown ? 
    Object.entries(reportData.status_breakdown).map(([name, value]) => ({ name, value })) : [];

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

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

  return (
    <DashboardLayout user={user} onLogout={onLogout}>
      <div className="space-y-6">
        <div>
          <h1 className="text-4xl font-bold text-slate-800" style={{fontFamily: 'Space Grotesk'}}>Reports & Analytics</h1>
          <p className="text-slate-600 mt-2">Detailed insights for {user.company_id ? 'your company' : 'all companies'}</p>
        </div>

        {/* Tabs */}
        <div className="border-b border-slate-200">
          <nav className="flex space-x-8">
            <button
              onClick={() => setActiveTab('summary')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'summary'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
              }`}
            >
              Summary
            </button>
            <button
              onClick={() => setActiveTab('detailed')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'detailed'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
              }`}
            >
              Detailed Profit/Loss
            </button>
          </nav>
        </div>

        {activeTab === 'summary' ? (
          <>
            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card className="p-6 bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-blue-700 font-medium">Total Work Orders</p>
                    <p className="text-3xl font-bold text-blue-900 mt-2">{reportData?.total_work_orders || 0}</p>
                  </div>
                  <div className="w-12 h-12 bg-blue-500 rounded-xl flex items-center justify-center">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                  </div>
                </div>
              </Card>

              <Card className="p-6 bg-gradient-to-br from-green-50 to-green-100 border-green-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-green-700 font-medium">Revenue</p>
                    <p className="text-3xl font-bold text-green-900 mt-2">AED {reportData?.total_revenue?.toFixed(2) || '0.00'}</p>
                  </div>
                  <div className="w-12 h-12 bg-green-500 rounded-xl flex items-center justify-center">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                </div>
              </Card>

              <Card className="p-6 bg-gradient-to-br from-amber-50 to-amber-100 border-amber-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-amber-700 font-medium">Profit Margin</p>
                    <p className="text-3xl font-bold text-amber-900 mt-2">AED {reportData?.profit_margin?.toFixed(2) || '0.00'}</p>
                  </div>
                  <div className="w-12 h-12 bg-amber-500 rounded-xl flex items-center justify-center">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                  </div>
                </div>
              </Card>

              <Card className="p-6 bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-purple-700 font-medium">Active Clients</p>
                    <p className="text-3xl font-bold text-purple-900 mt-2">{reportData?.active_clients || 0}</p>
                  </div>
                  <div className="w-12 h-12 bg-purple-500 rounded-xl flex items-center justify-center">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
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
                  <p className="text-2xl font-bold text-green-900 mt-2">AED {reportData?.total_revenue?.toFixed(2) || '0.00'}</p>
                </div>
                <div className="p-4 bg-red-50 rounded-lg">
                  <p className="text-sm text-red-700 font-medium">Total Expenses</p>
                  <p className="text-2xl font-bold text-red-900 mt-2">AED {reportData?.total_expenses?.toFixed(2) || '0.00'}</p>
                </div>
                <div className="p-4 bg-blue-50 rounded-lg">
                  <p className="text-sm text-blue-700 font-medium">Net Profit</p>
                  <p className="text-2xl font-bold text-blue-900 mt-2">AED {reportData?.profit_margin?.toFixed(2) || '0.00'}</p>
                </div>
              </div>
            </Card>

            {/* Work Orders by Status - Replaced Charts with Cards */}
            <Card className="p-6">
              <h2 className="text-xl font-bold text-slate-800 mb-4" style={{fontFamily: 'Space Grotesk'}}>Work Orders by Status</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {statusData.map((item, index) => (
                  <Card key={item.name} className="p-4 hover:shadow-md transition-shadow">
                    <div className="flex justify-between items-center">
                      <h3 className="font-semibold text-slate-800">{item.name}</h3>
                      <span className="text-2xl font-bold" style={{ color: COLORS[index % COLORS.length] }}>{item.value}</span>
                    </div>
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
            </Card>
          </>
        ) : (
          /* Detailed Profit/Loss Tab */
          <Card className="p-6">
            <h2 className="text-xl font-bold text-slate-800 mb-4" style={{fontFamily: 'Space Grotesk'}}>Detailed Profit/Loss per Work Order</h2>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Order #</TableHead>
                    <TableHead>Title</TableHead>
                    <TableHead>Client</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Quoted Price</TableHead>
                    <TableHead className="text-right">Expenses</TableHead>
                    <TableHead className="text-right">Revenue</TableHead>
                    <TableHead className="text-right">Profit/Loss</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {detailedData.map((order) => (
                    <TableRow key={order.work_order_id}>
                      <TableCell className="font-medium">{order.order_number}</TableCell>
                      <TableCell>{order.title}</TableCell>
                      <TableCell>{order.client_name}</TableCell>
                      <TableCell>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusClass(order.status)}`}>
                          {order.status}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">AED {order.quoted_price.toFixed(2)}</TableCell>
                      <TableCell className="text-right">AED {order.total_expenses.toFixed(2)}</TableCell>
                      <TableCell className="text-right">AED {order.total_revenue.toFixed(2)}</TableCell>
                      <TableCell className={`text-right ${getProfitLossClass(order.profit_loss)}`}>
                        AED {order.profit_loss.toFixed(2)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
};

export default ReportsPage;