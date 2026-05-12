const mongoose = require('mongoose');

const dashboardSchema = new mongoose.Schema({
  revenue: {
    type: Number,
    default: 46000
  },
  rating: {
    type: Number,
    default: 4.3
  },
  incomingRequests: {
    type: Number,
    default: 5
  },
  activeProduction: {
    type: Number,
    default: 2
  },
  capacityOverview: {
    currentCapacityPercent: {
      type: Number,
      default: 65
    },
    totalCapacityUnits: {
      type: Number,
      default: 50000
    },
    availableUnits: {
      type: Number,
      default: 66
    },
    unitType: {
      type: String,
      default: "Units"
    }
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Dashboard', dashboardSchema);
