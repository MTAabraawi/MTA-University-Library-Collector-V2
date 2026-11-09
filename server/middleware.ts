/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Small, dependency-free HTTP hardening middleware. Avoids new runtime
 * dependencies while covering the security headers, CORS allow-listing and
 * in-process rate limiting the deployment needs.
 */

import type { NextFunction, Request, Response } from 'express';
import { config } from './config.ts';

export function securityHeaders(_req: Request, res: Response, next: NextFunction) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  res.setHeader('X-Permitted-Cross-Domain-Policies', 'none');
  res.setHeader('X-DNS-Prefetch-Control', 'off');
  if (config.isProduction) {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }
  next();
}

export function apiCacheControl(_req: Request, res: Response, next: NextFunction) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Pragma', 'no-cache');
  next();
}

/**
 * A request is same-origin when its Origin header matches the Host header the
 * browser used. Browsers cannot forge Origin for a page they did not load, and
 * this keeps deployments on custom domains working without listing every
 * hostname in CORS_ORIGINS. The URL parser rejects malformed values.
 */
export function isSameOriginRequest(req: Request): boolean {
  const origin = req.headers.origin;
  const host = req.headers.host;
  if (!origin || !host) return false;
  try {
    const parsed = new URL(origin);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return false;
    return parsed.host === host;
  } catch {
    return false;
  }
}

/**
 * CORS that only echoes explicitly allowed origins. Same-origin requests have
 * no Origin header on some clients and are always allowed. Unknown browser
 * origins are rejected for pre-flight requests and receive no CORS approval.
 */
export function corsPolicy(req: Request, res: Response, next: NextFunction) {
  const origin = req.headers.origin;
  if (!origin) return next();

  if (config.allowedOrigins.includes(origin) || isSameOriginRequest(req)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PATCH,PUT,DELETE,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Session-Token');
    res.setHeader('Access-Control-Max-Age', '600');
    if (req.method === 'OPTIONS') return res.sendStatus(204);
    return next();
  }

  if (req.method === 'OPTIONS') {
    return res.status(403).json({ error: 'Origin not allowed' });
  }
  return res.status(403).json({ error: 'Origin not allowed' });
}

interface RateBucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, RateBucket>();
let lastCleanup = Date.now();

function cleanupBuckets(now: number) {
  if (now - lastCleanup < 60_000) return;
  lastCleanup = now;
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
}

export interface RateLimitOptions {
  windowMs: number;
  max: number;
  keyPrefix: string;
  message?: string;
}

export function rateLimit({ windowMs, max, keyPrefix, message }: RateLimitOptions) {
  return (req: Request, res: Response, next: NextFunction) => {
    const now = Date.now();
    cleanupBuckets(now);
    // Include the shared secret-free identity of the caller only; never store
    // request bodies or credentials in limiter keys.
    const key = `${keyPrefix}:${req.ip || 'unknown'}`;
    let bucket = buckets.get(key);

    if (!bucket || bucket.resetAt <= now) {
      bucket = { count: 0, resetAt: now + windowMs };
      buckets.set(key, bucket);
    }

    bucket.count += 1;
    const remaining = Math.max(0, max - bucket.count);
    res.setHeader('RateLimit-Limit', String(max));
    res.setHeader('RateLimit-Remaining', String(remaining));
    res.setHeader('RateLimit-Reset', String(Math.ceil(bucket.resetAt / 1000)));

    if (bucket.count > max) {
      res.setHeader('Retry-After', String(Math.ceil((bucket.resetAt - now) / 1000)));
      return res.status(429).json({
        error: message || 'Too many requests. Please wait and try again later.',
      });
    }
    return next();
  };
}

/** Test helper: clears all in-memory rate limit buckets. */
export function resetRateLimits() {
  buckets.clear();
}

/**
 * Reject state-changing requests whose browser Origin is present but not in
 * the allow-list. Bearer-token auth already avoids cookie CSRF, but this adds
 * defence in depth for browsers and for future cookie use.
 */
export function sameOriginMutationGuard(req: Request, res: Response, next: NextFunction) {
  if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) return next();
  const origin = req.headers.origin;
  if (!origin) return next();
  if (config.allowedOrigins.includes(origin) || isSameOriginRequest(req)) return next();
  return res.status(403).json({ error: 'Cross-origin request rejected' });
}
