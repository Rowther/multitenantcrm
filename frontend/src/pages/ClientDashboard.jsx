import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { API } from '@/App';
import DashboardLayout from '@/components/DashboardLayout';
import { Card } from '@/components/ui/card';
import { FileText, DollarSign } from 'lucide-react';
import WorkOrdersList from '@/components/WorkOrdersList';

const ClientDashboard = ({ user, onLogout }) => {
  const [workOrders, setWorkOrders] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [workOrdersRes, invoicesRes] = await Promise.all([
        axios.get(`${API}/companies/${user.company_id}/workorders`),
        axios.get(`${API}/companies/${user.company_id}/invoices`)
      ]);
      setWorkOrders(workOrdersRes.data);
      setInvoices(invoicesRes.data);
    } catch (error) {
      toast.error('Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-screen">Loading...</div>;
  }

  const totalSpent = invoices.filter(inv => inv.status === 'PAID').reduce((sum, inv) => sum + inv.total_amount, 0);

  return (
    <DashboardLayout user={user} onLogout={onLogout}>
      <div className="space-y-6" data-testid="client-dashboard">
        <div>
          <h1 className="text-4xl font-bold text-slate-800" style={{fontFamily: 'Space Grotesk'}}>My Account</h1>
          <p className="text-slate-600 mt-2">Client Dashboard</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="p-6 bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200" data-testid="my-orders-card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-blue-700 font-medium">My Work Orders</p>
                <p className="text-3xl font-bold text-blue-900 mt-2">{workOrders.length}</p>
              </div>
              <div className="w-12 h-12 bg-blue-500 rounded-xl flex items-center justify-center">
                <FileText className="w-6 h-6 text-white" />
              </div>
            </div>
          </Card>

          <Card className="p-6 bg-gradient-to-br from-green-50 to-green-100 border-green-200" data-testid="total-spent-card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-green-700 font-medium">Total Spent</p>
                <p className="text-3xl font-bold text-green-900 mt-2">${totalSpent.toFixed(2)}</p>
              </div>
              <div className="w-12 h-12 bg-green-500 rounded-xl flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-white" />
              </div>
            </div>
          </Card>

          <Card className="p-6 bg-gradient-to-br from-amber-50 to-amber-100 border-amber-200" data-testid="pending-invoices-card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-amber-700 font-medium">Pending Invoices</p>
                <p className="text-3xl font-bold text-amber-900 mt-2">{invoices.filter(inv => inv.status === 'ISSUED').length}</p>
              </div>
              <div className="w-12 h-12 bg-amber-500 rounded-xl flex items-center justify-center">
                <FileText className="w-6 h-6 text-white" />
              </div>
            </div>
          </Card>
        </div>

        {/* Work Orders */}
        <Card className="p-6">
          <h2 className="text-xl font-bold text-slate-800 mb-4" style={{fontFamily: 'Space Grotesk'}}>My Work Orders</h2>
          <WorkOrdersList workOrders={workOrders} companyId={user.company_id} onRefresh={fetchData} />
        </Card>

        {/* Invoices */}
        <Card className="p-6">
          <h2 className="text-xl font-bold text-slate-800 mb-4" style={{fontFamily: 'Space Grotesk'}}>My Invoices</h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Invoice #</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Date</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Amount</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Status</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((invoice) => (
                  <tr key={invoice.id} className="border-b border-slate-100 hover:bg-slate-50" data-testid={`invoice-row-${invoice.id}`}>
                    <td className="py-4 px-4 font-medium text-slate-800">{invoice.invoice_number}</td>
                    <td className="py-4 px-4 text-slate-700">{invoice.issued_date?.slice(0, 10)}</td>
                    <td className="py-4 px-4 text-slate-700">${invoice.total_amount.toFixed(2)}</td>
                    <td className="py-4 px-4">
                      <span className={`status-badge status-${invoice.status.toLowerCase()}`}>
                        {invoice.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default ClientDashboard;
