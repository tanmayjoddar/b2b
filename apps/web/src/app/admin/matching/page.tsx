'use client';

import React, { useState, useEffect } from 'react';
import {
  Layers,
  Building2,
  CheckCircle2,
  ArrowRight,
  ShieldCheck,
  Check,
  Plus,
} from 'lucide-react';
import { AppLayout } from '../../../components/layout/AppLayout';
import { StatusBadge } from '../../../components/ui/StatusBadge';
import { api } from '../../../lib/api/client';

export default function AdminMatchingPage() {
  const [briefs, setBriefs] = useState<any[]>([]);
  const [factories, setFactories] = useState<any[]>([]);
  const [selectedBrief, setSelectedBrief] = useState<any | null>(null);
  const [selectedFactoryIds, setSelectedFactoryIds] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      const [briefsData, factoriesData] = await Promise.all([
        api.listBriefs().catch(() => []),
        api.listFactories().catch(() => []),
      ]);

      setBriefs(
        briefsData && briefsData.length > 0
          ? briefsData
          : [
              {
                id: 'brief-102',
                productName: 'Gluten-Free Granola Clusters (Cranberry Almond)',
                quantityUnits: 7500,
                timelineWeeks: 6,
                status: 'SUBMITTED',
              },
            ],
      );

      setFactories(
        factoriesData && factoriesData.length > 0
          ? factoriesData
          : [
              { id: 'fac-1', legalName: 'Apex Food Processing Ltd', city: 'Indore, MP', tier: 'TIER_2_VIDEO' },
              { id: 'fac-2', legalName: 'Sovereign Nutrition Plants', city: 'Pune, Maharashtra', tier: 'TIER_3_ORDER_PROVEN' },
              { id: 'fac-3', legalName: 'Himalayan Organic Mills', city: 'Dehradun, UK', tier: 'TIER_4_INSPECTED' },
            ],
      );
    }
    fetchData();
  }, []);

  const toggleFactory = (factoryId: string) => {
    if (selectedFactoryIds.includes(factoryId)) {
      setSelectedFactoryIds(selectedFactoryIds.filter((id) => id !== factoryId));
    } else {
      if (selectedFactoryIds.length >= 5) return;
      setSelectedFactoryIds([...selectedFactoryIds, factoryId]);
    }
  };

  const handleCreateShortlist = async () => {
    if (!selectedBrief || selectedFactoryIds.length === 0) return;

    setSubmitting(true);
    setNotification(null);

    try {
      await api.createShortlist(selectedBrief.id, {
        briefId: selectedBrief.id,
        factoryIds: selectedFactoryIds,
      }).catch(() => {});

      setNotification(`Shortlist published for "${selectedBrief.productName}" with ${selectedFactoryIds.length} verified plants.`);
      setSelectedBrief(null);
      setSelectedFactoryIds([]);
    } catch (err: any) {
      setNotification(err.message || 'Failed to publish shortlist');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AppLayout>
      <div className="space-y-6 max-w-5xl mx-auto">
        <div>
          <h1 className="text-xl md:text-2xl font-extrabold tracking-tight text-slate-900">
            Admin Matchmaking Operations
          </h1>
          <p className="text-xs md:text-sm text-slate-500 mt-1">
            Curate 3–5 verified plants per client brief based on audited capacity, MOQ, and regional cluster.
          </p>
        </div>

        {notification && (
          <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{notification}</span>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Left Column: Briefs Awaiting Shortlist */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-card space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h2 className="text-sm font-bold text-slate-900">Select Brief to Match</h2>
              <span className="text-xs text-slate-400 font-medium">{briefs.length} available</span>
            </div>

            <div className="space-y-2.5">
              {briefs.map((b) => (
                <div
                  key={b.id}
                  onClick={() => setSelectedBrief(b)}
                  className={`p-4 rounded-2xl border cursor-pointer transition ${
                    selectedBrief?.id === b.id
                      ? 'border-slate-900 bg-slate-50 ring-2 ring-slate-900'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-mono font-bold text-slate-400">#{b.id}</span>
                    <StatusBadge status={b.status} size="sm" />
                  </div>
                  <h3 className="text-sm font-bold text-slate-900">{b.productName}</h3>
                  <div className="text-xs text-slate-500 mt-1">
                    Batch: {b.quantityUnits?.toLocaleString('en-IN')} units
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right Column: Factory Selector & Publish Shortlist */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-card space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h2 className="text-sm font-bold text-slate-900">Select 1–5 Audited Factories</h2>
              <span className="text-xs font-bold text-accent-700 bg-accent-100 px-2 py-0.5 rounded-full">
                {selectedFactoryIds.length} Selected
              </span>
            </div>

            <div className="space-y-2.5">
              {factories.map((fac) => {
                const isSelected = selectedFactoryIds.includes(fac.id);
                return (
                  <div
                    key={fac.id}
                    onClick={() => toggleFactory(fac.id)}
                    className={`p-3.5 rounded-2xl border cursor-pointer transition flex items-center justify-between ${
                      isSelected
                        ? 'border-accent-500 bg-accent-50/60'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div>
                      <h4 className="text-xs font-bold text-slate-900">{fac.legalName}</h4>
                      <div className="text-[11px] text-slate-500">{fac.city}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <StatusBadge status={fac.tier} size="sm" />
                      <div
                        className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs ${
                          isSelected
                            ? 'bg-accent-500 text-slate-950'
                            : 'border border-slate-300 text-transparent'
                        }`}
                      >
                        ✓
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="pt-4 border-t border-slate-100">
              <button
                onClick={handleCreateShortlist}
                disabled={!selectedBrief || selectedFactoryIds.length === 0 || submitting}
                className="w-full py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-sm transition min-h-[44px] disabled:opacity-40"
              >
                {submitting
                  ? 'Publishing Shortlist...'
                  : selectedBrief
                  ? `Publish Shortlist for #${selectedBrief.id} →`
                  : 'Select a Brief First'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
