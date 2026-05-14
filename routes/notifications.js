const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/notificationController');
const auth = require('../middleware/authMiddleware');

router.get('/', auth, ctrl.getNotifications);
router.put('/mark-all-read', auth, ctrl.markAllAsRead);
router.put('/:id/read', auth, ctrl.markAsRead);
router.delete('/:id', auth, ctrl.deleteNotification);
router.get('/unread-count', auth, ctrl.getUnreadCount);

module.exports = router;