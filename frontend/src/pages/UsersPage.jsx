import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API } from '../App';
import DashboardLayout from '../components/DashboardLayout';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Plus, Edit, Trash2 } from 'lucide-react';
import UserModal from '../components/UserModal';
import EditUserModal from '../components/EditUserModal';
import { toast } from 'sonner';

const UsersPage = ({ user, onLogout }) => {
  const [users, setUsers] = useState([]);
  const [companies, setCompanies] = useState([]); // For SuperAdmins
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      if (user.role === 'SUPERADMIN') {
        // SuperAdmin can see all users and all companies
        const [usersRes, companiesRes] = await Promise.all([
          axios.get(`${API}/users`),
          axios.get(`${API}/companies`)
        ]);
        setUsers(usersRes.data);
        setCompanies(companiesRes.data);
        
        // Fetch clients for all companies
        const clientsData = [];
        for (const company of companiesRes.data) {
          try {
            const clientsRes = await axios.get(`${API}/companies/${company.id}/clients`);
            clientsData.push(...clientsRes.data);
          } catch (error) {
            console.error(`Failed to fetch clients for company ${company.id}:`, error);
          }
        }
        setClients(clientsData);
      } else if (user.role === 'ADMIN') {
        // Admin can only see users from their company
        const [usersRes, clientsRes] = await Promise.all([
          axios.get(`${API}/users`),
          axios.get(`${API}/companies/${user.company_id}/clients`)
        ]);
        setUsers(usersRes.data.filter(u => u.company_id === user.company_id));
        setClients(clientsRes.data);
      }
    } catch (error) {
      toast.error('Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUser = () => {
    setShowCreateModal(true);
  };

  const handleEditUser = (user) => {
    setSelectedUser(user);
    setShowEditModal(true);
  };

  const handleDeleteUser = async (userId) => {
    toast(
      <div className="flex flex-col gap-4">
        <p>Are you sure you want to delete this user?</p>
        <div className="flex gap-2">
          <Button 
            variant="destructive" 
            size="sm"
            onClick={async () => {
              try {
                await axios.delete(`${API}/users/${userId}`);
                fetchData();
                toast.success('User deleted successfully');
              } catch (error) {
                toast.error('Failed to delete user: ' + error.message);
              }
            }}
          >
            Delete
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => toast.dismiss()}
          >
            Cancel
          </Button>
        </div>
      </div>,
      {
        duration: 10000,
        dismissible: true
      }
    );
  };

  const handleUserCreated = () => {
    setShowCreateModal(false);
    fetchData();
    toast.success('User created successfully');
  };

  const handleUserUpdated = () => {
    setShowEditModal(false);
    setSelectedUser(null);
    fetchData();
    toast.success('User updated successfully');
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
          <h1 className="text-4xl font-bold text-slate-800" style={{fontFamily: 'Space Grotesk'}}>Users Management</h1>
          <Button 
            onClick={handleCreateUser}
            variant="outline"
            data-testid="create-user-button"
          >
            <Plus className="w-4 h-4 mr-2" /> Create User
          </Button>
        </div>

        <Card className="p-6">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">User</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Email</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Role</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Phone</th>
                  {user.role === 'SUPERADMIN' && (
                    <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Company</th>
                  )}
                  <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => {
                  const company = user.role === 'SUPERADMIN' ? companies.find(c => c.id === u.company_id) : null;
                  return (
                    <tr key={u.id} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="py-4 px-4">
                        <div>
                          <p className="font-semibold text-slate-800">{u.display_name}</p>
                        </div>
                      </td>
                      <td className="py-4 px-4 text-slate-700">{u.email}</td>
                      <td className="py-4 px-4">
                        <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
                          {u.role}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-slate-700">{u.phone || 'N/A'}</td>
                      {user.role === 'SUPERADMIN' && (
                        <td className="py-4 px-4 text-slate-700">
                          {company ? company.name : 'N/A'}
                        </td>
                      )}
                      <td className="py-4 px-4">
                        <div className="flex gap-2">
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => handleEditUser(u)}
                            data-testid={`edit-user-${u.id}`}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => handleDeleteUser(u.id)}
                            className="text-red-500 hover:text-red-700"
                            data-testid={`delete-user-${u.id}`}
                          >
                            <Trash2 className="w-4 h-4" />
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

        {showCreateModal && (
          <UserModal
            onClose={() => setShowCreateModal(false)}
            onSuccess={handleUserCreated}
            companyId={user.role === 'ADMIN' ? user.company_id : undefined}
            companies={user.role === 'SUPERADMIN' ? companies : undefined}
            isSuperAdmin={user.role === 'SUPERADMIN'}
            clients={clients}
          />
        )}

        {showEditModal && selectedUser && (
          <EditUserModal
            user={selectedUser}
            onClose={() => {
              setShowEditModal(false);
              setSelectedUser(null);
            }}
            onSuccess={handleUserUpdated}
            companyId={user.role === 'ADMIN' ? user.company_id : undefined}
            companies={user.role === 'SUPERADMIN' ? companies : undefined}
            isSuperAdmin={user.role === 'SUPERADMIN'}
            clients={clients}
          />
        )}
      </div>
    </DashboardLayout>
  );
};

export default UsersPage;