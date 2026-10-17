/**
 * Pure queue and booking business logic rules for DoctorSerial
 * Decoupled from HTTP and database for pure deterministic unit testing.
 */

export interface DoctorSchedule {
  workingDays: string[]; // e.g. ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']
  startTime: string; // e.g. '09:00'
  endTime: string;   // e.g. '13:00'
  slotDurationMinutes: number; // e.g. 15 or 20
  maxDailyPatients: number;
}

export interface ExistingSlot {
  doctorId: string;
  date: string; // YYYY-MM-DD
  timeSlot: string; // HH:mm
  status: 'Waiting' | 'Called' | 'In Progress' | 'Completed' | 'Cancelled' | 'No Show';
}

export type QueueStatus = 'Waiting' | 'Called' | 'In Progress' | 'Completed' | 'Cancelled' | 'No Show';

/**
 * Validates whether a requested transition between appointment queue statuses is allowed.
 */
export function isValidStatusTransition(currentStatus: QueueStatus, newStatus: QueueStatus): { valid: boolean; reason?: string } {
  if (currentStatus === newStatus) {
    return { valid: true };
  }

  // Terminal states cannot be revived directly
  if (currentStatus === 'Completed') {
    return { valid: false, reason: 'Completed appointments cannot change status.' };
  }

  // Cancelled appointments cannot transition
  if (currentStatus === 'Cancelled') {
    return { valid: false, reason: 'Cancelled appointments cannot be updated.' };
  }

  // Allowed transitions:
  // Waiting -> Called, Cancelled, No Show
  // Called -> In Progress, Waiting (re-queue), No Show, Cancelled
  // In Progress -> Completed, Cancelled
  // No Show -> Waiting (re-admit), Cancelled
  const allowedMap: Record<QueueStatus, QueueStatus[]> = {
    'Waiting': ['Called', 'Cancelled', 'No Show', 'In Progress'],
    'Called': ['In Progress', 'Waiting', 'No Show', 'Cancelled', 'Completed'],
    'In Progress': ['Completed', 'Cancelled', 'Waiting'],
    'No Show': ['Waiting', 'Cancelled', 'Called'],
    'Completed': [],
    'Cancelled': []
  };

  const allowed = allowedMap[currentStatus]?.includes(newStatus);
  if (!allowed) {
    return { valid: false, reason: `Cannot transition from "${currentStatus}" to "${newStatus}".` };
  }

  return { valid: true };
}

/**
 * Calculates the next unique serial number for a doctor on a specific clinic date.
 * Serial numbers start at 1 and are sequential for each doctor on that date.
 */
export function calculateNextSerial(existingAppointmentsOnDate: Array<{ serialNumber: number }>): number {
  if (!existingAppointmentsOnDate || existingAppointmentsOnDate.length === 0) {
    return 1;
  }
  const highest = Math.max(...existingAppointmentsOnDate.map(a => a.serialNumber || 0));
  return highest + 1;
}

/**
 * Checks for double booking. Returns true if slot is already occupied by an active appointment.
 */
export function isDoubleBooked(
  doctorId: string,
  date: string,
  timeSlot: string,
  existingAppointments: ExistingSlot[]
): boolean {
  return existingAppointments.some(
    app =>
      app.doctorId === doctorId &&
      app.date === date &&
      app.timeSlot === timeSlot &&
      app.status !== 'Cancelled'
  );
}

/**
 * Generates all time slots for a doctor given their working hours and slot duration.
 */
export function generateDoctorTimeSlots(startTime: string, endTime: string, durationMinutes: number = 20): string[] {
  const slots: string[] = [];
  const [startHour, startMin] = startTime.split(':').map(Number);
  const [endHour, endMin] = endTime.split(':').map(Number);

  let currentTotalMinutes = startHour * 60 + startMin;
  const endTotalMinutes = endHour * 60 + endMin;

  while (currentTotalMinutes + durationMinutes <= endTotalMinutes) {
    const hours = Math.floor(currentTotalMinutes / 60);
    const mins = currentTotalMinutes % 60;
    const formatted = `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
    slots.push(formatted);
    currentTotalMinutes += durationMinutes;
  }

  return slots;
}

/**
 * Computes available slots for a doctor on a given date by filtering out booked slots.
 */
export function getAvailableSlots(
  allSlots: string[],
  bookedSlotsOnDate: string[]
): string[] {
  const bookedSet = new Set(bookedSlotsOnDate);
  return allSlots.filter(slot => !bookedSet.has(slot));
}

/**
 * Estimates wait time in minutes for a patient given their serial position relative to the currently served serial.
 * Default avg consultation time = 15 minutes.
 */
export function estimateWaitTime(
  patientSerial: number,
  currentlyServingSerial: number | null,
  avgMinutesPerPatient: number = 15
): { patientsAhead: number; estimatedWaitMinutes: number } {
  const current = currentlyServingSerial ?? 0;
  if (patientSerial <= current) {
    return { patientsAhead: 0, estimatedWaitMinutes: 0 };
  }
  const patientsAhead = patientSerial - (current > 0 ? current : 1);
  return {
    patientsAhead: Math.max(0, patientsAhead),
    estimatedWaitMinutes: Math.max(0, patientsAhead * avgMinutesPerPatient)
  };
}
