import { Router } from 'express';
import { db } from '../db/storage.js';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth.js';
import { broadcastQueueUpdate, broadcastPatientCalled } from '../socket.js';
import type { QueueStatus } from '../types.js';

const router = Router();

// GET /api/appointments - List appointments with comprehensive search & filters
router.get('/', authenticateToken, (req: AuthenticatedRequest, res) => {
  const { doctorId, patientId, date, status, search } = req.query;

  // Role scoping: Patients can only list their own appointments unless receptionist/admin
  let effectivePatientId = patientId as string | undefined;
  if (req.user?.role === 'Patient') {
    effectivePatientId = req.user.id;
  }

  // Doctor role: if not specified, doctors can view their own appointments
  let effectiveDoctorId = doctorId as string | undefined;
  if (req.user?.role === 'Doctor' && !doctorId) {
    const doc = db.findDoctorById(req.user.id);
    if (doc) effectiveDoctorId = doc.id;
  }

  const appointments = db.getAllAppointments({
    doctorId: effectiveDoctorId,
    patientId: effectivePatientId,
    date: date as string | undefined,
    status: status as QueueStatus | undefined,
    search: search as string | undefined
  });

  res.json({ appointments });
});

// GET /api/appointments/:id - Single appointment
router.get('/:id', authenticateToken, (req: AuthenticatedRequest, res) => {
  const appointment = db.findAppointmentById(req.params.id);
  if (!appointment) {
    res.status(404).json({ error: 'Appointment not found.' });
    return;
  }

  // Scoping check
  if (req.user?.role === 'Patient' && appointment.patientId !== req.user.id) {
    res.status(403).json({ error: 'Access denied.' });
    return;
  }

  res.json({ appointment });
});

// POST /api/appointments - Create an appointment with double-booking prevention and serial allocation
router.post('/', authenticateToken, (req: AuthenticatedRequest, res) => {
  const {
    doctorId,
    patientId,
    patientName,
    patientPhone,
    patientAge,
    patientGender,
    date,
    timeSlot,
    reasonForVisit,
    paymentStatus
  } = req.body;

  // Validation
  if (!doctorId || !date || !timeSlot || !reasonForVisit) {
    res.status(400).json({ error: 'Doctor, appointment date, time slot, and reason for visit are required.' });
    return;
  }

  const doctor = db.findDoctorById(doctorId);
  if (!doctor) {
    res.status(404).json({ error: 'Selected doctor not found.' });
    return;
  }

  // Determine patient details: either from logged-in user or walk-in patient created by receptionist
  let finalPatientId = patientId;
  let finalPatientName = patientName;
  let finalPatientPhone = patientPhone;
  let finalPatientAge = Number(patientAge) || 30;
  let finalPatientGender = patientGender || 'Other';

  if (req.user?.role === 'Patient') {
    const loggedInUser = db.findUserById(req.user.id);
    finalPatientId = req.user.id;
    finalPatientName = patientName || loggedInUser?.name || req.user.name;
    finalPatientPhone = patientPhone || loggedInUser?.phone || '+1 555-0100';
  } else {
    // Receptionist / Admin booking for a patient
    if (!finalPatientName || !finalPatientPhone) {
      res.status(400).json({ error: 'Patient name and phone number are required for booking.' });
      return;
    }
    if (!finalPatientId) {
      // Find or register walk-in patient
      const existingUser = db.findUserByEmail(`${finalPatientPhone.replace(/[^0-9]/g, '')}@walkin.doctorserial.com`);
      if (existingUser) {
        finalPatientId = existingUser.id;
      } else {
        const walkin = db.createUser({
          name: finalPatientName,
          email: `${finalPatientPhone.replace(/[^0-9]/g, '')}@walkin.doctorserial.com`,
          passwordHash: 'WALKIN_GUEST',
          role: 'Patient',
          phone: finalPatientPhone
        });
        finalPatientId = walkin.id;
      }
    }
  }

  const result = db.createAppointment({
    doctorId,
    patientId: finalPatientId,
    patientName: finalPatientName,
    patientPhone: finalPatientPhone,
    patientAge: finalPatientAge,
    patientGender: finalPatientGender,
    date,
    timeSlot,
    reasonForVisit,
    paymentStatus: paymentStatus || 'Pending'
  });

  if (!result.success || !result.appointment) {
    res.status(409).json({ error: result.error || 'Failed to book appointment due to slot conflict.' });
    return;
  }

  // Real-time broadcast to all queue screens
  broadcastQueueUpdate({
    doctorId: doctor.id,
    date,
    appointmentId: result.appointment.id,
    status: 'Waiting',
    serialNumber: result.appointment.serialNumber
  });

  res.status(201).json({
    success: true,
    message: `Appointment confirmed! Your Serial Number is #${result.appointment.serialNumber}`,
    appointment: result.appointment
  });
});

// PATCH /api/appointments/:id/status - Update queue status
router.patch('/:id/status', authenticateToken, (req: AuthenticatedRequest, res) => {
  const { status, doctorNotes } = req.body;
  if (!status) {
    res.status(400).json({ error: 'Status is required.' });
    return;
  }

  const existing = db.findAppointmentById(req.params.id);
  if (!existing) {
    res.status(404).json({ error: 'Appointment not found.' });
    return;
  }

  // Role permissions:
  // Patient can only cancel their own appointment
  if (req.user?.role === 'Patient') {
    if (status !== 'Cancelled' || existing.patientId !== req.user.id) {
      res.status(403).json({ error: 'Patients can only cancel their own upcoming appointments.' });
      return;
    }
  }

  const result = db.updateAppointmentStatus(req.params.id, status as QueueStatus, doctorNotes);
  if (!result.success || !result.appointment) {
    res.status(400).json({ error: result.error || 'Failed to update status.' });
    return;
  }

  const app = result.appointment;
  const doctor = db.findDoctorById(app.doctorId);

  // Broadcast queue update to all screens
  broadcastQueueUpdate({
    doctorId: app.doctorId,
    date: app.date,
    appointmentId: app.id,
    status: app.status,
    serialNumber: app.serialNumber
  });

  // If status is 'Called', trigger audio announcement & highlight on public TV board and patient view
  if (status === 'Called') {
    broadcastPatientCalled({
      appointmentId: app.id,
      serialNumber: app.serialNumber,
      doctorName: app.doctorName,
      doctorSpecialty: app.doctorSpecialty,
      roomNumber: doctor?.roomNumber || 'Room 101',
      patientName: app.patientName,
      patientId: app.patientId
    });
  }

  res.json({
    success: true,
    message: `Appointment Serial #${app.serialNumber} marked as "${app.status}".`,
    appointment: app
  });
});

// DELETE /api/appointments/:id - Cancel appointment
router.delete('/:id', authenticateToken, (req: AuthenticatedRequest, res) => {
  const app = db.findAppointmentById(req.params.id);
  if (!app) {
    res.status(404).json({ error: 'Appointment not found.' });
    return;
  }

  if (req.user?.role === 'Patient' && app.patientId !== req.user.id) {
    res.status(403).json({ error: 'You can only cancel your own appointments.' });
    return;
  }

  const result = db.updateAppointmentStatus(req.params.id, 'Cancelled');
  if (!result.success) {
    res.status(400).json({ error: result.error || 'Could not cancel appointment.' });
    return;
  }

  broadcastQueueUpdate({
    doctorId: app.doctorId,
    date: app.date,
    appointmentId: app.id,
    status: 'Cancelled',
    serialNumber: app.serialNumber
  });

  res.json({ success: true, message: 'Appointment has been cancelled.' });
});

export default router;
