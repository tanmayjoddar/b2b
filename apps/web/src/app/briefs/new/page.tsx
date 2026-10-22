'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, ArrowRight, Clock, ShieldCheck, Check } from 'lucide-react';
import { AppLayout } from '../../../components/layout/AppLayout';
import { Stepper, Step } from '../../../components/ui/Stepper';
import { api } from '../../../lib/api/client';
import { LAUNCH_VERTICAL, rupeesToPaise } from '@factorymatch/shared';

const WIZARD_STEPS: Step[] = [
  { id: 1, label: 'Product Details', sublabel: 'Formulation & Type' },
  { id: 2, label: 'Quantity & Budget', sublabel: 'Batch volume & target price' },
  { id: 3, label: 'Packaging & Timeline', sublabel: 'Packaging specs & weeks' },
  { id: 4, label: 'Review & Submit', sublabel: '48h match verification' },
];

export default function NewBriefPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    productName: '',
    productCategory: 'Protein Chips',
    quantityUnits: 10000,
    targetPriceRupees: 45,
    timelineWeeks: 4,
    packagingType: 'Nitrogen Flushed Foil Pouch',
    shelfLifeMonths: 9,
    certificationsRequired: ['FSSAI', 'GMP'],
    specialRequirements: '',
  });

  const handleNext = () => {
    if (currentStep === 0 && !formData.productName.trim()) {
      setError('Please provide the product brand name');
      return;
    }
    setError(null);
    setCurrentStep((prev) => Math.min(prev + 1, WIZARD_STEPS.length - 1));
  };

  const handlePrevious = () => {
    setError(null);
    setCurrentStep((prev) => Math.max(prev - 1, 0));
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    setError(null);

    try {
      const created = await api.createBrief({
        verticalId: LAUNCH_VERTICAL.id,
        productName: formData.productName,
        quantityUnits: Number(formData.quantityUnits),
        targetPricePaiseMin: rupeesToPaise(Number(formData.targetPriceRupees) * 0.9),
        targetPricePaiseMax: rupeesToPaise(Number(formData.targetPriceRupees)),
        timelineWeeks: Number(formData.timelineWeeks),
        requirementsJson: {
          category: formData.productCategory,
          packagingType: formData.packagingType,
          shelfLifeMonths: formData.shelfLifeMonths,
          certificationsRequired: formData.certificationsRequired,
          notes: formData.specialRequirements,
        },
      });

      await api.submitBrief(created.id);
      router.push(`/briefs/${created.id}/quotes`);
    } catch (err: any) {
      setError(err.message || 'Failed to submit manufacturing brief');
      setSubmitting(false);
    }
  };

  return (
    <AppLayout>
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 transition min-h-[44px]"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Dashboard
          </button>
          <span className="text-xs font-semibold text-slate-500 px-3 py-1 rounded-full bg-slate-100 border border-slate-200">
            Vertical: {LAUNCH_VERTICAL.name}
          </span>
        </div>

        {/* Responsive Grid matching Reference Image 2 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Stepper Column */}
          <div className="md:col-span-1">
            <Stepper
              steps={WIZARD_STEPS}
              currentStep={currentStep}
              orientation="vertical"
              timeRemainingSLA="48 Hours Guaranteed"
            />
          </div>

          {/* Form Step Body */}
          <div className="md:col-span-2 bg-white rounded-3xl p-6 md:p-8 border border-slate-200/80 shadow-card flex flex-col justify-between min-h-[460px]">
            <div>
              {error && (
                <div className="mb-6 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium">
                  {error}
                </div>
              )}

              {/* STEP 1: Product Specifications */}
              {currentStep === 0 && (
                <div className="space-y-5">
                  <div>
                    <h2 className="text-base md:text-lg font-extrabold text-slate-900">Step 1: Product Specifications</h2>
                    <p className="text-xs text-slate-500 mt-1">
                      Define the food formulation and brand parameters.
                    </p>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                        Product Brand & Name *
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Popped Quinoa Protein Chips (Himalayan Salt)"
                        value={formData.productName}
                        onChange={(e) => setFormData({ ...formData, productName: e.target.value })}
                        className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-900 text-sm min-h-[44px]"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                        Food Category
                      </label>
                      <select
                        value={formData.productCategory}
                        onChange={(e) => setFormData({ ...formData, productCategory: e.target.value })}
                        className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-900 text-sm bg-white min-h-[44px]"
                      >
                        <option>Protein Chips / Crisps</option>
                        <option>Granola & Energy Bars</option>
                        <option>Roasted Makhana & Seeds</option>
                        <option>Plant-Based Protein Bites</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 2: Batch Quantity & Budget */}
              {currentStep === 1 && (
                <div className="space-y-5">
                  <div>
                    <h2 className="text-base md:text-lg font-extrabold text-slate-900">Step 2: Batch Volume & Target Price</h2>
                    <p className="text-xs text-slate-500 mt-1">
                      Matched to plants with audited MOQ and monthly throughput.
                    </p>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                        Production Quantity (Units)
                      </label>
                      <input
                        type="number"
                        min={1000}
                        max={1000000}
                        step={1000}
                        value={formData.quantityUnits}
                        onChange={(e) => setFormData({ ...formData, quantityUnits: Number(e.target.value) })}
                        className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-900 text-sm min-h-[44px]"
                      />
                      <span className="text-[11px] text-slate-400 mt-1 block">Standard commercial run: 5,000–25,000 units</span>
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                        Target Cost Per Unit (INR)
                      </label>
                      <div className="relative">
                        <span className="absolute left-4 top-3.5 text-sm font-bold text-slate-400">Rs.</span>
                        <input
                          type="number"
                          min={5}
                          max={1000}
                          value={formData.targetPriceRupees}
                          onChange={(e) => setFormData({ ...formData, targetPriceRupees: Number(e.target.value) })}
                          className="w-full pl-12 pr-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-900 text-sm font-bold min-h-[44px]"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 3: Packaging & Timeline */}
              {currentStep === 2 && (
                <div className="space-y-5">
                  <div>
                    <h2 className="text-base md:text-lg font-extrabold text-slate-900">Step 3: Packaging & Compliance</h2>
                    <p className="text-xs text-slate-500 mt-1">
                      Packaging material and expected manufacturing lead times.
                    </p>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                        Packaging Format
                      </label>
                      <select
                        value={formData.packagingType}
                        onChange={(e) => setFormData({ ...formData, packagingType: e.target.value })}
                        className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-900 text-sm bg-white min-h-[44px]"
                      >
                        <option>Nitrogen Flushed Foil Pouch</option>
                        <option>Stand-up Zipper Doypack</option>
                        <option>Flow Wrap (Bars)</option>
                        <option>PET Jar / Tin Can</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                        Production Lead Time Target
                      </label>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                        {[2, 4, 6, 8].map((weeks) => (
                          <button
                            key={weeks}
                            type="button"
                            onClick={() => setFormData({ ...formData, timelineWeeks: weeks })}
                            className={`py-3 rounded-xl border text-xs font-bold transition min-h-[44px] ${
                              formData.timelineWeeks === weeks
                                ? 'bg-slate-900 text-white border-slate-900'
                                : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                            }`}
                          >
                            {weeks} Weeks
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 4: Review & Submit */}
              {currentStep === 3 && (
                <div className="space-y-5">
                  <div>
                    <h2 className="text-base md:text-lg font-extrabold text-slate-900">Step 4: Review Manufacturing Brief</h2>
                    <p className="text-xs text-slate-500 mt-1">
                      Review specifications before dispatching to sourcing audit.
                    </p>
                  </div>

                  <div className="bg-slate-50 rounded-2xl p-5 border border-slate-200 text-xs space-y-3">
                    <div className="flex justify-between py-1 border-b border-slate-200">
                      <span className="text-slate-500">Product Name:</span>
                      <span className="font-bold text-slate-900">{formData.productName}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-200">
                      <span className="text-slate-500">Batch Quantity:</span>
                      <span className="font-bold text-slate-900">{formData.quantityUnits.toLocaleString('en-IN')} units</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-200">
                      <span className="text-slate-500">Target Unit Cost:</span>
                      <span className="font-bold text-slate-900">Rs. {formData.targetPriceRupees} / unit</span>
                    </div>
                    <div className="flex justify-between py-1">
                      <span className="text-slate-500">Packaging Type:</span>
                      <span className="font-bold text-slate-900">{formData.packagingType}</span>
                    </div>
                  </div>

                  <div className="p-4 rounded-xl bg-accent-100 text-slate-900 border border-accent-300 text-xs flex items-center gap-3">
                    <Clock className="w-5 h-5 text-accent-700 shrink-0" />
                    <span>
                      <strong>48-Hour SLA:</strong> Our team verifies licenses and matches 3–5 candidate factories.
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="pt-8 border-t border-slate-100 flex items-center justify-between">
              {currentStep > 0 ? (
                <button
                  type="button"
                  onClick={handlePrevious}
                  className="px-5 py-2.5 rounded-xl border border-slate-300 text-slate-700 text-xs font-bold hover:bg-slate-50 transition min-h-[44px]"
                >
                  Previous
                </button>
              ) : (
                <div />
              )}

              {currentStep < WIZARD_STEPS.length - 1 ? (
                <button
                  type="button"
                  onClick={handleNext}
                  className="px-6 py-2.5 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 transition flex items-center gap-2 min-h-[44px]"
                >
                  <span>Continue</span> <ArrowRight className="w-3.5 h-3.5" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={submitting}
                  className="px-7 py-2.5 rounded-xl bg-accent-400 text-slate-950 text-xs font-extrabold hover:bg-accent-500 transition min-h-[44px] disabled:opacity-50"
                >
                  {submitting ? 'Submitting Brief...' : 'Submit Brief for Matching'}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
