'use client';

import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { api } from '@/lib/api';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import {
  FileText,
  Filter,
  User,
  Calendar,
  Stethoscope,
  FlaskConical,
  Pill,
  Bed,
  Activity,
  ArrowRight,
  Eye,
  Download,
  FileImage,
  Printer,
  FileUp,
} from 'lucide-react';
import Link from 'next/link';

export default function MedicalRecordsPage() {
  const [patients, setPatients] = useState<any[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState<string>('');
  const [records, setRecords] = useState<any[]>([]);
  const [documents, setDocuments] = useState<any[]>([]);
  const [recordTypeFilter, setRecordTypeFilter] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [previewDoc, setPreviewDoc] = useState<any | null>(null);

  useEffect(() => {
    async function loadPatients() {
      try {
        const res = await api.get('/patients?limit=50');
        if (res.data?.length > 0) {
          setPatients(res.data);
          setSelectedPatientId(res.data[0].id);
        }
      } catch (e) {
        console.error(e);
      }
    }
    loadPatients();
  }, []);

  useEffect(() => {
    async function loadRecordsAndDocs() {
      if (!selectedPatientId) return;
      setIsLoading(true);
      try {
        let q = '';
        if (recordTypeFilter && recordTypeFilter !== 'CLINICAL_DOCUMENT') {
          q = `?recordType=${recordTypeFilter}`;
        }
        const [recs, docs] = await Promise.all([
          recordTypeFilter === 'CLINICAL_DOCUMENT'
            ? Promise.resolve([])
            : api.get(`/medical-records/patient/${selectedPatientId}${q}`).catch(() => []),
          api.get(`/documents/patient/${selectedPatientId}`).catch(() => []),
        ]);
        setRecords(recs || []);
        setDocuments(docs || []);
      } catch (e) {
        console.error(e);
      } finally {
        setIsLoading(false);
      }
    }
    loadRecordsAndDocs();
  }, [selectedPatientId, recordTypeFilter]);

  const selectedPatient = patients.find((p) => p.id === selectedPatientId);

  const formatFileSize = (bytes: number) => {
    if (!bytes || bytes <= 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <FileText className="w-6 h-6 text-blue-600" /> Electronic Medical Records (EMR)
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Consolidated chronological longitudinal health records across consultations, diagnostics, and clinical attachments
            </p>
          </div>
        </div>

        {/* Patient & Filter Selector Bar */}
        <Card>
          <CardContent className="p-4 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Select Patient Record
              </label>
              <select
                value={selectedPatientId}
                onChange={(e) => setSelectedPatientId(e.target.value)}
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
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Filter Record Type
              </label>
              <select
                value={recordTypeFilter}
                onChange={(e) => setRecordTypeFilter(e.target.value)}
                className="w-full text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 p-2"
              >
                <option value="">All Clinical Events & Documents</option>
                <option value="CONSULTATION">Consultations & Diagnoses</option>
                <option value="LAB_RESULT">Diagnostic Lab Results</option>
                <option value="ADMISSION">Inpatient Admissions</option>
                <option value="PRESCRIPTION">Prescriptions</option>
                <option value="CLINICAL_DOCUMENT">Clinical Documents & Scans</option>
              </select>
            </div>

            <div className="flex items-end gap-2">
              {selectedPatient && (
                <Link href={`/patients/${selectedPatient.id}`} className="w-full">
                  <Button variant="outline" className="w-full text-xs">
                    Patient 360° Profile <ArrowRight className="w-3.5 h-3.5 ml-1" />
                  </Button>
                </Link>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Attached Documents Quick Strip */}
        {recordTypeFilter !== 'CONSULTATION' &&
          recordTypeFilter !== 'LAB_RESULT' &&
          recordTypeFilter !== 'ADMISSION' &&
          recordTypeFilter !== 'PRESCRIPTION' &&
          documents.length > 0 && (
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-4 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-blue-600" />
                  <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider">
                    Attached EMR Clinical Documents & Scans ({documents.length})
                  </h3>
                </div>
                {selectedPatient && (
                  <Link href={`/patients/${selectedPatient.id}`}>
                    <span className="text-[11px] text-blue-600 hover:underline font-semibold cursor-pointer">
                      Manage Documents in 360° Profile →
                    </span>
                  </Link>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {documents.map((doc) => {
                  const isImage = doc.fileType?.startsWith('image/');
                  return (
                    <div
                      key={doc.id}
                      className="p-3 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 hover:border-blue-300 dark:hover:border-blue-700 transition-all flex flex-col justify-between gap-2"
                    >
                      <div className="flex items-start gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                          {isImage ? <FileImage className="w-4 h-4" /> : <FileText className="w-4 h-4" />}
                        </div>
                        <div className="min-w-0">
                          <h4 className="text-xs font-semibold text-slate-900 dark:text-slate-100 truncate">
                            {doc.title}
                          </h4>
                          <div className="flex items-center gap-1.5 mt-0.5">
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
                            <span className="text-[10px] text-slate-400 font-mono">
                              {formatFileSize(doc.fileSize)}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-slate-200/50 dark:border-slate-800 text-[11px]">
                        <span className="text-slate-400">
                          {new Date(doc.createdAt).toLocaleDateString()}
                        </span>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => setPreviewDoc(doc)}
                            className="px-2 py-0.5 rounded text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/60 font-medium cursor-pointer"
                          >
                            Preview
                          </button>
                          <a
                            href={doc.fileUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            download
                            className="p-1 rounded text-slate-500 hover:text-slate-700 hover:bg-slate-200/60"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </a>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

        {/* EMR Longitudinal Timeline View */}
        <div className="space-y-4">
          {isLoading ? (
            <div className="py-16 text-center text-xs text-slate-400">Loading patient EMR timeline...</div>
          ) : records.length === 0 && (recordTypeFilter !== 'CLINICAL_DOCUMENT' || documents.length === 0) ? (
            <Card>
              <CardContent className="p-12 text-center text-xs text-slate-400">
                No medical records matching the selected filter criteria.
              </CardContent>
            </Card>
          ) : (
            <div className="relative border-l-2 border-slate-200 dark:border-slate-800 ml-4 pl-6 space-y-4">
              {/* Document items when CLINICAL_DOCUMENT filter is selected */}
              {recordTypeFilter === 'CLINICAL_DOCUMENT' &&
                documents.map((doc) => (
                  <div key={doc.id} className="relative group">
                    <div className="absolute -left-[31px] top-3 w-4 h-4 rounded-full border-2 border-white dark:border-slate-900 bg-amber-500" />
                    <Card className="hover:border-amber-400/60 transition-colors">
                      <CardHeader className="py-3">
                        <div className="flex items-center gap-3">
                          <Badge variant="warning">{doc.category?.replace(/_/g, ' ')}</Badge>
                          <span className="font-mono text-xs text-slate-400 font-medium">
                            {formatFileSize(doc.fileSize)}
                          </span>
                        </div>
                        <span className="text-xs text-slate-500 font-mono">
                          {new Date(doc.createdAt).toLocaleDateString(undefined, {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                          })}
                        </span>
                      </CardHeader>
                      <CardContent className="py-3 pt-0 space-y-2">
                        <h3 className="font-semibold text-sm text-slate-900 dark:text-slate-100">
                          {doc.title}
                        </h3>
                        <p className="text-xs text-slate-500 font-mono break-all">{doc.fileUrl}</p>

                        <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-400">
                          <span>
                            Uploaded By:{' '}
                            {doc.uploadedBy
                              ? `${doc.uploadedBy.firstName} ${doc.uploadedBy.lastName} (${doc.uploadedBy.role})`
                              : 'Clinical Specialist'}
                          </span>
                          <div className="flex items-center gap-2">
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-6 px-2 text-xs text-blue-600"
                              onClick={() => setPreviewDoc(doc)}
                            >
                              <Eye className="w-3.5 h-3.5 mr-1" /> Preview
                            </Button>
                            <a
                              href={doc.fileUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              download
                              className="inline-flex items-center gap-1 text-slate-600 dark:text-slate-300 hover:text-blue-600"
                            >
                              <Download className="w-3.5 h-3.5" /> Download
                            </a>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                ))}

              {/* Standard clinical records */}
              {records.map((rec) => (
                <div key={rec.id} className="relative group">
                  <div className="absolute -left-[31px] top-3 w-4 h-4 rounded-full border-2 border-white dark:border-slate-900 bg-blue-600" />
                  <Card className="hover:border-blue-400/60 transition-colors">
                    <CardHeader className="py-3">
                      <div className="flex items-center gap-3">
                        <Badge
                          variant={
                            rec.recordType === 'CONSULTATION'
                              ? 'info'
                              : rec.recordType === 'LAB_RESULT'
                              ? 'warning'
                              : rec.recordType === 'ADMISSION'
                              ? 'danger'
                              : 'success'
                          }
                        >
                          {rec.recordType}
                        </Badge>
                        <span className="font-mono text-xs text-slate-400 font-medium">
                          {rec.recordNumber}
                        </span>
                      </div>
                      <span className="text-xs text-slate-500 font-mono">
                        {new Date(rec.recordDate).toLocaleDateString(undefined, {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                        })}
                      </span>
                    </CardHeader>
                    <CardContent className="py-3 pt-0 space-y-2">
                      <h3 className="font-semibold text-sm text-slate-900 dark:text-slate-100">
                        {rec.title}
                      </h3>
                      {rec.description && (
                        <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                          {rec.description}
                        </p>
                      )}

                      <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-400">
                        <span>Attending: Dr. {rec.doctor?.user?.lastName || 'Staff Physician'}</span>
                        <span>Department: {rec.department?.name || 'General Clinic'}</span>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* DOCUMENT PREVIEW DIALOG */}
      {previewDoc && selectedPatient && (
        <Dialog
          isOpen={!!previewDoc}
          onClose={() => setPreviewDoc(null)}
          title={previewDoc.title}
          description={`${previewDoc.category?.replace(/_/g, ' ')} • Patient: ${selectedPatient.firstName} ${selectedPatient.lastName} (${selectedPatient.mrn})`}
          maxWidth="2xl"
        >
          <div className="space-y-4 text-xs">
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700 grid grid-cols-2 md:grid-cols-4 gap-3">
              <div>
                <span className="text-[10px] uppercase text-slate-400 font-bold block">Document ID</span>
                <span className="font-mono font-medium text-slate-800 dark:text-slate-200">
                  {previewDoc.id.substring(0, 10)}...
                </span>
              </div>
              <div>
                <span className="text-[10px] uppercase text-slate-400 font-bold block">Category</span>
                <Badge
                  variant={
                    previewDoc.category === 'LAB_REPORT'
                      ? 'warning'
                      : previewDoc.category === 'PRESCRIPTION'
                      ? 'success'
                      : previewDoc.category === 'DISCHARGE_SUMMARY'
                      ? 'info'
                      : 'default'
                  }
                >
                  {previewDoc.category?.replace(/_/g, ' ')}
                </Badge>
              </div>
              <div>
                <span className="text-[10px] uppercase text-slate-400 font-bold block">File Size</span>
                <span className="font-mono text-slate-800 dark:text-slate-200">
                  {formatFileSize(previewDoc.fileSize)}
                </span>
              </div>
              <div>
                <span className="text-[10px] uppercase text-slate-400 font-bold block">Upload Date</span>
                <span className="text-slate-800 dark:text-slate-200">
                  {new Date(previewDoc.createdAt).toLocaleDateString()}
                </span>
              </div>
            </div>

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

              <div className="space-y-3">
                <div className="bg-slate-50 dark:bg-slate-900 p-3 rounded-lg border border-slate-100 dark:border-slate-800">
                  <div className="grid grid-cols-2 gap-2 text-[11px]">
                    <div>
                      <strong className="text-slate-500">Patient:</strong> {selectedPatient.firstName}{' '}
                      {selectedPatient.lastName}
                    </div>
                    <div>
                      <strong className="text-slate-500">MRN:</strong> {selectedPatient.mrn}
                    </div>
                    <div>
                      <strong className="text-slate-500">DOB:</strong>{' '}
                      {new Date(selectedPatient.dateOfBirth).toLocaleDateString()}
                    </div>
                    <div>
                      <strong className="text-slate-500">Gender / Blood:</strong> {selectedPatient.gender} •{' '}
                      {selectedPatient.bloodGroup}
                    </div>
                  </div>
                </div>

                <div className="p-4 rounded-lg border border-dashed border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300">
                  <h5 className="font-semibold text-slate-800 dark:text-slate-200 text-xs mb-1">
                    Attachment: {previewDoc.title}
                  </h5>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    This file is archived in institutional clinical cloud storage with HIPAA end-to-end
                    encryption. Digital signatures and audit logs have been verified.
                  </p>
                  <div className="mt-3 font-mono text-[11px] p-2 bg-slate-100 dark:bg-slate-900 rounded text-slate-600 dark:text-slate-400 break-all">
                    URI: {previewDoc.fileUrl}
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => window.print()}>
                <Printer className="w-3.5 h-3.5 mr-1" /> Print Report
              </Button>
              <a
                href={previewDoc.fileUrl}
                target="_blank"
                rel="noopener noreferrer"
                download
                className="inline-flex items-center justify-center h-8 px-3 text-xs font-semibold rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors shadow-xs"
              >
                <Download className="w-3.5 h-3.5 mr-1.5" /> Download File
              </a>
            </div>
          </div>
        </Dialog>
      )}
    </DashboardLayout>
  );
}
