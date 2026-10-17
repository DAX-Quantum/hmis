'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { api, setToken, clearToken, getToken } from '@/lib/api';
import { useRouter } from 'next/navigation';

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  avatar?: string;
  phone?: string;
  doctorId?: string;
  doctorDepartment?: string;
  patientId?: string;
  mrn?: string;
  permissions?: string[];
}

interface AuthContextType {
  user: User | null;
  role: string | null;
  permissions: string[];
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, pass: string) => Promise<void>;
  quickLogin: (roleName: string) => Promise<void>;
  logout: () => void;
  hasPermission: (permission: string) => boolean;
  hasRole: (roles: string | string[]) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const DEMO_USERS: Record<string, { email: string; pass: string; title: string; desc: string }> = {
  SUPER_ADMIN: {
    email: 'admin@hmis.local',
    pass: 'Admin@123456',
    title: 'Super Admin',
    desc: 'Full operational control, security logs, analytics, and user governance',
  },
  DOCTOR: {
    email: 'doctor.carter@hmis.local',
    pass: 'Password@123',
    title: 'Dr. Gregory Carter',
    desc: 'Cardiologist: Consultation queue, vitals recording, and EMR diagnoses',
  },
  NURSE: {
    email: 'nurse.sarah@hmis.local',
    pass: 'Password@123',
    title: 'Nurse Sarah Jenkins',
    desc: 'Inpatient bed monitoring, nursing vitals intake, and triage',
  },
  RECEPTIONIST: {
    email: 'receptionist@hmis.local',
    pass: 'Password@123',
    title: 'Emily Davis',
    desc: 'Front desk: Patient registration, slot booking, and queue management',
  },
  PHARMACIST: {
    email: 'pharmacist@hmis.local',
    pass: 'Password@123',
    title: 'Marcus Brody',
    desc: 'Pharmacy dispensing, batch inventory tracking, and low-stock alerts',
  },
  LAB_TECHNICIAN: {
    email: 'labtech@hmis.local',
    pass: 'Password@123',
    title: 'Elena Rostova',
    desc: 'Laboratory test queues, specimen intake, and diagnostic report verification',
  },
  ACCOUNTANT: {
    email: 'accountant@hmis.local',
    pass: 'Password@123',
    title: 'Julian Mercer',
    desc: 'Billing & revenue: Invoicing, tax breakdown, and payment receipts',
  },
  PATIENT: {
    email: 'patient.james@hmis.local',
    pass: 'Password@123',
    title: 'James Smith',
    desc: 'Patient portal: Medical timeline, prescription viewer, and lab reports',
  },
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    async function loadUser() {
      const token = getToken();
      if (!token) {
        setIsLoading(false);
        return;
      }

      try {
        const me = await api.get<User>('/auth/me');
        setUser(me);
      } catch (err) {
        clearToken();
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    }

    loadUser();
  }, []);

  const login = async (email: string, pass: string) => {
    setIsLoading(true);
    try {
      const res = await api.post('/auth/login', { email, password: pass });
      setToken(res.accessToken);
      setUser(res.user);
      router.push('/dashboard');
    } finally {
      setIsLoading(false);
    }
  };

  const quickLogin = async (roleKey: string) => {
    const creds = DEMO_USERS[roleKey];
    if (!creds) return;
    await login(creds.email, creds.pass);
  };

  const logout = async () => {
    try {
      await api.post('/auth/logout', {});
    } catch (e) {
      // ignore
    } finally {
      clearToken();
      setUser(null);
      router.push('/login');
    }
  };

  const hasPermission = (permission: string): boolean => {
    if (!user) return false;
    if (user.role === 'SUPER_ADMIN' || user.role === 'ADMIN') return true;
    return user.permissions?.includes(permission) || false;
  };

  const hasRole = (roles: string | string[]): boolean => {
    if (!user?.role) return false;
    if (user.role === 'SUPER_ADMIN') return true;
    if (Array.isArray(roles)) {
      return roles.includes(user.role);
    }
    return user.role === roles;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        role: user?.role || null,
        permissions: user?.permissions || [],
        isAuthenticated: !!user,
        isLoading,
        login,
        quickLogin,
        logout,
        hasPermission,
        hasRole,
      }}
    >
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
