'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Building2,
  FileCheck,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  MapPin,
  Calendar,
} from 'lucide-react';
import { AppLayout } from '../../../components/layout/AppLayout';
import { api } from '../../../lib/api/client';
import { CertificateType, LAUNCH_VERTICAL } from '@factorymatch/shared';

export default function FactoryOnboardPage() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);

  const [form, setForm] = useState({
    legalName: '',
    city: '',
    state: '',
    pincode: '',
    capacityNotes: 'Installed high-speed continuous nitrogen packaging lines. Temperature controlled storage.',
    leadTimeDaysMin: 14,
    leadTimeDaysMax: 28,
    // First capability
    productType: 'Protein Chips & Popped Snacks',
    moqUnits: 5000,
    capacityUnitsPerMonth: 200000,
    packagingOptions: 'Nitrogen Flushed Foil Pouch, Stand-up Doypack',
    // First certificate
    certType: CertificateType.FSSAI,
    certNumber: '10021022009841',
    validFrom: '2023-01-01T00:00:00.000Z',
    validTo: '2028-12-31T00:00:00.000Z',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setNotification(null);

    try {
      // 1. Create factory profile
      const factory = await api.createFactoryProfile({
        legalName: form.legalName,
        city: form.city,
        state: form.state,
        pincode: form.pincode,
        capacityNotes: form.capacityNotes,
        leadTimeDaysMin: Number(form.leadTimeDaysMin),
        leadTimeDaysMax: Number(form.leadTimeDaysMax),
        verticalId: LAUNCH_VERTICAL.id,
      });

      // 2. Add capability
      if (factory?.id) {
        await api.addCapability(factory.id, {
          verticalId: LAUNCH_VERTICAL.id,
          productType: form.productType,
          moqUnits: Number(form.moqUnits),
          capacityUnitsPerMonth: Number(form.capacityUnitsPerMonth),
          packagingOptions: form.packagingOptions.split(',').map((s) => s.trim()),
          attributesJson: {},
        }).catch(() => {});

        // 3. Submit certificate
        await api.submitCertificate(factory.id, {
          type: form.certType,
          number: form.certNumber,
          issuer: 'FSSAI Central Licensing Authority',
          validFrom: form.validFrom,
          validTo: form.validTo,
        }).catch(() => {});
      }

      setNotification('Factory profile submitted for verification audit. Directing to RFQ portal.');
      setTimeout(() => {
        router.push('/factory/quotes');
      }, 1500);
    } catch (err: any) {
      setNotification(err.message || 'Onboarding submission failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AppLayout>
      <div className="max-w-3xl mx-auto space-y-6">
        <div>
          <h1 className="text-xl md:text-2xl font-extrabold tracking-tight text-slate-900">
            Factory Accreditation & Plant Listing
          </h1>
          <p className="text-xs md:text-sm text-slate-500 mt-1">
            Register your manufacturing plant to receive qualified commercial RFQs from verified Indian D2C brands.
          </p>
        </div>

        {notification && (
          <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{notification}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="bg-white rounded-3xl p-6 md:p-8 border border-slate-200/80 shadow-card space-y-6">
          {/* Section 1: Facility Identity */}
          <div className="space-y-4">
            <div className="pb-2 border-b border-slate-100 flex items-center gap-2">
              <Building2 className="w-4 h-4 text-slate-700" />
              <h2 className="text-sm font-bold text-slate-900">Plant Identity & Location</h2>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                Registered Legal Business Name *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Apex Food Processing & Packaging Works LLP"
                value={form.legalName}
                onChange={(e) => setForm({ ...form, legalName: e.target.value })}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-900 text-sm min-h-[44px]"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                  City *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Indore"
                  value={form.city}
                  onChange={(e) => setForm({ ...form, city: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-900 text-sm min-h-[44px]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                  State *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Madhya Pradesh"
                  value={form.state}
                  onChange={(e) => setForm({ ...form, state: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-900 text-sm min-h-[44px]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                  Pincode (6 Digits) *
                </label>
                <input
                  type="text"
                  required
                  maxLength={6}
                  placeholder="452001"
                  value={form.pincode}
                  onChange={(e) => setForm({ ...form, pincode: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-900 text-sm min-h-[44px]"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Production Capabilities */}
          <div className="space-y-4 pt-4 border-t border-slate-100">
            <div className="pb-2 border-b border-slate-100 flex items-center gap-2">
              <FileCheck className="w-4 h-4 text-slate-700" />
              <h2 className="text-sm font-bold text-slate-900">Primary Product Line & Throughput</h2>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                Product Line Type
              </label>
              <input
                type="text"
                required
                value={form.productType}
                onChange={(e) => setForm({ ...form, productType: e.target.value })}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-900 text-sm min-h-[44px]"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                  Minimum Order Quantity (MOQ Units)
                </label>
                <input
                  type="number"
                  min={500}
                  step={500}
                  required
                  value={form.moqUnits}
                  onChange={(e) => setForm({ ...form, moqUnits: Number(e.target.value) })}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-900 text-sm min-h-[44px]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                  Monthly Production Capacity (Units)
                </label>
                <input
                  type="number"
                  min={1000}
                  step={10000}
                  required
                  value={form.capacityUnitsPerMonth}
                  onChange={(e) =>
                    setForm({ ...form, capacityUnitsPerMonth: Number(e.target.value) })
                  }
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-900 text-sm min-h-[44px]"
                />
              </div>
            </div>
          </div>

          {/* Section 3: Statutory Certification */}
          <div className="space-y-4 pt-4 border-t border-slate-100">
            <div className="pb-2 border-b border-slate-100 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <h2 className="text-sm font-bold text-slate-900">Food Safety & Compliance Accreditation</h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                  License Type
                </label>
                <select
                  value={form.certType}
                  onChange={(e) => setForm({ ...form, certType: e.target.value as any })}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-900 text-sm bg-white min-h-[44px]"
                >
                  <option value={CertificateType.FSSAI}>FSSAI Central / State License</option>
                  <option value={CertificateType.GST}>GST Registration Certificate</option>
                  <option value={CertificateType.UDYAM}>MSME Udyam Registration</option>
                  <option value={CertificateType.GMP}>GMP / Good Manufacturing Practice</option>
                  <option value={CertificateType.ISO}>ISO 22000 / HACCP</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                  License / Registration Number *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 10021022009841"
                  value={form.certNumber}
                  onChange={(e) => setForm({ ...form, certNumber: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-900 text-sm min-h-[44px]"
                />
              </div>
            </div>
          </div>

          <div className="pt-6 border-t border-slate-100 flex items-center justify-end">
            <button
              type="submit"
              disabled={submitting}
              className="w-full sm:w-auto px-7 py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-sm transition min-h-[44px] flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <span>{submitting ? 'Submitting Details...' : 'Submit Plant for Verification Audit'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </form>
      </div>
    </AppLayout>
  );
}
