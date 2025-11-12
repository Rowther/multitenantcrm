import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API } from '../App';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Eye, Edit, Trash2, Calendar, DollarSign, User, Car, Paperclip, Image as ImageIcon } from 'lucide-react';
import { toast } from 'sonner';
import ExpenseTracker from './ExpenseTracker';
import InvoiceGenerator from './InvoiceGenerator';
import StatusUpdater from './StatusUpdater';
import CommentsSection from './CommentsSection';

// Utility function to construct full URL for attachments
const constructAttachmentUrl = (attachmentPath) => {
  // If it's already a full URL, return as is
  if (attachmentPath.startsWith('http')) {
    return attachmentPath;
  }
  
  // If it's a relative path starting with /uploads/
  if (attachmentPath.startsWith('/uploads/')) {
    // Get the base URL without the /api part
    const baseUrl = API.replace('/api', '');
    return `${baseUrl}${attachmentPath}`;
  }
  
  // For any other relative path
  if (!attachmentPath.includes('://')) {
    const baseUrl = API.replace('/api', '');
    const formattedPath = attachmentPath.startsWith('/') ? attachmentPath : `/${attachmentPath}`;
    return `${baseUrl}${formattedPath}`;
  }
  
  // Fallback
  return attachmentPath;
};

const WorkOrderDetails = ({ workOrderId, companyId, onBack, onEdit, user }) => {
  const [workOrder, setWorkOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [client, setClient] = useState(null);
  const [technicians, setTechnicians] = useState([]);
  const [vehicle, setVehicle] = useState(null);

  // Function to check if deadline is approaching (within 2 days) and work order is not completed
  const isDeadlineApproaching = (promiseDate, status) => {
    // Only highlight if status is not completed
    if (status === 'COMPLETED') return false;
    
    if (!promiseDate) return false;
    
    const deadline = new Date(promiseDate);
    const now = new Date();
    const timeDiff = deadline.getTime() - now.getTime();
    const daysDiff = timeDiff / (1000 * 3600 * 24);
    
    // Highlight if deadline is within 2 days and not yet passed
    return daysDiff <= 2 && daysDiff >= 0;
  };

  // Check if user can perform edit actions (only SUPERADMIN and ADMIN)
  const canEdit = () => {
    return user.role === 'SUPERADMIN' || user.role === 'ADMIN';
  };

  useEffect(() => {
    fetchData();
  }, [workOrderId, companyId]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch work order details
      const woResponse = await axios.get(`${API}/companies/${companyId}/workorders/${workOrderId}`);
      setWorkOrder(woResponse.data);
      
      // Debug: Log the attachments to see what we're getting
      console.log('Work Order Data:', woResponse.data);
      console.log('Work Order Attachments:', woResponse.data.attachments);

      // Fetch client details if exists
      if (woResponse.data.requested_by_client_id) {
        try {
          const clientResponse = await axios.get(`${API}/companies/${companyId}/clients`);
          const clientData = clientResponse.data.find(c => c.id === woResponse.data.requested_by_client_id);
          setClient(clientData);
        } catch (e) {
          console.log('Failed to fetch client data');
        }
      }

      // Fetch technician details
      if (woResponse.data.assigned_technicians && woResponse.data.assigned_technicians.length > 0) {
        try {
          const employeesResponse = await axios.get(`${API}/companies/${companyId}/employees`);
          const techData = employeesResponse.data.filter(emp => 
            woResponse.data.assigned_technicians.includes(emp.id)
          );
          setTechnicians(techData);
        } catch (e) {
          console.log('Failed to fetch technician data');
        }
      }

      // Fetch vehicle details if exists
      if (woResponse.data.vehicle_id) {
        try {
          const vehiclesResponse = await axios.get(`${API}/companies/${companyId}/vehicles`);
          const vehicleData = vehiclesResponse.data.find(v => v.id === woResponse.data.vehicle_id);
          setVehicle(vehicleData);
        } catch (e) {
          console.log('Failed to fetch vehicle data');
        }
      }
    } catch (error) {
      toast.error('Failed to fetch work order details');
    } finally {
      setLoading(false);
    }
  };

  const getStatusClass = (status) => {
    const classes = {
      DRAFT: 'bg-slate-100 text-slate-700',
      PENDING: 'bg-yellow-100 text-yellow-700',
      APPROVED: 'bg-blue-100 text-blue-700',
      IN_PROGRESS: 'bg-purple-100 text-purple-700',
      COMPLETED: 'bg-green-100 text-green-700',
      CANCELLED: 'bg-red-100 text-red-700'
    };
    return classes[status] || 'bg-slate-100 text-slate-700';
  };

  const getPriorityClass = (priority) => {
    const classes = {
      LOW: 'bg-slate-100 text-slate-600',
      MEDIUM: 'bg-blue-100 text-blue-600',
      HIGH: 'bg-orange-100 text-orange-600',
      URGENT: 'bg-red-100 text-red-600'
    };
    return classes[priority] || 'bg-slate-100 text-slate-600';
  };

  // Handle status update
  const handleStatusUpdate = (newStatus) => {
    // Instead of just updating the status, refresh the entire work order data
    fetchData();
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64">Loading work order details...</div>;
  }

  if (!workOrder) {
    return <div className="text-center py-12 text-slate-500">Work order not found</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <Button variant="outline" onClick={onBack}>
          ← Back to Work Orders
        </Button>
        {/* Only show edit button for users with edit permissions */}
        {canEdit() && (
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onEdit(workOrder)}>
              <Edit className="w-4 h-4 mr-2" /> Edit
            </Button>
          </div>
        )}
      </div>

      <Card className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h2 className="text-2xl font-bold text-slate-800 mb-4">{workOrder.title}</h2>
            <p className="text-slate-600 mb-6">{workOrder.description || 'No description provided'}</p>
            
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-semibold text-slate-500 mb-1">Order Number</h3>
                <p className="font-medium">{workOrder.order_number}</p>
              </div>
              
              <div>
                <h3 className="text-sm font-semibold text-slate-500 mb-1">Status</h3>
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusClass(workOrder.status)}`}>
                  {workOrder.status}
                </span>
              </div>
              
              <div>
                <h3 className="text-sm font-semibold text-slate-500 mb-1">Priority</h3>
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${getPriorityClass(workOrder.priority)}`}>
                  {workOrder.priority}
                </span>
              </div>
              
              <div>
                <h3 className="text-sm font-semibold text-slate-500 mb-1">Created Date</h3>
                <p>{new Date(workOrder.created_at).toLocaleDateString()}</p>
              </div>
            </div>
          </div>
          
          <div className="space-y-4">
            {client && (
              <div className="flex items-start gap-3">
                <User className="w-5 h-5 text-slate-500 mt-0.5" />
                <div>
                  <h3 className="text-sm font-semibold text-slate-500 mb-1">Client</h3>
                  <p className="font-medium">{client.name}</p>
                  {client.contact_person && <p className="text-sm text-slate-600">{client.contact_person}</p>}
                </div>
              </div>
            )}
            
            {technicians.length > 0 && (
              <div className="flex items-start gap-3">
                <User className="w-5 h-5 text-slate-500 mt-0.5" />
                <div>
                  <h3 className="text-sm font-semibold text-slate-500 mb-1">Assigned Technicians</h3>
                  <div className="space-y-1">
                    {technicians.map(tech => (
                      <p key={tech.id} className="font-medium">
                        {tech.user?.display_name || tech.user?.email || 'Unknown Technician'}
                      </p>
                    ))}
                  </div>
                </div>
              </div>
            )}
            
            {vehicle && (
              <div className="flex items-start gap-3">
                <Car className="w-5 h-5 text-slate-500 mt-0.5" />
                <div>
                  <h3 className="text-sm font-semibold text-slate-500 mb-1">Vehicle</h3>
                  <p className="font-medium">{vehicle.plate_number}</p>
                  <p className="text-sm text-slate-600">{vehicle.make} {vehicle.model} ({vehicle.year})</p>
                </div>
              </div>
            )}
            
            {workOrder.quoted_price && (
              <div className="flex items-start gap-3">
                <DollarSign className="w-5 h-5 text-slate-500 mt-0.5" />
                <div>
                  <h3 className="text-sm font-semibold text-slate-500 mb-1">Quoted Price</h3>
                  <p className="font-medium">AED {workOrder.quoted_price.toFixed(2)}</p>
                </div>
              </div>
            )}
            
            {/* SLA Information */}
            {workOrder.sla_hours && (
              <div className="flex items-start gap-3">
                <Calendar className="w-5 h-5 text-slate-500 mt-0.5" />
                <div>
                  <h3 className="text-sm font-semibold text-slate-500 mb-1">SLA</h3>
                  <p className="font-medium">{Math.round(workOrder.sla_hours / 24)} days ({workOrder.sla_hours} hours)</p>
                </div>
              </div>
            )}
            
            {/* Promise Date with Deadline Highlighting */}
            {workOrder.promise_date && (
              <div className={`flex items-start gap-3 ${isDeadlineApproaching(workOrder.promise_date, workOrder.status) ? 'bg-red-50 p-3 rounded-lg' : ''}`}>
                <Calendar className={`w-5 h-5 mt-0.5 ${isDeadlineApproaching(workOrder.promise_date, workOrder.status) ? 'text-red-500' : 'text-slate-500'}`} />
                <div>
                  <h3 className={`text-sm font-semibold mb-1 ${isDeadlineApproaching(workOrder.promise_date, workOrder.status) ? 'text-red-700' : 'text-slate-500'}`}>
                    Promise Completion Date
                  </h3>
                  <p className={`font-medium ${isDeadlineApproaching(workOrder.promise_date, workOrder.status) ? 'text-red-600' : ''}`}>
                    {new Date(workOrder.promise_date).toLocaleDateString()}
                    {isDeadlineApproaching(workOrder.promise_date, workOrder.status) && (
                      <span className="ml-2 text-xs bg-red-100 text-red-800 px-2 py-1 rounded-full">
                        Deadline Approaching!
                      </span>
                    )}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </Card>

      {/* Attachments Section */}
      {workOrder.attachments && workOrder.attachments.length > 0 && (
        <Card className="p-6">
          <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center">
            <Paperclip className="w-5 h-5 mr-2" />
            Attachments
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {workOrder.attachments.map((attachment, index) => {
              // Normalize the attachment URL to ensure it's displayable
              let displayUrl = constructAttachmentUrl(attachment);
              
              // Debug: Log the attachment processing
              console.log('Processing attachment:', attachment);
              console.log('Constructed display URL:', displayUrl);
              
              // Check if it's an image file
              const isImage = displayUrl.match(/\.(jpg|jpeg|png|gif|webp)$/i);
              
              return (
                <div key={index} className="border rounded-lg overflow-hidden">
                  {isImage ? (
                    <img 
                      src={displayUrl} 
                      alt={`Attachment ${index + 1}`}
                      className="w-full h-32 object-cover"
                      onError={(e) => {
                        // Debug: Log when image fails to load
                        console.log('Image failed to load:', displayUrl);
                        // If image fails to load, show fallback
                        e.target.onerror = null;
                        e.target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgZmlsbD0iI2NjYyIvPjx0ZXh0IHg9IjUwIiB5PSI1NSIgZm9udC1zaXplPSIxMCIgZmlsbD0iIzY2NiIgdGV4dC1hbmNob3I9Im1pZGRsZSI+SW1hZ2UgTm90IEZvdW5kPC90ZXh0Pjwvc3ZnPg==';
                      }}
                    />
                  ) : (
                    <div className="w-full h-32 flex items-center justify-center bg-slate-100">
                      <ImageIcon className="w-8 h-8 text-slate-400" />
                    </div>
                  )}
                  <div className="p-2">
                    <p className="text-xs text-slate-600 truncate">
                      Attachment {index + 1}
                    </p>
                    <a 
                      href={displayUrl} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-xs text-blue-600 hover:underline"
                    >
                      View
                    </a>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* Status Updater - Only for users with edit permissions */}
      {canEdit() && (
        <StatusUpdater 
          workOrderId={workOrderId} 
          companyId={companyId} 
          currentStatus={workOrder.status}
          onStatusUpdate={handleStatusUpdate}
          user={user}
        />
      )}

      {/* Expense Tracker - Only for users with edit permissions */}
      {canEdit() && (
        <ExpenseTracker workOrderId={workOrderId} companyId={companyId} />
      )}

      {/* Invoice Generator - Only for users with edit permissions */}
      {canEdit() && (
        <InvoiceGenerator 
          workOrderId={workOrderId} 
          companyId={companyId} 
          quotedPrice={workOrder.quoted_price} 
        />
      )}

      {/* Comments Section - Clients can view but not add comments */}
      <CommentsSection 
        workOrderId={workOrderId} 
        companyId={companyId} 
        user={user}
      />
    </div>
  );
};

export default WorkOrderDetails;