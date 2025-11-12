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

const EditInvoiceModal = ({ invoice, companyId, onClose, onUpdate }) => {
  const [formData, setFormData] = useState({
    items: invoice.items || [],
    tax_amount: invoice.tax_amount || 0,
    status: invoice.status || 'DRAFT',
    due_date: invoice.due_date || ''
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

  const calculateTotal = () => {
    return calculateSubtotal() + formData.tax_amount;
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
      
      const response = await axios.put(`${API}/companies/${companyId}/invoices/${invoice.id}`, {
        items: validItems,
        tax_amount: formData.tax_amount,
        status: formData.status,
        due_date: formData.due_date || undefined
      });
      
      toast.success('Invoice updated successfully');
      onUpdate(response.data);
      onClose();
    } catch (error) {
      toast.error('Failed to update invoice');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold" style={{fontFamily: 'Space Grotesk'}}>
            Edit Invoice #{invoice.invoice_number}
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
              <Label>Tax Amount (AED)</Label>
              <Input
                type="number"
                step="0.01"
                value={formData.tax_amount}
                onChange={(e) => setFormData({...formData, tax_amount: parseFloat(e.target.value) || 0})}
              />
            </div>
            
            <div>
              <Label>Status</Label>
              <Select value={formData.status} onValueChange={(value) => setFormData({...formData, status: value})}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="DRAFT">Draft</SelectItem>
                  <SelectItem value="ISSUED">Issued</SelectItem>
                  <SelectItem value="PAID">Paid</SelectItem>
                  <SelectItem value="CANCELLED">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div className="border-t pt-4">
            <div className="space-y-2">
              <div className="flex justify-between">
                <span>Subtotal:</span>
                <span>AED {calculateSubtotal().toFixed(2)}</span>
              </div>
              
              <div className="flex justify-between">
                <span>Tax:</span>
                <span>AED {formData.tax_amount.toFixed(2)}</span>
              </div>
              
              <div className="flex justify-between font-bold text-lg">
                <span>Total:</span>
                <span>AED {calculateTotal().toFixed(2)}</span>
              </div>
            </div>
          </div>
          
          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={loading} className="bg-gradient-to-r from-blue-500 to-indigo-600">
              {loading ? 'Updating...' : 'Update Invoice'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default EditInvoiceModal;