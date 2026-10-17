'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { api } from '@/lib/api';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input, Select } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Stethoscope,
  Heart,
  Activity,
  User,
  Plus,
  Trash2,
  CheckCircle2,
  Calendar,
  AlertCircle,
  FileText,
  Clock,
  Pill,
} from 'lucide-react';
import Link from 'next/link';

interface RxItem {
  medicineId?: string;
  medicineName: string;
  dosage: string;
  frequency: string;
  route: string;
  durationDays: number;
  instructions: string;
}

export default function ConsultationRoomPage() {
  const params = useParams();
  const appointmentId = params?.appointmentId as string;
  const router = useRouter();

  const [appointment, setAppointment] = useState<any>(null);
  const [medicines, setMedicines] = useState<any[]>([]);
  const [existingConsultation, setExistingConsultation] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Consultation Form
  const [symptoms, setSymptoms] = useState('');
  const [clinicalNotes, setClinicalNotes] = useState('');
  const [diagnosisText, setDiagnosisText] = useState('');
  const [treatmentPlan, setTreatmentPlan] = useState('');
  const [doctorNotes, setDoctorNotes] = useState('');
  const [followUpDate, setFollowUpDate] = useState('');

  // Vitals
  const [vitals, setVitals] = useState({
    bpSystolic: 120,
    bpDiastolic: 80,
    heartRate: 72,
    temperature: 37.0,
    respiratoryRate: 16,
    oxygenSaturation: 98,
    weightKg: 70,
    heightCm: 175,
  });

  // Prescriptions
  const [prescriptionItems, setPrescriptionItems] = useState<RxItem[]>([
    {
      medicineName: 'Amoxicillin 500mg',
      dosage: '1 capsule',
      frequency: '3 times/day',
      route: 'Oral',
      durationDays: 5,
      instructions: 'Take with full glass of water after food',
    },
  ]);

  useEffect(() => {
    async function loadData() {
      if (!appointmentId) return;
      setIsLoading(true);
      try {
        const [apt, meds] = await Promise.all([
          api.get(`/appointments/${appointmentId}`),
          api.get('/pharmacy/medicines').catch(() => []),
        ]);
        setAppointment(apt);
        setMedicines(meds || []);

        if (apt.consultation) {
          setExistingConsultation(apt.consultation);
          setDiagnosisText(apt.consultation.diagnosisText || '');
          setClinicalNotes(apt.consultation.clinicalNotes || '');
          setSymptoms(apt.consultation.symptoms?.join(', ') || '');
          setTreatmentPlan(apt.consultation.treatmentPlan || '');
        }
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, [appointmentId]);

  const addPrescriptionItem = () => {
    setPrescriptionItems([
      ...prescriptionItems,
      {
        medicineName: '',
        dosage: '1 tablet',
        frequency: 'Once daily',
        route: 'Oral',
        durationDays: 7,
        instructions: 'Take after meals',
      },
    ]);
  };

  const removePrescriptionItem = (index: number) => {
    setPrescriptionItems(prescriptionItems.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, field: keyof RxItem, value: any) => {
    const updated = [...prescriptionItems];
    updated[index] = { ...updated[index], [field]: value };
    setPrescriptionItems(updated);
  };

  const handleCompleteConsultation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!diagnosisText) {
      alert('Please enter a clinical diagnosis.');
      return;
    }

    setIsSubmitting(true);
    try {
      await api.post('/consultations', {
        appointmentId,
        symptoms: symptoms ? symptoms.split(',').map((s) => s.trim()) : [],
        clinicalNotes,
        diagnosisText,
        treatmentPlan,
        doctorNotes,
        followUpDate: followUpDate || undefined,
        vitals: {
          bloodPressureSystolic: Number(vitals.bpSystolic),
          bloodPressureDiastolic: Number(vitals.bpDiastolic),
          heartRate: Number(vitals.heartRate),
          temperature: Number(vitals.temperature),
          respiratoryRate: Number(vitals.respiratoryRate),
          oxygenSaturation: Number(vitals.oxygenSaturation),
          weightKg: Number(vitals.weightKg),
          heightCm: Number(vitals.heightCm),
        },
        prescriptionItems: prescriptionItems.filter((p) => p.medicineName.trim().length > 0),
      });

      setSuccessMessage('Consultation finalized! Medical record, EMR timeline, and prescription successfully recorded.');
      setTimeout(() => {
        router.push(`/patients/${appointment.patientId}`);
      }, 1500);
    } catch (err: any) {
      alert(err.message || 'Failed to submit consultation findings');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="py-20 text-center text-xs text-slate-400">
          Loading clinical examination room...
        </div>
      </DashboardLayout>
    );
  }

  if (!appointment) {
    return (
      <DashboardLayout>
        <div className="p-8 text-center text-slate-500">Appointment not found.</div>
      </DashboardLayout>
    );
  }

  const patient = appointment.patient;

  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Banner */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Stethoscope className="w-6 h-6 text-blue-600" /> Physician Consultation Console
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Examination session for Appointment #{appointment.appointmentNumber}
            </p>
          </div>

          <Badge variant={appointment.status === 'COMPLETED' ? 'success' : 'warning'}>
            Status: {appointment.status}
          </Badge>
        </div>

        {successMessage && (
          <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs font-semibold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" /> {successMessage}
          </div>
        )}

        {/* Patient Profile Snapshot */}
        <Card className="bg-blue-50/40 dark:bg-blue-950/20 border-blue-200/60 dark:border-blue-900/40">
          <CardContent className="p-4 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold text-sm">
                {patient.firstName[0]}
                {patient.lastName[0]}
              </div>
              <div>
                <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">
                  {patient.firstName} {patient.lastName}
                </h3>
                <span className="font-mono text-xs text-blue-600 dark:text-blue-400 font-bold">
                  {patient.mrn} • {patient.gender} • Blood Group: {patient.bloodGroup.replace('_', ' ')}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-4 text-xs">
              <div>
                <span className="text-slate-400 block">Allergies</span>
                <span className="font-semibold text-rose-600">
                  {patient.allergies?.length > 0 ? patient.allergies.join(', ') : 'None Reported'}
                </span>
              </div>
              <div className="border-l border-slate-200 dark:border-slate-800 pl-4">
                <Link
                  href={`/patients/${patient.id}`}
                  target="_blank"
                  className="text-blue-600 hover:underline font-semibold"
                >
                  View Full 360° History ↗
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Consultation Form */}
        <form onSubmit={handleCompleteConsultation} className="space-y-6">
          {/* 1. Vital Signs */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <Activity className="w-4 h-4 text-rose-500" /> Objective Vitals Signs Intake
              </CardTitle>
              <CardDescription>Recorded physiological baseline parameters</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <Input
                  label="BP Systolic (mmHg)"
                  type="number"
                  value={vitals.bpSystolic}
                  onChange={(e) => setVitals({ ...vitals, bpSystolic: Number(e.target.value) })}
                />
                <Input
                  label="BP Diastolic (mmHg)"
                  type="number"
                  value={vitals.bpDiastolic}
                  onChange={(e) => setVitals({ ...vitals, bpDiastolic: Number(e.target.value) })}
                />
                <Input
                  label="Heart Rate (BPM)"
                  type="number"
                  value={vitals.heartRate}
                  onChange={(e) => setVitals({ ...vitals, heartRate: Number(e.target.value) })}
                />
                <Input
                  label="Temperature (°C)"
                  type="number"
                  step="0.1"
                  value={vitals.temperature}
                  onChange={(e) => setVitals({ ...vitals, temperature: Number(e.target.value) })}
                />
                <Input
                  label="Respiratory Rate (bpm)"
                  type="number"
                  value={vitals.respiratoryRate}
                  onChange={(e) => setVitals({ ...vitals, respiratoryRate: Number(e.target.value) })}
                />
                <Input
                  label="SpO2 Saturation (%)"
                  type="number"
                  value={vitals.oxygenSaturation}
                  onChange={(e) => setVitals({ ...vitals, oxygenSaturation: Number(e.target.value) })}
                />
                <Input
                  label="Body Weight (kg)"
                  type="number"
                  step="0.5"
                  value={vitals.weightKg}
                  onChange={(e) => setVitals({ ...vitals, weightKg: Number(e.target.value) })}
                />
                <Input
                  label="Height (cm)"
                  type="number"
                  value={vitals.heightCm}
                  onChange={(e) => setVitals({ ...vitals, heightCm: Number(e.target.value) })}
                />
              </div>
            </CardContent>
          </Card>

          {/* 2. Clinical Evaluation & Diagnosis */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <FileText className="w-4 h-4 text-blue-500" /> Clinical Assessment & Diagnosis
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Input
                label="Reported Symptoms (Comma-separated)"
                value={symptoms}
                onChange={(e) => setSymptoms(e.target.value)}
                placeholder="e.g. Substernal tightness, lightheadedness, fatigue"
              />

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  Clinical Examination Findings & Doctor Observations
                </label>
                <textarea
                  rows={3}
                  value={clinicalNotes}
                  onChange={(e) => setClinicalNotes(e.target.value)}
                  placeholder="Cardiac auscultation reveals regular S1/S2 rhythm without murmurs. Lungs clear to percussion."
                  className="w-full text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 p-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="Primary Clinical Diagnosis *"
                  required
                  value={diagnosisText}
                  onChange={(e) => setDiagnosisText(e.target.value)}
                  placeholder="e.g. Essential Hypertension, ICD-10 I10"
                />
                <Input
                  label="Recommended Follow-Up Date"
                  type="date"
                  value={followUpDate}
                  onChange={(e) => setFollowUpDate(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  Treatment Plan & Lifestyle Recommendations
                </label>
                <textarea
                  rows={2}
                  value={treatmentPlan}
                  onChange={(e) => setTreatmentPlan(e.target.value)}
                  placeholder="DASH diet, restrict dietary sodium to <2g/day, 30 min daily brisk walking."
                  className="w-full text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 p-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </CardContent>
          </Card>

          {/* 3. Electronic Prescription Generator */}
          <Card>
            <CardHeader className="flex items-center justify-between">
              <div>
                <CardTitle className="text-sm flex items-center gap-2">
                  <Pill className="w-4 h-4 text-emerald-500" /> Prescribe Medications
                </CardTitle>
                <CardDescription>Auto-dispatched to the central hospital pharmacy</CardDescription>
              </div>
              <Button type="button" size="sm" variant="outline" onClick={addPrescriptionItem}>
                <Plus className="w-3.5 h-3.5 mr-1" /> Add Medication
              </Button>
            </CardHeader>
            <CardContent className="space-y-3">
              {prescriptionItems.map((item, idx) => (
                <div
                  key={idx}
                  className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 space-y-3"
                >
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">
                        Drug / Formulation
                      </label>
                      <input
                        list="med-list"
                        value={item.medicineName}
                        onChange={(e) => updateItem(idx, 'medicineName', e.target.value)}
                        placeholder="Type medicine name..."
                        className="w-full text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 p-1.5"
                      />
                      <datalist id="med-list">
                        {medicines.map((m) => (
                          <option key={m.id} value={m.name} />
                        ))}
                      </datalist>
                    </div>

                    <div>
                      <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">
                        Dosage Strength
                      </label>
                      <input
                        value={item.dosage}
                        onChange={(e) => updateItem(idx, 'dosage', e.target.value)}
                        placeholder="e.g. 500mg, 1 tablet"
                        className="w-full text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 p-1.5"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">
                        Frequency
                      </label>
                      <input
                        value={item.frequency}
                        onChange={(e) => updateItem(idx, 'frequency', e.target.value)}
                        placeholder="e.g. Twice daily after meals"
                        className="w-full text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 p-1.5"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
                    <div>
                      <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">
                        Duration (Days)
                      </label>
                      <input
                        type="number"
                        value={item.durationDays}
                        onChange={(e) => updateItem(idx, 'durationDays', Number(e.target.value))}
                        className="w-full text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 p-1.5"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">
                        Patient Instructions
                      </label>
                      <input
                        value={item.instructions}
                        onChange={(e) => updateItem(idx, 'instructions', e.target.value)}
                        placeholder="Take with water, avoid alcohol"
                        className="w-full text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 p-1.5"
                      />
                    </div>

                    <div className="flex justify-end">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removePrescriptionItem(idx)}
                        className="text-rose-500 hover:text-rose-700 hover:bg-rose-50"
                      >
                        <Trash2 className="w-3.5 h-3.5 mr-1" /> Remove
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex items-center justify-between pt-4">
            <Link href="/appointments">
              <Button type="button" variant="outline">
                Cancel / Return to Schedule
              </Button>
            </Link>
            <Button type="submit" size="lg" isLoading={isSubmitting}>
              Finalize Consultation & Commit to EMR <CheckCircle2 className="w-4 h-4 ml-1.5" />
            </Button>
          </div>
        </form>
      </div>
    </DashboardLayout>
  );
}
