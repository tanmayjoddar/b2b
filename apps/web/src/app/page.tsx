import Link from 'next/link';
import { ShieldCheck, Clock, Award, Layers, ArrowRight, CheckCircle2, Factory, FileText, CheckCheck } from 'lucide-react';
import { LAUNCH_VERTICAL } from '@factorymatch/shared';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      {/* Top Bar Navigation */}
      <header className="border-b border-slate-200 bg-white/80 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-slate-950 flex items-center justify-center text-lime-400 font-extrabold text-lg shadow-sm">
              F
            </div>
            <div>
              <span className="font-bold text-slate-950 tracking-tight text-lg">FactoryMatch</span>
              <span className="hidden sm:inline-block ml-2 text-[10px] font-bold tracking-wider px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200 uppercase">
                Enterprise B2B
              </span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="px-4 py-2 text-xs font-semibold text-slate-700 hover:text-slate-950 rounded-xl hover:bg-slate-100 transition min-h-[44px] flex items-center"
            >
              Portal Login
            </Link>
            <Link
              href="/briefs/new"
              className="px-4 py-2 text-xs font-bold bg-lime-500 hover:bg-lime-400 text-slate-950 rounded-xl transition shadow-sm min-h-[44px] flex items-center gap-1.5"
            >
              <span>Submit Brief</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-20">
        <div className="text-center space-y-5 max-w-3xl mx-auto">
          {/* Active Vertical Pill */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-bold bg-white text-slate-700 border border-slate-200 shadow-sm">
            <Layers className="w-3.5 h-3.5 text-lime-600" />
            <span>Active Vertical: {LAUNCH_VERTICAL.name}</span>
          </div>

          <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight text-slate-950 leading-[1.15]">
            Verified contract manufacturing for Indian D2C brands.
          </h1>

          <p className="text-base sm:text-lg text-slate-600 leading-relaxed max-w-2xl mx-auto font-normal">
            Submit one structured specification. Receive 3 to 5 verified factory quotes within 48 hours, with audited plant capacity, statutory certifications, and milestone escrow.
          </p>

          {/* Action CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4">
            <Link
              href="/briefs/new"
              className="w-full sm:w-auto px-6 py-3.5 rounded-2xl bg-slate-950 hover:bg-slate-800 text-white font-bold text-sm text-center shadow-md transition flex items-center justify-center gap-2 min-h-[48px]"
            >
              <span>Submit Manufacturing Brief</span>
              <ArrowRight className="w-4 h-4 text-lime-400" />
            </Link>
            <Link
              href="/factory/onboard"
              className="w-full sm:w-auto px-6 py-3.5 rounded-2xl bg-white border border-slate-300 hover:bg-slate-100 text-slate-800 font-bold text-sm text-center transition flex items-center justify-center gap-2 min-h-[48px]"
            >
              <Factory className="w-4 h-4 text-slate-600" />
              <span>List Your Plant</span>
            </Link>
          </div>

          <div className="pt-2 flex flex-wrap items-center justify-center gap-6 text-xs text-slate-500 font-medium">
            <div className="flex items-center gap-1.5">
              <CheckCheck className="w-4 h-4 text-lime-600" />
              <span>Strict 48h SLA</span>
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCheck className="w-4 h-4 text-lime-600" />
              <span>Zero Brokerage</span>
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCheck className="w-4 h-4 text-lime-600" />
              <span>Milestone Escrow Protection</span>
            </div>
          </div>
        </div>

        {/* Portals Showcase Cards */}
        <section className="mt-16 sm:mt-20 grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Brand Card */}
          <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200/80 shadow-sm hover:shadow-md transition">
            <div className="w-12 h-12 rounded-2xl bg-lime-100 text-lime-700 flex items-center justify-center mb-5">
              <FileText className="w-6 h-6" />
            </div>
            <h2 className="text-lg font-bold text-slate-950 mb-2">For D2C Brand Founders</h2>
            <p className="text-xs text-slate-600 leading-relaxed mb-6">
              Replace fragmented chat threads with standardized briefs, side-by-side quote matrices, sample approval tracking, and Razorpay milestone payments.
            </p>
            <div className="space-y-2 pt-2 border-t border-slate-100">
              <Link
                href="/briefs/new"
                className="flex items-center justify-between text-xs font-bold text-slate-900 hover:text-lime-600 py-1.5"
              >
                <span>Create Production Brief</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
              <Link
                href="/dashboard"
                className="flex items-center justify-between text-xs font-bold text-slate-900 hover:text-lime-600 py-1.5"
              >
                <span>Brand Operations Dashboard</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>

          {/* Factory Card */}
          <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200/80 shadow-sm hover:shadow-md transition">
            <div className="w-12 h-12 rounded-2xl bg-slate-950 text-lime-400 flex items-center justify-center mb-5">
              <Factory className="w-6 h-6" />
            </div>
            <h2 className="text-lg font-bold text-slate-950 mb-2">For Verified Manufacturers</h2>
            <p className="text-xs text-slate-600 leading-relaxed mb-6">
              Receive qualified, structured RFQs tailored to your specific plant lines. Submit standardized bids, ship prototype samples, and secure guaranteed advance payments.
            </p>
            <div className="space-y-2 pt-2 border-t border-slate-100">
              <Link
                href="/factory/quotes"
                className="flex items-center justify-between text-xs font-bold text-slate-900 hover:text-lime-600 py-1.5"
              >
                <span>Incoming RFQ Bids</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
              <Link
                href="/factory/onboard"
                className="flex items-center justify-between text-xs font-bold text-slate-900 hover:text-lime-600 py-1.5"
              >
                <span>Complete Plant Onboarding</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>

          {/* Admin Audit Card */}
          <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200/80 shadow-sm hover:shadow-md transition">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-800 flex items-center justify-center mb-5">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <h2 className="text-lg font-bold text-slate-950 mb-2">Accreditation & Matchmaking</h2>
            <p className="text-xs text-slate-600 leading-relaxed mb-6">
              Internal operator console for auditing statutory certifications (FSSAI, GST, ISO), assigning verified tiers, and curating 3–5 plant shortlists.
            </p>
            <div className="space-y-2 pt-2 border-t border-slate-100">
              <Link
                href="/admin/verification"
                className="flex items-center justify-between text-xs font-bold text-slate-900 hover:text-lime-600 py-1.5"
              >
                <span>Factory Verification Desk</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
              <Link
                href="/admin/matching"
                className="flex items-center justify-between text-xs font-bold text-slate-900 hover:text-lime-600 py-1.5"
              >
                <span>Admin Shortlist Tool</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </section>

        {/* Multi-Tier Verification Standard */}
        <section className="mt-20 sm:mt-24">
          <div className="text-center mb-10 max-w-2xl mx-auto">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-950 tracking-tight">
              Rigorous, Multi-Tier Verification
            </h2>
            <p className="text-slate-600 text-xs sm:text-sm mt-2">
              Every facility tier is strictly verified against statutory records, live video walkthroughs, and physical audits.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            <div className="p-6 bg-white rounded-3xl border border-slate-200 shadow-sm space-y-3">
              <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-900 flex items-center justify-center font-extrabold text-sm border border-slate-200">
                T1
              </div>
              <h3 className="font-bold text-sm text-slate-950">Documents Verified</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                FSSAI FoSCoS license, GST portal registration, Udyam MSME, and ISO/GMP compliance certificates verified with authorities.
              </p>
            </div>

            <div className="p-6 bg-white rounded-3xl border border-slate-200 shadow-sm space-y-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center font-extrabold text-sm border border-blue-200">
                T2
              </div>
              <h3 className="font-bold text-sm text-slate-950">Video Walkthrough</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Live inspection of processing units, cleanroom packaging zones, pest control measures, and temperature-controlled storage.
              </p>
            </div>

            <div className="p-6 bg-white rounded-3xl border border-slate-200 shadow-sm space-y-3">
              <div className="w-10 h-10 rounded-xl bg-lime-100 text-lime-800 flex items-center justify-center font-extrabold text-sm border border-lime-300">
                T3
              </div>
              <h3 className="font-bold text-sm text-slate-950">Production Proven</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Demonstrated track record of completed contract production batches on the platform with verified brand founder reviews.
              </p>
            </div>

            <div className="p-6 bg-white rounded-3xl border border-slate-200 shadow-sm space-y-3">
              <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center font-extrabold text-sm border border-purple-200">
                T4
              </div>
              <h3 className="font-bold text-sm text-slate-950">Inspected & Audited</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                On-site physical audit by accredited third-party inspectors, microbiological testing, and AQL standard quality certifications.
              </p>
            </div>
          </div>
        </section>

        {/* Operational Pillars */}
        <section className="mt-20 border-t border-slate-200/80 pt-12">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="flex gap-4">
              <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center shrink-0">
                <Clock className="w-5 h-5 text-slate-800" />
              </div>
              <div>
                <h4 className="font-bold text-sm text-slate-950">Guaranteed 48h SLA</h4>
                <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                  One structured brief replaces 17 unorganized WhatsApp chats with standardized comparisons.
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center shrink-0">
                <ShieldCheck className="w-5 h-5 text-slate-800" />
              </div>
              <div>
                <h4 className="font-bold text-sm text-slate-950">Escrow Milestone Protection</h4>
                <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                  Advance payments remain in secure escrow until prototype sample approval and production QA signoff.
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center shrink-0">
                <Award className="w-5 h-5 text-slate-800" />
              </div>
              <div>
                <h4 className="font-bold text-sm text-slate-950">Category Specialization</h4>
                <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                  Deep formulation, packaging, and regulatory understanding tailored for Indian consumer brands.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-8 text-center text-xs text-slate-500">
        <div className="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="font-semibold text-slate-700">FactoryMatch Enterprise B2B Platform</div>
          <div>Strict verification. Zero unvetted brokers. 100% Indian regulatory compliance.</div>
        </div>
      </footer>
    </div>
  );
}

