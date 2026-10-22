'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { FileSpreadsheet, ArrowRight, Clock, Plus, Layers, CheckCircle2 } from 'lucide-react';
import { AppLayout } from '../../components/layout/AppLayout';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { api } from '../../lib/api/client';
import { BriefStatus } from '@factorymatch/shared';

export default function BriefsListPage() {
  const [briefs, setBriefs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadBriefs() {
      try {
        const data = await api.listBriefs();
        setBriefs(data || []);
      } catch (err) {
        setBriefs([]);
      } finally {
        setLoading(false);
      }
    }
    loadBriefs();
  }, []);

  return (
    <AppLayout>
      <div className="space-y-6 max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl md:text-2xl font-extrabold tracking-tight text-slate-900">
              Manufacturing Briefs
            </h1>
            <p className="text-xs md:text-sm text-slate-500 mt-1">
              Active production requests undergoing 48-hour verified factory matchmaking.
            </p>
          </div>

          <Link
            href="/briefs/new"
            className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-sm transition flex items-center justify-center gap-2 min-h-[44px]"
          >
            <Plus className="w-4 h-4" />
            <span>Create New Brief</span>
          </Link>
        </div>

        {/* Briefs List Container */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-card space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              All Briefs ({briefs.length})
            </span>
          </div>

          <div className="divide-y divide-slate-100">
            {briefs.map((brief) => (
              <div
                key={brief.id}
                className="py-4 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-slate-50/50 p-3 rounded-2xl transition"
              >
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold text-slate-400">#{brief.id}</span>
                    <StatusBadge status={brief.status} size="sm" />
                  </div>
                  <h3 className="text-sm md:text-base font-bold text-slate-900">
                    {brief.productName}
                  </h3>
                  <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
                    <span>Target Volume: {brief.quantityUnits.toLocaleString('en-IN')} units</span>
                    <span>•</span>
                    <span>Lead Target: {brief.timelineWeeks} weeks</span>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Link
                    href={`/briefs/${brief.id}/quotes`}
                    className="w-full md:w-auto px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-sm transition flex items-center justify-center gap-1.5 min-h-[44px]"
                  >
                    <span>View Quotes Matrix</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
