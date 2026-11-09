/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useLanguage } from '../../context/LanguageContext.tsx';

interface BrandLogoProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'hero';
  showText?: boolean;
  showTagline?: boolean;
  className?: string;
  onClick?: () => void;
}

export const BrandLogo: React.FC<BrandLogoProps> = ({
  size = 'md',
  showText = true,
  showTagline = false,
  className = '',
  onClick,
}) => {
  const { language, t } = useLanguage();
  const [imgError, setImgError] = useState(false);

  const officialLogoPath = '/assets/aistudio/file_000000008f0c8208a573745f6d020559_0abfe1a5.png';

  const sizeClasses = {
    xs: 'w-7 h-7',
    sm: 'w-9 h-9',
    md: 'w-11 h-11',
    lg: 'w-16 h-16',
    xl: 'w-24 h-24',
    hero: 'w-36 h-36 md:w-44 md:h-44',
  };

  const textClasses = {
    xs: 'text-xs',
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg',
    xl: 'text-2xl',
    hero: 'text-3xl md:text-4xl',
  };

  return (
    <div
      onClick={onClick}
      className={`inline-flex items-center gap-3 select-none ${onClick ? 'cursor-pointer' : ''} ${className}`}
    >
      {/* Icon frame with golden glow border */}
      <div
        className={`relative ${sizeClasses[size]} shrink-0 rounded-xl overflow-hidden shadow-md shadow-blue-950/20 ring-1 ring-amber-400/40 bg-[#0a192f] flex items-center justify-center transition-transform hover:scale-105 duration-200`}
      >
        {!imgError ? (
          <img
            src={officialLogoPath}
            alt="MTA University Library Collector Logo"
            className="w-full h-full object-cover"
            onError={() => setImgError(true)}
            referrerPolicy="no-referrer"
          />
        ) : (
          /* High-fidelity SVG Fallback matching official icon motif */
          <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-[#0a192f] via-[#102a4e] to-[#070e1c] p-1.5 text-amber-400">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="w-2/3 h-2/3 text-amber-400"
            >
              <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z" />
              <path d="M6 6h10" />
              <path d="M6 10h10" />
              <path d="M22 6l-10-4-10 4 10 4 10-4z" />
            </svg>
          </div>
        )}
      </div>

      {/* Brand Text Lockup */}
      {showText && (
        <div className="hidden sm:flex flex-col justify-center min-w-0">
          <div className="flex items-center gap-1.5">
            <span
              className={`font-bold tracking-tight text-slate-900 dark:text-white ${textClasses[size]} truncate max-w-[150px] xs:max-w-[180px] sm:max-w-none leading-tight`}
            >
              MTA University Library Collector
            </span>
          </div>

          <div className="hidden sm:flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 leading-none mt-0.5">
            <span className="font-semibold text-blue-600 dark:text-blue-400">
              MTA TECHNOLOGIES
            </span>
            {showTagline && (
              <>
                <span aria-hidden="true" className="text-amber-500">·</span>
                <span className="text-amber-600 dark:text-amber-400 font-medium">
                  {t.brand.tagline}
                </span>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
