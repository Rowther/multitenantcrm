import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { API } from '@/App';
import DashboardLayout from '@/components/DashboardLayout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FileText, DollarSign, Users, TrendingUp, Plus } from 'lucide-react';
import WorkOrderModal from '@/components/WorkOrderModal';
import ClientModal from '@/components/ClientModal';
import WorkOrdersList from '@/components/WorkOrdersList';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const AdminDashboard = ({ user, onLogout }) => {
  const [stats, setStats] = useState(null);
  const [workOrders, setWorkOrders] = useState([]);
  const [showWorkOrderModal, setShowWorkOrderModal] = useState(false);
  const [showClientModal, setShowClientModal] = useState(false);
  const [company, setCompany] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [statsRes, workOrdersRes, companyRes] = await Promise.all([
        axios.get(`${API}/companies/${user.company_id}/reports/overview`),
        axios.get(`${API}/companies/${user.company_id}/workorders`),
        axios.get(`${API}/companies/${user.company_id}`)
      ]);
      setStats(statsRes.data);
      setWorkOrders(workOrdersRes.data);
      setCompany(companyRes.data);
    } catch (error) {
      toast.error('Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  const handleWorkOrderCreated = () => {
    setShowWorkOrderModal(false);
    fetchData();
    toast.success('Work order created successfully');
  };

  if (loading) {
    return <div className="flex items-center justify-center h-screen">Loading...</div>;
  }

  return (
    <DashboardLayout user={user} onLogout={onLogout}>
      <div className="space-y-6" data-testid="admin-dashboard">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-4xl font-bold text-slate-800" style={{fontFamily: 'Space Grotesk'}}>{company?.name}</h1>
            <p className="text-slate-600 mt-2">Admin Dashboard - {company?.industry}</p>
          </div>
          <Button onClick={() => setShowWorkOrderModal(true)} className="bg-gradient-to-r from-blue-500 to-indigo-600" data-testid="create-workorder-button">
            <Plus className="w-4 h-4 mr-2" /> Create Work Order
          </Button>
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
                <p className="text-3xl font-bold text-green-900 mt-2">${stats?.total_revenue.toFixed(0) || 0}</p>
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
                <p className="text-3xl font-bold text-amber-900 mt-2">${stats?.profit_margin.toFixed(0) || 0}</p>
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

        {/* Status Breakdown */}
        {stats?.status_breakdown && (
          <Card className="p-6">
            <h2 className="text-xl font-bold text-slate-800 mb-4" style={{fontFamily: 'Space Grotesk'}}>Work Orders by Status</h2>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={Object.entries(stats.status_breakdown).map(([status, count]) => ({ status, count }))}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="status" stroke="#64748b" />
                <YAxis stroke="#64748b" />
                <Tooltip contentStyle={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px' }} />
                <Bar dataKey="count" fill="#3b82f6" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        )}

        {/* Work Orders Table */}
        <Card className="p-6">
          <h2 className="text-xl font-bold text-slate-800 mb-4" style={{fontFamily: 'Space Grotesk'}}>Recent Work Orders</h2>
          <WorkOrdersList workOrders={workOrders.slice(0, 10)} companyId={user.company_id} onRefresh={fetchData} />
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

export default AdminDashboard;
