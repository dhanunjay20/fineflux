// AuthContext.tsx
import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import axios from 'axios';
import { API_CONFIG } from '@/lib/api-config';
import { logger } from '@/lib/logger';

export type UserRole = 'owner' | 'manager' | 'employee';

export interface User {
  profileImageUrl: string;
  username: string;
  id: string;
  name: string;
  role: UserRole;
  email?: string;
  employeeId?: string;
  organizationId?: string; // added
  empId?: string;          // added
  phone?: string;
  joinDate?: string;
  isActive?: boolean;
  token?: string;
}

interface AuthContextType {
  user: User | null;
  login: (username: string, password: string, remember?: boolean) => Promise<boolean>;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

const PROFILE_URL_KEY = 'profileImageUrl';

type ApiResponse = {
  id: string;
  username: string;
  role: string;
  organizationId?: string;
  empId?: string;
  email?: string;
  token?: string;
};

function normalizeRole(r?: string): UserRole {
  const v = String(r ?? '').trim().toLowerCase();
  if (v === 'owner' || v === 'manager' || v === 'employee') return v as UserRole;
  return 'employee';
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const controllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const fromSession = sessionStorage.getItem('petrol_bunk_user');
    const fromLocal = localStorage.getItem('petrol_bunk_user');
    const raw = fromSession || fromLocal;
    if (raw) {
      try {
        const parsed: User = JSON.parse(raw);
        setUser(parsed);
      } catch {}
    }
    setIsLoading(false);
    return () => {
      try { controllerRef.current?.abort(); } catch {}
    };
  }, []);

  const login = async (username: string, password: string, remember = false): Promise<boolean> => {
    setIsLoading(true);

    try { controllerRef.current?.abort(); } catch {}
    const controller = new AbortController();
    controllerRef.current = controller;

    try {
      const res = await axios.post<ApiResponse>(
        API_CONFIG.LOGIN_URL,
        { username, password },
        {
          timeout: API_CONFIG.TIMEOUT,
          signal: controller.signal,
          withCredentials: true,
        }
      );

      const data: ApiResponse = res.data || { id: '', username: '', role: '' };
      const role: UserRole = normalizeRole(data.role);

      const nextUser: User = {
        id: String(data.id ?? username),
        name: data.username ?? username,
        role,
        email: data.email,
        employeeId: data.id ? String(data.id) : undefined,
        organizationId: data.organizationId ?? undefined,
        empId: data.empId ?? undefined,
        token: data.token,
        profileImageUrl: '', // will set below
        username: username
      };

      const storage = remember ? localStorage : sessionStorage;
      storage.setItem('petrol_bunk_user', JSON.stringify(nextUser));
      storage.setItem('isLoggedIn', 'true');
      storage.setItem('role', role);

      if (nextUser.organizationId) localStorage.setItem('organizationId', nextUser.organizationId);
      if (nextUser.empId) localStorage.setItem('empId', nextUser.empId);
      localStorage.setItem('loginTime', Date.now().toString());

      // Fetch profile image immediately after login and update localStorage before navigation
      if (nextUser.organizationId && nextUser.empId) {
        try {
          const employeeRes = await axios.get(
            `${API_CONFIG.BASE_URL}/api/organizations/${nextUser.organizationId}/employees?page=0&size=100`
          );
          const items = Array.isArray(employeeRes.data?.content)
            ? employeeRes.data.content
            : Array.isArray(employeeRes.data)
              ? employeeRes.data
              : [];
          const emp = items.find((x: any) => x.empId === nextUser.empId);
          if (emp && emp.profileImageUrl) {
            localStorage.setItem(PROFILE_URL_KEY, emp.profileImageUrl);
            nextUser.profileImageUrl = emp.profileImageUrl;
          } else {
            localStorage.removeItem(PROFILE_URL_KEY);
          }
        } catch {
          localStorage.removeItem(PROFILE_URL_KEY);
        }
      }

      setUser(nextUser);
      return true;
    } catch (error: any) {
      if (axios.isAxiosError(error) && error.response?.status === 401) {
        return false;
      }
      return false;
    } finally {
      setIsLoading(false);
      controllerRef.current = null;
    }
  };

  const logout = () => {
    setUser(null);
    sessionStorage.removeItem('petrol_bunk_user');
    sessionStorage.removeItem('isLoggedIn');
    sessionStorage.removeItem('role');
    localStorage.removeItem('petrol_bunk_user');
    localStorage.removeItem('isLoggedIn');
    localStorage.removeItem('role');
    localStorage.removeItem('organizationId');
    localStorage.removeItem('empId');
    localStorage.removeItem(PROFILE_URL_KEY);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
