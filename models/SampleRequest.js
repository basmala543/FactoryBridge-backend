const mongoose = require('mongoose');

const sampleRequestSchema = new mongoose.Schema({
 brand: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
factory: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, 
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