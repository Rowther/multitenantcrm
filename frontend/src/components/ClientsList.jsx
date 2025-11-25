import React, { useState } from 'react';
import { Button } from './ui/button';
import { Eye, Edit, Trash2, User } from 'lucide-react';
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
      {/* Desktop Table View */}
      <div className="hidden md:block overflow-x-auto">
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
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setSelectedClient(client);
                        setShowClientDetails(true);
                      }}
                    >
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

      {/* Mobile Card View */}
      <div className="md:hidden space-y-4">
        {clients.map((client) => (
          <div
            key={client.id}
            className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow"
          >
            <div className="flex items-start gap-3 mb-3">
              <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0">
                <User className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <button
                  onClick={() => {
                    setSelectedClient(client);
                    setShowClientDetails(true);
                  }}
                  className="text-lg font-bold text-blue-600 hover:text-blue-800 hover:underline text-left"
                >
                  {client.name}
                </button>
                <p className="text-sm text-slate-600 mt-1">{client.contact_person || 'No contact person'}</p>
              </div>
            </div>

            <div className="space-y-2 mb-4">
              <div className="flex items-center gap-2 text-sm">
                <span className="font-medium text-slate-700">Email:</span>
                <span className="text-slate-600">{client.email || 'N/A'}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <span className="font-medium text-slate-700">Phone:</span>
                <span className="text-slate-600">{client.phone || 'N/A'}</span>
              </div>
            </div>

            <div className="flex gap-2 pt-3 border-t border-slate-200">
              <Button
                variant="outline"
                size="sm"
                className="flex-1"
                onClick={() => {
                  setSelectedClient(client);
                  setShowClientDetails(true);
                }}
              >
                <Eye className="w-4 h-4 mr-2" />
                View
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="flex-1"
                onClick={() => onEdit(client)}
              >
                <Edit className="w-4 h-4 mr-2" />
                Edit
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onDelete(client.id)}
                className="text-red-500 hover:text-red-700 border-red-200 hover:border-red-300"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </div>
        ))}
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