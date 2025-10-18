import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import axios from 'axios';

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

// Use Vite env for API; ensure .env defines VITE_API_LOGIN_URL
const API_LOGIN =
  import.meta.env.VITE_API_LOGIN_URL ||
  'https://finflux-64307221061.asia-south1.run.app/api/auth/login';

// Backend response from POST /api/auth/login
type ApiResponse = {
  id: string;
  username: string;
  role: string;
  organizationId?: string; // new
  empId?: string;          // new
  email?: string;
  token?: string;
  // add other fields if backend returns them
};

// Robust normalizer: trim + lowercase and map to allowed roles
function normalizeRole(r?: string): UserRole {
  const v = String(r ?? '').trim().toLowerCase();
  if (v === 'owner' || v === 'manager' || v === 'employee') return v as UserRole;
  return 'employee';
}

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
      try { controllerRef.current?.abort(); } catch {}
    };
  }, []);

  const login = async (username: string, password: string, remember = false): Promise<boolean> => {
    setIsLoading(true);

    // cancel any in-flight login
    try { controllerRef.current?.abort(); } catch {}
    const controller = new AbortController();
    controllerRef.current = controller;

    try {
      // Backend handles authentication; send JSON payload { username, password }
      const res = await axios.post<ApiResponse>(
        API_LOGIN,
        { username, password },
        {
          timeout: 10000,
          signal: controller.signal,
          withCredentials: true, // enable if backend issues session cookies
          // headers: { 'Content-Type': 'application/json' }, // Axios sets this for plain objects
        }
      );

      const data: ApiResponse = res.data || { id: '', username: '', role: '' };
      const role: UserRole = normalizeRole(data.role);

      const nextUser: User = {
        id: String(data.id ?? username),
        name: data.username ?? username,
        role, // already lowercase and validated
        email: data.email,
        employeeId: data.id ? String(data.id) : undefined,
        organizationId: data.organizationId ?? undefined, // save org
        empId: data.empId ?? undefined, // save emp id
        token: data.token,
        profileImageUrl: '',
        username: ''
      };

      const storage = remember ? localStorage : sessionStorage;
      storage.setItem('petrol_bunk_user', JSON.stringify(nextUser));
      storage.setItem('isLoggedIn', 'true');
      storage.setItem('role', role); // persisted in lowercase

      // Convenience keys for other features that read org/emp directly (e.g., creation forms)
      if (nextUser.organizationId) localStorage.setItem('organizationId', nextUser.organizationId);
      if (nextUser.empId) localStorage.setItem('empId', nextUser.empId);

      localStorage.setItem('loginTime', Date.now().toString());

      setUser(nextUser);
      return true;
    } catch (error: any) {
      // Treat any 401 as invalid credentials; other errors as generic failure
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
