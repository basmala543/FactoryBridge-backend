const mongoose = require("mongoose");

const loginSessionSchema = new mongoose.Schema({
  device: { type: String, default: "Unknown Device" },
  ip: { type: String, default: "" },
  location: { type: String, default: "" },
  loginAt: { type: Date, default: Date.now },
});

const userSchema = new mongoose.Schema({
  name: String,

  email: {
    type: String,
    unique: true,
  },

  password: String,

  role: {
    type: String,
    enum: ["factory", "brand", "admin"],
    required: true,
  },

  otp: String,
  otpExpires: Date,

  // ================== EMAIL VERIFICATION ==================
  isEmailVerified: { type: Boolean, default: false },
  emailVerificationToken: { type: String, default: null },
  emailVerificationExpires: { type: Date, default: null },

  // ================== PRIVACY SETTINGS ==================
  privacySettings: {
    profileVisibility: {
      type: String,
      enum: ["Everyone", "Contacts", "Nobody"],
      default: "Everyone",
    },
    hideContactInfo: { type: Boolean, default: false },
    whoCanContact: {
      type: String,
      enum: ["Everyone", "Contacts", "Nobody"],
      default: "Everyone",
    },
  },

  // ================== BLOCKED USERS ==================
  blockedUsers: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],

  // ================== LOGIN ACTIVITY ==================
  loginSessions: {
    type: [loginSessionSchema],
    default: [],
  },
});

module.exports = mongoose.model("User", userSchema);