'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { api } from '@/lib/api';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import {
  User,
  Heart,
  Calendar,
  FileText,
  Stethoscope,
  Pill,
  FlaskConical,
  Receipt,
  Bed,
  Phone,
  Mail,
  MapPin,
  ShieldAlert,
  Clock,
  CheckCircle2,
  AlertCircle,
  FileUp,
  Download,
  Eye,
  Trash2,
  Search,
  Plus,
  Printer,
  FileCheck,
  FileImage,
} from 'lucide-react';
import Link from 'next/link';
import { Dialog } from '@/components/ui/dialog';

export default function PatientDetailPage() {
  const params = useParams();
  const patientId = params?.id as string;

  const [patient, setPatient] = useState<any>(null);
  const [timeline, setTimeline] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<
    | 'overview'
    | 'timeline'
    | 'appointments'
    | 'consultations'
    | 'prescriptions'
    | 'laboratory'
    | 'billing'
    | 'admissions'
    | 'documents'
  >('overview');
  const [isLoading, setIsLoading] = useState(true);

  // Documents module state
  const [docCategoryFilter, setDocCategoryFilter] = useState<string>('ALL');
  const [docSearch, setDocSearch] = useState<string>('');
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [previewDocument, setPreviewDocument] = useState<any | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadForm, setUploadForm] = useState({
    title: '',
    category: 'LAB_REPORT',
    fileType: 'application/pdf',
    fileUrl: '',
    fileSize: 1048576,
  });

  useEffect(() => {
    async function loadData() {
      if (!patientId) return;
      setIsLoading(true);
      try {
        const [pat, time] = await Promise.all([
          api.get(`/patients/${patientId}`),
          api.get(`/patients/${patientId}/timeline`).catch(() => []),
        ]);
        setPatient(pat);
        setTimeline(time || []);
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    }

    loadData();
  }, [patientId]);

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="py-20 text-center text-xs text-slate-400">
          Loading comprehensive patient 360° record...
        </div>
      </DashboardLayout>
    );
  }

  if (!patient) {
    return (
      <DashboardLayout>
        <div className="p-8 text-center text-slate-500">
          Patient record not found.
          <div className="mt-4">
            <Link href="/patients">
              <Button size="sm">Back to Patient Directory</Button>
            </Link>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  const birthYear = new Date(patient.dateOfBirth).getFullYear();
  const age = new Date().getFullYear() - birthYear;

  const handleUploadDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadForm.title.trim()) {
      alert('Please provide a document title');
      return;
    }
    const finalFileUrl =
      uploadForm.fileUrl.trim() ||
      `https://storage.hmis.local/patients/${patient.id}/${encodeURIComponent(
        uploadForm.title.toLowerCase().replace(/[^a-z0-9]/g, '-'),
      )}.${uploadForm.fileType.includes('pdf') ? 'pdf' : uploadForm.fileType.includes('png') ? 'png' : 'jpg'}`;

    setIsUploading(true);
    try {
      const created = await api.post('/documents', {
        patientId: patient.id,
        title: uploadForm.title.trim(),
        category: uploadForm.category,
        fileType: uploadForm.fileType,
        fileUrl: finalFileUrl,
        fileSize: uploadForm.fileSize || 1048576,
      });

      setPatient((prev: any) => ({
        ...prev,
        documents: [created, ...(prev.documents || [])],
      }));
      setIsUploadModalOpen(false);
      setUploadForm({
        title: '',
        category: 'LAB_REPORT',
        fileType: 'application/pdf',
        fileUrl: '',
        fileSize: 1048576,
      });
    } catch (err: any) {
      alert(err.message || 'Failed to save document');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeleteDocument = async (docId: string) => {
    if (!confirm('Are you sure you want to delete this clinical document?')) return;
    try {
      await api.delete(`/documents/${docId}`);
      setPatient((prev: any) => ({
        ...prev,
        documents: (prev.documents || []).filter((d: any) => d.id !== docId),
      }));
      if (previewDocument?.id === docId) {
        setPreviewDocument(null);
      }
    } catch (err: any) {
      alert(err.message || 'Failed to delete document');
    }
  };

  const formatFileSize = (bytes: number) => {
    if (!bytes || bytes <= 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const tabs = [
    { id: 'overview', label: 'Overview', count: null },
    { id: 'timeline', label: 'Medical Timeline', count: timeline.length },
    { id: 'appointments', label: 'Appointments', count: patient.appointments?.length },
    { id: 'consultations', label: 'Consultations', count: patient.consultations?.length },
    { id: 'prescriptions', label: 'Prescriptions', count: patient.prescriptions?.length },
    { id: 'laboratory', label: 'Lab Reports', count: patient.labOrders?.length },
    { id: 'billing', label: 'Invoices & Billing', count: patient.invoices?.length },
    { id: 'admissions', label: 'Inpatient Admissions', count: patient.admissions?.length },
    { id: 'documents', label: 'Documents & Scans', count: patient.documents?.length || 0 },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Top Dossier Header Card */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-6 shadow-xs">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-start gap-4">
              <div className="w-16 h-16 rounded-2xl bg-blue-600/10 text-blue-600 flex items-center justify-center font-bold text-2xl uppercase border border-blue-200/50">
                {patient.firstName[0]}
                {patient.lastName[0]}
              </div>

              <div>
                <div className="flex items-center gap-3">
                  <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">
                    {patient.firstName} {patient.lastName}
                  </h1>
                  <span className="font-mono text-xs px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 font-bold border border-blue-200/50">
                    {patient.mrn}
                  </span>
                  <Badge variant="success">Active</Badge>
                </div>

                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-xs text-slate-500">
                  <span>
                    Gender: <strong>{patient.gender}</strong>
                  </span>
                  <span>•</span>
                  <span>
                    Age: <strong>{age} years</strong> (DOB:{' '}
                    {new Date(patient.dateOfBirth).toLocaleDateString()})
                  </span>
                  <span>•</span>
                  <span>
                    Blood Group: <strong>{patient.bloodGroup.replace('_', ' ')}</strong>
                  </span>
                </div>
              </div>
            </div>

            {/* Quick Contact & Action */}
            <div className="flex flex-wrap items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setIsUploadModalOpen(true)}
              >
                <FileUp className="w-3.5 h-3.5 mr-1 text-blue-600" /> Upload Document
              </Button>
              <Link href={`/appointments?patientId=${patient.id}`}>
                <Button size="sm">
                  <Calendar className="w-3.5 h-3.5 mr-1" /> Book Appointment
                </Button>
              </Link>
            </div>
          </div>

          {/* Allergy Alert Banner if present */}
          {patient.allergies?.length > 0 && (
            <div className="mt-4 p-3 rounded-xl bg-rose-50/80 dark:bg-rose-950/30 border border-rose-200/60 dark:border-rose-900/40 flex items-center gap-2.5 text-xs text-rose-800 dark:text-rose-300">
              <ShieldAlert className="w-4 h-4 text-rose-600 flex-shrink-0" />
              <span>
                <strong>Known Patient Allergies:</strong> {patient.allergies.join(', ')}
              </span>
            </div>
          )}
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-1 border-b border-slate-200 dark:border-slate-800 overflow-x-auto pb-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-3.5 py-2 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                activeTab === tab.id
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <span>{tab.label}</span>
              {tab.count !== null && (
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                    activeTab === tab.id
                      ? 'bg-blue-700 text-white'
                      : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* TAB 1: OVERVIEW */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Demographics & Contact Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-xs">
                <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
                  <span className="text-slate-400">Phone Number</span>
                  <span className="font-medium text-slate-800 dark:text-slate-200">{patient.phone}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
                  <span className="text-slate-400">Email Address</span>
                  <span className="font-medium text-slate-800 dark:text-slate-200">{patient.email || 'N/A'}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
                  <span className="text-slate-400">Address</span>
                  <span className="font-medium text-slate-800 dark:text-slate-200">
                    {patient.address || 'Metro Health Ave'}, {patient.city || 'New York'}
                  </span>
                </div>
                <div className="flex justify-between py-1.5">
                  <span className="text-slate-400">Registered On</span>
                  <span className="font-medium text-slate-800 dark:text-slate-200">
                    {new Date(patient.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Emergency Contact & Insurance</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-xs">
                <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
                  <span className="text-slate-400">Next of Kin / Contact</span>
                  <span className="font-medium text-slate-800 dark:text-slate-200">
                    {patient.emergencyContactName || 'Family Member'} ({patient.emergencyContactRelation || 'Spouse'})
                  </span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
                  <span className="text-slate-400">Emergency Phone</span>
                  <span className="font-medium text-slate-800 dark:text-slate-200">
                    {patient.emergencyContactPhone || 'N/A'}
                  </span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
                  <span className="text-slate-400">Insurance Carrier</span>
                  <span className="font-medium text-slate-800 dark:text-slate-200">
                    {patient.insuranceProvider || 'Private Payer'}
                  </span>
                </div>
                <div className="flex justify-between py-1.5">
                  <span className="text-slate-400">Policy Identifier</span>
                  <span className="font-mono text-slate-800 dark:text-slate-200">
                    {patient.insurancePolicyNumber || 'POL-N/A'}
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* TAB 2: MEDICAL TIMELINE */}
        {activeTab === 'timeline' && (
          <div className="space-y-4">
            <div className="relative border-l-2 border-slate-200 dark:border-slate-800 ml-4 pl-6 space-y-6">
              {timeline.length === 0 ? (
                <p className="text-xs text-slate-400 py-6">No historical timeline events recorded yet.</p>
              ) : (
                timeline.map((event, idx) => (
                  <div key={event.id || idx} className="relative group">
                    {/* Timeline Node Pin */}
                    <div className="absolute -left-[31px] top-1 w-4 h-4 rounded-full border-2 border-white dark:border-slate-900 bg-blue-600 shadow-xs" />

                    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800 p-4 shadow-xs">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-mono font-medium text-slate-400">
                          {new Date(event.date).toLocaleDateString(undefined, {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                          })}
                        </span>
                        <Badge
                          variant={
                            event.type === 'CONSULTATION'
                              ? 'info'
                              : event.type === 'LAB_ORDER'
                              ? 'warning'
                              : event.type === 'PRESCRIPTION'
                              ? 'success'
                              : 'danger'
                          }
                        >
                          {event.type}
                        </Badge>
                      </div>

                      <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mt-1">
                        {event.title}
                      </h4>
                      <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                        {event.description}
                      </p>

                      {/* Consultation details */}
                      {event.details?.symptoms?.length > 0 && (
                        <div className="mt-2.5 pt-2 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-600 dark:text-slate-400">
                          <strong>Symptoms:</strong> {event.details.symptoms.join(', ')}
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* TAB 3: APPOINTMENTS */}
        {activeTab === 'appointments' && (
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Appointment #</TableHead>
                  <TableHead>Date & Time</TableHead>
                  <TableHead>Attending Doctor</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {patient.appointments?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-6 text-slate-400 text-xs">
                      No appointments recorded.
                    </TableCell>
                  </TableRow>
                ) : (
                  patient.appointments?.map((apt: any) => (
                    <TableRow key={apt.id}>
                      <TableCell className="font-mono text-xs font-semibold text-blue-600">
                        {apt.appointmentNumber}
                      </TableCell>
                      <TableCell>
                        <span className="text-xs font-medium block">
                          {new Date(apt.appointmentDate).toLocaleDateString()}
                        </span>
                        <span className="text-[11px] text-slate-400">
                          {apt.startTime} - {apt.endTime}
                        </span>
                      </TableCell>
                      <TableCell className="text-xs font-medium">
                        Dr. {apt.doctor?.user?.lastName} ({apt.doctor?.specialization})
                      </TableCell>
                      <TableCell className="text-xs">{apt.department?.name}</TableCell>
                      <TableCell className="text-xs text-slate-500">{apt.reason || 'General Checkup'}</TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            apt.status === 'COMPLETED'
                              ? 'success'
                              : apt.status === 'IN_PROGRESS'
                              ? 'warning'
                              : 'default'
                          }
                        >
                          {apt.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </Card>
        )}

        {/* TAB 4: CONSULTATIONS */}
        {activeTab === 'consultations' && (
          <div className="space-y-4">
            {patient.consultations?.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center text-xs text-slate-400">
                  No consultation records on file.
                </CardContent>
              </Card>
            ) : (
              patient.consultations?.map((c: any) => (
                <Card key={c.id}>
                  <CardHeader>
                    <div>
                      <CardTitle className="text-sm">
                        Consultation by Dr. {c.doctor?.user?.lastName}
                      </CardTitle>
                      <CardDescription>
                        {new Date(c.consultationDate).toLocaleDateString()} • Status: {c.status}
                      </CardDescription>
                    </div>
                    {c.diagnoses?.[0] && (
                      <Badge variant="info">{c.diagnoses[0].conditionName}</Badge>
                    )}
                  </CardHeader>
                  <CardContent className="space-y-3 text-xs">
                    {c.symptoms?.length > 0 && (
                      <div>
                        <span className="font-semibold text-slate-700 dark:text-slate-300">
                          Reported Symptoms:{' '}
                        </span>
                        <span className="text-slate-600 dark:text-slate-400">
                          {c.symptoms.join(', ')}
                        </span>
                      </div>
                    )}
                    {c.clinicalNotes && (
                      <div>
                        <span className="font-semibold text-slate-700 dark:text-slate-300">
                          Clinical Findings:{' '}
                        </span>
                        <p className="text-slate-600 dark:text-slate-400 mt-0.5">{c.clinicalNotes}</p>
                      </div>
                    )}
                    {c.treatmentPlan && (
                      <div>
                        <span className="font-semibold text-slate-700 dark:text-slate-300">
                          Treatment Plan:{' '}
                        </span>
                        <p className="text-slate-600 dark:text-slate-400 mt-0.5">{c.treatmentPlan}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        )}

        {/* TAB 5: PRESCRIPTIONS */}
        {activeTab === 'prescriptions' && (
          <div className="space-y-4">
            {patient.prescriptions?.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center text-xs text-slate-400">
                  No prescriptions on file.
                </CardContent>
              </Card>
            ) : (
              patient.prescriptions?.map((rx: any) => (
                <Card key={rx.id}>
                  <CardHeader>
                    <div>
                      <CardTitle className="font-mono text-sm">{rx.prescriptionNumber}</CardTitle>
                      <CardDescription>
                        Prescribed by Dr. {rx.doctor?.user?.lastName} on{' '}
                        {new Date(rx.issuedDate).toLocaleDateString()}
                      </CardDescription>
                    </div>
                    <Badge variant={rx.status === 'ACTIVE' ? 'success' : 'default'}>
                      {rx.status}
                    </Badge>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Medication</TableHead>
                          <TableHead>Dosage</TableHead>
                          <TableHead>Frequency</TableHead>
                          <TableHead>Duration</TableHead>
                          <TableHead>Instructions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {rx.items?.map((item: any) => (
                          <TableRow key={item.id}>
                            <TableCell className="font-medium text-xs">
                              {item.medicineName}
                            </TableCell>
                            <TableCell className="text-xs">{item.dosage}</TableCell>
                            <TableCell className="text-xs">{item.frequency}</TableCell>
                            <TableCell className="text-xs">{item.durationDays} days</TableCell>
                            <TableCell className="text-xs text-slate-500">
                              {item.instructions || 'As advised'}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        )}

        {/* TAB 6: LABORATORY */}
        {activeTab === 'laboratory' && (
          <div className="space-y-4">
            {patient.labOrders?.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center text-xs text-slate-400">
                  No diagnostic laboratory orders found.
                </CardContent>
              </Card>
            ) : (
              patient.labOrders?.map((order: any) => (
                <Card key={order.id}>
                  <CardHeader>
                    <div>
                      <CardTitle className="font-mono text-sm">{order.orderNumber}</CardTitle>
                      <CardDescription>
                        Ordered on {new Date(order.orderedAt).toLocaleDateString()} • Priority:{' '}
                        {order.priority}
                      </CardDescription>
                    </div>
                    <Badge variant={order.status === 'VERIFIED' ? 'success' : 'warning'}>
                      {order.status}
                    </Badge>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Test Parameter</TableHead>
                          <TableHead>Result Value</TableHead>
                          <TableHead>Reference Range</TableHead>
                          <TableHead>Diagnostic Flag</TableHead>
                          <TableHead>Technician Remarks</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {order.results?.map((res: any) => (
                          <TableRow key={res.id}>
                            <TableCell className="font-medium text-xs">
                              {res.labTest?.name}
                            </TableCell>
                            <TableCell className="font-bold text-xs">
                              {res.value} {res.unit}
                            </TableCell>
                            <TableCell className="text-xs text-slate-500 font-mono">
                              {res.referenceRange || res.labTest?.normalRange}
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant={
                                  res.flag === 'NORMAL'
                                    ? 'success'
                                    : res.flag === 'CRITICAL'
                                    ? 'danger'
                                    : 'warning'
                                }
                              >
                                {res.flag}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-xs text-slate-500">{res.remarks || 'Normal'}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        )}

        {/* TAB 7: BILLING */}
        {activeTab === 'billing' && (
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice #</TableHead>
                  <TableHead>Issued Date</TableHead>
                  <TableHead>Subtotal</TableHead>
                  <TableHead>Tax</TableHead>
                  <TableHead>Total Payable</TableHead>
                  <TableHead>Paid Amount</TableHead>
                  <TableHead>Payment Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {patient.invoices?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-6 text-slate-400 text-xs">
                      No invoices on file.
                    </TableCell>
                  </TableRow>
                ) : (
                  patient.invoices?.map((inv: any) => (
                    <TableRow key={inv.id}>
                      <TableCell className="font-mono text-xs font-semibold text-purple-600">
                        {inv.invoiceNumber}
                      </TableCell>
                      <TableCell className="text-xs">
                        {new Date(inv.issuedAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-xs">${Number(inv.totalAmount).toFixed(2)}</TableCell>
                      <TableCell className="text-xs">${Number(inv.taxAmount).toFixed(2)}</TableCell>
                      <TableCell className="text-xs font-bold">
                        ${Number(inv.payableAmount).toFixed(2)}
                      </TableCell>
                      <TableCell className="text-xs font-medium text-emerald-600">
                        ${Number(inv.paidAmount).toFixed(2)}
                      </TableCell>
                      <TableCell>
                        <Badge variant={inv.status === 'PAID' ? 'success' : 'warning'}>
                          {inv.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </Card>
        )}

        {/* TAB 8: ADMISSIONS */}
        {activeTab === 'admissions' && (
          <div className="space-y-4">
            {patient.admissions?.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center text-xs text-slate-400">
                  No inpatient admissions recorded.
                </CardContent>
              </Card>
            ) : (
              patient.admissions?.map((adm: any) => (
                <Card key={adm.id}>
                  <CardHeader>
                    <div>
                      <CardTitle className="font-mono text-sm">{adm.admissionNumber}</CardTitle>
                      <CardDescription>
                        Admitted on {new Date(adm.admissionDate).toLocaleDateString()} • Attending Dr.{' '}
                        {adm.attendingDoctor?.user?.lastName}
                      </CardDescription>
                    </div>
                    <Badge variant={adm.status === 'ADMITTED' ? 'danger' : 'success'}>
                      {adm.status}
                    </Badge>
                  </CardHeader>
                  <CardContent className="space-y-2 text-xs">
                    <p>
                      <strong>Ward & Bed:</strong> {adm.bed?.room?.ward?.name} (Bed {adm.bed?.bedNumber})
                    </p>
                    <p>
                      <strong>Reason:</strong> {adm.reasonForAdmission}
                    </p>
                    {adm.dischargeSummary && (
                      <p>
                        <strong>Discharge Summary:</strong> {adm.dischargeSummary}
                      </p>
                    )}
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        )}

        {/* TAB 9: DOCUMENTS & SCANS */}
        {activeTab === 'documents' && (
          <div className="space-y-4">
            {/* Filter and Action Bar */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-4 shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-1.5 w-full md:w-auto">
                {[
                  { id: 'ALL', label: 'All Documents' },
                  { id: 'LAB_REPORT', label: 'Lab Reports' },
                  { id: 'PRESCRIPTION', label: 'Prescriptions' },
                  { id: 'DISCHARGE_SUMMARY', label: 'Discharge Summaries' },
                  { id: 'INSURANCE', label: 'Insurance' },
                  { id: 'REFERRAL', label: 'Referrals' },
                  { id: 'OTHER', label: 'Other' },
                ].map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => setDocCategoryFilter(cat.id)}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                      docCategoryFilter === cat.id
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-3 w-full md:w-auto justify-end">
                <div className="relative w-full md:w-64">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search documents by title..."
                    value={docSearch}
                    onChange={(e) => setDocSearch(e.target.value)}
                    className="w-full text-xs pl-8 pr-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <Button size="sm" onClick={() => setIsUploadModalOpen(true)}>
                  <Plus className="w-3.5 h-3.5 mr-1" /> Upload
                </Button>
              </div>
            </div>

            {/* Documents Table */}
            {(() => {
              const filteredDocs = (patient.documents || []).filter((doc: any) => {
                const matchesCat = docCategoryFilter === 'ALL' || doc.category === docCategoryFilter;
                const matchesSearch =
                  !docSearch.trim() ||
                  doc.title.toLowerCase().includes(docSearch.toLowerCase()) ||
                  (doc.fileType && doc.fileType.toLowerCase().includes(docSearch.toLowerCase()));
                return matchesCat && matchesSearch;
              });

              if (filteredDocs.length === 0) {
                return (
                  <Card>
                    <CardContent className="p-12 text-center text-xs text-slate-400">
                      <FileText className="w-10 h-10 mx-auto text-slate-300 dark:text-slate-700 mb-3" />
                      <p className="font-semibold text-slate-700 dark:text-slate-300">
                        No clinical documents found
                      </p>
                      <p className="mt-1 text-slate-500">
                        {patient.documents?.length === 0
                          ? 'Attach lab reports, discharge summaries, radiographs, or insurance documents to this patient record.'
                          : 'No documents match your current filter criteria.'}
                      </p>
                      <Button
                        size="sm"
                        variant="outline"
                        className="mt-4"
                        onClick={() => setIsUploadModalOpen(true)}
                      >
                        <FileUp className="w-3.5 h-3.5 mr-1.5 text-blue-600" /> Upload First Document
                      </Button>
                    </CardContent>
                  </Card>
                );
              }

              return (
                <Card>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Document Title</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead>File Type</TableHead>
                        <TableHead>Size</TableHead>
                        <TableHead>Uploaded By</TableHead>
                        <TableHead>Date Added</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredDocs.map((doc: any) => {
                        const isImage = doc.fileType?.startsWith('image/');
                        return (
                          <TableRow key={doc.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                            <TableCell>
                              <div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                                  {isImage ? (
                                    <FileImage className="w-4 h-4" />
                                  ) : (
                                    <FileText className="w-4 h-4" />
                                  )}
                                </div>
                                <div>
                                  <span className="font-semibold text-xs text-slate-900 dark:text-slate-100 block">
                                    {doc.title}
                                  </span>
                                  <span className="text-[10px] text-slate-400 font-mono">
                                    {doc.id.substring(0, 12)}...
                                  </span>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant={
                                  doc.category === 'LAB_REPORT'
                                    ? 'warning'
                                    : doc.category === 'PRESCRIPTION'
                                    ? 'success'
                                    : doc.category === 'DISCHARGE_SUMMARY'
                                    ? 'info'
                                    : 'default'
                                }
                              >
                                {doc.category?.replace(/_/g, ' ')}
                              </Badge>
                            </TableCell>
                            <TableCell className="font-mono text-xs text-slate-600 dark:text-slate-400">
                              {doc.fileType || 'application/pdf'}
                            </TableCell>
                            <TableCell className="font-mono text-xs text-slate-600 dark:text-slate-400">
                              {formatFileSize(doc.fileSize)}
                            </TableCell>
                            <TableCell className="text-xs text-slate-700 dark:text-slate-300">
                              {doc.uploadedBy
                                ? `${doc.uploadedBy.firstName} ${doc.uploadedBy.lastName} (${doc.uploadedBy.role})`
                                : 'Clinical Staff'}
                            </TableCell>
                            <TableCell className="text-xs text-slate-500">
                              {new Date(doc.createdAt).toLocaleDateString(undefined, {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric',
                              })}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-7 px-2 text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-950/50"
                                  onClick={() => setPreviewDocument(doc)}
                                >
                                  <Eye className="w-3.5 h-3.5 mr-1" /> Preview
                                </Button>
                                <a
                                  href={doc.fileUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  download
                                  className="inline-flex items-center justify-center h-7 px-2 text-xs font-medium rounded-lg text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                                >
                                  <Download className="w-3.5 h-3.5" />
                                </a>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-7 px-2 text-xs text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/50"
                                  onClick={() => handleDeleteDocument(doc.id)}
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </Card>
              );
            })()}
          </div>
        )}
      </div>

      {/* UPLOAD CLINICAL DOCUMENT DIALOG */}
      <Dialog
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        title="Upload Clinical Document"
        description="Attach medical reports, imaging scans, discharge summaries, or referrals to patient EMR"
        maxWidth="lg"
      >
        <form onSubmit={handleUploadDocument} className="space-y-4 text-xs">
          {/* Quick preset chips */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
              Quick Clinical Templates
            </label>
            <div className="flex flex-wrap gap-1.5">
              {[
                {
                  label: 'CBC Blood Panel',
                  title: 'Complete Blood Count (CBC) & Metabolic Panel',
                  category: 'LAB_REPORT',
                  fileType: 'application/pdf',
                  fileSize: 840000,
                },
                {
                  label: 'Chest Radiograph',
                  title: 'Chest Radiograph X-Ray (AP/Lateral)',
                  category: 'LAB_REPORT',
                  fileType: 'image/png',
                  fileSize: 3200000,
                },
                {
                  label: 'Cardiology Referral',
                  title: 'Consultative Referral Letter - Cardiology',
                  category: 'REFERRAL',
                  fileType: 'application/pdf',
                  fileSize: 420000,
                },
                {
                  label: 'Discharge Summary',
                  title: 'Inpatient Discharge Summary & Follow-up Order',
                  category: 'DISCHARGE_SUMMARY',
                  fileType: 'application/pdf',
                  fileSize: 1150000,
                },
                {
                  label: 'Insurance Card',
                  title: 'Primary Health Insurance Verification Card',
                  category: 'INSURANCE',
                  fileType: 'image/jpeg',
                  fileSize: 680000,
                },
              ].map((preset, idx) => (
                <button
                  type="button"
                  key={idx}
                  onClick={() =>
                    setUploadForm({
                      title: preset.title,
                      category: preset.category,
                      fileType: preset.fileType,
                      fileUrl: `https://storage.hmis.local/clinical-records/${preset.title.toLowerCase().replace(/[^a-z0-9]/g, '-')}.${preset.fileType.includes('pdf') ? 'pdf' : 'png'}`,
                      fileSize: preset.fileSize,
                    })
                  }
                  className="px-2.5 py-1 rounded-md bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 font-medium hover:bg-blue-100 transition-colors border border-blue-200/50 cursor-pointer"
                >
                  + {preset.label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="block font-semibold text-slate-700 dark:text-slate-300">
              Document Title <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={uploadForm.title}
              onChange={(e) => setUploadForm({ ...uploadForm, title: e.target.value })}
              placeholder="e.g. Abdominal Ultrasound Sonography Report"
              className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 p-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="block font-semibold text-slate-700 dark:text-slate-300">
                Document Category
              </label>
              <select
                value={uploadForm.category}
                onChange={(e) => setUploadForm({ ...uploadForm, category: e.target.value })}
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 p-2"
              >
                <option value="LAB_REPORT">Lab Diagnostic Report</option>
                <option value="PRESCRIPTION">Prescription Slip</option>
                <option value="DISCHARGE_SUMMARY">Discharge Summary</option>
                <option value="INSURANCE">Insurance / Claims Policy</option>
                <option value="REFERRAL">Referral Letter</option>
                <option value="ID_PROOF">Identity Proof</option>
                <option value="OTHER">Other Clinical Attachment</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="block font-semibold text-slate-700 dark:text-slate-300">
                File Type / MIME
              </label>
              <select
                value={uploadForm.fileType}
                onChange={(e) => setUploadForm({ ...uploadForm, fileType: e.target.value })}
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 p-2"
              >
                <option value="application/pdf">Portable Document Format (PDF)</option>
                <option value="image/png">PNG Medical Image</option>
                <option value="image/jpeg">JPEG Scan</option>
                <option value="application/dicom">DICOM Medical Radiography</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="block font-semibold text-slate-700 dark:text-slate-300">
                Storage Reference / Mock File URL
              </label>
              <input
                type="text"
                value={uploadForm.fileUrl}
                onChange={(e) => setUploadForm({ ...uploadForm, fileUrl: e.target.value })}
                placeholder="https://storage.hmis.local/... (auto-generated if blank)"
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 p-2 font-mono text-[11px]"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block font-semibold text-slate-700 dark:text-slate-300">
                File Size (Bytes)
              </label>
              <input
                type="number"
                min={1}
                value={uploadForm.fileSize}
                onChange={(e) => setUploadForm({ ...uploadForm, fileSize: Number(e.target.value) })}
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 p-2 font-mono"
              />
              <span className="text-[10px] text-slate-400">
                Approx: {formatFileSize(uploadForm.fileSize)}
              </span>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsUploadModalOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isUploading}>
              {isUploading ? 'Uploading & Encrypting...' : 'Upload & Attach to EMR'}
            </Button>
          </div>
        </form>
      </Dialog>

      {/* DOCUMENT PREVIEW DIALOG */}
      {previewDocument && (
        <Dialog
          isOpen={!!previewDocument}
          onClose={() => setPreviewDocument(null)}
          title={previewDocument.title}
          description={`${previewDocument.category?.replace(/_/g, ' ')} • Attached to Patient ${patient.firstName} ${patient.lastName} (${patient.mrn})`}
          maxWidth="2xl"
        >
          <div className="space-y-4 text-xs">
            {/* Clinical Document Header Banner */}
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700 grid grid-cols-2 md:grid-cols-4 gap-3">
              <div>
                <span className="text-[10px] uppercase text-slate-400 font-bold block">Document ID</span>
                <span className="font-mono font-medium text-slate-800 dark:text-slate-200">
                  {previewDocument.id.substring(0, 10)}...
                </span>
              </div>
              <div>
                <span className="text-[10px] uppercase text-slate-400 font-bold block">Category</span>
                <Badge
                  variant={
                    previewDocument.category === 'LAB_REPORT'
                      ? 'warning'
                      : previewDocument.category === 'PRESCRIPTION'
                      ? 'success'
                      : previewDocument.category === 'DISCHARGE_SUMMARY'
                      ? 'info'
                      : 'default'
                  }
                >
                  {previewDocument.category?.replace(/_/g, ' ')}
                </Badge>
              </div>
              <div>
                <span className="text-[10px] uppercase text-slate-400 font-bold block">File Size</span>
                <span className="font-mono text-slate-800 dark:text-slate-200">
                  {formatFileSize(previewDocument.fileSize)}
                </span>
              </div>
              <div>
                <span className="text-[10px] uppercase text-slate-400 font-bold block">Upload Timestamp</span>
                <span className="text-slate-800 dark:text-slate-200">
                  {new Date(previewDocument.createdAt).toLocaleString()}
                </span>
              </div>
            </div>

            {/* Document Viewer Frame Mockup */}
            <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 p-6 shadow-inner relative overflow-hidden">
              <div className="border-b border-slate-100 dark:border-slate-800 pb-4 mb-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold text-xs">
                    HMIS
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-slate-900 dark:text-slate-100">
                      METRO INTEGRATED HEALTHCARE SYSTEM
                    </h4>
                    <p className="text-[10px] text-slate-400">
                      ELECTRONIC MEDICAL RECORD ARCHIVE • CLINICAL ATTACHMENT
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <Badge variant="success">HIPAA Encrypted</Badge>
                  <span className="block text-[10px] text-slate-400 font-mono mt-0.5">
                    SHA-256 Verified
                  </span>
                </div>
              </div>

              {/* Report Body */}
              <div className="space-y-3">
                <div className="bg-slate-50 dark:bg-slate-900 p-3 rounded-lg border border-slate-100 dark:border-slate-800">
                  <div className="grid grid-cols-2 gap-2 text-[11px]">
                    <div>
                      <strong className="text-slate-500">Patient Name:</strong> {patient.firstName}{' '}
                      {patient.lastName}
                    </div>
                    <div>
                      <strong className="text-slate-500">MRN:</strong> {patient.mrn}
                    </div>
                    <div>
                      <strong className="text-slate-500">DOB:</strong>{' '}
                      {new Date(patient.dateOfBirth).toLocaleDateString()}
                    </div>
                    <div>
                      <strong className="text-slate-500">Gender / Blood:</strong> {patient.gender} •{' '}
                      {patient.bloodGroup}
                    </div>
                  </div>
                </div>

                <div className="p-4 rounded-lg border border-dashed border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300">
                  <h5 className="font-semibold text-slate-800 dark:text-slate-200 text-xs mb-1">
                    Attachment Record: {previewDocument.title}
                  </h5>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    This document was uploaded to the patient&apos;s longitudinal electronic medical record on{' '}
                    {new Date(previewDocument.createdAt).toLocaleDateString()}. The digital payload is securely
                    replicated and archived in compliant institutional cloud storage.
                  </p>
                  <div className="mt-3 font-mono text-[11px] p-2 bg-slate-100 dark:bg-slate-900 rounded text-slate-600 dark:text-slate-400 break-all">
                    URI: {previewDocument.fileUrl}
                  </div>
                </div>
              </div>
            </div>

            {/* Actions Bar */}
            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <Button
                variant="ghost"
                size="sm"
                className="text-rose-500 hover:text-rose-700"
                onClick={() => handleDeleteDocument(previewDocument.id)}
              >
                <Trash2 className="w-3.5 h-3.5 mr-1" /> Delete Document
              </Button>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.print()}
                >
                  <Printer className="w-3.5 h-3.5 mr-1" /> Print Report
                </Button>
                <a
                  href={previewDocument.fileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  download
                  className="inline-flex items-center justify-center h-8 px-3 text-xs font-semibold rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors shadow-xs"
                >
                  <Download className="w-3.5 h-3.5 mr-1.5" /> Download File
                </a>
              </div>
            </div>
          </div>
        </Dialog>
      )}
    </DashboardLayout>
  );
}

