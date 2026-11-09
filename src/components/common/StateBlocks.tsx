/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Shared, honest loading / empty / error states used by data-backed views.
 */

import React from 'react';
import { AlertTriangle, Inbox, Loader2, RefreshCw } from 'lucide-react';

export const LoadingState: React.FC<{ label: string; compact?: boolean }> = ({ label, compact }) => (
  <div
    className={`flex flex-col items-center justify-center gap-3 text-slate-500 dark:text-slate-400 ${
      compact ? 'py-10' : 'py-20'
    }`}
    role="status"
    aria-live="polite"
  >
    <Loader2 className="w-6 h-6 animate-spin text-blue-600 dark:text-blue-400" />
    <span className="text-sm">{label}</span>
  </div>
);

export const ErrorState: React.FC<{ message: string; onRetry?: () => void }> = ({ message, onRetry }) => (
  <div className="text-center py-12 px-4 rounded-2xl bg-red-50/60 dark:bg-red-950/20 border border-red-200 dark:border-red-900/50">
    <AlertTriangle className="w-8 h-8 text-red-500 mx-auto mb-2" />
    <p className="text-sm font-semibold text-red-800 dark:text-red-300">{message}</p>
    {onRetry && (
      <button
        onClick={onRetry}
        className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white dark:bg-slate-900 border border-red-200 dark:border-red-900 text-red-700 dark:text-red-300"
      >
        <RefreshCw className="w-3.5 h-3.5" />
        Retry
      </button>
    )}
  </div>
);

export const EmptyState: React.FC<{
  title: string;
  description?: string;
  action?: React.ReactNode;
}> = ({ title, description, action }) => (
  <div className="text-center py-14 px-4 rounded-2xl bg-white dark:bg-[#0c1830] border border-slate-200 dark:border-slate-800">
    <Inbox className="w-9 h-9 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
    <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">{title}</h3>
    {description && (
      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto leading-relaxed">{description}</p>
    )}
    {action && <div className="mt-4">{action}</div>}
  </div>
);

export const statusTone = (status: string): string => {
  if (
    ['officially_licensed', 'institutionally_accredited', 'programmatically_accredited', 'verified_complete', 'published', 'approved', 'verified'].includes(
      status,
    )
  ) {
    return 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800';
  }
  if (
    ['not_accredited', 'unlicensed', 'revoked', 'suspended', 'rejected', 'quarantine'].includes(status)
  ) {
    return 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-800';
  }
  if (
    ['under_verification', 'accreditation_under_verification', 'license_under_verification', 'partially_verified', 'candidate_status', 'needs_update', 'screening', 'pending_review', 'pending_academic_review', 'submitted'].includes(
      status,
    )
  ) {
    return 'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800';
  }
  return 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700';
};
