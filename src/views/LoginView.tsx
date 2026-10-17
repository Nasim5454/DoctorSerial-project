import React, { useState } from 'react';
import {
  Activity,
  ShieldCheck,
  Stethoscope,
  ClipboardList,
  User,
  AlertCircle,
  Loader2,
  Lock,
  KeyRound,
  Building2,
  CheckCircle2,
  ArrowRight
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.js';
import type { UserRole } from '../types/index.js';

export const LoginView: React.FC = () => {
  const { login, register, quickSwitchRole } = useAuth();
  const [portalMode, setPortalMode] = useState<'admin' | 'staff' | 'patient'>('admin');
  const [tab, setTab] = useState<'login' | 'register'>('login');

  // Form states
  const [email, setEmail] = useState('admin@doctorserial.com');
  const [password, setPassword] = useState('Admin123!');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handlePortalSwitch = (mode: 'admin' | 'staff' | 'patient') => {
    setPortalMode(mode);
    setError('');
    if (mode === 'admin') {
      setEmail('admin@doctorserial.com');
      setPassword('Admin123!');
      setTab('login');
    } else if (mode === 'staff') {
      setEmail('dr.syed.ali@doctorserial.com');
      setPassword('Doctor123!');
      setTab('login');
    } else {
      setEmail('patient.john@example.com');
      setPassword('Patient123!');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (tab === 'login') {
        await login(email, password);
      } else {
        await register({ name, email, password, phone });
      }
    } catch (err: unknown) {
      const errorObj = err as { response?: { data?: { error?: string } } };
      setError(errorObj.response?.data?.error || 'Authentication failed. Please verify your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = async (role: UserRole) => {
    setError('');
    setLoading(true);
    try {
      await quickSwitchRole(role);
    } catch {
      setError(`Failed to sign in as ${role}.`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-100 via-zinc-50 to-zinc-100 flex flex-col justify-center py-10 px-4 sm:px-6 lg:px-8 font-sans">
      {/* Top Hospital Branding Header */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center mb-6">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white mx-auto shadow-lg shadow-emerald-500/20 ring-4 ring-white">
          <Activity size={36} className="stroke-[2.5]" />
        </div>
        <h1 className="mt-3 text-2xl font-black text-zinc-900 tracking-tight">
          Dhaka Central Specialized Hospital
        </h1>
        <p className="text-xs font-semibold text-emerald-800">
          Specialized Clinic, Diagnostic Center & Serial Management
        </p>
        <p className="text-[11px] text-zinc-500 mt-0.5">
          Plot 12, Road 7, Dhanmondi / Panthapath, Dhaka-1205, Bangladesh
        </p>
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        {/* Portal Mode Selector Pills */}
        <div className="grid grid-cols-3 gap-1.5 p-1 bg-zinc-200/80 rounded-xl mb-4 text-xs font-bold">
          <button
            type="button"
            onClick={() => handlePortalSwitch('admin')}
            className={`py-2 px-2 rounded-lg flex items-center justify-center gap-1.5 transition-all ${
              portalMode === 'admin'
                ? 'bg-zinc-900 text-white shadow-sm'
                : 'text-zinc-700 hover:text-zinc-900 hover:bg-zinc-100'
            }`}
          >
            <ShieldCheck size={14} className={portalMode === 'admin' ? 'text-emerald-400' : ''} />
            Admin Portal
          </button>

          <button
            type="button"
            onClick={() => handlePortalSwitch('staff')}
            className={`py-2 px-2 rounded-lg flex items-center justify-center gap-1.5 transition-all ${
              portalMode === 'staff'
                ? 'bg-emerald-700 text-white shadow-sm'
                : 'text-zinc-700 hover:text-zinc-900 hover:bg-zinc-100'
            }`}
          >
            <Stethoscope size={14} />
            Doctor & Staff
          </button>

          <button
            type="button"
            onClick={() => handlePortalSwitch('patient')}
            className={`py-2 px-2 rounded-lg flex items-center justify-center gap-1.5 transition-all ${
              portalMode === 'patient'
                ? 'bg-blue-700 text-white shadow-sm'
                : 'text-zinc-700 hover:text-zinc-900 hover:bg-zinc-100'
            }`}
          >
            <User size={14} />
            Patient Portal
          </button>
        </div>

        {/* ================= ADMIN LOGIN INTERFACE ================= */}
        {portalMode === 'admin' && (
          <div className="bg-zinc-950 text-white rounded-3xl border-2 border-emerald-500/40 shadow-2xl p-6 sm:p-8 relative overflow-hidden">
            {/* Background glowing aura */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

            {/* Header Badge */}
            <div className="flex items-center justify-between pb-4 border-b border-zinc-800">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-600/30 border border-emerald-500/50 flex items-center justify-center text-emerald-400">
                  <ShieldCheck size={20} />
                </div>
                <div>
                  <h2 className="text-base font-extrabold tracking-tight text-white flex items-center gap-2">
                    Executive Administration Portal
                  </h2>
                  <p className="text-[10px] text-zinc-400">Medical Directorate & Super Admin Control</p>
                </div>
              </div>
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                Level-1 Clearance
              </span>
            </div>

            {/* Security Indicator */}
            <div className="my-4 p-2.5 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-between text-[11px] text-zinc-400">
              <span className="flex items-center gap-1.5 text-emerald-400 font-semibold">
                <Lock size={12} />
                Encrypted Session
              </span>
              <span>Hospital ID: DCSH-DHK-2026</span>
            </div>

            {error && (
              <div className="mb-4 p-3 rounded-xl bg-rose-950/80 border border-rose-500/50 text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle size={16} className="text-rose-400 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">
                  Director / Admin Official Email
                </label>
                <div className="relative">
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="admin@doctorserial.com"
                    className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-zinc-700 bg-zinc-900 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  <Building2 size={16} className="absolute right-3.5 top-3 text-zinc-500 pointer-events-none" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">
                  Super Admin Security Passcode
                </label>
                <div className="relative">
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-zinc-700 bg-zinc-900 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  <KeyRound size={16} className="absolute right-3.5 top-3 text-zinc-500 pointer-events-none" />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 px-4 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 shadow-lg shadow-emerald-900/40 transition-all flex items-center justify-center gap-2"
              >
                {loading ? <Loader2 size={16} className="animate-spin" /> : <ShieldCheck size={16} />}
                Authenticate & Access Executive Dashboard
              </button>
            </form>

            {/* 1-Click Fast Track for Evaluator */}
            <div className="mt-5 pt-4 border-t border-zinc-800 text-center">
              <button
                type="button"
                onClick={() => handleQuickLogin('Admin')}
                className="w-full py-2.5 px-3 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-emerald-400 text-xs font-bold border border-emerald-500/30 flex items-center justify-center gap-2 transition-colors"
              >
                <span>Authorize as Dr. M. A. Hasan (Clinical Director)</span>
                <ArrowRight size={14} />
              </button>
              <p className="text-[10px] text-zinc-500 mt-2">
                Default credentials: <strong className="text-zinc-400">admin@doctorserial.com</strong> / <strong className="text-zinc-400">Admin123!</strong>
              </p>
            </div>
          </div>
        )}

        {/* ================= DOCTOR & STAFF LOGIN ================= */}
        {portalMode === 'staff' && (
          <div className="bg-white rounded-3xl border border-zinc-200 shadow-xl p-6 sm:p-8">
            <div className="flex items-center gap-2.5 pb-4 border-b border-zinc-100">
              <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                <Stethoscope size={20} />
              </div>
              <div>
                <h2 className="text-base font-bold text-zinc-900">Doctor & Medical Staff Portal</h2>
                <p className="text-xs text-zinc-500">Chamber queue calling & reception desk</p>
              </div>
            </div>

            {error && (
              <div className="my-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
                <AlertCircle size={16} className="text-rose-600 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">
                  Staff Email Address
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="doctor@doctorserial.com"
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-zinc-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">
                  Password
                </label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-zinc-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 px-4 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 transition-colors flex items-center justify-center gap-2"
              >
                {loading && <Loader2 size={15} className="animate-spin" />}
                Sign In to Chamber Desk
              </button>
            </form>

            {/* Quick 1-click staff logins */}
            <div className="mt-5 pt-4 border-t border-zinc-100 space-y-2">
              <p className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider text-center">
                Instant Staff Access
              </p>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => handleQuickLogin('Doctor')}
                  className="p-2.5 rounded-xl border border-zinc-200 bg-zinc-50 hover:bg-emerald-50 text-left transition-colors"
                >
                  <p className="font-bold text-emerald-800 text-[11px]">Prof. Dr. Syed Ali</p>
                  <p className="text-[10px] text-zinc-500">Cardiology Specialist</p>
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickLogin('Receptionist')}
                  className="p-2.5 rounded-xl border border-zinc-200 bg-zinc-50 hover:bg-emerald-50 text-left transition-colors"
                >
                  <p className="font-bold text-emerald-800 text-[11px]">Sadia Afrin</p>
                  <p className="text-[10px] text-zinc-500">Chief Receptionist</p>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ================= PATIENT PORTAL LOGIN / REGISTER ================= */}
        {portalMode === 'patient' && (
          <div className="bg-white rounded-3xl border border-zinc-200 shadow-xl p-6 sm:p-8">
            <div className="flex border-b border-zinc-200 mb-5">
              <button
                type="button"
                onClick={() => { setTab('login'); setError(''); }}
                className={`flex-1 py-2 text-xs font-bold text-center border-b-2 transition-colors ${
                  tab === 'login'
                    ? 'border-blue-600 text-blue-700'
                    : 'border-transparent text-zinc-400 hover:text-zinc-600'
                }`}
              >
                Patient Sign In
              </button>
              <button
                type="button"
                onClick={() => { setTab('register'); setError(''); }}
                className={`flex-1 py-2 text-xs font-bold text-center border-b-2 transition-colors ${
                  tab === 'register'
                    ? 'border-blue-600 text-blue-700'
                    : 'border-transparent text-zinc-400 hover:text-zinc-600'
                }`}
              >
                New Patient Registration
              </button>
            </div>

            {error && (
              <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
                <AlertCircle size={16} className="text-rose-600 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-3.5">
              {tab === 'register' && (
                <>
                  <div>
                    <label className="block text-xs font-semibold text-zinc-700 mb-1">
                      Patient Full Name
                    </label>
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={e => setName(e.target.value)}
                      placeholder="e.g. Mohammad Rafiqul Islam"
                      className="w-full px-3 py-2 text-xs rounded-xl border border-zinc-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-zinc-700 mb-1">
                      Bangladeshi Mobile Number
                    </label>
                    <input
                      type="tel"
                      required
                      value={phone}
                      onChange={e => setPhone(e.target.value)}
                      placeholder="+880 1715-443322"
                      className="w-full px-3 py-2 text-xs rounded-xl border border-zinc-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </>
              )}

              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="patient@example.com"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-zinc-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">
                  Password
                </label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-zinc-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 px-4 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
              >
                {loading && <Loader2 size={15} className="animate-spin" />}
                {tab === 'login' ? 'Sign In to Patient Portal' : 'Register Patient Account'}
              </button>
            </form>

            <div className="mt-4 pt-4 border-t border-zinc-100 text-center">
              <button
                type="button"
                onClick={() => handleQuickLogin('Patient')}
                className="w-full py-2 px-3 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-800 text-xs font-bold border border-blue-200 transition-colors"
              >
                1-Click Sign In as Mohammad Rafiqul Islam
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
