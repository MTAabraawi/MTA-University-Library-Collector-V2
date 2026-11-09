/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Router, Request, Response, NextFunction } from 'express';
import { db, hashPassword, verifyPassword } from '../db/index.ts';
import { users, sessions, userSavedItems, readingLists, readingListItems, verificationAuditLogs } from '../db/schema.ts';
import { and, eq, lt } from 'drizzle-orm';
import crypto from 'crypto';
import { z } from 'zod';
import { config } from '../config.ts';
import { rateLimit } from '../middleware.ts';

export const authRouter = Router();

export type UserRole =
  | 'super_admin'
  | 'admin'
  | 'academic_editor'
  | 'academic_reviewer'
  | 'regular_user';

export interface AuthenticatedUser {
  id: number;
  email: string;
  fullName: string;
  role: UserRole;
  institutionId: number | null;
}

const ROLES: UserRole[] = ['super_admin', 'admin', 'academic_editor', 'academic_reviewer', 'regular_user'];
const PRIVILEGED_ROLES: UserRole[] = ['super_admin', 'admin', 'academic_editor', 'academic_reviewer'];

/** Hashes a bearer token before it is stored, so a database leak cannot be replayed. */
function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function passwordIsStrong(password: string): boolean {
  return password.length >= 10 && /[A-Za-z]/.test(password) && /\d/.test(password);
}

const RegisterSchema = z.object({
  email: z.string().email().max(320),
  password: z
    .string()
    .min(10, 'Password must be at least 10 characters')
    .max(200, 'Password is too long')
    .refine(passwordIsStrong, 'Password must contain at least one letter and one number'),
  fullName: z.string().trim().min(2).max(160),
});

const LoginSchema = z.object({
  email: z.string().email().max(320),
  password: z.string().min(1).max(200),
});

const ProfileSchema = z.object({
  fullName: z.string().trim().min(2).max(160).optional(),
  avatarUrl: z.string().url().max(1000).nullable().optional(),
  institutionId: z.number().int().positive().nullable().optional(),
});

const PasswordChangeSchema = z.object({
  currentPassword: z.string().min(1).max(200),
  newPassword: z
    .string()
    .min(10)
    .max(200)
    .refine(passwordIsStrong, 'Password must contain at least one letter and one number'),
});

/**
 * Resolves the caller from a hashed session token. It never trusts a client
 * supplied role. Expired sessions are removed lazily.
 */
export async function authenticate(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  const rawToken = authHeader?.startsWith('Bearer ')
    ? authHeader.slice(7).trim()
    : typeof req.headers['x-session-token'] === 'string'
      ? req.headers['x-session-token']
      : '';

  if (!rawToken) {
    (req as any).user = null;
    return next();
  }

  try {
    const tokenHash = hashToken(rawToken);
    const sessionRow = db.select().from(sessions).where(eq(sessions.token, tokenHash)).get();
    if (!sessionRow) {
      (req as any).user = null;
      return next();
    }

    if (new Date(sessionRow.expiresAt).getTime() <= Date.now()) {
      db.delete(sessions).where(eq(sessions.token, tokenHash)).run();
      (req as any).user = null;
      return next();
    }

    const userRow = db.select().from(users).where(eq(users.id, sessionRow.userId)).get();
    if (!userRow || !userRow.isActive) {
      (req as any).user = null;
      return next();
    }

    (req as any).user = {
      id: userRow.id,
      email: userRow.email,
      fullName: userRow.fullName,
      role: userRow.role as UserRole,
      institutionId: userRow.institutionId ?? null,
    } satisfies AuthenticatedUser;
    (req as any).sessionTokenHash = tokenHash;
    return next();
  } catch {
    (req as any).user = null;
    return next();
  }
}

export function requireRole(...allowedRoles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = (req as any).user as AuthenticatedUser | null;
    if (!user) return res.status(401).json({ error: 'Authentication required' });
    if (!allowedRoles.includes(user.role)) {
      return res.status(403).json({ error: 'Access denied: insufficient privileges' });
    }
    return next();
  };
}

export function requireAnyPrivilegedRole(req: Request, res: Response, next: NextFunction) {
  const user = (req as any).user as AuthenticatedUser | null;
  if (!user) return res.status(401).json({ error: 'Authentication required' });
  if (!PRIVILEGED_ROLES.includes(user.role)) {
    return res.status(403).json({ error: 'Access denied: staff role required' });
  }
  return next();
}

