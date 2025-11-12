import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API } from '../App';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { toast } from 'sonner';
import InvoiceGeneratorModal from './InvoiceGeneratorModal';
import EditInvoiceModal from './EditInvoiceModal';

const InvoiceGenerator = ({ workOrderId, companyId, quotedPrice }) => {
  const [loading, setLoading] = useState(false);
  const [invoices, setInvoices] = useState([]);
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [invoiceToEdit, setInvoiceToEdit] = useState(null);

  useEffect(() => {
    fetchInvoices();
  }, [workOrderId, companyId]);

  const fetchInvoices = async () => {
    try {
      const response = await axios.get(`${API}/companies/${companyId}/invoices`);
      // Filter invoices for this specific work order
      const workOrderInvoices = response.data.filter(invoice => invoice.work_order_id === workOrderId);
      setInvoices(workOrderInvoices);
    } catch (error) {
      console.error('Failed to fetch invoices', error);
    }
  };

  const handleGenerateInvoice = (newInvoice) => {
    setInvoices(prev => [...prev, newInvoice]);
  };

  const handleEditInvoice = (invoice) => {
    setInvoiceToEdit(invoice);
    setShowEditModal(true);
  };

  const handleUpdateInvoice = (updatedInvoice) => {
    setInvoices(prev => prev.map(inv => inv.id === updatedInvoice.id ? updatedInvoice : inv));
  };

  const downloadInvoice = async (invoiceId) => {
    try {
      const response = await axios.get(`${API}/companies/${companyId}/invoices/${invoiceId}/pdf`, {
        responseType: 'blob'
      });
      
      // Create a download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `invoice_${invoiceId}.pdf`);
      document.body.appendChild(link);
      link.click();
      
      // Clean up
      link.parentNode.removeChild(link);
    } catch (error) {
      toast.error('Failed to download invoice');
    }
  };

  return (
    <Card className="p-6 mt-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-xl font-bold text-slate-800">Invoice Generator</h3>
        <Button 
          onClick={() => setShowGenerateModal(true)}
          disabled={loading}
          className="bg-gradient-to-r from-green-500 to-emerald-600"
        >
          Generate Invoice
        </Button>
      </div>

      {invoices.length > 0 ? (
        <div className="space-y-4">
          {invoices.map((invoice) => (
            <div key={invoice.id} className="border rounded-lg p-4 flex justify-between items-center">
              <div>
                <h4 className="font-semibold">Invoice #{invoice.invoice_number}</h4>
                <p className="text-sm text-slate-600">
                  Generated on {new Date(invoice.issued_date).toLocaleDateString()}
                </p>
                <p className="text-sm text-slate-600">
                  Status: <span className="font-medium">{invoice.status}</span>
                </p>
                <p className="text-lg font-bold mt-2">
                  Total Amount: AED {invoice.total_amount.toFixed(2)}
                </p>
              </div>
              <div className="flex gap-2">
                <Button 
                  onClick={() => handleEditInvoice(invoice)}
                  variant="outline"
                >
                  Edit
                </Button>
                <Button 
                  onClick={() => downloadInvoice(invoice.id)}
                  variant="outline"
                >
                  Download PDF
                </Button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-8 text-slate-500">
          {quotedPrice ? (
            <p>No invoice generated yet. Click "Generate Invoice" to create one based on your quoted price of AED {quotedPrice.toFixed(2)}.</p>
          ) : (
            <p>No invoice generated yet. Add a quoted price to your work order to generate an invoice.</p>
          )}
        </div>
      )}

      {showGenerateModal && (
        <InvoiceGeneratorModal
          workOrderId={workOrderId}
          companyId={companyId}
          quotedPrice={quotedPrice}
          onClose={() => setShowGenerateModal(false)}
          onGenerate={handleGenerateInvoice}
        />
      )}

      {showEditModal && invoiceToEdit && (
        <EditInvoiceModal
          invoice={invoiceToEdit}
          companyId={companyId}
          onClose={() => {
            setShowEditModal(false);
            setInvoiceToEdit(null);
          }}
          onUpdate={handleUpdateInvoice}
        />
      )}
    </Card>
  );
};

export default InvoiceGenerator;