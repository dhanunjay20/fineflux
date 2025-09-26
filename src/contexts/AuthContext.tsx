import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import axios from 'axios';

export type UserRole = 'owner' | 'manager' | 'employee';

export interface User {
  id: string;
  name: string;
  role: UserRole;
  email?: string; // optional since API may not return email
  employeeId?: string;
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

const API_LOGIN =
  import.meta.env.VITE_API_LOGIN_URL ||
  'https://pulse-620964158368.asia-south2.run.app/login';

type ApiResponse = {
  employeeRole?: string;
  employeeName?: string;
  employeeId?: string | number;
  token?: string;
  email?: string;
  message?: string;
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const controllerRef = useRef<AbortController | null>(null);

  // Initialize from storage on mount
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
      if (controllerRef.current) controllerRef.current.abort();
    };
  }, []);

  const login = async (username: string, password: string, remember = false): Promise<boolean> => {
    setIsLoading(true);

    // cancel any in-flight login
    if (controllerRef.current) {
      try { controllerRef.current.abort(); } catch {}
    }
    const controller = new AbortController();
    controllerRef.current = controller;

    try {
      const res = await axios.post<ApiResponse>(
        API_LOGIN,
        { username, password },
        {
          timeout: 10000,
          signal: controller.signal,
          // withCredentials: true, // enable if backend uses cookies
        }
      );

      const data = res.data || {};
      const role = (data.employeeRole || '').toLowerCase() as UserRole;

      const nextUser: User = {
        id: String(data.employeeId ?? username),
        name: data.employeeName || username,
        role,
        email: data.email || username,
        employeeId: data.employeeId ? String(data.employeeId) : undefined,
        token: data.token,
      };

      const storage = remember ? localStorage : sessionStorage;
      storage.setItem('petrol_bunk_user', JSON.stringify(nextUser));
      // optional extra flags for other parts of the app:
      storage.setItem('isLoggedIn', 'true');
      storage.setItem('role', role);

      // also cache a loginTime for simple stale checks if desired
      localStorage.setItem('loginTime', Date.now().toString());

      setUser(nextUser);
      return true;
    } catch (error: any) {
      // surface 401 as invalid credentials; other errors as generic failures
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
