'use client';

import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { api } from '@/lib/api';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Select, Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog } from '@/components/ui/dialog';
import {
  Calendar,
  Clock,
  User,
  Plus,
  CheckCircle,
  XCircle,
  Play,
  Stethoscope,
  Filter,
  AlertTriangle,
  UserCheck,
  UserX,
  AlertCircle,
} from 'lucide-react';
import Link from 'next/link';

export default function AppointmentsPage() {
  const [appointments, setAppointments] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [doctors, setDoctors] = useState<any[]>([]);
  const [patients, setPatients] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filter state
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [filterDate, setFilterDate] = useState<string>('');

  // Booking Modal State
  const [isBookOpen, setIsBookOpen] = useState(false);
  const [selectedDeptId, setSelectedDeptId] = useState('');
  const [selectedDocId, setSelectedDocId] = useState('');
  const [selectedPatientId, setSelectedPatientId] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [availableSlots, setAvailableSlots] = useState<any[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<any>(null);
  const [appointmentReason, setAppointmentReason] = useState('Routine Checkup & Consultation');
  const [isSlotLoading, setIsSlotLoading] = useState(false);
  const [isBooking, setIsBooking] = useState(false);
  const [bookError, setBookError] = useState<string | null>(null);

  // Cancellation Modal State
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [appointmentToCancel, setAppointmentToCancel] = useState<any>(null);
  const [cancelReasonPreset, setCancelReasonPreset] = useState('Patient Requested Cancellation');
  const [cancelCustomNotes, setCancelCustomNotes] = useState('');
  const [isCancelling, setIsCancelling] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);

  const loadAppointments = async () => {
    setIsLoading(true);
    try {
      let query = '';
      if (filterStatus) query += `status=${filterStatus}&`;
      if (filterDate) query += `date=${filterDate}&`;

      const data = await api.get(`/appointments${query ? `?${query}` : ''}`);
      setAppointments(data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAppointments();
  }, [filterStatus, filterDate]);

  useEffect(() => {
    async function loadAux() {
      try {
        const [depts, docs, pats] = await Promise.all([
          api.get('/departments'),
          api.get('/doctors'),
          api.get('/patients?limit=50'),
        ]);
        setDepartments(depts || []);
        setDoctors(docs || []);
        setPatients(pats.data || []);
      } catch (e) {
        console.error(e);
      }
    }
    loadAux();
  }, []);

  // Fetch Available Slots when Doctor & Date change
  useEffect(() => {
    async function fetchSlots() {
      if (!selectedDocId || !selectedDate) {
        setAvailableSlots([]);
        return;
      }

      setIsSlotLoading(true);
      setSelectedSlot(null);
      setBookError(null);
      try {
        const res = await api.get(`/appointments/slots?doctorId=${selectedDocId}&date=${selectedDate}`);
        if (res.isAvailable) {
          setAvailableSlots(res.slots || []);
        } else {
          setAvailableSlots([]);
          setBookError(res.message || 'Doctor not available on this day.');
        }
      } catch (err: any) {
        setBookError(err.message || 'Failed to calculate available slots');
        setAvailableSlots([]);
      } finally {
        setIsSlotLoading(false);
      }
    }

    if (isBookOpen) {
      fetchSlots();
    }
  }, [selectedDocId, selectedDate, isBookOpen]);

  const handleBook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPatientId || !selectedDocId || !selectedSlot) {
      setBookError('Please select a patient, doctor, date, and time slot.');
      return;
    }

    setIsBooking(true);
    setBookError(null);
    try {
      await api.post('/appointments', {
        patientId: selectedPatientId,
        doctorId: selectedDocId,
        departmentId: selectedDeptId || doctors.find((d) => d.id === selectedDocId)?.departmentId,
        appointmentDate: selectedDate,
        startTime: selectedSlot.startTime,
        endTime: selectedSlot.endTime,
        reason: appointmentReason,
      });

      setIsBookOpen(false);
      loadAppointments();
    } catch (err: any) {
      setBookError(err.message || 'Booking conflict or double booking occurred.');
    } finally {
      setIsBooking(false);
    }
  };

  const openCancelModal = (apt: any) => {
    setAppointmentToCancel(apt);
    setCancelReasonPreset('Patient Requested Cancellation');
    setCancelCustomNotes('');
    setCancelError(null);
    setIsCancelModalOpen(true);
  };

  const handleConfirmCancel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!appointmentToCancel) return;

    const finalReason =
      cancelReasonPreset === 'Other'
        ? cancelCustomNotes.trim()
        : cancelCustomNotes.trim()
        ? `${cancelReasonPreset}: ${cancelCustomNotes.trim()}`
        : cancelReasonPreset;

    if (!finalReason) {
      setCancelError('Please select or specify a cancellation reason.');
      return;
    }

    setIsCancelling(true);
    setCancelError(null);
    try {
      await api.patch(`/appointments/${appointmentToCancel.id}/status`, {
        status: 'CANCELLED',
        cancellationReason: finalReason,
      });
      setIsCancelModalOpen(false);
      setAppointmentToCancel(null);
      loadAppointments();
    } catch (err: any) {
      setCancelError(err.message || 'Failed to cancel appointment');
    } finally {
      setIsCancelling(false);
    }
  };

  const updateStatus = async (id: string, status: string, notes?: string) => {
    try {
      await api.patch(`/appointments/${id}/status`, { status, notes });
      loadAppointments();
    } catch (err: any) {
      alert(err.message || 'Failed to update status');
    }
  };

  // Filtered doctors by department
  const filteredDoctors = selectedDeptId
    ? doctors.filter((d) => d.departmentId === selectedDeptId)
    : doctors;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Calendar className="w-6 h-6 text-blue-600" /> Clinical Appointment Schedule
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Multi-step slot reservation, double booking prevention, and consultation queues
            </p>
          </div>

          <Button
            onClick={() => {
              if (doctors.length > 0) setSelectedDocId(doctors[0].id);
              if (patients.length > 0) setSelectedPatientId(patients[0].id);
              setIsBookOpen(true);
            }}
          >
            <Plus className="w-4 h-4 mr-1.5" /> Book New Appointment
          </Button>
        </div>

        {/* Filter Bar */}
        <Card>
          <CardContent className="p-4 flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
              <Filter className="w-4 h-4" /> Filters:
            </div>

            <div className="w-44">
              <Select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                options={[
                  { label: 'All Lifecycle States', value: '' },
                  { label: 'Scheduled', value: 'SCHEDULED' },
                  { label: 'Confirmed', value: 'CONFIRMED' },
                  { label: 'Checked In', value: 'CHECKED_IN' },
                  { label: 'In Progress', value: 'IN_PROGRESS' },
                  { label: 'Completed', value: 'COMPLETED' },
                  { label: 'Cancelled', value: 'CANCELLED' },
                  { label: 'No Show', value: 'NO_SHOW' },
                ]}
              />
            </div>

            <div className="w-44">
              <Input
                type="date"
                value={filterDate}
                onChange={(e) => setFilterDate(e.target.value)}
              />
            </div>

            {(filterStatus || filterDate) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setFilterStatus('');
                  setFilterDate('');
                }}
              >
                Clear Filters
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Appointments Table */}
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Queue / Appt #</TableHead>
                <TableHead>Patient Details</TableHead>
                <TableHead>Attending Specialist</TableHead>
                <TableHead>Scheduled Slot</TableHead>
                <TableHead>Clinical Reason</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Consultation Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-10 text-slate-400 text-xs">
                    Loading scheduled clinic appointments...
                  </TableCell>
                </TableRow>
              ) : appointments.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-10 text-slate-400 text-xs">
                    No appointments found matching filters.
                  </TableCell>
                </TableRow>
              ) : (
                appointments.map((apt) => (
                  <TableRow key={apt.id} className={apt.status === 'CANCELLED' ? 'opacity-70 bg-slate-50/50 dark:bg-slate-900/40' : undefined}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span
                          className={`w-6 h-6 rounded-md text-[11px] font-bold flex items-center justify-center relative ${
                            apt.status === 'CHECKED_IN'
                              ? 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 ring-2 ring-emerald-500/40'
                              : 'bg-blue-50 dark:bg-blue-950/60 text-blue-600'
                          }`}
                        >
                          {apt.queueNumber || '1'}
                          {apt.status === 'CHECKED_IN' && (
                            <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                            </span>
                          )}
                        </span>
                        <span className="font-mono text-xs font-semibold text-slate-700 dark:text-slate-300">
                          {apt.appointmentNumber}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Link
                        href={`/patients/${apt.patient?.id}`}
                        className="font-semibold text-slate-900 dark:text-slate-100 hover:text-blue-600 block"
                      >
                        {apt.patient?.firstName} {apt.patient?.lastName}
                      </Link>
                      <span className="font-mono text-[11px] text-slate-400">{apt.patient?.mrn}</span>
                    </TableCell>
                    <TableCell>
                      <span className="font-medium text-xs text-slate-800 dark:text-slate-200 block">
                        Dr. {apt.doctor?.user?.lastName}
                      </span>
                      <span className="text-[11px] text-slate-500">{apt.department?.name}</span>
                    </TableCell>
                    <TableCell>
                      <span className="text-xs font-medium block">
                        {new Date(apt.appointmentDate).toLocaleDateString()}
                      </span>
                      <span className="font-mono text-[11px] text-slate-500">
                        {apt.startTime} - {apt.endTime}
                      </span>
                    </TableCell>
                    <TableCell className="text-xs text-slate-600 dark:text-slate-400 max-w-xs truncate">
                      {apt.reason || 'General Followup'}
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <Badge
                          variant={
                            apt.status === 'COMPLETED'
                              ? 'success'
                              : apt.status === 'IN_PROGRESS'
                              ? 'warning'
                              : apt.status === 'CHECKED_IN'
                              ? 'info'
                              : apt.status === 'CANCELLED'
                              ? 'danger'
                              : apt.status === 'NO_SHOW'
                              ? 'outline'
                              : 'default'
                          }
                        >
                          {apt.status === 'CHECKED_IN' ? 'CHECKED IN (WAITING)' : apt.status}
                        </Badge>
                        {apt.status === 'CANCELLED' && apt.cancellationReason && (
                          <p
                            className="text-[11px] text-rose-600 dark:text-rose-400 font-medium max-w-[200px] leading-tight"
                            title={apt.cancellationReason}
                          >
                            Reason: {apt.cancellationReason}
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {apt.status === 'SCHEDULED' || apt.status === 'CONFIRMED' ? (
                          <>
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() => updateStatus(apt.id, 'CHECKED_IN')}
                            >
                              <UserCheck className="w-3.5 h-3.5 mr-1 text-emerald-600" /> Check In
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-amber-600 dark:text-amber-400 hover:text-amber-700 hover:bg-amber-50 dark:hover:bg-amber-950/40 text-xs"
                              onClick={() => {
                                if (confirm(`Mark ${apt.appointmentNumber} as NO SHOW?`)) {
                                  updateStatus(apt.id, 'NO_SHOW');
                                }
                              }}
                              title="Mark as No Show"
                            >
                              <UserX className="w-3.5 h-3.5" />
                            </Button>
                          </>
                        ) : null}

                        {apt.status === 'CHECKED_IN' || apt.status === 'IN_PROGRESS' ? (
                          <Link href={`/consultations/${apt.id}`}>
                            <Button size="sm">
                              <Stethoscope className="w-3.5 h-3.5 mr-1" /> Open Consultation
                            </Button>
                          </Link>
                        ) : null}

                        {apt.status === 'COMPLETED' ? (
                          <Link href={`/consultations/${apt.id}`}>
                            <Button size="sm" variant="outline">
                              View Notes
                            </Button>
                          </Link>
                        ) : null}

                        {apt.status !== 'CANCELLED' && apt.status !== 'COMPLETED' && (
                          <button
                            title="Cancel appointment"
                            onClick={() => openCancelModal(apt)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                          >
                            <XCircle className="w-4 h-4" />
                          </button>
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

      {/* Multi-step Appointment Booking Dialog */}
      <Dialog
        isOpen={isBookOpen}
        onClose={() => setIsBookOpen(false)}
        title="6-Step Appointment Slot Booking"
        description="Select department, physician, date, and real-time available time slots."
        maxWidth="lg"
      >
        <form onSubmit={handleBook} className="space-y-4">
          {bookError && (
            <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-500 text-xs">
              {bookError}
            </div>
          )}

          {/* 1. Patient Picker */}
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
              1. Select Patient
            </label>
            <select
              value={selectedPatientId}
              onChange={(e) => setSelectedPatientId(e.target.value)}
              required
              className="w-full text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 p-2"
            >
              {patients.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.firstName} {p.lastName} ({p.mrn} • {p.phone})
                </option>
              ))}
            </select>
          </div>

          {/* 2. Department & Doctor Picker */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                2. Select Department
              </label>
              <select
                value={selectedDeptId}
                onChange={(e) => setSelectedDeptId(e.target.value)}
                className="w-full text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 p-2"
              >
                <option value="">All Departments</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                3. Select Attending Doctor
              </label>
              <select
                value={selectedDocId}
                onChange={(e) => setSelectedDocId(e.target.value)}
                required
                className="w-full text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 p-2"
              >
                {filteredDoctors.map((doc) => (
                  <option key={doc.id} value={doc.id}>
                    Dr. {doc.user?.lastName} ({doc.specialization} • ${doc.consultationFee})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* 4. Consultation Date Picker */}
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
              4. Select Clinic Date
            </label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-full text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 p-2"
            />
          </div>

          {/* 5. Real-Time Slot Picker */}
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
              5. Select Available Time Slot
            </label>
            {isSlotLoading ? (
              <div className="py-4 text-center text-xs text-slate-400">
                Checking physician schedule and calculating slot collision...
              </div>
            ) : availableSlots.length === 0 ? (
              <div className="p-4 rounded-lg bg-amber-50 dark:bg-amber-950/20 text-xs text-amber-700 border border-amber-200">
                No slots available on this date. Doctor may not have clinic hours or slots are booked.
              </div>
            ) : (
              <div className="grid grid-cols-4 sm:grid-cols-6 gap-2 max-h-48 overflow-y-auto p-1">
                {availableSlots.map((slot) => {
                  const isSelected = selectedSlot?.startTime === slot.startTime;
                  return (
                    <button
                      key={slot.startTime}
                      type="button"
                      disabled={slot.isBooked}
                      onClick={() => setSelectedSlot(slot)}
                      className={`px-2.5 py-2 text-xs font-mono rounded-lg border text-center transition-all cursor-pointer ${
                        slot.isBooked
                          ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 line-through border-transparent cursor-not-allowed'
                          : isSelected
                          ? 'bg-blue-600 text-white font-bold border-blue-600 shadow-xs'
                          : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 hover:border-blue-500'
                      }`}
                    >
                      {slot.startTime}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* 6. Reason for Visit */}
          <Input
            label="6. Clinical Reason / Symptoms"
            value={appointmentReason}
            onChange={(e) => setAppointmentReason(e.target.value)}
            placeholder="e.g. Recurrent chest discomfort and shortness of breath"
          />

          <div className="pt-2 flex justify-end gap-2.5">
            <Button type="button" variant="outline" onClick={() => setIsBookOpen(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              isLoading={isBooking}
              disabled={!selectedSlot || selectedSlot.isBooked}
            >
              Confirm Appointment
            </Button>
          </div>
        </form>
      </Dialog>

      {/* Appointment Cancellation Modal */}
      <Dialog
        isOpen={isCancelModalOpen}
        onClose={() => {
          if (!isCancelling) setIsCancelModalOpen(false);
        }}
        title="Cancel Appointment"
        description="Select a clinical or administrative reason for cancelling this booking."
        maxWidth="md"
      >
        {appointmentToCancel && (
          <form onSubmit={handleConfirmCancel} className="space-y-4">
            {cancelError && (
              <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-500 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{cancelError}</span>
              </div>
            )}

            {/* Appointment summary card */}
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800 space-y-1.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-900 dark:text-slate-100">
                  {appointmentToCancel.appointmentNumber}
                </span>
                <span className="font-mono text-slate-500">
                  Queue #{appointmentToCancel.queueNumber || 1}
                </span>
              </div>
              <div className="text-slate-600 dark:text-slate-400">
                Patient: <span className="font-medium text-slate-800 dark:text-slate-200">{appointmentToCancel.patient?.firstName} {appointmentToCancel.patient?.lastName}</span>
              </div>
              <div className="text-slate-600 dark:text-slate-400">
                Attending: <span className="font-medium text-slate-800 dark:text-slate-200">Dr. {appointmentToCancel.doctor?.user?.lastName} ({appointmentToCancel.department?.name})</span>
              </div>
              <div className="text-slate-600 dark:text-slate-400">
                Slot: <span className="font-medium text-slate-800 dark:text-slate-200">{new Date(appointmentToCancel.appointmentDate).toLocaleDateString()} at {appointmentToCancel.startTime}</span>
              </div>
            </div>

            {/* Cancellation reason picker */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Cancellation Reason Preset *
              </label>
              <select
                value={cancelReasonPreset}
                onChange={(e) => setCancelReasonPreset(e.target.value)}
                className="w-full text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 p-2.5 text-slate-800 dark:text-slate-200 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
              >
                <option value="Patient Requested Cancellation">Patient Requested Cancellation</option>
                <option value="Physician Unavailable / Emergency Case">Physician Unavailable / Emergency Case</option>
                <option value="Patient Illness / Hospitalization">Patient Illness / Hospitalization</option>
                <option value="Scheduling Conflict / Rescheduled">Scheduling Conflict / Rescheduled</option>
                <option value="Weather / Travel Disruption">Weather / Travel Disruption</option>
                <option value="Administrative Cancellation">Administrative Cancellation</option>
                <option value="Other">Other (Provide custom notes below)</option>
              </select>
            </div>

            {/* Optional / custom notes textarea */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Additional Clinical or Administrative Notes {cancelReasonPreset === 'Other' && '*'}
              </label>
              <textarea
                value={cancelCustomNotes}
                onChange={(e) => setCancelCustomNotes(e.target.value)}
                placeholder="Optional explanation, follow-up contact details, or reschedule plan..."
                rows={3}
                required={cancelReasonPreset === 'Other'}
                className="w-full text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 p-2.5 text-slate-800 dark:text-slate-200 focus:outline-hidden focus:ring-2 focus:ring-blue-500 placeholder:text-slate-400"
              />
            </div>

            <div className="pt-2 flex items-center justify-end gap-2.5 border-t border-slate-100 dark:border-slate-800">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsCancelModalOpen(false)}
                disabled={isCancelling}
              >
                Keep Appointment
              </Button>
              <Button
                type="submit"
                variant="danger"
                isLoading={isCancelling}
              >
                Confirm Cancellation
              </Button>
            </div>
          </form>
        )}
      </Dialog>
    </DashboardLayout>
  );
}
