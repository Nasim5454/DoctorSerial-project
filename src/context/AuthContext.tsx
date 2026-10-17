import React, { createContext, useContext, useState, useEffect } from 'react';
import { authService } from '../api/services.js';
import type { User, Doctor, UserRole } from '../types/index.js';

interface AuthContextType {
  user: User | null;
  doctorProfile: Doctor | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (userData: { name: string; email: string; password: string; phone: string }) => Promise<void>;
  logout: () => void;
  quickSwitchRole: (role: UserRole, doctorId?: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('doctorserial_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [doctorProfile, setDoctorProfile] = useState<Doctor | null>(() => {
    const saved = localStorage.getItem('doctorserial_doctor');
    return saved ? JSON.parse(saved) : null;
  });
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('doctorserial_token'));
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    const initAuth = async () => {
      const storedToken = localStorage.getItem('doctorserial_token');
      if (storedToken) {
        try {
          const res = await authService.getMe();
          setUser(res.user);
          setDoctorProfile(res.doctorProfile || null);
          localStorage.setItem('doctorserial_user', JSON.stringify(res.user));
          if (res.doctorProfile) {
            localStorage.setItem('doctorserial_doctor', JSON.stringify(res.doctorProfile));
          } else {
            localStorage.removeItem('doctorserial_doctor');
          }
        } catch {
          // Token expired or invalid
          localStorage.removeItem('doctorserial_token');
          localStorage.removeItem('doctorserial_user');
          localStorage.removeItem('doctorserial_doctor');
          setUser(null);
          setToken(null);
          setDoctorProfile(null);
        }
      } else {
        // Automatically sign in as Receptionist for convenient instant preview if not logged in
        try {
          const res = await authService.quickSwitchRole('Receptionist');
          setToken(res.token);
          setUser(res.user);
          setDoctorProfile(res.doctorProfile || null);
          localStorage.setItem('doctorserial_token', res.token);
          localStorage.setItem('doctorserial_user', JSON.stringify(res.user));
        } catch (e) {
          console.warn('Initial demo sign-in fallback:', e);
        }
      }
      setIsLoading(false);
    };

    initAuth();

    const handleUnauthorized = () => {
      setUser(null);
      setToken(null);
      setDoctorProfile(null);
    };

    window.addEventListener('auth:unauthorized', handleUnauthorized);
    return () => window.removeEventListener('auth:unauthorized', handleUnauthorized);
  }, []);

  const login = async (email: string, password: string) => {
    const res = await authService.login(email, password);
    setToken(res.token);
    setUser(res.user);
    setDoctorProfile(res.doctorProfile || null);
    localStorage.setItem('doctorserial_token', res.token);
    localStorage.setItem('doctorserial_user', JSON.stringify(res.user));
    if (res.doctorProfile) {
      localStorage.setItem('doctorserial_doctor', JSON.stringify(res.doctorProfile));
    }
  };

  const register = async (userData: { name: string; email: string; password: string; phone: string }) => {
    const res = await authService.register(userData);
    setToken(res.token);
    setUser(res.user);
    setDoctorProfile(null);
    localStorage.setItem('doctorserial_token', res.token);
    localStorage.setItem('doctorserial_user', JSON.stringify(res.user));
  };

  const logout = () => {
    localStorage.removeItem('doctorserial_token');
    localStorage.removeItem('doctorserial_user');
    localStorage.removeItem('doctorserial_doctor');
    setUser(null);
    setToken(null);
    setDoctorProfile(null);
  };

  const quickSwitchRole = async (role: UserRole, doctorId?: string) => {
    setIsLoading(true);
    try {
      const res = await authService.quickSwitchRole(role, doctorId);
      setToken(res.token);
      setUser(res.user);
      setDoctorProfile(res.doctorProfile || null);
      localStorage.setItem('doctorserial_token', res.token);
      localStorage.setItem('doctorserial_user', JSON.stringify(res.user));
      if (res.doctorProfile) {
        localStorage.setItem('doctorserial_doctor', JSON.stringify(res.doctorProfile));
      } else {
        localStorage.removeItem('doctorserial_doctor');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        doctorProfile,
        token,
        isLoading,
        login,
        register,
        logout,
        quickSwitchRole,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
