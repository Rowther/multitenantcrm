import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { API } from '../App';
import DashboardLayout from '../components/DashboardLayout';
import { Card } from '../components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';

const SuperAdminReportsPage = ({ user, onLogout }) => {
  const [reportData, setReportData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // all, profitable, loss
  const [companyFilter, setCompanyFilter] = useState('all'); // all companies
  const [technicianFilter, setTechnicianFilter] = useState('all'); // all technicians
  const [sortConfig, setSortConfig] = useState({ key: 'order_number', direction: 'asc' });
  const [companies, setCompanies] = useState([]); // For company filter dropdown
  const [technicians, setTechnicians] = useState([]); // For technician filter dropdown

  useEffect(() => {
    fetchReportData();
  }, []);

  const fetchReportData = async () => {
    try {
      const response = await axios.get(`${API}/superadmin/reports/all-workorders-profit`);
      const data = response.data.details || response.data || [];
      setReportData(data);
      
      // Extract unique companies for filters
      const uniqueCompanies = [...new Set(data.map(item => item.company_name))];
      setCompanies(uniqueCompanies);
      
      // Extract unique technicians for filters
      const uniqueTechnicians = [...new Set(data.flatMap(item => 
        item.technician_names || []))];
      setTechnicians(uniqueTechnicians);
    } catch (error) {
      console.error('Failed to fetch report data:', error);
      toast.error('Failed to fetch report data: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const sortedData = React.useMemo(() => {
    if (!reportData) return [];
    
    let filtered = [...reportData];
    
    // Apply filters
    if (filter === 'profitable') {
      filtered = filtered.filter(item => item.profit_loss > 0);
    } else if (filter === 'loss') {
      filtered = filtered.filter(item => item.profit_loss < 0);
    }
    
    // Apply company filter
    if (companyFilter !== 'all') {
      filtered = filtered.filter(item => item.company_name === companyFilter);
    }
    
    // Apply technician filter
    if (technicianFilter !== 'all') {
      filtered = filtered.filter(item => 
        item.technician_names && item.technician_names.includes(technicianFilter));
    }
    
    // Apply sorting
    return filtered.sort((a, b) => {
      if (a[sortConfig.key] < b[sortConfig.key]) {
        return sortConfig.direction === 'asc' ? -1 : 1;
      }
      if (a[sortConfig.key] > b[sortConfig.key]) {
        return sortConfig.direction === 'asc' ? 1 : -1;
      }
      return 0;
    });
  }, [reportData, filter, companyFilter, technicianFilter, sortConfig]);

  const getProfitLossClass = (amount) => {
    if (amount > 0) return 'text-green-600 font-bold';
    if (amount < 0) return 'text-red-600 font-bold';
    return 'text-slate-600';
  };

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

  if (loading) {
    return (
      <DashboardLayout user={user} onLogout={onLogout}>
        <div className="flex items-center justify-center h-full">Loading reports...</div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout user={user} onLogout={onLogout}>
      <div className="space-y-6">
        <div>
          <h1 className="text-4xl font-bold text-slate-800" style={{fontFamily: 'Space Grotesk'}}>SuperAdmin Reports</h1>
          <p className="text-slate-600 mt-2">View all work orders and their profit/loss across all companies</p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="p-6 bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-blue-700 font-medium">Total Work Orders</p>
                <p className="text-3xl font-bold text-blue-900 mt-2">{reportData.length}</p>
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
                <p className="text-sm text-green-700 font-medium">Total Revenue</p>
                <p className="text-3xl font-bold text-green-900 mt-2">
                  AED {reportData.reduce((sum, item) => sum + (item.total_revenue || 0), 0).toFixed(2)}
                </p>
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
                <p className="text-sm text-amber-700 font-medium">Total Expenses</p>
                <p className="text-3xl font-bold text-amber-900 mt-2">
                  AED {reportData.reduce((sum, item) => sum + (item.total_expenses || 0), 0).toFixed(2)}
                </p>
              </div>
              <div className="w-12 h-12 bg-amber-500 rounded-xl flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </Card>

          <Card className="p-6 bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-purple-700 font-medium">Net Profit/Loss</p>
                <p className="text-3xl font-bold text-purple-900 mt-2">
                  AED {reportData.reduce((sum, item) => sum + (item.profit_loss || 0), 0).toFixed(2)}
                </p>
              </div>
              <div className="w-12 h-12 bg-purple-500 rounded-xl flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
            </div>
          </Card>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-4">
          <div className="flex items-center space-x-2">
            <span className="text-sm font-medium text-slate-700">Filter:</span>
            <button
              onClick={() => setFilter('all')}
              className={`px-3 py-1 rounded-full text-sm font-medium ${
                filter === 'all' 
                  ? 'bg-blue-500 text-white' 
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              All Work Orders
            </button>
            <button
              onClick={() => setFilter('profitable')}
              className={`px-3 py-1 rounded-full text-sm font-medium ${
                filter === 'profitable' 
                  ? 'bg-green-500 text-white' 
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              Profitable
            </button>
            <button
              onClick={() => setFilter('loss')}
              className={`px-3 py-1 rounded-full text-sm font-medium ${
                filter === 'loss' 
                  ? 'bg-red-500 text-white' 
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              Loss
            </button>
          </div>
          
          {companies.length > 0 && (
            <div className="flex items-center space-x-2">
              <span className="text-sm font-medium text-slate-700">Company:</span>
              <select 
                value={companyFilter}
                onChange={(e) => setCompanyFilter(e.target.value)}
                className="border border-slate-300 rounded-lg px-3 py-1 text-sm"
              >
                <option value="all">All Companies</option>
                {companies.map(company => (
                  <option key={company} value={company}>{company}</option>
                ))}
              </select>
            </div>
          )}
          
          {technicians.length > 0 && (
            <div className="flex items-center space-x-2">
              <span className="text-sm font-medium text-slate-700">Technician:</span>
              <select 
                value={technicianFilter}
                onChange={(e) => setTechnicianFilter(e.target.value)}
                className="border border-slate-300 rounded-lg px-3 py-1 text-sm"
              >
                <option value="all">All Technicians</option>
                {technicians.map(technician => (
                  <option key={technician} value={technician}>{technician}</option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Reports Table */}
        <Card className="p-6">
          <h2 className="text-xl font-bold text-slate-800 mb-4" style={{fontFamily: 'Space Grotesk'}}>Work Order Profit/Loss Details</h2>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead 
                    className="cursor-pointer hover:bg-slate-50"
                    onClick={() => handleSort('order_number')}
                  >
                    Order # {sortConfig.key === 'order_number' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                  </TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-slate-50"
                    onClick={() => handleSort('title')}
                  >
                    Title {sortConfig.key === 'title' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                  </TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-slate-50"
                    onClick={() => handleSort('company_name')}
                  >
                    Company {sortConfig.key === 'company_name' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                  </TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-slate-50"
                    onClick={() => handleSort('status')}
                  >
                    Status {sortConfig.key === 'status' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                  </TableHead>
                  <TableHead 
                    className="text-right cursor-pointer hover:bg-slate-50"
                    onClick={() => handleSort('quoted_price')}
                  >
                    Quoted Price {sortConfig.key === 'quoted_price' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                  </TableHead>
                  <TableHead 
                    className="text-right cursor-pointer hover:bg-slate-50"
                    onClick={() => handleSort('total_expenses')}
                  >
                    Expenses {sortConfig.key === 'total_expenses' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                  </TableHead>
                  <TableHead 
                    className="text-right cursor-pointer hover:bg-slate-50"
                    onClick={() => handleSort('total_revenue')}
                  >
                    Revenue {sortConfig.key === 'total_revenue' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                  </TableHead>
                  <TableHead 
                    className="text-right cursor-pointer hover:bg-slate-50"
                    onClick={() => handleSort('profit_loss')}
                  >
                    Profit/Loss {sortConfig.key === 'profit_loss' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedData && sortedData.length > 0 ? (
                  sortedData.map((item) => (
                    <TableRow key={item.work_order_id} className="hover:bg-slate-50">
                      <TableCell className="font-medium">{item.order_number}</TableCell>
                      <TableCell>{item.title}</TableCell>
                      <TableCell>{item.company_name}</TableCell>
                      <TableCell>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusClass(item.status)}`}>
                          {item.status}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">AED {item.quoted_price?.toFixed(2) || '0.00'}</TableCell>
                      <TableCell className="text-right">AED {item.total_expenses?.toFixed(2) || '0.00'}</TableCell>
                      <TableCell className="text-right">AED {item.total_revenue?.toFixed(2) || '0.00'}</TableCell>
                      <TableCell className={`text-right ${getProfitLossClass(item.profit_loss)}`}>
                        AED {item.profit_loss?.toFixed(2) || '0.00'}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan="8" className="text-center py-8 text-slate-500">
                      No report data available
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default SuperAdminReportsPage;