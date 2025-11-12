import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { API } from '../App';
import DashboardLayout from '../components/DashboardLayout';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Building2, Users, FileText, TrendingUp, Plus } from 'lucide-react';
import CompanyModal from '../components/CompanyModal';
import UserModal from '../components/UserModal';
import WorkOrderModal from '../components/WorkOrderModal';
import { ResponsiveContainer } from 'recharts';

const SuperAdminDashboard = ({ user, onLogout, onUpdateUser }) => {
  const navigate = useNavigate();
  const [companies, setCompanies] = useState([]);
  const [summary, setSummary] = useState(null);
  const [showCompanyModal, setShowCompanyModal] = useState(false);
  const [showUserModal, setShowUserModal] = useState(false);
  const [showWorkOrderModal, setShowWorkOrderModal] = useState(false);
  const [selectedCompanyId, setSelectedCompanyId] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [companiesRes, summaryRes] = await Promise.all([
        axios.get(`${API}/companies`),
        axios.get(`${API}/superadmin/reports/companies-summary`)
      ]);
      setCompanies(companiesRes.data);
      setSummary(summaryRes.data);
    } catch (error) {
      toast.error('Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  const handleCompanyCreated = () => {
    setShowCompanyModal(false);
    fetchData();
    toast.success('Company created successfully');
  };

  const handleUserCreated = () => {
    setShowUserModal(false);
    toast.success('User created successfully');
  };

  if (loading) {
    return <div className="flex items-center justify-center h-screen">Loading...</div>;
  }

  return (
    <DashboardLayout user={user} onLogout={onLogout} onUpdateUser={onUpdateUser}>
      <div className="space-y-6" data-testid="superadmin-dashboard">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-4xl font-bold text-slate-800" style={{fontFamily: 'Space Grotesk'}}>SuperAdmin Dashboard</h1>
            <p className="text-slate-600 mt-2">Manage all companies and users</p>
          </div>
          <div className="flex gap-3">
            <Button onClick={() => setShowUserModal(true)} variant="outline" data-testid="create-user-button">
              <Plus className="w-4 h-4 mr-2" /> Create User
            </Button>

          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="p-6 bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200" data-testid="total-companies-card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-blue-700 font-medium">Total Companies</p>
                <p className="text-3xl font-bold text-blue-900 mt-2">{companies.length}</p>
              </div>
              <div className="w-12 h-12 bg-blue-500 rounded-xl flex items-center justify-center">
                <Building2 className="w-6 h-6 text-white" />
              </div>
            </div>
          </Card>

          <Card className="p-6 bg-gradient-to-br from-green-50 to-green-100 border-green-200" data-testid="total-revenue-card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-green-700 font-medium">Total Revenue</p>
                <p className="text-3xl font-bold text-green-900 mt-2">
                  {(summary?.companies.reduce((sum, c) => sum + c.total_revenue, 0).toFixed(0) || 0)} AED
                </p>
              </div>
              <div className="w-12 h-12 bg-green-500 rounded-xl flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-white" />
              </div>
            </div>
          </Card>

          <Card className="p-6 bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200" data-testid="total-work-orders-card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-purple-700 font-medium">Total Work Orders</p>
                <p className="text-3xl font-bold text-purple-900 mt-2">
                  {summary?.companies.reduce((sum, c) => sum + c.total_work_orders, 0) || 0}
                </p>
              </div>
              <div className="w-12 h-12 bg-purple-500 rounded-xl flex items-center justify-center">
                <FileText className="w-6 h-6 text-white" />
              </div>
            </div>
          </Card>

          <Card className="p-6 bg-gradient-to-br from-amber-50 to-amber-100 border-amber-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-amber-700 font-medium">Active Users</p>
                <p className="text-3xl font-bold text-amber-900 mt-2">-</p>
              </div>
              <div className="w-12 h-12 bg-amber-500 rounded-xl flex items-center justify-center">
                <Users className="w-6 h-6 text-white" />
              </div>
            </div>
          </Card>
        </div>

        {/* Companies Overview */}
        <Card className="p-6">
          <h2 className="text-xl font-bold text-slate-800 mb-4" style={{fontFamily: 'Space Grotesk'}}>Companies Overview</h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Company</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Industry</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Work Orders</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Revenue</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Actions</th>
                </tr>
              </thead>
              <tbody>
                {companies.map((company) => {
                  const companyData = summary?.companies.find(c => c.company_id === company.id);
                  return (
                    <tr key={company.id} className="border-b border-slate-100 hover:bg-slate-50" data-testid={`company-row-${company.id}`}>
                      <td className="py-4 px-4">
                        <div>
                          <p className="font-semibold text-slate-800">{company.name}</p>
                          <p className="text-xs text-slate-500">{company.contact_email}</p>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
                          {company.industry}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-slate-700">{companyData?.total_work_orders || 0}</td>
                      <td className="py-4 px-4 text-slate-700">{(companyData?.total_revenue.toFixed(2) || '0.00')} AED</td>
                      <td className="py-4 px-4">
                        <div className="flex gap-2">
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => navigate(`/companies/${company.id}`)}
                          >
                            View Details
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => {
                              setSelectedCompanyId(company.id);
                              setShowWorkOrderModal(true);
                            }}
                          >
                            Create Work Order
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Bento Card for Revenue by Company */}
        {summary && summary.companies.length > 0 && (
          <Card className="p-6">
            <h2 className="text-xl font-bold text-slate-800 mb-4" style={{fontFamily: 'Space Grotesk'}}>Revenue by Company</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {summary.companies.map((companyData) => (
                <div key={companyData.company_id} className="bg-slate-50 rounded-lg p-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-semibold text-slate-800">{companyData.company_name}</h3>
                      <p className="text-sm text-slate-600">{companyData.industry}</p>
                    </div>
                    <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                      {(companyData.total_revenue?.toFixed(2) || '0.00')} AED
                    </span>
                  </div>
                  <div className="mt-3 flex justify-between items-center">
                    <span className="text-sm text-slate-600">Work Orders: {companyData.total_work_orders || 0}</span>
                    <span className="text-sm font-medium text-slate-800">
                      {companyData.total_revenue && companyData.total_work_orders 
                        ? `${(companyData.total_revenue / companyData.total_work_orders).toFixed(2)} AED/WO` 
                        : 'N/A'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>

      {/* Modals */}
      {showCompanyModal && (
        <CompanyModal
          onClose={() => setShowCompanyModal(false)}
          onSuccess={handleCompanyCreated}
        />
      )}
      {showUserModal && (
        <UserModal
          onClose={() => setShowUserModal(false)}
          onSuccess={handleUserCreated}
          companies={companies}
          isSuperAdmin={true}
        />
      )}
      {showWorkOrderModal && selectedCompanyId && (
        <WorkOrderModal
          companyId={selectedCompanyId}
          onClose={() => {
            setShowWorkOrderModal(false);
            setSelectedCompanyId(null);
          }}
          onSuccess={() => {
            setShowWorkOrderModal(false);
            setSelectedCompanyId(null);
            toast.success('Work order created successfully');
          }}
        />
      )}
    </DashboardLayout>
  );
};

export default SuperAdminDashboard;
