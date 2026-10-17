import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from './AuthContext.js';
import { notificationService } from '../api/services.js';
import type { AppNotification } from '../types/index.js';

interface CalledPatientPayload {
  appointmentId: string;
  serialNumber: number;
  doctorName: string;
  doctorSpecialty: string;
  roomNumber: string;
  patientName: string;
  patientId: string;
}

interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
  lastCalledPatient: CalledPatientPayload | null;
  activeAlert: CalledPatientPayload | null;
  dismissAlert: () => void;
  notifications: AppNotification[];
  unreadCount: number;
  refreshNotifications: () => Promise<void>;
  markNotificationRead: (id: string) => Promise<void>;
  markAllNotificationsRead: () => Promise<void>;
}

const SocketContext = createContext<SocketContextType | undefined>(undefined);

// Web Audio synthesizer for chime alerts
function playHospitalChime() {
  try {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();

    const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.12);

      gain.gain.setValueAtTime(0, ctx.currentTime + idx * 0.12);
      gain.gain.linearRampToValueAtTime(0.18, ctx.currentTime + idx * 0.12 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + idx * 0.12 + 0.5);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(ctx.currentTime + idx * 0.12);
      osc.stop(ctx.currentTime + idx * 0.12 + 0.55);
    });
  } catch {
    // AudioContext might be blocked until user gesture, ignore silently
  }
}

export const SocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [lastCalledPatient, setLastCalledPatient] = useState<CalledPatientPayload | null>(null);
  const [activeAlert, setActiveAlert] = useState<CalledPatientPayload | null>(null);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);

  const refreshNotifications = useCallback(async () => {
    if (!user) return;
    try {
      const data = await notificationService.getAll();
      setNotifications(data.notifications);
      setUnreadCount(data.unreadCount);
    } catch {
      // ignore
    }
  }, [user]);

  useEffect(() => {
    refreshNotifications();
  }, [refreshNotifications]);

  useEffect(() => {
    const s = io(window.location.origin, {
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 10,
    });

    s.on('connect', () => {
      setIsConnected(true);
      if (user) {
        s.emit('join:room', `user:${user.id}`);
        s.emit('join:room', `role:${user.role}`);
        if (user.role === 'Patient') {
          s.emit('join:room', `patient:${user.id}`);
        }
      }
    });

    s.on('disconnect', () => {
      setIsConnected(false);
    });

    s.on('patient:called', (payload: CalledPatientPayload) => {
      setLastCalledPatient(payload);
      setActiveAlert(payload);
      playHospitalChime();
      refreshNotifications();
    });

    s.on('notification:new', () => {
      refreshNotifications();
    });

    setSocket(s);

    return () => {
      s.disconnect();
    };
  }, [user, refreshNotifications]);

  const dismissAlert = () => {
    setActiveAlert(null);
  };

  const markNotificationRead = async (id: string) => {
    try {
      await notificationService.markRead(id);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch {
      // ignore
    }
  };

  const markAllNotificationsRead = async () => {
    try {
      await notificationService.markAllRead();
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch {
      // ignore
    }
  };

  return (
    <SocketContext.Provider
      value={{
        socket,
        isConnected,
        lastCalledPatient,
        activeAlert,
        dismissAlert,
        notifications,
        unreadCount,
        refreshNotifications,
        markNotificationRead,
        markAllNotificationsRead,
      }}
    >
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};
