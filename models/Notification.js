const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, // ✅
  title: { type: String, required: true },
  message: { type: String, required: true },
type: { 

  type: String, 
  enum: ['order', 'message', 'review', 'contract', 'report', 'warning', 'system', 'refund'],
  default: 'report'
},
  isRead: { type: Boolean, default: false },
  data: { type: Object },
  createdAt: { type: Date, default: Date.now }
  
});

module.exports = mongoose.model('Notification', notificationSchema);