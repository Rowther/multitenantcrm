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

const EmployeeModal = ({ companyId, employee, onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    user_id: '',
    position: '',
    skills: '',
    hourly_rate: ''
  });
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchUsers();
    if (employee) {
      setFormData({
        user_id: employee.user_id || '',
        position: employee.position || '',
        skills: employee.skills ? employee.skills.join(', ') : '',
        hourly_rate: employee.hourly_rate || ''
      });
    }
  }, [employee]);

  const fetchUsers = async () => {
    try {
      // This would need to be implemented in the backend
      // For now, we'll just show a message
      toast.info('User selection would be implemented in a full version');
    } catch (error) {
      // console.error('Failed to fetch users:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const payload = {
        ...formData,
        skills: formData.skills ? formData.skills.split(',').map(s => s.trim()).filter(s => s) : [],
        hourly_rate: formData.hourly_rate ? parseFloat(formData.hourly_rate) : null
      };

      if (employee) {
        // Update employee
        await axios.put(`${API}/companies/${companyId}/employees/${employee.id}`, payload);
        toast.success('Employee updated successfully');
      } else {
        // Create employee
        await axios.post(`${API}/companies/${companyId}/employees`, payload);
        toast.success('Employee created successfully');
      }
      
      onSuccess();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to save employee');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold" style={{fontFamily: 'Space Grotesk'}}>
            {employee ? 'Edit Employee' : 'Add New Employee'}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="user_id">User *</Label>
            <Input
              id="user_id"
              value={formData.user_id}
              onChange={(e) => setFormData({ ...formData, user_id: e.target.value })}
              placeholder="User ID"
              required
            />
            <p className="text-xs text-slate-500">In a full implementation, this would be a dropdown of existing users</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="position">Position</Label>
            <Input
              id="position"
              value={formData.position}
              onChange={(e) => setFormData({ ...formData, position: e.target.value })}
              placeholder="Position"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="skills">Skills</Label>
            <Input
              id="skills"
              value={formData.skills}
              onChange={(e) => setFormData({ ...formData, skills: e.target.value })}
              placeholder="Skills (comma separated)"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="hourly_rate">Hourly Rate (AED)</Label>
            <Input
              id="hourly_rate"
              type="number"
              step="0.01"
              value={formData.hourly_rate}
              onChange={(e) => setFormData({ ...formData, hourly_rate: e.target.value })}
              placeholder="Hourly rate"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={loading} className="bg-gradient-to-r from-blue-500 to-indigo-600">
              {loading ? 'Saving...' : (employee ? 'Update Employee' : 'Add Employee')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default EmployeeModal;