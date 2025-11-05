import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API } from '@/App';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';

const WorkOrderModal = ({ companyId, onClose, onSuccess, userId }) => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    requested_by_client_id: '',
    vehicle_id: '',
    assigned_technicians: [],
    priority: 'MEDIUM',
    quoted_price: '',
    preventive_flag: false
  });
  const [clients, setClients] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [clientsRes, employeesRes] = await Promise.all([
        axios.get(`${API}/companies/${companyId}/clients`),
        axios.get(`${API}/companies/${companyId}/employees`)
      ]);
      setClients(clientsRes.data);
      setEmployees(employeesRes.data);

      // Try to fetch vehicles (might fail if not Vigor)
      try {
        const vehiclesRes = await axios.get(`${API}/companies/${companyId}/vehicles`);
        setVehicles(vehiclesRes.data);
      } catch (e) {
        // Vehicles not available for this company
      }
    } catch (error) {
      toast.error('Failed to load data');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const payload = {
        ...formData,
        quoted_price: formData.quoted_price ? parseFloat(formData.quoted_price) : null,
        requested_by_client_id: formData.requested_by_client_id || null,
        vehicle_id: formData.vehicle_id || null
      };
      await axios.post(`${API}/companies/${companyId}/workorders`, payload);
      onSuccess();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to create work order');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto" data-testid="workorder-modal">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold" style={{fontFamily: 'Space Grotesk'}}>Create Work Order</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              required
              data-testid="wo-title-input"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              rows={4}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              data-testid="wo-description-input"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="client">Client</Label>
              <Select value={formData.requested_by_client_id} onValueChange={(value) => setFormData({ ...formData, requested_by_client_id: value })}>
                <SelectTrigger data-testid="wo-client-select">
                  <SelectValue placeholder="Select client (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">None</SelectItem>
                  {clients.map((client) => (
                    <SelectItem key={client.id} value={client.id}>{client.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {vehicles.length > 0 && (
              <div className="space-y-2">
                <Label htmlFor="vehicle">Vehicle</Label>
                <Select value={formData.vehicle_id} onValueChange={(value) => setFormData({ ...formData, vehicle_id: value })}>
                  <SelectTrigger data-testid="wo-vehicle-select">
                    <SelectValue placeholder="Select vehicle (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">None</SelectItem>
                    {vehicles.map((vehicle) => (
                      <SelectItem key={vehicle.id} value={vehicle.id}>
                        {vehicle.plate_number} - {vehicle.make} {vehicle.model}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="priority">Priority *</Label>
              <Select value={formData.priority} onValueChange={(value) => setFormData({ ...formData, priority: value })}>
                <SelectTrigger data-testid="wo-priority-select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="LOW">Low</SelectItem>
                  <SelectItem value="MEDIUM">Medium</SelectItem>
                  <SelectItem value="HIGH">High</SelectItem>
                  <SelectItem value="URGENT">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="quoted_price">Quoted Price ($)</Label>
              <Input
                id="quoted_price"
                type="number"
                step="0.01"
                value={formData.quoted_price}
                onChange={(e) => setFormData({ ...formData, quoted_price: e.target.value })}
                data-testid="wo-price-input"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={loading} className="bg-gradient-to-r from-blue-500 to-indigo-600" data-testid="wo-submit-button">
              {loading ? 'Creating...' : 'Create Work Order'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default WorkOrderModal;
