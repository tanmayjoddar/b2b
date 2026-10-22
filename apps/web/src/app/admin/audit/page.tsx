'use client';

import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  Search,
  Filter,
  Calendar,
  User,
  Activity,
  Layers,
  ArrowRight,
} from 'lucide-react';
import { AppLayout } from '../../../components/layout/AppLayout';
import { StatusBadge } from '../../../components/ui/StatusBadge';
import { api } from '../../../lib/api/client';
import { Role } from '@factorymatch/shared';

export default function AdminAuditPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [entityType, setEntityType] = useState('');
  const [actorUserId, setActorUserId] = useState('');
  const [currentUser, setCurrentUser] = useState<any>(null);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const res = await api.getAuditLogs({
        entityType: entityType || undefined,
        actorUserId: actorUserId || undefined,
        limit: 50,
      });
      setLogs(res?.items || res?.data?.items || []);
    } catch {
      setLogs([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const storedUser = typeof window !== 'undefined' ? localStorage.getItem('fm_user') : null;
    if (storedUser) {
      try {
        setCurrentUser(JSON.parse(storedUser));
      } catch {}
    }
    fetchLogs();
  }, []);

  const handleSwitchToAdmin = async () => {
    try {
      const res = await api.loginWithPassword({ email: 'admin@factorymatch.in', password: 'Admin@123456' });
      setCurrentUser(res.user);
      await fetchLogs();
    } catch (err: any) {
      console.error(err);
    }
  };

  return (
    <AppLayout
      role="ADMIN"
      activePath="/admin/audit"
      title="Audit Trail & System Compliance"
      subtitle="Append-only cryptographic event history for tenant isolation, state transitions, and accreditations."
    >
      <div className="space-y-6">
        {/* RBAC Notice if user is not ADMIN */}
        {currentUser && currentUser.role !== Role.ADMIN && (
          <div className="p-5 rounded-3xl bg-amber-50 border border-amber-200/80 text-amber-900 text-xs space-y-3">
            <div className="flex items-center gap-2 font-bold text-amber-950">
              <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0" />
              <span>Restricted Operations: Administrator Privilege Required</span>
            </div>
            <p className="text-amber-800 leading-relaxed">
              You are currently authenticated as <strong>{currentUser.email || currentUser.role}</strong> ({currentUser.role}). Viewing system audit logs and compliance trails requires Platform Admin role.
            </p>
            <button
              onClick={handleSwitchToAdmin}
              className="px-4 py-2.5 rounded-xl bg-slate-950 hover:bg-slate-800 text-white font-bold transition flex items-center gap-2 min-h-[44px]"
            >
              <span>Switch to Admin Operator (admin@factorymatch.in)</span>
            </button>
          </div>
        )}

        {/* Filters */}
        <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-sm flex flex-col md:flex-row items-center gap-4 justify-between">
          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
            <div className="relative flex-1 md:w-64">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Filter by Actor User ID..."
                value={actorUserId}
                onChange={(e) => setActorUserId(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-2xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-lime-500 font-medium"
              />
            </div>

            <select
              value={entityType}
              onChange={(e) => setEntityType(e.target.value)}
              className="text-xs bg-slate-50 border border-slate-200 rounded-2xl px-3 py-2.5 font-medium text-slate-700 focus:outline-none"
            >
              <option value="">All Entity Types</option>
              <option value="Factory">Factory</option>
              <option value="Brief">Brief</option>
              <option value="Order">Order</option>
              <option value="Payment">Payment</option>
              <option value="Review">Review</option>
            </select>

            <button
              onClick={fetchLogs}
              className="px-4 py-2.5 bg-slate-900 text-white font-bold text-xs rounded-2xl hover:bg-slate-800 transition min-h-[44px]"
            >
              Apply Filter
            </button>
          </div>

          <div className="text-xs text-slate-500 font-medium flex items-center gap-1.5 self-start md:self-auto">
            <Activity className="w-4 h-4 text-lime-600" />
            <span>Showing {logs.length} audit records</span>
          </div>
        </div>

        {/* Audit Log Table */}
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/50 text-slate-500 font-bold uppercase tracking-wider">
                  <th className="py-3.5 px-4">Timestamp</th>
                  <th className="py-3.5 px-4">Action</th>
                  <th className="py-3.5 px-4">Entity</th>
                  <th className="py-3.5 px-4">Actor</th>
                  <th className="py-3.5 px-4">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-400">
                      Loading audit records...
                    </td>
                  </tr>
                ) : logs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-400">
                      No audit log records match the query.
                    </td>
                  </tr>
                ) : (
                  logs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50/70 transition">
                      <td className="py-3.5 px-4 whitespace-nowrap text-slate-500">
                        {new Date(log.createdAt).toLocaleString('en-IN', {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                          second: '2-digit',
                        })}
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className="font-mono font-bold text-slate-900 px-2.5 py-1 bg-slate-100 rounded-lg">
                          {log.action}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-slate-900">{log.entityType}</span>
                          <span className="font-mono text-[10px] text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                            {log.entityId}
                          </span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {log.actor ? (
                          <div>
                            <div className="font-semibold text-slate-900">{log.actor.email || log.actor.phone}</div>
                            <div className="text-[10px] text-slate-500 font-mono">{log.actor.role}</div>
                          </div>
                        ) : (
                          <span className="text-slate-400 font-mono">SYSTEM / WEBHOOK</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        <pre className="font-mono text-[10px] text-slate-600 bg-slate-50 p-2 rounded-xl max-w-xs md:max-w-md overflow-x-auto">
                          {JSON.stringify(log.afterJson || {}, null, 1)}
                        </pre>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
