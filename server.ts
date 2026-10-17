import http from 'node:http';
import path from 'node:path';
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';

import { initSocketIO } from './server/socket.js';
import authRoutes from './server/routes/auth.js';
import doctorRoutes from './server/routes/doctors.js';
import appointmentRoutes from './server/routes/appointments.js';
import queueRoutes from './server/routes/queue.js';
import statsRoutes from './server/routes/stats.js';
import userRoutes from './server/routes/users.js';
import notificationRoutes from './server/routes/notifications.js';

dotenv.config();

const app = express();
const server = http.createServer(app);
const PORT = Number(process.env.PORT) || 3000;
const isProd = process.env.NODE_ENV === 'production';

// Socket.IO
initSocketIO(server);

// Middleware
app.use(cors());
app.use(express.json());

// API Health Check
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'DoctorSerial Clinic & Appointment Management System',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/doctors', doctorRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/queue', queueRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/users', userRoutes);
app.use('/api/notifications', notificationRoutes);

// Frontend Vite Integration
if (!isProd) {
  const vite = await createViteServer({
    server: {
      middlewareMode: true,
      hmr: process.env.DISABLE_HMR !== 'true',
    },
    appType: 'spa',
  });
  app.use(vite.middlewares);
} else {
  const distPath = path.resolve('dist');
  app.use(express.static(distPath));
  app.get('*', (_req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

server.listen(PORT, '0.0.0.0', () => {
  console.log(`🏥 DoctorSerial Server running on http://0.0.0.0:${PORT}`);
  console.log(`📡 WebSocket & Socket.IO active`);
  console.log(`🩺 Health check available at /api/health`);
});
