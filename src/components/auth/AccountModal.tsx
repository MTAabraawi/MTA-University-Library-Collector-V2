/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useLanguage } from '../../context/LanguageContext.tsx';
import { useAuth, roleLabel } from '../../context/AuthContext.tsx';
import { api, ApiError } from '../../services/api.ts';
import { X, User, KeyRound, Trash2, AlertCircle, CheckCircle2, Loader2, LogOut, ShieldCheck } from 'lucide-react';

interface AccountModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AccountModal: React.FC<AccountModalProps> = ({ isOpen, onClose }) => {
  const { language } = useLanguage();
  const { user, setUser, logout } = useAuth();
  const [fullName, setFullName] = useState(user?.fullName || '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (!isOpen || !user) return null;

  const handleProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setBusy(true);
    try {
      const result = await api.updateProfile({ fullName: fullName.trim() });
      setUser(result.user);
      setMessage(language === 'ar' ? 'تم تحديث الملف الشخصي.' : 'Profile updated.');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Update failed');
    } finally {
      setBusy(false);
    }
  };

  const handlePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setBusy(true);
    try {
      const result = await api.changePassword(currentPassword, newPassword);
      localStorage.setItem('mta_session_token', result.token);
      setCurrentPassword('');
      setNewPassword('');
      setMessage(language === 'ar' ? 'تم تغيير كلمة المرور وإبطال الجلسات الأخرى.' : 'Password changed; other sessions were signed out.');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Password change failed');
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async () => {
    const confirmation = window.prompt(
      language === 'ar'
        ? 'هذا الإجراء نهائي. اكتب DELETE لحذف حسابك وبياناتك الشخصية.'
        : 'This is permanent. Type DELETE to remove your account and personal data.',
    );
    if (confirmation !== 'DELETE') return;
    setBusy(true);
    setError(null);
    try {
      await api.deleteAccount();
      await logout();
      onClose();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Account deletion failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 dark:bg-black/70 flex items-center justify-center p-4">
      <div className="relative w-full max-w-lg bg-white dark:bg-[#0c1830] rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 p-6" role="dialog" aria-modal="true">
        <button onClick={onClose} className="absolute top-4 end-4 p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800" aria-label="Close">
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-5">
          <div className="w-11 h-11 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-lg">
            {user.fullName.charAt(0).toUpperCase()}
          </div>
          <div>
            <h3 className="font-bold text-slate-900 dark:text-white">{user.fullName}</h3>
            <div className="text-xs text-slate-500 flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-amber-500" />
              <span>{roleLabel(user.role, language)}</span>
              <span>·</span>
              <span>{user.email}</span>
            </div>
          </div>
        </div>

        {message && (
          <div className="mb-4 p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-700 dark:text-emerald-300 flex gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" /> {message}
          </div>
        )}
        {error && (
          <div className="mb-4 p-3 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-xs text-red-700 dark:text-red-300 flex gap-2" role="alert">
            <AlertCircle className="w-4 h-4 shrink-0" /> {error}
          </div>
        )}

        <form onSubmit={handleProfile} className="space-y-3 pb-5 border-b border-slate-200 dark:border-slate-800">
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
            {language === 'ar' ? 'الاسم الكامل' : 'Full name'}
          </label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <User className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full ps-9 pe-3 py-2 text-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white outline-none"
                required
              />
            </div>
            <button disabled={busy} className="px-4 py-2 rounded-xl text-xs font-semibold bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60">
              {language === 'ar' ? 'حفظ' : 'Save'}
            </button>
          </div>
        </form>

        <form onSubmit={handlePassword} className="space-y-3 py-5 border-b border-slate-200 dark:border-slate-800">
          <div className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
            <KeyRound className="w-4 h-4 text-amber-500" />
            {language === 'ar' ? 'تغيير كلمة المرور' : 'Change password'}
          </div>
          <input
            type="password"
            autoComplete="current-password"
            placeholder={language === 'ar' ? 'كلمة المرور الحالية' : 'Current password'}
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white outline-none"
            required
          />
          <input
            type="password"
            autoComplete="new-password"
            placeholder={language === 'ar' ? 'كلمة المرور الجديدة (10 أحرف على الأقل)' : 'New password (min. 10 characters)'}
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white outline-none"
            required
          />
          <button disabled={busy} className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-slate-800 text-white hover:bg-slate-900 disabled:opacity-60">
            {busy && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            {language === 'ar' ? 'تحديث كلمة المرور' : 'Update password'}
          </button>
        </form>

        <div className="pt-4 flex flex-wrap items-center justify-between gap-2">
          <button
            onClick={async () => { await logout(); onClose(); }}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200"
          >
            <LogOut className="w-4 h-4" />
            {language === 'ar' ? 'تسجيل الخروج' : 'Sign out'}
          </button>
          <button
            onClick={handleDelete}
            disabled={busy || user.role === 'super_admin'}
            title={user.role === 'super_admin' ? (language === 'ar' ? 'لا يمكن حذف حساب المدير الأعلى' : 'The super administrator account cannot be self-deleted') : undefined}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 disabled:opacity-40"
          >
            <Trash2 className="w-4 h-4" />
            {language === 'ar' ? 'حذف حسابي' : 'Delete my account'}
          </button>
        </div>
      </div>
    </div>
  );
};
