/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useLanguage } from '../../context/LanguageContext.tsx';
import { useAuth } from '../../context/AuthContext.tsx';
import { X, ShieldCheck, Lock, Mail, User, AlertCircle, Loader2 } from 'lucide-react';
import { BrandLogo } from '../brand/BrandLogo.tsx';
import { ApiError } from '../../services/api.ts';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const { t, language } = useLanguage();
  const { login, register } = useAuth();
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!email || !password) {
      setErrorMessage(language === 'ar' ? 'يرجى إدخال البريد الإلكتروني وكلمة المرور' : 'Please provide both email and password');
      return;
    }
    if (authMode === 'register' && !name.trim()) {
      setErrorMessage(language === 'ar' ? 'يرجى إدخال الاسم الكامل' : 'Please enter your full name');
      return;
    }
    if (authMode === 'register' && (password.length < 10 || !/[A-Za-z]/.test(password) || !/\d/.test(password))) {
      setErrorMessage(
        language === 'ar'
          ? 'كلمة المرور يجب ألا تقل عن 10 أحرف وتحتوي على حرف ورقم على الأقل.'
          : 'Password must be at least 10 characters and contain at least one letter and one number.',
      );
      return;
    }

    setIsSubmitting(true);
    try {
      if (authMode === 'login') await login(email.trim(), password);
      else await register(email.trim(), password, name.trim());
      setPassword('');
      setName('');
      onSuccess?.();
      onClose();
    } catch (err) {
      const message = err instanceof ApiError ? err.message : language === 'ar' ? 'تعذر إكمال العملية' : 'The request could not be completed';
      setErrorMessage(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 dark:bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
      <div
        className="relative w-full max-w-md bg-white dark:bg-[#0c1830] rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden p-6 sm:p-8 animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={authMode === 'login' ? t.nav.signIn : 'Create account'}
      >
        <button
          onClick={onClose}
          className="absolute top-4 end-4 p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          aria-label={t.common.close}
        >
          <X className="w-5 h-5" />
        </button>

        <div className="text-center mb-6">
          <div className="flex justify-center mb-3">
            <BrandLogo size="md" showText={false} />
          </div>
          <h3 className="text-xl font-bold text-slate-900 dark:text-white">
            {authMode === 'login' ? t.nav.signIn : language === 'ar' ? 'إنشاء حساب جديد' : 'Create Account'}
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {language === 'ar'
              ? 'الوصول للمكتبة الشخصية، قوائم القراءة، ولوحة الإدارة الأكاديمية'
              : 'Access your personal library, reading lists, and the academic administration console'}
          </p>
        </div>

        <div className="mb-5 p-3 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/60 text-xs text-blue-800 dark:text-blue-300 flex items-start gap-2.5">
          <ShieldCheck className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
          <span>
            {language === 'ar'
              ? 'الجلسات محمية برموز مجزأة (SHA-256) وكلمات المرور مشفرة بـ Scrypt. لا توجد كلمات مرور افتراضية في الكود المصدري.'
              : 'Sessions use hashed bearer tokens (SHA-256) and passwords are hashed with Scrypt. No default password is stored in source code.'}
          </span>
        </div>

        {errorMessage && (
          <div className="mb-4 p-3 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/60 text-xs text-red-700 dark:text-red-300 flex items-center gap-2" role="alert">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {authMode === 'register' && (
            <div>
              <label htmlFor="auth-name" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                {language === 'ar' ? 'الاسم الكامل' : 'Full Name'}
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 start-0 flex items-center ps-3 pointer-events-none text-slate-400">
                  <User className="w-4 h-4" />
                </div>
                <input
                  id="auth-name"
                  type="text"
                  autoComplete="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full ps-9 pe-3 py-2 text-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-blue-500 text-slate-900 dark:text-white"
                  required
                />
              </div>
            </div>
          )}

          <div>
            <label htmlFor="auth-email" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              {language === 'ar' ? 'البريد الإلكتروني' : 'Email Address'}
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 start-0 flex items-center ps-3 pointer-events-none text-slate-400">
                <Mail className="w-4 h-4" />
              </div>
              <input
                id="auth-email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full ps-9 pe-3 py-2 text-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-blue-500 text-slate-900 dark:text-white"
                required
              />
            </div>
          </div>

          <div>
            <label htmlFor="auth-password" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              {language === 'ar' ? 'كلمة المرور' : 'Password'}
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 start-0 flex items-center ps-3 pointer-events-none text-slate-400">
                <Lock className="w-4 h-4" />
              </div>
              <input
                id="auth-password"
                type="password"
                autoComplete={authMode === 'login' ? 'current-password' : 'new-password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={authMode === 'register' ? '••••••••••' : ''}
                className="w-full ps-9 pe-3 py-2 text-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-blue-500 text-slate-900 dark:text-white"
                required
              />
            </div>
            {authMode === 'register' && (
              <p className="mt-1 text-[11px] text-slate-400">
                {language === 'ar' ? '10 أحرف على الأقل، مع حرف ورقم.' : 'At least 10 characters, including a letter and a number.'}
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-2.5 px-4 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-md transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
            {authMode === 'login' ? t.nav.signIn : language === 'ar' ? 'إنشاء حساب جديد' : 'Register'}
          </button>
        </form>

        <div className="mt-5 text-center text-xs text-slate-500 dark:text-slate-400">
          {authMode === 'login' ? (
            <button
              onClick={() => { setAuthMode('register'); setErrorMessage(''); }}
              className="text-blue-600 dark:text-blue-400 font-semibold hover:underline"
            >
              {language === 'ar' ? 'ليس لديك حساب؟ سجّل كباحث أو طالب جديد' : "Don't have an account? Register as a student or researcher"}
            </button>
          ) : (
            <button
              onClick={() => { setAuthMode('login'); setErrorMessage(''); }}
              className="text-blue-600 dark:text-blue-400 font-semibold hover:underline"
            >
              {language === 'ar' ? 'لديك حساب بالفعل؟ تسجيل الدخول' : 'Already have an account? Sign in'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
