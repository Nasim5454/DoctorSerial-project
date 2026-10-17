import React, { useState, useEffect } from 'react';
import { X, Calendar, Clock, Stethoscope, AlertCircle, Check, Loader2 } from 'lucide-react';
import { doctorService, appointmentService, userService } from '../api/services.js';
import { useAuth } from '../context/AuthContext.js';
import type { Doctor, Appointment, User, SlotAvailabilityResponse } from '../types/index.js';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (appointment: Appointment) => void;
  initialDoctorId?: string;
  initialDate?: string;
}

export const BookAppointmentModal: React.FC<Props> = ({
  isOpen,
  onClose,
  onSuccess,
  initialDoctorId,
  initialDate,
}) => {
  const { user } = useAuth();
  const today = new Date().toISOString().split('T')[0];

  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [selectedDoctorId, setSelectedDoctorId] = useState<string>(initialDoctorId || '');
  const [selectedDate, setSelectedDate] = useState<string>(initialDate || today);
  const [slotData, setSlotData] = useState<SlotAvailabilityResponse | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<string>('');

  // Patient Fields
  const [patientName, setPatientName] = useState<string>('');
  const [patientPhone, setPatientPhone] = useState<string>('');
  const [patientAge, setPatientAge] = useState<string>('30');
  const [patientGender, setPatientGender] = useState<'Male' | 'Female' | 'Other'>('Male');
  const [reasonForVisit, setReasonForVisit] = useState<string>('');

  // Existing patients list (for Receptionist/Admin)
  const [existingPatients, setExistingPatients] = useState<User[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState<string>('');

  const [loadingDoctors, setLoadingDoctors] = useState<boolean>(false);
  const [loadingSlots, setLoadingSlots] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');

  // Pre-fill patient details if logged-in user is Patient
  useEffect(() => {
    if (user && user.role === 'Patient') {
      setPatientName(user.name);
      setPatientPhone(user.phone || '');
    }
  }, [user]);

  // Load doctors and existing patients
  useEffect(() => {
    if (!isOpen) return;
    const fetchInit = async () => {
      setLoadingDoctors(true);
      try {
        const docs = await doctorService.getAll();
        setDoctors(docs);
        if (!selectedDoctorId && docs.length > 0) {
          setSelectedDoctorId(initialDoctorId || docs[0].id);
        }

        if (user && user.role !== 'Patient') {
          const patients = await userService.getPatients();
          setExistingPatients(patients);
        }
      } catch (err) {
        console.error('Failed to load doctors:', err);
      } finally {
        setLoadingDoctors(false);
      }
    };
    fetchInit();
  }, [isOpen, initialDoctorId, user]);

  // Load slots when doctor or date changes
  useEffect(() => {
    if (!isOpen || !selectedDoctorId || !selectedDate) return;

    const fetchSlots = async () => {
      setLoadingSlots(true);
      setErrorMessage('');
      try {
        const slots = await doctorService.getAvailableSlots(selectedDoctorId, selectedDate);
        setSlotData(slots);
        // Reset selected slot if not in available slots
        if (slots.availableSlots.length > 0) {
          setSelectedSlot(slots.availableSlots[0]);
        } else {
          setSelectedSlot('');
        }
      } catch (err) {
        console.error('Failed to fetch slots:', err);
      } finally {
        setLoadingSlots(false);
      }
    };

    fetchSlots();
  }, [isOpen, selectedDoctorId, selectedDate]);

  if (!isOpen) return null;

  const handlePatientSelect = (patId: string) => {
    setSelectedPatientId(patId);
    if (!patId) {
      setPatientName('');
      setPatientPhone('');
      return;
    }
    const pat = existingPatients.find(p => p.id === patId);
    if (pat) {
      setPatientName(pat.name);
      setPatientPhone(pat.phone);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!selectedDoctorId) {
      setErrorMessage('Please select a doctor.');
      return;
    }
    if (!selectedSlot) {
      setErrorMessage('Please select an available time slot.');
      return;
    }
    if (!patientName.trim() || !patientPhone.trim()) {
      setErrorMessage('Patient name and phone number are required.');
      return;
    }
    if (!reasonForVisit.trim()) {
      setErrorMessage('Please provide a reason for the consultation.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await appointmentService.create({
        doctorId: selectedDoctorId,
        patientId: user?.role === 'Patient' ? user.id : (selectedPatientId || undefined),
        patientName: patientName.trim(),
        patientPhone: patientPhone.trim(),
        patientAge: parseInt(patientAge, 10) || 30,
        patientGender,
        date: selectedDate,
        timeSlot: selectedSlot,
        reasonForVisit: reasonForVisit.trim(),
        paymentStatus: user?.role === 'Patient' ? 'Paid' : 'Pending',
      });

      onSuccess(res.appointment);
      onClose();
    } catch (err: unknown) {
      const errorObj = err as { response?: { data?: { error?: string } } };
      setErrorMessage(errorObj.response?.data?.error || 'Failed to book appointment. Please try a different slot.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedDoctor = doctors.find(d => d.id === selectedDoctorId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="relative w-full max-w-xl bg-white rounded-2xl shadow-2xl border border-zinc-200 overflow-hidden my-8">
        {/* Header */}
        <div className="bg-emerald-700 px-6 py-4 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Stethoscope size={22} className="text-emerald-200" />
            <div>
              <h2 className="text-lg font-bold">Book Clinic Appointment</h2>
              <p className="text-xs text-emerald-100">Direct Doctor Serial & Queue Allocation</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-colors"
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {errorMessage && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
              <AlertCircle size={16} className="text-rose-600 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Doctor Selection */}
          <div>
            <label className="block text-xs font-semibold text-zinc-700 uppercase tracking-wider mb-1.5">
              Select Specialist Doctor
            </label>
            {loadingDoctors ? (
              <div className="py-2 flex items-center gap-2 text-xs text-zinc-500">
                <Loader2 size={16} className="animate-spin text-emerald-600" />
                Loading doctors...
              </div>
            ) : (
              <select
                value={selectedDoctorId}
                onChange={e => setSelectedDoctorId(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-lg border border-zinc-300 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent bg-white"
                required
              >
                {doctors.map(doc => (
                  <option key={doc.id} value={doc.id}>
                    {doc.name} — {doc.specialty} ({doc.roomNumber}) • Fee: Tk. {doc.consultationFee}
                  </option>
                ))}
              </select>
            )}

            {selectedDoctor && (
              <div className="mt-2 p-2.5 rounded-lg bg-emerald-50/60 border border-emerald-100 text-xs text-zinc-600 flex items-center justify-between">
                <span>Working Days: <strong className="text-emerald-800">{selectedDoctor.schedule.workingDays.join(', ')}</strong></span>
                <span>Hours: <strong className="text-emerald-800">{selectedDoctor.schedule.startTime} - {selectedDoctor.schedule.endTime}</strong></span>
              </div>
            )}
          </div>

          {/* Date Picker */}
          <div>
            <label className="block text-xs font-semibold text-zinc-700 uppercase tracking-wider mb-1.5">
              Clinic Date
            </label>
            <div className="relative">
              <input
                type="date"
                min={today}
                value={selectedDate}
                onChange={e => setSelectedDate(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-lg border border-zinc-300 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent bg-white"
                required
              />
              <Calendar size={18} className="absolute right-3.5 top-3 text-zinc-400 pointer-events-none" />
            </div>
          </div>

          {/* Time Slot Picker */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-zinc-700 uppercase tracking-wider">
                Available Appointment Slots
              </label>
              {slotData && (
                <span className="text-xs text-zinc-500">
                  {slotData.availableSlots.length} available / {slotData.totalSlots} total
                </span>
              )}
            </div>

            {loadingSlots ? (
              <div className="py-4 flex items-center justify-center gap-2 text-xs text-zinc-500">
                <Loader2 size={16} className="animate-spin text-emerald-600" />
                Checking available slots...
              </div>
            ) : !slotData?.isWorkingDay ? (
              <div className="p-3 bg-amber-50 rounded-lg border border-amber-200 text-xs text-amber-800 flex items-center gap-2">
                <AlertCircle size={16} className="text-amber-600 shrink-0" />
                <span>Doctor is not scheduled on this day ({slotData?.dayName}). Please select an alternate date.</span>
              </div>
            ) : slotData.allSlots.length === 0 ? (
              <p className="text-xs text-zinc-500">No slots configured for this doctor.</p>
            ) : (
              <div className="grid grid-cols-4 sm:grid-cols-6 gap-2 max-h-36 overflow-y-auto p-1 border border-zinc-200 rounded-lg bg-zinc-50">
                {slotData.allSlots.map(slot => {
                  const isAvailable = slotData.availableSlots.includes(slot);
                  const isSelected = selectedSlot === slot;

                  return (
                    <button
                      key={slot}
                      type="button"
                      disabled={!isAvailable}
                      onClick={() => setSelectedSlot(slot)}
                      className={`py-2 px-1 text-xs font-semibold rounded-md transition-all text-center flex flex-col items-center justify-center ${
                        isSelected
                          ? 'bg-emerald-600 text-white shadow-sm ring-2 ring-emerald-600'
                          : isAvailable
                          ? 'bg-white text-zinc-800 hover:bg-emerald-50 hover:text-emerald-700 border border-zinc-200'
                          : 'bg-zinc-100 text-zinc-400 line-through cursor-not-allowed border border-transparent'
                      }`}
                    >
                      <span>{slot}</span>
                      {!isAvailable && <span className="text-[9px] font-normal no-underline">Booked</span>}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Patient Details */}
          {user?.role !== 'Patient' && (
            <div className="space-y-3 pt-2 border-t border-zinc-200">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-zinc-700 uppercase tracking-wider">
                  Patient Information
                </label>
                {existingPatients.length > 0 && (
                  <select
                    value={selectedPatientId}
                    onChange={e => handlePatientSelect(e.target.value)}
                    className="text-xs px-2 py-1 rounded border border-zinc-300 bg-white"
                  >
                    <option value="">-- Choose Existing Patient or Walk-in --</option>
                    {existingPatients.map(p => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.phone})
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <input
                    type="text"
                    placeholder="Patient Full Name *"
                    value={patientName}
                    onChange={e => setPatientName(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-zinc-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    required
                  />
                </div>
                <div>
                  <input
                    type="tel"
                    placeholder="Bangladeshi Mobile (+880 17...) *"
                    value={patientPhone}
                    onChange={e => setPatientPhone(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-zinc-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] text-zinc-500 mb-1">Age</label>
                  <input
                    type="number"
                    min="1"
                    max="120"
                    value={patientAge}
                    onChange={e => setPatientAge(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-zinc-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-zinc-500 mb-1">Gender</label>
                  <select
                    value={patientGender}
                    onChange={e => setPatientGender(e.target.value as 'Male' | 'Female' | 'Other')}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-zinc-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Reason for Visit */}
          <div>
            <label className="block text-xs font-semibold text-zinc-700 uppercase tracking-wider mb-1.5">
              Reason for Consultation / Symptoms *
            </label>
            <textarea
              rows={2}
              placeholder="e.g. Chest pain follow-up, routine checkup, skin rash evaluation..."
              value={reasonForVisit}
              onChange={e => setReasonForVisit(e.target.value)}
              className="w-full px-3.5 py-2 rounded-lg border border-zinc-300 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent resize-none"
              required
            />
          </div>

          {/* Buttons */}
          <div className="pt-3 border-t border-zinc-200 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-zinc-600 hover:text-zinc-800 bg-zinc-100 hover:bg-zinc-200 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !selectedSlot || (slotData && !slotData.isWorkingDay)}
              className="inline-flex items-center gap-1.5 px-5 py-2.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg shadow-sm transition-colors"
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Generating Serial...
                </>
              ) : (
                <>
                  <Check size={16} />
                  Confirm & Assign Serial
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
