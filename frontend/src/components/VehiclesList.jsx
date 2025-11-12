import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API } from '../App';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { toast } from 'sonner';
import { Car, User, Calendar } from 'lucide-react';

const VehiclesList = ({ companyId, onRefresh }) => {
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchVehicles();
  }, [companyId]);

  const fetchVehicles = async () => {
    try {
      const response = await axios.get(`${API}/companies/${companyId}/vehicles`);
      setVehicles(response.data);
    } catch (error) {
      toast.error('Failed to fetch vehicles');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="text-center py-8">Loading vehicles...</div>;
  }

  if (vehicles.length === 0) {
    return (
      <div className="text-center py-12 text-slate-500">
        No vehicles found
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {vehicles.map((vehicle) => (
        <Card key={vehicle.id} className="p-6">
          <div className="flex justify-between items-start">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <Car className="w-6 h-6 text-blue-500" />
                <h3 className="text-lg font-semibold text-slate-800">
                  {vehicle.make} {vehicle.model}
                </h3>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                <div className="flex items-center text-sm text-slate-600">
                  <span className="font-medium">Plate:</span>
                  <span className="ml-2">{vehicle.plate_number}</span>
                </div>
                
                {vehicle.year && (
                  <div className="flex items-center text-sm text-slate-600">
                    <Calendar className="w-4 h-4 mr-2" />
                    <span>{vehicle.year}</span>
                  </div>
                )}
                
                {vehicle.vin && (
                  <div className="flex items-center text-sm text-slate-600">
                    <span className="font-medium">VIN:</span>
                    <span className="ml-2">{vehicle.vin}</span>
                  </div>
                )}
              </div>
              
              {(vehicle.owner_client_name || vehicle.owner_client_id) && (
                <div className="flex items-center text-sm text-slate-600 mt-3">
                  <User className="w-4 h-4 mr-2" />
                  <span>
                    Owner: {vehicle.owner_client_name || `ID: ${vehicle.owner_client_id}`}
                  </span>
                </div>
              )}
            </div>
            
            <div className="flex flex-col gap-2">
              <Button size="sm" variant="outline">
                View Details
              </Button>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
};

export default VehiclesList;