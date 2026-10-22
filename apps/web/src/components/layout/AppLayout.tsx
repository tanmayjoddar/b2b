'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  FileSpreadsheet,
  Building2,
  PackageCheck,
  ShieldCheck,
  LogOut,
  ChevronDown,
  Layers,
  CheckCircle2,
  History,
} from 'lucide-react';
import { Role } from '@factorymatch/shared';
import { api } from '../../lib/api/client';

interface AppLayoutProps {
  children: React.ReactNode;
  role?: string;
  activePath?: string;
  title?: string;
  subtitle?: string;
}

export function AppLayout({ children }: AppLayoutProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isRoleDropdownOpen, setIsRoleDropdownOpen] = useState(false);

  useEffect(() => {
    const storedUser = typeof window !== 'undefined' ? localStorage.getItem('fm_user') : null;
    const storedToken = typeof window !== 'undefined' ? localStorage.getItem('fm_token') : null;

    if (storedUser && storedToken) {
      try {
        setCurrentUser(JSON.parse(storedUser));
      } catch {
        router.push('/login');
      }
    } else {
      router.push('/login');
    }
  }, [router]);

  const handleRoleSwitch = async (role: Role) => {
    setIsRoleDropdownOpen(false);
    try {
      if (role === Role.BRAND) {
        const res = await api.loginWithPassword({ email: 'founder@proteinbites.in', password: 'Brand@123456' });
        setCurrentUser(res.user);
        router.push('/dashboard');
      } else if (role === Role.FACTORY) {
        const otpRes = await api.requestOtp({ phone: '+919876543210' });
        const res = await api.verifyOtp({ phone: '+919876543210', otp: otpRes.debugOtp || '123456' });
        setCurrentUser(res.user);
        router.push('/factory/quotes');
      } else if (role === Role.ADMIN) {
        const res = await api.loginWithPassword({ email: 'admin@factorymatch.in', password: 'Admin@123456' });
        setCurrentUser(res.user);
        router.push('/admin/verification');
      }
    } catch {
      router.push('/login');
    }
  };

  const navLinks = [
    { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { label: 'Briefs', href: '/briefs', icon: FileSpreadsheet },
    { label: 'Factories', href: '/factories', icon: Building2 },
    { label: 'Orders', href: '/orders', icon: PackageCheck },
    ...(currentUser?.role === Role.ADMIN
      ? [
          { label: 'Verification', href: '/admin/verification', icon: ShieldCheck },
          { label: 'Matching', href: '/admin/matching', icon: Layers },
          { label: 'Audit Trail', href: '/admin/audit', icon: History },
        ]
      : []),
    ...(currentUser?.role === Role.FACTORY
      ? [{ label: 'Factory Quotes', href: '/factory/quotes', icon: Building2 }]
      : []),
  ];

  return (
    <div className="min-h-screen bg-[#F6F8FA] flex flex-col md:flex-row pb-20 md:pb-0">
      {/* Desktop Floating Sidebar (Monetra Style) */}
      <aside className="hidden md:flex flex-col items-center justify-between py-6 px-3 m-4 w-20 bg-white rounded-4xl border border-slate-200/80 shadow-card">
        <div className="space-y-6 flex flex-col items-center">
          <Link
            href="/dashboard"
            className="w-12 h-12 rounded-2xl bg-slate-900 text-accent-400 flex items-center justify-center font-bold shadow-sm hover:scale-105 transition"
            title="FactoryMatch"
          >
            <Layers className="w-6 h-6 stroke-[2]" />
          </Link>

          <nav className="space-y-3">
            {navLinks.map((link) => {
              const Icon = link.icon;
              const isActive = pathname.startsWith(link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  title={link.label}
                  className={`w-12 h-12 rounded-2xl flex items-center justify-center transition ${
                    isActive
                      ? 'bg-accent-400 text-slate-950 font-bold shadow-sm'
                      : 'text-slate-400 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  <Icon className="w-5 h-5 stroke-[2]" />
                </Link>
              );
            })}
          </nav>
        </div>

        <button
          onClick={() => {
            api.logout();
            router.push('/login');
          }}
          title="Logout"
          className="w-12 h-12 rounded-2xl flex items-center justify-center text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
        >
          <LogOut className="w-5 h-5 stroke-[2]" />
        </button>
      </aside>

      {/* Main Content Viewport */}
      <div className="flex-1 flex flex-col min-w-0 pr-0 md:pr-4 py-3 md:py-4 px-3 md:px-0">
        {/* Top Header Bar */}
        <header className="bg-white rounded-2xl md:rounded-3xl p-3.5 md:p-4 mb-4 md:mb-6 border border-slate-200/80 shadow-card flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/dashboard" className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-slate-900 text-accent-400 flex items-center justify-center font-bold md:hidden">
                <Layers className="w-4 h-4 stroke-[2]" />
              </div>
              <span className="font-extrabold text-slate-900 tracking-tight text-base md:text-lg">
                FactoryMatch
              </span>
            </Link>
            <span className="hidden sm:inline-block text-xs px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 font-semibold border border-slate-200">
              Snacks & Nutrition
            </span>
          </div>

          {/* Desktop Nav Pills */}
          <div className="hidden lg:flex items-center gap-1 bg-slate-100/80 p-1 rounded-full border border-slate-200 text-xs font-semibold">
            {navLinks.slice(0, 4).map((link) => {
              const isActive = pathname.startsWith(link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`px-4 py-1.5 rounded-full transition ${
                    isActive
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </div>

          {/* Persona Switcher & Fast Actions */}
          <div className="flex items-center gap-2.5 relative">
            <div className="relative">
              <button
                onClick={() => setIsRoleDropdownOpen(!isRoleDropdownOpen)}
                className="flex items-center gap-2 bg-slate-50 hover:bg-slate-100 px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 min-h-[44px]"
              >
                <div className="w-2 h-2 rounded-full bg-accent-500" />
                <span className="capitalize">{currentUser?.role || 'Guest'}</span>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              </button>

              {isRoleDropdownOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-2xl shadow-xl border border-slate-200 py-2 z-50 text-xs font-medium space-y-1">
                  <div className="px-3 py-1 text-slate-400 uppercase tracking-wider font-bold text-[10px]">
                    Switch Persona
                  </div>
                  <button
                    onClick={() => handleRoleSwitch(Role.BRAND)}
                    className="w-full text-left px-3 py-2 hover:bg-slate-50 flex items-center justify-between"
                  >
                    <span>Brand Founder</span>
                    {currentUser?.role === Role.BRAND && <CheckCircle2 className="w-3.5 h-3.5 text-accent-700" />}
                  </button>
                  <button
                    onClick={() => handleRoleSwitch(Role.FACTORY)}
                    className="w-full text-left px-3 py-2 hover:bg-slate-50 flex items-center justify-between"
                  >
                    <span>Factory Owner</span>
                    {currentUser?.role === Role.FACTORY && <CheckCircle2 className="w-3.5 h-3.5 text-accent-700" />}
                  </button>
                  <button
                    onClick={() => handleRoleSwitch(Role.ADMIN)}
                    className="w-full text-left px-3 py-2 hover:bg-slate-50 flex items-center justify-between"
                  >
                    <span>Admin Operations</span>
                    {currentUser?.role === Role.ADMIN && <CheckCircle2 className="w-3.5 h-3.5 text-accent-700" />}
                  </button>
                </div>
              )}
            </div>

            <Link
              href="/briefs/new"
              className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-sm transition min-h-[44px] flex items-center justify-center"
            >
              + New Brief
            </Link>
          </div>
        </header>

        {/* Content Body */}
        <main className="flex-1">{children}</main>
      </div>

      {/* ── Mobile Bottom Navigation Bar (100% Mobile App Ergonomics) ── */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 px-4 py-2.5 z-40 flex items-center justify-around shadow-lg">
        {navLinks.slice(0, 4).map((link) => {
          const Icon = link.icon;
          const isActive = pathname.startsWith(link.href);
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`flex flex-col items-center gap-1 py-1 px-3 rounded-xl transition min-w-[54px] min-h-[44px] justify-center ${
                isActive ? 'text-slate-950 font-bold' : 'text-slate-400'
              }`}
            >
              <Icon className="w-5 h-5 stroke-[2]" />
              <span className="text-[10px]">{link.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
