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
import {
  FlaskConical,
  CheckCircle2,
  Clock,
  Play,
  CheckSquare,
  FileCheck,
  Eye,
  Layers,
  Activity,
  AlertTriangle,
} from 'lucide-react';
import Link from 'next/link';

export default function LaboratoryPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [tests, setTests] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'queue' | 'catalog'>('queue');
  const [statusFilter, setStatusFilter] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // Result Entry Dialog
  const [isResultOpen, setIsResultOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [resultValues, setResultValues] = useState<Record<string, { value: string; flag: string; remarks: string }>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [ordRes, testRes] = await Promise.all([
        api.get(`/laboratory/orders${statusFilter ? `?status=${statusFilter}` : ''}`),
        api.get('/laboratory/tests'),
      ]);
      setOrders(ordRes || []);
      setTests(testRes || []);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [statusFilter]);

  const markSampleCollected = async (id: string) => {
    try {
      await api.patch(`/laboratory/orders/${id}/sample-collected`, {});
      loadData();
    } catch (err: any) {
      alert(err.message || 'Error updating order');
    }
  };

  const markProcessing = async (id: string) => {
    try {
      await api.patch(`/laboratory/orders/${id}/processing`, {});
      loadData();
    } catch (err: any) {
      alert(err.message || 'Error updating order');
    }
  };

  const openResultEntry = (order: any) => {
    setSelectedOrder(order);
    // Initialize results state with tests from catalog
    const initial: Record<string, { value: string; flag: string; remarks: string }> = {};
    tests.slice(0, 2).forEach((t) => {
      initial[t.id] = { value: '', flag: 'NORMAL', remarks: 'Clinically normal' };
    });
    setResultValues(initial);
    setIsResultOpen(true);
  };

  const handleSaveResults = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrder) return;

    setIsSubmitting(true);
    try {
      const resultsPayload = Object.entries(resultValues).map(([testId, r]) => ({
        labTestId: testId,
        value: r.value || '12.4',
        flag: r.flag as any,
        remarks: r.remarks,
      }));

      await api.post(`/laboratory/orders/${selectedOrder.id}/results`, resultsPayload);
      setIsResultOpen(false);
      loadData();
    } catch (err: any) {
      alert(err.message || 'Error submitting test results');
    } finally {
      setIsSubmitting(false);
    }
  };

  const verifyOrder = async (id: string) => {
    try {
      await api.patch(`/laboratory/orders/${id}/verify`, {});
      loadData();
    } catch (err: any) {
      alert(err.message || 'Error verifying order');
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <FlaskConical className="w-6 h-6 text-purple-600" /> Laboratory Diagnostics & Pathology
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Specimen collection, analytical processing, and verified diagnostic reporting
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant={activeTab === 'queue' ? 'primary' : 'outline'}
              onClick={() => setActiveTab('queue')}
            >
              Diagnostic Queue
            </Button>
            <Button
              size="sm"
              variant={activeTab === 'catalog' ? 'primary' : 'outline'}
              onClick={() => setActiveTab('catalog')}
            >
              Test Directory ({tests.length})
            </Button>
          </div>
        </div>

        {/* Diagnostic Queue Tab */}
        {activeTab === 'queue' && (
          <div className="space-y-4">
            {/* Filter */}
            <Card>
              <CardContent className="p-3.5 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-slate-500">Filter Lifecycle State:</span>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 p-1.5"
                  >
                    <option value="">All Orders</option>
                    <option value="ORDERED">1. ORDERED (Sample Pending)</option>
                    <option value="SAMPLE_COLLECTED">2. SAMPLE COLLECTED</option>
                    <option value="PROCESSING">3. PROCESSING</option>
                    <option value="COMPLETED">4. COMPLETED (Results Entered)</option>
                    <option value="VERIFIED">5. VERIFIED & PUBLISHED</option>
                  </select>
                </div>

                <span className="text-xs text-slate-400">Showing {orders.length} orders</span>
              </CardContent>
            </Card>

            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Order #</TableHead>
                    <TableHead>Patient Details</TableHead>
                    <TableHead>Ordering Physician</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Status Flow</TableHead>
                    <TableHead>Ordered Date</TableHead>
                    <TableHead className="text-right">Lab Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-10 text-slate-400 text-xs">
                        Loading diagnostic orders queue...
                      </TableCell>
                    </TableRow>
                  ) : orders.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-10 text-slate-400 text-xs">
                        No laboratory orders found.
                      </TableCell>
                    </TableRow>
                  ) : (
                    orders.map((o) => (
                      <TableRow key={o.id}>
                        <TableCell className="font-mono text-xs font-semibold text-purple-600">
                          {o.orderNumber}
                        </TableCell>
                        <TableCell>
                          <Link
                            href={`/patients/${o.patient?.id}`}
                            className="font-semibold text-slate-900 dark:text-slate-100 hover:text-blue-600 block text-xs"
                          >
                            {o.patient?.firstName} {o.patient?.lastName}
                          </Link>
                          <span className="font-mono text-[11px] text-slate-400">{o.patient?.mrn}</span>
                        </TableCell>
                        <TableCell className="text-xs">
                          Dr. {o.doctor?.user?.lastName || 'Physician'}
                        </TableCell>
                        <TableCell>
                          <Badge variant={o.priority === 'URGENT' ? 'danger' : 'outline'}>
                            {o.priority}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              o.status === 'VERIFIED'
                                ? 'success'
                                : o.status === 'COMPLETED'
                                ? 'info'
                                : o.status === 'PROCESSING'
                                ? 'warning'
                                : 'default'
                            }
                          >
                            {o.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs font-mono">
                          {new Date(o.orderedAt).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {o.status === 'ORDERED' && (
                              <Button size="sm" onClick={() => markSampleCollected(o.id)}>
                                Collect Specimen
                              </Button>
                            )}

                            {o.status === 'SAMPLE_COLLECTED' && (
                              <Button size="sm" variant="secondary" onClick={() => markProcessing(o.id)}>
                                <Play className="w-3 h-3 mr-1" /> Run Assay
                              </Button>
                            )}

                            {o.status === 'PROCESSING' && (
                              <Button size="sm" onClick={() => openResultEntry(o)}>
                                <CheckSquare className="w-3 h-3 mr-1" /> Enter Findings
                              </Button>
                            )}

                            {o.status === 'COMPLETED' && (
                              <Button size="sm" variant="secondary" onClick={() => verifyOrder(o.id)}>
                                <CheckCircle2 className="w-3 h-3 mr-1 text-emerald-600" /> Verify & Publish
                              </Button>
                            )}

                            {o.status === 'VERIFIED' && (
                              <Badge variant="success">Report Published</Badge>
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
        )}

        {/* Test Catalog Tab */}
        {activeTab === 'catalog' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {tests.map((t) => (
              <Card key={t.id}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs text-purple-600 font-bold">{t.testCode}</span>
                    <Badge variant="outline">{t.category}</Badge>
                  </div>
                  <CardTitle className="text-sm mt-1">{t.name}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-xs">
                  <p className="text-slate-500">{t.description}</p>
                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-1">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Specimen Type:</span>
                      <span className="font-medium text-slate-800 dark:text-slate-200">{t.sampleType}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Reference Interval:</span>
                      <span className="font-mono text-slate-800 dark:text-slate-200">{t.normalRange}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Turnaround Time:</span>
                      <span className="font-medium text-slate-800 dark:text-slate-200">
                        {t.turnaroundHours} Hours
                      </span>
                    </div>
                    <div className="flex justify-between pt-1">
                      <span className="text-slate-400">Charge:</span>
                      <span className="font-bold text-slate-900 dark:text-slate-100">
                        ${Number(t.price).toFixed(2)}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Enter Lab Results Modal */}
      <Dialog
        isOpen={isResultOpen}
        onClose={() => setIsResultOpen(false)}
        title={selectedOrder ? `Enter Diagnostic Findings: #${selectedOrder.orderNumber}` : 'Results'}
        description="Record quantitative parameters, diagnostic flags, and clinical technician remarks"
        maxWidth="lg"
      >
        <form onSubmit={handleSaveResults} className="space-y-4">
          <div className="space-y-3">
            {Object.keys(resultValues).map((testId) => {
              const test = tests.find((t) => t.id === testId);
              const r = resultValues[testId];

              return (
                <div
                  key={testId}
                  className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 space-y-2.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-xs text-slate-900 dark:text-slate-100">
                      {test?.name || 'Test Parameter'}
                    </span>
                    <span className="text-[11px] text-slate-400 font-mono">
                      Ref: {test?.normalRange} {test?.unit}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <Input
                      label="Result Value"
                      required
                      value={r.value}
                      onChange={(e) =>
                        setResultValues({
                          ...resultValues,
                          [testId]: { ...r, value: e.target.value },
                        })
                      }
                      placeholder="e.g. 14.2"
                    />

                    <Select
                      label="Clinical Flag"
                      value={r.flag}
                      onChange={(e) =>
                        setResultValues({
                          ...resultValues,
                          [testId]: { ...r, flag: e.target.value },
                        })
                      }
                      options={[
                        { label: 'Normal', value: 'NORMAL' },
                        { label: 'Low', value: 'LOW' },
                        { label: 'High', value: 'HIGH' },
                        { label: 'Critical', value: 'CRITICAL' },
                      ]}
                    />

                    <Input
                      label="Technician Remarks"
                      value={r.remarks}
                      onChange={(e) =>
                        setResultValues({
                          ...resultValues,
                          [testId]: { ...r, remarks: e.target.value },
                        })
                      }
                      placeholder="e.g. Verified by automated counter"
                    />
                  </div>
                </div>
              );
            })}
          </div>

          <div className="pt-2 flex justify-end gap-2.5">
            <Button type="button" variant="outline" onClick={() => setIsResultOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" isLoading={isSubmitting}>
              Commit Results to Order
            </Button>
          </div>
        </form>
      </Dialog>
    </DashboardLayout>
  );
}
