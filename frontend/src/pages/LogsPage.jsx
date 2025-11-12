import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API } from '../App';
import DashboardLayout from '../components/DashboardLayout';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Calendar, User, FileText, Users, Briefcase, MessageCircle, Search, Filter } from 'lucide-react';
import { format } from 'date-fns';

const LogsPage = ({ user, onLogout }) => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState([]);
  const [filters, setFilters] = useState({
    searchTerm: '',
    startDate: '',
    endDate: '',
    userId: 'all',
    action: 'all',
    resourceType: 'all'
  });

  useEffect(() => {
    fetchLogs();
    fetchUsers();
  }, []);

  // Apply filters automatically when they change (except for search term)
  useEffect(() => {
    // Don't auto-fetch for search term changes to avoid too many API calls
    if (filters.startDate || filters.endDate || filters.userId !== 'all' || filters.action !== 'all' || filters.resourceType !== 'all') {
      const timer = setTimeout(() => {
        fetchLogs();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [filters.startDate, filters.endDate, filters.userId, filters.action, filters.resourceType]);

  const fetchUsers = async () => {
    try {
      const response = await axios.get(`${API}/users`);
      setUsers(response.data);
    } catch (error) {
      console.error('Failed to fetch users:', error);
    }
  };

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const params = {};
      
      // Format dates properly for the backend
      if (filters.startDate) {
        // Convert to ISO format
        const startDate = new Date(filters.startDate);
        params.start_date = startDate.toISOString();
      }
      if (filters.endDate) {
        // Convert to ISO format and set to end of day
        const endDate = new Date(filters.endDate);
        endDate.setHours(23, 59, 59, 999);
        params.end_date = endDate.toISOString();
      }
      if (filters.userId !== 'all') params.user_id = filters.userId;
      if (filters.action !== 'all') params.action = filters.action;
      if (filters.resourceType !== 'all') params.resource_type = filters.resourceType;
      
      const response = await axios.get(`${API}/superadmin/logs`, { params });
      setLogs(response.data.logs);
    } catch (error) {
      console.error('Failed to fetch logs:', error);
      // Show error to user
      alert('Failed to fetch logs: ' + (error.response?.data?.detail || error.message));
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
  };

  // Debounced filter change for search term
  const handleSearchChange = (value) => {
    setFilters(prev => ({
      ...prev,
      searchTerm: value
    }));
  };

  // Handle search input with debounce
  const handleSearchInput = (e) => {
    const value = e.target.value;
    clearTimeout(window.searchTimeout);
    window.searchTimeout = setTimeout(() => {
      handleSearchChange(value);
    }, 300);
  };

  const handleApplyFilters = () => {
    // The useEffect will automatically call fetchLogs when filters change
    // This function is kept for the button click but doesn't need to do anything
  };

  const handleClearFilters = () => {
    setFilters({
      searchTerm: '',
      startDate: '',
      endDate: '',
      userId: 'all',
      action: 'all',
      resourceType: 'all'
    });
  };

  const getActionIcon = (action) => {
    switch (action) {
      case 'CREATE_WORK_ORDER':
        return <FileText className="w-4 h-4" />;
      case 'CREATE_CLIENT':
        return <Users className="w-4 h-4" />;
      case 'CREATE_EMPLOYEE':
        return <Briefcase className="w-4 h-4" />;
      case 'ADD_COMMENT':
        return <MessageCircle className="w-4 h-4" />;
      default:
        return <User className="w-4 h-4" />;
    }
  };

  const getActionColor = (action) => {
    switch (action) {
      case 'CREATE_WORK_ORDER':
        return 'bg-blue-100 text-blue-800';
      case 'CREATE_CLIENT':
        return 'bg-green-100 text-green-800';
      case 'CREATE_EMPLOYEE':
        return 'bg-purple-100 text-purple-800';
      case 'ADD_COMMENT':
        return 'bg-amber-100 text-amber-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getActionLabel = (action) => {
    switch (action) {
      case 'CREATE_WORK_ORDER':
        return 'Created Work Order';
      case 'CREATE_CLIENT':
        return 'Created Client';
      case 'CREATE_EMPLOYEE':
        return 'Created Employee';
      case 'ADD_COMMENT':
        return 'Added Comment';
      default:
        return action;
    }
  };

  const filteredLogs = logs.filter(log => {
    if (filters.searchTerm) {
      const term = filters.searchTerm.toLowerCase();
      return (
        log.details.title?.toLowerCase().includes(term) ||
        log.details.name?.toLowerCase().includes(term) ||
        log.details.employee_name?.toLowerCase().includes(term) ||
        log.details.work_order_title?.toLowerCase().includes(term) ||
        log.details.comment_preview?.toLowerCase().includes(term) ||
        log.user_name?.toLowerCase().includes(term) ||
        log.resource_type.toLowerCase().includes(term)
      );
    }
    
    return true;
  });

  if (loading) {
    return (
      <DashboardLayout user={user} onLogout={onLogout}>
        <div className="flex items-center justify-center h-64">
          <div className="text-lg text-slate-600">Loading logs...</div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout user={user} onLogout={onLogout}>
      <div className="p-6 space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold text-slate-800">Activity Logs</h1>
          <Button onClick={fetchLogs} variant="outline">
            Refresh
          </Button>
        </div>

        <Card className="p-6">
          {/* Filters Section */}
          <div className="mb-6 p-4 bg-slate-50 rounded-lg">
            <div className="flex items-center gap-2 mb-4">
              <Filter className="w-5 h-5 text-slate-600" />
              <h3 className="font-medium text-slate-800">Filters</h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Search</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                  <input
                    type="text"
                    placeholder="Search logs..."
                    className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    value={filters.searchTerm}
                    onChange={handleSearchInput}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        clearTimeout(window.searchTimeout);
                        handleSearchChange(e.target.value);
                        fetchLogs();
                      }
                    }}
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Start Date</label>
                <input
                  type="date"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  value={filters.startDate}
                  onChange={(e) => handleFilterChange('startDate', e.target.value)}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">End Date</label>
                <input
                  type="date"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  value={filters.endDate}
                  onChange={(e) => handleFilterChange('endDate', e.target.value)}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">User</label>
                <select
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  value={filters.userId}
                  onChange={(e) => handleFilterChange('userId', e.target.value)}
                >
                  <option value="all">All Users</option>
                  {users.map(user => (
                    <option key={user.id} value={user.id}>{user.display_name || user.email}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Action</label>
                <select
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  value={filters.action}
                  onChange={(e) => handleFilterChange('action', e.target.value)}
                >
                  <option value="all">All Actions</option>
                  <option value="CREATE_WORK_ORDER">Create Work Order</option>
                  <option value="CREATE_CLIENT">Create Client</option>
                  <option value="CREATE_EMPLOYEE">Create Employee</option>
                  <option value="ADD_COMMENT">Add Comment</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Resource Type</label>
                <select
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  value={filters.resourceType}
                  onChange={(e) => handleFilterChange('resourceType', e.target.value)}
                >
                  <option value="all">All Resources</option>
                  <option value="WorkOrder">Work Order</option>
                  <option value="Client">Client</option>
                  <option value="Employee">Employee</option>
                  <option value="Comment">Comment</option>
                </select>
              </div>
            </div>
            
            <div className="flex gap-2 mt-4">
              <Button onClick={handleApplyFilters}>
                Apply Filters
              </Button>
              <Button variant="outline" onClick={handleClearFilters}>
                Clear Filters
              </Button>
            </div>
          </div>

          {/* Results Section */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Timestamp</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">User</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Action</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Resource</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Details</th>
                </tr>
              </thead>
              <tbody>
                {filteredLogs.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="text-center py-8 text-slate-500">
                      No logs found
                    </td>
                  </tr>
                ) : (
                  filteredLogs.map((log) => (
                    <tr key={log.id} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-slate-500" />
                          <span className="text-slate-700">
                            {format(new Date(log.timestamp), 'MMM dd, yyyy HH:mm')}
                          </span>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4 text-slate-500" />
                          <span className="font-medium">{log.user_name}</span>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-2">
                          <div className={`p-2 rounded-full ${getActionColor(log.action)}`}>
                            {getActionIcon(log.action)}
                          </div>
                          <span className="font-medium">{getActionLabel(log.action)}</span>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <div>
                          <div className="font-medium text-slate-800">{log.resource_type}</div>
                          <div className="text-sm text-slate-500">{log.resource_id}</div>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <div className="text-sm">
                          {log.details.title && (
                            <div className="font-medium">{log.details.title}</div>
                          )}
                          {log.details.name && (
                            <div className="font-medium">{log.details.name}</div>
                          )}
                          {log.details.employee_name && (
                            <div className="font-medium">{log.details.employee_name}</div>
                          )}
                          {log.details.work_order_title && (
                            <div className="font-medium">{log.details.work_order_title}</div>
                          )}
                          {log.details.comment_preview && (
                            <div className="text-slate-600 italic">"{log.details.comment_preview}"</div>
                          )}
                          {log.details.company_id && (
                            <div className="text-slate-500">Company: {log.details.company_id}</div>
                          )}
                          {log.details.status && (
                            <div className="text-slate-500">Status: {log.details.status}</div>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default LogsPage;