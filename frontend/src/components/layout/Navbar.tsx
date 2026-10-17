'use client';

import React, { useState, useEffect } from 'react';
import { useAuth, DEMO_USERS } from '@/context/auth-context';
import { api } from '@/lib/api';
import {
  Search,
  Bell,
  Sun,
  Moon,
  ChevronDown,
  UserCheck,
  User,
  Calendar,
  Pill,
  Receipt,
  X,
} from 'lucide-react';
import Link from 'next/link';

export function Navbar() {
  const { user, quickLogin, role } = useAuth();
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [isRoleDropdownOpen, setIsRoleDropdownOpen] = useState(false);
  const [isDark, setIsDark] = useState(false);
  const [unreadCount, setUnreadCount] = useState(3);

  // Initialize theme
  useEffect(() => {
    const isDarkTheme = document.documentElement.classList.contains('dark');
    setIsDark(isDarkTheme);
  }, []);

  const toggleTheme = () => {
    if (document.documentElement.classList.contains('dark')) {
      document.documentElement.classList.remove('dark');
      setIsDark(false);
    } else {
      document.documentElement.classList.add('dark');
      setIsDark(true);
    }
  };

  // Keyboard shortcut for search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setIsSearchOpen(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Debounced search
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults(null);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await api.get(`/search?q=${encodeURIComponent(searchQuery)}`);
        setSearchResults(res);
      } catch (e) {
        // ignore
      } finally {
        setIsSearching(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  return (
    <>
      <header className="h-16 bg-white dark:bg-slate-900 border-b border-slate-200/80 dark:border-slate-800 flex items-center justify-between px-6 sticky top-0 z-30">
        {/* Global Search trigger */}
        <div className="flex items-center gap-4 flex-1 max-w-md">
          <button
            onClick={() => setIsSearchOpen(true)}
            className="w-full flex items-center justify-between px-3.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/40 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:border-slate-300 dark:hover:border-slate-700 text-xs transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <Search className="w-3.5 h-3.5 text-slate-400" />
              <span>Search patients, MRN, doctors, drugs...</span>
            </div>
            <kbd className="px-1.5 py-0.5 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-[10px] font-mono text-slate-500">
              Ctrl+K
            </kbd>
          </button>
        </div>

        {/* Right Controls */}
        <div className="flex items-center gap-3">
          {/* Quick Persona Role Switcher for seamless evaluation */}
          <div className="relative">
            <button
              onClick={() => setIsRoleDropdownOpen(!isRoleDropdownOpen)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-blue-200 dark:border-blue-900 bg-blue-50/60 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 text-xs font-semibold hover:bg-blue-100/70 transition-colors cursor-pointer"
            >
              <UserCheck className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Demo Persona:</span>
              <span className="font-bold underline">{role?.replace('_', ' ') || 'Switch'}</span>
              <ChevronDown className="w-3 h-3" />
            </button>

            {isRoleDropdownOpen && (
              <div
                className="absolute right-0 mt-2 w-72 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl py-2 z-50 animate-in fade-in zoom-in-95 duration-150"
                onClick={() => setIsRoleDropdownOpen(false)}
              >
                <div className="px-3 py-1.5 border-b border-slate-100 dark:border-slate-800 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Switch Active Role (1-Click)
                </div>
                <div className="max-h-72 overflow-y-auto divide-y divide-slate-50 dark:divide-slate-800/60">
                  {Object.entries(DEMO_USERS).map(([key, item]) => (
                    <button
                      key={key}
                      onClick={() => quickLogin(key)}
                      className="w-full text-left px-3.5 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-800/70 transition-colors group cursor-pointer"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 group-hover:text-blue-600">
                          {item.title}
                        </span>
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-sm bg-slate-100 dark:bg-slate-800 text-slate-500">
                          {key}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 dark:text-slate-500 line-clamp-1 mt-0.5">
                        {item.desc}
                      </p>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Theme switcher */}
          <button
            onClick={toggleTheme}
            title={isDark ? 'Switch to Light mode' : 'Switch to Dark mode'}
            className="p-2 rounded-lg text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-600" />}
          </button>

          {/* Notifications bell */}
          <Link
            href="/notifications"
            className="relative p-2 rounded-lg text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-rose-500 ring-2 ring-white dark:ring-slate-900" />
            )}
          </Link>
        </div>
      </header>

      {/* Global Search Modal */}
      {isSearchOpen && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center pt-20 p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150"
          onClick={() => setIsSearchOpen(false)}
        >
          <div
            className="w-full max-w-2xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden transform transition-all"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-3 border-b border-slate-100 dark:border-slate-800 flex items-center gap-3">
              <Search className="w-5 h-5 text-slate-400 ml-2" />
              <input
                autoFocus
                placeholder="Search across patients, MRN, doctors, medicines, invoices..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1 bg-transparent text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none"
              />
              <button
                onClick={() => setIsSearchOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="max-h-96 overflow-y-auto p-4 space-y-4">
              {isSearching && (
                <div className="py-6 text-center text-xs text-slate-400">Searching records...</div>
              )}

              {!isSearching && !searchResults && (
                <div className="py-6 text-center text-xs text-slate-400">
                  Type at least 1 character to search patients, doctors, drugs, and billing.
                </div>
              )}

              {searchResults && (
                <>
                  {/* Patients */}
                  {searchResults.patients?.length > 0 && (
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2 block">
                        Patients ({searchResults.patients.length})
                      </span>
                      <div className="space-y-1">
                        {searchResults.patients.map((p: any) => (
                          <Link
                            key={p.id}
                            href={`/patients/${p.id}`}
                            onClick={() => setIsSearchOpen(false)}
                            className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                          >
                            <div className="flex items-center gap-2.5">
                              <User className="w-4 h-4 text-blue-600" />
                              <span className="text-sm font-medium text-slate-800 dark:text-slate-200">
                                {p.firstName} {p.lastName}
                              </span>
                            </div>
                            <span className="text-xs font-mono text-slate-400">{p.mrn}</span>
                          </Link>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Doctors */}
                  {searchResults.doctors?.length > 0 && (
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2 block">
                        Doctors ({searchResults.doctors.length})
                      </span>
                      <div className="space-y-1">
                        {searchResults.doctors.map((d: any) => (
                          <Link
                            key={d.id}
                            href="/doctors"
                            onClick={() => setIsSearchOpen(false)}
                            className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                          >
                            <div className="flex items-center gap-2.5">
                              <UserCheck className="w-4 h-4 text-emerald-600" />
                              <span className="text-sm font-medium text-slate-800 dark:text-slate-200">
                                {d.user.firstName} {d.user.lastName}
                              </span>
                            </div>
                            <span className="text-xs text-slate-400">{d.specialization}</span>
                          </Link>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Medicines */}
                  {searchResults.medicines?.length > 0 && (
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2 block">
                        Medicines ({searchResults.medicines.length})
                      </span>
                      <div className="space-y-1">
                        {searchResults.medicines.map((m: any) => (
                          <Link
                            key={m.id}
                            href="/pharmacy"
                            onClick={() => setIsSearchOpen(false)}
                            className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                          >
                            <div className="flex items-center gap-2.5">
                              <Pill className="w-4 h-4 text-amber-600" />
                              <span className="text-sm font-medium text-slate-800 dark:text-slate-200">
                                {m.name}
                              </span>
                            </div>
                            <span className="text-xs text-slate-400">Stock: {m.totalStock}</span>
                          </Link>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Invoices */}
                  {searchResults.invoices?.length > 0 && (
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2 block">
                        Invoices ({searchResults.invoices.length})
                      </span>
                      <div className="space-y-1">
                        {searchResults.invoices.map((inv: any) => (
                          <Link
                            key={inv.id}
                            href="/billing"
                            onClick={() => setIsSearchOpen(false)}
                            className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                          >
                            <div className="flex items-center gap-2.5">
                              <Receipt className="w-4 h-4 text-purple-600" />
                              <span className="text-sm font-medium text-slate-800 dark:text-slate-200">
                                {inv.invoiceNumber}
                              </span>
                            </div>
                            <span className="text-xs text-slate-400">
                              {inv.patient?.firstName} {inv.patient?.lastName}
                            </span>
                          </Link>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
