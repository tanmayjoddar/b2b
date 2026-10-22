import React from 'react';
import { ShieldCheck, Check } from 'lucide-react';

interface TrustBadgeCardProps {
  title: string;
  subtitle: string;
  tierLabel: string;
  checksPerformed: string[];
}

export function TrustBadgeCard({
  title,
  subtitle,
  tierLabel,
  checksPerformed,
}: TrustBadgeCardProps) {
  return (
    <div className="bg-white rounded-3xl p-8 border border-slate-100 shadow-card text-center max-w-md mx-auto">
      {/* Shield Icon with Floating Ring (matching Image 4) */}
      <div className="relative w-28 h-28 mx-auto mb-6 flex items-center justify-center">
        {/* Subtle glowing halo ring */}
        <div className="absolute inset-0 rounded-full border-4 border-accent-400/40 rotate-12 scale-110 animate-pulse" />
        <div className="relative z-10 w-20 h-20 rounded-2xl bg-gradient-to-br from-accent-300 to-accent-500 flex items-center justify-center text-slate-950 shadow-lg shadow-accent-500/20">
          <ShieldCheck className="w-10 h-10 stroke-[2.2]" />
        </div>
      </div>

      {/* Headline & Description */}
      <span className="inline-block px-3 py-1 rounded-full text-xs font-bold bg-accent-100 text-slate-950 mb-2">
        {tierLabel}
      </span>
      <h3 className="text-xl font-extrabold text-slate-900 tracking-tight">{title}</h3>
      <p className="text-sm text-slate-500 mt-2">{subtitle}</p>

      {/* Checklist */}
      <div className="mt-6 pt-6 border-t border-slate-100 text-left space-y-2.5">
        <div className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
          Verified Checklist
        </div>
        {checksPerformed.map((check, i) => (
          <div key={i} className="flex items-center gap-2.5 text-xs text-slate-700">
            <div className="w-4 h-4 rounded-full bg-accent-500 text-slate-950 flex items-center justify-center shrink-0">
              <Check className="w-2.5 h-2.5 stroke-[3]" />
            </div>
            <span>{check}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
