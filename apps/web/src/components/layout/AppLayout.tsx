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
  History,
  ShieldAlert,
  ArrowRight,
  User,
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
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

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
    setMounted(true);
  }, [router]);

  const handleSignOut = async () => {
    setIsUserMenuOpen(false);
    await api.logout();
    router.push('/login');
  };

  const getPortalHome = () => {
    if (currentUser?.role === Role.ADMIN) return '/admin/verification';
    if (currentUser?.role === Role.FACTORY) return '/factory/quotes';
    return '/dashboard';
  };

  const portalHome = getPortalHome();

  const getNavLinks = () => {
    if (currentUser?.role === Role.ADMIN) {
      return [
        { label: 'Verification', href: '/admin/verification', icon: ShieldCheck },
        { label: 'Matching', href: '/admin/matching', icon: Layers },
        { label: 'Audit Trail', href: '/admin/audit', icon: History },
        { label: 'Batch Orders', href: '/orders', icon: PackageCheck },
      ];
    }
    if (currentUser?.role === Role.FACTORY) {
      return [
        { label: 'Incoming RFQs', href: '/factory/quotes', icon: FileSpreadsheet },
        { label: 'Batch Orders', href: '/orders', icon: PackageCheck },
        { label: 'Plant Profile', href: '/factory/onboard', icon: Building2 },
      ];
    }
    return [
      { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
      { label: 'Briefs', href: '/briefs', icon: FileSpreadsheet },
      { label: 'Factories', href: '/factories', icon: Building2 },
      { label: 'Orders', href: '/orders', icon: PackageCheck },
    ];
  };

  const navLinks = getNavLinks();

  // Role Badge Styling
  const getRoleBadge = () => {
    if (currentUser?.role === Role.ADMIN) {
      return {
        label: 'Admin Operations',
        badgeClass: 'bg-purple-50 text-purple-700 border-purple-200',
        dotClass: 'bg-purple-600',
      };
    }
    if (currentUser?.role === Role.FACTORY) {
      return {
        label: 'Factory Owner',
        badgeClass: 'bg-blue-50 text-blue-700 border-blue-200',
        dotClass: 'bg-blue-600',
      };
    }
    return {
      label: 'Brand Founder',
      badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      dotClass: 'bg-emerald-600',
    };
  };

  const roleInfo = getRoleBadge();

  // If session is authenticating or not mounted yet, render polished loading shell
  if (!mounted || !currentUser) {
    return (
      <div className="min-h-screen bg-[#F6F8FA] flex items-center justify-center p-4">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-slate-900 text-accent-400 flex items-center justify-center shadow-sm animate-pulse">
            <Layers className="w-6 h-6 stroke-[2]" />
          </div>
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-400">
            <div className="w-1.5 h-1.5 rounded-full bg-accent-500 animate-ping" />
            <span>Verifying session credentials...</span>
          </div>
        </div>
      </div>
    );
  }

  // ── Portal Access Security Guard ──
  // Check if current user is attempting to access an unauthorized portal group
  const isAdminRoute = pathname.startsWith('/admin');
  const isFactoryRoute = pathname.startsWith('/factory');
  const isBrandExclusiveRoute = pathname.startsWith('/briefs/new');

  const isAccessDenied =
    (isAdminRoute && currentUser.role !== Role.ADMIN) ||
    (isFactoryRoute && currentUser.role !== Role.FACTORY) ||
    (isBrandExclusiveRoute && currentUser.role !== Role.BRAND);

  if (isAccessDenied) {
    const requiredRoleName = isAdminRoute
      ? 'Platform Administrator'
      : isFactoryRoute
      ? 'Audited Factory Owner'
      : 'Brand Founder';

    return (
      <div className="min-h-screen bg-[#F6F8FA] flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-3xl p-8 border border-slate-200/80 shadow-card text-center space-y-6">
          <div className="w-14 h-14 rounded-2xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center mx-auto">
            <ShieldAlert className="w-7 h-7 stroke-[2]" />
          </div>

          <div className="space-y-2">
            <span className="text-xs font-bold text-amber-700 uppercase tracking-widest">
              Portal Access Restricted
            </span>
            <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">
              Unauthorized Route
            </h1>
            <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
              This portal is restricted strictly to <strong>{requiredRoleName}</strong> accounts. You are currently
              signed in as <strong className="text-slate-800">{currentUser.email || currentUser.phone}</strong> (
              <span className="capitalize">{currentUser.role}</span>).
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3 justify-center pt-2">
            <Link
              href={portalHome}
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center justify-center gap-2 transition min-h-[44px]"
            >
              <span>Go to My Portal</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>

            <button
              onClick={handleSignOut}
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl border border-slate-200 hover:bg-rose-50 hover:text-rose-600 text-slate-700 font-bold text-xs flex items-center justify-center gap-2 transition min-h-[44px]"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F6F8FA] flex flex-col md:flex-row pb-20 md:pb-0">
      {/* Desktop Floating Sidebar (Monetra Style) */}
      <aside className="hidden md:flex flex-col items-center justify-between py-6 px-3 m-4 w-20 bg-white rounded-4xl border border-slate-200/80 shadow-card">
        <div className="space-y-6 flex flex-col items-center">
          <Link
            href={portalHome}
            className="w-12 h-12 rounded-2xl bg-slate-900 text-accent-400 flex items-center justify-center font-bold shadow-sm hover:scale-105 transition"
            title="FactoryMatch Portal"
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
          onClick={handleSignOut}
          title="Sign Out"
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
            <Link href={portalHome} className="flex items-center gap-2">
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
            {navLinks.map((link) => {
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

          {/* User Identity & Context Actions */}
          <div className="flex items-center gap-2.5 relative">
            {/* User Profile Badge (No Persona Switching) */}
            <div className="relative">
              <button
                onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                className="flex items-center gap-2 bg-slate-50 hover:bg-slate-100 px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 min-h-[44px] transition"
              >
                <div className={`w-2 h-2 rounded-full ${roleInfo.dotClass}`} />
                <span className="hidden sm:inline font-bold">{roleInfo.label}</span>
                <span className="text-slate-400 font-mono text-[11px] max-w-[120px] truncate">
                  {currentUser.email || currentUser.phone}
                </span>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              </button>

              {isUserMenuOpen && (
                <div className="absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-xl border border-slate-200 py-3 z-50 text-xs font-medium space-y-2">
                  <div className="px-4 py-1 border-b border-slate-100 pb-2">
                    <p className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Authenticated Account</p>
                    <p className="font-extrabold text-slate-900 text-sm mt-0.5 truncate">
                      {currentUser.email || currentUser.phone}
                    </p>
                    <div className="mt-1.5 inline-block">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${roleInfo.badgeClass}`}>
                        {roleInfo.label}
                      </span>
                    </div>
                  </div>

                  <div className="px-4 py-1 text-[11px] text-slate-500 space-y-1">
                    <div className="flex justify-between">
                      <span>User ID:</span>
                      <span className="font-mono text-slate-700">{currentUser.id.slice(0, 8)}...</span>
                    </div>
                    {currentUser.brandId && (
                      <div className="flex justify-between">
                        <span>Brand ID:</span>
                        <span className="font-mono text-slate-700">{currentUser.brandId.slice(0, 8)}...</span>
                      </div>
                    )}
                  </div>

                  <div className="pt-2 border-t border-slate-100 px-2">
                    <button
                      onClick={handleSignOut}
                      className="w-full text-left px-3 py-2.5 rounded-xl text-rose-600 hover:bg-rose-50 flex items-center gap-2 font-bold transition min-h-[44px]"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Portal Action Buttons */}
            {currentUser.role === Role.BRAND && (
              <Link
                href="/briefs/new"
                className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-sm transition min-h-[44px] flex items-center justify-center"
              >
                + New Brief
              </Link>
            )}

            {currentUser.role === Role.FACTORY && (
              <Link
                href="/factory/onboard"
                className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-sm transition min-h-[44px] flex items-center justify-center"
              >
                Plant Profile
              </Link>
            )}

            {currentUser.role === Role.ADMIN && (
              <Link
                href="/admin/audit"
                className="px-4 py-2.5 rounded-xl bg-purple-900 hover:bg-purple-800 text-white font-bold text-xs shadow-sm transition min-h-[44px] flex items-center justify-center"
              >
                Audit Log
              </Link>
            )}
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
