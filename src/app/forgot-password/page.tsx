'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '../../context/AuthContext';
import { Mail, ArrowLeft, ArrowRight, ShieldCheck } from 'lucide-react';

export default function ForgotPasswordPage() {
  const { resetPassword } = useAuth();
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      await resetPassword(email);
      setSubmitted(true);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to send recovery link. Verify your email.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#06070a] flex items-center justify-center p-6 relative overflow-hidden selection:bg-indigo-500/30 selection:text-indigo-200">
      {/* Decorative Blur Backdrops */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] radial-glow pointer-events-none z-0"></div>

      <div className="w-full max-w-md relative z-10">
        
        {/* Logo Branding */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center font-bold text-white shadow-xl shadow-indigo-500/25 mb-4">
            TM
          </div>
          <h2 className="text-2xl font-bold tracking-wider text-slate-100">Recovery Password</h2>
          <p className="text-sm text-slate-400 mt-1">We will send you a secure link to reset it</p>
        </div>

        {/* Card Form */}
        <div className="glass-panel rounded-3xl p-8 border border-slate-800/40 shadow-2xl relative overflow-hidden">
          
          {/* Top colored accent line */}
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-indigo-500 via-violet-500 to-cyan-500"></div>

          {submitted ? (
            <div className="space-y-6 text-center py-4">
              <div className="w-14 h-14 rounded-full bg-emerald-500/10 border border-emerald-500/35 flex items-center justify-center text-emerald-400 mx-auto shadow-inner">
                <ShieldCheck className="w-7 h-7" />
              </div>
              <div className="space-y-2">
                <h3 className="text-slate-100 font-semibold text-lg">Check your inbox</h3>
                <p className="text-slate-400 text-xs leading-relaxed max-w-xs mx-auto">
                  We've sent a password reset link to <strong className="text-indigo-300 font-medium">{email}</strong>. Please check your spam folder if you don't receive it in 2 minutes.
                </p>
              </div>
              <Link
                href="/login"
                className="inline-flex items-center gap-2 text-sm font-semibold text-indigo-400 hover:text-indigo-300 transition-all mt-4"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Sign In
              </Link>
            </div>
          ) : (
            <>
              {error && (
                <div className="mb-6 p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-medium">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-5">
                {/* Email Field */}
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-widest mb-2">Registered Email</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                      <Mail className="w-4 h-4" />
                    </div>
                    <input
                      type="email"
                      required
                      placeholder="name@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-950/60 border border-slate-800 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500/60 focus:ring-1 focus:ring-indigo-500/30 text-sm transition-all"
                    />
                  </div>
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-600 text-white font-semibold text-sm hover:from-indigo-600 hover:to-violet-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 disabled:opacity-50 transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-indigo-500/10"
                >
                  {submitting ? (
                    <div className="w-5 h-5 rounded-full border-2 border-white/20 border-t-white animate-spin"></div>
                  ) : (
                    <>
                      Send Recovery Instructions
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>

              <div className="text-center mt-6">
                <Link
                  href="/login"
                  className="inline-flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-slate-200 transition-colors"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  Cancel and return
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
