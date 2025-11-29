import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API } from '../App';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Eye, Edit, Trash2, Calendar, DollarSign, User, Car, Paperclip, Image as ImageIcon, FileText } from 'lucide-react';
import { toast } from 'sonner';
import ExpenseTracker from './ExpenseTracker';
import InvoiceGenerator from './InvoiceGenerator';
import StatusUpdater from './StatusUpdater';
import CommentsSection from './CommentsSection';
import ImageLightbox from './ImageLightbox';

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
  const [currentEmployee, setCurrentEmployee] = useState(null); // Employee record for current user
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);

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

  // Check if user can perform edit actions (SUPERADMIN, ADMIN, and EMPLOYEE for status updates)
  const canEdit = () => {
    return user.role === 'SUPERADMIN' || user.role === 'ADMIN' || user.role === 'EMPLOYEE';
  };

  // Check if user can update status (employees can only update status on assigned work orders)
  const canUpdateStatus = () => {
    if (user.role === 'SUPERADMIN' || user.role === 'ADMIN') {
      return true;
    }
    if (user.role === 'EMPLOYEE') {
      // Check if employee is assigned to this work order using either employee ID or user ID
      return workOrder && workOrder.assigned_technicians && (
        workOrder.assigned_technicians.includes(user.id) ||
        (currentEmployee && workOrder.assigned_technicians.includes(currentEmployee.id))
      );
    }
    return false;
  };

  // Check if user can perform full edit actions (not just status updates)
  const canFullEdit = () => {
    return user.role === 'SUPERADMIN' || user.role === 'ADMIN';
  };

  // Check if user can see the edit button
  const canEditWorkOrder = () => {
    return user.role === 'SUPERADMIN' || user.role === 'ADMIN';
  };

  // Check if user can update work order status
  const canUpdateWorkOrderStatus = () => {

    if (user.role === 'SUPERADMIN' || user.role === 'ADMIN') {
      return true;
    }
    if (user.role === 'EMPLOYEE') {
      // Check if employee is assigned to this work order using either employee ID or user ID
      return workOrder && workOrder.assigned_technicians && (
        (currentEmployee && workOrder.assigned_technicians.includes(currentEmployee.id)) ||
        workOrder.assigned_technicians.includes(user.id)
      );
    }
    return false;
  };

  // Check if user is an employee
  const isEmployee = () => {
    return user.role === 'EMPLOYEE';
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



      // Fetch client details if exists
      if (woResponse.data.requested_by_client_id) {
        try {
          const clientResponse = await axios.get(`${API}/companies/${companyId}/clients`);
          const clientData = clientResponse.data.find(c => c.id === woResponse.data.requested_by_client_id);
          setClient(clientData);
        } catch (e) {
          // console.log('Failed to fetch client data');
        }
      }

      // Fetch technician details
      if (woResponse.data.assigned_technicians && woResponse.data.assigned_technicians.length > 0) {
        try {
          const employeesResponse = await axios.get(`${API}/companies/${companyId}/employees`);
          // console.log('Employees fetched:', employeesResponse.data);
          const techData = employeesResponse.data.filter(emp =>
            woResponse.data.assigned_technicians.includes(emp.id)
          );
          setTechnicians(techData);
          // Find current employee record
          if (user.role === 'EMPLOYEE') {
            // Try matching by user.id directly (employee ID might be the same as user ID)
            let currentEmp = employeesResponse.data.find(emp =>
              emp.id === user.id || emp.user_id === user.id
            );
            if (!currentEmp) {
              // Fallback: match nested user object
              currentEmp = employeesResponse.data.find(emp => emp.user?.id === user.id);
            }
            setCurrentEmployee(currentEmp);
            // console.log('Current employee record after matching:', currentEmp);
          }
        } catch (e) {
          // console.log('Failed to fetch technician data');
        }
      } else if (user.role === 'EMPLOYEE') {
        // Even if no technicians assigned, fetch current employee record
        try {
          const employeesResponse = await axios.get(`${API}/companies/${companyId}/employees`);
          // console.log('Employees fetched (no techs):', employeesResponse.data);
          let currentEmp = employeesResponse.data.find(emp =>
            emp.id === user.id || emp.user_id === user.id
          );
          if (!currentEmp) {
            currentEmp = employeesResponse.data.find(emp => emp.user?.id === user.id);
          }
          setCurrentEmployee(currentEmp);
          // console.log('Current employee record (no techs):', currentEmp);
        } catch (e) {
          // console.log('Failed to fetch employee data');
        }
      }

      // Fetch vehicle details if exists
      if (woResponse.data.vehicle_id) {
        try {
          const vehiclesResponse = await axios.get(`${API}/companies/${companyId}/vehicles`);
          const vehicleData = vehiclesResponse.data.find(v => v.id === woResponse.data.vehicle_id);
          setVehicle(vehicleData);
        } catch (e) {
          // console.log('Failed to fetch vehicle data');
        }
      }
    } catch (error) {
      // console.error('Error fetching work order details:', error);
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
    // console.log('WorkOrderDetails is in loading state');
    return <div className="flex items-center justify-center h-64">Loading work order details...</div>;
  }

  if (!workOrder) {
    // console.log('WorkOrderDetails: No work order data found');
    return <div className="text-center py-12 text-slate-500">Work order not found</div>;
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <Button variant="outline" onClick={onBack} className="w-full sm:w-auto min-h-[44px]">
          ← Back to Work Orders
        </Button>
        {/* Only show edit button for users with full edit permissions */}
        {canEditWorkOrder() && (
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onEdit(workOrder)} className="flex-1 sm:flex-initial min-h-[44px]">
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

            {/* Hide quoted price for employees */}
            {workOrder.quoted_price && !isEmployee() && (
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
            Attachments ({workOrder.attachments.length})
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {workOrder.attachments.map((attachment, index) => {
              const displayUrl = constructAttachmentUrl(attachment);
              // Check for image extensions in the attachment path
              const hasImageExtension = attachment.match(/\.(jpg|jpeg|png|gif|webp|bmp)$/i);
              // Check for PDF extension
              const hasPDFExtension = attachment.match(/\.pdf$/i);

              // For GridFS files (no extension), assume image and let onError handle it
              const isGridFSFile = attachment.includes('/api/files/');
              const isImage = hasImageExtension || (isGridFSFile && !hasPDFExtension);
              const isPDF = hasPDFExtension;

              const fileName = attachment.split('/').pop() || `File ${index + 1}`;

              return (
                <div
                  key={index}
                  className="border rounded-lg overflow-hidden hover:shadow-lg transition-shadow cursor-pointer group"
                  onClick={() => {
                    setLightboxIndex(index);
                    setLightboxOpen(true);
                  }}
                >
                  <div className="relative">
                    {isImage ? (
                      <>
                        <img
                          src={displayUrl}
                          alt={fileName}
                          className="w-full h-32 object-cover group-hover:opacity-90 transition-opacity"
                          onError={(e) => {
                            // If image fails to load, replace with document icon
                            const parent = e.target.parentElement;
                            if (parent) {
                              e.target.style.display = 'none';
                              const fallback = document.createElement('div');
                              fallback.className = 'w-full h-32 flex flex-col items-center justify-center bg-blue-50 group-hover:bg-blue-100 transition-colors';
                              fallback.innerHTML = `
                                <svg class="w-12 h-12 text-blue-500 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                                <span class="text-xs text-blue-700 font-medium">Document</span>
                              `;
                              parent.insertBefore(fallback, e.target);
                            }
                          }}
                        />
                        <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all flex items-center justify-center">
                          <Eye className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                      </>
                    ) : isPDF ? (
                      <div className="w-full h-32 flex flex-col items-center justify-center bg-red-50 group-hover:bg-red-100 transition-colors">
                        <FileText className="w-12 h-12 text-red-500 mb-2" />
                        <span className="text-xs text-red-700 font-medium">PDF</span>
                      </div>
                    ) : (
                      <div className="w-full h-32 flex flex-col items-center justify-center bg-blue-50 group-hover:bg-blue-100 transition-colors">
                        <FileText className="w-12 h-12 text-blue-500 mb-2" />
                        <span className="text-xs text-blue-700 font-medium">Document</span>
                      </div>
                    )}
                  </div>
                  <div className="p-2 bg-white">
                    <p className="text-xs text-slate-600 truncate" title={fileName}>
                      {fileName}
                    </p>
                    <p className="text-xs text-blue-600 font-medium mt-1">
                      Click to view
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* Lightbox for viewing attachments */}
      {lightboxOpen && workOrder.attachments && (
        <ImageLightbox
          attachments={workOrder.attachments}
          initialIndex={lightboxIndex}
          onClose={() => setLightboxOpen(false)}
          constructUrl={constructAttachmentUrl}
        />
      )}

      {/* Status Updater - For users with edit permissions or assigned employees */}
      {canUpdateWorkOrderStatus() && (
        <StatusUpdater
          workOrderId={workOrderId}
          companyId={companyId}
          currentStatus={workOrder.status}
          onStatusUpdate={handleStatusUpdate}
          user={user}
          isEmployee={isEmployee()}
        />
      )}

      {/* Expense Tracker - Only for users with full edit permissions */}
      {canFullEdit() && (
        <ExpenseTracker workOrderId={workOrderId} companyId={companyId} />
      )}

      {/* Invoice Generator - Only for users with full edit permissions */}
      {canFullEdit() && (
        <InvoiceGenerator
          workOrderId={workOrderId}
          companyId={companyId}
          quotedPrice={workOrder.quoted_price}
        />
      )}

      {/* Product Details Section */}
      {workOrder.products && workOrder.products.length > 0 && (
        <Card className="p-6">
          <h3 className="text-lg font-bold text-slate-800 mb-4">Product Details</h3>
          <div className="space-y-4">
            {workOrder.products.map((product, index) => (
              <div key={index} className="border rounded-lg p-4">
                <div className="flex justify-between items-start mb-2">
                  <h4 className="font-medium text-slate-800">{product.name || `Product #${index + 1}`}</h4>
                  {product.category && (
                    <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                      {product.category}
                    </span>
                  )}
                </div>

                {product.description && (
                  <p className="text-sm text-slate-600 mb-2">{product.description}</p>
                )}

                <div className="grid grid-cols-2 gap-4 mt-3">
                  <div>
                    <p className="text-xs text-slate-500">Quantity</p>
                    <p className="font-medium">{product.quantity || 1}</p>
                  </div>
                  {/* Hide price information for employees */}
                  {!isEmployee() && (
                    <>
                      <div>
                        <p className="text-xs text-slate-500">Price (AED)</p>
                        <p className="font-medium">{product.price ? product.price.toFixed(2) : '0.00'}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500">Total</p>
                        <p className="font-medium">
                          AED {((product.quantity || 1) * (product.price || 0)).toFixed(2)}
                        </p>
                      </div>
                    </>
                  )}
                </div>
              </div>
            ))}

            {/* Hide total quoted price for employees */}
            {!isEmployee() && (
              <div className="pt-4 border-t border-slate-200">
                <div className="flex justify-between">
                  <span className="font-medium">Total Quoted Price:</span>
                  <span className="font-bold text-lg">AED {workOrder.quoted_price ? workOrder.quoted_price.toFixed(2) : '0.00'}</span>
                </div>
              </div>
            )}
          </div>
        </Card>
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