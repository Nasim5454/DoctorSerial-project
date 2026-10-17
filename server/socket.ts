import { Server as SocketIOServer, Socket } from 'socket.io';
import type { Server as HttpServer } from 'node:http';

let io: SocketIOServer | null = null;

export function initSocketIO(httpServer: HttpServer): SocketIOServer {
  io = new SocketIOServer(httpServer, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE']
    }
  });

  io.on('connection', (socket: Socket) => {
    // Rooms for targeted updates
    socket.on('join:room', (room: string) => {
      socket.join(room);
    });

    socket.on('leave:room', (room: string) => {
      socket.leave(room);
    });

    socket.on('disconnect', () => {
      // client disconnected
    });
  });

  return io;
}

export function getIO(): SocketIOServer | null {
  return io;
}

export function broadcastQueueUpdate(payload: {
  doctorId: string;
  date: string;
  appointmentId?: string;
  status?: string;
  serialNumber?: number;
}): void {
  if (!io) return;
  // Broadcast to global queue room and doctor-specific room
  io.emit('queue:updated', payload);
  io.to(`doctor:${payload.doctorId}`).emit('doctor:queue_updated', payload);
}

export function broadcastPatientCalled(payload: {
  appointmentId: string;
  serialNumber: number;
  doctorName: string;
  doctorSpecialty: string;
  roomNumber: string;
  patientName: string;
  patientId: string;
}): void {
  if (!io) return;
  // Broadcast to public TV display and general channel
  io.emit('patient:called', payload);
  // Also send directly to the patient's private socket room
  io.to(`patient:${payload.patientId}`).emit('patient:my_turn', payload);
}

export function broadcastNotification(payload: {
  recipientUserId?: string;
  recipientRole?: string;
  title: string;
  message: string;
  type: string;
  serialNumber?: number;
}): void {
  if (!io) return;
  io.emit('notification:new', payload);
}
