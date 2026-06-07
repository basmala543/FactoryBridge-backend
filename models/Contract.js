const mongoose = require('mongoose');

const contractSchema = new mongoose.Schema({
  order: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true },
  brand: { type: String, required: true },
  factory: { type: String, required: true },

  status: {
    type: String,
    enum: ['pending', 'brand_approved', 'factory_approved', 'active', 'rejected'],
    default: 'pending'
  },

  brandApproved: { type: Boolean, default: false },
  factoryApproved: { type: Boolean, default: false },

  terms: {
    type: [String],
    default: [
      'Factory must deliver on agreed date.',
      'Brand must complete payments on time.',
      'Any modifications require approval from both parties.',
      'Contract cancellation must be documented.'
    ]
  },

}, { timestamps: true });

module.exports = mongoose.model('Contract', contractSchema);