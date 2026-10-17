import { Router } from 'express';
import { db } from '../db/storage.js';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth.js';

const router = Router();

// GET /api/notifications - Get relevant notifications for logged in user
router.get('/', authenticateToken, (req: AuthenticatedRequest, res) => {
  if (!req.user) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const notifications = db.getNotifications(req.user.id, req.user.role);
  const unreadCount = notifications.filter(n => !n.read).length;

  res.json({ notifications, unreadCount });
});

// PATCH /api/notifications/:id/read - Mark single notification as read
router.patch('/:id/read', authenticateToken, (req, res) => {
  const success = db.markNotificationAsRead(req.params.id);
  res.json({ success });
});

// POST /api/notifications/read-all - Mark all as read
router.post('/read-all', authenticateToken, (req: AuthenticatedRequest, res) => {
  db.markAllNotificationsAsRead(req.user?.id);
  res.json({ success: true });
});

export default router;
