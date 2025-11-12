import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API } from '../App';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { X, User, FileText, DollarSign, CreditCard, Wallet, Search } from 'lucide-react';
import { toast } from 'sonner';

const ClientDetailsModal = ({ client, companyId, onClose }) => {
  const [workOrders, setWorkOrders] = useState([]);
  const [filteredWorkOrders, setFilteredWorkOrders] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [referenceNumber, setReferenceNumber] = useState('');
  const [processingPayment, setProcessingPayment] = useState({}); // Track which work orders are processing payments

  useEffect(() => {
    fetchClientWorkOrders();
  }, [client.id, companyId]);

  useEffect(() => {
    // Filter work orders based on search term
    if (searchTerm && Array.isArray(workOrders)) {
      const filtered = workOrders.filter(wo => 
        wo.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        wo.order_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
        wo.description?.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredWorkOrders(filtered);
    } else {
      setFilteredWorkOrders(Array.isArray(workOrders) ? workOrders : []);
    }
  }, [searchTerm, workOrders]);

  const fetchClientWorkOrders = async () => {
    try {
      setLoading(true);
      // Fetch work orders for this client
      const response = await axios.get(`${API}/companies/${companyId}/workorders?client_id=${client.id}`);
      
      // Handle both old and new API response formats
      let workOrdersData;
      if (response.data.work_orders) {
        workOrdersData = response.data.work_orders;
      } else {
        workOrdersData = response.data;
      }
      
      setWorkOrders(workOrdersData);
      setFilteredWorkOrders(workOrdersData);
    } catch (error) {
      toast.error('Failed to fetch client work orders');
    } finally {
      setLoading(false);
    }
  };

  const handlePayment = async (workOrderId, amount) => {
    // In a real implementation, this would process the payment
    try {
      setProcessingPayment(prev => ({ ...prev, [workOrderId]: true }));
      
      // Validate payment method and reference number
      if (paymentMethod === 'card' && !referenceNumber) {
        toast.error('Reference number is required for card payments');
        setProcessingPayment(prev => ({ ...prev, [workOrderId]: false }));
        return;
      }
      
      // Process payment through backend
      const response = await axios.post(`${API}/companies/${companyId}/payments`, {
        work_order_id: workOrderId,
        amount: parseFloat(amount),
        payment_method: paymentMethod,
        reference_number: paymentMethod === 'card' ? referenceNumber : null
      });
      
      toast.success(response.data.message);
      
      // Clear reference number if it was used
      if (paymentMethod === 'card') {
        setReferenceNumber('');
      }
      
      // Refresh work orders to show updated payment status
      fetchClientWorkOrders();
    } catch (error) {
      console.error('Payment error:', error);
      if (error.response && error.response.data && error.response.data.detail) {
        toast.error(error.response.data.detail);
      } else {
        toast.error('Failed to process payment');
      }
    } finally {
      setProcessingPayment(prev => ({ ...prev, [workOrderId]: false }));
    }
  };

  const getStatusClass = (status) => {
    const classes = {
      DRAFT: 'bg-slate-100 text-slate-700',
      PENDING: 'bg-yellow-100 text-yellow-700',
      APPROVED: 'bg-blue-100 text-blue-700',
      IN_PROGRESS: 'bg-purple-100 text-purple-700',
      COMPLETED: 'bg-green-100 text-green-700',
      CANCELLED: 'bg-red-100 text-red-700'
    };
    return classes[status] || 'bg-slate-100 text-slate-700';
  };

  const calculatePaymentInfo = (workOrder) => {
    const quotedPrice = workOrder.quoted_price || 0;
    const paidAmount = workOrder.paid_amount || 0;
    const remainingAmount = quotedPrice - paidAmount;
    const progress = quotedPrice > 0 ? (paidAmount / quotedPrice) * 100 : 0;
    
    return {
      quotedPrice,
      paidAmount,
      remainingAmount,
      progress
    };
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex justify-between items-center">
            <DialogTitle className="text-2xl font-bold" style={{fontFamily: 'Space Grotesk'}}>
              Client Details
            </DialogTitle>
            <Button variant="ghost" onClick={onClose} className="p-2">
              <X className="w-5 h-5" />
            </Button>
          </div>
        </DialogHeader>

        {/* Client Information */}
        <div className="bg-slate-50 rounded-lg p-6 mb-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center">
              <User className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-800">{client.name}</h2>
              <p className="text-slate-600">{client.contact_person || 'No contact person specified'}</p>
              <div className="mt-2 grid grid-cols-1 md:grid-cols-3 gap-2 text-sm">
                <div>
                  <span className="font-medium">Email:</span> {client.email || 'N/A'}
                </div>
                <div>
                  <span className="font-medium">Phone:</span> {client.phone || 'N/A'}
                </div>
                <div>
                  <span className="font-medium">Address:</span> {client.address || 'N/A'}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Work Orders */}
        <div>
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-bold text-slate-800">Work Orders</h3>
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
              <Input
                type="text"
                placeholder="Search work orders..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <div className="text-slate-500">Loading work orders...</div>
            </div>
          ) : (Array.isArray(filteredWorkOrders) ? filteredWorkOrders : []).length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              {searchTerm ? 'No matching work orders found' : 'No work orders found for this client'}
            </div>
          ) : (
            <div className="space-y-4">
              {(Array.isArray(filteredWorkOrders) ? filteredWorkOrders : []).map((workOrder) => {
                const paymentInfo = calculatePaymentInfo(workOrder);
                return (
                  <div key={workOrder.id} className="border rounded-lg p-4">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <FileText className="w-4 h-4 text-slate-500" />
                          <h4 className="font-bold text-slate-800">{workOrder.title}</h4>
                          <span className="text-sm font-medium">#{workOrder.order_number}</span>
                        </div>
                        <p className="text-sm text-slate-600 mt-1">{workOrder.description || 'No description'}</p>
                      </div>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusClass(workOrder.status)}`}>
                        {workOrder.status.replace('_', ' ')}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-4">
                      <div className="bg-slate-50 rounded-lg p-3">
                        <div className="flex items-center gap-2 mb-1">
                          <DollarSign className="w-4 h-4 text-slate-500" />
                          <span className="text-sm font-medium text-slate-700">Quoted Price</span>
                        </div>
                        <p className="text-lg font-bold">AED {paymentInfo.quotedPrice.toFixed(2)}</p>
                      </div>

                      <div className="bg-slate-50 rounded-lg p-3">
                        <div className="flex items-center gap-2 mb-1">
                          <Wallet className="w-4 h-4 text-slate-500" />
                          <span className="text-sm font-medium text-slate-700">Paid</span>
                        </div>
                        <p className="text-lg font-bold text-green-600">AED {paymentInfo.paidAmount.toFixed(2)}</p>
                      </div>

                      <div className="bg-slate-50 rounded-lg p-3">
                        <div className="flex items-center gap-2 mb-1">
                          <CreditCard className="w-4 h-4 text-slate-500" />
                          <span className="text-sm font-medium text-slate-700">Remaining</span>
                        </div>
                        <p className="text-lg font-bold text-amber-600">AED {paymentInfo.remainingAmount.toFixed(2)}</p>
                      </div>

                      <div className="bg-slate-50 rounded-lg p-3">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-medium text-slate-700">Progress</span>
                        </div>
                        <div className="w-full bg-slate-200 rounded-full h-2">
                          <div 
                            className="bg-blue-600 h-2 rounded-full" 
                            style={{ width: `${paymentInfo.progress}%` }}
                          ></div>
                        </div>
                        <p className="text-xs text-slate-500 mt-1">{paymentInfo.progress.toFixed(1)}% paid</p>
                      </div>
                    </div>

                    {/* Payment Section */}
                    {paymentInfo.remainingAmount > 0 && (
                      <div className="mt-4 pt-4 border-t border-slate-200">
                        <h4 className="font-medium text-slate-800 mb-2">Make Payment</h4>
                        <div className="flex flex-col sm:flex-row gap-3">
                          <div className="flex-1">
                            <label className="block text-sm font-medium text-slate-700 mb-1">Amount</label>
                            <input
                              type="number"
                              min="0"
                              max={paymentInfo.remainingAmount}
                              step="0.01"
                              defaultValue={paymentInfo.remainingAmount.toFixed(2)}
                              className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                              id={`amount-${workOrder.id}`}
                            />
                          </div>
                          <div className="flex-1">
                            <label className="block text-sm font-medium text-slate-700 mb-1">Payment Method</label>
                            <select
                              value={paymentMethod}
                              onChange={(e) => setPaymentMethod(e.target.value)}
                              className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                              <option value="cash">Cash</option>
                              <option value="card">Card</option>
                            </select>
                          </div>
                          {paymentMethod === 'card' && (
                            <div className="flex-1">
                              <label className="block text-sm font-medium text-slate-700 mb-1">Reference Number</label>
                              <input
                                type="text"
                                value={referenceNumber}
                                onChange={(e) => setReferenceNumber(e.target.value)}
                                placeholder="Enter card reference number"
                                className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                              />
                            </div>
                          )}
                          <div className="flex items-end">
                            <Button 
                              onClick={() => {
                                const amountInput = document.getElementById(`amount-${workOrder.id}`);
                                const amount = amountInput ? parseFloat(amountInput.value) : paymentInfo.remainingAmount;
                                handlePayment(workOrder.id, amount);
                              }}
                              className="bg-gradient-to-r from-green-500 to-emerald-600"
                              disabled={processingPayment[workOrder.id]}
                            >
                              {processingPayment[workOrder.id] ? 'Processing...' : 'Process Payment'}
                            </Button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ClientDetailsModal;