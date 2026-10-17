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
  Bed,
  Plus,
  LogOut,
  User,
  Activity,
  Layers,
  CheckCircle2,
  Calendar,
  AlertCircle,
} from 'lucide-react';
import Link from 'next/link';

export default function AdmissionsPage() {
  const [wards, setWards] = useState<any[]>([]);
  const [admissions, setAdmissions] = useState<any[]>([]);
  const [patients, setPatients] = useState<any[]>([]);
  const [doctors, setDoctors] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'board' | 'list'>('board');
  const [isLoading, setIsLoading] = useState(true);

  // Admit modal
  const [isAdmitOpen, setIsAdmitOpen] = useState(false);
  const [admitPatientId, setAdmitPatientId] = useState('');
  const [admitBedId, setAdmitBedId] = useState('');
  const [admitDoctorId, setAdmitDoctorId] = useState('');
  const [admitReason, setAdmitReason] = useState('Acute cardiovascular observation');
  const [admitType, setAdmitType] = useState('PLANNED');
  const [admitDischargeDate, setAdmitDischargeDate] = useState('');
  const [isAdmitting, setIsAdmitting] = useState(false);

  // Discharge modal
  const [isDischargeOpen, setIsDischargeOpen] = useState(false);
  const [selectedAdmission, setSelectedAdmission] = useState<any>(null);
  const [dischargeSummary, setDischargeSummary] = useState('Patient recovered successfully, vitals stable.');
  const [dischargeCondition, setDischargeCondition] = useState('Stable');
  const [isDischarging, setIsDischarging] = useState(false);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [board, adms, pats, docs] = await Promise.all([
        api.get('/admissions/bed-board'),
        api.get('/admissions'),
        api.get('/patients?limit=50'),
        api.get('/doctors'),
      ]);
      setWards(board || []);
      setAdmissions(adms || []);
      setPatients(pats.data || []);
      setDoctors(docs || []);
      if (pats.data?.length > 0) setAdmitPatientId(pats.data[0].id);
      if (docs?.length > 0) setAdmitDoctorId(docs[0].id);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Collect available beds across all wards and rooms
  const availableBeds: Array<{ id: string; label: string }> = [];
  wards.forEach((ward) => {
    ward.rooms?.forEach((room: any) => {
      room.beds?.forEach((bed: any) => {
        if (bed.status === 'AVAILABLE') {
          availableBeds.push({
            id: bed.id,
            label: `${ward.name} • Room ${room.roomNumber} • Bed ${bed.bedNumber} ($${room.dailyRate}/day)`,
          });
        }
      });
    });
  });

  const handleAdmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!admitBedId) {
      alert('Please select an available bed.');
      return;
    }

    setIsAdmitting(true);
    try {
      await api.post('/admissions', {
        patientId: admitPatientId,
        bedId: admitBedId,
        attendingDoctorId: admitDoctorId,
        admissionType: admitType,
        reasonForAdmission: admitReason,
        expectedDischargeDate: admitDischargeDate || undefined,
      });
      setIsAdmitOpen(false);
      loadData();
    } catch (err: any) {
      alert(err.message || 'Admission failed');
    } finally {
      setIsAdmitting(false);
    }
  };

  const handleDischarge = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAdmission) return;

    setIsDischarging(true);
    try {
      await api.patch(`/admissions/${selectedAdmission.id}/discharge`, {
        dischargeSummary,
        dischargeCondition,
      });
      setIsDischargeOpen(false);
      loadData();
    } catch (err: any) {
      alert(err.message || 'Discharge failed');
    } finally {
      setIsDischarging(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Bed className="w-6 h-6 text-purple-600" /> Inpatient Admissions & Ward Census
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Visual bed tracking across ICU and medical wards with automated conflict prevention
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant={activeTab === 'board' ? 'primary' : 'outline'}
              onClick={() => setActiveTab('board')}
            >
              Interactive Bed Board
            </Button>
            <Button
              size="sm"
              variant={activeTab === 'list' ? 'primary' : 'outline'}
              onClick={() => setActiveTab('list')}
            >
              Admissions Register
            </Button>
            <Button
              size="sm"
              onClick={() => {
                if (availableBeds.length > 0) setAdmitBedId(availableBeds[0].id);
                setIsAdmitOpen(true);
              }}
            >
              <Plus className="w-4 h-4 mr-1.5" /> Admit Patient
            </Button>
          </div>
        </div>

        {/* TAB 1: INTERACTIVE BED BOARD */}
        {activeTab === 'board' && (
          <div className="space-y-6">
            {isLoading ? (
              <div className="py-20 text-center text-xs text-slate-400">Loading inpatient bed census...</div>
            ) : (
              wards.map((ward) => (
                <Card key={ward.id}>
                  <CardHeader className="py-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <span className="font-bold text-sm text-slate-900 dark:text-slate-100">
                          {ward.name}
                        </span>
                        <Badge variant="outline">Floor {ward.floor}</Badge>
                        <Badge variant="info">{ward.type}</Badge>
                      </div>
                      <span className="text-xs text-slate-400">
                        {ward.rooms?.reduce((acc: number, r: any) => acc + (r.beds?.length || 0), 0)} Total Beds
                      </span>
                    </div>
                  </CardHeader>
                  <CardContent className="p-4 pt-2">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {ward.rooms?.map((room: any) => (
                        <div
                          key={room.id}
                          className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 space-y-3"
                        >
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-bold text-slate-800 dark:text-slate-200">
                              Room {room.roomNumber} ({room.roomType})
                            </span>
                            <span className="text-slate-500 font-mono">${room.dailyRate}/day</span>
                          </div>

                          <div className="grid grid-cols-2 gap-2">
                            {room.beds?.map((bed: any) => {
                              const isOccupied = bed.status === 'OCCUPIED';
                              const currentAdm = bed.admissions?.[0];

                              return (
                                <div
                                  key={bed.id}
                                  className={`p-2.5 rounded-lg border text-xs flex flex-col justify-between transition-all ${
                                    isOccupied
                                      ? 'bg-rose-50/80 dark:bg-rose-950/40 border-rose-200/80 dark:border-rose-900/60'
                                      : 'bg-emerald-50/80 dark:bg-emerald-950/40 border-emerald-200/80 dark:border-emerald-900/60'
                                  }`}
                                >
                                  <div>
                                    <div className="flex items-center justify-between mb-1">
                                      <span className="font-mono font-bold text-slate-900 dark:text-slate-100">
                                        {bed.bedNumber}
                                      </span>
                                      <span
                                        className={`w-2 h-2 rounded-full ${
                                          isOccupied ? 'bg-rose-500' : 'bg-emerald-500'
                                        }`}
                                      />
                                    </div>

                                    {isOccupied && currentAdm ? (
                                      <div className="text-[11px] text-slate-600 dark:text-slate-400">
                                        <p className="font-semibold text-slate-900 dark:text-slate-100 truncate">
                                          {currentAdm.patient?.firstName} {currentAdm.patient?.lastName}
                                        </p>
                                        <p className="text-[10px] text-slate-500 font-mono">
                                          {currentAdm.patient?.mrn}
                                        </p>
                                      </div>
                                    ) : (
                                      <span className="text-[11px] text-emerald-700 dark:text-emerald-400 font-medium">
                                        Available
                                      </span>
                                    )}
                                  </div>

                                  {isOccupied && currentAdm && (
                                    <button
                                      onClick={() => {
                                        setSelectedAdmission(currentAdm);
                                        setIsDischargeOpen(true);
                                      }}
                                      className="mt-2 text-[10px] text-rose-600 hover:text-rose-800 font-semibold flex items-center justify-center gap-1 py-1 rounded bg-white dark:bg-slate-900 border border-rose-200 hover:bg-rose-50 cursor-pointer"
                                    >
                                      <LogOut className="w-3 h-3" /> Discharge
                                    </button>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        )}

        {/* TAB 2: ADMISSIONS LIST */}
        {activeTab === 'list' && (
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Admission #</TableHead>
                  <TableHead>Patient Details</TableHead>
                  <TableHead>Ward & Bed</TableHead>
                  <TableHead>Attending Doctor</TableHead>
                  <TableHead>Admission Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {admissions.map((adm) => (
                  <TableRow key={adm.id}>
                    <TableCell className="font-mono text-xs font-semibold text-blue-600">
                      {adm.admissionNumber}
                    </TableCell>
                    <TableCell>
                      <Link
                        href={`/patients/${adm.patient?.id}`}
                        className="font-semibold text-slate-900 dark:text-slate-100 hover:text-blue-600 block text-xs"
                      >
                        {adm.patient?.firstName} {adm.patient?.lastName}
                      </Link>
                      <span className="font-mono text-[11px] text-slate-400">{adm.patient?.mrn}</span>
                    </TableCell>
                    <TableCell className="text-xs">
                      {adm.bed?.room?.ward?.name} • Bed {adm.bed?.bedNumber}
                    </TableCell>
                    <TableCell className="text-xs">
                      Dr. {adm.attendingDoctor?.user?.lastName}
                    </TableCell>
                    <TableCell className="text-xs font-mono">
                      {new Date(adm.admissionDate).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <Badge variant={adm.status === 'ADMITTED' ? 'danger' : 'success'}>
                        {adm.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {adm.status === 'ADMITTED' && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedAdmission(adm);
                            setIsDischargeOpen(true);
                          }}
                        >
                          <LogOut className="w-3.5 h-3.5 mr-1" /> Discharge
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        )}
      </div>

      {/* Admit Patient Dialog */}
      <Dialog
        isOpen={isAdmitOpen}
        onClose={() => setIsAdmitOpen(false)}
        title="Inpatient Ward Admission"
        description="Assign an available bed in intensive care or general medical ward"
        maxWidth="lg"
      >
        <form onSubmit={handleAdmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
              Select Patient
            </label>
            <select
              value={admitPatientId}
              onChange={(e) => setAdmitPatientId(e.target.value)}
              className="w-full text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 p-2"
            >
              {patients.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.firstName} {p.lastName} ({p.mrn})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
              Select Available Bed (Strictly Prevents Collision)
            </label>
            {availableBeds.length === 0 ? (
              <p className="text-xs text-rose-500 font-semibold p-2 bg-rose-50 rounded">
                No beds are currently available in the hospital!
              </p>
            ) : (
              <select
                value={admitBedId}
                onChange={(e) => setAdmitBedId(e.target.value)}
                required
                className="w-full text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 p-2"
              >
                {availableBeds.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.label}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                Attending Physician
              </label>
              <select
                value={admitDoctorId}
                onChange={(e) => setAdmitDoctorId(e.target.value)}
                className="w-full text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 p-2"
              >
                {doctors.map((d) => (
                  <option key={d.id} value={d.id}>
                    Dr. {d.user?.lastName} ({d.specialization})
                  </option>
                ))}
              </select>
            </div>

            <Select
              label="Admission Type"
              value={admitType}
              onChange={(e) => setAdmitType(e.target.value)}
              options={[
                { label: 'Planned / Elective', value: 'PLANNED' },
                { label: 'Emergency Trauma / Acute', value: 'EMERGENCY' },
              ]}
            />
          </div>

          <Input
            label="Clinical Reason for Admission"
            required
            value={admitReason}
            onChange={(e) => setAdmitReason(e.target.value)}
          />

          <Input
            label="Estimated Discharge Date"
            type="date"
            value={admitDischargeDate}
            onChange={(e) => setAdmitDischargeDate(e.target.value)}
          />

          <div className="pt-2 flex justify-end gap-2.5">
            <Button type="button" variant="outline" onClick={() => setIsAdmitOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" isLoading={isAdmitting} disabled={availableBeds.length === 0}>
              Confirm Admission
            </Button>
          </div>
        </form>
      </Dialog>

      {/* Discharge Patient Dialog */}
      <Dialog
        isOpen={isDischargeOpen}
        onClose={() => setIsDischargeOpen(false)}
        title={selectedAdmission ? `Discharge: #${selectedAdmission.admissionNumber}` : 'Discharge'}
        description="Finalize patient treatment, record clinical discharge summary, and release ward bed"
        maxWidth="md"
      >
        <form onSubmit={handleDischarge} className="space-y-4">
          <Input
            label="Patient Discharge Condition"
            required
            value={dischargeCondition}
            onChange={(e) => setDischargeCondition(e.target.value)}
            placeholder="e.g. Stable, fully ambulatory"
          />

          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
              Comprehensive Discharge Summary & Follow-Up Advice
            </label>
            <textarea
              rows={3}
              required
              value={dischargeSummary}
              onChange={(e) => setDischargeSummary(e.target.value)}
              placeholder="Clinical summary of inpatient course and medications to continue at home..."
              className="w-full text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 p-2.5"
            />
          </div>

          <div className="pt-2 flex justify-end gap-2.5">
            <Button type="button" variant="outline" onClick={() => setIsDischargeOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" isLoading={isDischarging}>
              Complete Discharge & Release Bed
            </Button>
          </div>
        </form>
      </Dialog>
    </DashboardLayout>
  );
}
