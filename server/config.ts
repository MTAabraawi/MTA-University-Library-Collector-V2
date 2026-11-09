/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Central runtime configuration for MTA University Library Collector.
 * Nothing in this file contains a secret value: everything is read from the
 * environment or falls back to a safe, non-production default.
 */

import path from 'node:path';
import dotenv from 'dotenv';

dotenv.config();

function intFromEnv(name: string, fallback: number, min: number, max: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed) || parsed < min || parsed > max) {
    console.warn(`[config] Ignoring invalid ${name}; using ${fallback}`);
    return fallback;
  }
  return parsed;
}

function boolFromEnv(name: string, fallback = false): boolean {
  const raw = process.env[name];
  if (raw === undefined) return fallback;
  return ['1', 'true', 'yes', 'on'].includes(raw.toLowerCase());
}

const projectRoot = process.cwd();
const nodeEnv = process.env.NODE_ENV === 'production' ? 'production' : 'development';

const defaultOrigins = [
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'capacitor://localhost',
  'https://localhost',
];

const configuredOrigins = (process.env.CORS_ORIGINS || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

export const config = {
  nodeEnv,
  isProduction: nodeEnv === 'production',
  port: intFromEnv('PORT', 3000, 1, 65535),
  host: process.env.HOST || '0.0.0.0',

  projectRoot,
  dataDir: path.resolve(process.env.MTA_DATA_DIR || path.join(projectRoot, 'data')),
  dbPath: path.resolve(
    process.env.MTA_DB_PATH || path.join(process.env.MTA_DATA_DIR || path.join(projectRoot, 'data'), 'mta_academic.db'),
  ),
  uploadsDir: path.resolve(
    process.env.MTA_UPLOADS_DIR ||
      path.join(process.env.MTA_DATA_DIR || path.join(projectRoot, 'data'), 'uploads'),
  ),

  sessionDays: intFromEnv('SESSION_DAYS', 7, 1, 90),
  maxUploadBytes: intFromEnv('MAX_UPLOAD_MB', 25, 1, 100) * 1024 * 1024,
  jsonLimit: process.env.JSON_BODY_LIMIT || '2mb',

  allowedOrigins: configuredOrigins.length > 0 ? configuredOrigins : defaultOrigins,
  trustProxy: boolFromEnv('TRUST_PROXY', false),

  // Optional third-party integrations. All are disabled unless explicitly
  // configured by the platform owner. Advertising is always off by default.
  adsEnabled: boolFromEnv('MTA_ADS_ENABLED', false),
  analyticsEnabled: boolFromEnv('MTA_ANALYTICS_ENABLED', false),
  firebaseEnabled: boolFromEnv('MTA_FIREBASE_ENABLED', false),

  // Operational limits. They are deliberately conservative for a public,
  // unauthenticated submission endpoint.
  uploadRateLimitPerHour: intFromEnv('UPLOAD_RATE_LIMIT_PER_HOUR', 5, 1, 1000),
  loginRateLimitPer15Min: intFromEnv('LOGIN_RATE_LIMIT_PER_15_MIN', 10, 1, 1000),
  registerRateLimitPerHour: intFromEnv('REGISTER_RATE_LIMIT_PER_HOUR', 5, 1, 1000),
  reportRateLimitPerHour: intFromEnv('REPORT_RATE_LIMIT_PER_HOUR', 10, 1, 1000),

  // Seeding can be disabled for tests or for a curated production database.
  skipSeed: boolFromEnv('MTA_SKIP_SEED', false),
} as const;

export const QUARANTINE_DIR = path.join(config.uploadsDir, 'quarantine');
export const APPROVED_DIR = path.join(config.uploadsDir, 'approved');
export const BACKUPS_DIR = path.join(config.dataDir, 'backups');
