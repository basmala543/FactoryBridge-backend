const mongoose = require('mongoose');

const MessageSchema = new mongoose.Schema({
    senderId: { type: String, required: true },
    receiverId: { type: String, default: 'admin' }, // افتراضاً إن الطرف التاني هو الدعم
    message: { type: String, required: true },
    timestamp: { type: Date, default: Date.now },
    isRead: { type: Boolean, default: false } // ← أضيفي السطر ده بس

});

module.exports = mongoose.model('Message', MessageSchema);