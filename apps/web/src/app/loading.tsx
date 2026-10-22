import React from 'react';
import { Layers } from 'lucide-react';

export default function Loading() {
  return (
    <div className="min-h-screen bg-[#F6F8FA] flex items-center justify-center p-4">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 rounded-2xl bg-slate-900 text-accent-400 flex items-center justify-center shadow-sm animate-pulse">
          <Layers className="w-6 h-6 stroke-[2]" />
        </div>
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-400">
          <div className="w-1.5 h-1.5 rounded-full bg-accent-500 animate-ping" />
          <span>Loading FactoryMatch...</span>
        </div>
      </div>
    </div>
  );
}
