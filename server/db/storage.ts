import fs from 'node:fs';
import path from 'node:path';
import bcrypt from 'bcryptjs';
import type { User, Doctor, Appointment, AppNotification, QueueStatus } from '../types.js';
import { calculateNextSerial, isDoubleBooked, isValidStatusTransition } from '../logic/queueRules.js';

interface DatabaseSchema {
  users: User[];
  doctors: Doctor[];
  appointments: Appointment[];
  notifications: AppNotification[];
}

const DATA_DIR = path.resolve('.data');
const DB_FILE = path.join(DATA_DIR, 'doctorserial_db.json');

class DatabaseStore {
  private data: DatabaseSchema = {
    users: [],
    doctors: [],
    appointments: [],
    notifications: []
  };

  constructor() {
    this.init();
  }

  private init() {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }

    if (fs.existsSync(DB_FILE)) {
      try {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        this.data = JSON.parse(raw);
        if (this.data.users && this.data.users.length > 0) {
          // Check if already seeded with Bangladeshi hospital data
          const hasBd = this.data.doctors.some(d => d.name.includes('Syed') || d.name.includes('Farhana'));
          if (hasBd) return;
        }
      } catch (err) {
        console.warn('Failed to parse existing DB file, regenerating seed data:', err);
      }
    }

