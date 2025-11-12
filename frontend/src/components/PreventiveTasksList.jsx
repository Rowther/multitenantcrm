import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API } from '../App';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { toast } from 'sonner';
import { Calendar, Clock, User, MapPin, CheckCircle } from 'lucide-react';

const PreventiveTasksList = ({ companyId, onRefresh }) => {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTasks();
  }, [companyId]);

  const fetchTasks = async () => {
    try {
      const response = await axios.get(`${API}/companies/${companyId}/preventive_tasks`);
      setTasks(response.data);
    } catch (error) {
      toast.error('Failed to fetch preventive tasks');
    } finally {
      setLoading(false);
    }
  };

  const completeTask = async (taskId) => {
    try {
      await axios.put(`${API}/companies/${companyId}/preventive_tasks/${taskId}/complete`);
      toast.success('Task marked as completed');
      fetchTasks(); // Refresh the list
      if (onRefresh) onRefresh();
    } catch (error) {
      toast.error('Failed to complete task');
    }
  };

  if (loading) {
    return <div className="text-center py-8">Loading preventive tasks...</div>;
  }

  if (tasks.length === 0) {
    return (
      <div className="text-center py-12 text-slate-500">
        No preventive tasks found
      </div>
    );
  }

  const getFrequencyLabel = (frequency) => {
    const labels = {
      daily: 'Daily',
      weekly: 'Weekly',
      monthly: 'Monthly',
      yearly: 'Yearly'
    };
    return labels[frequency] || frequency;
  };

  const getStatusClass = (status) => {
    const classes = {
      ACTIVE: 'bg-blue-100 text-blue-700',
      PAUSED: 'bg-yellow-100 text-yellow-700',
      COMPLETED: 'bg-green-100 text-green-700'
    };
    return classes[status] || 'bg-slate-100 text-slate-700';
  };

  return (
    <div className="space-y-4">
      {tasks.map((task) => (
        <Card key={task.id} className="p-6">
          <div className="flex justify-between items-start">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h3 className="text-lg font-semibold text-slate-800">{task.title}</h3>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusClass(task.status)}`}>
                  {task.status}
                </span>
              </div>
              
              {task.description && (
                <p className="text-slate-600 mb-3">{task.description}</p>
              )}
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                <div className="flex items-center text-sm text-slate-600">
                  <Calendar className="w-4 h-4 mr-2" />
                  <span>Next due: {new Date(task.next_due_date).toLocaleDateString()}</span>
                </div>
                
                <div className="flex items-center text-sm text-slate-600">
                  <Clock className="w-4 h-4 mr-2" />
                  <span>{getFrequencyLabel(task.frequency)}</span>
                </div>
                
                {task.asset_location && (
                  <div className="flex items-center text-sm text-slate-600">
                    <MapPin className="w-4 h-4 mr-2" />
                    <span>{task.asset_location}</span>
                  </div>
                )}
              </div>
              
              {task.assigned_technicians && task.assigned_technicians.length > 0 && (
                <div className="flex items-center text-sm text-slate-600 mt-3">
                  <User className="w-4 h-4 mr-2" />
                  <span>Assigned to {task.assigned_technicians.length} technician(s)</span>
                </div>
              )}
            </div>
            
            <div className="flex flex-col gap-2">
              {task.status === 'ACTIVE' && (
                <Button 
                  size="sm" 
                  onClick={() => completeTask(task.id)}
                  className="bg-green-500 hover:bg-green-600"
                >
                  <CheckCircle className="w-4 h-4 mr-1" />
                  Complete
                </Button>
              )}
            </div>
          </div>
          
          {task.last_completed_date && (
            <div className="mt-3 pt-3 border-t border-slate-100 text-sm text-slate-500">
              Last completed: {new Date(task.last_completed_date).toLocaleDateString()}
            </div>
          )}
        </Card>
      ))}
    </div>
  );
};

export default PreventiveTasksList;