import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { db } from '../db/storage.js';
import { generateToken, authenticateToken, AuthenticatedRequest } from '../middleware/auth.js';

const router = Router();

// POST /api/auth/login
router.post('/login', (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    res.status(400).json({ error: 'Email and password are required.' });
    return;
  }

  const user = db.findUserByEmail(email.trim());
  if (!user) {
    res.status(401).json({ error: 'Invalid email or password.' });
    return;
  }

  const isMatch = bcrypt.compareSync(password, user.passwordHash);
  if (!isMatch) {
    res.status(401).json({ error: 'Invalid email or password.' });
    return;
  }

  const token = generateToken({
    id: user.id,
    email: user.email,
    role: user.role,
    name: user.name
  });

  // Attach associated doctor record if user is a doctor
  let doctorProfile = null;
  if (user.role === 'Doctor') {
    doctorProfile = db.findDoctorById(user.id);
  }

  const { passwordHash: _, ...safeUser } = user;
  res.json({
    token,
    user: safeUser,
    doctorProfile
  });
});

// POST /api/auth/register (Patient registration)
router.post('/register', (req, res) => {
  const { name, email, password, phone, role } = req.body;

  if (!name || !email || !password || !phone) {
    res.status(400).json({ error: 'Name, email, password, and phone number are required.' });
    return;
  }

  const existing = db.findUserByEmail(email.trim());
  if (existing) {
    res.status(400).json({ error: 'An account with this email address already exists.' });
    return;
  }

  const saltRounds = 10;
  const passwordHash = bcrypt.hashSync(password, saltRounds);

  // New self-registrations default to 'Patient' role
  const targetRole = role === 'Patient' || !role ? 'Patient' : 'Patient';

  const newUser = db.createUser({
    name: name.trim(),
    email: email.trim().toLowerCase(),
    passwordHash,
    role: targetRole,
    phone: phone.trim()
  });

  const token = generateToken({
    id: newUser.id,
    email: newUser.email,
    role: newUser.role,
    name: newUser.name
  });

  const { passwordHash: _, ...safeUser } = newUser;
  res.status(201).json({
    token,
    user: safeUser
  });
});

// GET /api/auth/me
router.get('/me', authenticateToken, (req: AuthenticatedRequest, res) => {
  if (!req.user) {
    res.status(401).json({ error: 'Unauthorized.' });
    return;
  }

  const user = db.findUserById(req.user.id);
  if (!user) {
    res.status(404).json({ error: 'User profile not found.' });
    return;
  }

  let doctorProfile = null;
  if (user.role === 'Doctor') {
    doctorProfile = db.findDoctorById(user.id);
  }

  const { passwordHash: _, ...safeUser } = user;
  res.json({
    user: safeUser,
    doctorProfile
  });
});

// POST /api/auth/demo-switch (Quick role switch for demo exploration)
router.post('/demo-switch', (req, res) => {
  const { role, doctorId } = req.body;

  let targetUser = null;
  if (role === 'Admin') {
    targetUser = db.findUserByEmail('admin@doctorserial.com');
  } else if (role === 'Doctor') {
    if (doctorId) {
      const doc = db.findDoctorById(doctorId);
      if (doc) targetUser = db.findUserById(doc.userId);
    }
    if (!targetUser) targetUser = db.findUserByEmail('dr.syed.ali@doctorserial.com') || db.getAllUsers().find(u => u.role === 'Doctor') || null;
  } else if (role === 'Receptionist') {
    targetUser = db.findUserByEmail('reception@doctorserial.com');
  } else if (role === 'Patient') {
    targetUser = db.findUserByEmail('patient.john@example.com');
  }

  if (!targetUser) {
    res.status(404).json({ error: `Demo account for role ${role} not found.` });
    return;
  }

  const token = generateToken({
    id: targetUser.id,
    email: targetUser.email,
    role: targetUser.role,
    name: targetUser.name
  });

  let doctorProfile = null;
  if (targetUser.role === 'Doctor') {
    doctorProfile = db.findDoctorById(targetUser.id);
  }

  const { passwordHash: _, ...safeUser } = targetUser;
  res.json({
    token,
    user: safeUser,
    doctorProfile
  });
});

export default router;
