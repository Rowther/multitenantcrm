import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API } from '../App';
import DashboardLayout from '../components/DashboardLayout';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Plus } from 'lucide-react';
import ClientsList from '../components/ClientsList';
import ClientModal from '../components/ClientModal';
import { toast } from 'sonner';

const ClientsPage = ({ user, onLogout }) => {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedClient, setSelectedClient] = useState(null);

  useEffect(() => {
    fetchClients();
  }, []);

  const fetchClients = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API}/companies/${user.company_id}/clients`);
      setClients(response.data);
    } catch (error) {
      toast.error('Failed to fetch clients');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (client) => {
    setSelectedClient(client);
    setShowModal(true);
  };

  const handleDelete = async (clientId) => {
    if (window.confirm('Are you sure you want to delete this client? This action cannot be undone.')) {
      try {
        await axios.delete(`${API}/companies/${user.company_id}/clients/${clientId}`);
        fetchClients();
        toast.success('Client deleted successfully');
      } catch (error) {
        toast.error(error.response?.data?.detail || 'Failed to delete client');
      }
    }
  };

  const handleSuccess = (clientData) => {
    setShowModal(false);
    setSelectedClient(null);
    fetchClients();
    // Show success message with client name if available
    if (clientData && clientData.name) {
      toast.success(`Client ${selectedClient ? 'updated' : 'created'} successfully: ${clientData.name}`);
    }
  };

  if (loading) {
    return (
      <DashboardLayout user={user} onLogout={onLogout}>
        <div className="flex items-center justify-center h-screen">Loading...</div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout user={user} onLogout={onLogout}>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-4xl font-bold text-slate-800" style={{fontFamily: 'Space Grotesk'}}>Clients</h1>
          <Button 
            onClick={() => setShowModal(true)} 
            className="bg-gradient-to-r from-blue-500 to-indigo-600"
          >
            <Plus className="w-4 h-4 mr-2" /> Add Client
          </Button>
        </div>

        <Card className="p-6">
          <ClientsList 
            clients={clients} 
            onEdit={handleEdit}
            onDelete={handleDelete}
            companyId={user.company_id}
          />
        </Card>

        {showModal && (
          <ClientModal
            companyId={user.company_id}
            client={selectedClient}
            onClose={() => {
              setShowModal(false);
              setSelectedClient(null);
            }}
            onSuccess={handleSuccess}
          />
        )}
      </div>
    </DashboardLayout>
  );
};

export default ClientsPage;