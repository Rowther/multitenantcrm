import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API } from '../App';
import DashboardLayout from '../components/DashboardLayout';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Calendar, User, FileText, Users, Briefcase, MessageCircle, Search, Filter } from 'lucide-react';
import { format } from 'date-fns';

const LogsPage = ({ user, onLogout }) => {
  // Enable smooth zooming
  useEffect(() => {
    document.body.style.touchAction = 'manipulation';
    return () => {
      document.body.style.touchAction = '';
    };
  }, []);

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
      <div className="p-4 sm:p-6 space-y-6">
        {/* Header - Mobile Responsive */}
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-800">Activity Logs</h1>
          <Button onClick={fetchLogs} variant="outline" className="w-full sm:w-auto">
            Refresh
          </Button>
        </div>

        <Card className="p-4 sm:p-6">
          {/* Filters Section */}
          <div className="mb-6 p-4 bg-slate-50 rounded-lg">
            <div className="flex items-center gap-2 mb-4">
              <Filter className="w-5 h-5 text-slate-600" />
              <h3 className="font-medium text-slate-800">Filters</h3>
            </div>

            {/* Mobile Responsive Filter Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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

            {/* Filter Buttons - Mobile Responsive */}
            <div className="flex flex-col sm:flex-row gap-2 mt-4">
              <Button onClick={handleApplyFilters} className="w-full sm:w-auto">
                Apply Filters
              </Button>
              <Button variant="outline" onClick={handleClearFilters} className="w-full sm:w-auto">
                Clear Filters
              </Button>
            </div>
          </div>

          {/* Logs List */}
          <div className="space-y-4">
            {filteredLogs.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-lg border border-slate-200 text-slate-500">
                No logs found
              </div>
            ) : (
              <div className="grid gap-3 sm:gap-4">
                {filteredLogs.map((log) => (
                  <div key={log.id} className="bg-white p-3 sm:p-4 rounded-lg border border-slate-200 hover:shadow-sm transition-shadow">
                    <div className="flex flex-col gap-3 sm:gap-0 sm:flex-row sm:items-center sm:justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-full ${getActionColor(log.action)}`}>
                          {getActionIcon(log.action)}
                        </div>
                        <div>
                          <span className="font-semibold text-slate-800 block text-sm sm:text-base">{getActionLabel(log.action)}</span>
                          <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
                            <Calendar className="w-3 h-3" />
                            <span>{format(new Date(log.timestamp), 'MMM dd, yyyy HH:mm')}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="px-2.5 py-1 bg-slate-100 rounded-full text-xs font-medium text-slate-600 border border-slate-200">
                          {log.resource_type}
                        </span>
                      </div>
                    </div>

                    <div className="sm:pl-[3.25rem]">
                      <div className="text-sm mb-3">
                        <span className="text-slate-500">User: </span>
                        <span className="font-medium text-slate-700">{log.user_name}</span>
                      </div>

                      <div className="bg-slate-50 p-3 rounded-md border border-slate-100 text-sm">
                        {log.details.title && (
                          <div className="font-medium text-slate-900 mb-1">{log.details.title}</div>
                        )}
                        {log.details.name && (
                          <div className="font-medium text-slate-900 mb-1">{log.details.name}</div>
                        )}
                        {log.details.content && (
                          <div className="text-slate-600 italic mb-1">"{log.details.content}"</div>
                        )}
                        {log.details.comment_preview && (
                          <div className="text-slate-600 italic mb-1">"{log.details.comment_preview}"</div>
                        )}

                        <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs text-slate-500 border-t border-slate-200 pt-2">
                          {log.details.company_name && (
                            <span>Company: <span className="font-medium text-slate-700">{log.details.company_name}</span></span>
                          )}
                          {log.details.status && (
                            <span>Status: <span className="font-medium text-slate-700">{log.details.status}</span></span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default LogsPage;