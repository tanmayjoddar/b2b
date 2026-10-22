'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { PackageCheck, ArrowRight, ShieldCheck, Clock, CheckCircle2, Factory } from 'lucide-react';
import { AppLayout } from '../../components/layout/AppLayout';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { api } from '../../lib/api/client';
import { formatPaiseToINR, OrderStatus } from '@factorymatch/shared';

export default function OrdersPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchOrders() {
      try {
        const data = await api.listOrders();
        setOrders(data || []);
      } catch (err) {
        setOrders([]);
      } finally {
        setLoading(false);
      }
    }
    fetchOrders();
  }, []);

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl md:text-2xl font-extrabold tracking-tight text-slate-900">
              Production Orders & Batch Tracking
            </h1>
            <p className="text-xs md:text-sm text-slate-500 mt-1">
              Monitor milestone state transitions, prototype samples, and quality inspections.
            </p>
          </div>
        </div>

        {/* Orders List */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-card space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Active Batch Orders ({orders.length})
            </span>
          </div>

          {loading ? (
            <div className="py-12 text-center text-xs text-slate-400 font-semibold">
              Loading orders...
            </div>
          ) : orders.length === 0 ? (
            <div className="py-12 text-center space-y-3">
              <PackageCheck className="w-10 h-10 text-slate-300 mx-auto" />
              <h4 className="text-sm font-bold text-slate-800">No active production orders yet</h4>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Once you accept a quotation from a verified factory, production batch orders and escrow milestones will be managed here.
              </p>
              <Link
                href="/briefs"
                className="inline-block px-4 py-2.5 rounded-xl bg-slate-900 text-white font-bold text-xs hover:bg-slate-800 transition min-h-[44px]"
              >
                Review Active Briefs
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {orders.map((order) => {
                const productName =
                  order.productName ||
                  order.quote?.quoteRequest?.brief?.productName ||
                  'High Protein Peanut Butter Crisp Bar';
                const factoryName =
                  order.factory?.legalName || order.factoryName || 'Apex Foodtech Industries';

                return (
                  <div
                    key={order.id}
                    className="py-4 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-slate-50/50 p-3 rounded-2xl transition"
                  >
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold font-mono text-slate-400">#{order.id}</span>
                        <StatusBadge status={order.status} size="sm" />
                      </div>
                      <h3 className="text-sm md:text-base font-bold text-slate-900">
                        {productName}
                      </h3>
                      <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
                        <span className="flex items-center gap-1">
                          <Factory className="w-3.5 h-3.5 text-slate-400" />
                          {factoryName}
                        </span>
                        <span>•</span>
                        <span>{order.quantityUnits?.toLocaleString('en-IN')} units</span>
                        <span>•</span>
                        <span className="font-bold text-slate-900">{formatPaiseToINR(order.totalPaise)}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <Link
                        href={`/orders/${order.id}`}
                        className="w-full md:w-auto px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-sm transition flex items-center justify-center gap-1.5 min-h-[44px]"
                      >
                        <span>Track Batch Lifecycle</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
