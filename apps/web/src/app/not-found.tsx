import React from 'react';
import Link from 'next/link';
import { Layers, ArrowLeft } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#F6F8FA] flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-3xl p-8 border border-slate-200/80 shadow-card text-center space-y-6">
        <div className="w-14 h-14 rounded-2xl bg-slate-900 text-accent-400 flex items-center justify-center mx-auto shadow-sm">
          <Layers className="w-7 h-7 stroke-[2]" />
        </div>

        <div className="space-y-2">
          <span className="text-xs font-bold text-accent-600 uppercase tracking-widest">404 Error</span>
          <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">Page Not Found</h1>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            The requested resource does not exist or has been moved to an isolated portal.
          </p>
        </div>

        <div className="pt-2">
          <Link
            href="/login"
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-sm transition min-h-[44px]"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Return to Portal</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
