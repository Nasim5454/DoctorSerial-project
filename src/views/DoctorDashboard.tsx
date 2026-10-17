import React, { useState, useEffect, useCallback } from 'react';
import {
  Stethoscope,
  Megaphone,
  CheckCircle2,
  Clock,
  UserX,
  Play,
  FileText,
  Search,
  Filter,
  Printer,
  Calendar,
  AlertCircle,
  Loader2,
  Activity
} from 'lucide-react';
import { appointmentService, doctorService, queueService } from '../api/services.js';
import { useAuth } from '../context/AuthContext.js';
import { useSocket } from '../context/SocketContext.js';
import { QueueStatusBadge } from '../components/QueueStatusBadge.js';
import { TokenModal } from '../components/TokenModal.js';
import type { Appointment, Doctor, QueueStatus } from '../types/index.js';

export const DoctorDashboard: React.FC = () => {
  const { user, doctorProfile } = useAuth();
  const { socket } = useSocket();

  const [currentDoctor, setCurrentDoctor] = useState<Doctor | null>(doctorProfile || null);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [selectedTokenAppointment, setSelectedTokenAppointment] = useState<Appointment | null>(null);

  // Clinical notes state
  const [doctorNotes, setDoctorNotes] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const [loading, setLoading] = useState<boolean>(true);
  const [actionLoading, setActionLoading] = useState<boolean>(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const today = new Date().toISOString().split('T')[0];

  const fetchDoctorData = useCallback(async () => {
    try {
      // Find doctor record if not in profile
      let doc = currentDoctor;
      if (!doc && user) {
        const allDocs = await doctorService.getAll();
        doc = allDocs.find(d => d.userId === user.id) || allDocs[0];
        setCurrentDoctor(doc);
      }

      if (doc) {
        const apps = await appointmentService.getAll({
          doctorId: doc.id,
          date: today,
        });
        setAppointments(apps);
      }
    } catch (err) {
      console.error('Failed to load doctor dashboard:', err);
    } finally {
      setLoading(false);
    }
  }, [currentDoctor, user, today]);

  useEffect(() => {
    fetchDoctorData();
  }, [fetchDoctorData]);

  // Real-time socket updates
  useEffect(() => {
    if (!socket) return;
    const handleUpdate = () => {
      fetchDoctorData();
    };

    socket.on('queue:updated', handleUpdate);
    socket.on('patient:called', handleUpdate);

    return () => {
      socket.off('queue:updated', handleUpdate);
      socket.off('patient:called', handleUpdate);
    };
  }, [socket, fetchDoctorData]);

  // Derived current states
  const waitingList = appointments
    .filter(a => a.status === 'Waiting')
    .sort((a, b) => a.serialNumber - b.serialNumber);

  const currentlyServing = appointments.find(a => a.status === 'In Progress') || null;
  const currentlyCalled = appointments.find(a => a.status === 'Called') || null;
  const activePatient = currentlyServing || currentlyCalled;

  // Initialize doctor notes if patient changes
  useEffect(() => {
    if (activePatient) {
      setDoctorNotes(activePatient.doctorNotes || '');
    } else {
      setDoctorNotes('');
    }
  }, [activePatient?.id]);

  const handleCallNext = async () => {
    if (!currentDoctor) return;
    setActionLoading(true);
    setMessage(null);
    try {
      const res = await queueService.callNext(currentDoctor.id);
      setMessage({ text: res.message, type: 'success' });
      await fetchDoctorData();
    } catch (err: unknown) {
      const errorObj = err as { response?: { data?: { error?: string } } };
      setMessage({ text: errorObj.response?.data?.error || 'Failed to call next patient.', type: 'error' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleStatusChange = async (appointmentId: string, newStatus: QueueStatus, notes?: string) => {
    setActionLoading(true);
    setMessage(null);
    try {
      await appointmentService.updateStatus(appointmentId, newStatus, notes);
      setMessage({ text: `Status updated to ${newStatus}.`, type: 'success' });
      await fetchDoctorData();
    } catch (err: unknown) {
      const errorObj = err as { response?: { data?: { error?: string } } };
      setMessage({ text: errorObj.response?.data?.error || 'Failed to update status.', type: 'error' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleDoctorStatusChange = async (newStatus: 'Active' | 'On Break' | 'Off Duty') => {
    if (!currentDoctor) return;
    try {
      await doctorService.updateStatus(currentDoctor.id, newStatus);
      setCurrentDoctor(prev => prev ? { ...prev, status: newStatus } : null);
      setMessage({ text: `Duty status updated to ${newStatus}.`, type: 'success' });
    } catch {
      setMessage({ text: 'Failed to update duty status.', type: 'error' });
    }
  };

  // Filtered appointments for table
  const filteredAppointments = appointments.filter(a => {
    if (statusFilter !== 'all' && a.status !== statusFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        a.patientName.toLowerCase().includes(q) ||
        a.patientPhone.toLowerCase().includes(q) ||
        a.serialNumber.toString() === q
      );
    }
    return true;
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fade-in">
      {/* Doctor Header Banner */}
      <div className="bg-white rounded-2xl border border-zinc-200 p-6 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-emerald-100 border border-emerald-200 flex items-center justify-center text-emerald-700 font-bold text-xl overflow-hidden shrink-0">
            {currentDoctor?.avatarUrl ? (
              <img
                src={currentDoctor.avatarUrl}
                alt={currentDoctor.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <Stethoscope size={28} />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-zinc-900">{currentDoctor?.name}</h1>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-semibold">
                {currentDoctor?.specialty}
              </span>
            </div>
            <p className="text-xs text-zinc-500 mt-0.5">
              {currentDoctor?.roomNumber} • Fee: Tk. {currentDoctor?.consultationFee} • Shift: {currentDoctor?.schedule.startTime} - {currentDoctor?.schedule.endTime}
            </p>
          </div>
        </div>

        {/* Doctor Duty Status Controls */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mr-1">Duty Status:</span>
          {(['Active', 'On Break', 'Off Duty'] as const).map(status => (
            <button
              key={status}
              onClick={() => handleDoctorStatusChange(status)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all border ${
                currentDoctor?.status === status
                  ? status === 'Active'
                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                    : status === 'On Break'
                    ? 'bg-amber-500 text-white border-amber-500 shadow-xs'
                    : 'bg-zinc-700 text-white border-zinc-700 shadow-xs'
                  : 'bg-zinc-50 text-zinc-600 border-zinc-200 hover:bg-zinc-100'
              }`}
            >
              {status}
            </button>
          ))}
        </div>
      </div>

      {/* Alert / Notice bar */}
      {message && (
        <div
          className={`p-3.5 rounded-xl border text-xs flex items-center justify-between ${
            message.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}
        >
          <div className="flex items-center gap-2">
            <AlertCircle size={16} />
            <span className="font-medium">{message.text}</span>
          </div>
          <button onClick={() => setMessage(null)} className="text-zinc-400 hover:text-zinc-600">
            Dismiss
          </button>
        </div>
      )}

      {/* Main Calling Station & Queue Stats (Grid 12) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Active Consultation Room Card (7 cols) */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-zinc-200 p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-4 border-b border-zinc-100">
              <div className="flex items-center gap-2">
                <Activity size={20} className="text-emerald-600" />
                <h2 className="text-base font-bold text-zinc-900">Consultation Station</h2>
              </div>

              {/* Call Next Button */}
              <button
                onClick={handleCallNext}
                disabled={actionLoading || waitingList.length === 0}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 shadow-sm disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              >
                {actionLoading ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <Megaphone size={16} className="animate-bounce" />
                )}
                <span>Call Next Patient</span>
                <span className="ml-1 px-1.5 py-0.5 rounded-md bg-white/20 text-[10px]">
                  ({waitingList.length} in queue)
                </span>
              </button>
            </div>

            {/* Currently Serving / Called Patient Details */}
            {activePatient ? (
              <div className="mt-5 space-y-4">
                <div className="p-4 rounded-xl bg-gradient-to-br from-emerald-50/70 to-zinc-50 border border-emerald-100">
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-emerald-800 tracking-wider">
                        Active Patient
                      </span>
                      <h3 className="text-2xl font-black text-zinc-900 mt-0.5">
                        {activePatient.patientName}
                      </h3>
                      <p className="text-xs text-zinc-500 mt-0.5">
                        {activePatient.patientPhone} • {activePatient.patientAge} years old ({activePatient.patientGender})
                      </p>
                    </div>

                    <div className="text-right">
                      <span className="text-3xl font-black font-mono text-emerald-700">
                        #{activePatient.serialNumber.toString().padStart(2, '0')}
                      </span>
                      <div className="mt-1">
                        <QueueStatusBadge status={activePatient.status} size="sm" />
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 pt-3 border-t border-emerald-100/80 text-xs text-zinc-700">
                    <strong className="text-zinc-900 font-semibold">Chief Complaint:</strong> {activePatient.reasonForVisit}
                  </div>
                </div>

                {/* Doctor Clinical Notes */}
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                    <FileText size={14} className="text-emerald-600" />
                    Doctor Clinical Notes & Recommendations
                  </label>
                  <textarea
                    rows={3}
                    value={doctorNotes}
                    onChange={e => setDoctorNotes(e.target.value)}
                    placeholder="Enter diagnosis, vitals (BP/pulse), prescription, or follow-up instructions..."
                    className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-zinc-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none bg-zinc-50 focus:bg-white"
                  />
                </div>
              </div>
            ) : (
              <div className="py-12 text-center text-zinc-400 space-y-2">
                <Stethoscope size={40} className="mx-auto text-zinc-300" />
                <p className="text-sm font-semibold text-zinc-600">Consultation desk is ready.</p>
                <p className="text-xs text-zinc-400">Click &ldquo;Call Next Patient&rdquo; above to call the next patient in line.</p>
              </div>
            )}
          </div>

          {/* Action Buttons for Active Patient */}
          {activePatient && (
            <div className="mt-5 pt-4 border-t border-zinc-100 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setSelectedTokenAppointment(activePatient)}
                  className="px-3 py-1.5 rounded-lg border border-zinc-200 text-zinc-700 hover:bg-zinc-50 text-xs font-semibold flex items-center gap-1.5"
                >
                  <Printer size={14} />
                  Token Slip
                </button>
                <button
                  onClick={() => handleStatusChange(activePatient.id, 'No Show')}
                  disabled={actionLoading}
                  className="px-3 py-1.5 rounded-lg border border-rose-200 text-rose-700 hover:bg-rose-50 text-xs font-semibold flex items-center gap-1.5"
                >
                  <UserX size={14} />
                  Mark No Show
                </button>
              </div>

              <div className="flex items-center gap-2">
                {activePatient.status === 'Called' && (
                  <button
                    onClick={() => handleStatusChange(activePatient.id, 'In Progress', doctorNotes)}
                    disabled={actionLoading}
                    className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs"
                  >
                    <Play size={15} />
                    Start Consultation (In Progress)
                  </button>
                )}

                {activePatient.status === 'In Progress' && (
                  <button
                    onClick={() => handleStatusChange(activePatient.id, 'Completed', doctorNotes)}
                    disabled={actionLoading}
                    className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs"
                  >
                    <CheckCircle2 size={16} />
                    Complete Consultation & Discharge
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Right: Today's Queue Breakdown Cards (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-zinc-200 shadow-xs">
              <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Waiting</span>
              <p className="text-3xl font-extrabold text-amber-600 font-mono mt-1">
                {appointments.filter(a => a.status === 'Waiting').length}
              </p>
              <p className="text-xs text-zinc-500 mt-1">Patients in hall</p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-zinc-200 shadow-xs">
              <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Completed</span>
              <p className="text-3xl font-extrabold text-blue-600 font-mono mt-1">
                {appointments.filter(a => a.status === 'Completed').length}
              </p>
              <p className="text-xs text-zinc-500 mt-1">Served today</p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-zinc-200 shadow-xs">
              <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Total Booked</span>
              <p className="text-3xl font-extrabold text-zinc-900 font-mono mt-1">
                {appointments.length}
              </p>
              <p className="text-xs text-zinc-500 mt-1">Today&apos;s roster</p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-zinc-200 shadow-xs">
              <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">No Show / Cancel</span>
              <p className="text-3xl font-extrabold text-rose-600 font-mono mt-1">
                {appointments.filter(a => a.status === 'Cancelled' || a.status === 'No Show').length}
              </p>
              <p className="text-xs text-zinc-500 mt-1">Absentees</p>
            </div>
          </div>

          {/* Up Next Preview Mini List */}
          <div className="bg-white rounded-2xl border border-zinc-200 p-5 shadow-xs">
            <h3 className="text-xs font-bold text-zinc-900 uppercase tracking-wider flex items-center justify-between mb-3">
              <span>Next In Queue</span>
              <Clock size={15} className="text-emerald-600" />
            </h3>
            <div className="space-y-2">
              {waitingList.slice(0, 3).map(app => (
                <div
                  key={app.id}
                  className="p-2.5 rounded-lg bg-zinc-50 border border-zinc-100 flex items-center justify-between text-xs"
                >
                  <div>
                    <p className="font-semibold text-zinc-900">{app.patientName}</p>
                    <p className="text-[11px] text-zinc-500">{app.timeSlot} • {app.reasonForVisit}</p>
                  </div>
                  <span className="font-mono font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                    #{app.serialNumber.toString().padStart(2, '0')}
                  </span>
                </div>
              ))}
              {waitingList.length === 0 && (
                <p className="text-xs text-zinc-400 text-center py-3">Queue is currently clear.</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Appointments List & Management Table */}
      <div className="bg-white rounded-2xl border border-zinc-200 shadow-xs overflow-hidden">
        {/* Table Filters Header */}
        <div className="p-5 border-b border-zinc-200 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <h2 className="text-base font-bold text-zinc-900">Today&apos;s Patient Roster</h2>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-zinc-100 text-zinc-700 font-medium">
              {filteredAppointments.length} total
            </span>
          </div>

          <div className="flex items-center gap-2.5">
            {/* Search */}
            <div className="relative">
              <Search size={14} className="absolute left-3 top-2.5 text-zinc-400 pointer-events-none" />
              <input
                type="text"
                placeholder="Search patient, phone, serial..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="pl-8 pr-3 py-1.5 text-xs rounded-lg border border-zinc-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 w-48 sm:w-56"
              />
            </div>

            {/* Status Filter */}
            <div className="flex items-center gap-1.5">
              <Filter size={14} className="text-zinc-400" />
              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
                className="text-xs px-2.5 py-1.5 rounded-lg border border-zinc-300 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="all">All Statuses</option>
                <option value="Waiting">Waiting</option>
                <option value="Called">Called</option>
                <option value="In Progress">In Progress</option>
                <option value="Completed">Completed</option>
                <option value="No Show">No Show</option>
                <option value="Cancelled">Cancelled</option>
              </select>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-zinc-50 border-b border-zinc-200 text-zinc-500 font-semibold uppercase tracking-wider">
                <th className="py-3 px-4">Serial</th>
                <th className="py-3 px-4">Slot</th>
                <th className="py-3 px-4">Patient Details</th>
                <th className="py-3 px-4">Reason / Notes</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Quick Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-zinc-400">
                    <Loader2 size={20} className="animate-spin mx-auto text-emerald-600 mb-2" />
                    Loading patient roster...
                  </td>
                </tr>
              ) : filteredAppointments.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-zinc-400">
                    No matching appointments found for today.
                  </td>
                </tr>
              ) : (
                filteredAppointments.map(app => (
                  <tr key={app.id} className="hover:bg-zinc-50/70 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-sm text-emerald-700">
                      #{app.serialNumber.toString().padStart(2, '0')}
                    </td>
                    <td className="py-3 px-4 font-semibold text-zinc-700">
                      {app.timeSlot}
                    </td>
                    <td className="py-3 px-4">
                      <p className="font-semibold text-zinc-900">{app.patientName}</p>
                      <p className="text-[11px] text-zinc-500">
                        {app.patientPhone} • {app.patientAge}y • {app.patientGender}
                      </p>
                    </td>
                    <td className="py-3 px-4 max-w-xs truncate">
                      <p className="text-zinc-800 font-medium">{app.reasonForVisit}</p>
                      {app.doctorNotes && (
                        <p className="text-[11px] text-zinc-500 italic truncate">Note: {app.doctorNotes}</p>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <QueueStatusBadge status={app.status} size="sm" />
                    </td>
                    <td className="py-3 px-4 text-right space-x-2">
                      <button
                        onClick={() => setSelectedTokenAppointment(app)}
                        className="px-2.5 py-1 text-zinc-600 hover:text-zinc-900 bg-zinc-100 hover:bg-zinc-200 rounded-md font-medium"
                        title="View Token"
                      >
                        Token
                      </button>

                      {app.status === 'Waiting' && (
                        <button
                          onClick={() => handleStatusChange(app.id, 'Called')}
                          className="px-2.5 py-1 text-purple-700 bg-purple-50 hover:bg-purple-100 rounded-md font-semibold"
                        >
                          Call
                        </button>
                      )}

                      {app.status === 'Called' && (
                        <button
                          onClick={() => handleStatusChange(app.id, 'In Progress')}
                          className="px-2.5 py-1 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-md font-semibold"
                        >
                          Serve
                        </button>
                      )}

                      {app.status === 'In Progress' && (
                        <button
                          onClick={() => handleStatusChange(app.id, 'Completed')}
                          className="px-2.5 py-1 text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-md font-semibold"
                        >
                          Complete
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