export function canModerate(role: string): boolean {
  return ['super_admin', 'admin', 'academic_reviewer'].includes(role);
}

export function canEditContent(role: string): boolean {
  return ['super_admin', 'admin', 'academic_editor'].includes(role);
}

function createSession(userId: number, req: Request): string {
  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + config.sessionDays * 24 * 60 * 60 * 1000).toISOString();
  db.delete(sessions).where(lt(sessions.expiresAt, new Date().toISOString())).run();
  db.insert(sessions)
    .values({
      id: crypto.randomUUID(),
      userId,
      token: hashToken(token),
      expiresAt,
      ipAddress: req.ip || '',
      userAgent: (req.headers['user-agent'] || '').slice(0, 500),
    })
    .run();
  return token;
}

function publicUser(user: typeof users.$inferSelect) {
  return {
    id: user.id,
    email: user.email,
    fullName: user.fullName,
    role: user.role,
    institutionId: user.institutionId,
    avatarUrl: user.avatarUrl,
    isActive: Boolean(user.isActive),
    createdAt: user.createdAt,
  };
}

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: config.loginRateLimitPer15Min,
  keyPrefix: 'login',
  message: 'Too many sign-in attempts. Please wait 15 minutes and try again.',
});

const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: config.registerRateLimitPerHour,
  keyPrefix: 'register',
  message: 'Too many accounts created from this address. Please try again later.',
});

// POST /api/auth/register
authRouter.post('/register', registerLimiter, (req: Request, res: Response) => {
  const parsed = RegisterSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0]?.message || 'Invalid input data' });
  }

  const email = parsed.data.email.toLowerCase().trim();
  try {
    if (db.select().from(users).where(eq(users.email, email)).get()) {
      return res.status(409).json({ error: 'Email address already registered' });
    }
    if (db.select().from(users).where(eq(users.role, 'super_admin')).all().length === 0) {
      return res.status(503).json({ error: 'Administrator account has not been provisioned' });
    }

    const created = db
      .insert(users)
      .values({
        email,
        passwordHash: hashPassword(parsed.data.password),
        fullName: parsed.data.fullName,
        role: 'regular_user',
        isActive: true,
      })
      .returning()
      .get();

    const token = createSession(created.id, req);
    return res.status(201).json({ user: publicUser(created), token });
  } catch {
    return res.status(500).json({ error: 'Registration failed' });
  }
});

// POST /api/auth/login
authRouter.post('/login', loginLimiter, (req: Request, res: Response) => {
  const parsed = LoginSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid login credentials provided' });

  const email = parsed.data.email.toLowerCase().trim();
  try {
    const userRow = db.select().from(users).where(eq(users.email, email)).get();
    if (!userRow || !userRow.isActive || !verifyPassword(parsed.data.password, userRow.passwordHash)) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    db.update(users).set({ lastLoginAt: new Date().toISOString() }).where(eq(users.id, userRow.id)).run();
    const token = createSession(userRow.id, req);
    return res.json({ user: publicUser(userRow), token });
  } catch {
    return res.status(500).json({ error: 'Authentication failed' });
  }
});

// GET /api/auth/me
authRouter.get('/me', authenticate, (req: Request, res: Response) => {
  const user = (req as any).user as AuthenticatedUser | null;
  if (!user) return res.json({ user: null });
  const row = db.select().from(users).where(eq(users.id, user.id)).get();
  return res.json({ user: row ? publicUser(row) : user });
});

// GET /api/auth/profile
authRouter.get('/profile', authenticate, (req: Request, res: Response) => {
  const user = (req as any).user as AuthenticatedUser | null;
  if (!user) return res.status(401).json({ error: 'Authentication required' });
  const row = db.select().from(users).where(eq(users.id, user.id)).get();
  if (!row) return res.status(404).json({ error: 'User not found' });
  return res.json({ user: publicUser(row) });
});

