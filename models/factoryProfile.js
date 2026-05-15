const mongoose = require('mongoose');

const factoryProfileSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    factoryName: { type: String, required: true },
    logo: { type: String, default: "" },
    description: { type: String, required: true },
    location: { type: String, required: true },
    productCategories: { type: String, required: true },
    productionCapacity: { type: String, required: true },
    certifications: { type: String, required: true },
    machinery: { type: String, required: true },
    media: { type: [String], default: [] },
    isTopDeal: { type: Boolean, default: false },
    factoryProducts: [
      {
        productName: { type: String, default: '' },
        unit: { type: String, default: 'per piece' },
        price: { type: String, default: '' },
        minimumOrder: { type: String, default: '' },
        details: { type: String, default: '' },
        availableColors: [{ type: String }],
        availableSizes: [{ type: String }],
      }
    ],
  },
  { timestamps: true }

);
module.exports = mongoose.model("FactoryProfile", factoryProfileSchema);