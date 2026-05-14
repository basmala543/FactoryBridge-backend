const mongoose = require('mongoose');

const sampleRequestSchema = new mongoose.Schema({
  brand: { type: String, required: true },
  factory: { type: String, required: true },
  productName: { type: String, required: true },
  quantity: { type: Number, required: true },
  notes: { type: String },
  status: { 
    type: String, 
    enum: ['pending', 'accepted', 'rejected'], 
    default: 'pending' 
  },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('SampleRequest', sampleRequestSchema);