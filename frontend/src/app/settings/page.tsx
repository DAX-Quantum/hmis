'use client';

import React, { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useAuth, DEMO_USERS } from '@/context/auth-context';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Settings, User, Shield, Building, Key, CheckCircle2 } from 'lucide-react';

export default function SettingsPage() {
  const { user, role, permissions, quickLogin } = useAuth();
  const [hospitalName, setHospitalName] = useState('HMIS Health Integrated Healthcare System');
  const [hospitalAddress, setHospitalAddress] = useState('100 Metro Health Avenue, Medical Center');
  const [emergencyPhone, setEmergencyPhone] = useState('+1 (555) 911-0000');
  const [isSaved, setIsSaved] = useState(false);

  const handleSaveHospital = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2000);
  };

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Settings className="w-6 h-6 text-blue-600" /> System Settings & Authorization
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Personal identity profile, active role-based access control (RBAC) permissions, and clinical parameters
          </p>
        </div>

        {isSaved && (
          <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 text-xs font-semibold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" /> Hospital system parameters updated successfully!
          </div>
        )}

        {/* User Profile Card */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2.5">
              <User className="w-4 h-4 text-blue-600" />
              <CardTitle className="text-sm">Active Session Profile</CardTitle>
            </div>
            <CardDescription>Your authenticated credential profile in the HMIS directory</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-blue-600 text-white flex items-center justify-center font-bold text-lg uppercase shadow-xs">
                {user?.firstName?.[0] || 'U'}
                {user?.lastName?.[0] || ''}
              </div>
              <div>
                <h3 className="font-bold text-slate-900 dark:text-slate-100 text-base">
                  {user?.firstName} {user?.lastName}
                </h3>
                <p className="text-xs text-slate-500">{user?.email}</p>
                <div className="mt-1 flex items-center gap-2">
                  <Badge variant="info">{user?.role}</Badge>
                  {user?.phone && <span className="text-xs text-slate-400">{user?.phone}</span>}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Role & Permissions RBAC Breakdown */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2.5">
              <Shield className="w-4 h-4 text-emerald-600" />
              <CardTitle className="text-sm">Assigned Role Permissions (RBAC)</CardTitle>
            </div>
            <CardDescription>
              Fine-grained clinical access privileges active on your current session
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {permissions && permissions.length > 0 ? (
                permissions.map((p) => (
                  <span
                    key={p}
                    className="font-mono text-[11px] px-2.5 py-1 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700"
                  >
                    ✓ {p}
                  </span>
                ))
              ) : (
                <span className="text-xs text-slate-400 font-mono">
                  All privileges granted (Super Administrator)
                </span>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Hospital Configuration */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2.5">
              <Building className="w-4 h-4 text-purple-600" />
              <CardTitle className="text-sm">Hospital System Information</CardTitle>
            </div>
            <CardDescription>Organization metadata rendered on printed prescriptions and tax invoices</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSaveHospital} className="space-y-4">
              <Input
                label="Hospital Organization Title"
                value={hospitalName}
                onChange={(e) => setHospitalName(e.target.value)}
              />
              <Input
                label="Physical Facility Address"
                value={hospitalAddress}
                onChange={(e) => setHospitalAddress(e.target.value)}
              />
              <Input
                label="Emergency Hotline Phone"
                value={emergencyPhone}
                onChange={(e) => setEmergencyPhone(e.target.value)}
              />

              <div className="pt-2 flex justify-end">
                <Button type="submit">Save Parameters</Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Quick Persona Switcher Helper */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2.5">
              <Key className="w-4 h-4 text-amber-600" />
              <CardTitle className="text-sm">Switch Demo Persona</CardTitle>
            </div>
            <CardDescription>Instant evaluation shortcut for examining each staff role</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {Object.entries(DEMO_USERS).map(([key, item]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => quickLogin(key)}
                  className={`p-2.5 rounded-lg border text-left transition-all cursor-pointer ${
                    role === key
                      ? 'border-blue-600 bg-blue-50/50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300'
                      : 'border-slate-200 dark:border-slate-800 hover:border-slate-300'
                  }`}
                >
                  <span className="text-xs font-semibold block">{item.title}</span>
                  <span className="text-[10px] text-slate-400">{key.replace('_', ' ')}</span>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
