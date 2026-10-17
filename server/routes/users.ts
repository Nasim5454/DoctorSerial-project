import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { db } from '../db/storage.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';

const router = Router();

// GET /api/users - List all users (Admin & Receptionist)
router.get('/', authenticateToken, requireRole(['Admin', 'Receptionist']), (req, res) => {
  const { role, search } = req.query;
  let users = db.getAllUsers();

  if (role && typeof role === 'string') {
    users = users.filter(u => u.role === role);
  }

  if (search && typeof search === 'string') {
    const s = search.toLowerCase();
    users = users.filter(u =>
      u.name.toLowerCase().includes(s) ||
      u.email.toLowerCase().includes(s) ||
      u.phone.toLowerCase().includes(s)
    );
  }

  // Strip password hash before returning
  const safeUsers = users.map(({ passwordHash: _, ...user }) => user);
  res.json({ users: safeUsers });
});

// GET /api/users/patients - List patients for appointment booking dropdown
router.get('/patients', authenticateToken, requireRole(['Admin', 'Receptionist', 'Doctor']), (_req, res) => {
  const patients = db.getAllUsers().filter(u => u.role === 'Patient');
  const safe = patients.map(({ passwordHash: _, ...p }) => p);
  res.json({ patients: safe });
});

// POST /api/users - Create user (Admin/Receptionist registering patient or staff)
router.post('/', authenticateToken, requireRole(['Admin', 'Receptionist']), (req, res) => {
  const { name, email, phone, role, password } = req.body;

  if (!name || !email || !phone) {
    res.status(400).json({ error: 'Name, email, and phone number are required.' });
    return;
  }

  const existing = db.findUserByEmail(email.trim());
  if (existing) {
    res.status(400).json({ error: 'User with this email already exists.' });
    return;
  }

  const defaultPassword = password || 'Doctor123!';
  const passwordHash = bcrypt.hashSync(defaultPassword, 10);

  const newUser = db.createUser({
    name: name.trim(),
    email: email.trim().toLowerCase(),
    passwordHash,
    phone: phone.trim(),
    role: role || 'Patient'
  });

  const { passwordHash: _, ...safe } = newUser;
  res.status(201).json({ success: true, user: safe });
});

export default router;
