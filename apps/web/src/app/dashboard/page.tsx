'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  FileSpreadsheet,
  Building2,
  PackageCheck,
  Scale,
  ArrowRight,
  ShieldCheck,
  Clock,
  Layers,
} from 'lucide-react';
import { AppLayout } from '../../components/layout/AppLayout';
import { MetricCard } from '../../components/ui/MetricCard';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { api } from '../../lib/api/client';

export default function DashboardPage() {
  const [briefs, setBriefs] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [factories, setFactories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const [briefsData, ordersData, factoriesData] = await Promise.all([
          api.listBriefs(),
          api.listOrders(),
          api.listFactories(),
        ]);
        setBriefs(briefsData || []);
        setOrders(ordersData || []);
        setFactories(factoriesData || []);
      } catch {
        setBriefs([]);
        setOrders([]);
        setFactories([]);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl md:text-2xl font-extrabold tracking-tight text-slate-900">
              Operations Overview
            </h1>
            <p className="text-xs md:text-sm text-slate-500 mt-1">
              Active manufacturing briefs, quotation comparisons, and batch production tracking.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/briefs/new"
              className="w-full sm:w-auto px-5 py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-sm transition flex items-center justify-center gap-2 min-h-[44px]"
            >
              <span>+ Create Manufacturing Brief</span>
            </Link>
          </div>
        </div>

        {/* Metric Cards Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard
            title="Active Briefs"
            value={briefs.length}
            subtitle="Under 48h verified matching"
            delta={{ value: '100% on time', positive: true }}
            icon={FileSpreadsheet}
            badgeColor="lime"
          />
          <MetricCard
            title="Verified Quotes"
            value="3–5"
            subtitle="Per brief side-by-side"
            delta={{ value: '18% cost saved', positive: true }}
            icon={Scale}
            badgeColor="blue"
          />
          <MetricCard
            title="In Production"
            value={orders.length}
            subtitle="Milestone & sample tracked"
            delta={{ value: 'QC checked', positive: true }}
            icon={PackageCheck}
            badgeColor="purple"
          />
          <MetricCard
            title="Audited Factories"
            value={factories.length}
            subtitle="Snacks & Nutrition cluster"
            delta={{ value: 'Tier 1–4', positive: true }}
            icon={Building2}
            badgeColor="slate"
          />
        </div>

        {/* Two Column Layout: Active Briefs + Quick Deal Protection Card */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Recent Manufacturing Briefs (2 cols) */}
          <div className="lg:col-span-2 bg-white rounded-3xl p-6 border border-slate-200/80 shadow-card space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div>
                <h2 className="text-sm md:text-base font-bold text-slate-900">Manufacturing Briefs</h2>
                <p className="text-xs text-slate-400">Audited factory shortlists and quotes</p>
              </div>
              <Link
                href="/briefs"
                className="text-xs font-bold text-slate-900 hover:underline flex items-center gap-1"
              >
                View all <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {briefs.length === 0 ? (
              <div className="py-12 text-center space-y-3">
                <FileSpreadsheet className="w-10 h-10 text-slate-300 mx-auto" />
                <h4 className="text-sm font-bold text-slate-800">No active briefs yet</h4>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  Submit a structured brief with formulation and packaging specs to receive 3–5 verified quotes within 48 hours.
                </p>
                <Link
                  href="/briefs/new"
                  className="inline-block px-4 py-2.5 rounded-xl bg-accent-400 text-slate-950 font-bold text-xs hover:bg-accent-500 transition min-h-[44px]"
                >
                  Create First Brief
                </Link>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {briefs.map((b) => (
                  <div key={b.id} className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="space-y-1">
                      <div className="text-sm font-bold text-slate-900">{b.productName}</div>
                      <div className="text-xs text-slate-500 flex items-center gap-3">
                        <span>Quantity: {b.quantityUnits.toLocaleString('en-IN')} units</span>
                        <span>•</span>
                        <span>Timeline: {b.timelineWeeks} weeks</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <StatusBadge status={b.status} size="sm" />
                      <Link
                        href={`/briefs/${b.id}/quotes`}
                        className="px-3 py-2 rounded-xl text-xs font-bold bg-slate-900 text-white hover:bg-slate-800 transition min-h-[44px] flex items-center"
                      >
                        Compare Quotes →
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Right Column: Sourcing SLA & Safeguards */}
          <div className="space-y-6">
            {/* 48h Matchmaker Card */}
            <div className="bg-slate-900 text-white rounded-3xl p-6 shadow-card space-y-4 border border-slate-800">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-accent-400" />
                <span className="text-xs font-bold text-accent-400 uppercase tracking-wider">
                  48-Hour Matching SLA
                </span>
              </div>

              <h3 className="text-lg font-extrabold leading-snug">
                One Structured Brief. 3–5 Verified Factories.
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                Replaces unverified broker chats. Every factory on your shortlist is verified against FoSCoS registers, GST returns, and plant capacity.
              </p>

              <div className="pt-2">
                <Link
                  href="/briefs/new"
                  className="w-full block text-center py-3 rounded-xl bg-accent-400 hover:bg-accent-500 text-slate-950 font-bold text-xs transition min-h-[44px]"
                >
                  Start New Brief
                </Link>
              </div>
            </div>

            {/* Sourcing Safeguards */}
            <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-card space-y-3">
              <h4 className="text-sm font-bold text-slate-900">Institutional Safeguards</h4>
              <div className="space-y-2.5 text-xs text-slate-600">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>FSSAI FoSCoS license validation</span>
                </div>
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Prototype sample approval workflow</span>
                </div>
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Milestone payment escrow protection</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
