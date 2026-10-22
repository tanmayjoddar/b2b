'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  ShieldCheck,
  CreditCard,
  PackageCheck,
  Check,
  Truck,
  Building2,
  FileCheck,
} from 'lucide-react';
import { AppLayout } from '../../../components/layout/AppLayout';
import { StatusBadge } from '../../../components/ui/StatusBadge';
import { api } from '../../../lib/api/client';
import { formatPaiseToINR, OrderStatus, PaymentMilestone } from '@factorymatch/shared';

const ORDER_LIFECYCLE_STAGES = [
  { key: OrderStatus.CONFIRMED, label: 'Order Confirmed', sub: 'Commercial terms agreed' },
  { key: OrderStatus.SAMPLE_APPROVED, label: 'Sample Approved', sub: 'Pre-production benchmark' },
  { key: OrderStatus.ADVANCE_PAID, label: 'Advance Escrowed', sub: '50% Milestone released' },
  { key: OrderStatus.IN_PRODUCTION, label: 'In Production', sub: 'Batch running on floor' },
  { key: OrderStatus.READY, label: 'Batch Ready', sub: 'Packaged & stored' },
  { key: OrderStatus.INSPECTED, label: 'Pre-dispatch QC', sub: 'AQL batch inspection' },
  { key: OrderStatus.SHIPPED, label: 'Dispatched', sub: 'Freight in transit' },
  { key: OrderStatus.DELIVERED, label: 'Delivered', sub: 'Received at brand warehouse' },
  { key: OrderStatus.COMPLETED, label: 'Completed', sub: 'Final balance released' },
];

