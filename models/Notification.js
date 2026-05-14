const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  user: { type: String, required: true },
  title: { type: String, required: true },
  message: { type: String, required: true },
  type: { type: String, enum: ['order', 'message', 'system'], default: 'system' },
  isRead: { type: Boolean, default: false },
  data: { type: Object },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Notification', notificationSchema);