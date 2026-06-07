const mongoose = require('mongoose');

const MessageSchema = new mongoose.Schema({
    senderId: { type: String, required: true },
    receiverId: { type: String, default: 'admin' },
   message: { type: String, default: '' }, // مش required عشان attachments
    timestamp: { type: Date, default: Date.now },
    isRead: { type: Boolean, default: false },
    // ✅ أضيفي دول
    attachmentUrl: { type: String, default: null },
    attachmentName: { type: String, default: null },
    attachmentType: { type: String, default: null },
});

module.exports = mongoose.model('Message', MessageSchema);