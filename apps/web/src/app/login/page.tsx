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
  UserPlus,
  LogIn,
} from 'lucide-react';
import { api } from '../../lib/api/client';
import { Role } from '@factorymatch/shared';

export default function LoginPage() {
  const router = useRouter();
  const [authMode, setAuthMode] = useState<'brand_login' | 'brand_register' | 'factory'>('brand_login');

  // Brand Login State
  const [email, setEmail] = useState('founder@proteinbites.in');
  const [password, setPassword] = useState('Brand@123456');

  // Brand Register State
  const [regCompanyName, setRegCompanyName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');

  // Factory State
  const [phone, setPhone] = useState('+919876543210');
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // 1. Real Brand / Admin Login
  const handleBrandLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await api.loginWithPassword({ email, password });
      if (res.user.role === Role.ADMIN) {
        router.push('/admin/verification');
      } else if (res.user.role === Role.FACTORY) {
        router.push('/factory/quotes');
      } else {
        router.push('/dashboard');
      }
    } catch (err: any) {
      setError(err.message || 'Authentication failed. Please verify credentials.');
    } finally {
      setLoading(false);
    }
  };

  // 2. Real Brand Registration
  const handleBrandRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await api.registerBrand({
        companyName: regCompanyName,
        email: regEmail,
        password: regPassword,
      });
      router.push('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Registration failed. Please check inputs.');
    } finally {
      setLoading(false);
    }
  };

  // 3. Real Factory OTP Request
  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await api.requestOtp({ phone });
      setOtpSent(true);
      if (res.debugOtp) {
        setOtpCode(res.debugOtp);
        setSuccessMsg(`OTP generated: ${res.debugOtp}`);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to dispatch verification code.');
    } finally {
      setLoading(false);
    }
  };

  // 4. Real Factory OTP Verify
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await api.verifyOtp({ phone, otp: otpCode });
      router.push('/factory/quotes');
    } catch (err: any) {
      setError(err.message || 'Invalid or expired verification code.');
    } finally {
      setLoading(false);
    }
  };

  // 5. Real 1-Click Authentications (hits real API endpoints)
  const handleQuickLogin = async (role: Role) => {
    setLoading(true);
    setError(null);
    try {
      if (role === Role.BRAND) {
        await api.loginWithPassword({ email: 'founder@proteinbites.in', password: 'Brand@123456' });
        router.push('/dashboard');
      } else if (role === Role.ADMIN) {
        await api.loginWithPassword({ email: 'admin@factorymatch.in', password: 'Admin@123456' });
        router.push('/admin/verification');
      } else if (role === Role.FACTORY) {
        const otpRes = await api.requestOtp({ phone: '+919876543210' });
        await api.verifyOtp({ phone: '+919876543210', otp: otpRes.debugOtp || '123456' });
        router.push('/factory/quotes');
      }
    } catch (err: any) {
      setError(`Failed to sign in as ${role}: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F6F8FA] flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center space-y-2">
        <div className="w-12 h-12 rounded-2xl bg-slate-900 text-lime-400 mx-auto flex items-center justify-center font-bold shadow-md">
          <Layers className="w-6 h-6 stroke-[2]" />
        </div>
        <h1 className="text-2xl font-extrabold tracking-tight text-slate-950">
          FactoryMatch Portal
        </h1>
        <p className="text-xs text-slate-500 font-medium">
          Verified contract manufacturing for Indian consumer brands
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-6 shadow-card rounded-3xl border border-slate-200/80 sm:px-10 space-y-6">
          {/* Tabs */}
          <div className="flex bg-slate-100 p-1 rounded-2xl text-xs font-bold border border-slate-200">
            <button
              type="button"
              onClick={() => {
                setAuthMode('brand_login');
                setError(null);
                setSuccessMsg(null);
              }}
              className={`flex-1 py-2 rounded-xl transition min-h-[44px] flex items-center justify-center gap-1.5 ${
                authMode === 'brand_login' ? 'bg-white text-slate-950 shadow-sm' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Sign In</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setAuthMode('brand_register');
                setError(null);
                setSuccessMsg(null);
              }}
              className={`flex-1 py-2 rounded-xl transition min-h-[44px] flex items-center justify-center gap-1.5 ${
                authMode === 'brand_register' ? 'bg-white text-slate-950 shadow-sm' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Register</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setAuthMode('factory');
                setError(null);
                setSuccessMsg(null);
              }}
              className={`flex-1 py-2 rounded-xl transition min-h-[44px] flex items-center justify-center gap-1.5 ${
                authMode === 'factory' ? 'bg-white text-slate-950 shadow-sm' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <Building2 className="w-3.5 h-3.5" />
              <span>Factory OTP</span>
            </button>
          </div>

          {error && (
            <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold">
              {error}
            </div>
          )}

          {successMsg && (
            <div className="p-3.5 rounded-2xl bg-lime-50 border border-lime-200 text-lime-800 text-xs font-semibold">
              {successMsg}
            </div>
          )}

          {/* Tab 1: Brand / Admin Login */}
          {authMode === 'brand_login' && (
            <form onSubmit={handleBrandLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="founder@brand.com"
                    className="w-full pl-10 pr-4 py-3 rounded-2xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-900 text-xs font-medium min-h-[44px]"
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
                    className="w-full pl-10 pr-4 py-3 rounded-2xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-900 text-xs font-medium min-h-[44px]"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 rounded-2xl bg-slate-950 hover:bg-slate-800 text-white font-bold text-xs shadow-sm transition min-h-[44px] flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <span>{loading ? 'Authenticating...' : 'Sign In to Portal'}</span>
                <ArrowRight className="w-4 h-4 text-lime-400" />
              </button>
            </form>
          )}

          {/* Tab 2: Brand Registration */}
          {authMode === 'brand_register' && (
            <form onSubmit={handleBrandRegister} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                  Brand / Company Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. PureSnacks Nutrition Pvt Ltd"
                  value={regCompanyName}
                  onChange={(e) => setRegCompanyName(e.target.value)}
                  className="w-full px-4 py-3 rounded-2xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-900 text-xs font-medium min-h-[44px]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                  Work Email Address
                </label>
                <input
                  type="email"
                  required
                  placeholder="founder@puresnacks.in"
                  value={regEmail}
                  onChange={(e) => setRegEmail(e.target.value)}
                  className="w-full px-4 py-3 rounded-2xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-900 text-xs font-medium min-h-[44px]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                  Password (min 8 characters)
                </label>
                <input
                  type="password"
                  required
                  minLength={8}
                  placeholder="Create a secure password"
                  value={regPassword}
                  onChange={(e) => setRegPassword(e.target.value)}
                  className="w-full px-4 py-3 rounded-2xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-900 text-xs font-medium min-h-[44px]"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 rounded-2xl bg-lime-500 hover:bg-lime-400 text-slate-950 font-bold text-xs shadow-sm transition min-h-[44px] flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <span>{loading ? 'Creating Account...' : 'Register Brand Account'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          )}

          {/* Tab 3: Factory Phone OTP */}
          {authMode === 'factory' && (
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
                        className="w-full pl-10 pr-4 py-3 rounded-2xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-900 text-xs font-medium min-h-[44px]"
                      />
                    </div>
                    <span className="text-[11px] text-slate-400 mt-1 block">
                      A 6-digit verification code will be generated
                    </span>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3.5 rounded-2xl bg-slate-950 hover:bg-slate-800 text-white font-bold text-xs shadow-sm transition min-h-[44px] flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    <span>{loading ? 'Sending Code...' : 'Request Verification Code'}</span>
                    <ArrowRight className="w-4 h-4 text-lime-400" />
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
                      className="w-full px-4 py-3 rounded-2xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-900 text-sm font-mono tracking-widest text-center min-h-[44px]"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3.5 rounded-2xl bg-lime-500 hover:bg-lime-400 text-slate-950 font-bold text-xs shadow-sm transition min-h-[44px] flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    <span>{loading ? 'Verifying...' : 'Verify Code & Enter Portal'}</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </form>
              )}
            </div>
          )}

          {/* 1-Click Real Authentication Buttons */}
          <div className="pt-4 border-t border-slate-100">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-2 text-center">
              Instant Seed Account Authentication (Live Backend API)
            </span>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                disabled={loading}
                onClick={() => handleQuickLogin(Role.BRAND)}
                className="py-2.5 px-2 rounded-2xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-[11px] font-bold text-slate-800 min-h-[44px] text-center transition disabled:opacity-50"
              >
                Seed Brand
              </button>
              <button
                type="button"
                disabled={loading}
                onClick={() => handleQuickLogin(Role.FACTORY)}
                className="py-2.5 px-2 rounded-2xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-[11px] font-bold text-slate-800 min-h-[44px] text-center transition disabled:opacity-50"
              >
                Seed Factory
              </button>
              <button
                type="button"
                disabled={loading}
                onClick={() => handleQuickLogin(Role.ADMIN)}
                className="py-2.5 px-2 rounded-2xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-[11px] font-bold text-slate-800 min-h-[44px] text-center transition disabled:opacity-50"
              >
                Seed Admin
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
