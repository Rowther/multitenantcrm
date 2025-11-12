import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { API } from '../App';
import DashboardLayout from '../components/DashboardLayout';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Plus, Calendar, Clock, CheckCircle } from 'lucide-react';
import PreventiveTaskModal from '../components/PreventiveTaskModal';
import PreventiveTasksList from '../components/PreventiveTasksList';

const PreventiveMaintenancePage = ({ user, onLogout }) => {
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [company, setCompany] = useState(null);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [companyRes, statsRes] = await Promise.all([
        axios.get(`${API}/companies/${user.company_id}`),
        axios.get(`${API}/companies/${user.company_id}/reports/overview`)
      ]);
      setCompany(companyRes.data);
      setStats(statsRes.data);
    } catch (error) {
      toast.error('Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  const handleTaskCreated = () => {
    setShowTaskModal(false);
    // Refresh data if needed
  };

  if (loading) {
    return (
      <DashboardLayout user={user} onLogout={onLogout}>
        <div className="flex items-center justify-center h-full">Loading...</div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout user={user} onLogout={onLogout}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-4xl font-bold text-slate-800" style={{fontFamily: 'Space Grotesk'}}>Preventive Maintenance</h1>
            <p className="text-slate-600 mt-2">Manage scheduled maintenance tasks for {company?.name}</p>
          </div>
          <Button onClick={() => setShowTaskModal(true)} className="bg-gradient-to-r from-blue-500 to-indigo-600">
            <Plus className="w-4 h-4 mr-2" /> Create Task
          </Button>
        </div>

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="p-6 bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-blue-700 font-medium">Active Tasks</p>
                  <p className="text-3xl font-bold text-blue-900 mt-2">
                    {stats.preventive_tasks?.active || 0}
                  </p>
                </div>
                <div className="w-12 h-12 bg-blue-500 rounded-xl flex items-center justify-center">
                  <Calendar className="w-6 h-6 text-white" />
                </div>
              </div>
            </Card>

            <Card className="p-6 bg-gradient-to-br from-amber-50 to-amber-100 border-amber-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-amber-700 font-medium">Due This Month</p>
                  <p className="text-3xl font-bold text-amber-900 mt-2">
                    {stats.preventive_tasks?.due_this_month || 0}
                  </p>
                </div>
                <div className="w-12 h-12 bg-amber-500 rounded-xl flex items-center justify-center">
                  <Clock className="w-6 h-6 text-white" />
                </div>
              </div>
            </Card>

            <Card className="p-6 bg-gradient-to-br from-green-50 to-green-100 border-green-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-green-700 font-medium">Completed This Month</p>
                  <p className="text-3xl font-bold text-green-900 mt-2">
                    {stats.preventive_tasks?.completed_this_month || 0}
                  </p>
                </div>
                <div className="w-12 h-12 bg-green-500 rounded-xl flex items-center justify-center">
                  <CheckCircle className="w-6 h-6 text-white" />
                </div>
              </div>
            </Card>
          </div>
        )}

        {/* Preventive Tasks List */}
        <Card className="p-6">
          <h2 className="text-xl font-bold text-slate-800 mb-4" style={{fontFamily: 'Space Grotesk'}}>Scheduled Tasks</h2>
          <PreventiveTasksList companyId={user.company_id} onRefresh={fetchData} />
        </Card>
      </div>

      {/* Modals */}
      {showTaskModal && (
        <PreventiveTaskModal
          companyId={user.company_id}
          onClose={() => setShowTaskModal(false)}
          onSuccess={handleTaskCreated}
        />
      )}
    </DashboardLayout>
  );
};

export default PreventiveMaintenancePage;