/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext.js';
import { SocketProvider, useSocket } from './context/SocketContext.js';
import { Navbar } from './components/Navbar.js';
import { BookAppointmentModal } from './components/BookAppointmentModal.js';
import { TokenModal } from './components/TokenModal.js';
import { AdminDashboard } from './views/AdminDashboard.js';
import { DoctorDashboard } from './views/DoctorDashboard.js';
import { ReceptionistDashboard } from './views/ReceptionistDashboard.js';
import { PatientDashboard } from './views/PatientDashboard.js';
import { PublicQueueBoard } from './views/PublicQueueBoard.js';
import { LoginView } from './views/LoginView.js';
import { Megaphone, X, Loader2 } from 'lucide-react';
import type { Appointment } from './types/index.js';

const AppContent: React.FC = () => {
  const { user, isLoading } = useAuth();
  const { activeAlert, dismissAlert } = useSocket();

  const [currentView, setCurrentView] = useState<'dashboard' | 'tv-board'>('dashboard');
  const [isBookingOpen, setIsBookingOpen] = useState<boolean>(false);
  const [activeTokenAppointment, setActiveTokenAppointment] = useState<Appointment | null>(null);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-zinc-50 flex items-center justify-center">
        <div className="text-center space-y-3">
          <Loader2 size={36} className="animate-spin text-emerald-600 mx-auto" />
          <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
            Loading DoctorSerial Clinic OS...
          </p>
        </div>
      </div>
    );
  }

  // Not signed in
  if (!user) {
    return <LoginView />;
  }

  // Public TV Board Mode
  if (currentView === 'tv-board') {
    return <PublicQueueBoard onBack={() => setCurrentView('dashboard')} />;
  }

  const handleBookingSuccess = (app: Appointment) => {
    setActiveTokenAppointment(app);
  };

  return (
    <div className="min-h-screen bg-zinc-50/60 text-zinc-900 flex flex-col font-sans">
      {/* Global Real-Time Call Alert Toast if doctor calls patient */}
      {activeAlert && (
        <div className="bg-gradient-to-r from-purple-700 via-indigo-700 to-purple-800 text-white px-4 py-3 shadow-lg z-50 flex items-center justify-between text-xs animate-slide-down">
          <div className="max-w-7xl mx-auto w-full flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="p-1.5 rounded-lg bg-white/20">
                <Megaphone size={16} className="animate-bounce" />
              </span>
              <span>
                <strong className="font-bold underline text-sm mr-2">
                  Serial #{activeAlert.serialNumber.toString().padStart(2, '0')}
                </strong>
                <strong>{activeAlert.patientName}</strong> is called to{' '}
                <strong className="text-purple-200">{activeAlert.roomNumber}</strong> by{' '}
                {activeAlert.doctorName} ({activeAlert.doctorSpecialty})!
              </span>
            </div>
            <button
              onClick={dismissAlert}
              className="p-1 rounded-md text-white/80 hover:text-white hover:bg-white/10 ml-4 shrink-0"
              aria-label="Dismiss alert"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      )}

      {/* Main Navbar */}
      <Navbar
        currentView={currentView}
        onNavigate={view => setCurrentView(view as 'dashboard' | 'tv-board')}
        onOpenBooking={() => setIsBookingOpen(true)}
      />

      {/* Dynamic View by User Role */}
      <main className="flex-1">
        {user.role === 'Admin' && <AdminDashboard />}
        {user.role === 'Doctor' && <DoctorDashboard />}
        {user.role === 'Receptionist' && (
          <ReceptionistDashboard onOpenBooking={() => setIsBookingOpen(true)} />
        )}
        {user.role === 'Patient' && (
          <PatientDashboard onOpenBooking={() => setIsBookingOpen(true)} />
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-zinc-200 bg-white py-6 text-center text-xs text-zinc-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p>© 2026 DoctorSerial — Clinic & Appointment Management System. All rights reserved.</p>
          <div className="flex items-center gap-4 text-[11px] text-zinc-400">
            <span>Live Socket.IO Engine</span>
            <span>•</span>
            <span>Zero Double-Booking Guarantee</span>
            <span>•</span>
            <span>Atomic Serial Allocation</span>
          </div>
        </div>
      </footer>

      {/* Book Appointment Modal */}
      <BookAppointmentModal
        isOpen={isBookingOpen}
        onClose={() => setIsBookingOpen(false)}
        onSuccess={handleBookingSuccess}
      />

      {/* Token Modal */}
      <TokenModal
        appointment={activeTokenAppointment}
        onClose={() => setActiveTokenAppointment(null)}
      />
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <SocketProvider>
        <AppContent />
      </SocketProvider>
    </AuthProvider>
  );
}
