'use client';

import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { api } from '@/lib/api';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input, Select } from '@/components/ui/input';
import { ShieldAlert, Search, Filter, Lock, Terminal } from 'lucide-react';

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [actionFilter, setActionFilter] = useState('');
  const [resourceFilter, setResourceFilter] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  const loadLogs = async () => {
    setIsLoading(true);
    try {
      let q = '?limit=50';
      if (actionFilter) q += `&action=${encodeURIComponent(actionFilter)}`;
      if (resourceFilter) q += `&resource=${encodeURIComponent(resourceFilter)}`;

      const data = await api.get(`/audit-logs${q}`);
      setLogs(data?.data || []);
      setTotal(data?.meta?.total || 0);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadLogs();
  }, [actionFilter, resourceFilter]);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <ShieldAlert className="w-6 h-6 text-rose-600" /> Security Compliance & Immutable Audit Log
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Read-only immutable transaction ledger recording user clinical access, electronic prescriptions, and modifications
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Badge variant="outline" className="font-mono text-xs">
              <Lock className="w-3 h-3 mr-1 text-emerald-500" /> Tamper Evident
            </Badge>
          </div>
        </div>

        {/* Filter Bar */}
        <Card>
          <CardContent className="p-4 grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">Search Action</label>
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  value={actionFilter}
                  onChange={(e) => setActionFilter(e.target.value)}
                  placeholder="e.g. CONSULTATION, LOGIN, DISPENSE..."
                  className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">Target Resource</label>
              <select
                value={resourceFilter}
                onChange={(e) => setResourceFilter(e.target.value)}
                className="w-full text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 p-1.5"
              >
                <option value="">All Protected Resources</option>
                <option value="AUTH">Authentication / Sessions</option>
                <option value="PATIENT">Patient Records</option>
                <option value="CONSULTATION">Doctor Consultations</option>
                <option value="PRESCRIPTION">Prescriptions</option>
                <option value="LAB_ORDER">Laboratory Orders</option>
                <option value="MEDICINE">Pharmacy Inventory</option>
                <option value="INVOICE">Invoices & Billing</option>
              </select>
            </div>

            <div className="flex items-end justify-between">
              <span className="text-xs text-slate-500">
                Audited Events: <strong>{total}</strong>
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Table */}
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Timestamp</TableHead>
                <TableHead>Acting User</TableHead>
                <TableHead>Action Code</TableHead>
                <TableHead>Resource Domain</TableHead>
                <TableHead>IP Address</TableHead>
                <TableHead>Structured Audit Metadata</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-10 text-slate-400 text-xs">
                    Loading security audit ledger...
                  </TableCell>
                </TableRow>
              ) : logs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-10 text-slate-400 text-xs">
                    No audit records matching query.
                  </TableCell>
                </TableRow>
              ) : (
                logs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="font-mono text-xs text-slate-500">
                      {new Date(log.timestamp).toLocaleString()}
                    </TableCell>
                    <TableCell>
                      {log.user ? (
                        <div>
                          <span className="text-xs font-semibold text-slate-900 dark:text-slate-100 block">
                            {log.user.firstName} {log.user.lastName}
                          </span>
                          <span className="text-[10px] text-slate-400">{log.user.role}</span>
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400 font-mono">System Actor</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="font-mono text-[11px]">
                        {log.action}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="info">{log.resource}</Badge>
                    </TableCell>
                    <TableCell className="font-mono text-xs text-slate-500">
                      {log.ipAddress || '127.0.0.1'}
                    </TableCell>
                    <TableCell className="font-mono text-[11px] text-slate-600 dark:text-slate-400 max-w-sm truncate">
                      {log.metadata ? JSON.stringify(log.metadata) : 'N/A'}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </Card>
      </div>
    </DashboardLayout>
  );
}
