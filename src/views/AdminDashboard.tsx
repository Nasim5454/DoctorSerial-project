import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Users,
  Calendar,
  CheckCircle2,
  Clock,
  DollarSign,
  Plus,
  Stethoscope,
  Search,
  UserPlus,
  AlertCircle,
  Loader2,
  Activity
} from 'lucide-react';
import { statsService, doctorService, userService } from '../api/services.js';
import type { Doctor, User } from '../types/index.js';

export const AdminDashboard: React.FC = () => {
  const [stats, setStats] = useState<{
    date: string;
    metrics: {
      totalPatients: number;
      totalDoctors: number;
      appointmentsToday: number;
      completedToday: number;
      waitingToday: number;
      inProgressToday: number;
      cancelledToday: number;
      revenueToday: number;
    };
    doctorStats: Array<{
      doctorId: string;
      doctorName: string;
      specialty: string;
      roomNumber: string;
      totalToday: number;
      waiting: number;
      inProgress: number;
      completed: number;
      status: string;
    }>;
  } | null>(null);

  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // New Doctor Modal
  const [isAddDoctorOpen, setIsAddDoctorOpen] = useState<boolean>(false);
  const [newDocName, setNewDocName] = useState('');
  const [newDocEmail, setNewDocEmail] = useState('');
  const [newDocPhone, setNewDocPhone] = useState('');
  const [newDocSpecialty, setNewDocSpecialty] = useState('Cardiology');
  const [newDocRoom, setNewDocRoom] = useState('Room 106');
  const [newDocFee, setNewDocFee] = useState('70');
  const [newDocStartTime, setNewDocStartTime] = useState('09:00');
  const [newDocEndTime, setNewDocEndTime] = useState('13:00');
  const [isSubmittingDoc, setIsSubmittingDoc] = useState(false);
  const [formError, setFormError] = useState('');

  // User search/filter
  const [userRoleFilter, setUserRoleFilter] = useState<string>('all');
  const [userSearch, setUserSearch] = useState<string>('');

  const fetchDashboardData = async () => {
    try {
      const [statsData, docs, userList] = await Promise.all([
        statsService.getSummary(),
        doctorService.getAll(),
        userService.getAll(),
      ]);
      setStats(statsData);
      setDoctors(docs);
      setUsers(userList);
    } catch (err) {
      console.error('Failed to load admin stats:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const handleToggleDoctorStatus = async (docId: string, currentStatus: string) => {
    const nextStatus = currentStatus === 'Active' ? 'On Break' : 'Active';
    try {
      await doctorService.updateStatus(docId, nextStatus);
      await fetchDashboardData();
    } catch {
      // ignore
    }
  };

  const handleAddDoctorSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    if (!newDocName || !newDocEmail || !newDocRoom) {
      setFormError('Please fill in doctor name, email, and room number.');
      return;
    }
    setIsSubmittingDoc(true);
    try {
      await doctorService.create({
        name: newDocName.trim(),
        email: newDocEmail.trim(),
        phone: newDocPhone || '+1 555-0199',
        specialty: newDocSpecialty,
        roomNumber: newDocRoom,
        consultationFee: Number(newDocFee) || 60,
        workingDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
        startTime: newDocStartTime,
        endTime: newDocEndTime,
        slotDurationMinutes: 20,
        maxDailyPatients: 20,
      });

      setIsAddDoctorOpen(false);
      setNewDocName('');
      setNewDocEmail('');
      await fetchDashboardData();
    } catch (err: unknown) {
      const errorObj = err as { response?: { data?: { error?: string } } };
      setFormError(errorObj.response?.data?.error || 'Failed to add doctor.');
    } finally {
      setIsSubmittingDoc(false);
    }
  };

  const filteredUsers = users.filter(u => {
    if (userRoleFilter !== 'all' && u.role !== userRoleFilter) return false;
    if (userSearch) {
      const q = userSearch.toLowerCase();
      return u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q) || u.phone.includes(q);
    }
    return true;
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fade-in">
      {/* Header */}
      <div className="bg-white rounded-2xl border border-zinc-200 p-6 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <ShieldCheck size={22} className="text-emerald-600" />
            <h1 className="text-xl font-bold text-zinc-900">Dhaka Central Specialized Hospital — Executive Administration</h1>
          </div>
          <p className="text-xs text-zinc-500 mt-1">
            Directorate of Hospital Services, specialist roster management, queue auditing, and daily financial metrics (BDT).
          </p>
        </div>

        <button
          onClick={() => setIsAddDoctorOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-sm shadow-emerald-600/20 transition-all"
        >
          <UserPlus size={16} />
          + Add New Doctor
        </button>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {/* Appointments Today */}
        <div className="bg-white p-5 rounded-2xl border border-zinc-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Today&apos;s Bookings</span>
            <Calendar size={16} className="text-emerald-600" />
          </div>
          <p className="text-3xl font-extrabold text-zinc-900 font-mono mt-2">
            {stats?.metrics.appointmentsToday || 0}
          </p>
          <p className="text-[11px] text-zinc-500 mt-1">Scheduled patients</p>
        </div>

        {/* Completed Today */}
        <div className="bg-white p-5 rounded-2xl border border-zinc-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Completed</span>
            <CheckCircle2 size={16} className="text-blue-600" />
          </div>
          <p className="text-3xl font-extrabold text-blue-600 font-mono mt-2">
            {stats?.metrics.completedToday || 0}
          </p>
          <p className="text-[11px] text-zinc-500 mt-1">Discharged today</p>
        </div>

        {/* Waiting In Queue */}
        <div className="bg-white p-5 rounded-2xl border border-zinc-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">In Waiting Hall</span>
            <Clock size={16} className="text-amber-600" />
          </div>
          <p className="text-3xl font-extrabold text-amber-600 font-mono mt-2">
            {stats?.metrics.waitingToday || 0}
          </p>
          <p className="text-[11px] text-zinc-500 mt-1">Pending consultation</p>
        </div>

        {/* Total Patients */}
        <div className="bg-white p-5 rounded-2xl border border-zinc-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Total Patients</span>
            <Users size={16} className="text-indigo-600" />
          </div>
          <p className="text-3xl font-extrabold text-zinc-900 font-mono mt-2">
            {stats?.metrics.totalPatients || 0}
          </p>
          <p className="text-[11px] text-zinc-500 mt-1">Registered clinic users</p>
        </div>

        {/* Revenue Today */}
        <div className="bg-white p-5 rounded-2xl border border-zinc-200 shadow-xs col-span-2 md:col-span-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Today&apos;s Revenue</span>
            <DollarSign size={16} className="text-emerald-600" />
          </div>
          <p className="text-3xl font-extrabold text-emerald-700 font-mono mt-2">
            Tk. {stats?.metrics.revenueToday.toLocaleString() || 0}
          </p>
          <p className="text-[11px] text-zinc-500 mt-1">Consultation fees</p>
        </div>
      </div>

      {/* Doctor Performance & Roster Table */}
      <div className="bg-white rounded-2xl border border-zinc-200 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-zinc-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Stethoscope size={18} className="text-emerald-600" />
            <h2 className="text-base font-bold text-zinc-900">Doctor Specialists Roster & Today&apos;s Workload</h2>
          </div>
          <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 font-semibold">
            {doctors.length} Doctors Registered
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-zinc-50 border-b border-zinc-200 text-zinc-500 font-semibold uppercase tracking-wider">
                <th className="py-3 px-4">Doctor</th>
                <th className="py-3 px-4">Specialty & Room</th>
                <th className="py-3 px-4">Consultation Fee</th>
                <th className="py-3 px-4">Shift Hours</th>
                <th className="py-3 px-4 text-center">Today&apos;s Queue Load</th>
                <th className="py-3 px-4">Duty Status</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {doctors.map(doc => {
                const docStat = stats?.doctorStats.find(s => s.doctorId === doc.id);
                return (
                  <tr key={doc.id} className="hover:bg-zinc-50/70 transition-colors">
                    <td className="py-3 px-4 font-semibold text-zinc-900 flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-xs shrink-0 overflow-hidden">
                        {doc.avatarUrl ? (
                          <img src={doc.avatarUrl} alt={doc.name} className="w-full h-full object-cover" />
                        ) : (
                          'Dr'
                        )}
                      </div>
                      <div>
                        <p>{doc.name}</p>
                        <p className="text-[11px] text-zinc-400 font-normal">{doc.email}</p>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <p className="font-semibold text-emerald-700">{doc.specialty}</p>
                      <p className="text-[11px] text-zinc-500">{doc.roomNumber}</p>
                    </td>
                    <td className="py-3 px-4 font-mono font-bold text-zinc-800">
                      Tk. {doc.consultationFee}
                    </td>
                    <td className="py-3 px-4 text-zinc-600">
                      {doc.schedule.startTime} - {doc.schedule.endTime}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <div className="inline-flex items-center gap-1.5 font-mono text-xs">
                        <span className="px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 font-bold" title="Waiting">
                          {docStat?.waiting || 0}W
                        </span>
                        <span className="px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 font-bold" title="Completed">
                          {docStat?.completed || 0}C
                        </span>
                        <span className="px-1.5 py-0.5 rounded bg-zinc-100 text-zinc-700 font-bold" title="Total">
                          {docStat?.totalToday || 0}T
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          doc.status === 'Active'
                            ? 'bg-emerald-100 text-emerald-800'
                            : doc.status === 'On Break'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-zinc-100 text-zinc-600'
                        }`}
                      >
                        {doc.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => handleToggleDoctorStatus(doc.id, doc.status)}
                        className="px-2.5 py-1 text-xs font-semibold rounded-md bg-zinc-100 hover:bg-zinc-200 text-zinc-700 transition-colors"
                      >
                        Toggle Status
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Staff and User Directory */}
      <div className="bg-white rounded-2xl border border-zinc-200 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-zinc-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-zinc-900">Clinic User Directory & Role-Based Access</h2>
            <p className="text-xs text-zinc-500">Admins, Doctors, Receptionists, and Registered Patients</p>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-2.5 text-zinc-400 pointer-events-none" />
              <input
                type="text"
                placeholder="Search user name, email, phone..."
                value={userSearch}
                onChange={e => setUserSearch(e.target.value)}
                className="pl-8 pr-3 py-1.5 text-xs rounded-lg border border-zinc-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 w-48 sm:w-56"
              />
            </div>

            <select
              value={userRoleFilter}
              onChange={e => setUserRoleFilter(e.target.value)}
              className="text-xs px-2.5 py-1.5 rounded-lg border border-zinc-300 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="all">All Roles</option>
              <option value="Admin">Admin</option>
              <option value="Doctor">Doctor</option>
              <option value="Receptionist">Receptionist</option>
              <option value="Patient">Patient</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-zinc-50 border-b border-zinc-200 text-zinc-500 font-semibold uppercase tracking-wider">
                <th className="py-3 px-4">Name</th>
                <th className="py-3 px-4">Email</th>
                <th className="py-3 px-4">Phone</th>
                <th className="py-3 px-4">Role</th>
                <th className="py-3 px-4">Created Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {filteredUsers.map(u => (
                <tr key={u.id} className="hover:bg-zinc-50/70 transition-colors">
                  <td className="py-3 px-4 font-semibold text-zinc-900">{u.name}</td>
                  <td className="py-3 px-4 text-zinc-600">{u.email}</td>
                  <td className="py-3 px-4 text-zinc-600">{u.phone}</td>
                  <td className="py-3 px-4">
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        u.role === 'Admin'
                          ? 'bg-purple-100 text-purple-800'
                          : u.role === 'Doctor'
                          ? 'bg-emerald-100 text-emerald-800'
                          : u.role === 'Receptionist'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-zinc-100 text-zinc-700'
                      }`}
                    >
                      {u.role}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-zinc-400">
                    {new Date(u.createdAt).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Doctor Modal */}
      {isAddDoctorOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-zinc-200 p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-200">
              <h3 className="font-bold text-base text-zinc-900">Add New Doctor to Clinic</h3>
              <button
                onClick={() => setIsAddDoctorOpen(false)}
                className="text-zinc-400 hover:text-zinc-600 text-sm"
              >
                ✕
              </button>
            </div>

            {formError && (
              <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs">
                {formError}
              </div>
            )}

            <form onSubmit={handleAddDoctorSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block text-zinc-700 font-semibold mb-1">Doctor Full Name</label>
                <input
                  type="text"
                  placeholder="e.g. Dr. Jennifer Lawrence, MD"
                  value={newDocName}
                  onChange={e => setNewDocName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-zinc-300"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-zinc-700 font-semibold mb-1">Email</label>
                  <input
                    type="email"
                    placeholder="doctor@doctorserial.com"
                    value={newDocEmail}
                    onChange={e => setNewDocEmail(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-zinc-300"
                    required
                  />
                </div>
                <div>
                  <label className="block text-zinc-700 font-semibold mb-1">Phone</label>
                  <input
                    type="text"
                    placeholder="+1 555-0199"
                    value={newDocPhone}
                    onChange={e => setNewDocPhone(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-zinc-300"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-zinc-700 font-semibold mb-1">Specialty</label>
                  <input
                    type="text"
                    value={newDocSpecialty}
                    onChange={e => setNewDocSpecialty(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-zinc-300"
                  />
                </div>
                <div>
                  <label className="block text-zinc-700 font-semibold mb-1">Room #</label>
                  <input
                    type="text"
                    value={newDocRoom}
                    onChange={e => setNewDocRoom(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-zinc-300"
                  />
                </div>
                <div>
                  <label className="block text-zinc-700 font-semibold mb-1">Consultation Fee ($)</label>
                  <input
                    type="number"
                    value={newDocFee}
                    onChange={e => setNewDocFee(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-zinc-300"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-zinc-700 font-semibold mb-1">Shift Start Time</label>
                  <input
                    type="time"
                    value={newDocStartTime}
                    onChange={e => setNewDocStartTime(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-zinc-300"
                  />
                </div>
                <div>
                  <label className="block text-zinc-700 font-semibold mb-1">Shift End Time</label>
                  <input
                    type="time"
                    value={newDocEndTime}
                    onChange={e => setNewDocEndTime(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-zinc-300"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-zinc-200 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddDoctorOpen(false)}
                  className="px-3.5 py-1.5 rounded-lg border border-zinc-300 text-zinc-600 hover:bg-zinc-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingDoc}
                  className="px-4 py-1.5 rounded-lg bg-emerald-600 text-white font-semibold hover:bg-emerald-700"
                >
                  {isSubmittingDoc ? 'Adding...' : 'Save Doctor'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
