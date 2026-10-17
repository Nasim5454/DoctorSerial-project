import React from 'react';
import { Printer, X, Calendar, Clock, MapPin, User, Stethoscope, CheckCircle2 } from 'lucide-react';
import type { Appointment } from '../types/index.js';
import { QueueStatusBadge } from './QueueStatusBadge.js';

interface Props {
  appointment: Appointment | null;
  onClose: () => void;
}

export const TokenModal: React.FC<Props> = ({ appointment, onClose }) => {
  if (!appointment) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fade-in">
      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border border-zinc-200 overflow-hidden">
        {/* Header Bar */}
        <div className="bg-gradient-to-r from-emerald-600 to-teal-700 px-6 py-4 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center font-bold text-lg">
              DS
            </div>
            <div>
              <h3 className="font-bold text-base leading-tight">Dhaka Central Specialized Hospital</h3>
              <p className="text-xs text-emerald-100">Official DoctorSerial Queue Token • Dhanmondi, Dhaka</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-colors"
            aria-label="Close modal"
          >
            <X size={20} />
          </button>
        </div>

        {/* Token Card Body */}
        <div className="p-6 space-y-6">
          {/* Big Serial Display */}
          <div className="text-center p-5 bg-gradient-to-b from-emerald-50/70 to-zinc-50 rounded-xl border border-emerald-100">
            <span className="text-xs uppercase tracking-wider font-semibold text-emerald-800">
              Assigned Queue Serial
            </span>
            <div className="text-5xl font-extrabold text-emerald-700 tracking-tight my-1">
              #{appointment.serialNumber.toString().padStart(2, '0')}
            </div>
            <div className="mt-2 flex items-center justify-center">
              <QueueStatusBadge status={appointment.status} size="md" />
            </div>
          </div>

          {/* Details Grid */}
          <div className="space-y-3 text-sm">
            <div className="flex items-start gap-3 p-3 rounded-lg bg-zinc-50 border border-zinc-100">
              <Stethoscope size={18} className="text-emerald-600 mt-0.5 shrink-0" />
              <div>
                <p className="text-xs text-zinc-500 font-medium">Doctor & Specialty</p>
                <p className="font-semibold text-zinc-900">{appointment.doctorName}</p>
                <p className="text-xs text-emerald-700 font-medium">{appointment.doctorSpecialty}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="flex items-start gap-2.5 p-3 rounded-lg bg-zinc-50 border border-zinc-100">
                <Calendar size={18} className="text-emerald-600 mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs text-zinc-500 font-medium">Clinic Date</p>
                  <p className="font-semibold text-zinc-900">{appointment.date}</p>
                </div>
              </div>

              <div className="flex items-start gap-2.5 p-3 rounded-lg bg-zinc-50 border border-zinc-100">
                <Clock size={18} className="text-emerald-600 mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs text-zinc-500 font-medium">Scheduled Time</p>
                  <p className="font-semibold text-zinc-900">{appointment.timeSlot}</p>
                </div>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 rounded-lg bg-zinc-50 border border-zinc-100">
              <User size={18} className="text-emerald-600 mt-0.5 shrink-0" />
              <div className="flex-1">
                <p className="text-xs text-zinc-500 font-medium">Patient</p>
                <p className="font-semibold text-zinc-900">{appointment.patientName}</p>
                <p className="text-xs text-zinc-500">
                  {appointment.patientPhone} • {appointment.patientAge} yrs ({appointment.patientGender})
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between text-xs text-zinc-500 px-1">
              <span>Reason: <strong className="text-zinc-700 font-medium">{appointment.reasonForVisit}</strong></span>
              <span>Fee: <strong className="text-emerald-700 font-semibold">Tk. {appointment.consultationFee}</strong></span>
            </div>
          </div>

          {/* Barcode Strip */}
          <div className="pt-2 border-t border-dashed border-zinc-300 text-center">
            <div className="h-9 w-full flex items-center justify-center gap-1.5 opacity-70">
              {Array.from({ length: 38 }).map((_, i) => (
                <div
                  key={i}
                  className={`h-full bg-zinc-800 ${i % 3 === 0 ? 'w-1' : i % 5 === 0 ? 'w-1.5' : 'w-0.5'}`}
                />
              ))}
            </div>
            <p className="text-[10px] text-zinc-400 mt-1 font-mono uppercase tracking-widest">
              DOC-SER-{appointment.date.replace(/-/g, '')}-{appointment.serialNumber}
            </p>
          </div>
        </div>

        {/* Actions Footer */}
        <div className="bg-zinc-50 px-6 py-4 border-t border-zinc-200 flex items-center justify-between gap-3">
          <p className="text-xs text-zinc-500 flex items-center gap-1">
            <CheckCircle2 size={14} className="text-emerald-600" />
            Please arrive 10 min early
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-emerald-800 bg-emerald-100 hover:bg-emerald-200 rounded-lg transition-colors"
            >
              <Printer size={15} />
              Print Slip
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-zinc-700 bg-white hover:bg-zinc-100 border border-zinc-300 rounded-lg transition-colors"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
