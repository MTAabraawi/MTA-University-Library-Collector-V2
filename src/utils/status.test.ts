/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { evaluateInstitutionalStatus, getLayoutDirection } from './status.ts';

test('status evaluation decouples licensing from accreditation', () => {
  // Case A: Institution is licensed, but accreditation is not documented
  const resA = evaluateInstitutionalStatus('officially_licensed', 'not_documented');
  assert.equal(resA.isLicensed, true);
  assert.equal(resA.isAccredited, false);
  assert.equal(resA.isUnknownOrUndocumented, true);

  // Case B: Institution is licensed and institutionally accredited
  const resB = evaluateInstitutionalStatus('officially_licensed', 'institutionally_accredited');
  assert.equal(resB.isLicensed, true);
  assert.equal(resB.isAccredited, true);

  // Case C: Institution licensing is under verification
  const resC = evaluateInstitutionalStatus('license_under_verification', 'unknown');
  assert.equal(resC.isLicensed, false);
  assert.equal(resC.isPendingVerification, true);
  assert.equal(resC.isUnknownOrUndocumented, true);
});

test('layout direction correctly switches between RTL for Arabic and LTR for English', () => {
  const arLayout = getLayoutDirection('ar');
  assert.equal(arLayout.direction, 'rtl');

  const enLayout = getLayoutDirection('en');
  assert.equal(enLayout.direction, 'ltr');
});
