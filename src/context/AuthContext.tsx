/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api, ApiError, type AuthUserAPI, type UserRoleAPI } from '../services/api.ts';

interface AuthContextType {
  user: AuthUserAPI | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<AuthUserAPI>;
  register: (email: string, password: string, fullName: string) => Promise<AuthUserAPI>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
  setUser: (user: AuthUserAPI | null) => void;
  isPrivileged: boolean;
  canModerate: boolean;
  canEditContent: boolean;
  isSuperAdmin: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const TOKEN_KEY = 'mta_session_token';

function persistToken(token: string | null) {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    // storage unavailable; session remains in memory only
  }
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUserAPI | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(async () => {
    const token = (() => {
      try {
        return localStorage.getItem(TOKEN_KEY);
      } catch {
        return null;
      }
    })();
    if (!token) {
      setUser(null);
      setIsLoading(false);
      return;
    }
    try {
      const result = await api.me();
      if (result.user) setUser(result.user);
      else {
        setUser(null);
        persistToken(null);
      }
    } catch (err) {
      if (err instanceof ApiError && (err.status === 401 || err.status === 403)) {
        persistToken(null);
      }
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const login = useCallback(async (email: string, password: string) => {
    const result = await api.login(email, password);
    persistToken(result.token);
    setUser(result.user);
    return result.user;
  }, []);

  const register = useCallback(async (email: string, password: string, fullName: string) => {
    const result = await api.register(email, password, fullName);
    persistToken(result.token);
    setUser(result.user);
    return result.user;
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.logout();
    } catch {
      // the local session is cleared even if the network call fails
    }
    persistToken(null);
    setUser(null);
  }, []);

  const value = useMemo<AuthContextType>(() => {
    const role: UserRoleAPI | undefined = user?.role;
    return {
      user,
      isLoading,
      login,
      register,
      logout,
      refresh,
      setUser,
      isPrivileged: role === 'super_admin' || role === 'admin' || role === 'academic_editor' || role === 'academic_reviewer',
      canModerate: role === 'super_admin' || role === 'admin' || role === 'academic_reviewer',
      canEditContent: role === 'super_admin' || role === 'admin' || role === 'academic_editor',
      isSuperAdmin: role === 'super_admin',
    };
  }, [user, isLoading, login, register, logout, refresh]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};

export function roleLabel(role: string, language: 'ar' | 'en'): string {
  const labels: Record<string, [string, string]> = {
    super_admin: ['مدير أعلى', 'Super Administrator'],
    admin: ['مدير', 'Administrator'],
    academic_editor: ['محرر محتوى أكاديمي', 'Academic Content Editor'],
    academic_reviewer: ['مدقق أكاديمي', 'Academic Reviewer'],
    regular_user: ['مستخدم', 'Regular User'],
  };
  const pair = labels[role] || [role, role];
  return language === 'ar' ? pair[0] : pair[1];
}
