import React, { useState, useEffect } from 'react';
import { ArrowLeft, Clock, Stethoscope, Megaphone, CheckCircle2, User, Radio, Volume2 } from 'lucide-react';
import { queueService } from '../api/services.js';
import { useSocket } from '../context/SocketContext.js';
import type { QueueSummary, Appointment } from '../types/index.js';

interface Props {
  onBack: () => void;
}

export const PublicQueueBoard: React.FC<Props> = ({ onBack }) => {
  const { lastCalledPatient, socket } = useSocket();
  const [queues, setQueues] = useState<QueueSummary[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [currentTime, setCurrentTime] = useState<string>(new Date().toLocaleTimeString());
  const [currentDate] = useState<string>(
    new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'short', day: 'numeric' })
  );

  const fetchQueueData = async () => {
    try {
      const data = await queueService.getTodayQueue();
      setQueues(data.queues);
      setAppointments(data.appointments);
    } catch (err) {
      console.error('Failed to load queue board:', err);
    }
  };

  useEffect(() => {
    fetchQueueData();
    const clockInterval = setInterval(() => {
      setCurrentTime(new Date().toLocaleTimeString());
    }, 1000);

    return () => clearInterval(clockInterval);
  }, []);

  // Listen to socket queue updates
  useEffect(() => {
    if (!socket) return;

    const handleUpdate = () => {
      fetchQueueData();
    };

    socket.on('queue:updated', handleUpdate);
    socket.on('patient:called', handleUpdate);

    return () => {
      socket.off('queue:updated', handleUpdate);
      socket.off('patient:called', handleUpdate);
    };
  }, [socket]);

  return (
    <div className="min-h-screen bg-zinc-950 text-white flex flex-col font-sans select-none">
      {/* Top TV Header Bar */}
      <header className="px-6 py-4 bg-zinc-900 border-b border-zinc-800 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-semibold transition-colors"
          >
            <ArrowLeft size={16} />
            Exit TV Mode
          </button>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center font-bold text-sm">
              DS
            </div>
            <div>
              <h1 className="text-xl font-extrabold tracking-tight text-white flex items-center gap-2">
                Dhaka Central Specialized Hospital
                <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-semibold border border-emerald-500/30 flex items-center gap-1">
                  <Radio size={12} className="animate-pulse text-emerald-400" />
                  Live Display
                </span>
              </h1>
              <p className="text-xs text-zinc-400">Patient Calling & Waiting Hall Display • Dhanmondi, Dhaka</p>
            </div>
          </div>
        </div>

        {/* Clock & Date */}
        <div className="text-right">
          <p className="text-2xl font-mono font-bold tracking-wider text-emerald-400">{currentTime}</p>
          <p className="text-xs text-zinc-400">{currentDate}</p>
        </div>
      </header>

      {/* Main Board Content */}
      <main className="flex-1 p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 max-w-7xl mx-auto w-full">
        {/* Left Column: Huge "Now Calling" Announcement Card (7 Cols) */}
        <div className="lg:col-span-7 flex flex-col gap-6">
          <div className="bg-gradient-to-br from-emerald-950/80 via-zinc-900 to-zinc-900 rounded-3xl border-2 border-emerald-500/40 p-8 shadow-2xl relative overflow-hidden flex flex-col justify-between min-h-[380px]">
            {/* Background glowing aura */}
            <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

            <div>
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold text-sm tracking-wide border border-emerald-500/30 uppercase">
                  <Megaphone size={18} className="animate-bounce" />
                  Now Calling Patient
                </span>
                <span className="text-xs text-zinc-400 flex items-center gap-1">
                  <Volume2 size={16} className="text-emerald-400" />
                  Chime Audio Enabled
                </span>
              </div>

              {lastCalledPatient ? (
                <div className="mt-8 space-y-4">
                  <div className="flex items-baseline gap-4">
                    <span className="text-xs uppercase tracking-widest text-zinc-400 font-semibold">Serial</span>
                    <span className="text-7xl sm:text-8xl font-black text-emerald-400 tracking-tight animate-pulse font-mono">
                      #{lastCalledPatient.serialNumber.toString().padStart(2, '0')}
                    </span>
                  </div>

                  <div className="text-3xl sm:text-4xl font-bold text-white tracking-tight">
                    {lastCalledPatient.patientName}
                  </div>

                  <div className="pt-4 flex flex-wrap items-center gap-4 text-zinc-300 text-sm">
                    <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-zinc-800/80 border border-zinc-700">
                      <Stethoscope size={20} className="text-emerald-400" />
                      <div>
                        <p className="text-[10px] text-zinc-400 uppercase">Consultant</p>
                        <p className="font-semibold text-white">{lastCalledPatient.doctorName}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 text-white font-bold text-lg shadow-lg">
                      <span>Proceed to {lastCalledPatient.roomNumber}</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="mt-12 py-8 text-center text-zinc-500 space-y-2">
                  <Megaphone size={48} className="mx-auto text-zinc-700" />
                  <p className="text-lg font-medium text-zinc-400">Waiting for next patient call...</p>
                  <p className="text-xs text-zinc-600">Doctors will call serial numbers sequentially</p>
                </div>
              )}
            </div>

            <div className="pt-4 border-t border-zinc-800/80 text-xs text-zinc-400 flex items-center justify-between">
              <span>DoctorSerial Intelligent Clinic Routing</span>
              <span>Please proceed to the designated chamber/room shown above</span>
            </div>
          </div>

          {/* Active Consultation Rooms Row */}
          <div className="bg-zinc-900/90 rounded-2xl border border-zinc-800 p-6">
            <h2 className="text-sm font-bold text-zinc-300 uppercase tracking-wider mb-4 flex items-center gap-2">
              <Stethoscope size={18} className="text-emerald-400" />
              Active Doctors & Current Consultations
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {queues.map(q => (
                <div
                  key={q.doctorId}
                  className="p-4 rounded-xl bg-zinc-950 border border-zinc-800 flex items-center justify-between"
                >
                  <div>
                    <p className="font-bold text-white text-sm">{q.doctorName}</p>
                    <p className="text-xs text-emerald-400 font-medium">{q.specialty} • {q.roomNumber}</p>
                    <p className="text-[11px] text-zinc-400 mt-1">
                      Status: <span className="font-medium text-zinc-300">{q.status}</span>
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] uppercase text-zinc-500 font-semibold">Currently Serving</p>
                    <p className="text-2xl font-black font-mono text-emerald-400">
                      {q.currentlyServing ? `#${q.currentlyServing.serialNumber.toString().padStart(2, '0')}` : '—'}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Upcoming Queue Sequence (5 Cols) */}
        <div className="lg:col-span-5 flex flex-col gap-6">
          <div className="bg-zinc-900 rounded-3xl border border-zinc-800 p-6 flex flex-col h-full">
            <div className="flex items-center justify-between pb-4 border-b border-zinc-800">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Clock size={18} className="text-amber-400" />
                Up Next in Queue
              </h2>
              <span className="text-xs px-2.5 py-1 rounded-full bg-zinc-800 text-zinc-300 font-semibold">
                {appointments.filter(a => a.status === 'Waiting').length} waiting
              </span>
            </div>

            <div className="mt-4 flex-1 space-y-3 overflow-y-auto max-h-[560px] pr-1">
              {appointments.filter(a => a.status === 'Waiting').length === 0 ? (
                <div className="py-16 text-center text-zinc-500">
                  <CheckCircle2 size={36} className="mx-auto text-emerald-500/50 mb-2" />
                  <p className="text-sm font-medium text-zinc-400">No waiting patients in queue.</p>
                  <p className="text-xs text-zinc-600 mt-1">All registered patients have been attended</p>
                </div>
              ) : (
                appointments
                  .filter(a => a.status === 'Waiting')
                  .sort((a, b) => a.serialNumber - b.serialNumber)
                  .map((app, idx) => (
                    <div
                      key={app.id}
                      className="p-3.5 rounded-xl bg-zinc-950/80 border border-zinc-800/80 hover:border-zinc-700 transition-colors flex items-center justify-between"
                    >
                      <div className="flex items-center gap-3">
                        <span className="w-8 h-8 rounded-lg bg-zinc-800 text-zinc-300 font-mono font-bold text-xs flex items-center justify-center shrink-0">
                          {idx + 1}
                        </span>
                        <div>
                          <p className="text-sm font-semibold text-white">{app.patientName}</p>
                          <p className="text-xs text-zinc-400">{app.doctorName} • {app.timeSlot}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-xl font-black font-mono text-emerald-400">
                          #{app.serialNumber.toString().padStart(2, '0')}
                        </span>
                        <p className="text-[10px] text-zinc-500 uppercase">Serial</p>
                      </div>
                    </div>
                  ))
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};
