import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API } from '../App';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { toast } from 'sonner';
import CompletionImageModal from './CompletionImageModal'; // Added import

const StatusUpdater = ({ workOrderId, companyId, currentStatus, onStatusUpdate, user }) => {
  const [newStatus, setNewStatus] = useState(currentStatus);
  const [loading, setLoading] = useState(false);
  const [company, setCompany] = useState(null); // Added state for company information
  const [showCompletionModal, setShowCompletionModal] = useState(false); // Added state for completion modal

  // Fetch company information
  useEffect(() => {
    const fetchCompany = async () => {
      try {
        const response = await axios.get(`${API}/companies/${companyId}`);
        setCompany(response.data);
      } catch (error) {
        console.error('Failed to fetch company information:', error);
      }
    };

    fetchCompany();
  }, [companyId]);

  const handleStatusUpdate = async () => {
    if (newStatus === currentStatus) {
      toast.info('Status is already set to this value');
      return;
    }

    // Check if this is MSAM and the status is being set to COMPLETED
    if (company && company.industry === 'technical_solutions' && newStatus === 'COMPLETED') {
      setShowCompletionModal(true);
      return;
    }

    setLoading(true);
    try {
      await axios.put(`${API}/companies/${companyId}/workorders/${workOrderId}`, {
        status: newStatus
      });
      
      toast.success('Status updated successfully');
      onStatusUpdate(newStatus);
    } catch (error) {
      toast.error('Failed to update status');
    } finally {
      setLoading(false);
    }
  };

  // Define the status flow
  const statusFlow = [
    { value: 'DRAFT', label: 'Draft' },
    { value: 'PENDING', label: 'Pending' },
    { value: 'APPROVED', label: 'Approved' },
    { value: 'IN_PROGRESS', label: 'In Progress' },
    { value: 'COMPLETED', label: 'Completed' },
    { value: 'CANCELLED', label: 'Cancelled' }
  ];

  // Handle completion with images
  const handleCompletionSuccess = () => {
    setShowCompletionModal(false);
    setNewStatus('COMPLETED');
    onStatusUpdate('COMPLETED');
  };

  return (
    <Card className="p-6 mt-6">
      <h3 className="text-xl font-bold text-slate-800 mb-4">Update Status</h3>
      <div className="flex gap-4 items-end">
        <div className="flex-1">
          <label className="text-sm font-medium text-slate-700 mb-1 block">New Status</label>
          <Select value={newStatus} onValueChange={setNewStatus}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {statusFlow.map((status) => (
                <SelectItem key={status.value} value={status.value}>
                  {status.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button 
          onClick={handleStatusUpdate} 
          disabled={loading}
          className="bg-gradient-to-r from-blue-500 to-indigo-600"
        >
          {loading ? 'Updating...' : 'Update Status'}
        </Button>
      </div>
      
      {/* Completion Image Modal for MSAM */}
      {showCompletionModal && (
        <CompletionImageModal
          workOrderId={workOrderId}
          companyId={companyId}
          onClose={() => setShowCompletionModal(false)}
          onSuccess={handleCompletionSuccess}
          company={company}
        />
      )}
    </Card>
  );
};

export default StatusUpdater;