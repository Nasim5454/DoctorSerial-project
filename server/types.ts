export type UserRole = 'Admin' | 'Doctor' | 'Receptionist' | 'Patient';

export type QueueStatus = 'Waiting' | 'Called' | 'In Progress' | 'Completed' | 'Cancelled' | 'No Show';

export interface User {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  role: UserRole;
  phone: string;
  avatarUrl?: string;
  createdAt: string;
}

export interface DoctorSchedule {
  workingDays: string[]; // e.g. ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']
  startTime: string; // '09:00'
  endTime: string;   // '13:00'
  slotDurationMinutes: number; // 20
  maxDailyPatients: number; // 20
}

export interface Doctor {
  id: string;
  userId: string;
  name: string;
  email: string;
  phone: string;
  specialty: string;
  qualifications: string;
  experienceYears: number;
  consultationFee: number;
  roomNumber: string;
  schedule: DoctorSchedule;
  status: 'Active' | 'On Break' | 'Off Duty';
  avatarUrl: string;
  bio?: string;
  createdAt: string;
}

export interface Appointment {
  id: string;
  doctorId: string;
  doctorName: string;
  doctorSpecialty: string;
  patientId: string;
  patientName: string;
  patientPhone: string;
  patientAge: number;
  patientGender: 'Male' | 'Female' | 'Other';
  date: string; // 'YYYY-MM-DD'
  timeSlot: string; // 'HH:mm'
  serialNumber: number;
  status: QueueStatus;
  paymentStatus: 'Paid' | 'Pending';
  consultationFee: number;
  reasonForVisit: string;
  doctorNotes?: string;
  calledAt?: string;
  startedAt?: string;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AppNotification {
  id: string;
  recipientUserId?: string; // target specific user or undefined for role broadcast
  recipientRole?: UserRole;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'urgent';
  appointmentId?: string;
  serialNumber?: number;
  read: boolean;
  createdAt: string;
}

export interface QueueSummary {
  doctorId: string;
  doctorName: string;
  specialty: string;
  roomNumber: string;
  status: 'Active' | 'On Break' | 'Off Duty';
  date: string;
  totalAppointments: number;
  waitingCount: number;
  calledCount: number;
  inProgressCount: number;
  completedCount: number;
  currentlyCalling: Appointment | null;
  currentlyServing: Appointment | null;
  nextInQueue: Appointment | null;
}
