'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/auth-context';
import {
  Activity,
  Users,
  UserCheck,
  Calendar,
  FileText,
  Pill,
  FlaskConical,
  Receipt,
  Bed,
  BarChart3,
  Bell,
  ShieldAlert,
  Settings,
  LogOut,
  Stethoscope,
} from 'lucide-react';

interface NavItem {
  title: string;
  href: string;
  icon: React.ElementType;
  permission?: string;
  roles?: string[];
  badge?: string;
}

export function Sidebar() {
  const pathname = usePathname();
  const { user, role, logout } = useAuth();

  const navItems: NavItem[] = [
    {
      title: 'Dashboard',
      href: '/dashboard',
      icon: Activity,
    },
    {
      title: 'Patients',
      href: '/patients',
      icon: Users,
      roles: ['SUPER_ADMIN', 'ADMIN', 'DOCTOR', 'NURSE', 'RECEPTIONIST', 'ACCOUNTANT'],
    },
    {
      title: 'Doctors & Staff',
      href: '/doctors',
      icon: UserCheck,
    },
    {
      title: 'Appointments',
      href: '/appointments',
      icon: Calendar,
      roles: ['SUPER_ADMIN', 'ADMIN', 'DOCTOR', 'NURSE', 'RECEPTIONIST', 'PATIENT'],
    },
    {
      title: 'Medical Records (EMR)',
      href: '/medical-records',
      icon: FileText,
      roles: ['SUPER_ADMIN', 'ADMIN', 'DOCTOR', 'NURSE', 'PATIENT'],
    },
    {
      title: 'Prescriptions',
      href: '/prescriptions',
      icon: Stethoscope,
      roles: ['SUPER_ADMIN', 'ADMIN', 'DOCTOR', 'PHARMACIST', 'PATIENT'],
    },
    {
      title: 'Laboratory',
      href: '/laboratory',
      icon: FlaskConical,
      roles: ['SUPER_ADMIN', 'ADMIN', 'DOCTOR', 'LAB_TECHNICIAN', 'PATIENT'],
    },
    {
      title: 'Pharmacy & Stock',
      href: '/pharmacy',
      icon: Pill,
      roles: ['SUPER_ADMIN', 'ADMIN', 'PHARMACIST'],
    },
    {
      title: 'Billing & Invoices',
      href: '/billing',
      icon: Receipt,
      roles: ['SUPER_ADMIN', 'ADMIN', 'ACCOUNTANT', 'RECEPTIONIST', 'PATIENT'],
    },
    {
      title: 'Inpatient Admissions',
      href: '/admissions',
      icon: Bed,
      roles: ['SUPER_ADMIN', 'ADMIN', 'DOCTOR', 'NURSE'],
    },
    {
      title: 'Reports & Analytics',
      href: '/reports',
      icon: BarChart3,
      roles: ['SUPER_ADMIN', 'ADMIN', 'ACCOUNTANT'],
    },
    {
      title: 'Audit Logs',
      href: '/audit-logs',
      icon: ShieldAlert,
      roles: ['SUPER_ADMIN', 'ADMIN'],
    },
    {
      title: 'Notifications',
      href: '/notifications',
      icon: Bell,
    },
    {
      title: 'Settings',
      href: '/settings',
      icon: Settings,
    },
  ];

  // Filter items according to user's role
  const visibleItems = navItems.filter((item) => {
    if (!item.roles) return true;
    if (role === 'SUPER_ADMIN') return true;
    return role ? item.roles.includes(role) : false;
  });

  return (
    <aside className="w-64 flex-shrink-0 bg-white dark:bg-slate-900 border-r border-slate-200/80 dark:border-slate-800 flex flex-col h-screen sticky top-0">
      {/* Brand Header */}
      <div className="h-16 flex items-center gap-3 px-6 border-b border-slate-100 dark:border-slate-800">
        <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-xs">
          <Activity className="w-5 h-5" />
        </div>
        <div>
          <span className="font-bold text-slate-900 dark:text-slate-100 text-base tracking-tight block leading-tight">
            HMIS Health
          </span>
          <span className="text-[10px] uppercase font-bold tracking-wider text-blue-600 dark:text-blue-400">
            Integrated Clinical OS
          </span>
        </div>
      </div>

      {/* Navigation Links */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        <div className="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
          Clinical Domains
        </div>
        {visibleItems.map((item) => {
          const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                isActive
                  ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400'}`} />
              <span className="flex-1 truncate">{item.title}</span>
            </Link>
          );
        })}
      </div>

      {/* User Footer Profile */}
      <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5 truncate">
            <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 flex items-center justify-center font-bold text-xs uppercase flex-shrink-0">
              {user?.firstName?.[0] || 'U'}
              {user?.lastName?.[0] || ''}
            </div>
            <div className="truncate">
              <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">
                {user?.firstName} {user?.lastName}
              </p>
              <span className="inline-block text-[10px] font-medium text-slate-500 dark:text-slate-400 truncate">
                {user?.role?.replace('_', ' ')}
              </span>
            </div>
          </div>
          <button
            onClick={logout}
            title="Log out"
            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
