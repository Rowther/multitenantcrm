import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useParams, useNavigate } from 'react-router-dom';
import { API } from '../App';
import DashboardLayout from '../components/DashboardLayout';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Building2, Users, FileText, Calendar, Phone, Mail, MapPin } from 'lucide-react';
import WorkOrdersList from '../components/WorkOrdersList';
import WorkOrderFilters from '../components/WorkOrderFilters';
import { toast } from 'sonner';

const CompanyDetails = ({ user, onLogout }) => {
  const { companyId } = useParams();
  const navigate = useNavigate();
  const [company, setCompany] = useState(null);
  const [workOrders, setWorkOrders] = useState([]);
  const [filteredWorkOrders, setFilteredWorkOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [clients, setClients] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, pages: 1 });

  useEffect(() => {
    fetchData();
  }, [companyId]);

  const fetchData = async (page = 1) => {
    try {
      setLoading(true);
      
      // Fetch company details
      const companyResponse = await axios.get(`${API}/companies/${companyId}`);
      setCompany(companyResponse.data);
      
      // Fetch work orders for this company
      const workOrdersResponse = await axios.get(`${API}/companies/${companyId}/workorders`, {
        params: { page, limit: 10 }
      });
      
      // Handle both old and new API response formats
      if (workOrdersResponse.data.work_orders) {
        // New format with pagination
        setWorkOrders(workOrdersResponse.data.work_orders);
        setFilteredWorkOrders(workOrdersResponse.data.work_orders);
        setPagination(workOrdersResponse.data.pagination || { page: 1, limit: 10, total: workOrdersResponse.data.work_orders.length, pages: 1 });
      } else {
        // Old format without pagination
        setWorkOrders(workOrdersResponse.data);
        setFilteredWorkOrders(workOrdersResponse.data);
        setPagination({ page: 1, limit: 10, total: workOrdersResponse.data.length, pages: Math.ceil(workOrdersResponse.data.length / 10) });
      }
      
      // Fetch clients and employees for filters
      const [clientsResponse, employeesResponse] = await Promise.all([
        axios.get(`${API}/companies/${companyId}/clients`),
        axios.get(`${API}/companies/${companyId}/employees`)
      ]);
      
      setClients(clientsResponse.data);
      setEmployees(employeesResponse.data);
    } catch (error) {
      toast.error('Failed to fetch company data');
      console.error('Error fetching company data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = async (filters) => {
    try {
      const params = { page: 1, limit: 10 };
      
      if (filters.search) params.search = filters.search;
      if (filters.status && filters.status !== 'all') params.status = filters.status;
      if (filters.priority && filters.priority !== 'all') params.priority = filters.priority;
      if (filters.clientId && filters.clientId !== 'all') params.client_id = filters.clientId;
      if (filters.assignedTo && filters.assignedTo !== 'all') params.assigned_to = filters.assignedTo;
      
      const response = await axios.get(`${API}/companies/${companyId}/workorders`, { params });
      
      // Handle both old and new API response formats
      if (response.data.work_orders) {
        // New format with pagination
        setFilteredWorkOrders(response.data.work_orders);
      } else {
        // Old format without pagination
        setFilteredWorkOrders(response.data);
      }
    } catch (error) {
      toast.error('Failed to filter work orders');
    }
  };

  const handlePageChange = (newPage) => {
    fetchData(newPage);
  };

  const handleViewWorkOrder = (workOrder) => {
    navigate(`/companies/${companyId}/workorders/${workOrder.id}`);
  };

  if (loading) {
    return (
      <DashboardLayout user={user} onLogout={onLogout}>
        <div className="flex items-center justify-center h-screen">
          <div className="text-lg text-slate-600">Loading company details...</div>
        </div>
      </DashboardLayout>
    );
  }

  if (!company) {
    return (
      <DashboardLayout user={user} onLogout={onLogout}>
        <div className="flex items-center justify-center h-screen">
          <div className="text-lg text-slate-600">Company not found</div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout user={user} onLogout={onLogout}>
      <div className="space-y-6">
        {/* Company Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-4xl font-bold text-slate-800" style={{fontFamily: 'Space Grotesk'}}>{company.name}</h1>
            <p className="text-slate-600 mt-2">Company Details</p>
          </div>
          <Button onClick={() => navigate('/')} variant="outline">
            Back to Companies
          </Button>
        </div>

        {/* Company Info Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="p-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                <Building2 className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-slate-600">Industry</p>
                <p className="font-semibold text-slate-800">{company.industry}</p>
              </div>
            </div>
          </Card>
          
          <Card className="p-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                <Users className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-slate-600">Contact</p>
                <p className="font-semibold text-slate-800">{company.contact_person || 'N/A'}</p>
              </div>
            </div>
          </Card>
          
          <Card className="p-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center">
                <Mail className="w-6 h-6 text-amber-600" />
              </div>
              <div>
                <p className="text-sm text-slate-600">Email</p>
                <p className="font-semibold text-slate-800">{company.contact_email || 'N/A'}</p>
              </div>
            </div>
          </Card>
          
          <Card className="p-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                <Phone className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-slate-600">Phone</p>
                <p className="font-semibold text-slate-800">{company.contact_phone || 'N/A'}</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Work Orders Section */}
        <Card className="p-6">
          <h2 className="text-xl font-bold text-slate-800 mb-4" style={{fontFamily: 'Space Grotesk'}}>Work Orders</h2>
          
          <WorkOrderFilters 
            onFilterChange={handleFilterChange}
            companyId={companyId}
            clients={clients}
            employees={employees}
          />
          
          <WorkOrdersList 
            workOrders={filteredWorkOrders} 
            companyId={companyId} 
            onRefresh={() => fetchData(pagination.page)} 
            pagination={pagination}
            onPageChange={handlePageChange}
            onViewWorkOrder={handleViewWorkOrder}
          />
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default CompanyDetails;