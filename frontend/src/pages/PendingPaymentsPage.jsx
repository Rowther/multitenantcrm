import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API } from '../App';
import DashboardLayout from '../components/DashboardLayout';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { DollarSign, ChevronDown, ChevronUp, Clock, CreditCard, Wallet, FileText, Plus, X } from 'lucide-react';
import { toast } from 'sonner';

const PendingPaymentsPage = ({ user, onLogout }) => {
    const [pendingPayments, setPendingPayments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [expandedClient, setExpandedClient] = useState(null);
    const [workOrders, setWorkOrders] = useState({});
    const [paymentHistory, setPaymentHistory] = useState({});
    const [loadingWorkOrders, setLoadingWorkOrders] = useState({});

    // Payment processing state
    const [showPaymentForm, setShowPaymentForm] = useState({});
    const [paymentMethod, setPaymentMethod] = useState('cash');
    const [referenceNumber, setReferenceNumber] = useState('');
    const [paymentAmount, setPaymentAmount] = useState('');
    const [processingPayment, setProcessingPayment] = useState({});

    useEffect(() => {
        fetchPendingPayments();
    }, [user.company_id]);

    const fetchPendingPayments = async () => {
        try {
            setLoading(true);
            const response = await axios.get(`${API}/companies/${user.company_id}/pending-payments`);
            setPendingPayments(response.data);
        } catch (error) {
            console.error('Failed to fetch pending payments:', error);
            toast.error('Failed to load pending payments');
        } finally {
            setLoading(false);
        }
    };

    const fetchClientWorkOrders = async (clientId) => {
        try {
            setLoadingWorkOrders(prev => ({ ...prev, [clientId]: true }));
            const response = await axios.get(`${API}/companies/${user.company_id}/workorders?client_id=${clientId}`);

            let workOrdersData;
            if (response.data.work_orders) {
                workOrdersData = response.data.work_orders;
            } else {
                workOrdersData = response.data;
            }

            setWorkOrders(prev => ({ ...prev, [clientId]: workOrdersData }));

            // Fetch payment history for each work order
            for (const wo of workOrdersData) {
                if (wo.paid_amount > 0) {
                    fetchPaymentHistory(wo.id);
                }
            }
        } catch (error) {
            console.error('Failed to fetch work orders:', error);
            toast.error('Failed to load work orders');
        } finally {
            setLoadingWorkOrders(prev => ({ ...prev, [clientId]: false }));
        }
    };

    const fetchPaymentHistory = async (workOrderId) => {
        try {
            const response = await axios.get(`${API}/companies/${user.company_id}/workorders/${workOrderId}/payments`);
            setPaymentHistory(prev => ({ ...prev, [workOrderId]: response.data }));
        } catch (error) {
            console.error('Failed to fetch payment history:', error);
        }
    };

    const toggleClientExpand = (clientId) => {
        if (expandedClient === clientId) {
            setExpandedClient(null);
        } else {
            setExpandedClient(clientId);
            if (!workOrders[clientId]) {
                fetchClientWorkOrders(clientId);
            }
        }
    };

    const togglePaymentForm = (workOrderId, remainingAmount) => {
        setShowPaymentForm(prev => ({
            ...prev,
            [workOrderId]: !prev[workOrderId]
        }));

        // Reset form when opening
        if (!showPaymentForm[workOrderId]) {
            setPaymentMethod('cash');
            setReferenceNumber('');
            setPaymentAmount(remainingAmount.toString());
        }
    };

    const handlePayment = async (workOrderId, clientId) => {
        if (!paymentAmount || parseFloat(paymentAmount) <= 0) {
            toast.error('Please enter a valid amount');
            return;
        }

        if (paymentMethod === 'card' && !referenceNumber.trim()) {
            toast.error('Reference number is required for card payments');
            return;
        }

        try {
            setProcessingPayment(prev => ({ ...prev, [workOrderId]: true }));

            const payload = {
                work_order_id: workOrderId,
                amount: parseFloat(paymentAmount),
                payment_method: paymentMethod,
                reference_number: referenceNumber
            };

            await axios.post(
                `${API}/companies/${user.company_id}/payments`,
                payload
            );

            toast.success('Payment recorded successfully');

            // Close form
            setShowPaymentForm(prev => ({ ...prev, [workOrderId]: false }));

            // Refresh data
            fetchPaymentHistory(workOrderId);
            fetchClientWorkOrders(clientId);
            fetchPendingPayments(); // Update totals

        } catch (error) {
            console.error('Payment failed:', error);
            toast.error('Failed to record payment');
        } finally {
            setProcessingPayment(prev => ({ ...prev, [workOrderId]: false }));
        }
    };

    const formatDateTime = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
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

    if (loading) {
        return (
            <DashboardLayout user={user} onLogout={onLogout}>
                <div className="flex items-center justify-center h-screen">Loading...</div>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout user={user} onLogout={onLogout}>
            <div className="space-y-6">
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-4xl font-bold text-slate-800" style={{ fontFamily: 'Space Grotesk' }}>
                            Pending Payments
                        </h1>
                        <p className="text-slate-600 mt-2">Track outstanding balances and payment history</p>
                    </div>
                </div>

                {pendingPayments.length === 0 ? (
                    <Card className="p-12">
                        <div className="text-center">
                            <DollarSign className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                            <h3 className="text-lg font-semibold text-slate-700 mb-2">No pending payments</h3>
                            <p className="text-slate-500">All clients have paid in full!</p>
                        </div>
                    </Card>
                ) : (
                    <div className="space-y-4">
                        {pendingPayments.map((payment) => {
                            const totalAmount = payment.total_amount || 0;
                            const paidAmount = payment.paid_amount || 0;
                            const remainingAmount = payment.remaining_amount || 0;
                            const progress = totalAmount > 0
                                ? ((paidAmount / totalAmount) * 100).toFixed(1)
                                : '0';
                            const isExpanded = expandedClient === payment.client.id;

                            return (
                                <Card key={payment.client.id} className="overflow-hidden">
                                    {/* Client Summary Row */}
                                    <div
                                        className="p-6 cursor-pointer hover:bg-slate-50 transition-colors"
                                        onClick={() => toggleClientExpand(payment.client.id)}
                                    >
                                        <div className="flex items-center justify-between">
                                            <div className="flex-1 grid grid-cols-1 md:grid-cols-5 gap-4 items-center">
                                                <div className="md:col-span-2">
                                                    <h3 className="text-lg font-bold text-slate-800">{payment.client.name}</h3>
                                                    <p className="text-sm text-slate-600">{payment.client.email || 'No email'}</p>
                                                    <p className="text-sm text-slate-600">{payment.client.phone || 'No phone'}</p>
                                                </div>

                                                <div className="text-center">
                                                    <p className="text-sm text-slate-600">Work Orders</p>
                                                    <p className="text-2xl font-bold text-slate-800">{payment.work_order_count || 0}</p>
                                                </div>

                                                <div className="text-center">
                                                    <p className="text-sm text-slate-600">Total Amount</p>
                                                    <p className="text-xl font-bold text-slate-800">AED {totalAmount.toFixed(2)}</p>
                                                    <div className="flex items-center justify-center gap-2 mt-1">
                                                        <span className="text-sm text-green-600 font-semibold">Paid: {paidAmount.toFixed(2)}</span>
                                                        <span className="text-sm text-amber-600 font-semibold">Due: {remainingAmount.toFixed(2)}</span>
                                                    </div>
                                                </div>

                                                <div className="text-center">
                                                    <p className="text-sm text-slate-600 mb-2">Progress</p>
                                                    <div className="w-full bg-slate-200 rounded-full h-3">
                                                        <div
                                                            className="bg-gradient-to-r from-blue-500 to-indigo-600 h-3 rounded-full transition-all duration-300"
                                                            style={{ width: `${progress}%` }}
                                                        ></div>
                                                    </div>
                                                    <p className="text-sm font-semibold text-slate-700 mt-1">{progress}%</p>
                                                </div>
                                            </div>

                                            <div className="ml-4">
                                                {isExpanded ? (
                                                    <ChevronUp className="w-6 h-6 text-slate-500" />
                                                ) : (
                                                    <ChevronDown className="w-6 h-6 text-slate-500" />
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Expanded Details */}
                                    {isExpanded && (
                                        <div className="border-t border-slate-200 bg-slate-50 p-6">
                                            {loadingWorkOrders[payment.client.id] ? (
                                                <div className="text-center py-8 text-slate-500">Loading work orders...</div>
                                            ) : workOrders[payment.client.id]?.length > 0 ? (
                                                <div className="space-y-6">
                                                    {workOrders[payment.client.id].map((wo) => {
                                                        const woQuoted = wo.quoted_price || 0;
                                                        const woPaid = wo.paid_amount || 0;
                                                        const woRemaining = woQuoted - woPaid;
                                                        const woProgress = woQuoted > 0 ? ((woPaid / woQuoted) * 100).toFixed(1) : '0';

                                                        return (
                                                            <div key={wo.id} className="bg-white rounded-lg p-5 shadow-sm border border-slate-200">
                                                                {/* Work Order Header */}
                                                                <div className="flex items-start justify-between mb-4">
                                                                    <div className="flex items-center gap-3">
                                                                        <FileText className="w-5 h-5 text-slate-500" />
                                                                        <div>
                                                                            <h4 className="font-bold text-slate-800 text-lg">{wo.title}</h4>
                                                                            <p className="text-sm text-slate-600">#{wo.order_number}</p>
                                                                        </div>
                                                                    </div>
                                                                    <div className="flex items-center gap-3">
                                                                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusClass(wo.status)}`}>
                                                                            {wo.status.replace('_', ' ')}
                                                                        </span>
                                                                        {woRemaining > 0 && (
                                                                            <Button
                                                                                size="sm"
                                                                                onClick={() => togglePaymentForm(wo.id, woRemaining)}
                                                                                className={showPaymentForm[wo.id] ? "bg-slate-200 text-slate-700 hover:bg-slate-300" : "bg-blue-600 hover:bg-blue-700"}
                                                                            >
                                                                                {showPaymentForm[wo.id] ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4 mr-1" />}
                                                                                {showPaymentForm[wo.id] ? 'Cancel' : 'Make Payment'}
                                                                            </Button>
                                                                        )}
                                                                    </div>
                                                                </div>

                                                                {/* Payment Form */}
                                                                {showPaymentForm[wo.id] && (
                                                                    <div className="mb-6 bg-slate-50 p-4 rounded-lg border border-blue-100 animate-in fade-in slide-in-from-top-2">
                                                                        <h4 className="font-semibold text-slate-800 mb-3 flex items-center gap-2">
                                                                            <DollarSign className="w-4 h-4 text-blue-600" />
                                                                            Record New Payment
                                                                        </h4>
                                                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                                                                            <div>
                                                                                <Label className="text-xs mb-1.5 block">Amount (AED)</Label>
                                                                                <Input
                                                                                    type="number"
                                                                                    value={paymentAmount}
                                                                                    onChange={(e) => setPaymentAmount(e.target.value)}
                                                                                    placeholder="0.00"
                                                                                />
                                                                            </div>
                                                                            <div>
                                                                                <Label className="text-xs mb-1.5 block">Payment Method</Label>
                                                                                <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                                                                                    <SelectTrigger>
                                                                                        <SelectValue />
                                                                                    </SelectTrigger>
                                                                                    <SelectContent>
                                                                                        <SelectItem value="cash">Cash</SelectItem>
                                                                                        <SelectItem value="card">Card</SelectItem>
                                                                                    </SelectContent>
                                                                                </Select>
                                                                            </div>
                                                                            {paymentMethod === 'card' && (
                                                                                <div>
                                                                                    <Label className="text-xs mb-1.5 block">
                                                                                        Reference Number <span className="text-red-500">*</span>
                                                                                    </Label>
                                                                                    <Input
                                                                                        value={referenceNumber}
                                                                                        onChange={(e) => setReferenceNumber(e.target.value)}
                                                                                        placeholder="Required for card..."
                                                                                        required
                                                                                    />
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                        <div className="flex justify-end">
                                                                            <Button
                                                                                onClick={() => handlePayment(wo.id, payment.client.id)}
                                                                                disabled={processingPayment[wo.id]}
                                                                                className="bg-green-600 hover:bg-green-700"
                                                                            >
                                                                                {processingPayment[wo.id] ? 'Processing...' : 'Confirm Payment'}
                                                                            </Button>
                                                                        </div>
                                                                    </div>
                                                                )}

                                                                {/* Payment Summary */}
                                                                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                                                                    <div className="bg-slate-50 rounded-lg p-3 border border-slate-200">
                                                                        <div className="flex items-center gap-2 mb-1">
                                                                            <DollarSign className="w-4 h-4 text-slate-500" />
                                                                            <span className="text-xs font-medium text-slate-600">Quoted</span>
                                                                        </div>
                                                                        <p className="text-lg font-bold text-slate-800">AED {woQuoted.toFixed(2)}</p>
                                                                    </div>

                                                                    <div className="bg-green-50 rounded-lg p-3 border border-green-200">
                                                                        <div className="flex items-center gap-2 mb-1">
                                                                            <Wallet className="w-4 h-4 text-green-600" />
                                                                            <span className="text-xs font-medium text-green-700">Paid</span>
                                                                        </div>
                                                                        <p className="text-lg font-bold text-green-700">AED {woPaid.toFixed(2)}</p>
                                                                    </div>

                                                                    <div className="bg-amber-50 rounded-lg p-3 border border-amber-200">
                                                                        <div className="flex items-center gap-2 mb-1">
                                                                            <CreditCard className="w-4 h-4 text-amber-600" />
                                                                            <span className="text-xs font-medium text-amber-700">Remaining</span>
                                                                        </div>
                                                                        <p className="text-lg font-bold text-amber-700">AED {woRemaining.toFixed(2)}</p>
                                                                    </div>

                                                                    <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
                                                                        <div className="flex items-center gap-2 mb-1">
                                                                            <span className="text-xs font-medium text-blue-700">Progress</span>
                                                                        </div>
                                                                        <div className="w-full bg-blue-200 rounded-full h-2 mb-1">
                                                                            <div
                                                                                className="bg-blue-600 h-2 rounded-full"
                                                                                style={{ width: `${woProgress}%` }}
                                                                            ></div>
                                                                        </div>
                                                                        <p className="text-sm font-semibold text-blue-700">{woProgress}% paid</p>
                                                                    </div>
                                                                </div>

                                                                {/* Payment History */}
                                                                {woPaid > 0 && paymentHistory[wo.id] && (
                                                                    <div className="mt-4 pt-4 border-t border-slate-200">
                                                                        <div className="flex items-center gap-2 mb-3">
                                                                            <Clock className="w-4 h-4 text-slate-600" />
                                                                            <h5 className="font-semibold text-slate-800">
                                                                                Payment History ({paymentHistory[wo.id]?.length || 0} transactions)
                                                                            </h5>
                                                                        </div>

                                                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                                                            {paymentHistory[wo.id].map((pmt, idx) => (
                                                                                <div
                                                                                    key={pmt.id || idx}
                                                                                    className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg p-4 border-l-4 border-green-500 shadow-sm"
                                                                                >
                                                                                    <div className="flex items-start justify-between mb-2">
                                                                                        <div className="flex items-center gap-2">
                                                                                            <DollarSign className="w-5 h-5 text-green-600" />
                                                                                            <span className="text-xl font-bold text-green-700">
                                                                                                AED {pmt.amount.toFixed(2)}
                                                                                            </span>
                                                                                        </div>
                                                                                        {pmt.payment_method === 'card' ? (
                                                                                            <CreditCard className="w-5 h-5 text-slate-500" />
                                                                                        ) : (
                                                                                            <Wallet className="w-5 h-5 text-slate-500" />
                                                                                        )}
                                                                                    </div>

                                                                                    <div className="space-y-1 text-sm">
                                                                                        <div className="flex items-center gap-1 text-slate-600">
                                                                                            <Clock className="w-3 h-3" />
                                                                                            <span>{formatDateTime(pmt.created_at)}</span>
                                                                                        </div>

                                                                                        <div className="text-slate-700 font-medium capitalize">
                                                                                            {pmt.payment_method}
                                                                                        </div>

                                                                                        {pmt.reference_number && (
                                                                                            <div className="text-xs text-slate-600 bg-white px-2 py-1 rounded">
                                                                                                Ref: {pmt.reference_number}
                                                                                            </div>
                                                                                        )}

                                                                                        {pmt.created_by_name && (
                                                                                            <div className="text-xs text-slate-500 mt-2 pt-2 border-t border-green-200">
                                                                                                Processed by: {pmt.created_by_name}
                                                                                            </div>
                                                                                        )}
                                                                                    </div>
                                                                                </div>
                                                                            ))}
                                                                        </div>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            ) : (
                                                <div className="text-center py-8 text-slate-500">No work orders found</div>
                                            )}
                                        </div>
                                    )}
                                </Card>
                            );
                        })}
                    </div>
                )}
            </div>
        </DashboardLayout>
    );
};

export default PendingPaymentsPage;
