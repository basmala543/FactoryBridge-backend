const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  name: String,

  email: {
    type: String,
    unique: true,
  },

  password: String,

  role: {
    type: String,
    enum: ["factory", "brand"],
    required: true,
  },

  otp: String,

  otpExpires: Date,
});

module.exports = mongoose.model("User", userSchema);