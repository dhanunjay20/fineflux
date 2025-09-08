import React, { createContext, useContext, useState, useEffect } from 'react';

export type UserRole = 'owner' | 'manager' | 'employee';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  employeeId?: string;
  phone?: string;
  joinDate: string;
  isActive: boolean;
}

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

// Sample users for demo
const DEMO_USERS: User[] = [
  {
    id: '1',
    name: 'Rajesh Kumar',
    email: 'owner@petrolbunk.com',
    role: 'owner',
    phone: '+91 98765 43210',
    joinDate: '2020-01-15',
    isActive: true,
  },
  {
    id: '2',
    name: 'Priya Singh',
    email: 'manager@petrolbunk.com',
    role: 'manager',
    employeeId: 'EMP001',
    phone: '+91 98765 43211',
    joinDate: '2021-03-10',
    isActive: true,
  },
  {
    id: '3',
    name: 'Arjun Patel',
    email: 'employee@petrolbunk.com',
    role: 'employee',
    employeeId: 'EMP002',
    phone: '+91 98765 43212',
    joinDate: '2022-06-20',
    isActive: true,
  },
];

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check if user is already logged in
    const savedUser = localStorage.getItem('petrol_bunk_user');
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
    setIsLoading(false);
  }, []);

  const login = async (email: string, password: string): Promise<boolean> => {
    setIsLoading(true);
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const foundUser = DEMO_USERS.find(u => u.email === email);
    
    if (foundUser) {
      setUser(foundUser);
      localStorage.setItem('petrol_bunk_user', JSON.stringify(foundUser));
      setIsLoading(false);
      return true;
    }
    
    setIsLoading(false);
    return false;
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('petrol_bunk_user');
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}