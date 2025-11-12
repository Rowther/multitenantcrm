import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API } from '../App';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { toast } from 'sonner';

const ExpenseTracker = ({ workOrderId, companyId }) => {
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    description: '',
    amount: ''
  });

  useEffect(() => {
    fetchExpenses();
  }, [workOrderId, companyId]);

  const fetchExpenses = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API}/companies/${companyId}/workorders/${workOrderId}/expenses`);
      setExpenses(response.data);
    } catch (error) {
      toast.error('Failed to fetch expenses');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.description || !formData.amount) {
      toast.error('Please fill all fields');
      return;
    }

    try {
      await axios.post(`${API}/companies/${companyId}/workorders/${workOrderId}/expenses`, {
        description: formData.description,
        amount: parseFloat(formData.amount)
      });
      
      toast.success('Expense added successfully');
      setFormData({ description: '', amount: '' });
      setShowForm(false);
      fetchExpenses(); // Refresh the expenses list
    } catch (error) {
      toast.error('Failed to add expense');
    }
  };

  const totalExpenses = expenses.reduce((sum, expense) => sum + expense.amount, 0);

  if (loading) {
    return <div>Loading expenses...</div>;
  }

  return (
    <Card className="p-6 mt-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-xl font-bold text-slate-800">Expense Tracker</h3>
        <Button onClick={() => setShowForm(!showForm)}>
          {showForm ? 'Cancel' : 'Add Expense'}
        </Button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="mb-6 p-4 border rounded-lg bg-slate-50">
          <div className="space-y-4">
            <div>
              <Label htmlFor="description">Description *</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                required
              />
            </div>
            
            <div>
              <Label htmlFor="amount">Amount (AED) *</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                required
              />
            </div>
            
            <Button type="submit" className="bg-gradient-to-r from-blue-500 to-indigo-600">
              Add Expense
            </Button>
          </div>
        </form>
      )}

      {expenses.length > 0 ? (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Description</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Amount (AED)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {expenses.map((expense) => (
                <TableRow key={expense.id}>
                  <TableCell>{expense.description}</TableCell>
                  <TableCell>{new Date(expense.date).toLocaleDateString()}</TableCell>
                  <TableCell className="text-right">AED {expense.amount.toFixed(2)}</TableCell>
                </TableRow>
              ))}
              <TableRow className="font-bold">
                <TableCell colSpan={2}>Total Expenses</TableCell>
                <TableCell className="text-right">AED {totalExpenses.toFixed(2)}</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </>
      ) : (
        <div className="text-center py-8 text-slate-500">
          No expenses recorded yet. Add your first expense to start tracking.
        </div>
      )}
    </Card>
  );
};

export default ExpenseTracker;