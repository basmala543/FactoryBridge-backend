const mongoose = require("mongoose");

const factoryProfileSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    factoryName: {
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

    productionCapacity: {
      type: String,
      required: true,
    },

    certifications: {
      type: String,
      required: true,
    },

    machinery: {
      type: String,
      required: true,
    },

    media: {
      type: [String],
      default: [],
    },
  },
  {
    timestamps: true,
  },
);

module.exports = mongoose.model("FactoryProfile", factoryProfileSchema);
