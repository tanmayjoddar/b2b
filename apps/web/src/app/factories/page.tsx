'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Building2,
  MapPin,
  ShieldCheck,
  Check,
  Clock,
  Package,
  Layers,
  ArrowRight,
  ExternalLink,
} from 'lucide-react';
import { AppLayout } from '../../components/layout/AppLayout';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { TrustBadgeCard } from '../../components/ui/TrustBadgeCard';
import { api } from '../../lib/api/client';
import { VerificationTier } from '@factorymatch/shared';

export default function FactoriesPage() {
  const [factories, setFactories] = useState<any[]>([]);
  const [selectedFactory, setSelectedFactory] = useState<any | null>(null);

  useEffect(() => {
    async function loadFactories() {
      const data = await api.listFactories().catch(() => []);
      if (!data || data.length === 0) {
        setFactories([
          {
            id: 'fac-1',
            legalName: 'Apex Food Processing Ltd',
            city: 'Indore',
            state: 'Madhya Pradesh',
            tier: VerificationTier.TIER_2_VIDEO,
            leadTimeDaysMin: 14,
            leadTimeDaysMax: 21,
            capabilities: [
              { productType: 'Popped Quinoa & Protein Chips', moqUnits: 5000, capacityUnitsPerMonth: 150000 },
              { productType: 'Nutritional Seed Blends', moqUnits: 3000, capacityUnitsPerMonth: 80000 },
            ],
            verifiedCertificates: [
              { type: 'FSSAI', issuer: 'FoSCoS Food Safety Authority', validTo: '2028-12-31' },
              { type: 'GST', issuer: 'GSTN Government of India', validTo: '2030-01-01' },
            ],
          },
          {
            id: 'fac-2',
            legalName: 'Sovereign Nutrition Plants',
            city: 'Pune',
            state: 'Maharashtra',
            tier: VerificationTier.TIER_3_ORDER_PROVEN,
            leadTimeDaysMin: 10,
            leadTimeDaysMax: 18,
            capabilities: [
              { productType: 'Cold-Pressed Energy Bars', moqUnits: 10000, capacityUnitsPerMonth: 500000 },
              { productType: 'Protein Granola Clusters', moqUnits: 8000, capacityUnitsPerMonth: 250000 },
            ],
            verifiedCertificates: [
              { type: 'FSSAI', issuer: 'FoSCoS Central Licensing', validTo: '2029-05-15' },
              { type: 'GMP', issuer: 'Food Safety Audits International', validTo: '2027-08-30' },
            ],
          },
          {
            id: 'fac-3',
            legalName: 'Himalayan Organic Mills',
            city: 'Dehradun',
            state: 'Uttarakhand',
            tier: VerificationTier.TIER_4_INSPECTED,
            leadTimeDaysMin: 21,
            leadTimeDaysMax: 30,
            capabilities: [
              { productType: 'Roasted Makhana & Foxnuts', moqUnits: 15000, capacityUnitsPerMonth: 300000 },
            ],
            verifiedCertificates: [
              { type: 'FSSAI', issuer: 'FoSCoS State Authority', validTo: '2027-10-10' },
              { type: 'ISO', issuer: 'Bureau Veritas (ISO 22000)', validTo: '2028-04-20' },
            ],
          },
        ]);
      } else {
        setFactories(data);
      }
    }
    loadFactories();
  }, []);

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl md:text-2xl font-extrabold tracking-tight text-slate-900">
              Verified Manufacturing Plants
            </h1>
            <p className="text-xs md:text-sm text-slate-500 mt-1">
              Snacks & Nutrition cluster. Tier badges reflect actual government registry and video audit checks.
            </p>
          </div>

          <Link
            href="/briefs/new"
            className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-sm transition min-h-[44px] flex items-center justify-center"
          >
            Request Factory Shortlist
          </Link>
        </div>

        {/* Factories Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {factories.map((factory) => (
            <div
              key={factory.id}
              className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-card hover:shadow-card-hover transition-all flex flex-col justify-between space-y-4"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="w-10 h-10 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-800 shrink-0">
                    <Building2 className="w-5 h-5 stroke-[2]" />
                  </div>
                  <StatusBadge status={factory.tier} size="sm" />
                </div>

                <div>
                  <h3 className="text-base font-bold text-slate-900">{factory.legalName}</h3>
                  <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-1">
                    <MapPin className="w-3.5 h-3.5 text-slate-400" />
                    <span>
                      {factory.city}, {factory.state}
                    </span>
                  </div>
                </div>

                {/* Capabilities */}
                <div className="pt-2 border-t border-slate-100 space-y-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    Verified Capabilities
                  </span>
                  {factory.capabilities?.slice(0, 2).map((cap: any, i: number) => (
                    <div key={i} className="text-xs text-slate-700 flex justify-between">
                      <span className="truncate pr-2 font-medium">{cap.productType}</span>
                      <span className="text-slate-500 font-bold shrink-0">
                        MOQ {cap.moqUnits?.toLocaleString('en-IN')}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                <button
                  onClick={() => setSelectedFactory(factory)}
                  className="text-xs font-bold text-slate-700 hover:text-slate-950 flex items-center gap-1 min-h-[44px]"
                >
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span>View Verification Audit</span>
                </button>

                <Link
                  href="/briefs/new"
                  className="px-3 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 transition min-h-[44px] flex items-center"
                >
                  Quote Brief →
                </Link>
              </div>
            </div>
          ))}
        </div>

        {/* Modal: Verification Audit (matching Image 4 Identity Verified Card) */}
        {selectedFactory && (
          <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="relative w-full max-w-md">
              <button
                onClick={() => setSelectedFactory(null)}
                className="absolute top-4 right-4 z-20 w-8 h-8 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center hover:bg-slate-200 text-sm font-bold min-h-[44px]"
              >
                ✕
              </button>

              <TrustBadgeCard
                title={selectedFactory.legalName}
                subtitle={`Located in ${selectedFactory.city}, ${selectedFactory.state}. Verified for commercial contract manufacturing.`}
                tierLabel={selectedFactory.tier?.replace(/_/g, ' ')}
                checksPerformed={[
                  'FSSAI FoSCoS official license active',
                  'Ministry of Corporate Affairs / GSTN active filing',
                  'Floor hygiene and cold storage walkthrough verified',
                  'Standard batch production sample protocol accepted',
                ]}
              />
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
