import api from './client.js';
import type {
  User,
  Doctor,
  Appointment,
  QueueSummary,
  AppNotification,
  QueueStatus,
  SlotAvailabilityResponse
} from '../types/index.js';

export const authService = {
  login: async (email: string, password: string) => {
    const res = await api.post<{ token: string; user: User; doctorProfile?: Doctor }>('/api/auth/login', {
      email,
      password,
    });
    return res.data;
  },

  register: async (userData: {
    name: string;
    email: string;
    password: string;
    phone: string;
  }) => {
    const res = await api.post<{ token: string; user: User }>('/api/auth/register', userData);
    return res.data;
  },

  getMe: async () => {
    const res = await api.get<{ user: User; doctorProfile?: Doctor }>('/api/auth/me');
    return res.data;
  },

  quickSwitchRole: async (role: string, doctorId?: string) => {
    const res = await api.post<{ token: string; user: User; doctorProfile?: Doctor }>('/api/auth/demo-switch', {
      role,
      doctorId,
    });
    return res.data;
  },
};

export const doctorService = {
  getAll: async () => {
    const res = await api.get<{ doctors: Doctor[] }>('/api/doctors');
    return res.data.doctors;
  },

  getById: async (id: string) => {
    const res = await api.get<{ doctor: Doctor }>(`/api/doctors/${id}`);
    return res.data.doctor;
  },

  getAvailableSlots: async (doctorId: string, date: string) => {
    const res = await api.get<SlotAvailabilityResponse>(`/api/doctors/${doctorId}/slots`, {
      params: { date },
    });
    return res.data;
  },

  updateStatus: async (doctorId: string, status: 'Active' | 'On Break' | 'Off Duty') => {
    const res = await api.patch<{ success: boolean; doctor: Doctor }>(`/api/doctors/${doctorId}/status`, {
      status,
    });
    return res.data;
  },

  create: async (data: Partial<Doctor>) => {
    const res = await api.post<{ success: boolean; doctor: Doctor }>('/api/doctors', data);
    return res.data;
  },
};

export const appointmentService = {
  getAll: async (params?: {
    doctorId?: string;
    patientId?: string;
    date?: string;
    status?: QueueStatus;
    search?: string;
  }) => {
    const res = await api.get<{ appointments: Appointment[] }>('/api/appointments', { params });
    return res.data.appointments;
  },

  getById: async (id: string) => {
    const res = await api.get<{ appointment: Appointment }>(`/api/appointments/${id}`);
    return res.data.appointment;
  },

  create: async (data: {
    doctorId: string;
    patientId?: string;
    patientName?: string;
    patientPhone?: string;
    patientAge?: number;
    patientGender?: 'Male' | 'Female' | 'Other';
    date: string;
    timeSlot: string;
    reasonForVisit: string;
    paymentStatus?: 'Paid' | 'Pending';
  }) => {
    const res = await api.post<{
      success: boolean;
      message: string;
      appointment: Appointment;
    }>('/api/appointments', data);
    return res.data;
  },

  updateStatus: async (id: string, status: QueueStatus, doctorNotes?: string) => {
    const res = await api.patch<{
      success: boolean;
      message: string;
      appointment: Appointment;
    }>(`/api/appointments/${id}/status`, { status, doctorNotes });
    return res.data;
  },

  cancel: async (id: string) => {
    const res = await api.delete<{ success: boolean; message: string }>(`/api/appointments/${id}`);
    return res.data;
  },
};

export const queueService = {
  getTodayQueue: async (doctorId?: string, date?: string) => {
    const res = await api.get<{
      date: string;
      queues: QueueSummary[];
      appointments: Appointment[];
    }>('/api/queue/today', {
      params: { doctorId, date },
    });
    return res.data;
  },

  callNext: async (doctorId?: string) => {
    const res = await api.post<{
      success: boolean;
      message: string;
      appointment: Appointment;
    }>('/api/queue/call-next', { doctorId });
    return res.data;
  },
};

export const statsService = {
  getSummary: async () => {
    const res = await api.get<{
      date: string;
      metrics: {
        totalPatients: number;
        totalDoctors: number;
        appointmentsToday: number;
        completedToday: number;
        waitingToday: number;
        inProgressToday: number;
        cancelledToday: number;
        revenueToday: number;
      };
      doctorStats: Array<{
        doctorId: string;
        doctorName: string;
        specialty: string;
        roomNumber: string;
        totalToday: number;
        waiting: number;
        inProgress: number;
        completed: number;
        status: string;
      }>;
    }>('/api/stats/summary');
    return res.data;
  },
};

export const userService = {
  getAll: async (params?: { role?: string; search?: string }) => {
    const res = await api.get<{ users: User[] }>('/api/users', { params });
    return res.data.users;
  },

  getPatients: async () => {
    const res = await api.get<{ patients: User[] }>('/api/users/patients');
    return res.data.patients;
  },

  create: async (data: { name: string; email: string; phone: string; role?: string }) => {
    const res = await api.post<{ success: boolean; user: User }>('/api/users', data);
    return res.data;
  },
};

export const notificationService = {
  getAll: async () => {
    const res = await api.get<{ notifications: AppNotification[]; unreadCount: number }>('/api/notifications');
    return res.data;
  },

  markRead: async (id: string) => {
    const res = await api.patch<{ success: boolean }>(`/api/notifications/${id}/read`);
    return res.data;
  },

  markAllRead: async () => {
    const res = await api.post<{ success: boolean }>('/api/notifications/read-all');
    return res.data;
  },
};
