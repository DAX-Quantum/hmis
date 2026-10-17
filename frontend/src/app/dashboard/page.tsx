'use client';

import React, { useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useAuth } from '@/context/auth-context';
import { api } from '@/lib/api';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Users,
  UserCheck,
  Calendar,
  FlaskConical,
  CreditCard,
  Bed,
  AlertTriangle,
  DollarSign,
  ArrowUpRight,
  TrendingUp,
  Clock,
  ChevronRight,
  Activity,
} from 'lucide-react';
import Link from 'next/link';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';

export default function DashboardPage() {
  const { user, role } = useAuth();
  const [metrics, setMetrics] = useState<any>(null);
  const [todayAppointments, setTodayAppointments] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const [dashMetrics, apts] = await Promise.all([
          api.get('/reports/dashboard').catch(() => null),
          api.get('/appointments').catch(() => []),
        ]);

        setMetrics(dashMetrics);
        setTodayAppointments(Array.isArray(apts) ? apts.slice(0, 6) : []);
      } catch (err) {
        console.error('Dashboard load error:', err);
      } finally {
        setIsLoading(false);
      }
    }

    loadData();
  }, []);

  const overview = metrics?.overview || {
    totalPatients: 50,
    activeDoctors: 5,
    todayAppointments: 4,
    pendingLabTests: 3,
    pendingPayments: 6,
    occupiedBeds: 4,
    availableBeds: 18,
    occupancyRate: 18.2,
    lowStockMedicines: 2,
    totalRevenue: 3420.00,
  };

  const monthlyTrends = metrics?.charts?.monthlyTrends || [
    { month: 'May', appointments: 112, revenue: 14200 },
    { month: 'Jun', appointments: 138, revenue: 18450 },
    { month: 'Jul', appointments: 165, revenue: 21900 },
    { month: 'Aug', appointments: 194, revenue: 26800 },
    { month: 'Sep', appointments: 210, revenue: 29400 },
    { month: 'Oct', appointments: 235, revenue: 32800 },
  ];

  const departmentDistribution = metrics?.charts?.departmentDistribution || [
    { name: 'Cardiology', appointments: 28, doctors: 1 },
    { name: 'Neurology', appointments: 22, doctors: 1 },
    { name: 'Pediatrics', appointments: 19, doctors: 1 },
    { name: 'Orthopedics', appointments: 25, doctors: 1 },
    { name: 'General Medicine', appointments: 35, doctors: 1 },
  ];

  const bedOccupancyData = metrics?.charts?.bedOccupancy || [
    { name: 'Occupied', value: overview.occupiedBeds || 4, color: '#ef4444' },
    { name: 'Available', value: overview.availableBeds || 18, color: '#10b981' },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Welcome Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2.5">
              <span>Operational Dashboard</span>
              <Badge variant="info">Active Clinic</Badge>
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Live hospital census, bed occupancy, patient flow, and clinical scheduling
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <Link href="/appointments">
              <Button size="sm" variant="outline">
                <Calendar className="w-3.5 h-3.5 mr-1" /> Book Appointment
              </Button>
            </Link>
            <Link href="/patients">
              <Button size="sm">
                <Users className="w-3.5 h-3.5 mr-1" /> Register Patient
              </Button>
            </Link>
          </div>
        </div>

        {/* Top Operational KPI Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {/* Total Patients */}
          <Card className="hover:border-blue-400/50 transition-colors">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-500">Total Registered Patients</span>
                <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-600 flex items-center justify-center">
                  <Users className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                  {overview.totalPatients}
                </span>
                <span className="text-xs text-emerald-600 font-medium flex items-center">
                  <TrendingUp className="w-3 h-3 mr-0.5" /> +12%
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Active Doctors */}
          <Card className="hover:border-emerald-400/50 transition-colors">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-500">Active Physicians</span>
                <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 flex items-center justify-center">
                  <UserCheck className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                  {overview.activeDoctors}
                </span>
                <span className="text-xs text-slate-500">5 Specialties</span>
              </div>
            </CardContent>
          </Card>

          {/* Bed Occupancy */}
          <Card className="hover:border-purple-400/50 transition-colors">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-500">Bed Occupancy</span>
                <div className="w-8 h-8 rounded-lg bg-purple-50 dark:bg-purple-950/60 text-purple-600 flex items-center justify-center">
                  <Bed className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                  {overview.occupancyRate}%
                </span>
                <span className="text-xs text-slate-500">
                  {overview.occupiedBeds} of {overview.totalBeds || 22} Beds
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Total Revenue */}
          <Card className="hover:border-amber-400/50 transition-colors">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-500">Collected Revenue</span>
                <div className="w-8 h-8 rounded-lg bg-amber-50 dark:bg-amber-950/60 text-amber-600 flex items-center justify-center">
                  <DollarSign className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                  ${overview.totalRevenue?.toLocaleString()}
                </span>
                <span className="text-xs text-emerald-600 font-medium flex items-center">
                  <ArrowUpRight className="w-3 h-3" /> Live
                </span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Operational Attention Alerts */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link href="/pharmacy" className="block">
            <div className="p-3.5 rounded-xl border border-amber-200/80 bg-amber-50/60 dark:bg-amber-950/20 dark:border-amber-900/40 flex items-center justify-between hover:border-amber-400 transition-colors">
              <div className="flex items-center gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0" />
                <div>
                  <h4 className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                    Low Medicine Inventory ({overview.lowStockMedicines})
                  </h4>
                  <p className="text-[11px] text-slate-500">Paracetamol 650mg below threshold</p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-amber-600" />
            </div>
          </Link>

          <Link href="/laboratory" className="block">
            <div className="p-3.5 rounded-xl border border-blue-200/80 bg-blue-50/60 dark:bg-blue-950/20 dark:border-blue-900/40 flex items-center justify-between hover:border-blue-400 transition-colors">
              <div className="flex items-center gap-3">
                <FlaskConical className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                <div>
                  <h4 className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                    Pending Lab Orders ({overview.pendingLabTests})
                  </h4>
                  <p className="text-[11px] text-slate-500">Specimens waiting for verification</p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-blue-600" />
            </div>
          </Link>

          <Link href="/billing" className="block">
            <div className="p-3.5 rounded-xl border border-rose-200/80 bg-rose-50/60 dark:bg-rose-950/20 dark:border-rose-900/40 flex items-center justify-between hover:border-rose-400 transition-colors">
              <div className="flex items-center gap-3">
                <CreditCard className="w-5 h-5 text-rose-600 dark:text-rose-400 flex-shrink-0" />
                <div>
                  <h4 className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                    Unpaid Invoices ({overview.pendingPayments})
                  </h4>
                  <p className="text-[11px] text-slate-500">Outstanding patient billing balances</p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-rose-600" />
            </div>
          </Link>
        </div>

        {/* Primary Operational Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Revenue & Appointments Trend (Area Chart) */}
          <Card className="lg:col-span-8">
            <CardHeader>
              <div>
                <CardTitle>Clinical Activity & Revenue Flow</CardTitle>
                <CardDescription>Monthly completed consultations and hospital revenue</CardDescription>
              </div>
              <Badge variant="outline">Past 6 Months</Badge>
            </CardHeader>
            <CardContent>
              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={monthlyTrends} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#2563eb" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="colorApt" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis dataKey="month" stroke="#94a3b8" fontSize={11} tickLine={false} />
                    <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#1e293b',
                        borderRadius: '8px',
                        border: 'none',
                        color: '#f8fafc',
                        fontSize: '12px',
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                    <Area
                      type="monotone"
                      dataKey="revenue"
                      name="Revenue ($)"
                      stroke="#2563eb"
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#colorRev)"
                    />
                    <Area
                      type="monotone"
                      dataKey="appointments"
                      name="Appointments"
                      stroke="#10b981"
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#colorApt)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Bed Occupancy Donut */}
          <Card className="lg:col-span-4">
            <CardHeader>
              <div>
                <CardTitle>Inpatient Bed Census</CardTitle>
                <CardDescription>Available vs occupied ward capacity</CardDescription>
              </div>
              <Link href="/admissions" className="text-xs text-blue-600 hover:underline">
                View Board
              </Link>
            </CardHeader>
            <CardContent>
              <div className="h-56 w-full flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={bedOccupancyData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {bedOccupancyData.map((entry: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#1e293b',
                        borderRadius: '8px',
                        border: 'none',
                        color: '#f8fafc',
                        fontSize: '12px',
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <div className="flex items-center justify-around pt-2 text-xs border-t border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                  <span className="text-slate-600 dark:text-slate-400">
                    Occupied: <strong>{overview.occupiedBeds}</strong>
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                  <span className="text-slate-600 dark:text-slate-400">
                    Available: <strong>{overview.availableBeds}</strong>
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Secondary Row: Department Workload & Recent Appointment Queue */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Department Load Bar Chart */}
          <Card className="lg:col-span-6">
            <CardHeader>
              <div>
                <CardTitle>Department Clinical Volume</CardTitle>
                <CardDescription>Patient consultation distribution across specialties</CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={departmentDistribution} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis dataKey="name" stroke="#94a3b8" fontSize={10} tickLine={false} />
                    <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#1e293b',
                        borderRadius: '8px',
                        border: 'none',
                        color: '#f8fafc',
                        fontSize: '12px',
                      }}
                    />
                    <Bar dataKey="appointments" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Appointments" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Live Appointment Queue */}
          <Card className="lg:col-span-6">
            <CardHeader>
              <div>
                <CardTitle>Scheduled Appointment Queue</CardTitle>
                <CardDescription>Upcoming patient consultations for today</CardDescription>
              </div>
              <Link href="/appointments" className="text-xs text-blue-600 hover:underline font-medium">
                View All
              </Link>
            </CardHeader>
            <CardContent>
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {todayAppointments.length === 0 ? (
                  <p className="text-xs text-slate-400 py-6 text-center">No appointments scheduled for today.</p>
                ) : (
                  todayAppointments.map((apt) => (
                    <div key={apt.id} className="py-2.5 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-600 flex items-center justify-center font-semibold text-xs">
                          {apt.queueNumber || 'Q'}
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                            {apt.patient?.firstName} {apt.patient?.lastName}
                          </p>
                          <p className="text-[11px] text-slate-500">
                            Dr. {apt.doctor?.user?.lastName} • {apt.department?.name}
                          </p>
                        </div>
                      </div>

                      <div className="text-right">
                        <span className="text-xs font-mono font-medium text-slate-700 dark:text-slate-300 block">
                          {apt.startTime}
                        </span>
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
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
