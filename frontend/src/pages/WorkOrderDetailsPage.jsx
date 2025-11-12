import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import DashboardLayout from '../components/DashboardLayout';
import WorkOrderDetails from '../components/WorkOrderDetails';

const WorkOrderDetailsPage = ({ user, onLogout }) => {
  const { companyId, workOrderId } = useParams();
  const navigate = useNavigate();

  const handleBack = () => {
    navigate(`/companies/${companyId}`);
  };

  const handleEdit = (workOrder) => {
    // For now, we'll just go back to the list view
    // In the future, we can implement edit functionality
    console.log('Edit work order:', workOrder);
  };

  return (
    <DashboardLayout user={user} onLogout={onLogout}>
      <div className="p-6">
        <WorkOrderDetails 
          workOrderId={workOrderId}
          companyId={companyId}
          onBack={handleBack}
          onEdit={handleEdit}
          user={user}
        />
      </div>
    </DashboardLayout>
  );
};

export default WorkOrderDetailsPage;