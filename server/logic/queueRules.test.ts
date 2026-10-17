import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateNextSerial,
  isDoubleBooked,
  isValidStatusTransition,
  generateDoctorTimeSlots,
  getAvailableSlots,
  estimateWaitTime,
} from './queueRules.ts';
import type { QueueStatus, ExistingSlot } from './queueRules.ts';

test('calculateNextSerial assigns 1 when no appointments exist', () => {
  assert.equal(calculateNextSerial([]), 1);
});

test('calculateNextSerial increments sequentially from highest existing serial', () => {
  const existing = [
    { serialNumber: 1 },
    { serialNumber: 2 },
    { serialNumber: 3 },
  ];
  assert.equal(calculateNextSerial(existing), 4);
});

test('calculateNextSerial handles out of order serial numbers', () => {
  const existing = [
    { serialNumber: 5 },
    { serialNumber: 2 },
    { serialNumber: 1 },
  ];
  assert.equal(calculateNextSerial(existing), 6);
});

test('isDoubleBooked detects duplicate appointment on same doctor, date, and slot', () => {
  const appointments: ExistingSlot[] = [
    {
      doctorId: 'doc_1',
      date: '2026-10-17',
      timeSlot: '09:00',
      status: 'Waiting'
    }
  ];

  // Exactly matching slot
  assert.equal(isDoubleBooked('doc_1', '2026-10-17', '09:00', appointments), true);
  // Different time slot
  assert.equal(isDoubleBooked('doc_1', '2026-10-17', '09:20', appointments), false);
  // Different date
  assert.equal(isDoubleBooked('doc_1', '2026-10-18', '09:00', appointments), false);
  // Different doctor
  assert.equal(isDoubleBooked('doc_2', '2026-10-17', '09:00', appointments), false);
});

test('isDoubleBooked ignores Cancelled appointments so slot can be reused', () => {
  const appointments: ExistingSlot[] = [
    {
      doctorId: 'doc_1',
      date: '2026-10-17',
      timeSlot: '09:00',
      status: 'Cancelled'
    }
  ];

  assert.equal(isDoubleBooked('doc_1', '2026-10-17', '09:00', appointments), false);
});

test('isValidStatusTransition validates queue life-cycle correctly', () => {
  // Allowed transitions
  assert.equal(isValidStatusTransition('Waiting', 'Called').valid, true);
  assert.equal(isValidStatusTransition('Called', 'In Progress').valid, true);
  assert.equal(isValidStatusTransition('In Progress', 'Completed').valid, true);
  assert.equal(isValidStatusTransition('Waiting', 'No Show').valid, true);
  assert.equal(isValidStatusTransition('Waiting', 'Cancelled').valid, true);

  // Completed cannot change
  assert.equal(isValidStatusTransition('Completed', 'In Progress').valid, false);
  assert.equal(isValidStatusTransition('Completed', 'Waiting').valid, false);

  // Cancelled cannot change
  assert.equal(isValidStatusTransition('Cancelled', 'Waiting').valid, false);
});

test('generateDoctorTimeSlots produces correct intervals', () => {
  const slots = generateDoctorTimeSlots('09:00', '10:00', 20);
  assert.deepEqual(slots, ['09:00', '09:20', '09:40']);
});

test('getAvailableSlots filters out already booked slots', () => {
  const all = ['09:00', '09:20', '09:40', '10:00'];
  const booked = ['09:20', '10:00'];
  const available = getAvailableSlots(all, booked);
  assert.deepEqual(available, ['09:00', '09:40']);
});

test('estimateWaitTime computes patients ahead and estimated wait', () => {
  const wait = estimateWaitTime(5, 2, 15);
  // Patient is serial 5, currently serving serial 2 -> 3 ahead
  assert.equal(wait.patientsAhead, 3);
  assert.equal(wait.estimatedWaitMinutes, 45);

  const alreadyServing = estimateWaitTime(2, 2, 15);
  assert.equal(alreadyServing.patientsAhead, 0);
  assert.equal(alreadyServing.estimatedWaitMinutes, 0);
});
