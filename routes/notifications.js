const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/notificationController');
const auth = require('../middleware/authMiddleware');

// ✅ Static أولاً
router.get('/unread-count', auth, ctrl.getUnreadCount);
router.put('/mark-all-read', auth, ctrl.markAllAsRead);
router.get('/', auth, ctrl.getNotifications);
router.post('/', ctrl.createNotification);

// ✅ Dynamic تانياً
router.put('/:id/read', auth, ctrl.markAsRead);
router.delete('/:id', auth, ctrl.deleteNotification);

module.exports = router;