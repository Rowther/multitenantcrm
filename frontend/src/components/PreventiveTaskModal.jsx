import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API } from '../App';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { toast } from 'sonner';
import { Calendar } from 'lucide-react';

const PreventiveTaskModal = ({ companyId, onClose, onSuccess, taskId = null }) => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    asset_location: '',
    frequency: 'monthly',
    assigned_technicians: [],
  });
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    fetchData();
    if (taskId) {
      fetchTaskDetails();
      setIsEditing(true);
    }
  }, [taskId]);

  const fetchData = async () => {
    try {
      const employeesRes = await axios.get(`${API}/companies/${companyId}/employees`);
      setEmployees(employeesRes.data);
    } catch (error) {
      toast.error('Failed to load employees');
    }
  };

  const fetchTaskDetails = async () => {
    try {
      const response = await axios.get(`${API}/companies/${companyId}/preventive_tasks`);
      const tasks = response.data;
      const task = tasks.find(t => t.id === taskId);
      if (task) {
        setFormData({
          title: task.title,
          description: task.description || '',
          asset_location: task.asset_location || '',
          frequency: task.frequency,
          assigned_technicians: task.assigned_technicians || [],
        });
      }
    } catch (error) {
      toast.error('Failed to load task details');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const payload = {
        ...formData,
        assigned_technicians: formData.assigned_technicians[0] && formData.assigned_technicians[0] !== 'none' ? [formData.assigned_technicians[0]] : []
      };

      if (isEditing) {
        // For editing, we would need a PUT endpoint - for now, we'll just show a message
        toast.info('Edit functionality would be implemented with a PUT endpoint');
      } else {
        await axios.post(`${API}/companies/${companyId}/preventive_tasks`, payload);
        toast.success('Preventive task created successfully');
      }
      onSuccess();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to create preventive task');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold" style={{fontFamily: 'Space Grotesk'}}>
            {isEditing ? 'Edit Preventive Task' : 'Create Preventive Task'}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Task Title *</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              rows={3}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="asset_location">Asset/Location</Label>
            <Input
              id="asset_location"
              value={formData.asset_location}
              onChange={(e) => setFormData({ ...formData, asset_location: e.target.value })}
              placeholder="e.g., HVAC System, Building Entrance"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="frequency">Frequency *</Label>
              <Select value={formData.frequency} onValueChange={(value) => setFormData({ ...formData, frequency: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="yearly">Yearly</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="technicians">Assigned Technicians</Label>
              <Select 
                value={formData.assigned_technicians[0] || 'none'} 
                onValueChange={(value) => setFormData({ ...formData, assigned_technicians: [value] })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select technician" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {employees.map((emp) => {
                    // Get user details for the employee
                    return (
                      <SelectItem key={emp.user_id} value={emp.user_id}>
                        {emp.user_id} {/* In a real app, we'd fetch user details to show name */}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={loading} className="bg-gradient-to-r from-blue-500 to-indigo-600">
              {loading ? 'Saving...' : (isEditing ? 'Update Task' : 'Create Task')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default PreventiveTaskModal;