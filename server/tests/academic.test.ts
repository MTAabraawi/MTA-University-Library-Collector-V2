/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { db, hashPassword, verifyPassword } from '../db/index.ts';
import { universities, countries, courses, coursePrerequisites, users } from '../db/schema.ts';
import { eq } from 'drizzle-orm';
import { PrerequisiteDAGValidator } from '../utils/dag.ts';
import fs from 'fs';
import path from 'path';

test('Database persistence: baseline institutions and countries survive and are queryable', () => {
  const allCountries = db.select().from(countries).all();
  assert.ok(allCountries.length >= 1, 'At least one country (Yemen) should be seeded');
  assert.equal(allCountries[0].code, 'YE');

  const allUnivs = db.select().from(universities).all();
  assert.ok(allUnivs.length >= 5, 'Multiple identifiable universities should be in database');

  // Verify Sana'a University decoupled licensing vs accreditation
  const sanaaUniv = allUnivs.find((u) => u.nameAr === 'جامعة صنعاء');
  assert.ok(sanaaUniv, "Sana'a University must exist in the database");
  assert.equal(sanaaUniv.licensingStatus, 'officially_licensed');
  assert.equal(sanaaUniv.accreditationStatus, 'institutionally_accredited');

  // Verify Aden Community College: officially licensed but accreditation is not documented
  const adenCC = allUnivs.find((u) => u.nameAr === 'كلية المجتمع عدن');
  assert.ok(adenCC, 'Aden Community College must exist');
  assert.equal(adenCC.licensingStatus, 'officially_licensed');
  assert.equal(adenCC.accreditationStatus, 'not_documented');
});

test('DAG Engine: Prerequisite cycle detection prevents circular dependencies', () => {
  // Existing chain: Course 1 -> requires -> Course 2 -> requires -> Course 3
  const edges = [
    { courseId: 1, prerequisiteCourseId: 2 },
    { courseId: 2, prerequisiteCourseId: 3 },
  ];

  // Case A: Adding 3 -> requires -> 4 is safe (acyclic)
  const validCheck = PrerequisiteDAGValidator.wouldCreateCycle(edges, 3, 4);
  assert.equal(validCheck.hasCycle, false, 'Adding linear prerequisite must not report cycle');

  // Case B: Adding 3 -> requires -> 1 creates a circular cycle: 1 -> 2 -> 3 -> 1
  const cycleCheck = PrerequisiteDAGValidator.wouldCreateCycle(edges, 3, 1);
  assert.equal(cycleCheck.hasCycle, true, 'Circular prerequisite must be rejected');
  assert.ok(cycleCheck.cyclePath && cycleCheck.cyclePath.length > 0);

  // Case C: Self-dependency (Course 1 requires Course 1)
  const selfCheck = PrerequisiteDAGValidator.wouldCreateCycle(edges, 1, 1);
  assert.equal(selfCheck.hasCycle, true, 'Self prerequisite must be rejected');
});

test('Security & Authentication: scrypt password hashing functions accurately', () => {
  const rawSecret = 'AcademicSecurePassword#2026';
  const hashed = hashPassword(rawSecret);

  assert.ok(hashed.includes(':'), 'Hash must contain salt delimiter');
  assert.equal(verifyPassword(rawSecret, hashed), true, 'Valid password must verify true');
  assert.equal(verifyPassword('WrongPassword', hashed), false, 'Invalid password must verify false');
});

test('Super Admin account provisioned with super_admin role', () => {
  const superAdmin = db.select().from(users).where(eq(users.role, 'super_admin')).get();
  assert.ok(superAdmin, 'Super Admin must exist in database');
  assert.equal(superAdmin.email, 'admin@mta-tech.ye');
  assert.equal(superAdmin.role, 'super_admin');
});
