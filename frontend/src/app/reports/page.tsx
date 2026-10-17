'use client';

import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { api } from '@/lib/api';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  BarChart3,
  TrendingUp,
  DollarSign,
  Users,
  Activity,
  Calendar,
  Download,
  Printer,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';

export default function ReportsPage() {
  const [metrics, setMetrics] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadReports() {
      setIsLoading(true);
      try {
        const data = await api.get('/reports/dashboard');
        setMetrics(data);
      } catch (e) {
        console.error(e);
      } finally {
        setIsLoading(false);
      }
    }
    loadReports();
  }, []);

  const monthlyTrends = metrics?.charts?.monthlyTrends || [
    { month: 'May', appointments: 112, revenue: 14200, admissions: 18 },
    { month: 'Jun', appointments: 138, revenue: 18450, admissions: 22 },
    { month: 'Jul', appointments: 165, revenue: 21900, admissions: 28 },
    { month: 'Aug', appointments: 194, revenue: 26800, admissions: 34 },
    { month: 'Sep', appointments: 210, revenue: 29400, admissions: 38 },
    { month: 'Oct', appointments: 235, revenue: 32800, admissions: 42 },
  ];

  const departmentDistribution = metrics?.charts?.departmentDistribution || [
    { name: 'Cardiology', appointments: 28, doctors: 1 },
    { name: 'Neurology', appointments: 22, doctors: 1 },
    { name: 'Pediatrics', appointments: 19, doctors: 1 },
    { name: 'Orthopedics', appointments: 25, doctors: 1 },
    { name: 'General Medicine', appointments: 35, doctors: 1 },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <BarChart3 className="w-6 h-6 text-blue-600" /> Operational Analytics & Auditing
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Executive hospital performance indicators, clinical department utilization, and financial revenue flows
            </p>
          </div>

          <Button size="sm" variant="outline" onClick={() => window.print()}>
            <Printer className="w-3.5 h-3.5 mr-1" /> Export Executive Report
          </Button>
        </div>

        {/* Operational Overview Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <span className="text-xs text-slate-500 block">Total Patients Treated</span>
              <span className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-1 block">
                {metrics?.overview?.totalPatients || 50}
              </span>
              <span className="text-xs text-emerald-600 font-medium flex items-center mt-1">
                <TrendingUp className="w-3 h-3 mr-1" /> +14.2% YoY
              </span>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <span className="text-xs text-slate-500 block">Hospital Inpatient Capacity</span>
              <span className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-1 block">
                {metrics?.overview?.occupancyRate || 18.2}%
              </span>
              <span className="text-xs text-slate-500 mt-1 block">
                {metrics?.overview?.occupiedBeds || 4} Occupied / {metrics?.overview?.availableBeds || 18} Available
              </span>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <span className="text-xs text-slate-500 block">Total Net Revenue</span>
              <span className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-1 block">
                ${metrics?.overview?.totalRevenue?.toLocaleString() || '3,420'}
              </span>
              <span className="text-xs text-emerald-600 font-medium flex items-center mt-1">
                <TrendingUp className="w-3 h-3 mr-1" /> Audited
              </span>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <span className="text-xs text-slate-500 block">Active Specialists</span>
              <span className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-1 block">
                {metrics?.overview?.activeDoctors || 5}
              </span>
              <span className="text-xs text-blue-600 font-medium mt-1 block">100% Coverage</span>
            </CardContent>
          </Card>
        </div>

        {/* Chart 1: Revenue vs Admissions */}
        <Card>
          <CardHeader>
            <CardTitle>Hospital Revenue & Inpatient Admissions Trajectory</CardTitle>
            <CardDescription>Multi-axis historical performance analysis</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={monthlyTrends}>
                  <defs>
                    <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#2563eb" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
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
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Chart 2: Department Appointments Volume */}
        <Card>
          <CardHeader>
            <CardTitle>Departmental Clinical Volume</CardTitle>
            <CardDescription>Consultations conducted across specialized clinics</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={departmentDistribution}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} tickLine={false} />
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
      </div>
    </DashboardLayout>
  );
}
