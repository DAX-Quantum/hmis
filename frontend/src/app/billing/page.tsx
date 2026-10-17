'use client';

import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { api } from '@/lib/api';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog } from '@/components/ui/dialog';
import { Input, Select } from '@/components/ui/input';
import { RoleGate } from '@/components/auth/RoleGate';
import {
  Receipt,
  Plus,
  CreditCard,
  Printer,
  DollarSign,
  CheckCircle2,
  AlertCircle,
  Eye,
  Activity,
  Trash2,
  ShieldCheck,
  TrendingUp,
} from 'lucide-react';
import Link from 'next/link';

export default function BillingPage() {
  const [invoices, setInvoices] = useState<any[]>([]);
  const [patients, setPatients] = useState<any[]>([]);
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [isPayOpen, setIsPayOpen] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // Payment dialog state
  const [paymentAmount, setPaymentAmount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState('CREDIT_CARD');
  const [paymentTxnRef, setPaymentTxnRef] = useState('');
  const [paymentNotes, setPaymentNotes] = useState('Hospital Counter / Gateway Settlement');
  const [isPaying, setIsPaying] = useState(false);

  // Create invoice state
  const [newPatientId, setNewPatientId] = useState('');
  const [newDiscount, setNewDiscount] = useState(0);
  const [newItems, setNewItems] = useState<Array<{ itemType: string; description: string; quantity: number; unitPrice: number }>>([
    { itemType: 'CONSULTATION', description: 'Specialist Medical Evaluation', quantity: 1, unitPrice: 120 },
  ]);
  const [isCreating, setIsCreating] = useState(false);

  const loadInvoices = async () => {
    setIsLoading(true);
    try {
      const [invRes, patRes] = await Promise.all([
        api.get(`/billing/invoices${statusFilter ? `?status=${statusFilter}` : ''}`),
        api.get('/patients?limit=50'),
      ]);
      setInvoices(invRes || []);
      setPatients(patRes.data || []);
      if (patRes.data?.length > 0) setNewPatientId(patRes.data[0].id);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadInvoices();
  }, [statusFilter]);

  const openPayModal = (inv: any) => {
    setSelectedInvoice(inv);
    const balance = Number(inv.payableAmount) - Number(inv.paidAmount);
    setPaymentAmount(Number(balance.toFixed(2)));
    setPaymentTxnRef('');
    setPaymentNotes('Hospital Counter / Gateway Settlement');
    setIsPayOpen(true);
  };

  const openViewModal = async (inv: any) => {
    try {
      const detailed = await api.get(`/billing/invoices/${inv.id}`);
      setSelectedInvoice(detailed || inv);
    } catch {
      setSelectedInvoice(inv);
    }
    setIsViewOpen(true);
  };

  const handleProcessPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInvoice) return;

    setIsPaying(true);
    try {
      await api.post('/billing/payments', {
        invoiceId: selectedInvoice.id,
        amount: Number(paymentAmount),
        paymentMethod,
        transactionReference: paymentTxnRef.trim() || undefined,
        notes: paymentNotes.trim() || undefined,
      });
      setIsPayOpen(false);
      loadInvoices();
    } catch (err: any) {
      alert(err.message || 'Payment processing failed');
    } finally {
      setIsPaying(false);
    }
  };

  const addLineItem = () => {
    setNewItems([
      ...newItems,
      { itemType: 'PHARMACY', description: 'Pharmaceutical Supplies', quantity: 1, unitPrice: 35 },
    ]);
  };

  const removeLineItem = (index: number) => {
    setNewItems(newItems.filter((_, i) => i !== index));
  };

  const updateLineItem = (index: number, field: string, val: any) => {
    const copy = [...newItems];
    copy[index] = { ...copy[index], [field]: val };
    setNewItems(copy);
  };

  const handleCreateInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreating(true);
    try {
      await api.post('/billing/invoices', {
        patientId: newPatientId,
        discountAmount: Number(newDiscount),
        items: newItems,
      });
      setIsCreateOpen(false);
      loadInvoices();
    } catch (err: any) {
      alert(err.message || 'Failed to create invoice');
    } finally {
      setIsCreating(false);
    }
  };

  const totalBilled = invoices.reduce((sum, inv) => sum + Number(inv.payableAmount || 0), 0);
  const totalCollected = invoices.reduce((sum, inv) => sum + Number(inv.paidAmount || 0), 0);
  const totalOutstanding = Math.max(0, totalBilled - totalCollected);
  const collectionRate = totalBilled > 0 ? ((totalCollected / totalBilled) * 100).toFixed(1) : '100';

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Receipt className="w-6 h-6 text-blue-600" /> Invoicing, Billing & Revenue
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Patient accounts, consultation fees, lab diagnostic charges, taxes, and payment gateways
            </p>
          </div>

          <RoleGate allowedRoles={['SUPER_ADMIN', 'ADMIN', 'ACCOUNTANT', 'RECEPTIONIST']}>
            <Button onClick={() => setIsCreateOpen(true)}>
              <Plus className="w-4 h-4 mr-1.5" /> Generate New Invoice
            </Button>
          </RoleGate>
        </div>

        {/* Financial KPI Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="border-l-4 border-l-blue-500">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Total Invoiced (Gross)</p>
                <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 mt-0.5">
                  ${totalBilled.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </h3>
                <span className="text-[11px] text-slate-400">{invoices.length} total patient accounts</span>
              </div>
              <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 flex items-center justify-center">
                <Receipt className="w-5 h-5" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-emerald-500">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Settled Cashflow</p>
                <h3 className="text-xl font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
                  ${totalCollected.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </h3>
                <span className="text-[11px] text-emerald-600 font-semibold">{collectionRate}% collection rate</span>
              </div>
              <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-amber-500">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Outstanding Balance</p>
                <h3 className="text-xl font-bold text-amber-600 dark:text-amber-400 mt-0.5">
                  ${totalOutstanding.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </h3>
                <span className="text-[11px] text-slate-400">
                  {invoices.filter((i) => i.status !== 'PAID').length} pending settlement
                </span>
              </div>
              <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 flex items-center justify-center">
                <DollarSign className="w-5 h-5" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-purple-500">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Settled Invoices</p>
                <h3 className="text-xl font-bold text-purple-600 dark:text-purple-400 mt-0.5">
                  {invoices.filter((i) => i.status === 'PAID').length} / {invoices.length}
                </h3>
                <span className="text-[11px] text-purple-500 font-medium">100% Tax & Audit Compliant</span>
              </div>
              <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 flex items-center justify-center">
                <Activity className="w-5 h-5" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filter Bar */}
        <Card>
          <CardContent className="p-3.5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-500">Invoice Status:</span>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 p-1.5"
              >
                <option value="">All Invoices</option>
                <option value="PENDING">Pending Payment</option>
                <option value="PARTIALLY_PAID">Partially Paid</option>
                <option value="PAID">Paid in Full</option>
                <option value="CANCELLED">Cancelled</option>
              </select>
            </div>

            <span className="text-xs text-slate-400">Showing {invoices.length} invoices</span>
          </CardContent>
        </Card>

        {/* Invoices Table */}
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Invoice #</TableHead>
                <TableHead>Patient Details</TableHead>
                <TableHead>Issued Date</TableHead>
                <TableHead>Due Date</TableHead>
                <TableHead>Total Payable</TableHead>
                <TableHead>Amount Paid</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-10 text-slate-400 text-xs">
                    Loading invoices...
                  </TableCell>
                </TableRow>
              ) : invoices.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-10 text-slate-400 text-xs">
                    No invoices found.
                  </TableCell>
                </TableRow>
              ) : (
                invoices.map((inv) => (
                  <TableRow key={inv.id}>
                    <TableCell className="font-mono text-xs font-semibold text-purple-600">
                      {inv.invoiceNumber}
                    </TableCell>
                    <TableCell>
                      <Link
                        href={`/patients/${inv.patient?.id}`}
                        className="font-semibold text-slate-900 dark:text-slate-100 hover:text-blue-600 block text-xs"
                      >
                        {inv.patient?.firstName} {inv.patient?.lastName}
                      </Link>
                      <span className="font-mono text-[11px] text-slate-400">{inv.patient?.mrn}</span>
                    </TableCell>
                    <TableCell className="text-xs font-mono">
                      {new Date(inv.issuedAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-xs font-mono text-slate-500">
                      {inv.dueDate ? new Date(inv.dueDate).toLocaleDateString() : 'Upon receipt'}
                    </TableCell>
                    <TableCell className="text-xs font-bold text-slate-900 dark:text-slate-100">
                      ${Number(inv.payableAmount).toFixed(2)}
                    </TableCell>
                    <TableCell className="text-xs font-medium text-emerald-600">
                      ${Number(inv.paidAmount).toFixed(2)}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          inv.status === 'PAID'
                            ? 'success'
                            : inv.status === 'PARTIALLY_PAID'
                            ? 'warning'
                            : 'danger'
                        }
                      >
                        {inv.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openViewModal(inv)}
                        >
                          <Eye className="w-3.5 h-3.5 mr-1" /> View / Print
                        </Button>

                        {inv.status !== 'PAID' && (
                          <RoleGate allowedRoles={['SUPER_ADMIN', 'ADMIN', 'ACCOUNTANT', 'RECEPTIONIST']}>
                            <Button size="sm" onClick={() => openPayModal(inv)}>
                              <CreditCard className="w-3.5 h-3.5 mr-1" /> Settle
                            </Button>
                          </RoleGate>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </Card>
      </div>

      {/* Settle / Pay Dialog */}
      <Dialog
        isOpen={isPayOpen}
        onClose={() => setIsPayOpen(false)}
        title={selectedInvoice ? `Settle Payment: #${selectedInvoice.invoiceNumber}` : 'Payment'}
        description="Process checkout transaction (Supports Cash, Card, UPI, and Insurance claim integration)"
        maxWidth="md"
      >
        {selectedInvoice && (
          <form onSubmit={handleProcessPayment} className="space-y-4">
            <div className="p-3.5 rounded-xl bg-purple-50 dark:bg-purple-950/20 text-xs space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-purple-700 dark:text-purple-300 font-medium">Remaining Balance Due:</span>
                <strong className="text-purple-900 dark:text-purple-100 font-mono text-base">
                  ${(Number(selectedInvoice.payableAmount || 0) - Number(selectedInvoice.paidAmount || 0)).toFixed(2)}
                </strong>
              </div>
              <div className="flex items-center gap-2 pt-1 border-t border-purple-200/60 dark:border-purple-800/40">
                <span className="text-[11px] text-purple-700 dark:text-purple-300">Quick Fill:</span>
                <button
                  type="button"
                  onClick={() => {
                    const rem = Number(selectedInvoice.payableAmount || 0) - Number(selectedInvoice.paidAmount || 0);
                    setPaymentAmount(Number((rem * 0.25).toFixed(2)));
                  }}
                  className="text-[11px] px-2 py-0.5 rounded-md bg-white dark:bg-purple-900/60 border border-purple-200 dark:border-purple-800 text-purple-800 dark:text-purple-200 font-medium hover:bg-purple-100"
                >
                  25%
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const rem = Number(selectedInvoice.payableAmount || 0) - Number(selectedInvoice.paidAmount || 0);
                    setPaymentAmount(Number((rem * 0.5).toFixed(2)));
                  }}
                  className="text-[11px] px-2 py-0.5 rounded-md bg-white dark:bg-purple-900/60 border border-purple-200 dark:border-purple-800 text-purple-800 dark:text-purple-200 font-medium hover:bg-purple-100"
                >
                  50%
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const rem = Number(selectedInvoice.payableAmount || 0) - Number(selectedInvoice.paidAmount || 0);
                    setPaymentAmount(Number(rem.toFixed(2)));
                  }}
                  className="text-[11px] px-2 py-0.5 rounded-md bg-purple-600 text-white font-medium hover:bg-purple-700"
                >
                  Full 100%
                </button>
              </div>
            </div>

            <Input
              label="Payment Amount ($)"
              type="number"
              step="0.01"
              min={0.01}
              max={Number(selectedInvoice.payableAmount || 0) - Number(selectedInvoice.paidAmount || 0)}
              required
              value={paymentAmount}
              onChange={(e) => setPaymentAmount(Number(e.target.value))}
            />

            <Select
              label="Payment Method"
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
              options={[
                { label: 'Credit Card (Visa / Mastercard / Amex)', value: 'CREDIT_CARD' },
                { label: 'Debit Card', value: 'DEBIT_CARD' },
                { label: 'UPI / Instant QR Code', value: 'UPI' },
                { label: 'Cash (Hospital Front Counter)', value: 'CASH' },
                { label: 'Insurance Direct TPA Claim', value: 'INSURANCE' },
                { label: 'Bank Wire / NEFT Transfer', value: 'BANK_TRANSFER' },
              ]}
            />

            <Input
              label="Transaction Reference / Gateway Auth ID (Optional)"
              type="text"
              placeholder="e.g. AUTH-VISA-8819 or UPI-REF-49102"
              value={paymentTxnRef}
              onChange={(e) => setPaymentTxnRef(e.target.value)}
            />

            <Input
              label="Cashier / Settlement Notes"
              type="text"
              placeholder="e.g. Front desk receipt payment"
              value={paymentNotes}
              onChange={(e) => setPaymentNotes(e.target.value)}
            />

            <div className="pt-2 flex justify-end gap-2.5">
              <Button type="button" variant="outline" onClick={() => setIsPayOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" isLoading={isPaying}>
                Confirm Settle Transaction
              </Button>
            </div>
          </form>
        )}
      </Dialog>

      {/* Printable Invoice Modal */}
      <Dialog
        isOpen={isViewOpen}
        onClose={() => setIsViewOpen(false)}
        title="Official Hospital Tax Invoice"
        description="Itemized medical billing statement with receipt breakdown"
        maxWidth="xl"
      >
        {selectedInvoice && (
          <div className="space-y-6">
            <div id="printable-invoice" className="p-6 bg-white text-slate-900 rounded-xl border border-slate-200 text-xs">
              {/* Header */}
              <div className="flex items-start justify-between border-b-2 border-slate-900 pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <Activity className="w-6 h-6 text-blue-600" />
                    <h2 className="text-base font-bold tracking-tight text-slate-900 uppercase">
                      HMIS Health Healthcare System
                    </h2>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    100 Metro Health Avenue, Medical Center • Tax ID: 99-881920-X
                  </p>
                </div>
                <div className="text-right">
                  <span className="font-mono text-sm font-bold text-purple-700 block">
                    {selectedInvoice.invoiceNumber}
                  </span>
                  <span className="text-[11px] text-slate-500">
                    Date: {new Date(selectedInvoice.issuedAt).toLocaleDateString()}
                  </span>
                </div>
              </div>

              {/* Patient & Insurance Details */}
              <div className="py-3 border-b border-slate-200 flex justify-between items-start">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Bill To:</span>
                  <p className="font-bold text-slate-900 text-sm">
                    {selectedInvoice.patient?.firstName} {selectedInvoice.patient?.lastName}
                  </p>
                  <p className="text-slate-600">MRN: {selectedInvoice.patient?.mrn}</p>
                  <p className="text-slate-600">Phone: {selectedInvoice.patient?.phone}</p>
                  {selectedInvoice.patient?.insuranceProvider ? (
                    <div className="mt-1.5 inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-blue-50 border border-blue-200 text-blue-700 text-[11px] font-medium">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      <span>
                        {selectedInvoice.patient.insuranceProvider} • Policy #{selectedInvoice.patient.insurancePolicyNumber || 'ACTIVE'}
                      </span>
                    </div>
                  ) : (
                    <div className="mt-1 text-slate-400 text-[11px]">Direct Patient Self-Pay Account</div>
                  )}
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Settlement Status:</span>
                  <span className="font-bold text-sm text-slate-900">{selectedInvoice.status}</span>
                  {selectedInvoice.dueDate && (
                    <p className="text-slate-500 text-[11px] mt-0.5">
                      Due: {new Date(selectedInvoice.dueDate).toLocaleDateString()}
                    </p>
                  )}
                </div>
              </div>

              {/* Items */}
              <div className="py-4">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-500 text-[10px] uppercase font-bold">
                      <th className="py-1.5">Description</th>
                      <th className="py-1.5">Category</th>
                      <th className="py-1.5 text-center">Qty</th>
                      <th className="py-1.5 text-right">Unit Price</th>
                      <th className="py-1.5 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {selectedInvoice.items?.map((item: any, i: number) => (
                      <tr key={i}>
                        <td className="py-2 font-medium">{item.description}</td>
                        <td className="py-2 text-slate-500 text-[11px]">{item.itemType}</td>
                        <td className="py-2 text-center">{item.quantity}</td>
                        <td className="py-2 text-right">${Number(item.unitPrice).toFixed(2)}</td>
                        <td className="py-2 text-right font-semibold">
                          ${Number(item.totalPrice).toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Totals */}
              <div className="pt-3 border-t border-slate-200 space-y-1.5 text-right">
                <div className="flex justify-end gap-6 text-slate-600">
                  <span>Subtotal:</span>
                  <span className="font-medium">${Number(selectedInvoice.totalAmount).toFixed(2)}</span>
                </div>
                {Number(selectedInvoice.discountAmount) > 0 && (
                  <div className="flex justify-end gap-6 text-slate-600">
                    <span>Discount:</span>
                    <span className="text-rose-600">-${Number(selectedInvoice.discountAmount).toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-end gap-6 text-slate-600">
                  <span>Healthcare Tax (5%):</span>
                  <span className="font-medium">${Number(selectedInvoice.taxAmount).toFixed(2)}</span>
                </div>
                <div className="flex justify-end gap-6 text-base font-bold text-slate-900 pt-1 border-t border-slate-200">
                  <span>Total Payable:</span>
                  <span>${Number(selectedInvoice.payableAmount).toFixed(2)}</span>
                </div>
                <div className="flex justify-end gap-6 text-emerald-600 font-semibold">
                  <span>Amount Paid:</span>
                  <span>${Number(selectedInvoice.paidAmount).toFixed(2)}</span>
                </div>
                <div className="flex justify-end gap-6 text-slate-700 font-bold border-t border-dashed border-slate-200 pt-1">
                  <span>Remaining Balance:</span>
                  <span className={Number(selectedInvoice.payableAmount) - Number(selectedInvoice.paidAmount) > 0 ? 'text-amber-600' : 'text-emerald-600'}>
                    ${Math.max(0, Number(selectedInvoice.payableAmount) - Number(selectedInvoice.paidAmount)).toFixed(2)}
                  </span>
                </div>
              </div>

              {/* Payment Receipts & Transaction Ledger */}
              {selectedInvoice.payments && selectedInvoice.payments.length > 0 && (
                <div className="mt-5 pt-4 border-t-2 border-slate-200">
                  <h4 className="text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-2">
                    Settlement Receipts & Transaction History
                  </h4>
                  <table className="w-full text-left text-[11px]">
                    <thead>
                      <tr className="border-b border-slate-200 text-slate-400 uppercase font-bold text-[10px]">
                        <th className="py-1">Receipt #</th>
                        <th className="py-1">Date</th>
                        <th className="py-1">Method</th>
                        <th className="py-1">Reference</th>
                        <th className="py-1 text-right">Settled Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {selectedInvoice.payments.map((p: any) => (
                        <tr key={p.id}>
                          <td className="py-1 font-mono font-semibold text-purple-700">{p.paymentNumber}</td>
                          <td className="py-1">{new Date(p.createdAt).toLocaleDateString()}</td>
                          <td className="py-1 font-medium">{p.paymentMethod}</td>
                          <td className="py-1 font-mono text-slate-500 text-[10px]">{p.transactionReference || 'GATEWAY-OK'}</td>
                          <td className="py-1 text-right font-bold text-emerald-600">${Number(p.amount).toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2.5">
              <Button variant="outline" onClick={() => setIsViewOpen(false)}>
                Close
              </Button>
              <Button onClick={() => window.print()}>
                <Printer className="w-4 h-4 mr-1.5" /> Print Tax Invoice
              </Button>
            </div>
          </div>
        )}
      </Dialog>

      {/* Create Invoice Dialog */}
      <Dialog
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="Create Patient Medical Invoice"
        description="Itemize consultation charges, diagnostic tests, procedures, and applied discounts"
        maxWidth="lg"
      >
        <form onSubmit={handleCreateInvoice} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
              Select Patient
            </label>
            <select
              value={newPatientId}
              onChange={(e) => setNewPatientId(e.target.value)}
              className="w-full text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 p-2"
            >
              {patients.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.firstName} {p.lastName} ({p.mrn})
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Invoice Line Items
              </span>
              <Button type="button" size="sm" variant="outline" onClick={addLineItem}>
                <Plus className="w-3.5 h-3.5 mr-1" /> Add Item
              </Button>
            </div>

            {newItems.map((item, i) => (
              <div
                key={i}
                className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 grid grid-cols-12 gap-2.5 items-end"
              >
                <div className="col-span-3">
                  <label className="block text-[10px] text-slate-500 mb-1">Category</label>
                  <select
                    value={item.itemType}
                    onChange={(e) => updateLineItem(i, 'itemType', e.target.value)}
                    className="w-full text-xs rounded-md border border-slate-300 dark:border-slate-700 p-1.5"
                  >
                    <option value="CONSULTATION">Consultation</option>
                    <option value="LAB_TEST">Lab Test</option>
                    <option value="PHARMACY">Pharmacy</option>
                    <option value="ROOM_CHARGE">Room Charge</option>
                    <option value="PROCEDURE">Procedure</option>
                  </select>
                </div>

                <div className="col-span-4">
                  <label className="block text-[10px] text-slate-500 mb-1">Description</label>
                  <input
                    value={item.description}
                    onChange={(e) => updateLineItem(i, 'description', e.target.value)}
                    className="w-full text-xs rounded-md border border-slate-300 dark:border-slate-700 p-1.5"
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-[10px] text-slate-500 mb-1">Qty</label>
                  <input
                    type="number"
                    min={1}
                    value={item.quantity}
                    onChange={(e) => updateLineItem(i, 'quantity', Number(e.target.value))}
                    className="w-full text-xs rounded-md border border-slate-300 dark:border-slate-700 p-1.5"
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-[10px] text-slate-500 mb-1">Price ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={item.unitPrice}
                    onChange={(e) => updateLineItem(i, 'unitPrice', Number(e.target.value))}
                    className="w-full text-xs rounded-md border border-slate-300 dark:border-slate-700 p-1.5"
                  />
                </div>

                <div className="col-span-1 flex justify-center pb-1">
                  <button
                    type="button"
                    onClick={() => removeLineItem(i)}
                    className="text-slate-400 hover:text-rose-500"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          <Input
            label="Applied Promotional Discount ($)"
            type="number"
            step="0.01"
            value={newDiscount}
            onChange={(e) => setNewDiscount(Number(e.target.value))}
          />

          <div className="pt-2 flex justify-end gap-2.5">
            <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" isLoading={isCreating}>
              Generate Invoice
            </Button>
          </div>
        </form>
      </Dialog>
    </DashboardLayout>
  );
}
