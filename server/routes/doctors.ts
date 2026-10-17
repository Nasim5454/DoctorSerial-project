import { Router } from 'express';
import { db } from '../db/storage.js';
import { authenticateToken, requireRole, AuthenticatedRequest } from '../middleware/auth.js';
import { generateDoctorTimeSlots, getAvailableSlots } from '../logic/queueRules.js';
import { broadcastQueueUpdate } from '../socket.js';

const router = Router();

// GET /api/doctors - List all doctors
router.get('/', (_req, res) => {
  const doctors = db.getAllDoctors();
  res.json({ doctors });
});

// GET /api/doctors/:id - Single doctor details
router.get('/:id', (req, res) => {
  const doctor = db.findDoctorById(req.params.id);
  if (!doctor) {
    res.status(404).json({ error: 'Doctor not found.' });
    return;
  }
  res.json({ doctor });
});

// GET /api/doctors/:id/slots - Available time slots for a given date
router.get('/:id/slots', (req, res) => {
  const { date } = req.query;
  if (!date || typeof date !== 'string') {
    res.status(400).json({ error: 'Date query parameter is required (YYYY-MM-DD).' });
    return;
  }

  const doctor = db.findDoctorById(req.params.id);
  if (!doctor) {
    res.status(404).json({ error: 'Doctor not found.' });
    return;
  }

  // Check if doctor works on this day of week
  const dateObj = new Date(`${date}T00:00:00`);
  const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const dayName = daysOfWeek[dateObj.getDay()];

  const isWorking = doctor.schedule.workingDays.includes(dayName);

  // Generate all possible slots from doctor's shift
  const allSlots = generateDoctorTimeSlots(
    doctor.schedule.startTime,
    doctor.schedule.endTime,
    doctor.schedule.slotDurationMinutes || 20
  );

  // Find all active booked slots on this date
  const bookedAppointments = db.getAllAppointments({
    doctorId: doctor.id,
    date
  }).filter(a => a.status !== 'Cancelled');

  const bookedSlots = bookedAppointments.map(a => a.timeSlot);
  const availableSlots = isWorking ? getAvailableSlots(allSlots, bookedSlots) : [];

  res.json({
    doctorId: doctor.id,
    date,
    dayName,
    isWorkingDay: isWorking,
    totalSlots: allSlots.length,
    bookedCount: bookedSlots.length,
    availableSlots,
    allSlots,
    doctorSchedule: doctor.schedule
  });
});

// PATCH /api/doctors/:id/status - Toggle status ('Active', 'On Break', 'Off Duty')
router.patch('/:id/status', authenticateToken, (req: AuthenticatedRequest, res) => {
  const { status } = req.body;
  if (!['Active', 'On Break', 'Off Duty'].includes(status)) {
    res.status(400).json({ error: 'Invalid doctor status. Allowed: Active, On Break, Off Duty.' });
    return;
  }

  const doctor = db.findDoctorById(req.params.id);
  if (!doctor) {
    res.status(404).json({ error: 'Doctor not found.' });
    return;
  }

  // Only the doctor themselves or Admin/Receptionist can change status
  if (req.user?.role === 'Doctor' && doctor.userId !== req.user.id) {
    res.status(403).json({ error: 'You can only update your own status.' });
    return;
  }

  const updated = db.updateDoctor(doctor.id, { status });
  const today = new Date().toISOString().split('T')[0];
  broadcastQueueUpdate({
    doctorId: doctor.id,
    date: today,
    status
  });

  res.json({ success: true, doctor: updated });
});

// POST /api/doctors - Admin only: Add new doctor
router.post('/', authenticateToken, requireRole(['Admin']), (req, res) => {
  const {
    name,
    email,
    phone,
    specialty,
    qualifications,
    experienceYears,
    consultationFee,
    roomNumber,
    workingDays,
    startTime,
    endTime,
    slotDurationMinutes,
    maxDailyPatients,
    bio,
    avatarUrl
  } = req.body;

  if (!name || !email || !specialty || !consultationFee || !roomNumber) {
    res.status(400).json({ error: 'Doctor name, email, specialty, consultation fee, and room number are required.' });
    return;
  }

  const newDoc = db.createDoctor({
    userId: `usr_doc_${Date.now()}`,
    name,
    email,
    phone: phone || '+1 555-0199',
    specialty,
    qualifications: qualifications || 'MD, General Practice',
    experienceYears: Number(experienceYears) || 5,
    consultationFee: Number(consultationFee),
    roomNumber,
    status: 'Active',
    avatarUrl: avatarUrl || 'https://images.unsplash.com/photo-1537368910025-700350fe46c7?w=150&auto=format&fit=crop&q=80',
    bio: bio || `Specialist in ${specialty}.`,
    schedule: {
      workingDays: workingDays || ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
      startTime: startTime || '09:00',
      endTime: endTime || '13:00',
      slotDurationMinutes: Number(slotDurationMinutes) || 20,
      maxDailyPatients: Number(maxDailyPatients) || 20
    }
  });

  res.status(201).json({ success: true, doctor: newDoc });
});

export default router;
