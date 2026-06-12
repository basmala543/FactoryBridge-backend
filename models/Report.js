const mongoose = require("mongoose");

const reportSchema = new mongoose.Schema({
  reporterName:  { type: String, required: true },
  reporterEmail: { type: String, required: true },
  reporterId:    { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  factoryId:     { type: mongoose.Schema.Types.ObjectId, ref: "Factory" },
  factoryName:   { type: String, default: "" },
  brandId:   { type: mongoose.Schema.Types.ObjectId, ref: "Brand" },
brandName: { type: String, default: "" },
  orderId:       { type: mongoose.Schema.Types.ObjectId, ref: "Order" },
  reason:        { type: String, required: true },
  description:   { type: String, default: "" },
  screenshotUrl: { type: String, default: "" },
  status:        { type: String, enum: ["pending", "reviewed", "resolved"], default: "pending" },
  createdAt:     { type: Date, default: Date.now },
});

module.exports = mongoose.model("Report", reportSchema);