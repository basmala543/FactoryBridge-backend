const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
  factory: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'FactoryProfile', // تأكدي أن هذا الاسم يطابق الموديل في factoryProfile.js
    required: true
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User', // يربط المراجعة بالمستخدم اللي كتبها
    required: true
  },
  userName: { type: String, required: true }, // لتسهيل عرض الاسم بسرعة
  rating: { type: Number, required: true, min: 1, max: 5 },
  comment: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Review', reviewSchema);