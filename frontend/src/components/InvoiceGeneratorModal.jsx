import React, { useState } from 'react';
import axios from 'axios';
import { API } from '../App';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { toast } from 'sonner';

const InvoiceGeneratorModal = ({ workOrderId, companyId, quotedPrice, onClose, onGenerate }) => {
  const [formData, setFormData] = useState({
    vatPercentage: 5, // Default VAT percentage
    includeVat: true,
    dueDays: 30,
    items: [
      {
        description: 'Work Order Services',
        amount: quotedPrice || 0
      }
    ]
  });
  const [loading, setLoading] = useState(false);

  const handleAddItem = () => {
    setFormData(prev => ({
      ...prev,
      items: [...prev.items, { description: '', amount: 0 }]
    }));
  };

  const handleRemoveItem = (index) => {
    if (formData.items.length <= 1) {
      toast.error('At least one item is required');
      return;
    }
    
    setFormData(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index)
    }));
  };

  const handleItemChange = (index, field, value) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.map((item, i) => 
        i === index ? { ...item, [field]: field === 'amount' ? parseFloat(value) || 0 : value } : item
      )
    }));
  };

  const calculateSubtotal = () => {
    return formData.items.reduce((sum, item) => sum + item.amount, 0);
  };

  const calculateVatAmount = () => {
    if (!formData.includeVat) return 0;
    return (calculateSubtotal() * formData.vatPercentage) / 100;
  };

  const calculateTotal = () => {
    return calculateSubtotal() + calculateVatAmount();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      // Filter out empty items
      const validItems = formData.items.filter(item => item.description && item.amount > 0);
      
      if (validItems.length === 0) {
        toast.error('Please add at least one valid item');
        setLoading(false);
        return;
      }
      
      const response = await axios.post(`${API}/companies/${companyId}/invoices`, {
        work_order_id: workOrderId,
        items: validItems,
        tax_amount: calculateVatAmount(),
        due_days: formData.dueDays
      });
      
      toast.success('Invoice generated successfully');
      onGenerate(response.data);
      onClose();
    } catch (error) {
      toast.error('Failed to generate invoice');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold" style={{fontFamily: 'Space Grotesk'}}>
            Generate Invoice
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Invoice Items</h3>
            
            {formData.items.map((item, index) => (
              <div key={index} className="grid grid-cols-12 gap-2 items-end">
                <div className="col-span-7">
                  <Label>Description</Label>
                  <Textarea
                    value={item.description}
                    onChange={(e) => handleItemChange(index, 'description', e.target.value)}
                    placeholder="Item description"
                  />
                </div>
                <div className="col-span-4">
                  <Label>Amount (AED)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={item.amount}
                    onChange={(e) => handleItemChange(index, 'amount', e.target.value)}
                    placeholder="0.00"
                  />
                </div>
                <div className="col-span-1">
                  {formData.items.length > 1 && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => handleRemoveItem(index)}
                      className="h-10"
                    >
                      ×
                    </Button>
                  )}
                </div>
              </div>
            ))}
            
            <Button type="button" variant="outline" onClick={handleAddItem}>
              + Add Item
            </Button>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Due Days</Label>
              <Input
                type="number"
                value={formData.dueDays}
                onChange={(e) => setFormData({...formData, dueDays: parseInt(e.target.value) || 30})}
              />
            </div>
            
            <div>
              <Label>VAT Percentage</Label>
              <Input
                type="number"
                step="0.1"
                value={formData.vatPercentage}
                onChange={(e) => setFormData({...formData, vatPercentage: parseFloat(e.target.value) || 0})}
                disabled={!formData.includeVat}
              />
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="includeVat"
              checked={formData.includeVat}
              onChange={(e) => setFormData({...formData, includeVat: e.target.checked})}
              className="h-4 w-4"
            />
            <Label htmlFor="includeVat">Include VAT</Label>
          </div>
          
          <div className="border-t pt-4">
            <div className="space-y-2">
              <div className="flex justify-between">
                <span>Subtotal:</span>
                <span>AED {calculateSubtotal().toFixed(2)}</span>
              </div>
              
              {formData.includeVat && (
                <div className="flex justify-between">
                  <span>VAT ({formData.vatPercentage}%):</span>
                  <span>AED {calculateVatAmount().toFixed(2)}</span>
                </div>
              )}
              
              <div className="flex justify-between font-bold text-lg">
                <span>Total:</span>
                <span>AED {calculateTotal().toFixed(2)}</span>
              </div>
            </div>
          </div>
          
          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={loading} className="bg-gradient-to-r from-green-500 to-emerald-600">
              {loading ? 'Generating...' : 'Generate Invoice'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default InvoiceGeneratorModal;