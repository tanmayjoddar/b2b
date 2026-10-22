'use client';

import React, { useState, useEffect } from 'react';
import {
  FileSpreadsheet,
  Send,
  Clock,
  CheckCircle2,
  Building2,
  Calendar,
  Package,
  ShieldAlert,
  ArrowRight,
} from 'lucide-react';
import { AppLayout } from '../../../components/layout/AppLayout';
import { api } from '../../../lib/api/client';
import { rupeesToPaise, Role } from '@factorymatch/shared';

export default function FactoryQuotesPage() {
  const [requests, setRequests] = useState<any[]>([]);
  const [selectedRequest, setSelectedRequest] = useState<any | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [notification, setNotification] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);

  // Quote input form
  const [quoteForm, setQuoteForm] = useState({
    priceRupeesPerUnit: 42,
    moqUnits: 5000,
    leadTimeDays: 21,
    validDays: 14,
  });

  const loadRequests = async () => {
    setLoading(true);
    try {
      const data = await api.getMyQuoteRequests();
      setRequests(data || []);
    } catch {
      setRequests([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const storedUser = typeof window !== 'undefined' ? localStorage.getItem('fm_user') : null;
    if (storedUser) {
      try {
        const u = JSON.parse(storedUser);
        setCurrentUser(u);
      } catch {}
    }
    loadRequests();
  }, []);

  const handleSubmitQuote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRequest) return;

    setSubmitting(true);
    setNotification(null);

    try {
      const validUntil = new Date(
        Date.now() + Number(quoteForm.validDays) * 24 * 3600 * 1000,
      ).toISOString();

      await api.submitQuote({
        quoteRequestId: selectedRequest.id,
        pricePaisePerUnit: rupeesToPaise(Number(quoteForm.priceRupeesPerUnit)),
        moqUnits: Number(quoteForm.moqUnits),
        leadTimeDays: Number(quoteForm.leadTimeDays),
        validUntil,
        termsJson: {
          paymentTerms: '50% Advance, 50% Before Dispatch',
          sampleAvailability: 'Available within 5 working days',
        },
      });

      setNotification('Commercial quote submitted successfully. Brand notified.');
      setSelectedRequest(null);
      await loadRequests();
    } catch (err: any) {
      setNotification(err.message || 'Failed to submit quote');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AppLayout>
      <div className="space-y-6 max-w-4xl mx-auto">
        {/* Header */}
        <div>
          <h1 className="text-xl md:text-2xl font-extrabold tracking-tight text-slate-900">
            Factory Portal: Incoming Quotation Requests
          </h1>
          <p className="text-xs md:text-sm text-slate-500 mt-1">
            Submit transparent quotes for verified Indian D2C brand production briefs.
          </p>
        </div>



        {notification && (
          <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{notification}</span>
          </div>
        )}

        {/* Requests List */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-card space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Active RFQs ({requests.length})
            </span>
          </div>

          {loading ? (
            <div className="py-12 text-center text-xs text-slate-400 font-semibold">
              Loading factory RFQs...
            </div>
          ) : requests.length === 0 ? (
            <div className="py-12 text-center space-y-3">
              <Building2 className="w-10 h-10 text-slate-300 mx-auto" />
              <h4 className="text-sm font-bold text-slate-800">No pending quotation requests</h4>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                When D2C brands submit briefs matching your verified plant line, RFQ assignments will appear here for bidding.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {requests.map((req) => {
                const brief = req.brief || {};
                const productName = brief.productName || 'Contract Production Batch';
                const quantityUnits = brief.quantityUnits || 0;
                const packaging = brief.requirementsJson?.packagingType || 'Standard Flow Wrap';
                const hasSubmitted = req.quotes && req.quotes.length > 0;

                return (
                  <div
                    key={req.id}
                    className="py-4 flex flex-col md:flex-row md:items-center justify-between gap-4"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-700 bg-slate-100 px-2.5 py-0.5 rounded-full border border-slate-200">
                          {req.status}
                        </span>
                        {hasSubmitted && (
                          <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                            Quote Submitted ({req.quotes[0].status})
                          </span>
                        )}
                      </div>
                      <h3 className="text-base font-bold text-slate-900">{productName}</h3>
                      <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
                        <span>Batch: {quantityUnits.toLocaleString('en-IN')} units</span>
                        <span>•</span>
                        <span>Packaging: {packaging}</span>
                        <span>•</span>
                        <span className="flex items-center gap-1 text-slate-400">
                          <Clock className="w-3.5 h-3.5" />
                          Target: {brief.timelineWeeks || 4} Weeks
                        </span>
                      </div>
                    </div>

                    <div>
                      <button
                        onClick={() =>
                          setSelectedRequest({
                            ...req,
                            productName,
                            quantityUnits,
                          })
                        }
                        className="w-full md:w-auto px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-sm transition flex items-center justify-center gap-2 min-h-[44px]"
                      >
                        <Send className="w-3.5 h-3.5 text-lime-400" />
                        <span>{hasSubmitted ? 'Revise Quote' : 'Submit Commercial Quote'}</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Modal: Quote Submission */}
        {selectedRequest && (
          <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl p-6 md:p-8 max-w-lg w-full border border-slate-200 shadow-2xl relative space-y-5">
              <button
                onClick={() => setSelectedRequest(null)}
                className="absolute top-4 right-4 text-slate-400 hover:text-slate-900 font-bold text-sm min-h-[44px] min-w-[44px] flex items-center justify-center"
              >
                ✕
              </button>

              <div>
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Quotation Submission
                </span>
                <h3 className="text-lg font-extrabold text-slate-900 mt-1">
                  {selectedRequest.productName}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Requested volume: {selectedRequest.quantityUnits?.toLocaleString('en-IN')} units
                </p>
              </div>

              <form onSubmit={handleSubmitQuote} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                    Offered Price Per Unit (INR) *
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={1000}
                    step={0.5}
                    required
                    value={quoteForm.priceRupeesPerUnit}
                    onChange={(e) =>
                      setQuoteForm({ ...quoteForm, priceRupeesPerUnit: Number(e.target.value) })
                    }
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-900 text-sm font-bold min-h-[44px]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                      Minimum Order (MOQ)
                    </label>
                    <input
                      type="number"
                      min={100}
                      step={500}
                      value={quoteForm.moqUnits}
                      onChange={(e) =>
                        setQuoteForm({ ...quoteForm, moqUnits: Number(e.target.value) })
                      }
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-900 text-sm min-h-[44px]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                      Lead Time (Days)
                    </label>
                    <input
                      type="number"
                      min={7}
                      max={90}
                      value={quoteForm.leadTimeDays}
                      onChange={(e) =>
                        setQuoteForm({ ...quoteForm, leadTimeDays: Number(e.target.value) })
                      }
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-900 text-sm min-h-[44px]"
                    />
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setSelectedRequest(null)}
                    className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 text-xs font-bold min-h-[44px]"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-6 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition min-h-[44px] disabled:opacity-50"
                  >
                    {submitting ? 'Submitting...' : 'Dispatch Quote to Brand'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
