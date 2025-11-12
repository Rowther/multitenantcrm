import React, { useState } from 'react';
import { Button } from './ui/button';
import { Eye, Edit, Trash2 } from 'lucide-react';
import ClientDetailsModal from './ClientDetailsModal';

const ClientsList = ({ clients, onEdit, onDelete, companyId }) => {
  const [showClientDetails, setShowClientDetails] = useState(false);
  const [selectedClient, setSelectedClient] = useState(null);
  if (clients.length === 0) {
    return (
      <div className="text-center py-12 text-slate-500">
        No clients found
      </div>
    );
  }

  return (
    <>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-200">
              <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Name</th>
              <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Contact Person</th>
              <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Email</th>
              <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Phone</th>
              <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Actions</th>
            </tr>
          </thead>
          <tbody>
            {clients.map((client) => (
              <tr key={client.id} className="border-b border-slate-100 hover:bg-slate-50">
                <td className="py-4 px-4 font-medium text-slate-800">
                  <button 
                    onClick={() => {
                      setSelectedClient(client);
                      setShowClientDetails(true);
                    }}
                    className="text-blue-600 hover:text-blue-800 hover:underline"
                  >
                    {client.name}
                  </button>
                </td>
                <td className="py-4 px-4 text-slate-700">{client.contact_person || 'N/A'}</td>
                <td className="py-4 px-4 text-slate-700">{client.email || 'N/A'}</td>
                <td className="py-4 px-4 text-slate-700">{client.phone || 'N/A'}</td>
                <td className="py-4 px-4">
                  <div className="flex gap-2">
                    <Button variant="ghost" size="sm">
                      <Eye className="w-4 h-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => onEdit(client)}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => onDelete(client.id)}
                      className="text-red-500 hover:text-red-700"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      {showClientDetails && selectedClient && (
        <ClientDetailsModal 
          client={selectedClient}
          companyId={companyId}
          onClose={() => setShowClientDetails(false)}
        />
      )}
    </>
  );
};

export default ClientsList;