'use client';

import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { api } from '@/lib/api';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input, Select } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog } from '@/components/ui/dialog';
import { RoleGate } from '@/components/auth/RoleGate';
import { Users, UserPlus, Search, ArrowRight, Phone, ShieldAlert } from 'lucide-react';
import Link from 'next/link';

export default function PatientsPage() {
  const [patients, setPatients] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Registration Form State
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    dateOfBirth: '1990-05-15',
    gender: 'FEMALE',
    bloodGroup: 'O_POSITIVE',
    email: '',
    phone: '',
    address: '',
    city: '',
    allergies: '',
    chronicConditions: '',
    emergencyContactName: '',
    emergencyContactPhone: '',
    insuranceProvider: '',
  });

  const loadPatients = async (query = '') => {
    setIsLoading(true);
    try {
      const res = await api.get(`/patients?limit=50&search=${encodeURIComponent(query)}`);
      setPatients(res.data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      loadPatients(search);
    }, 250);
    return () => clearTimeout(timer);
  }, [search]);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await api.post('/patients', {
        ...formData,
        allergies: formData.allergies ? formData.allergies.split(',').map((s) => s.trim()) : [],
        chronicConditions: formData.chronicConditions ? formData.chronicConditions.split(',').map((s) => s.trim()) : [],
      });
      setIsRegisterOpen(false);
      setFormData({
        firstName: '',
        lastName: '',
        dateOfBirth: '1990-05-15',
        gender: 'FEMALE',
        bloodGroup: 'O_POSITIVE',
        email: '',
        phone: '',
        address: '',
        city: '',
        allergies: '',
        chronicConditions: '',
        emergencyContactName: '',
        emergencyContactPhone: '',
        insuranceProvider: '',
      });
      loadPatients(search);
    } catch (err: any) {
      alert(err.message || 'Failed to register patient');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Users className="w-6 h-6 text-blue-600" /> Patient Registry
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Search, view 360-degree medical records, or onboard new patients
            </p>
          </div>

          <RoleGate allowedRoles={['SUPER_ADMIN', 'ADMIN', 'RECEPTIONIST', 'NURSE', 'DOCTOR']}>
            <Button onClick={() => setIsRegisterOpen(true)}>
              <UserPlus className="w-4 h-4 mr-1.5" /> Register New Patient
            </Button>
          </RoleGate>
        </div>

        {/* Search Bar */}
        <Card>
          <CardContent className="p-4">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search patient by Name, MRN identifier (e.g. MRN-2026-0001), or Phone number..."
                className="w-full pl-9 pr-4 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </CardContent>
        </Card>

        {/* Patient Table */}
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>MRN Identifier</TableHead>
                <TableHead>Patient Name</TableHead>
                <TableHead>Gender / Age</TableHead>
                <TableHead>Blood Group</TableHead>
                <TableHead>Contact Info</TableHead>
                <TableHead>Medical Flags</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-10 text-slate-400 text-xs">
                    Loading patient records...
                  </TableCell>
                </TableRow>
              ) : patients.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-10 text-slate-400 text-xs">
                    No patients found matching &quot;{search}&quot;.
                  </TableCell>
                </TableRow>
              ) : (
                patients.map((p) => {
                  const birthYear = new Date(p.dateOfBirth).getFullYear();
                  const age = new Date().getFullYear() - birthYear;

                  return (
                    <TableRow key={p.id}>
                      <TableCell className="font-mono text-xs font-semibold text-blue-600 dark:text-blue-400">
                        {p.mrn}
                      </TableCell>
                      <TableCell>
                        <span className="font-semibold text-slate-900 dark:text-slate-100 block">
                          {p.firstName} {p.lastName}
                        </span>
                        <span className="text-[11px] text-slate-500">{p.city || 'Metro City'}</span>
                      </TableCell>
                      <TableCell>
                        <span className="text-xs text-slate-700 dark:text-slate-300">
                          {p.gender} • {age} yrs
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{p.bloodGroup.replace('_', ' ')}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="text-xs space-y-0.5">
                          <div className="flex items-center gap-1 text-slate-700 dark:text-slate-300">
                            <Phone className="w-3 h-3 text-slate-400" /> {p.phone}
                          </div>
                          <span className="text-[11px] text-slate-400 block">{p.email}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {p.allergies?.length > 0 ? (
                            <Badge variant="danger">
                              <ShieldAlert className="w-3 h-3 mr-0.5" />
                              {p.allergies[0]}
                            </Badge>
                          ) : (
                            <span className="text-xs text-slate-400">NKDA</span>
                          )}
                          {p.chronicConditions?.length > 0 && (
                            <Badge variant="warning">{p.chronicConditions[0]}</Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <Link href={`/patients/${p.id}`}>
                          <Button size="sm" variant="outline">
                            View 360° Profile <ArrowRight className="w-3.5 h-3.5 ml-1" />
                          </Button>
                        </Link>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </Card>
      </div>

      {/* New Patient Registration Dialog */}
      <Dialog
        isOpen={isRegisterOpen}
        onClose={() => setIsRegisterOpen(false)}
        title="Patient Intake & Registration"
        description="Register a new patient into the HMIS database with medical profile."
        maxWidth="xl"
      >
        <form onSubmit={handleRegister} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="First Name"
              required
              value={formData.firstName}
              onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
              placeholder="e.g. John"
            />
            <Input
              label="Last Name"
              required
              value={formData.lastName}
              onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
              placeholder="e.g. Doe"
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <Input
              label="Date of Birth"
              type="date"
              required
              value={formData.dateOfBirth}
              onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
            />
            <Select
              label="Gender"
              value={formData.gender}
              onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
              options={[
                { label: 'Female', value: 'FEMALE' },
                { label: 'Male', value: 'MALE' },
                { label: 'Other', value: 'OTHER' },
              ]}
            />
            <Select
              label="Blood Group"
              value={formData.bloodGroup}
              onChange={(e) => setFormData({ ...formData, bloodGroup: e.target.value })}
              options={[
                { label: 'O Positive (O+)', value: 'O_POSITIVE' },
                { label: 'A Positive (A+)', value: 'A_POSITIVE' },
                { label: 'B Positive (B+)', value: 'B_POSITIVE' },
                { label: 'AB Positive (AB+)', value: 'AB_POSITIVE' },
                { label: 'O Negative (O-)', value: 'O_NEGATIVE' },
                { label: 'A Negative (A-)', value: 'A_NEGATIVE' },
                { label: 'B Negative (B-)', value: 'B_NEGATIVE' },
                { label: 'AB Negative (AB-)', value: 'AB_NEGATIVE' },
              ]}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Contact Phone"
              required
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              placeholder="+1 (555) 000-0000"
            />
            <Input
              label="Email Address"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="patient@example.com"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Residential Address"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              placeholder="Street and Apt Number"
            />
            <Input
              label="City"
              value={formData.city}
              onChange={(e) => setFormData({ ...formData, city: e.target.value })}
              placeholder="City, State"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Known Drug / Food Allergies"
              value={formData.allergies}
              onChange={(e) => setFormData({ ...formData, allergies: e.target.value })}
              placeholder="Comma-separated (e.g. Penicillin, Latex)"
            />
            <Input
              label="Chronic Medical Conditions"
              value={formData.chronicConditions}
              onChange={(e) => setFormData({ ...formData, chronicConditions: e.target.value })}
              placeholder="Comma-separated (e.g. Hypertension, Diabetes)"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Emergency Contact Name"
              value={formData.emergencyContactName}
              onChange={(e) => setFormData({ ...formData, emergencyContactName: e.target.value })}
              placeholder="Name of Next of Kin"
            />
            <Input
              label="Emergency Phone"
              value={formData.emergencyContactPhone}
              onChange={(e) => setFormData({ ...formData, emergencyContactPhone: e.target.value })}
              placeholder="+1 (555) 999-9999"
            />
          </div>

          <div className="pt-2 flex justify-end gap-2.5">
            <Button type="button" variant="outline" onClick={() => setIsRegisterOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" isLoading={isSubmitting}>
              Complete Registration
            </Button>
          </div>
        </form>
      </Dialog>
    </DashboardLayout>
  );
}
