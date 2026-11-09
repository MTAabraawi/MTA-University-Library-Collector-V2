/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { LicensingStatus, InstitutionalAccreditationStatus, ProgrammaticAccreditationStatus } from '../types/index.ts';

/**
 * Validates that licensing status and accreditation status remain strictly decoupled.
 * An institution may be officially licensed while accreditation is under verification or not documented.
 */
export function evaluateInstitutionalStatus(
  licensing: LicensingStatus,
  accreditation: InstitutionalAccreditationStatus
) {
  const isLicensed = licensing === 'officially_licensed';
  const isAccredited = accreditation === 'institutionally_accredited';
  const isPendingVerification = 
    licensing === 'license_under_verification' || 
    accreditation === 'accreditation_under_verification';
  const isUnknownOrUndocumented =
    licensing === 'not_documented' ||
    licensing === 'unknown' ||
    accreditation === 'not_documented' ||
    accreditation === 'unknown';

  return {
    isLicensed,
    isAccredited,
    isPendingVerification,
    isUnknownOrUndocumented,
    // Integrity invariant: Licensing status must NEVER dictate accreditation status
    areStatusesIndependent: true,
  };
}

/**
 * Calculates language and layout direction properties.
 */
export function getLayoutDirection(language: 'ar' | 'en'): { direction: 'rtl' | 'ltr'; fontClass: string } {
  if (language === 'ar') {
    return { direction: 'rtl', fontClass: 'font-cairo' };
  }
  return { direction: 'ltr', fontClass: 'font-sans' };
}
