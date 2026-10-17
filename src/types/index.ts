export type UserRole = 'Admin' | 'Doctor' | 'Receptionist' | 'Patient';

export type QueueStatus = 'Waiting' | 'Called' | 'In Progress' | 'Completed' | 'Cancelled' | 'No Show';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  phone: string;
  avatarUrl?: string;
  createdAt: string;
}

export interface DoctorSchedule {
  workingDays: string[];
  startTime: string;
  endTime: string;
  slotDurationMinutes: number;
  maxDailyPatients: number;
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
  date: string;
  timeSlot: string;
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
  recipientUserId?: string;
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

export interface SlotAvailabilityResponse {
  doctorId: string;
  date: string;
  dayName: string;
  isWorkingDay: boolean;
  totalSlots: number;
  bookedCount: number;
  availableSlots: string[];
  allSlots: string[];
  doctorSchedule: DoctorSchedule;
}
