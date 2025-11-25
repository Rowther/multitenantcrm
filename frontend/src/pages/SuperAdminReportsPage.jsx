import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { API } from '../App';
import DashboardLayout from '../components/DashboardLayout';
import { Card } from '../components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Button } from '../components/ui/button';
import { Download, Calendar, ChevronLeft, ChevronRight } from 'lucide-react';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const SuperAdminReportsPage = ({ user, onLogout }) => {
  const [reportData, setReportData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [sortConfig, setSortConfig] = useState({ key: 'created_at', direction: 'desc' });
  const [companyFilter, setCompanyFilter] = useState('all');
  const [companies, setCompanies] = useState([]);
  const [timelineFilter, setTimelineFilter] = useState('all');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(20);
  const [totalRecords, setTotalRecords] = useState(0);

  useEffect(() => {
    fetchReportData();
  }, [timelineFilter, customStartDate, customEndDate, currentPage]);

  const fetchReportData = async () => {
    try {
      setLoading(true);
      const params = {
        skip: (currentPage - 1) * pageSize,
        limit: pageSize
      };
      const now = new Date();

      if (timelineFilter === 'week') {
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        params.from_date = weekAgo.toISOString().split('T')[0];
        params.to_date = now.toISOString().split('T')[0];
      } else if (timelineFilter === 'month') {
        const monthAgo = new Date();
        monthAgo.setMonth(monthAgo.getMonth() - 1);
        params.from_date = monthAgo.toISOString().split('T')[0];
        params.to_date = now.toISOString().split('T')[0];
      } else if (timelineFilter === 'custom' && customStartDate && customEndDate) {
        params.from_date = customStartDate;
        params.to_date = customEndDate;
      }

      const response = await axios.get(`${API}/superadmin/reports/all-workorders-profit`, { params });
      const data = response.data.details || [];
      setReportData(data);
      setTotalRecords(response.data.total || data.length);

      const uniqueCompanies = [...new Set(data.map(item => item.company_name))];
      setCompanies(uniqueCompanies);
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

    if (filter === 'profitable') {
      filtered = filtered.filter(item => item.profit_loss > 0);
    } else if (filter === 'loss') {
      filtered = filtered.filter(item => item.profit_loss < 0);
    }

    if (companyFilter !== 'all') {
      filtered = filtered.filter(item => item.company_name === companyFilter);
    }

    return filtered.sort((a, b) => {
      if (a[sortConfig.key] < b[sortConfig.key]) {
        return sortConfig.direction === 'asc' ? -1 : 1;
      }
      if (a[sortConfig.key] > b[sortConfig.key]) {
        return sortConfig.direction === 'asc' ? 1 : -1;
      }
      return 0;
    });
  }, [reportData, filter, companyFilter, sortConfig]);

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

  const exportToExcel = () => {
    const ws = XLSX.utils.json_to_sheet(sortedData.map(item => ({
      'Order Number': item.order_number,
      'Title': item.title,
      'Company': item.company_name,
      'Status': item.status,
      'Quoted Price': item.quoted_price,
      'Total Expenses': item.total_expenses,
      'Total Revenue': item.total_revenue,
      'Profit/Loss': item.profit_loss
    })));

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'SuperAdmin Reports');
    XLSX.writeFile(wb, 'superadmin-work-order-reports.xlsx');
    toast.success('Report exported to Excel successfully');
  };

  const exportToPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text('SuperAdmin Work Order Reports', 14, 20);
    doc.setFontSize(12);
    doc.text(`Export Date: ${new Date().toLocaleDateString()}`, 14, 30);

    const tableData = sortedData.map(item => [
      item.order_number,
      item.title,
      item.company_name,
      item.status,
      `AED ${item.quoted_price?.toFixed(2) || '0.00'}`,
      `AED ${item.total_expenses?.toFixed(2) || '0.00'}`,
      `AED ${item.total_revenue?.toFixed(2) || '0.00'}`,
      `AED ${item.profit_loss?.toFixed(2) || '0.00'}`
    ]);

    autoTable(doc, {
      head: [['Order #', 'Title', 'Company', 'Status', 'Quoted Price', 'Expenses', 'Revenue', 'Profit/Loss']],
      body: tableData,
      startY: 40,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [59, 130, 246] },
      alternateRowStyles: { fillColor: [245, 245, 245] }
    });

    doc.save('superadmin-work-order-reports.pdf');
    toast.success('Report exported to PDF successfully');
  };

  const totalPages = Math.ceil(totalRecords / pageSize);

  if (loading) {
    return (
      <DashboardLayout user={user} onLogout={onLogout}>
        <div className="flex items-center justify-center h-full">
          <div className="text-lg text-slate-600">Loading reports...</div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout user={user} onLogout={onLogout}>
      <div className="space-y-6">
        {/* Header Section - Mobile Responsive */}
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
          <div>
            <h1 className="text-3xl sm:text-4xl font-bold text-slate-800" style={{ fontFamily: 'Space Grotesk' }}>SuperAdmin Reports</h1>
            <p className="text-slate-600 mt-2">View all work orders and their profit/loss across all companies</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <Button onClick={exportToExcel} variant="outline" size="sm" className="w-full sm:w-auto">
              <Download className="w-4 h-4 mr-2" />
              Export XLS
            </Button>
            <Button onClick={exportToPDF} variant="outline" size="sm" className="w-full sm:w-auto">
              <Download className="w-4 h-4 mr-2" />
              Export PDF
            </Button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          <Card className="p-4 sm:p-6 bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm text-blue-700 font-medium">Total Work Orders</p>
                <p className="text-2xl sm:text-3xl font-bold text-blue-900 mt-2">{totalRecords}</p>
              </div>
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-blue-500 rounded-xl flex items-center justify-center">
                <svg className="w-5 h-5 sm:w-6 sm:h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
            </div>
          </Card>

          <Card className="p-4 sm:p-6 bg-gradient-to-br from-green-50 to-green-100 border-green-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm text-green-700 font-medium">Total Revenue</p>
                <p className="text-xl sm:text-3xl font-bold text-green-900 mt-2">
                  AED {reportData.reduce((sum, item) => sum + (item.total_revenue || 0), 0).toFixed(2)}
                </p>
              </div>
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-green-500 rounded-xl flex items-center justify-center">
                <svg className="w-5 h-5 sm:w-6 sm:h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </Card>

          <Card className="p-4 sm:p-6 bg-gradient-to-br from-amber-50 to-amber-100 border-amber-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm text-amber-700 font-medium">Total Expenses</p>
                <p className="text-xl sm:text-3xl font-bold text-amber-900 mt-2">
                  AED {reportData.reduce((sum, item) => sum + (item.total_expenses || 0), 0).toFixed(2)}
                </p>
              </div>
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-amber-500 rounded-xl flex items-center justify-center">
                <svg className="w-5 h-5 sm:w-6 sm:h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </Card>

          <Card className="p-4 sm:p-6 bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm text-purple-700 font-medium">Net Profit/Loss</p>
                <p className="text-xl sm:text-3xl font-bold text-purple-900 mt-2">
                  AED {reportData.reduce((sum, item) => sum + (item.profit_loss || 0), 0).toFixed(2)}
                </p>
              </div>
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-purple-500 rounded-xl flex items-center justify-center">
                <svg className="w-5 h-5 sm:w-6 sm:h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
            </div>
          </Card>
        </div>

        {/* Filters - Mobile Responsive */}
        <div className="flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 flex-wrap">
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 w-full sm:w-auto">
              <span className="text-sm font-medium text-slate-700">Filter:</span>
              <div className="flex gap-2">
                <button
                  onClick={() => setFilter('all')}
                  className={`flex-1 sm:flex-none px-3 py-2 rounded-full text-sm font-medium ${filter === 'all'
                    ? 'bg-blue-500 text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                >
                  All
                </button>
                <button
                  onClick={() => setFilter('profitable')}
                  className={`flex-1 sm:flex-none px-3 py-2 rounded-full text-sm font-medium ${filter === 'profitable'
                    ? 'bg-green-500 text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                >
                  Profitable
                </button>
                <button
                  onClick={() => setFilter('loss')}
                  className={`flex-1 sm:flex-none px-3 py-2 rounded-full text-sm font-medium ${filter === 'loss'
                    ? 'bg-red-500 text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                >
                  Loss
                </button>
              </div>
            </div>

            {companies.length > 0 && (
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 w-full sm:w-auto">
                <span className="text-sm font-medium text-slate-700">Company:</span>
                <select
                  value={companyFilter}
                  onChange={(e) => setCompanyFilter(e.target.value)}
                  className="border border-slate-300 rounded-lg px-3 py-2 text-sm w-full sm:w-auto"
                >
                  <option value="all">All Companies</option>
                  {companies.map(company => (
                    <option key={company} value={company}>{company}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-slate-500" />
              <span className="text-sm font-medium text-slate-700">Timeline:</span>
            </div>
            <select
              value={timelineFilter}
              onChange={(e) => setTimelineFilter(e.target.value)}
              className="border border-slate-300 rounded-lg px-3 py-2 text-sm w-full sm:w-auto"
            >
              <option value="all">All Time</option>
              <option value="week">Past Week</option>
              <option value="month">Past Month</option>
              <option value="custom">Custom Range</option>
            </select>

            {timelineFilter === 'custom' && (
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 w-full sm:w-auto">
                <input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  className="border border-slate-300 rounded-lg px-3 py-2 text-sm w-full sm:w-auto"
                />
                <span className="text-sm text-slate-500 hidden sm:inline">to</span>
                <input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  className="border border-slate-300 rounded-lg px-3 py-2 text-sm w-full sm:w-auto"
                />
              </div>
            )}
          </div>
        </div>

        {/* Reports Table (Desktop) and Cards (Mobile) */}
        <div className="space-y-4">
          <h2 className="text-lg sm:text-xl font-bold text-slate-800" style={{ fontFamily: 'Space Grotesk' }}>Work Order Profit/Loss Details</h2>

          {sortedData.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-lg border border-slate-200 text-slate-500">
              No matching records found
            </div>
          ) : (
            <>
              {/* Desktop Table View */}
              <div className="hidden md:block bg-white rounded-lg shadow border border-slate-200 overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="cursor-pointer" onClick={() => handleSort('order_number')}>Order #</TableHead>
                      <TableHead>Title</TableHead>
                      <TableHead>Company</TableHead>
                      <TableHead>Client</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Revenue</TableHead>
                      <TableHead className="text-right">Expenses</TableHead>
                      <TableHead className="text-right cursor-pointer" onClick={() => handleSort('profit_loss')}>Profit/Loss</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sortedData.map((item) => (
                      <TableRow key={item.work_order_id}>
                        <TableCell className="font-medium">{item.order_number}</TableCell>
                        <TableCell className="max-w-xs truncate">{item.title}</TableCell>
                        <TableCell>{item.company_name}</TableCell>
                        <TableCell>{item.client_name}</TableCell>
                        <TableCell>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusClass(item.status)}`}>
                            {item.status}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">AED {item.total_revenue.toFixed(2)}</TableCell>
                        <TableCell className="text-right text-red-600">AED {item.total_expenses.toFixed(2)}</TableCell>
                        <TableCell className={`text-right ${getProfitLossClass(item.profit_loss)}`}>
                          AED {item.profit_loss.toFixed(2)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Mobile Card View */}
              <div className="md:hidden grid gap-4">
                {sortedData.map((item) => (
                  <Card key={item.work_order_id} className="p-4 hover:shadow-md transition-shadow duration-200 border-slate-200">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-800">{item.order_number}</span>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${getStatusClass(item.status)}`}>
                            {item.status}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 mt-1">{new Date(item.created_at || new Date()).toLocaleDateString()}</p>
                      </div>
                      <div className={`text-lg font-bold ${getProfitLossClass(item.profit_loss)}`}>
                        {item.profit_loss >= 0 ? '+' : ''}{item.profit_loss.toFixed(0)}
                      </div>
                    </div>

                    <div className="mb-4 min-h-[3rem]">
                      <p className="font-medium text-slate-800 text-sm line-clamp-2" title={item.title}>{item.title}</p>
                      <div className="text-xs text-slate-500 mt-1 truncate">
                        <span className="font-medium text-slate-700">{item.company_name}</span>
                        <span className="mx-1">•</span>
                        {item.client_name}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-sm border-t border-slate-100 pt-3 bg-slate-50 -mx-4 -mb-4 p-4 rounded-b-lg">
                      <div>
                        <span className="text-slate-500 text-xs block">Revenue</span>
                        <span className="font-semibold text-slate-700">AED {item.total_revenue.toFixed(0)}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-slate-500 text-xs block">Expenses</span>
                        <span className="font-semibold text-red-600">AED {item.total_expenses.toFixed(0)}</span>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>

              {/* Pagination Controls */}
              {totalPages > 1 && (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4">
                  <div className="text-sm text-slate-600">
                    Showing {(currentPage - 1) * pageSize + 1} to {Math.min(currentPage * pageSize, totalRecords)} of {totalRecords} records
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      variant="outline"
                      size="sm"
                      className="w-auto"
                    >
                      <ChevronLeft className="w-4 h-4" />
                      Previous
                    </Button>
                    <div className="flex items-center gap-1">
                      {[...Array(Math.min(5, totalPages))].map((_, i) => {
                        let pageNum;
                        if (totalPages <= 5) {
                          pageNum = i + 1;
                        } else if (currentPage <= 3) {
                          pageNum = i + 1;
                        } else if (currentPage >= totalPages - 2) {
                          pageNum = totalPages - 4 + i;
                        } else {
                          pageNum = currentPage - 2 + i;
                        }
                        return (
                          <button
                            key={i}
                            onClick={() => setCurrentPage(pageNum)}
                            className={`w-8 h-8 rounded ${currentPage === pageNum
                              ? 'bg-blue-500 text-white'
                              : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                              }`}
                          >
                            {pageNum}
                          </button>
                        );
                      })}
                    </div>
                    <Button
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                      variant="outline"
                      size="sm"
                      className="w-auto"
                    >
                      Next
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default SuperAdminReportsPage;