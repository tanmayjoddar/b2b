import { ShieldCheck, Clock, Award, Sparkles, CheckCircle2 } from 'lucide-react';
import { LAUNCH_VERTICAL, VerificationTier } from '@factorymatch/shared';

export default function HomePage() {
  return (
    <main className="flex-1 max-w-5xl mx-auto px-4 py-12 md:py-20">
      {/* Hero Badge */}
      <div className="flex justify-center mb-6">
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-sky-100 text-sky-800 border border-sky-200">
          <Sparkles className="w-3.5 h-3.5" />
          Active Vertical: {LAUNCH_VERTICAL.name}
        </span>
      </div>

      {/* Main Headline */}
      <div className="text-center space-y-4">
        <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight text-slate-900">
          Verified Manufacturing for Indian D2C Brands
        </h1>
        <p className="text-lg md:text-xl text-slate-600 max-w-2xl mx-auto">
          One structured brief. Within 48 hours, receive 3–5 verified factories with audited MOQ,
          statutory certifications, lead times, and upfront quotes.
        </p>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row justify-center items-center gap-4 pt-6">
          <a
            href="/briefs/new"
            className="w-full sm:w-auto px-6 py-3.5 rounded-lg bg-sky-600 hover:bg-sky-700 text-white font-medium text-center shadow-sm transition"
          >
            Submit a Manufacturing Brief
          </a>
          <a
            href="/factories/onboard"
            className="w-full sm:w-auto px-6 py-3.5 rounded-lg bg-white border border-slate-300 hover:bg-slate-50 text-slate-800 font-medium text-center transition"
          >
            List Your Factory
          </a>
        </div>
      </div>

      {/* Trust & Tier Pillars */}
      <section className="mt-20">
        <div className="text-center mb-10">
          <h2 className="text-2xl md:text-3xl font-bold text-slate-900">
            Honest, Multi-Tier Verification
          </h2>
          <p className="text-slate-600 text-sm md:text-base mt-2">
            We never show a badge stronger than the check actually performed.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="p-6 bg-white rounded-xl border border-slate-200 shadow-sm space-y-3">
            <div className="w-10 h-10 rounded-lg bg-sky-50 text-sky-600 flex items-center justify-center font-bold">
              T1
            </div>
            <h3 className="font-semibold text-slate-900">Documents Verified</h3>
            <p className="text-xs text-slate-600">
              FSSAI (FoSCoS), GST portal, Udyam, ISO/GMP verification against official government registries.
            </p>
          </div>

          <div className="p-6 bg-white rounded-xl border border-slate-200 shadow-sm space-y-3">
            <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
              T2
            </div>
            <h3 className="font-semibold text-slate-900">Video Verified</h3>
            <p className="text-xs text-slate-600">
              Live facility walkthrough of production floor, hygiene controls, raw storage, and machinery.
            </p>
          </div>

          <div className="p-6 bg-white rounded-xl border border-slate-200 shadow-sm space-y-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
              T3
            </div>
            <h3 className="font-semibold text-slate-900">Order Proven</h3>
            <p className="text-xs text-slate-600">
              Proven on-platform order execution history and authentic reviews from verified brand founders.
            </p>
          </div>

          <div className="p-6 bg-white rounded-xl border border-slate-200 shadow-sm space-y-3">
            <div className="w-10 h-10 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
              T4
            </div>
            <h3 className="font-semibold text-slate-900">Inspected</h3>
            <p className="text-xs text-slate-600">
              Independent physical inspection reports and batch QC testing conducted by accredited agencies.
            </p>
          </div>
        </div>
      </section>

      {/* Value Pillars */}
      <section className="mt-20 border-t border-slate-200 pt-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="flex gap-4">
            <Clock className="w-6 h-6 text-sky-600 shrink-0 mt-1" />
            <div>
              <h4 className="font-semibold text-slate-900">Brief-to-Quote Speed</h4>
              <p className="text-sm text-slate-600 mt-1">
                One structured brief replaces 17 unorganized WhatsApp chats with standardized comparisons.
              </p>
            </div>
          </div>

          <div className="flex gap-4">
            <ShieldCheck className="w-6 h-6 text-sky-600 shrink-0 mt-1" />
            <div>
              <h4 className="font-semibold text-slate-900">Deal & Sample Protection</h4>
              <p className="text-sm text-slate-600 mt-1">
                Track prototype samples, milestone-based escrow payments, and batch inspection before dispatch.
              </p>
            </div>
          </div>

          <div className="flex gap-4">
            <Award className="w-6 h-6 text-sky-600 shrink-0 mt-1" />
            <div>
              <h4 className="font-semibold text-slate-900">Vertical Expertise</h4>
              <p className="text-sm text-slate-600 mt-1">
                Deep formulation, packaging, and regulatory understanding tailored for Indian consumer brands.
              </p>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
