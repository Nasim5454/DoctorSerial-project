import { Router } from 'express';
import { db } from '../db/storage.js';
import { authenticateToken, requireRole, AuthenticatedRequest } from '../middleware/auth.js';
import { broadcastQueueUpdate, broadcastPatientCalled } from '../socket.js';
import type { QueueSummary, Appointment } from '../types.js';

const router = Router();

// GET /api/queue/today - Comprehensive live queue view for public TV display, receptionist, and doctors
router.get('/today', (req, res) => {
  const { doctorId } = req.query;
  const today = (req.query.date as string) || new Date().toISOString().split('T')[0];

  const doctors = db.getAllDoctors();
  const allTodayAppointments = db.getAllAppointments({ date: today });

  const queueSummaries: QueueSummary[] = doctors
    .filter(doc => !doctorId || doc.id === doctorId)
    .map(doc => {
      const docAppointments = allTodayAppointments.filter(a => a.doctorId === doc.id);

      const waiting = docAppointments
        .filter(a => a.status === 'Waiting')
        .sort((a, b) => a.serialNumber - b.serialNumber);

      const called = docAppointments
        .filter(a => a.status === 'Called')
        .sort((a, b) => (b.calledAt || '').localeCompare(a.calledAt || ''));

      const inProgress = docAppointments
        .filter(a => a.status === 'In Progress')
        .sort((a, b) => (b.startedAt || '').localeCompare(a.startedAt || ''));

      const completed = docAppointments.filter(a => a.status === 'Completed');

      return {
        doctorId: doc.id,
        doctorName: doc.name,
        specialty: doc.specialty,
        roomNumber: doc.roomNumber,
        status: doc.status,
        date: today,
        totalAppointments: docAppointments.length,
        waitingCount: waiting.length,
        calledCount: called.length,
        inProgressCount: inProgress.length,
        completedCount: completed.length,
        currentlyCalling: called[0] || null,
        currentlyServing: inProgress[0] || null,
        nextInQueue: waiting[0] || null
      };
    });

  res.json({
    date: today,
    queues: queueSummaries,
    appointments: allTodayAppointments
  });
});

// POST /api/queue/call-next - Doctor or Receptionist calls next waiting patient in line
router.post('/call-next', authenticateToken, requireRole(['Doctor', 'Receptionist', 'Admin']), (req: AuthenticatedRequest, res) => {
  const { doctorId } = req.body;
  const today = new Date().toISOString().split('T')[0];

  let targetDoctorId = doctorId;
  if (req.user?.role === 'Doctor') {
    const doc = db.findDoctorById(req.user.id);
    if (doc) targetDoctorId = doc.id;
  }

  if (!targetDoctorId) {
    res.status(400).json({ error: 'Doctor ID is required to call next patient.' });
    return;
  }

  const doctor = db.findDoctorById(targetDoctorId);
  if (!doctor) {
    res.status(404).json({ error: 'Doctor not found.' });
    return;
  }

  const todayAppointments = db.getAllAppointments({
    doctorId: targetDoctorId,
    date: today
  });

  // Find next in Waiting status with lowest serial
  const nextWaiting = todayAppointments
    .filter(a => a.status === 'Waiting')
    .sort((a, b) => a.serialNumber - b.serialNumber)[0];

  if (!nextWaiting) {
    res.status(404).json({ error: 'No more waiting patients in queue for today.' });
    return;
  }

  // Update status to 'Called'
  const result = db.updateAppointmentStatus(nextWaiting.id, 'Called');
  if (!result.success || !result.appointment) {
    res.status(400).json({ error: result.error || 'Failed to call patient.' });
    return;
  }

  const calledApp = result.appointment;

  // Broadcast to all screens and public waiting TV board
  broadcastPatientCalled({
    appointmentId: calledApp.id,
    serialNumber: calledApp.serialNumber,
    doctorName: calledApp.doctorName,
    doctorSpecialty: calledApp.doctorSpecialty,
    roomNumber: doctor.roomNumber,
    patientName: calledApp.patientName,
    patientId: calledApp.patientId
  });

  broadcastQueueUpdate({
    doctorId: targetDoctorId,
    date: today,
    appointmentId: calledApp.id,
    status: 'Called',
    serialNumber: calledApp.serialNumber
  });

  res.json({
    success: true,
    message: `Calling Serial #${calledApp.serialNumber} (${calledApp.patientName}) to ${doctor.roomNumber}!`,
    appointment: calledApp
  });
});

export default router;
