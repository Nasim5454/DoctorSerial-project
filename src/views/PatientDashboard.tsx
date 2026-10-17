import React, { useState, useEffect, useCallback } from 'react';
import {
  Calendar,
  Clock,
  Stethoscope,
  Megaphone,
  CheckCircle2,
  AlertCircle,
  Plus,
  Printer,
  XCircle,
  Loader2,
  Users,
  Timer
} from 'lucide-react';
import { appointmentService, queueService } from '../api/services.js';
import { useAuth } from '../context/AuthContext.js';
import { useSocket } from '../context/SocketContext.js';
import { QueueStatusBadge } from '../components/QueueStatusBadge.js';
import { TokenModal } from '../components/TokenModal.js';
import type { Appointment, QueueSummary } from '../types/index.js';

interface Props {
  onOpenBooking: () => void;
}

export const PatientDashboard: React.FC<Props> = ({ onOpenBooking }) => {
  const { user } = useAuth();
  const { socket, lastCalledPatient } = useSocket();
  const today = new Date().toISOString().split('T')[0];

  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [queues, setQueues] = useState<QueueSummary[]>([]);
  const [selectedTokenAppointment, setSelectedTokenAppointment] = useState<Appointment | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [actionLoading, setActionLoading] = useState<boolean>(false);
  const [notice, setNotice] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const fetchPatientData = useCallback(async () => {
    if (!user) return;
    try {
      const [apps, queueData] = await Promise.all([
        appointmentService.getAll(),
        queueService.getTodayQueue(),
      ]);
      setAppointments(apps);
      setQueues(queueData.queues);
    } catch (err) {
      console.error('Failed to load patient dashboard:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchPatientData();
  }, [fetchPatientData]);

  // Real-time socket sync
  useEffect(() => {
    if (!socket) return;
    const handleUpdate = () => {
      fetchPatientData();
    };

    socket.on('queue:updated', handleUpdate);
    socket.on('patient:called', handleUpdate);

    return () => {
      socket.off('queue:updated', handleUpdate);
      socket.off('patient:called', handleUpdate);
    };
  }, [socket, fetchPatientData]);

  // Today's active appointment for the patient
  const todayAppointment = appointments.find(
    a => a.date === today && a.status !== 'Cancelled'
  );

  // Calculate position in queue for today's appointment
  const currentDocQueue = todayAppointment ? queues.find(q => q.doctorId === todayAppointment.doctorId) : null;
  const currentlyServingSerial = currentDocQueue?.currentlyServing?.serialNumber || 0;
  const currentlyCallingSerial = currentDocQueue?.currentlyCalling?.serialNumber || 0;

  let patientsAhead = 0;
  let estimatedWait = 0;

  if (todayAppointment && todayAppointment.status === 'Waiting') {
    const baseline = Math.max(currentlyServingSerial, currentlyCallingSerial);
    patientsAhead = Math.max(0, todayAppointment.serialNumber - (baseline > 0 ? baseline : 1));
    estimatedWait = patientsAhead * 15; // 15 mins avg consultation time
  }

  const isMyTurn = todayAppointment && todayAppointment.status === 'Called';

  const handleCancelAppointment = async (id: string) => {
    if (!confirm('Are you sure you want to cancel this appointment?')) return;
    setActionLoading(true);
    setNotice(null);
    try {
      await appointmentService.cancel(id);
      setNotice({ text: 'Appointment cancelled successfully.', type: 'success' });
      await fetchPatientData();
    } catch {
      setNotice({ text: 'Could not cancel appointment.', type: 'error' });
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fade-in">
      {/* Welcome Banner */}
      <div className="bg-white rounded-2xl border border-zinc-200 p-6 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs uppercase font-bold tracking-wider text-emerald-700">Patient Care Portal</span>
          <h1 className="text-xl font-bold text-zinc-900 mt-0.5">Welcome, {user?.name}</h1>
          <p className="text-xs text-zinc-500 mt-0.5">
            Track your live clinic serial, estimated wait times, and consultation history.
          </p>
        </div>

        <button
          onClick={onOpenBooking}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-sm shadow-emerald-600/20 transition-all"
        >
          <Plus size={16} />
          Book New Appointment
        </button>
      </div>

      {/* Notice alert */}
      {notice && (
        <div
          className={`p-3.5 rounded-xl border text-xs flex items-center justify-between ${
            notice.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}
        >
          <div className="flex items-center gap-2">
            <AlertCircle size={16} />
            <span className="font-medium">{notice.text}</span>
          </div>
          <button onClick={() => setNotice(null)} className="text-zinc-400 hover:text-zinc-600">
            Dismiss
          </button>
        </div>
      )}

      {/* Live Queue Tracker Card (Special Feature for Patients!) */}
      {todayAppointment ? (
        <div className={`rounded-2xl border p-6 shadow-sm transition-all ${
          isMyTurn
            ? 'bg-gradient-to-r from-purple-50 via-white to-purple-50 border-purple-300 ring-2 ring-purple-500/20'
            : 'bg-white border-zinc-200'
        }`}>
          <div className="flex items-center justify-between pb-4 border-b border-zinc-100">
            <div className="flex items-center gap-2">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
              </span>
              <h2 className="text-base font-bold text-zinc-900">Today&apos;s Live Queue Tracker</h2>
            </div>
            <QueueStatusBadge status={todayAppointment.status} size="md" />
          </div>

          {/* Urgent Call Alert if Called */}
          {isMyTurn && (
            <div className="my-4 p-4 rounded-xl bg-purple-600 text-white flex items-center justify-between animate-pulse shadow-md">
              <div className="flex items-center gap-3">
                <Megaphone size={28} className="animate-bounce" />
                <div>
                  <p className="font-bold text-base">You are being called right now!</p>
                  <p className="text-xs text-purple-100">
                    Please proceed to <strong className="underline">{currentDocQueue?.roomNumber || 'Consultation Room'}</strong> to see {todayAppointment.doctorName}.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedTokenAppointment(todayAppointment)}
                className="px-3.5 py-1.5 rounded-lg bg-white text-purple-900 text-xs font-bold hover:bg-purple-50 shrink-0"
              >
                Show Token
              </button>
            </div>
          )}

          {/* Queue Metrics Grid */}
          <div className="mt-5 grid grid-cols-1 sm:grid-cols-4 gap-4">
            {/* Serial Number */}
            <div className="p-4 rounded-xl bg-emerald-50/70 border border-emerald-100 text-center">
              <span className="text-[10px] uppercase font-bold text-emerald-800 tracking-wider">
                Your Assigned Serial
              </span>
              <p className="text-4xl font-black text-emerald-700 font-mono mt-1">
                #{todayAppointment.serialNumber.toString().padStart(2, '0')}
              </p>
              <p className="text-[11px] text-zinc-500 mt-1">{todayAppointment.timeSlot}</p>
            </div>

            {/* Doctor Info */}
            <div className="p-4 rounded-xl bg-zinc-50 border border-zinc-100">
              <span className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider">
                Doctor & Room
              </span>
              <p className="font-bold text-zinc-900 text-sm mt-1">{todayAppointment.doctorName}</p>
              <p className="text-xs text-emerald-700 font-semibold">{todayAppointment.doctorSpecialty}</p>
              <p className="text-[11px] text-zinc-500 mt-0.5">{currentDocQueue?.roomNumber || 'Clinic Room'}</p>
            </div>

            {/* Patients Ahead */}
            <div className="p-4 rounded-xl bg-zinc-50 border border-zinc-100 text-center">
              <span className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider flex items-center justify-center gap-1">
                <Users size={12} />
                Patients Ahead
              </span>
              <p className="text-3xl font-extrabold text-zinc-900 font-mono mt-1">
                {todayAppointment.status === 'Completed' ? '0' : patientsAhead}
              </p>
              <p className="text-[11px] text-zinc-500 mt-1">
                {todayAppointment.status === 'Completed' ? 'Consultation Finished' : 'In waiting hall'}
              </p>
            </div>

            {/* Estimated Wait */}
            <div className="p-4 rounded-xl bg-zinc-50 border border-zinc-100 text-center">
              <span className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider flex items-center justify-center gap-1">
                <Timer size={12} />
                Estimated Wait
              </span>
              <p className="text-3xl font-extrabold text-amber-600 font-mono mt-1">
                {todayAppointment.status === 'Completed' ? '0' : `~${estimatedWait}`}m
              </p>
              <p className="text-[11px] text-zinc-500 mt-1">Real-time estimate</p>
            </div>
          </div>

          <div className="mt-5 pt-4 border-t border-zinc-100 flex items-center justify-between">
            <span className="text-xs text-zinc-500">
              Reason: <strong className="text-zinc-700">{todayAppointment.reasonForVisit}</strong>
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setSelectedTokenAppointment(todayAppointment)}
                className="px-3 py-1.5 rounded-lg border border-zinc-200 text-zinc-700 hover:bg-zinc-50 text-xs font-semibold flex items-center gap-1.5"
              >
                <Printer size={14} />
                View & Print Token
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-zinc-200 p-8 shadow-xs text-center space-y-3">
          <Calendar size={36} className="mx-auto text-emerald-600 opacity-60" />
          <h2 className="text-base font-bold text-zinc-900">No Appointments Scheduled for Today</h2>
          <p className="text-xs text-zinc-500 max-w-md mx-auto">
            You do not currently have an active serial number in today&apos;s queue. Click below to choose a doctor and reserve your appointment slot.
          </p>
          <div>
            <button
              onClick={onOpenBooking}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-sm"
            >
              <Plus size={16} />
              Book Appointment Now
            </button>
          </div>
        </div>
      )}

      {/* Appointment History & Upcoming Appointments Table */}
      <div className="bg-white rounded-2xl border border-zinc-200 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-zinc-200 flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-zinc-900">My Appointments History</h2>
            <p className="text-xs text-zinc-500">Past consultations and upcoming scheduled dates</p>
          </div>
          <span className="text-xs px-2.5 py-1 rounded-full bg-zinc-100 text-zinc-700 font-semibold">
            {appointments.length} record{appointments.length !== 1 ? 's' : ''}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-zinc-50 border-b border-zinc-200 text-zinc-500 font-semibold uppercase tracking-wider">
                <th className="py-3 px-4">Serial</th>
                <th className="py-3 px-4">Date & Slot</th>
                <th className="py-3 px-4">Doctor & Specialty</th>
                <th className="py-3 px-4">Reason for Visit</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Fee / Payment</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-zinc-400">
                    <Loader2 size={20} className="animate-spin mx-auto text-emerald-600 mb-2" />
                    Loading your appointments...
                  </td>
                </tr>
              ) : appointments.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-zinc-400">
                    You have no booked appointments yet.
                  </td>
                </tr>
              ) : (
                appointments.map(app => (
                  <tr key={app.id} className="hover:bg-zinc-50/70 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-emerald-700 text-sm">
                      #{app.serialNumber.toString().padStart(2, '0')}
                    </td>
                    <td className="py-3 px-4">
                      <p className="font-semibold text-zinc-900">{app.date}</p>
                      <p className="text-[11px] text-zinc-500">{app.timeSlot}</p>
                    </td>
                    <td className="py-3 px-4">
                      <p className="font-semibold text-zinc-900">{app.doctorName}</p>
                      <p className="text-[11px] text-emerald-700 font-medium">{app.doctorSpecialty}</p>
                    </td>
                    <td className="py-3 px-4 max-w-xs truncate text-zinc-700">
                      {app.reasonForVisit}
                    </td>
                    <td className="py-3 px-4">
                      <QueueStatusBadge status={app.status} size="sm" />
                    </td>
                    <td className="py-3 px-4">
                      <p className="font-semibold text-zinc-900">Tk. {app.consultationFee}</p>
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                        app.paymentStatus === 'Paid' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
                      }`}>
                        {app.paymentStatus}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right space-x-2">
                      <button
                        onClick={() => setSelectedTokenAppointment(app)}
                        className="px-2.5 py-1 text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 rounded-md transition-colors"
                      >
                        Token Slip
                      </button>

                      {app.status === 'Waiting' && (
                        <button
                          onClick={() => handleCancelAppointment(app.id)}
                          disabled={actionLoading}
                          className="px-2.5 py-1 text-xs font-semibold text-rose-700 hover:bg-rose-50 rounded-md transition-colors"
                        >
                          Cancel
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Token Modal */}
      <TokenModal
        appointment={selectedTokenAppointment}
        onClose={() => setSelectedTokenAppointment(null)}
      />
    </div>
  );
};
