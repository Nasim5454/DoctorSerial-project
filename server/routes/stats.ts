import { Router } from 'express';
import { db } from '../db/storage.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';

const router = Router();

// GET /api/stats/summary - High level KPI statistics for Admin & Receptionist
router.get('/summary', authenticateToken, requireRole(['Admin', 'Receptionist', 'Doctor']), (req, res) => {
  const today = new Date().toISOString().split('T')[0];

  const allAppointments = db.getAllAppointments();
  const todayAppointments = allAppointments.filter(a => a.date === today);
  const doctors = db.getAllDoctors();
  const allUsers = db.getAllUsers();
  const patients = allUsers.filter(u => u.role === 'Patient');

  const completedToday = todayAppointments.filter(a => a.status === 'Completed').length;
  const waitingToday = todayAppointments.filter(a => a.status === 'Waiting').length;
  const inProgressToday = todayAppointments.filter(a => a.status === 'In Progress' || a.status === 'Called').length;
  const cancelledToday = todayAppointments.filter(a => a.status === 'Cancelled' || a.status === 'No Show').length;

  const revenueToday = todayAppointments
    .filter(a => a.paymentStatus === 'Paid' || a.status === 'Completed')
    .reduce((sum, a) => sum + (a.consultationFee || 0), 0);

  // Breakdown per doctor
  const doctorStats = doctors.map(doc => {
    const docTodayApps = todayAppointments.filter(a => a.doctorId === doc.id);
    return {
      doctorId: doc.id,
      doctorName: doc.name,
      specialty: doc.specialty,
      roomNumber: doc.roomNumber,
      totalToday: docTodayApps.length,
      waiting: docTodayApps.filter(a => a.status === 'Waiting').length,
      inProgress: docTodayApps.filter(a => a.status === 'In Progress' || a.status === 'Called').length,
      completed: docTodayApps.filter(a => a.status === 'Completed').length,
      status: doc.status
    };
  });

  res.json({
    date: today,
    metrics: {
      totalPatients: patients.length,
      totalDoctors: doctors.length,
      appointmentsToday: todayAppointments.length,
      completedToday,
      waitingToday,
      inProgressToday,
      cancelledToday,
      revenueToday
    },
    doctorStats
  });
});

export default router;
