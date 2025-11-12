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
import { X } from 'lucide-react';

const VehicleModal = ({ companyId, onClose, onSuccess, vehicleId = null }) => {
  const [formData, setFormData] = useState({
    plate_number: '',
    make: '',
    model: '',
    year: '',
    vin: '',
    owner_client_id: '',
  });
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    fetchData();
    if (vehicleId) {
      fetchVehicleDetails();
      setIsEditing(true);
    }
  }, [vehicleId]);

  const fetchData = async () => {
    try {
      const clientsRes = await axios.get(`${API}/companies/${companyId}/clients`);
      setClients(clientsRes.data);
    } catch (error) {
      toast.error('Failed to load clients');
    }
  };

  const fetchVehicleDetails = async () => {
    try {
      // We would need an endpoint to get a single vehicle by ID
      // For now, we'll just show a message
      toast.info('Edit functionality would require a GET /vehicles/{id} endpoint');
    } catch (error) {
      toast.error('Failed to load vehicle details');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const payload = {
        ...formData,
        year: formData.year ? parseInt(formData.year) : null,
        owner_client_id: formData.owner_client_id && formData.owner_client_id !== 'none' ? formData.owner_client_id : null
      };

      await axios.post(`${API}/companies/${companyId}/vehicles`, payload);
      toast.success('Vehicle created successfully');
      onSuccess();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to create vehicle');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={true}>
      <DialogContent 
        className="max-w-2xl max-h-[90vh] overflow-y-auto"
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold" style={{fontFamily: 'Space Grotesk'}}>
            {isEditing ? 'Edit Vehicle' : 'Add New Vehicle'}
          </DialogTitle>
          <button
            type="button"
            className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground"
            onClick={onClose}
          >
            <X className="h-4 w-4" />
            <span className="sr-only">Close</span>
          </button>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="plate_number">Plate Number *</Label>
              <Input
                id="plate_number"
                value={formData.plate_number}
                onChange={(e) => setFormData({ ...formData, plate_number: e.target.value })}
                required
                placeholder="e.g., DXB-1234"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="year">Year</Label>
              <Input
                id="year"
                type="number"
                value={formData.year}
                onChange={(e) => setFormData({ ...formData, year: e.target.value })}
                placeholder="e.g., 2020"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="make">Make *</Label>
              <Input
                id="make"
                value={formData.make}
                onChange={(e) => setFormData({ ...formData, make: e.target.value })}
                required
                placeholder="e.g., Toyota"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="model">Model *</Label>
              <Input
                id="model"
                value={formData.model}
                onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                required
                placeholder="e.g., Camry"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="vin">VIN (Vehicle Identification Number)</Label>
            <Input
              id="vin"
              value={formData.vin}
              onChange={(e) => setFormData({ ...formData, vin: e.target.value })}
              placeholder="e.g., 1HGBH41JXMN109186"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="owner_client_id">Owner (Client)</Label>
            <Select value={formData.owner_client_id} onValueChange={(value) => setFormData({ ...formData, owner_client_id: value })}>
              <SelectTrigger>
                <SelectValue placeholder="Select owner (optional)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                {clients.map((client) => (
                  <SelectItem key={client.id} value={client.id}>{client.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={loading} className="bg-gradient-to-r from-blue-500 to-indigo-600">
              {loading ? 'Saving...' : (isEditing ? 'Update Vehicle' : 'Add Vehicle')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default VehicleModal;