const mongoose = require('mongoose');

const productionJobSchema = new mongoose.Schema({
  orderId: {
    type: String,
    required: true,
    unique: true
  },
  productName: {
    type: String,
    required: true
  },
  completionPercent: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  dueDate: {
    type: Date,
    required: true
  },
  status: {
    type: String,
    enum: ['Pending', 'In Progress', 'Completed', 'Delayed'],
    default: 'Pending'
  },
  assignedFactory: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Factory'
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('ProductionJob', productionJobSchema);
