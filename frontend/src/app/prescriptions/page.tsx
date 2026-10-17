'use client';

import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { api } from '@/lib/api';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog } from '@/components/ui/dialog';
import {
  Stethoscope,
  Printer,
  FileText,
  User,
  Calendar,
  Pill,
  CheckCircle,
  Eye,
  Activity,
} from 'lucide-react';
import Link from 'next/link';

export default function PrescriptionsPage() {
  const [prescriptions, setPrescriptions] = useState<any[]>([]);
  const [selectedRx, setSelectedRx] = useState<any>(null);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const loadPrescriptions = async () => {
    setIsLoading(true);
    try {
      const data = await api.get('/prescriptions');
      setPrescriptions(data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadPrescriptions();
  }, []);

  const handlePrint = () => {
    window.print();
  };

  const markDispensed = async (id: string) => {
    try {
      await api.patch(`/prescriptions/${id}/dispense`, {});
      loadPrescriptions();
    } catch (err: any) {
      alert(err.message || 'Failed to update prescription');
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Stethoscope className="w-6 h-6 text-blue-600" /> Prescriptions & Formularies
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Physician electronic prescription orders and pharmacy dispensing logs
            </p>
          </div>
        </div>

        {/* Prescription Table */}
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Rx Number</TableHead>
                <TableHead>Patient Details</TableHead>
                <TableHead>Prescribing Physician</TableHead>
                <TableHead>Issued Date</TableHead>
                <TableHead>Medications Prescribed</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-10 text-slate-400 text-xs">
                    Loading prescription orders...
                  </TableCell>
                </TableRow>
              ) : prescriptions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-10 text-slate-400 text-xs">
                    No prescriptions found.
                  </TableCell>
                </TableRow>
              ) : (
                prescriptions.map((rx) => (
                  <TableRow key={rx.id}>
                    <TableCell className="font-mono text-xs font-semibold text-blue-600">
                      {rx.prescriptionNumber}
                    </TableCell>
                    <TableCell>
                      <Link
                        href={`/patients/${rx.patient?.id}`}
                        className="font-semibold text-slate-900 dark:text-slate-100 hover:text-blue-600 block text-xs"
                      >
                        {rx.patient?.firstName} {rx.patient?.lastName}
                      </Link>
                      <span className="font-mono text-[11px] text-slate-400">{rx.patient?.mrn}</span>
                    </TableCell>
                    <TableCell>
                      <span className="text-xs font-medium block">
                        Dr. {rx.doctor?.user?.lastName}
                      </span>
                      <span className="text-[11px] text-slate-500">{rx.doctor?.department?.name}</span>
                    </TableCell>
                    <TableCell className="text-xs font-mono">
                      {new Date(rx.issuedDate).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1 max-w-xs">
                        {rx.items?.map((item: any, i: number) => (
                          <span
                            key={i}
                            className="text-[11px] px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium"
                          >
                            {item.medicineName} ({item.dosage})
                          </span>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={rx.status === 'ACTIVE' ? 'success' : 'default'}>
                        {rx.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedRx(rx);
                            setIsPrintModalOpen(true);
                          }}
                        >
                          <Eye className="w-3.5 h-3.5 mr-1" /> View / Print Rx
                        </Button>

                        {rx.status === 'ACTIVE' && (
                          <Button size="sm" variant="secondary" onClick={() => markDispensed(rx.id)}>
                            Dispense
                          </Button>
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

      {/* Professional Printable Prescription Document Modal */}
      <Dialog
        isOpen={isPrintModalOpen}
        onClose={() => setIsPrintModalOpen(false)}
        title="Professional Prescription Document"
        description="Official outpatient pharmaceutical order sheet"
        maxWidth="xl"
      >
        {selectedRx && (
          <div className="space-y-6">
            <div id="printable-rx" className="p-6 bg-white text-slate-900 rounded-xl border border-slate-200">
              {/* Clinical Header */}
              <div className="flex items-start justify-between border-b-2 border-slate-900 pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <Activity className="w-6 h-6 text-blue-600" />
                    <h2 className="text-lg font-bold tracking-tight text-slate-900 uppercase">
                      HMIS Health Integrated Medical Center
                    </h2>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    100 Metro Health Avenue, Medical District • Tel: +1 (555) 019-2000
                  </p>
                </div>
                <div className="text-right">
                  <span className="font-mono text-sm font-bold text-blue-700 block">
                    {selectedRx.prescriptionNumber}
                  </span>
                  <span className="text-xs text-slate-500">
                    Date: {new Date(selectedRx.issuedDate).toLocaleDateString()}
                  </span>
                </div>
              </div>

              {/* Physician & Patient Sub-header */}
              <div className="grid grid-cols-2 gap-4 py-4 border-b border-slate-200 text-xs">
                <div>
                  <span className="font-bold text-slate-400 block text-[10px] uppercase">
                    Attending Physician
                  </span>
                  <h4 className="font-bold text-slate-900 mt-0.5">
                    Dr. {selectedRx.doctor?.user?.firstName} {selectedRx.doctor?.user?.lastName}
                  </h4>
                  <p className="text-slate-600">{selectedRx.doctor?.specialization}</p>
                  <p className="text-slate-500">Lic: {selectedRx.doctor?.licenseNumber}</p>
                </div>

                <div className="text-right">
                  <span className="font-bold text-slate-400 block text-[10px] uppercase">
                    Patient Dossier
                  </span>
                  <h4 className="font-bold text-slate-900 mt-0.5">
                    {selectedRx.patient?.firstName} {selectedRx.patient?.lastName}
                  </h4>
                  <p className="text-slate-600">MRN: {selectedRx.patient?.mrn}</p>
                  <p className="text-slate-500">Gender: {selectedRx.patient?.gender}</p>
                </div>
              </div>

              {/* Rx Symbol & Medication Body */}
              <div className="py-5 space-y-4">
                <div className="text-2xl font-serif font-black text-blue-600">℞</div>

                <div className="divide-y divide-slate-100">
                  {selectedRx.items?.map((item: any, i: number) => (
                    <div key={i} className="py-3 flex items-start justify-between text-xs">
                      <div>
                        <h5 className="font-bold text-slate-900 text-sm">{item.medicineName}</h5>
                        <p className="text-slate-600 mt-0.5">
                          Dosage: <strong>{item.dosage}</strong> • Route: <strong>{item.route}</strong> •
                          Frequency: <strong>{item.frequency}</strong>
                        </p>
                        {item.instructions && (
                          <p className="text-slate-500 italic mt-0.5">
                            Sig: {item.instructions}
                          </p>
                        )}
                      </div>
                      <span className="font-semibold text-slate-700">
                        {item.durationDays} Days Supply
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Doctor Notes & Signature Footer */}
              <div className="pt-6 border-t border-slate-200 grid grid-cols-2 gap-4 items-end text-xs">
                <div>
                  {selectedRx.notes && (
                    <p className="text-slate-600">
                      <strong>Physician Advice:</strong> {selectedRx.notes}
                    </p>
                  )}
                  <p className="text-[10px] text-slate-400 mt-2">
                    Valid for 30 days from date of issuance.
                  </p>
                </div>

                <div className="text-right">
                  <div className="border-b border-slate-400 w-48 ml-auto mb-1" />
                  <span className="font-semibold text-slate-900 block">
                    Dr. {selectedRx.doctor?.user?.lastName}, MD
                  </span>
                  <span className="text-[10px] text-slate-500">Authorized Medical Signature</span>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2.5">
              <Button variant="outline" onClick={() => setIsPrintModalOpen(false)}>
                Close
              </Button>
              <Button onClick={handlePrint}>
                <Printer className="w-4 h-4 mr-1.5" /> Print Prescription
              </Button>
            </div>
          </div>
        )}
      </Dialog>
    </DashboardLayout>
  );
}
