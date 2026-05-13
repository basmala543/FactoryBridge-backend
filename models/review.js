const mongoose = require('mongoose');
const reviewSchema = new mongoose.Schema({
  factory: {
    type: String, // ✅ غيري النوع هنا من ObjectId إلى String
    required: true
  },
  user: {
    type: String, // ✅ غيري النوع هنا أيضاً ليتناسب مع ما أدخلتيه يدوياً
    required: true
  },
  userName: { type: String, required: true },
  rating: { type: Number, required: true, min: 1, max: 5 },
  comment: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Review', reviewSchema);