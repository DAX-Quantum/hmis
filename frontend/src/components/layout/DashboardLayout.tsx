'use client';

import React, { useEffect } from 'react';
import { useAuth, DEMO_USERS } from '@/context/auth-context';
import { useRouter, usePathname } from 'next/navigation';
import { Sidebar } from './Sidebar';
import { Navbar } from './Navbar';
import { ShieldAlert, ArrowLeft, UserCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';

const ROUTE_CLEARANCE: Record<string, string[]> = {
  '/patients': ['SUPER_ADMIN', 'ADMIN', 'DOCTOR', 'NURSE', 'RECEPTIONIST', 'ACCOUNTANT'],
  '/appointments': ['SUPER_ADMIN', 'ADMIN', 'DOCTOR', 'NURSE', 'RECEPTIONIST', 'PATIENT'],
  '/medical-records': ['SUPER_ADMIN', 'ADMIN', 'DOCTOR', 'NURSE', 'PATIENT'],
  '/prescriptions': ['SUPER_ADMIN', 'ADMIN', 'DOCTOR', 'PHARMACIST', 'PATIENT'],
  '/laboratory': ['SUPER_ADMIN', 'ADMIN', 'DOCTOR', 'LAB_TECHNICIAN', 'PATIENT'],
  '/pharmacy': ['SUPER_ADMIN', 'ADMIN', 'PHARMACIST'],
  '/billing': ['SUPER_ADMIN', 'ADMIN', 'ACCOUNTANT', 'RECEPTIONIST', 'PATIENT'],
  '/admissions': ['SUPER_ADMIN', 'ADMIN', 'DOCTOR', 'NURSE'],
  '/reports': ['SUPER_ADMIN', 'ADMIN', 'ACCOUNTANT'],
  '/audit-logs': ['SUPER_ADMIN', 'ADMIN'],
};

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, role, hasRole, quickLogin, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, isLoading, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center gap-3">
        <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
        <span className="text-xs font-semibold text-slate-500 tracking-wider uppercase">
          Initializing HMIS Clinical Session...
        </span>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  // Determine if active route requires higher clearance than user has
  const matchedRouteKey = Object.keys(ROUTE_CLEARANCE).find(
    (prefix) => pathname === prefix || pathname.startsWith(prefix + '/'),
  );

  const allowedRoles = matchedRouteKey ? ROUTE_CLEARANCE[matchedRouteKey] : null;
  const isAuthorized = !allowedRoles || hasRole(allowedRoles);

  // Find a recommended persona to quick-switch into if unauthorized
  const suggestedRole = allowedRoles ? allowedRoles.find((r) => r in DEMO_USERS) : 'SUPER_ADMIN';

  return (
    <div className="min-h-screen flex bg-slate-50/70 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Navbar />
        <main className="flex-1 overflow-y-auto p-6 md:p-8">
          {isAuthorized ? (
            children
          ) : (
            <div className="min-h-[60vh] flex items-center justify-center">
              <div className="w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-xl p-8 text-center animate-in fade-in zoom-in-95 duration-200">
                <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 flex items-center justify-center text-rose-600 dark:text-rose-400">
                  <ShieldAlert className="w-8 h-8" />
                </div>

                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-100 dark:bg-rose-950/70 text-rose-700 dark:text-rose-300 text-xs font-semibold tracking-wide uppercase mb-3">
                  HTTP 403 Forbidden • Access Denied
                </div>

                <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
                  Clinical Clearance Required
                </h2>

                <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">
                  Your current session is authenticated as{' '}
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    {user?.firstName} {user?.lastName} ({role?.replace('_', ' ')})
                  </span>
                  . Access to this domain requires one of the following clearances:
                </p>

                <div className="flex flex-wrap justify-center gap-1.5 mt-4">
                  {allowedRoles?.map((r) => (
                    <span
                      key={r}
                      className="px-2.5 py-1 text-[11px] font-mono font-medium rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700"
                    >
                      {r.replace('_', ' ')}
                    </span>
                  ))}
                </div>

                <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mt-6 pt-6 border-t border-slate-100 dark:border-slate-800">
                  <Button
                    variant="outline"
                    onClick={() => router.push('/dashboard')}
                    className="w-full sm:w-auto text-xs"
                  >
                    <ArrowLeft className="w-3.5 h-3.5 mr-1.5" />
                    Back to Dashboard
                  </Button>

                  {suggestedRole && (
                    <Button
                      onClick={() => quickLogin(suggestedRole)}
                      className="w-full sm:w-auto text-xs bg-blue-600 hover:bg-blue-700 text-white"
                    >
                      <UserCheck className="w-3.5 h-3.5 mr-1.5" />
                      Switch to {DEMO_USERS[suggestedRole]?.title || suggestedRole}
                    </Button>
                  )}
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
