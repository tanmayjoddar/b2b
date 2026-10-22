import React from 'react';
import {
  ShieldCheck,
  Video,
  Award,
  Search,
  CheckCircle2,
  Clock,
  AlertCircle,
  FileText,
  XCircle,
} from 'lucide-react';
import { VerificationTier, BriefStatus, OrderStatus, QuoteStatus } from '@factorymatch/shared';

interface StatusBadgeProps {
  status: string;
  className?: string;
  size?: 'sm' | 'md';
}

export function StatusBadge({ status, className = '', size = 'md' }: StatusBadgeProps) {
  const sizeClasses = size === 'sm' ? 'px-2.5 py-0.5 text-xs' : 'px-3 py-1 text-xs';

  // Verification Tiers
  if (status === VerificationTier.TIER_1_DOCUMENTS) {
    return (
      <span className={`inline-flex items-center gap-1.5 font-medium rounded-full bg-blue-50 text-blue-700 border border-blue-200 ${sizeClasses} ${className}`}>
        <FileText className="w-3.5 h-3.5 text-blue-600" />
        Tier 1: Docs Verified
      </span>
    );
  }
  if (status === VerificationTier.TIER_2_VIDEO) {
    return (
      <span className={`inline-flex items-center gap-1.5 font-medium rounded-full bg-sky-50 text-sky-700 border border-sky-200 ${sizeClasses} ${className}`}>
        <Video className="w-3.5 h-3.5 text-sky-600" />
        Tier 2: Video Verified
      </span>
    );
  }
  if (status === VerificationTier.TIER_3_ORDER_PROVEN) {
    return (
      <span className={`inline-flex items-center gap-1.5 font-medium rounded-full bg-accent-100 text-slate-900 border border-accent-300 font-semibold ${sizeClasses} ${className}`}>
        <Award className="w-3.5 h-3.5 text-accent-700" />
        Tier 3: Order Proven
      </span>
    );
  }
  if (status === VerificationTier.TIER_4_INSPECTED) {
    return (
      <span className={`inline-flex items-center gap-1.5 font-medium rounded-full bg-purple-50 text-purple-700 border border-purple-200 ${sizeClasses} ${className}`}>
        <ShieldCheck className="w-3.5 h-3.5 text-purple-600" />
        Tier 4: Inspected
      </span>
    );
  }

  // Brief Statuses
  if (status === BriefStatus.DRAFT) {
    return (
      <span className={`inline-flex items-center gap-1 font-medium rounded-full bg-slate-100 text-slate-700 ${sizeClasses} ${className}`}>
        <Clock className="w-3 h-3 text-slate-500" />
        Draft
      </span>
    );
  }
  if (status === BriefStatus.SUBMITTED || status === BriefStatus.MATCHING) {
    return (
      <span className={`inline-flex items-center gap-1 font-medium rounded-full bg-blue-50 text-blue-700 border border-blue-200 ${sizeClasses} ${className}`}>
        <Search className="w-3 h-3 text-blue-600" />
        Matching (48h)
      </span>
    );
  }
  if (status === BriefStatus.SHORTLISTED) {
    return (
      <span className={`inline-flex items-center gap-1 font-medium rounded-full bg-accent-100 text-slate-900 border border-accent-300 ${sizeClasses} ${className}`}>
        <CheckCircle2 className="w-3 h-3 text-accent-700" />
        Shortlisted
      </span>
    );
  }

  // Quote & Order Statuses
  if (status === 'ACCEPTED' || status === OrderStatus.COMPLETED) {
    return (
      <span className={`inline-flex items-center gap-1 font-medium rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 ${sizeClasses} ${className}`}>
        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
        {status}
      </span>
    );
  }
  if (status === OrderStatus.IN_PRODUCTION) {
    return (
      <span className={`inline-flex items-center gap-1 font-medium rounded-full bg-sky-50 text-sky-700 border border-sky-200 ${sizeClasses} ${className}`}>
        <Clock className="w-3 h-3 text-sky-600 animate-spin" />
        In Production
      </span>
    );
  }
  if (status === 'REJECTED' || status === 'CANCELLED' || status === 'FAILED') {
    return (
      <span className={`inline-flex items-center gap-1 font-medium rounded-full bg-rose-50 text-rose-700 border border-rose-200 ${sizeClasses} ${className}`}>
        <XCircle className="w-3 h-3 text-rose-600" />
        {status}
      </span>
    );
  }

  return (
    <span className={`inline-flex items-center font-medium rounded-full bg-slate-100 text-slate-700 ${sizeClasses} ${className}`}>
      {status}
    </span>
  );
}
