import React from 'react';
import { Check, X, ShieldCheck, Clock, Package } from 'lucide-react';
import { formatPaiseToINR } from '@factorymatch/shared';
import { StatusBadge } from './StatusBadge';

export interface QuoteComparisonItem {
  id: string;
  factoryName: string;
  factoryCity: string;
  factoryTier: string;
  pricePaisePerUnit: number;
  moqUnits: number;
  leadTimeDays: number;
  validUntil: string;
  status: string;
  certifications?: string[];
}

interface ComparisonTableProps {
  quotes: QuoteComparisonItem[];
  onAcceptQuote: (quoteId: string) => void;
  isSubmitting?: boolean;
}

export function ComparisonTable({
  quotes,
  onAcceptQuote,
  isSubmitting = false,
}: ComparisonTableProps) {
  if (quotes.length === 0) {
    return (
      <div className="bg-white rounded-3xl p-12 text-center border border-slate-100 shadow-card">
        <Clock className="w-12 h-12 text-slate-300 mx-auto mb-3 animate-pulse" />
        <h3 className="text-lg font-bold text-slate-900">Waiting for Factory Quotes</h3>
        <p className="text-sm text-slate-500 max-w-md mx-auto mt-1">
          Quote requests have been dispatched to shortlisted factories. Verified quotes will appear here side-by-side.
        </p>
      </div>
    );
  }

  const columnThemes = [
    { headerBg: 'bg-gradient-to-b from-sky-400 to-sky-500', pill: 'bg-sky-100 text-sky-800' },
    { headerBg: 'bg-gradient-to-b from-accent-400 to-accent-500', pill: 'bg-accent-100 text-slate-950 font-bold' },
    { headerBg: 'bg-gradient-to-b from-indigo-400 to-indigo-500', pill: 'bg-indigo-100 text-indigo-800' },
    { headerBg: 'bg-gradient-to-b from-amber-400 to-amber-500', pill: 'bg-amber-100 text-amber-800' },
  ];

  return (
    <div className="bg-white rounded-3xl p-8 border border-slate-100 shadow-card overflow-x-auto">
      <div className="min-w-[650px]">
        {/* Table Header with Factory Cards */}
        <div className="grid grid-cols-4 gap-4 pb-6 border-b border-slate-100">
          <div className="flex flex-col justify-end p-4">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Parameter
            </span>
            <span className="text-base font-extrabold text-slate-900 mt-1">
              Side-by-Side Comparison
            </span>
          </div>

          {quotes.map((quote, index) => {
            const theme = columnThemes[index % columnThemes.length]!;
            const isAccepted = quote.status === 'ACCEPTED';

            return (
              <div
                key={quote.id}
                className="relative rounded-2xl p-5 border border-slate-200 bg-slate-50/50 hover:border-slate-300 transition text-center space-y-2"
              >
                {/* Top Theme Accent Bar */}
                <div className={`h-1.5 w-12 rounded-full mx-auto ${theme.headerBg}`} />

                <div className="text-sm font-bold text-slate-900 truncate">
                  {quote.factoryName}
                </div>
                <div className="text-xs text-slate-500">{quote.factoryCity}</div>
                <div className="pt-1">
                  <StatusBadge status={quote.factoryTier} size="sm" />
                </div>

                <div className="pt-3">
                  <div className="text-2xl font-extrabold text-slate-900">
                    {formatPaiseToINR(quote.pricePaisePerUnit)}
                  </div>
                  <span className="text-xs text-slate-400">per unit</span>
                </div>

                <div className="pt-2">
                  {isAccepted ? (
                    <span className="inline-flex items-center gap-1 px-4 py-2 rounded-xl text-xs font-bold bg-emerald-100 text-emerald-800 w-full justify-center">
                      <Check className="w-3.5 h-3.5" /> Quote Accepted
                    </span>
                  ) : (
                    <button
                      onClick={() => onAcceptQuote(quote.id)}
                      disabled={isSubmitting}
                      className="w-full py-2.5 px-4 rounded-xl text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white shadow-sm transition disabled:opacity-50"
                    >
                      Accept Quote
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Rows Comparison */}
        <div className="divide-y divide-slate-100 text-sm">
          {/* MOQ Row */}
          <div className="grid grid-cols-4 gap-4 py-4 items-center">
            <div className="flex items-center gap-2 font-semibold text-slate-600">
              <Package className="w-4 h-4 text-slate-400" />
              Minimum Order Qty (MOQ)
            </div>
            {quotes.map((q) => (
              <div key={q.id} className="text-center font-bold text-slate-900">
                {q.moqUnits.toLocaleString('en-IN')} units
              </div>
            ))}
          </div>

          {/* Lead Time Row */}
          <div className="grid grid-cols-4 gap-4 py-4 items-center bg-slate-50/30">
            <div className="flex items-center gap-2 font-semibold text-slate-600">
              <Clock className="w-4 h-4 text-slate-400" />
              Production Lead Time
            </div>
            {quotes.map((q) => (
              <div key={q.id} className="text-center font-bold text-slate-900">
                {q.leadTimeDays} days
              </div>
            ))}
          </div>

          {/* Verification Level */}
          <div className="grid grid-cols-4 gap-4 py-4 items-center">
            <div className="flex items-center gap-2 font-semibold text-slate-600">
              <ShieldCheck className="w-4 h-4 text-slate-400" />
              Audited Verification
            </div>
            {quotes.map((q) => (
              <div key={q.id} className="text-center">
                <StatusBadge status={q.factoryTier} size="sm" />
              </div>
            ))}
          </div>

          {/* Quote Validity */}
          <div className="grid grid-cols-4 gap-4 py-4 items-center bg-slate-50/30">
            <div className="font-semibold text-slate-600">Quote Validity</div>
            {quotes.map((q) => (
              <div key={q.id} className="text-center text-xs text-slate-500 font-medium">
                Valid till {new Date(q.validUntil).toLocaleDateString('en-IN')}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
