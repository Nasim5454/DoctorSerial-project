import React, { useState, useEffect, useCallback } from 'react';
import {
  ClipboardList,
  Plus,
  Megaphone,
  Search,
  Filter,
  Calendar,
  Printer,
  Stethoscope,
  Clock,
  UserCheck,
  AlertCircle,
  Loader2,
  RefreshCw
} from 'lucide-react';
import { appointmentService, doctorService, queueService } from '../api/services.js';
import { useSocket } from '../context/SocketContext.js';
import { QueueStatusBadge } from '../components/QueueStatusBadge.js';
import { TokenModal } from '../components/TokenModal.js';
import type { Appointment, Doctor, QueueSummary, QueueStatus } from '../types/index.js';

interface Props {
  onOpenBooking: () => void;
}

export const ReceptionistDashboard: React.FC<Props> = ({ onOpenBooking }) => {
  const { socket } = useSocket();
  const today = new Date().toISOString().split('T')[0];

  const [selectedDate, setSelectedDate] = useState<string>(today);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [queues, setQueues] = useState<QueueSummary[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [selectedTokenAppointment, setSelectedTokenAppointment] = useState<Appointment | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [doctorFilter, setDoctorFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const [loading, setLoading] = useState<boolean>(true);
  const [callingDoctorId, setCallingDoctorId] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const fetchAllData = useCallback(async () => {
    try {
      const [docs, queueData, apps] = await Promise.all([
        doctorService.getAll(),
        queueService.getTodayQueue(undefined, selectedDate),
        appointmentService.getAll({ date: selectedDate }),
      ]);
      setDoctors(docs);
      setQueues(queueData.queues);
      setAppointments(apps);
    } catch (err) {
      console.error('Failed to load receptionist dashboard data:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedDate]);

  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  // Socket listener for real-time queue synchronization
  useEffect(() => {
    if (!socket) return;
    const handleUpdate = () => {
      fetchAllData();
    };

    socket.on('queue:updated', handleUpdate);
    socket.on('patient:called', handleUpdate);

    return () => {
      socket.off('queue:updated', handleUpdate);
      socket.off('patient:called', handleUpdate);
    };
  }, [socket, fetchAllData]);

  const handleCallNextForDoctor = async (doctorId: string) => {
    setCallingDoctorId(doctorId);
    setNotice(null);
    try {
      const res = await queueService.callNext(doctorId);
      setNotice({ text: res.message, type: 'success' });
      await fetchAllData();
    } catch (err: unknown) {
      const errorObj = err as { response?: { data?: { error?: string } } };
      setNotice({ text: errorObj.response?.data?.error || 'Failed to call patient.', type: 'error' });
    } finally {
      setCallingDoctorId(null);
    }
  };

  const handleStatusChange = async (appointmentId: string, newStatus: QueueStatus) => {
    try {
      await appointmentService.updateStatus(appointmentId, newStatus);
      await fetchAllData();
    } catch (err: unknown) {
      const errorObj = err as { response?: { data?: { error?: string } } };
      setNotice({ text: errorObj.response?.data?.error || 'Could not update status.', type: 'error' });
    }
  };

  // Filtered appointments
  const filteredAppointments = appointments.filter(a => {
    if (doctorFilter !== 'all' && a.doctorId !== doctorFilter) return false;
    if (statusFilter !== 'all' && a.status !== statusFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        a.patientName.toLowerCase().includes(q) ||
        a.patientPhone.toLowerCase().includes(q) ||
        a.doctorName.toLowerCase().includes(q) ||
        a.serialNumber.toString() === q
      );
    }
    return true;
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fade-in">
      {/* Top Receptionist Command Header */}
      <div className="bg-white rounded-2xl border border-zinc-200 p-6 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <ClipboardList size={22} className="text-emerald-600" />
            <h1 className="text-xl font-bold text-zinc-900">Receptionist Queue Management Center</h1>
          </div>
          <p className="text-xs text-zinc-500 mt-1">
            Walk-in patient registrations, live queue routing, calling station, and token issuance.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => fetchAllData()}
            className="p-2 rounded-xl text-zinc-600 hover:text-zinc-900 bg-zinc-100 hover:bg-zinc-200 transition-colors"
            title="Refresh queue"
          >
            <RefreshCw size={16} />
          </button>

          <button
            onClick={onOpenBooking}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-sm shadow-emerald-600/20 transition-all"
          >
            <Plus size={16} />
            + New Appointment / Walk-in
          </button>
        </div>
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

      {/* Doctor Queue Matrix Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {queues.map(q => (
          <div
            key={q.doctorId}
            className="bg-white rounded-2xl border border-zinc-200 p-5 shadow-xs flex flex-col justify-between hover:border-emerald-300 transition-colors"
          >
            <div>
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-bold text-sm text-zinc-900">{q.doctorName}</h3>
                  <p className="text-xs text-emerald-700 font-semibold">{q.specialty}</p>
                  <p className="text-[11px] text-zinc-400 mt-0.5">{q.roomNumber}</p>
                </div>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    q.status === 'Active'
                      ? 'bg-emerald-100 text-emerald-800'
                      : q.status === 'On Break'
                      ? 'bg-amber-100 text-amber-800'
                      : 'bg-zinc-100 text-zinc-600'
                  }`}
                >
                  {q.status}
                </span>
              </div>

              {/* Status metrics */}
              <div className="mt-4 grid grid-cols-3 gap-2 text-center p-2.5 rounded-xl bg-zinc-50 border border-zinc-100">
                <div>
                  <p className="text-[10px] text-zinc-500 uppercase font-medium">Waiting</p>
                  <p className="text-lg font-black text-amber-600 font-mono">{q.waitingCount}</p>
                </div>
                <div>
                  <p className="text-[10px] text-zinc-500 uppercase font-medium">Calling</p>
                  <p className="text-lg font-black text-purple-600 font-mono">
                    {q.currentlyCalling ? `#${q.currentlyCalling.serialNumber}` : '—'}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] text-zinc-500 uppercase font-medium">Serving</p>
                  <p className="text-lg font-black text-emerald-600 font-mono">
                    {q.currentlyServing ? `#${q.currentlyServing.serialNumber}` : '—'}
                  </p>
                </div>
              </div>
            </div>

            {/* Quick Call Next Button */}
            <div className="mt-4 pt-3 border-t border-zinc-100">
              <button
                onClick={() => handleCallNextForDoctor(q.doctorId)}
                disabled={callingDoctorId === q.doctorId || q.waitingCount === 0}
                className="w-full py-2 px-3 rounded-lg text-xs font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-1.5 transition-colors"
              >
                {callingDoctorId === q.doctorId ? (
                  <Loader2 size={14} className="animate-spin text-emerald-700" />
                ) : (
                  <Megaphone size={14} />
                )}
                Call Next Patient ({q.waitingCount})
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Main Appointments Management Section */}
      <div className="bg-white rounded-2xl border border-zinc-200 shadow-xs overflow-hidden">
        {/* Filter Bar */}
        <div className="p-5 border-b border-zinc-200 space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-zinc-900">Clinic Appointment Register</h2>
              <p className="text-xs text-zinc-500">Live queue statuses, sequential serial numbers & patient tokens</p>
            </div>

            {/* Date Picker */}
            <div className="flex items-center gap-2">
              <Calendar size={16} className="text-zinc-400" />
              <input
                type="date"
                value={selectedDate}
                onChange={e => setSelectedDate(e.target.value)}
                className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-zinc-300 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
            {/* Search */}
            <div className="relative flex-1 min-w-[220px] max-w-md">
              <Search size={14} className="absolute left-3 top-2.5 text-zinc-400 pointer-events-none" />
              <input
                type="text"
                placeholder="Search patient name, phone, serial #, doctor..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-2 text-xs rounded-lg border border-zinc-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            {/* Select Doctor Filter */}
            <div className="flex items-center gap-2">
              <select
                value={doctorFilter}
                onChange={e => setDoctorFilter(e.target.value)}
                className="text-xs px-3 py-2 rounded-lg border border-zinc-300 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="all">All Doctors</option>
                {doctors.map(d => (
                  <option key={d.id} value={d.id}>
                    {d.name} ({d.specialty})
                  </option>
                ))}
              </select>

              {/* Status Filter */}
              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
                className="text-xs px-3 py-2 rounded-lg border border-zinc-300 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="all">All Queue Statuses</option>
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

        {/* Register Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-zinc-50 border-b border-zinc-200 text-zinc-500 font-semibold uppercase tracking-wider">
                <th className="py-3 px-4">Serial</th>
                <th className="py-3 px-4">Slot</th>
                <th className="py-3 px-4">Doctor & Room</th>
                <th className="py-3 px-4">Patient Name & Contact</th>
                <th className="py-3 px-4">Current Queue Status</th>
                <th className="py-3 px-4">Update Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-zinc-400">
                    <Loader2 size={22} className="animate-spin mx-auto text-emerald-600 mb-2" />
                    Loading appointment roster...
                  </td>
                </tr>
              ) : filteredAppointments.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-zinc-400">
                    No appointments found matching your search.
                  </td>
                </tr>
              ) : (
                filteredAppointments.map(app => (
                  <tr key={app.id} className="hover:bg-zinc-50/70 transition-colors">
                    {/* Serial # */}
                    <td className="py-3.5 px-4 font-mono font-bold text-sm text-emerald-700">
                      #{app.serialNumber.toString().padStart(2, '0')}
                    </td>

                    {/* Slot */}
                    <td className="py-3.5 px-4 font-semibold text-zinc-800">
                      {app.timeSlot}
                    </td>

                    {/* Doctor & Room */}
                    <td className="py-3.5 px-4">
                      <p className="font-semibold text-zinc-900">{app.doctorName}</p>
                      <p className="text-[11px] text-zinc-500">{app.doctorSpecialty}</p>
                    </td>

                    {/* Patient */}
                    <td className="py-3.5 px-4">
                      <p className="font-semibold text-zinc-900">{app.patientName}</p>
                      <p className="text-[11px] text-zinc-500">
                        {app.patientPhone} • {app.patientAge}y ({app.patientGender})
                      </p>
                    </td>

                    {/* Status Badge */}
                    <td className="py-3.5 px-4">
                      <QueueStatusBadge status={app.status} size="sm" />
                    </td>

                    {/* Interactive Queue Status Transition Dropdown */}
                    <td className="py-3.5 px-4">
                      <select
                        value={app.status}
                        onChange={e => handleStatusChange(app.id, e.target.value as QueueStatus)}
                        disabled={app.status === 'Completed' || app.status === 'Cancelled'}
                        className="text-xs px-2.5 py-1 rounded-md border border-zinc-200 bg-white font-medium focus:outline-none focus:ring-1 focus:ring-emerald-500 disabled:opacity-50"
                      >
                        <option value="Waiting">Waiting</option>
                        <option value="Called">Called</option>
                        <option value="In Progress">In Progress</option>
                        <option value="Completed">Completed</option>
                        <option value="No Show">No Show</option>
                        <option value="Cancelled">Cancelled</option>
                      </select>
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => setSelectedTokenAppointment(app)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-colors border border-emerald-200"
                        title="Print Serial Slip"
                      >
                        <Printer size={13} />
                        Slip
                      </button>
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