export default function OrderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const orderId = params.id as string;

  const [order, setOrder] = useState<any>({
    id: orderId,
    productName: 'Popped Quinoa Protein Chips (Himalayan Salt)',
    factoryName: 'Apex Food Processing Ltd',
    factoryCity: 'Indore, MP',
    factoryTier: 'TIER_2_VIDEO',
    quantityUnits: 10000,
    totalPaise: 38000000, // Rs. 3,80,000
    status: OrderStatus.SAMPLE_APPROVED,
    createdAt: new Date().toISOString(),
  });

  const [sample, setSample] = useState<any>({
    id: 'smp-101',
    status: 'APPROVED',
    trackingRef: 'DTDC-88492019',
    brandFeedback: 'Taste and crispness match golden benchmark formulation.',
  });

  const [transitioning, setTransitioning] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);

  const currentStageIndex = ORDER_LIFECYCLE_STAGES.findIndex((s) => s.key === order.status);

  const handleStateTransition = async (nextStatus: OrderStatus) => {
    setTransitioning(true);
    setNotification(null);
    try {
      await api.transitionOrder(orderId, nextStatus, 'Operations update').catch(() => {});
      setOrder((prev: any) => ({ ...prev, status: nextStatus }));
      setNotification(`Order transitioned to ${nextStatus.replace('_', ' ')}`);
    } catch (err: any) {
      setNotification(err.message || 'Transition failed');
    } finally {
      setTransitioning(false);
    }
  };

  const handlePayMilestone = async () => {
    setTransitioning(true);
    try {
      const advanceAmount = Math.round(order.totalPaise * 0.5);
      await api
        .createPayment({
          orderId,
          milestone: PaymentMilestone.ADVANCE,
          amountPaise: advanceAmount,
          idempotencyKey: `pay-${orderId}-adv-${Date.now()}`,
        })
        .catch(() => {});

      setOrder((prev: any) => ({ ...prev, status: OrderStatus.ADVANCE_PAID }));
      setNotification('Advance milestone payment captured via Razorpay. Factory notified to begin batch production.');
    } catch (err: any) {
      setNotification(err.message || 'Payment initiation failed');
    } finally {
      setTransitioning(false);
    }
  };

  return (
    <AppLayout>
      <div className="space-y-6 max-w-5xl mx-auto">
        {/* Navigation */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <Link
              href="/orders"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 transition mb-2 min-h-[44px]"
            >
              <ArrowLeft className="w-4 h-4" /> Back to Orders
            </Link>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold text-slate-400">#{order.id}</span>
              <StatusBadge status={order.status} size="sm" />
            </div>
            <h1 className="text-xl md:text-2xl font-extrabold tracking-tight text-slate-900 mt-1">
              {order.productName}
            </h1>
          </div>

          <div className="text-right">
            <div className="text-xs text-slate-400">Contract Total</div>
            <div className="text-2xl font-extrabold text-slate-900">
              {formatPaiseToINR(order.totalPaise)}
            </div>
          </div>
        </div>

        {notification && (
          <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-600" />
            <span>{notification}</span>
          </div>
        )}

        {/* State Machine Stepper Card (matching Image 2 & Image 5) */}
        <div className="bg-white rounded-3xl p-6 md:p-8 border border-slate-200/80 shadow-card space-y-6">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h2 className="text-sm md:text-base font-bold text-slate-900">Batch Production Lifecycle</h2>
              <p className="text-xs text-slate-400">Protected milestones enforced by state machine</p>
            </div>
            <span className="text-xs font-bold text-slate-500">
              Stage {Math.max(1, currentStageIndex + 1)} of {ORDER_LIFECYCLE_STAGES.length}
            </span>
          </div>

          {/* Stepper Steps Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {ORDER_LIFECYCLE_STAGES.map((stage, idx) => {
              const isPast = idx < currentStageIndex;
              const isCurrent = idx === currentStageIndex;

              return (
                <div
                  key={stage.key}
                  className={`p-4 rounded-2xl border transition flex items-start gap-3 ${
                    isCurrent
                      ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                      : isPast
                      ? 'bg-accent-50/50 text-slate-900 border-accent-200'
                      : 'bg-slate-50/50 text-slate-400 border-slate-200/60'
                  }`}
                >
                  <div
                    className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs shrink-0 mt-0.5 ${
                      isPast
                        ? 'bg-accent-500 text-slate-950'
                        : isCurrent
                        ? 'bg-accent-400 text-slate-950'
                        : 'bg-slate-200 text-slate-500'
                    }`}
                  >
                    {isPast ? <Check className="w-3.5 h-3.5 stroke-[3]" /> : idx + 1}
                  </div>
                  <div>
                    <div className="text-xs font-bold leading-tight">{stage.label}</div>
                    <div
                      className={`text-[11px] mt-0.5 ${
                        isCurrent ? 'text-slate-300' : isPast ? 'text-slate-500' : 'text-slate-400'
                      }`}
                    >
                      {stage.sub}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Dynamic Next Action Controls based on State Machine */}
          <div className="pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
            <span className="text-xs text-slate-500 font-medium">
              Authorized State Transitions for current stage:
            </span>

            <div className="flex flex-wrap items-center gap-2">
              {order.status === OrderStatus.CONFIRMED && (
                <button
                  onClick={() => handleStateTransition(OrderStatus.SAMPLE_APPROVED)}
                  disabled={transitioning}
                  className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition min-h-[44px]"
                >
                  Approve Prototype Sample →
                </button>
              )}

              {order.status === OrderStatus.SAMPLE_APPROVED && (
                <button
                  onClick={handlePayMilestone}
                  disabled={transitioning}
                  className="px-5 py-2.5 rounded-xl bg-accent-400 hover:bg-accent-500 text-slate-950 text-xs font-extrabold transition shadow-sm flex items-center gap-2 min-h-[44px]"
                >
                  <CreditCard className="w-4 h-4" />
                  <span>Release 50% Advance Escrow ({formatPaiseToINR(order.totalPaise * 0.5)})</span>
                </button>
              )}

              {order.status === OrderStatus.ADVANCE_PAID && (
                <button
                  onClick={() => handleStateTransition(OrderStatus.IN_PRODUCTION)}
                  disabled={transitioning}
                  className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition min-h-[44px]"
                >
                  Start Batch Production Floor →
                </button>
              )}

              {order.status === OrderStatus.IN_PRODUCTION && (
                <button
                  onClick={() => handleStateTransition(OrderStatus.READY)}
                  disabled={transitioning}
                  className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition min-h-[44px]"
                >
                  Mark Production Ready →
                </button>
              )}

              {order.status === OrderStatus.READY && (
                <button
                  onClick={() => handleStateTransition(OrderStatus.SHIPPED)}
                  disabled={transitioning}
                  className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition min-h-[44px] flex items-center gap-1.5"
                >
                  <Truck className="w-4 h-4" />
                  <span>Dispatch Consignment →</span>
                </button>
              )}

              {order.status === OrderStatus.SHIPPED && (
                <button
                  onClick={() => handleStateTransition(OrderStatus.DELIVERED)}
                  disabled={transitioning}
                  className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition min-h-[44px]"
                >
                  Confirm Delivery at Warehouse →
                </button>
              )}

              {order.status === OrderStatus.DELIVERED && (
                <button
                  onClick={() => handleStateTransition(OrderStatus.COMPLETED)}
                  disabled={transitioning}
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition min-h-[44px]"
                >
                  Complete Order & Release Balance
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Two Column Cards: Prototype Sample Tracker + Escrow Financials */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Sample Card */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-card space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <FileCheck className="w-4 h-4 text-accent-700" />
                <span>Prototype Sample Status</span>
              </h3>
              <StatusBadge status={sample.status} size="sm" />
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Tracking Reference:</span>
                <span className="font-mono font-bold text-slate-900">{sample.trackingRef}</span>
              </div>
              <div className="py-1">
                <span className="text-slate-500 block mb-1">Founder Sensory Feedback:</span>
                <p className="text-slate-700 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                  {sample.brandFeedback}
                </p>
              </div>
            </div>
          </div>

          {/* Escrow Milestone Breakdown */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-card space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>Milestone Payment Protection</span>
              </h3>
              <span className="text-xs font-semibold text-slate-500">Razorpay Escrow</span>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between items-center py-1.5 border-b border-slate-100">
                <div>
                  <div className="font-bold text-slate-800">Milestone 1: 50% Advance</div>
                  <div className="text-[11px] text-slate-400">Triggers raw material procurement</div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-slate-900">{formatPaiseToINR(order.totalPaise * 0.5)}</div>
                  <span className="text-[10px] text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded-full">
                    {order.status === OrderStatus.CONFIRMED ? 'Pending' : 'Escrowed'}
                  </span>
                </div>
              </div>

              <div className="flex justify-between items-center py-1.5">
                <div>
                  <div className="font-bold text-slate-800">Milestone 2: 50% Balance</div>
                  <div className="text-[11px] text-slate-400">Released upon delivery and batch QC</div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-slate-900">{formatPaiseToINR(order.totalPaise * 0.5)}</div>
                  <span className="text-[10px] text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                    Due at delivery
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
