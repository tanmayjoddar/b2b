import React from 'react';
import { LucideIcon } from 'lucide-react';

interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  delta?: {
    value: string;
    positive: boolean;
  };
  icon?: LucideIcon;
  badgeColor?: 'lime' | 'blue' | 'purple' | 'slate';
  action?: {
    label: string;
    onClick: () => void;
  };
}

export function MetricCard({
  title,
  value,
  subtitle,
  delta,
  icon: Icon,
  badgeColor = 'lime',
  action,
}: MetricCardProps) {
  const badgeStyles = {
    lime: 'bg-accent-100 text-slate-900',
    blue: 'bg-blue-50 text-blue-600',
    purple: 'bg-purple-50 text-purple-600',
    slate: 'bg-slate-100 text-slate-700',
  }[badgeColor];

  return (
    <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-card hover:shadow-card-hover transition-all duration-200">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {Icon && (
            <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${badgeStyles}`}>
              <Icon className="w-5 h-5" />
            </div>
          )}
          <span className="text-sm font-medium text-slate-500">{title}</span>
        </div>
        {action && (
          <button
            onClick={action.onClick}
            className="px-3 py-1 rounded-full text-xs font-semibold bg-accent-400 text-slate-950 hover:bg-accent-500 transition"
          >
            {action.label}
          </button>
        )}
      </div>

      <div className="mt-4 flex items-baseline gap-3">
        <div className="text-3xl font-extrabold tracking-tight text-slate-900">{value}</div>
        {delta && (
          <span
            className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
              delta.positive
                ? 'bg-emerald-50 text-emerald-700'
                : 'bg-rose-50 text-rose-700'
            }`}
          >
            {delta.positive ? '↑' : '↓'} {delta.value}
          </span>
        )}
      </div>

      {subtitle && <p className="mt-1 text-xs text-slate-400">{subtitle}</p>}
    </div>
  );
}
