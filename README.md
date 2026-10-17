# DoctorSerial — Clinic & Appointment Management System

A full-stack, enterprise-grade Clinic & Patient Queue Management platform engineered with React, Vite, Node.js, Express, Socket.IO, and JWT role-based security.

---

## 🌟 Key Features

1. **Role-Based Login & Authorization**:
   - **Admin**: Clinic KPIs, doctor management, staff directory, revenue & daily reports.
   - **Doctor**: Live consultation station, "Call Next Patient" trigger, patient history, clinical notes, and availability status.
   - **Receptionist**: Real-time queue board, walk-in patient registration, slot booking, and queue status controllers.
   - **Patient**: Real-time queue position tracker ("You are Serial #3, 1 patient ahead, ~15 mins wait"), appointment history, and instant token generation.

2. **Atomic Serial Number Allocation & Double-Booking Prevention**:
   - Generates a guaranteed sequential serial number per doctor and clinic date (e.g. Serial #01, #02, #03...).
   - Backend validation ensures that no two active appointments can share the same doctor, date, and time slot.

3. **Real-time Queue Updates (Socket.IO)**:
   - Instant live updates across all connected clients on events: `queue:updated`, `patient:called`, `notification:new`.
   - Audio synthesized clinic chimes and visual banners when patients are called into examination rooms.

4. **Public Waiting Room TV Mode**:
   - High-contrast, large-format display mode for waiting hall TV monitors showing the currently called serial number, room directions, active doctors, and up next queue sequence.

5. **Complete Queue Lifecycle**:
   - `Waiting` ➔ `Called` ➔ `In Progress` ➔ `Completed`
   - Terminal & exception statuses: `No Show`, `Cancelled`.

6. **In-App Notifications & Reminders**:
   - Urgent alerts when called to a doctor's room.
   - Confirmation reminders with printable token slips and QR/barcode identifiers.

---

## 🛠️ Technology Stack

- **Frontend**: React 19, Vite 8, Tailwind CSS v4, Lucide Icons, Axios, Socket.IO Client.
- **Backend**: Node.js 22, Express.js 4, Socket.IO 4, JSON Web Token (JWT), bcryptjs.
- **Database**: Document database store with MongoDB / Mongoose schema compatibility and JSON persistence in `.data/doctorserial_db.json`.
- **Testing**: Native Node.js test runner (`node:test`, `node:assert/strict`).

---

## 🚀 Quick Start & Installation

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment Variables
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
Default parameters in `.env`:
```env
PORT=3000
JWT_SECRET="doctor_serial_super_secret_jwt_key_2026"
MONGODB_URI="mongodb://localhost:27017/doctorserial"
NODE_ENV="development"
```

### 3. Run the Development Server
```bash
npm run dev
```
The application will launch on `http://localhost:3000`.

### 4. Run Unit Tests
```bash
npm test
# Or: node --test
```

---

## 👥 Seed & Demo Accounts

The database comes pre-seeded with realistic clinic data. You can log in with any of these accounts or use the **Instant 1-Click Role Switcher** at the top of the app:

| Role | Email | Password | Details |
| :--- | :--- | :--- | :--- |
| **Hospital Admin** | `admin@doctorserial.com` | `Admin123!` | Dr. M. A. Hasan (Director of Clinical Operations) |
| **Doctor** | `dr.syed.ali@doctorserial.com` | `Doctor123!` | Prof. Dr. Syed Mohammad Ali (Cardiology, Chamber 302) |
| **Doctor** | `dr.farhana@doctorserial.com` | `Doctor123!` | Assoc. Prof. Dr. Farhana Sultana (Pediatrics, Chamber 205) |
| **Doctor** | `dr.tanvir@doctorserial.com` | `Doctor123!` | Dr. Tanvir Ahmed Chowdhury (Dermatology, Chamber 108) |
| **Doctor** | `dr.nazmul@doctorserial.com` | `Doctor123!` | Prof. Dr. Nazmul Huda (Neurology, Chamber 404) |
| **Receptionist** | `reception@doctorserial.com` | `Reception123!` | Sadia Afrin (Head of Front Desk & Queue) |
| **Patient** | `patient.john@example.com` | `Patient123!` | Mohammad Rafiqul Islam (+880 1715-443322) |
| **Patient** | `patient.emma@example.com` | `Patient123!` | Nusrat Jahan (+880 1812-998877) |

---

## 📁 Project Architecture

```
├── .env.example                   # Environment configuration template
├── README.md                      # Project documentation and manual
├── package.json                   # Dependencies and npm scripts
├── server.ts                      # Full-stack server entry (Express + Socket.IO + Vite middleware)
├── server/                        # Backend REST API and Real-Time Service
│   ├── types.ts                   # Domain entities (User, Doctor, Appointment, QueueSummary)
│   ├── socket.ts                  # Socket.IO rooms and event broadcast system
│   ├── db/
│   │   └── storage.ts             # Persistent document store with Mongoose compatibility & seeding
│   ├── logic/
│   │   ├── queueRules.ts          # Pure business logic (serial allocation, double-booking, wait estimate)
│   │   └── queueRules.test.ts     # Pure unit tests running with node:test
│   ├── middleware/
│   │   └── auth.ts                # JWT authentication & role-based route guard
│   └── routes/
│       ├── auth.ts                # Login, registration, session, and role switcher endpoints
│       ├── doctors.ts             # Doctor profile, schedules, available slots & duty toggles
│       ├── appointments.ts        # Booking with double-booking prevention & status transitions
│       ├── queue.ts               # Live queue summaries & call-next patient action
│       ├── stats.ts               # Executive metrics, revenue, and daily report endpoints
│       ├── users.ts               # Staff directory & patient management
│       └── notifications.ts       # In-app reminders and alerts
└── src/                           # Frontend React Client
    ├── main.tsx                   # React root entry
    ├── App.tsx                    # Main layout with role switching & modals
    ├── types/                     # Shared TypeScript interfaces
    ├── api/
    │   ├── client.ts              # Axios instance with JWT Bearer interceptor
    │   └── services.ts            # Typed API client methods
    ├── context/
    │   ├── AuthContext.tsx        # Authentication & session provider
    │   └── SocketContext.tsx      # Real-time Socket.IO provider with audio chimes
    ├── components/
    │   ├── Navbar.tsx             # Header with 1-click role switcher & status
    │   ├── QueueStatusBadge.tsx   # Color-coded status badges with icons
    │   ├── TokenModal.tsx         # Printable serial token slip with barcode
    │   ├── BookAppointmentModal.tsx # Booking drawer with dynamic slot checker
    │   └── NotificationDrawer.tsx # In-app notification center
    └── views/
        ├── AdminDashboard.tsx     # KPIs, doctor workload, and staff directory
        ├── DoctorDashboard.tsx    # Consultation desk, call next patient, clinical notes
        ├── ReceptionistDashboard.tsx # Queue matrix, walk-in booking, status changer
        ├── PatientDashboard.tsx   # Live queue position, estimated wait, past appointments
        ├── PublicQueueBoard.tsx   # Full-screen waiting hall TV monitor display
        └── LoginView.tsx          # Authentication & demo account chooser
```

---

## 🔒 Security & Data Integrity

- **Password Hashing**: Salted hashing with `bcryptjs` (passwords never stored in plain text).
- **JWT Protection**: Signed session tokens with expiration and role assertions.
- **Race Condition Prevention**: Serial numbers are atomically incremented within synchronized database locks.
- **Double Booking Guard**: Checked both at slot discovery and at transaction commit time.
