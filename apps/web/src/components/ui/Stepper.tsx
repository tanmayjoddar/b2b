import React from 'react';
import { Check, Clock } from 'lucide-react';

export interface Step {
  id: string | number;
  label: string;
  sublabel?: string;
}

interface StepperProps {
  steps: Step[];
  currentStep: number;
  orientation?: 'horizontal' | 'vertical';
  timeRemainingSLA?: string;
}

export function Stepper({
  steps,
  currentStep,
  orientation = 'horizontal',
  timeRemainingSLA,
}: StepperProps) {
  if (orientation === 'vertical') {
    return (
      <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-card">
        <div className="space-y-6">
          {steps.map((step, index) => {
            const isCompleted = index < currentStep;
            const isCurrent = index === currentStep;

            return (
              <div key={step.id} className="relative flex items-start gap-4">
                {/* Connecting Line */}
                {index < steps.length - 1 && (
                  <div
                    className={`absolute left-4 top-8 -bottom-4 w-0.5 ${
                      isCompleted ? 'bg-accent-500' : 'bg-slate-200'
                    }`}
                  />
                )}

                {/* Circle Icon */}
                <div
                  className={`relative z-10 w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs transition-all ${
                    isCompleted
                      ? 'bg-accent-500 text-slate-950 ring-4 ring-accent-100'
                      : isCurrent
                      ? 'bg-slate-900 text-white ring-4 ring-slate-200'
                      : 'bg-slate-100 text-slate-400'
                  }`}
                >
                  {isCompleted ? <Check className="w-4 h-4 stroke-[3]" /> : index + 1}
                </div>

                {/* Label */}
                <div className="pt-0.5">
                  <div
                    className={`text-sm font-semibold ${
                      isCurrent ? 'text-slate-900' : isCompleted ? 'text-slate-700' : 'text-slate-400'
                    }`}
                  >
                    {step.label}
                  </div>
                  {step.sublabel && (
                    <div className="text-xs text-slate-400">{step.sublabel}</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {timeRemainingSLA && (
          <div className="mt-8 p-4 rounded-2xl bg-slate-900 text-white space-y-2">
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <Clock className="w-3.5 h-3.5 text-accent-400" />
              <span>Target Delivery SLA</span>
            </div>
            <div className="text-sm font-bold text-accent-300">{timeRemainingSLA}</div>
            <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
              <div className="bg-accent-400 h-1.5 rounded-full w-2/3" />
            </div>
          </div>
        )}
      </div>
    );
  }

  // Horizontal Stepper
  return (
    <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-card">
      <div className="flex items-center justify-between">
        {steps.map((step, index) => {
          const isCompleted = index < currentStep;
          const isCurrent = index === currentStep;

          return (
            <React.Fragment key={step.id}>
              <div className="flex items-center gap-3">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs transition-all ${
                    isCompleted
                      ? 'bg-accent-500 text-slate-950 ring-4 ring-accent-100'
                      : isCurrent
                      ? 'bg-slate-900 text-white ring-4 ring-slate-200'
                      : 'bg-slate-100 text-slate-400'
                  }`}
                >
                  {isCompleted ? <Check className="w-4 h-4 stroke-[3]" /> : index + 1}
                </div>
                <div>
                  <div className="text-xs font-semibold text-slate-400">STEP {index + 1}</div>
                  <div
                    className={`text-sm font-bold ${
                      isCurrent ? 'text-slate-900' : isCompleted ? 'text-slate-700' : 'text-slate-400'
                    }`}
                  >
                    {step.label}
                  </div>
                </div>
              </div>

              {index < steps.length - 1 && (
                <div
                  className={`flex-1 mx-4 h-0.5 rounded ${
                    isCompleted ? 'bg-accent-500' : 'bg-slate-200'
                  }`}
                />
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}
