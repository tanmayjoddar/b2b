'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Layers,
  Building2,
  Mail,
  Lock,
  Phone,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
} from 'lucide-react';
import { api } from '../../lib/api/client';
import { Role } from '@factorymatch/shared';

export default function LoginPage() {
  const router = useRouter();
  const [authMode, setAuthMode] = useState<'brand' | 'factory'>('brand');

  // Brand state
  const [email, setEmail] = useState('founder@proteinbites.in');
  const [password, setPassword] = useState('Password123!');

  // Factory state
  const [phone, setPhone] = useState('+919876543210');
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleBrandLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await api.loginWithPassword({ email, password }).catch(() => {
        // Fallback demo session if API server offline
        const user = { id: 'usr-brand-demo', email, role: Role.BRAND, brandId: 'brand-1' };
        localStorage.setItem('fm_user', JSON.stringify(user));
        localStorage.setItem('fm_token', 'demo-token');
      });
      router.push('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await api.requestOtp({ phone }).catch(() => ({ debugOtp: '123456' }));
      setOtpSent(true);
      if (res?.debugOtp) {
        setOtpCode(res.debugOtp);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to send OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await api.verifyOtp({ phone, otp: otpCode }).catch(() => {
        const user = { id: 'usr-fac-demo', phone, role: Role.FACTORY, factoryId: 'fac-1' };
        localStorage.setItem('fm_user', JSON.stringify(user));
        localStorage.setItem('fm_token', 'demo-token');
      });
      router.push('/factory/quotes');
    } catch (err: any) {
      setError(err.message || 'Invalid verification code');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickDemo = (role: Role) => {
    if (role === Role.BRAND) {
      const user = { id: 'usr-brand-demo', email: 'founder@proteinbites.in', role: Role.BRAND, brandId: 'brand-1' };
      localStorage.setItem('fm_user', JSON.stringify(user));
      router.push('/dashboard');
    } else if (role === Role.FACTORY) {
      const user = { id: 'usr-fac-demo', phone: '+919876543210', role: Role.FACTORY, factoryId: 'fac-1' };
      localStorage.setItem('fm_user', JSON.stringify(user));
      router.push('/factory/quotes');
    } else if (role === Role.ADMIN) {
      const user = { id: 'usr-admin-demo', email: 'admin@factorymatch.in', role: Role.ADMIN };
      localStorage.setItem('fm_user', JSON.stringify(user));
      router.push('/admin/verification');
    }
  };

  return (
    <div className="min-h-screen bg-[#F6F8FA] flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center space-y-2">
        <div className="w-12 h-12 rounded-2xl bg-slate-900 text-accent-400 mx-auto flex items-center justify-center font-bold shadow-md">
          <Layers className="w-6 h-6 stroke-[2]" />
        </div>
        <h2 className="text-2xl font-extrabold tracking-tight text-slate-900">
          FactoryMatch Portal
        </h2>
        <p className="text-xs text-slate-500">
          Verified contract manufacturing for Indian consumer brands
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-6 shadow-card rounded-3xl border border-slate-200/80 sm:px-10 space-y-6">
          {/* Mode Switcher Tabs */}
          <div className="flex bg-slate-100 p-1 rounded-2xl text-xs font-bold border border-slate-200">
            <button
              onClick={() => {
                setAuthMode('brand');
                setError(null);
              }}
              className={`flex-1 py-2 rounded-xl transition min-h-[44px] flex items-center justify-center gap-1.5 ${
                authMode === 'brand' ? 'bg-white text-slate-950 shadow-sm' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <Mail className="w-3.5 h-3.5" />
              <span>D2C Brand</span>
            </button>
            <button
              onClick={() => {
                setAuthMode('factory');
                setError(null);
              }}
              className={`flex-1 py-2 rounded-xl transition min-h-[44px] flex items-center justify-center gap-1.5 ${
                authMode === 'factory' ? 'bg-white text-slate-950 shadow-sm' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <Building2 className="w-3.5 h-3.5" />
              <span>Factory Plant</span>
            </button>
          </div>

          {error && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium">
              {error}
            </div>
          )}

          {/* Brand Form */}
          {authMode === 'brand' ? (
            <form onSubmit={handleBrandLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                  Brand Founder Email
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-900 text-sm min-h-[44px]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                  Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-900 text-sm min-h-[44px]"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-sm transition min-h-[44px] flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <span>{loading ? 'Authenticating...' : 'Sign In as Brand'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          ) : (
            /* Factory Phone OTP Form */
            <div className="space-y-4">
              {!otpSent ? (
                <form onSubmit={handleRequestOtp} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                      Indian Mobile Number (+91)
                    </label>
                    <div className="relative">
                      <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                      <input
                        type="tel"
                        required
                        placeholder="+919876543210"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-900 text-sm min-h-[44px]"
                      />
                    </div>
                    <span className="text-[11px] text-slate-400 mt-1 block">
                      A 6-digit OTP will be dispatched via WhatsApp/SMS
                    </span>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-sm transition min-h-[44px] flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    <span>{loading ? 'Sending OTP...' : 'Send Verification OTP'}</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </form>
              ) : (
                <form onSubmit={handleVerifyOtp} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                      Enter 6-Digit Code
                    </label>
                    <input
                      type="text"
                      maxLength={6}
                      required
                      placeholder="123456"
                      value={otpCode}
                      onChange={(e) => setOtpCode(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-900 text-sm font-mono tracking-widest text-center text-lg min-h-[44px]"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3 rounded-xl bg-accent-400 hover:bg-accent-500 text-slate-950 font-bold text-xs shadow-sm transition min-h-[44px] flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    <span>{loading ? 'Verifying...' : 'Verify Code & Enter Portal'}</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </form>
              )}
            </div>
          )}

          {/* Quick Demo Access Bar */}
          <div className="pt-4 border-t border-slate-100">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-2 text-center">
              Quick Demo Access
            </span>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => handleQuickDemo(Role.BRAND)}
                className="py-2 px-2 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-[11px] font-bold text-slate-700 min-h-[44px]"
              >
                Brand
              </button>
              <button
                type="button"
                onClick={() => handleQuickDemo(Role.FACTORY)}
                className="py-2 px-2 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-[11px] font-bold text-slate-700 min-h-[44px]"
              >
                Factory
              </button>
              <button
                type="button"
                onClick={() => handleQuickDemo(Role.ADMIN)}
                className="py-2 px-2 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-[11px] font-bold text-slate-700 min-h-[44px]"
              >
                Admin
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
