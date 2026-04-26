const mongoose = require("mongoose");

const brandProfileSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },

  brandName: {
    type: String,
    required: true,
  },

  description: {
    type: String,
    required: true,
  },

  location: {
    type: String,
    required: true,
  },

  productCategories: {
    type: String,
    required: true,
  },

  industry: {
    type: String,
    required: true,
  },

  contactInformation: {
    type: String,
    required: true,
  },

  logo: {
    type: String, // صورة اللوجو
    default: "",
  }

}, {
  timestamps: true
});

module.exports = mongoose.model(
  "BrandProfile",
  brandProfileSchema
);