const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  brand: { type: String, required: true },
  factory: { type: String, required: true },
  productName: { type: String, required: true },
  quantity: { type: Number, required: true },
  selectedSize: { type: String },
  selectedColor: { type: String },
  specifications: { type: String },
  notes: { type: String },
  productData: { type: Object },
  status: {
    type: String,
    enum: ['pending', 'accepted', 'rejected', 'completed'],
    default: 'pending'
  },
}, { timestamps: true });

module.exports = mongoose.model('Order', orderSchema);