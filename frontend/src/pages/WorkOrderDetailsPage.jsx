import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import DashboardLayout from '../components/DashboardLayout';
import WorkOrderDetails from '../components/WorkOrderDetails';
import WorkOrderModal from '../components/WorkOrderModal';

const WorkOrderDetailsPage = ({ user, onLogout }) => {
  const { companyId, workOrderId } = useParams();
  const navigate = useNavigate();
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingWorkOrder, setEditingWorkOrder] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const handleBack = () => {
    navigate(`/companies/${companyId}`);
  };

  const handleEdit = (workOrder) => {
    setEditingWorkOrder(workOrder);
    setShowEditModal(true);
  };

  const handleEditSuccess = () => {
    setShowEditModal(false);
    setEditingWorkOrder(null);
    // Trigger refresh of work order details
    setRefreshKey(prev => prev + 1);
  };

  return (
    <DashboardLayout user={user} onLogout={onLogout}>
      <div className="p-6">
        <WorkOrderDetails
          key={refreshKey}
          workOrderId={workOrderId}
          companyId={companyId}
          onBack={handleBack}
          onEdit={handleEdit}
          user={user}
        />
      </div>

      {/* Edit Modal */}
      {showEditModal && editingWorkOrder && (
        <WorkOrderModal
          companyId={companyId}
          workOrder={editingWorkOrder}
          onClose={() => {
            setShowEditModal(false);
            setEditingWorkOrder(null);
          }}
          onSuccess={handleEditSuccess}
        />
      )}
    </DashboardLayout>
  );
};

export default WorkOrderDetailsPage;