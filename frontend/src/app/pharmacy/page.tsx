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
  Pill,
  AlertTriangle,
  Plus,
  ArrowDownCircle,
  ArrowUpCircle,
  History,
  Layers,
  Search,
  CheckCircle2,
  Boxes,
  ShieldAlert,
  Calendar,
} from 'lucide-react';

export default function PharmacyPage() {
  const [medicines, setMedicines] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'catalog' | 'transactions'>('catalog');
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // Dispense modal
  const [isDispenseOpen, setIsDispenseOpen] = useState(false);
  const [selectedMed, setSelectedMed] = useState<any>(null);
  const [dispenseQty, setDispenseQty] = useState(1);
  const [dispenseNotes, setDispenseNotes] = useState('Outpatient OTC / Prescribed Dispense');
  const [isDispensing, setIsDispensing] = useState(false);

  // Restock modal
  const [isRestockOpen, setIsRestockOpen] = useState(false);
  const [restockBatch, setRestockBatch] = useState('BATCH-2026-9001');
  const [restockQty, setRestockQty] = useState(100);
  const [restockCost, setRestockCost] = useState(10.0);
  const [restockExpiry, setRestockExpiry] = useState('2028-12-31');
  const [isRestocking, setIsRestocking] = useState(false);

  // Batch inspector modal
  const [isBatchOpen, setIsBatchOpen] = useState(false);
  const [selectedBatchMed, setSelectedBatchMed] = useState<any>(null);

  const loadData = async (query = '') => {
    setIsLoading(true);
    try {
      const [meds, txs] = await Promise.all([
        api.get(`/pharmacy/medicines${query ? `?search=${encodeURIComponent(query)}` : ''}`),
        api.get('/pharmacy/transactions'),
      ]);
      setMedicines(meds || []);
      setTransactions(txs || []);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => loadData(search), 250);
    return () => clearTimeout(timer);
  }, [search]);

  const handleDispense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMed) return;

    setIsDispensing(true);
    try {
      await api.post('/pharmacy/dispense', {
        medicineId: selectedMed.id,
        quantity: Number(dispenseQty),
        notes: dispenseNotes,
      });
      setIsDispenseOpen(false);
      loadData(search);
    } catch (err: any) {
      alert(err.message || 'Dispensing failed');
    } finally {
      setIsDispensing(false);
    }
  };

  const handleRestock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMed) return;

    setIsRestocking(true);
    try {
      await api.post('/pharmacy/restock', {
        medicineId: selectedMed.id,
        batchNumber: restockBatch,
        expiryDate: restockExpiry,
        quantity: Number(restockQty),
        purchaseCost: Number(restockCost),
      });
      setIsRestockOpen(false);
      loadData(search);
    } catch (err: any) {
      alert(err.message || 'Restocking failed');
    } finally {
      setIsRestocking(false);
    }
  };

  const totalMeds = medicines.length;
  const totalUnits = medicines.reduce((sum, m) => sum + (m.totalStock || 0), 0);
  const lowStockCount = medicines.filter((m) => m.isLowStock).length;
  const healthyRate = totalMeds > 0 ? (((totalMeds - lowStockCount) / totalMeds) * 100).toFixed(0) : '100';

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Pill className="w-6 h-6 text-blue-600" /> Central Pharmacy & Formulary
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Pharmaceutical inventory management, FEFO dispensing, batch expiration, and automated reorder alerts
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant={activeTab === 'catalog' ? 'primary' : 'outline'}
              onClick={() => setActiveTab('catalog')}
            >
              Medication Catalog
            </Button>
            <Button
              size="sm"
              variant={activeTab === 'transactions' ? 'primary' : 'outline'}
              onClick={() => setActiveTab('transactions')}
            >
              <History className="w-3.5 h-3.5 mr-1" /> Inventory Ledger
            </Button>
          </div>
        </div>

        {/* Pharmacy KPI Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="border-l-4 border-l-blue-500">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Total Formulary Medications</p>
                <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 mt-0.5">
                  {totalMeds} Active Drugs
                </h3>
                <span className="text-[11px] text-slate-400">Standardized clinical catalog</span>
              </div>
              <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 flex items-center justify-center">
                <Pill className="w-5 h-5" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-emerald-500">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Warehouse Units in Stock</p>
                <h3 className="text-xl font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
                  {totalUnits.toLocaleString()} units
                </h3>
                <span className="text-[11px] text-emerald-600 font-semibold">{healthyRate}% in healthy stock</span>
              </div>
              <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 flex items-center justify-center">
                <Boxes className="w-5 h-5" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-amber-500">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Critical Low Stock</p>
                <h3 className="text-xl font-bold text-amber-600 dark:text-amber-400 mt-0.5">
                  {lowStockCount} items
                </h3>
                <span className="text-[11px] text-slate-400">At or below reorder threshold</span>
              </div>
              <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 flex items-center justify-center">
                <ShieldAlert className="w-5 h-5" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-purple-500">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Inventory Ledger Audit</p>
                <h3 className="text-xl font-bold text-purple-600 dark:text-purple-400 mt-0.5">
                  {transactions.length} movements
                </h3>
                <span className="text-[11px] text-purple-500 font-medium">FEFO Verified</span>
              </div>
              <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 flex items-center justify-center">
                <History className="w-5 h-5" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Low Stock Banner if any */}
        {lowStockCount > 0 && (
          <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between text-xs text-amber-700 dark:text-amber-300">
            <div className="flex items-center gap-2.5">
              <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />
              <span>
                <strong>Attention:</strong> {lowStockCount} medication(s) are currently below reorder thresholds. Restock shipments recommended.
              </span>
            </div>
            <span className="font-semibold text-amber-800 dark:text-amber-200">Reorder Priority</span>
          </div>
        )}

        {/* Search */}
        {activeTab === 'catalog' && (
          <Card>
            <CardContent className="p-4">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search medication by brand name, generic formulation, or drug code (e.g. Paracetamol, MED-001)..."
                  className="w-full pl-9 pr-4 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </CardContent>
          </Card>
        )}

        {/* TAB 1: MEDICINE CATALOG */}
        {activeTab === 'catalog' && (
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Medicine Name</TableHead>
                  <TableHead>Generic Compound</TableHead>
                  <TableHead>Therapeutic Class</TableHead>
                  <TableHead>Dosage Form</TableHead>
                  <TableHead>Unit Price</TableHead>
                  <TableHead>Stock Level</TableHead>
                  <TableHead className="text-right">Pharmacy Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-10 text-slate-400 text-xs">
                      Loading pharmacy formulary...
                    </TableCell>
                  </TableRow>
                ) : (
                  medicines.map((m) => (
                    <TableRow key={m.id}>
                      <TableCell className="font-mono text-xs font-semibold text-slate-500">
                        {m.code}
                      </TableCell>
                      <TableCell>
                        <span className="font-semibold text-slate-900 dark:text-slate-100 block text-xs">
                          {m.name}
                        </span>
                        <span className="text-[11px] text-slate-400">{m.manufacturer}</span>
                      </TableCell>
                      <TableCell className="text-xs text-slate-600 dark:text-slate-400">
                        {m.genericName}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{m.category}</Badge>
                      </TableCell>
                      <TableCell className="text-xs">{m.form}</TableCell>
                      <TableCell className="text-xs font-semibold">
                        ${Number(m.unitPrice).toFixed(2)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span
                            className={`font-mono text-xs font-bold ${
                              m.isLowStock ? 'text-rose-600' : 'text-slate-800 dark:text-slate-200'
                            }`}
                          >
                            {m.totalStock} units
                          </span>
                          {m.isLowStock && <Badge variant="danger">Low Stock</Badge>}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-xs"
                            onClick={() => {
                              setSelectedBatchMed(m);
                              setIsBatchOpen(true);
                            }}
                          >
                            Batches ({m.inventories?.length || 0})
                          </Button>
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => {
                              setSelectedMed(m);
                              setIsRestockOpen(true);
                            }}
                          >
                            <Plus className="w-3 h-3 mr-1" /> Restock
                          </Button>
                          <Button
                            size="sm"
                            disabled={m.totalStock <= 0}
                            onClick={() => {
                              setSelectedMed(m);
                              setDispenseQty(1);
                              setIsDispenseOpen(true);
                            }}
                          >
                            Dispense
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </Card>
        )}

        {/* TAB 2: INVENTORY LEDGER */}
        {activeTab === 'transactions' && (
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Timestamp</TableHead>
                  <TableHead>Medicine</TableHead>
                  <TableHead>Transaction Type</TableHead>
                  <TableHead>Quantity</TableHead>
                  <TableHead>Previous Stock</TableHead>
                  <TableHead>New Stock</TableHead>
                  <TableHead>Audited Pharmacist</TableHead>
                  <TableHead>Notes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-6 text-slate-400 text-xs">
                      No inventory movements logged yet.
                    </TableCell>
                  </TableRow>
                ) : (
                  transactions.map((tx) => (
                    <TableRow key={tx.id}>
                      <TableCell className="text-xs font-mono">
                        {new Date(tx.createdAt).toLocaleString()}
                      </TableCell>
                      <TableCell className="text-xs font-semibold">{tx.medicine?.name}</TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            tx.transactionType === 'PURCHASE'
                              ? 'success'
                              : tx.transactionType === 'DISPENSED'
                              ? 'info'
                              : 'warning'
                          }
                        >
                          {tx.transactionType}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs font-mono font-bold">
                        {tx.transactionType === 'DISPENSED' ? `-${tx.quantity}` : `+${tx.quantity}`}
                      </TableCell>
                      <TableCell className="text-xs font-mono text-slate-400">
                        {tx.previousStock}
                      </TableCell>
                      <TableCell className="text-xs font-mono font-bold text-slate-800 dark:text-slate-200">
                        {tx.newStock}
                      </TableCell>
                      <TableCell className="text-xs">
                        {tx.performedBy
                          ? `${tx.performedBy.firstName} ${tx.performedBy.lastName}`
                          : 'Automated Service'}
                      </TableCell>
                      <TableCell className="text-xs text-slate-500">{tx.notes || 'Routine'}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </Card>
        )}
      </div>

      {/* Dispense Modal */}
      <Dialog
        isOpen={isDispenseOpen}
        onClose={() => setIsDispenseOpen(false)}
        title={selectedMed ? `Dispense: ${selectedMed.name}` : 'Dispense'}
        description="Deduct inventory batches using FEFO (First-Expired, First-Out) rule"
        maxWidth="md"
      >
        <form onSubmit={handleDispense} className="space-y-4">
          <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-950/20 text-xs text-blue-700 dark:text-blue-300 flex justify-between items-center">
            <span>Available Warehouse Stock:</span>
            <strong className="text-blue-900 dark:text-blue-100 font-mono text-sm">{selectedMed?.totalStock} units</strong>
          </div>

          {/* FEFO Strategy Preview */}
          {selectedMed?.inventories && selectedMed.inventories.length > 0 && (
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800 space-y-1.5">
              <div className="flex items-center justify-between text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                <span>FEFO Strategy (Earliest Expiry First)</span>
                <span className="text-emerald-600 font-bold">Auto-Ordered</span>
              </div>
              <div className="space-y-1">
                {selectedMed.inventories
                  .filter((i: any) => i.quantityInStock > 0)
                  .sort((a: any, b: any) => new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime())
                  .slice(0, 2)
                  .map((inv: any) => (
                    <div
                      key={inv.id}
                      className="flex justify-between items-center text-[11px] bg-white dark:bg-slate-900 px-2.5 py-1.5 rounded-lg border border-slate-200/70 dark:border-slate-800"
                    >
                      <span>
                        Lot: <strong className="font-mono text-purple-600">{inv.batchNumber}</strong>
                      </span>
                      <span className="text-slate-500">Exp: {new Date(inv.expiryDate).toLocaleDateString()}</span>
                      <span className="font-bold text-slate-800 dark:text-slate-200">{inv.quantityInStock} in stock</span>
                    </div>
                  ))}
              </div>
            </div>
          )}

          <Input
            label="Quantity to Dispense"
            type="number"
            min={1}
            max={selectedMed?.totalStock || 1}
            required
            value={dispenseQty}
            onChange={(e) => setDispenseQty(Number(e.target.value))}
          />

          <Input
            label="Dispensing Notes"
            value={dispenseNotes}
            onChange={(e) => setDispenseNotes(e.target.value)}
          />

          <div className="pt-2 flex justify-end gap-2.5">
            <Button type="button" variant="outline" onClick={() => setIsDispenseOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" isLoading={isDispensing}>
              Confirm Dispensing
            </Button>
          </div>
        </form>
      </Dialog>

      {/* Restock Modal */}
      <Dialog
        isOpen={isRestockOpen}
        onClose={() => setIsRestockOpen(false)}
        title={selectedMed ? `Restock Batch: ${selectedMed.name}` : 'Restock'}
        description="Receive wholesale pharmaceuticals shipment into warehouse inventory"
        maxWidth="md"
      >
        <form onSubmit={handleRestock} className="space-y-4">
          <Input
            label="Batch Identifier"
            required
            value={restockBatch}
            onChange={(e) => setRestockBatch(e.target.value)}
          />

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Quantity Received"
              type="number"
              min={1}
              required
              value={restockQty}
              onChange={(e) => setRestockQty(Number(e.target.value))}
            />
            <Input
              label="Purchase Unit Cost ($)"
              type="number"
              step="0.01"
              required
              value={restockCost}
              onChange={(e) => setRestockCost(Number(e.target.value))}
            />
          </div>

          <Input
            label="Manufacturer Expiry Date"
            type="date"
            required
            value={restockExpiry}
            onChange={(e) => setRestockExpiry(e.target.value)}
          />

          <div className="pt-2 flex justify-end gap-2.5">
            <Button type="button" variant="outline" onClick={() => setIsRestockOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" isLoading={isRestocking}>
              Record Restock Shipment
            </Button>
          </div>
        </form>
      </Dialog>

      {/* Batch Inspector Dialog */}
      <Dialog
        isOpen={isBatchOpen}
        onClose={() => setIsBatchOpen(false)}
        title={selectedBatchMed ? `Inventory Lots & Batches: ${selectedBatchMed.name}` : 'Batches'}
        description="Inspection of active batches, storage locations, expiration dates, and unit acquisition costs"
        maxWidth="lg"
      >
        {selectedBatchMed && (
          <div className="space-y-4">
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800 flex justify-between items-center text-xs">
              <div>
                <span className="text-slate-400">Drug Formulation:</span>
                <strong className="ml-1 text-slate-800 dark:text-slate-200">{selectedBatchMed.genericName}</strong>
              </div>
              <div>
                <span className="text-slate-400">Total Available:</span>
                <strong className="ml-1 font-mono text-purple-600 text-sm">{selectedBatchMed.totalStock} units</strong>
              </div>
            </div>

            {selectedBatchMed.inventories?.length === 0 ? (
              <div className="text-center py-8 text-xs text-slate-400">
                No active batches registered for this medication.
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-800/50 text-[11px] uppercase font-bold text-slate-500">
                    <tr>
                      <th className="p-3">Batch / Lot #</th>
                      <th className="p-3">Expiry Date</th>
                      <th className="p-3">Location / Shelf</th>
                      <th className="p-3 text-right">In Stock</th>
                      <th className="p-3 text-right">Unit Cost</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {selectedBatchMed.inventories?.map((inv: any) => {
                      const isExpired = new Date(inv.expiryDate).getTime() < Date.now();
                      const isNearExpiry = !isExpired && new Date(inv.expiryDate).getTime() < Date.now() + 90 * 24 * 60 * 60 * 1000;

                      return (
                        <tr key={inv.id} className={isExpired ? 'bg-rose-50/40 dark:bg-rose-950/20' : undefined}>
                          <td className="p-3 font-mono font-semibold text-purple-700 dark:text-purple-300">
                            {inv.batchNumber}
                          </td>
                          <td className="p-3">
                            <span className="font-mono text-xs">
                              {new Date(inv.expiryDate).toLocaleDateString()}
                            </span>
                            {isExpired ? (
                              <Badge variant="danger" className="ml-2 text-[10px]">EXPIRED</Badge>
                            ) : isNearExpiry ? (
                              <Badge variant="warning" className="ml-2 text-[10px]">EXPIRING SOON</Badge>
                            ) : null}
                          </td>
                          <td className="p-3 text-slate-600 dark:text-slate-400">
                            {inv.location || 'Central Shelf'}
                          </td>
                          <td className="p-3 text-right font-bold text-slate-800 dark:text-slate-200 font-mono">
                            {inv.quantityInStock}
                          </td>
                          <td className="p-3 text-right text-slate-500 font-mono">
                            ${Number(inv.purchaseCost).toFixed(2)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            <div className="pt-2 flex justify-end">
              <Button variant="outline" onClick={() => setIsBatchOpen(false)}>
                Close Inspector
              </Button>
            </div>
          </div>
        )}
      </Dialog>
    </DashboardLayout>
  );
}