// PATCH /api/auth/profile
authRouter.patch('/profile', authenticate, (req: Request, res: Response) => {
  const user = (req as any).user as AuthenticatedUser | null;
  if (!user) return res.status(401).json({ error: 'Authentication required' });

  const parsed = ProfileSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0]?.message || 'Invalid profile data' });
  }
  if (Object.keys(parsed.data).length === 0) {
    return res.status(400).json({ error: 'No profile fields were supplied' });
  }

  try {
    const updated = db
      .update(users)
      .set({ ...parsed.data, updatedAt: new Date().toISOString() })
      .where(eq(users.id, user.id))
      .returning()
      .get();
    return res.json({ user: publicUser(updated) });
  } catch {
    return res.status(500).json({ error: 'Failed to update profile' });
  }
});

// POST /api/auth/change-password
authRouter.post('/change-password', authenticate, (req: Request, res: Response) => {
  const user = (req as any).user as AuthenticatedUser | null;
  if (!user) return res.status(401).json({ error: 'Authentication required' });

  const parsed = PasswordChangeSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0]?.message || 'Invalid password data' });
  }

  try {
    const row = db.select().from(users).where(eq(users.id, user.id)).get();
    if (!row || !verifyPassword(parsed.data.currentPassword, row.passwordHash)) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }

    const currentToken = (req as any).sessionTokenHash as string | undefined;
    db.update(users)
      .set({ passwordHash: hashPassword(parsed.data.newPassword), updatedAt: new Date().toISOString() })
      .where(eq(users.id, user.id))
      .run();

    // Invalidate all other sessions after a password change.
    db.delete(sessions).where(eq(sessions.userId, user.id)).run();
    const token = createSession(user.id, req);
    return res.json({ success: true, token, invalidatedCurrentSession: Boolean(currentToken) });
  } catch {
    return res.status(500).json({ error: 'Failed to change password' });
  }
});

// GET /api/auth/sessions
authRouter.get('/sessions', authenticate, (req: Request, res: Response) => {
  const user = (req as any).user as AuthenticatedUser | null;
  if (!user) return res.status(401).json({ error: 'Authentication required' });
  const rows = db
    .select({
      id: sessions.id,
      createdAt: sessions.createdAt,
      expiresAt: sessions.expiresAt,
      ipAddress: sessions.ipAddress,
      userAgent: sessions.userAgent,
    })
    .from(sessions)
    .where(eq(sessions.userId, user.id))
    .all();
  return res.json({ sessions: rows });
});

// POST /api/auth/logout
authRouter.post('/logout', authenticate, (req: Request, res: Response) => {
  const tokenHash = (req as any).sessionTokenHash as string | undefined;
  if (tokenHash) db.delete(sessions).where(eq(sessions.token, tokenHash)).run();
  return res.json({ success: true });
});

// POST /api/auth/logout-all
authRouter.post('/logout-all', authenticate, (req: Request, res: Response) => {
  const user = (req as any).user as AuthenticatedUser | null;
  if (!user) return res.status(401).json({ error: 'Authentication required' });
  db.delete(sessions).where(eq(sessions.userId, user.id)).run();
  return res.json({ success: true });
});

// DELETE /api/auth/delete-account (privacy / right to erasure)
authRouter.delete('/delete-account', authenticate, (req: Request, res: Response) => {
  const user = (req as any).user as AuthenticatedUser | null;
  if (!user) return res.status(401).json({ error: 'Authentication required' });
  if (user.role === 'super_admin') {
    return res.status(403).json({ error: 'The last super administrator cannot self-delete the account.' });
  }

  try {
    db.transaction(() => {
      db.delete(sessions).where(eq(sessions.userId, user.id)).run();
      db.delete(userSavedItems).where(eq(userSavedItems.userId, user.id)).run();

      const lists = db.select().from(readingLists).where(eq(readingLists.userId, user.id)).all();
      for (const list of lists) {
        db.delete(readingListItems).where(eq(readingListItems.readingListId, list.id)).run();
      }
      db.delete(readingLists).where(eq(readingLists.userId, user.id)).run();
      db.update(verificationAuditLogs).set({ userId: null }).where(eq(verificationAuditLogs.userId, user.id)).run();
      db.delete(users).where(eq(users.id, user.id)).run();
    });
    return res.json({ success: true, message: 'Account and associated personal data deleted.' });
  } catch {
    return res.status(409).json({
      error: 'The account could not be deleted because it owns moderation or upload records. Contact an administrator.',
    });
  }
});

export { ROLES, PRIVILEGED_ROLES, passwordIsStrong };