    this.seedInitialData();
  }

  private save() {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      fs.writeFileSync(DB_FILE, JSON.stringify(this.data, null, 2), 'utf-8');
    } catch (err) {
      console.error('Failed to persist database file:', err);
    }
  }

  private seedInitialData() {
    const today = new Date().toISOString().split('T')[0];
    const saltRounds = 10;
    const adminHash = bcrypt.hashSync('Admin123!', saltRounds);
    const doctorHash = bcrypt.hashSync('Doctor123!', saltRounds);
    const receptionHash = bcrypt.hashSync('Reception123!', saltRounds);
    const patientHash = bcrypt.hashSync('Patient123!', saltRounds);

    const users: User[] = [
      {
        id: 'usr_admin',
        name: 'Dr. M. A. Hasan (Director of Clinical Operations)',
        email: 'admin@doctorserial.com',
        passwordHash: adminHash,
        role: 'Admin',
        phone: '+880 1711-000100',
        createdAt: new Date().toISOString()
      },
      {
        id: 'usr_doc_1',
        name: 'Prof. Dr. Syed Mohammad Ali',
        email: 'dr.syed.ali@doctorserial.com',
        passwordHash: doctorHash,
        role: 'Doctor',
        phone: '+880 1711-223344',
        createdAt: new Date().toISOString()
      },
      {
        id: 'usr_doc_2',
        name: 'Assoc. Prof. Dr. Farhana Sultana',
        email: 'dr.farhana@doctorserial.com',
        passwordHash: doctorHash,
        role: 'Doctor',
        phone: '+880 1819-334455',
        createdAt: new Date().toISOString()
      },
      {
        id: 'usr_doc_3',
        name: 'Dr. Tanvir Ahmed Chowdhury',
        email: 'dr.tanvir@doctorserial.com',
        passwordHash: doctorHash,
        role: 'Doctor',
        phone: '+880 1912-556677',
        createdAt: new Date().toISOString()
      },
      {
        id: 'usr_doc_4',
        name: 'Prof. Dr. Nazmul Huda',
        email: 'dr.nazmul@doctorserial.com',
        passwordHash: doctorHash,
        role: 'Doctor',
        phone: '+880 1611-778899',
        createdAt: new Date().toISOString()
      },
      {
        id: 'usr_rec_1',
        name: 'Sadia Afrin (Head of Front Desk & Queue)',
        email: 'reception@doctorserial.com',
        passwordHash: receptionHash,
        role: 'Receptionist',
        phone: '+880 1713-998877',
        createdAt: new Date().toISOString()
      },
      {
        id: 'usr_pat_1',
        name: 'Mohammad Rafiqul Islam',
        email: 'patient.john@example.com',
        passwordHash: patientHash,
        role: 'Patient',
        phone: '+880 1715-443322',
        createdAt: new Date().toISOString()
      },
      {
        id: 'usr_pat_2',
        name: 'Nusrat Jahan',
        email: 'patient.emma@example.com',
        passwordHash: patientHash,
        role: 'Patient',
        phone: '+880 1812-998877',
        createdAt: new Date().toISOString()
      },
      {
        id: 'usr_pat_3',
        name: 'Tanima Rahman',
        email: 'tanima.r@example.com',
        passwordHash: patientHash,
        role: 'Patient',
        phone: '+880 1913-665544',
        createdAt: new Date().toISOString()
      },
      {
        id: 'usr_pat_4',
        name: 'Kazi Ashraful Alam',
        email: 'ashraful.alam@example.com',
        passwordHash: patientHash,
        role: 'Patient',
        phone: '+880 1618-221100',
        createdAt: new Date().toISOString()
      }
    ];

    const doctors: Doctor[] = [
      {
        id: 'doc_1',
        userId: 'usr_doc_1',
        name: 'Prof. Dr. Syed Mohammad Ali',
        email: 'dr.syed.ali@doctorserial.com',
        phone: '+880 1711-223344',
        specialty: 'Cardiology & Heart Diseases',
        qualifications: 'MBBS, FCPS (Medicine), MD (Cardiology), FACC (USA) - NICVD',
        experienceYears: 18,
        consultationFee: 1200,
        roomNumber: 'Chamber 302 (Level 3, Cardiac Block)',
        status: 'Active',
        avatarUrl: 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=150&auto=format&fit=crop&q=80',
        bio: 'Senior Consultant Cardiologist specializing in hypertension, angiography, stent follow-up, and preventive heart care at Dhaka Central Specialized Hospital.',
        schedule: {
          workingDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
          startTime: '09:00',
          endTime: '13:00',
          slotDurationMinutes: 20,
          maxDailyPatients: 20
        },
        createdAt: new Date().toISOString()
      },
      {
        id: 'doc_2',
        userId: 'usr_doc_2',
        name: 'Assoc. Prof. Dr. Farhana Sultana',
        email: 'dr.farhana@doctorserial.com',
        phone: '+880 1819-334455',
        specialty: 'Pediatrics & Child Health',
        qualifications: 'MBBS, FCPS (Pediatrics), DCH - Dhaka Medical College & Hospital',
        experienceYears: 12,
        consultationFee: 1000,
        roomNumber: 'Chamber 205 (Level 2, Mother & Child Wing)',
        status: 'Active',
        avatarUrl: 'https://images.unsplash.com/photo-1594824813567-c6a6f6631e8c?w=150&auto=format&fit=crop&q=80',
        bio: 'Associate Professor & Pediatric Consultant with extensive expertise in child growth, immunizations, neonatal care, and seasonal pediatric infections.',
        schedule: {
          workingDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
          startTime: '10:00',
          endTime: '14:00',
          slotDurationMinutes: 20,
          maxDailyPatients: 20
        },
        createdAt: new Date().toISOString()
      },
      {
        id: 'doc_3',
        userId: 'usr_doc_3',
        name: 'Dr. Tanvir Ahmed Chowdhury',
        email: 'dr.tanvir@doctorserial.com',
        phone: '+880 1912-556677',
        specialty: 'Dermatology & Skin Specialist',
        qualifications: 'MBBS, DDV (BSMMU), FCPS (Dermatology), Fellow Laser & Aesthetics',
        experienceYears: 9,
        consultationFee: 1000,
        roomNumber: 'Chamber 108 (Level 1, Skin Care Unit)',
        status: 'Active',
        avatarUrl: 'https://images.unsplash.com/photo-1537368910025-700350fe46c7?w=150&auto=format&fit=crop&q=80',
        bio: 'Consultant Dermatologist treating eczema, psoriasis, acne management, hair fall disorders, and dermatological laser procedures.',
        schedule: {
          workingDays: ['Monday', 'Wednesday', 'Friday'],
          startTime: '09:30',
          endTime: '13:30',
          slotDurationMinutes: 20,
          maxDailyPatients: 18
        },
        createdAt: new Date().toISOString()
      },
      {
        id: 'doc_4',
        userId: 'usr_doc_4',
        name: 'Prof. Dr. Nazmul Huda',
        email: 'dr.nazmul@doctorserial.com',
        phone: '+880 1611-778899',
        specialty: 'Neurology & Brain Spine Specialist',
        qualifications: 'MBBS, MD (Neurology), Fellow World Stroke Organization - NINS',
        experienceYears: 16,
        consultationFee: 1500,
        roomNumber: 'Chamber 404 (Level 4, Neurosciences)',
        status: 'Active',
        avatarUrl: 'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=150&auto=format&fit=crop&q=80',
        bio: 'Professor of Neurology with specialization in stroke rehabilitation, migraine headaches, neuropathic pain, epilepsy, and neuromuscular conditions.',
        schedule: {
          workingDays: ['Tuesday', 'Thursday', 'Saturday'],
          startTime: '10:00',
          endTime: '14:00',
          slotDurationMinutes: 25,
          maxDailyPatients: 15
        },
        createdAt: new Date().toISOString()
      }
    ];

    const appointments: Appointment[] = [
      {
        id: 'app_1',
        doctorId: 'doc_1',
        doctorName: 'Prof. Dr. Syed Mohammad Ali',
        doctorSpecialty: 'Cardiology & Heart Diseases',
        patientId: 'usr_pat_1',
        patientName: 'Mohammad Rafiqul Islam',
        patientPhone: '+880 1715-443322',
        patientAge: 48,
        patientGender: 'Male',
        date: today,
        timeSlot: '09:00',
        serialNumber: 1,
        status: 'Completed',
        paymentStatus: 'Paid',
        consultationFee: 1200,
        reasonForVisit: 'Hypertension follow-up & resting ECG assessment',
        doctorNotes: 'Blood pressure controlled at 125/80 mmHg. Continue Amlodipine 5mg. Advised low salt diet.',
        startedAt: new Date(Date.now() - 65 * 60000).toISOString(),
        completedAt: new Date(Date.now() - 40 * 60000).toISOString(),
        createdAt: new Date(Date.now() - 120 * 60000).toISOString(),
        updatedAt: new Date(Date.now() - 40 * 60000).toISOString()
      },
      {
        id: 'app_2',
        doctorId: 'doc_1',
        doctorName: 'Prof. Dr. Syed Mohammad Ali',
        doctorSpecialty: 'Cardiology & Heart Diseases',
        patientId: 'usr_pat_2',
        patientName: 'Nusrat Jahan',
        patientPhone: '+880 1812-998877',
        patientAge: 36,
        patientGender: 'Female',
        date: today,
        timeSlot: '09:20',
        serialNumber: 2,
        status: 'In Progress',
        paymentStatus: 'Paid',
        consultationFee: 1200,
        reasonForVisit: 'Chest palpitation & breathlessness after exertion',
        doctorNotes: 'Heart sounds normal, S1+S2. Advised 2D Echocardiogram and Lipid profile testing.',
        calledAt: new Date(Date.now() - 25 * 60000).toISOString(),
        startedAt: new Date(Date.now() - 20 * 60000).toISOString(),
        createdAt: new Date(Date.now() - 100 * 60000).toISOString(),
        updatedAt: new Date(Date.now() - 20 * 60000).toISOString()
      },
      {
        id: 'app_3',
        doctorId: 'doc_1',
        doctorName: 'Prof. Dr. Syed Mohammad Ali',
        doctorSpecialty: 'Cardiology & Heart Diseases',
        patientId: 'usr_pat_3',
        patientName: 'Tanima Rahman',
        patientPhone: '+880 1913-665544',
        patientAge: 52,
        patientGender: 'Female',
        date: today,
        timeSlot: '09:40',
        serialNumber: 3,
        status: 'Called',
        paymentStatus: 'Paid',
        consultationFee: 1200,
        reasonForVisit: 'Post-angioplasty routine bi-annual review',
        calledAt: new Date(Date.now() - 3 * 60000).toISOString(),
        createdAt: new Date(Date.now() - 90 * 60000).toISOString(),
        updatedAt: new Date(Date.now() - 3 * 60000).toISOString()
      },
      {
        id: 'app_4',
        doctorId: 'doc_1',
        doctorName: 'Prof. Dr. Syed Mohammad Ali',
        doctorSpecialty: 'Cardiology & Heart Diseases',
        patientId: 'usr_pat_4',
        patientName: 'Kazi Ashraful Alam',
        patientPhone: '+880 1618-221100',
        patientAge: 32,
        patientGender: 'Male',
        date: today,
        timeSlot: '10:00',
        serialNumber: 4,
        status: 'Waiting',
        paymentStatus: 'Pending',
        consultationFee: 1200,
        reasonForVisit: 'Pre-employment cardiac fitness check & ECG',
        createdAt: new Date(Date.now() - 80 * 60000).toISOString(),
        updatedAt: new Date(Date.now() - 80 * 60000).toISOString()
      },
      {
        id: 'app_5',
        doctorId: 'doc_2',
        doctorName: 'Assoc. Prof. Dr. Farhana Sultana',
        doctorSpecialty: 'Pediatrics & Child Health',
        patientId: 'usr_pat_2',
        patientName: 'Baby Areeb (Nusrat Jahan)',
        patientPhone: '+880 1812-998877',
        patientAge: 3,
        patientGender: 'Male',
        date: today,
        timeSlot: '10:00',
        serialNumber: 1,
        status: 'Waiting',
        paymentStatus: 'Paid',
        consultationFee: 1000,
        reasonForVisit: 'Seasonal fever, cold symptoms and growth milestone check',
        createdAt: new Date(Date.now() - 60 * 60000).toISOString(),
        updatedAt: new Date(Date.now() - 60 * 60000).toISOString()
      }
    ];

    const notifications: AppNotification[] = [
      {
        id: 'notif_1',
        recipientRole: 'Doctor',
        title: 'New Patient in Queue',
        message: 'Serial #4 Kazi Ashraful Alam checked in for Cardiology (10:00 AM).',
        type: 'info',
        appointmentId: 'app_4',
        serialNumber: 4,
        read: false,
        createdAt: new Date(Date.now() - 10 * 60000).toISOString()
      },
      {
        id: 'notif_2',
        recipientUserId: 'usr_pat_3',
        title: 'You are Called!',
        message: 'Prof. Dr. Syed Mohammad Ali has called Serial #3 Tanima Rahman to Chamber 302.',
        type: 'urgent',
        appointmentId: 'app_3',
        serialNumber: 3,
        read: false,
        createdAt: new Date(Date.now() - 3 * 60000).toISOString()
      }
    ];

    this.data = {
      users,
      doctors,
      appointments,
      notifications
    };

    this.save();
    console.log('Dhaka Central Specialized Hospital seed data initialized successfully.');
  }

  // --- Users Collection Methods ---
  public findUserById(id: string): User | undefined {
    return this.data.users.find(u => u.id === id);
  }

  public findUserByEmail(email: string): User | undefined {
    return this.data.users.find(u => u.email.toLowerCase() === email.toLowerCase());
  }

  public getAllUsers(): User[] {
    return [...this.data.users];
  }

  public createUser(userData: Omit<User, 'id' | 'createdAt'>): User {
    const newUser: User = {
      ...userData,
      id: `usr_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      createdAt: new Date().toISOString()
    };
    this.data.users.push(newUser);
    this.save();
    return newUser;
  }

  // --- Doctors Collection Methods ---
  public getAllDoctors(): Doctor[] {
    return [...this.data.doctors];
  }

  public findDoctorById(id: string): Doctor | undefined {
    return this.data.doctors.find(d => d.id === id || d.userId === id);
  }

  public createDoctor(doctorData: Omit<Doctor, 'id' | 'createdAt'>): Doctor {
    const newDoc: Doctor = {
      ...doctorData,
      id: `doc_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
      createdAt: new Date().toISOString()
    };
    this.data.doctors.push(newDoc);
    this.save();
    return newDoc;
  }

  public updateDoctor(id: string, updates: Partial<Doctor>): Doctor | null {
    const index = this.data.doctors.findIndex(d => d.id === id || d.userId === id);
    if (index === -1) return null;

    this.data.doctors[index] = {
      ...this.data.doctors[index],
      ...updates
    };
    this.save();
    return this.data.doctors[index];
  }

  // --- Appointments Collection Methods ---
  public getAllAppointments(filters?: {
    doctorId?: string;
    patientId?: string;
    date?: string;
    status?: QueueStatus;
    search?: string;
  }): Appointment[] {
    let result = [...this.data.appointments];

    if (filters?.doctorId) {
      result = result.filter(a => a.doctorId === filters.doctorId);
    }
    if (filters?.patientId) {
      result = result.filter(a => a.patientId === filters.patientId);
    }
    if (filters?.date) {
      result = result.filter(a => a.date === filters.date);
    }
    if (filters?.status) {
      result = result.filter(a => a.status === filters.status);
    }
    if (filters?.search) {
      const term = filters.search.toLowerCase().trim();
      result = result.filter(a =>
        a.patientName.toLowerCase().includes(term) ||
        a.patientPhone.toLowerCase().includes(term) ||
        a.doctorName.toLowerCase().includes(term) ||
        a.serialNumber.toString() === term ||
        a.timeSlot.includes(term)
      );
    }

    return result.sort((a, b) => {
      if (a.date !== b.date) return b.date.localeCompare(a.date);
      return a.serialNumber - b.serialNumber;
    });
  }

  public findAppointmentById(id: string): Appointment | undefined {
    return this.data.appointments.find(a => a.id === id);
  }

  public createAppointment(params: {
    doctorId: string;
    patientId: string;
    patientName: string;
    patientPhone: string;
    patientAge: number;
    patientGender: 'Male' | 'Female' | 'Other';
    date: string;
    timeSlot: string;
    reasonForVisit: string;
    paymentStatus?: 'Paid' | 'Pending';
  }): { success: boolean; appointment?: Appointment; error?: string } {
    const doctor = this.findDoctorById(params.doctorId);
    if (!doctor) {
      return { success: false, error: 'Doctor not found.' };
    }

    // Double booking check
    const existingDoctorAppointments = this.data.appointments.filter(
      a => a.doctorId === params.doctorId && a.date === params.date
    );

    const isOccupied = isDoubleBooked(
      params.doctorId,
      params.date,
      params.timeSlot,
      existingDoctorAppointments
    );

    if (isOccupied) {
      return {
        success: false,
        error: `Slot ${params.timeSlot} on ${params.date} for ${doctor.name} is already booked. Please choose another slot.`
      };
    }

    const serialNumber = calculateNextSerial(existingDoctorAppointments);

    const newAppointment: Appointment = {
      id: `app_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      doctorId: doctor.id,
      doctorName: doctor.name,
      doctorSpecialty: doctor.specialty,
      patientId: params.patientId,
      patientName: params.patientName,
      patientPhone: params.patientPhone,
      patientAge: params.patientAge,
      patientGender: params.patientGender,
      date: params.date,
      timeSlot: params.timeSlot,
      serialNumber,
      status: 'Waiting',
      paymentStatus: params.paymentStatus || 'Pending',
      consultationFee: doctor.consultationFee,
      reasonForVisit: params.reasonForVisit,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    this.data.appointments.push(newAppointment);

    this.createNotification({
      recipientRole: 'Doctor',
      title: 'New Patient Booked',
      message: `Serial #${serialNumber} ${params.patientName} booked with ${doctor.name} on ${params.date} at ${params.timeSlot}.`,
      type: 'info',
      appointmentId: newAppointment.id,
      serialNumber
    });

    this.save();
    return { success: true, appointment: newAppointment };
  }

  public updateAppointmentStatus(
    id: string,
    newStatus: QueueStatus,
    doctorNotes?: string
  ): { success: boolean; appointment?: Appointment; error?: string } {
    const appIndex = this.data.appointments.findIndex(a => a.id === id);
    if (appIndex === -1) {
      return { success: false, error: 'Appointment not found.' };
    }

    const app = this.data.appointments[appIndex];
    const validation = isValidStatusTransition(app.status, newStatus);
    if (!validation.valid) {
      return { success: false, error: validation.reason };
    }

    const nowIso = new Date().toISOString();
    const updates: Partial<Appointment> = {
      status: newStatus,
      updatedAt: nowIso
    };

    if (doctorNotes !== undefined) {
      updates.doctorNotes = doctorNotes;
    }

    if (newStatus === 'Called') {
      updates.calledAt = nowIso;
    } else if (newStatus === 'In Progress') {
      updates.startedAt = nowIso;
    } else if (newStatus === 'Completed') {
      updates.completedAt = nowIso;
      updates.paymentStatus = 'Paid';
    }

    this.data.appointments[appIndex] = {
      ...app,
      ...updates
    };

    const updated = this.data.appointments[appIndex];

    this.createNotification({
      recipientUserId: updated.patientId,
      title: `Queue Status: ${newStatus}`,
      message: `Your appointment with ${updated.doctorName} (Serial #${updated.serialNumber}) is now "${newStatus}".`,
      type: newStatus === 'Called' ? 'urgent' : 'info',
      appointmentId: updated.id,
      serialNumber: updated.serialNumber
    });

    this.save();
    return { success: true, appointment: updated };
  }

  // --- Notifications Collection Methods ---
  public getNotifications(userId?: string, role?: string): AppNotification[] {
    return this.data.notifications
      .filter(n => {
        if (userId && n.recipientUserId === userId) return true;
        if (role && n.recipientRole === role) return true;
        if (!n.recipientUserId && !n.recipientRole) return true;
        return false;
      })
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, 30);
  }

  public createNotification(data: Omit<AppNotification, 'id' | 'read' | 'createdAt'>): AppNotification {
    const notif: AppNotification = {
      ...data,
      id: `notif_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      read: false,
      createdAt: new Date().toISOString()
    };
    this.data.notifications.push(notif);
    this.save();
    return notif;
  }

  public markNotificationAsRead(id: string): boolean {
    const notif = this.data.notifications.find(n => n.id === id);
    if (notif) {
      notif.read = true;
      this.save();
      return true;
    }
    return false;
  }

  public markAllNotificationsAsRead(userId?: string): void {
    this.data.notifications.forEach(n => {
      if (!userId || n.recipientUserId === userId) {
        n.read = true;
      }
    });
    this.save();
  }
}

export const db = new DatabaseStore();
