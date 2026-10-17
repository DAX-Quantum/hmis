'use client';

import React, { useState } from 'react';
import { useAuth, DEMO_USERS } from '@/context/auth-context';
import { Activity, ShieldCheck, Lock, Mail, ArrowRight, UserCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function LoginPage() {
  const { login, quickLogin, isLoading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please provide both email and password.');
      return;
    }

    setError(null);
    setIsSubmitting(true);
    try {
      await login(email, password);
    } catch (err: any) {
      setError(err?.message || 'Login failed. Please verify credentials.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleQuickSelect = (key: string) => {
    const creds = DEMO_USERS[key];
    if (creds) {
      setEmail(creds.email);
      setPassword(creds.pass);
      setError(null);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Background aesthetic glow */}
      <div className="absolute top-1/4 left-1/3 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-blue-600/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/3 translate-x-1/2 translate-y-1/2 w-96 h-96 bg-indigo-600/15 rounded-full blur-3xl pointer-events-none" />

      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10 text-center mb-8">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-blue-600 text-white shadow-xl shadow-blue-500/20 mb-4">
          <Activity className="w-6 h-6" />
        </div>
        <h2 className="text-2xl font-bold tracking-tight text-white">
          HMIS Integrated Healthcare OS
        </h2>
        <p className="mt-1 text-sm text-slate-400">
          Enterprise clinical operations, electronic medical records & patient management
        </p>
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-4xl relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Main Login Card */}
        <div className="lg:col-span-6 bg-slate-800/80 backdrop-blur-md p-8 rounded-2xl border border-slate-700/80 shadow-2xl">
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-white">Sign In to Clinic Console</h3>
            <p className="text-xs text-slate-400 mt-1">
              Enter your authorized staff or patient credentials
            </p>
          </div>

          {error && (
            <div className="mb-5 p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">Email Address</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@hmis.local"
                  required
                  className="w-full pl-9 pr-3 py-2 text-sm rounded-lg bg-slate-900/80 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  required
                  className="w-full pl-9 pr-3 py-2 text-sm rounded-lg bg-slate-900/80 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                />
              </div>
            </div>

            <Button
              type="submit"
              className="w-full mt-2"
              size="lg"
              isLoading={isSubmitting || isLoading}
            >
              Sign In to Platform <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </form>

          <div className="mt-6 pt-5 border-t border-slate-700/60 flex items-center justify-between text-xs text-slate-400">
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-400" /> AES-256 / JWT Secure
            </span>
            <span>v1.0.0 Enterprise</span>
          </div>
        </div>

        {/* 1-Click Demo Accounts Quick Picker */}
        <div className="lg:col-span-6 bg-slate-800/40 backdrop-blur-xs p-6 rounded-2xl border border-slate-800 space-y-4">
          <div className="flex items-center gap-2">
            <UserCheck className="w-4 h-4 text-blue-400" />
            <h4 className="text-sm font-semibold text-white">Instant 1-Click Role Switcher</h4>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            Click any demo persona to automatically log into that specific role’s customized dashboard with fine-grained RBAC permissions:
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
            {Object.entries(DEMO_USERS).map(([roleKey, u]) => (
              <button
                key={roleKey}
                type="button"
                onClick={() => quickLogin(roleKey)}
                className="text-left p-3 rounded-xl bg-slate-800/90 hover:bg-slate-700 border border-slate-700/60 hover:border-blue-500/50 transition-all group cursor-pointer"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-semibold text-white group-hover:text-blue-400 transition-colors">
                    {u.title}
                  </span>
                  <span className="text-[9px] font-mono px-1 py-0.5 rounded-sm bg-slate-900 text-slate-400">
                    {roleKey.replace('_', ' ')}
                  </span>
                </div>
                <p className="text-[10px] text-slate-400 line-clamp-1">{u.desc}</p>
              </button>
            ))}
          </div>

          <div className="p-3 rounded-lg bg-blue-950/30 border border-blue-900/40 text-[11px] text-blue-300/80">
            💡 <strong>Tip:</strong> You can also use the persona dropdown in the top navigation bar at any time while browsing to switch roles instantaneously.
          </div>
        </div>
      </div>
    </div>
  );
}
