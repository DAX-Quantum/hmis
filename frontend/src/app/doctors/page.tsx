'use client';

import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { api } from '@/lib/api';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import {
  UserCheck,
  Calendar,
  Clock,
  MapPin,
  GraduationCap,
  Award,
  DollarSign,
  Phone,
  Mail,
  ChevronRight,
} from 'lucide-react';
import Link from 'next/link';

export default function DoctorsPage() {
  const [doctors, setDoctors] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [selectedDept, setSelectedDept] = useState<string>('');
  const [selectedDoctor, setSelectedDoctor] = useState<any>(null);
  const [isScheduleOpen, setIsScheduleOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      setIsLoading(true);
      try {
        const [docs, depts] = await Promise.all([
          api.get(`/doctors${selectedDept ? `?departmentId=${selectedDept}` : ''}`),
          api.get('/departments'),
        ]);
        setDoctors(docs || []);
        setDepartments(depts || []);
      } catch (e) {
        console.error(e);
      } finally {
        setIsLoading(false);
      }
    }

    loadData();
  }, [selectedDept]);

  const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <UserCheck className="w-6 h-6 text-emerald-600" /> Medical Specialists & Staff
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Physician directories, qualifications, clinical hours, and consultation fees
            </p>
          </div>

          {/* Department Filter */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-slate-500">Filter Specialty:</span>
            <select
              value={selectedDept}
              onChange={(e) => setSelectedDept(e.target.value)}
              className="text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-1.5 focus:outline-none"
            >
              <option value="">All Clinical Departments</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Doctor Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {isLoading ? (
            <div className="col-span-3 py-16 text-center text-xs text-slate-400">
              Loading physician records...
            </div>
          ) : doctors.length === 0 ? (
            <div className="col-span-3 py-16 text-center text-xs text-slate-400">
              No doctors found matching the selected specialty.
            </div>
          ) : (
            doctors.map((doc) => (
              <Card key={doc.id} className="hover:border-blue-400/60 transition-all flex flex-col justify-between">
                <CardContent className="p-5 space-y-4">
                  <div className="flex items-start gap-4">
                    <img
                      src={doc.user?.avatar || 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=150'}
                      alt={doc.user?.lastName}
                      className="w-14 h-14 rounded-2xl object-cover border border-slate-200 dark:border-slate-800 shadow-xs"
                    />
                    <div>
                      <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm">
                        {doc.user?.firstName} {doc.user?.lastName}
                      </h3>
                      <p className="text-xs font-medium text-blue-600 dark:text-blue-400 mt-0.5">
                        {doc.specialization}
                      </p>
                      <Badge variant="outline" className="mt-1.5">
                        {doc.department?.name}
                      </Badge>
                    </div>
                  </div>

                  <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                    {doc.bio || 'Comprehensive clinical care and medical evaluation.'}
                  </p>

                  <div className="space-y-1.5 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-400">
                    <div className="flex items-center gap-2">
                      <GraduationCap className="w-3.5 h-3.5 text-slate-400" />
                      <span className="truncate">{doc.qualification}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Award className="w-3.5 h-3.5 text-slate-400" />
                        <span>{doc.experienceYears} Years Experience</span>
                      </div>
                      <span className="font-semibold text-slate-900 dark:text-slate-100">
                        ${Number(doc.consultationFee).toFixed(2)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <MapPin className="w-3.5 h-3.5 text-slate-400" />
                      <span>{doc.roomNumber || 'Clinic Room 101'}</span>
                    </div>
                  </div>

                  {/* Weekly availability badges */}
                  <div className="flex items-center gap-1 pt-1">
                    {doc.schedules?.map((s: any) => (
                      <span
                        key={s.id}
                        className="text-[10px] px-1.5 py-0.5 rounded-sm bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-mono"
                      >
                        {daysOfWeek[s.dayOfWeek]}
                      </span>
                    ))}
                  </div>
                </CardContent>

                <div className="p-4 pt-0 flex items-center justify-between border-t border-slate-100 dark:border-slate-800/60 mt-2">
                  <button
                    onClick={() => {
                      setSelectedDoctor(doc);
                      setIsScheduleOpen(true);
                    }}
                    className="text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 font-medium cursor-pointer"
                  >
                    View Timetable
                  </button>
                  <Link href={`/appointments?doctorId=${doc.id}`}>
                    <Button size="sm">
                      <Calendar className="w-3 h-3 mr-1" /> Book Slot
                    </Button>
                  </Link>
                </div>
              </Card>
            ))
          )}
        </div>
      </div>

      {/* Doctor Schedule Timetable Dialog */}
      <Dialog
        isOpen={isScheduleOpen}
        onClose={() => setIsScheduleOpen(false)}
        title={selectedDoctor ? `Clinic Timetable: Dr. ${selectedDoctor.user?.lastName}` : 'Timetable'}
        description="Weekly outpatient consultation hours and slot parameters"
        maxWidth="md"
      >
        {selectedDoctor && (
          <div className="space-y-4">
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {selectedDoctor.schedules?.map((s: any) => (
                <div key={s.id} className="py-2.5 flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    {daysOfWeek[s.dayOfWeek]} (
                    {['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][s.dayOfWeek]}
                    )
                  </span>
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-slate-600 dark:text-slate-400">
                      {s.startTime} - {s.endTime}
                    </span>
                    <Badge variant="success">Available</Badge>
                  </div>
                </div>
              ))}
            </div>

            <div className="p-3 rounded-xl bg-blue-50/60 dark:bg-blue-950/20 text-xs text-blue-700 dark:text-blue-300">
              Slots are generated automatically in <strong>30-minute intervals</strong> during active clinic hours with automated double-booking collision prevention.
            </div>
          </div>
        )}
      </Dialog>
    </DashboardLayout>
  );
}
