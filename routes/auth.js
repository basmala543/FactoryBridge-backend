const express = require("express");
const router = express.Router();
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const User = require("../models/users");
const authMiddleware = require("../middleware/authMiddleware");
const nodemailer = require("nodemailer");
const dns = require('node:dns');
dns.setDefaultResultOrder('ipv4first');
// السطر ده بيخلي أي عملية اتصال (زي بعت الإيميل) تدور على IPv4 الأول وتطنش الـ IPv6

const transporter = nodemailer.createTransport({
  host: '74.125.133.108', // ده الـ IP الحقيقي لـ smtp.gmail.com (IPv4)
  port: 465,
  secure: true,
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_PASS,
  },
  family: 4, // تأكيد إضافي
  tls: {
    rejectUnauthorized: false // عشان ميحصلش مشكلة في الـ SSL مع الـ IP المباشر
  }
});
// ================== SIGNUP ==================
router.post("/signup", async (req, res) => {
  try {
    const { UserName, Email, Password, ConfirmPassword, Role } = req.body;

    if (Password !== ConfirmPassword) {
      return res.status(400).json({ message: "Passwords do not match" });
    }

    if (!["factory", "brand"].includes(Role)) {
      return res.status(400).json({ message: "Invalid role" });
    }

    const existingUser = await User.findOne({ email: Email });

    if (existingUser) {
      return res.status(400).json({ message: "Email already exists" });
    }

    const hashedPassword = await bcrypt.hash(Password, 10);

    const newUser = new User({
      name: UserName,
      email: Email,
      password: hashedPassword,
      role: Role,
    });

    await newUser.save();

    res.json({ message: "User created successfully" });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ================== LOGIN ==================
router.post("/login", async (req, res) => {
  try {
    const { Email, Password } = req.body;

    const user = await User.findOne({ email: Email });

    if (!user) {
      return res.status(400).json({ message: "User not found" });
    }

    const isMatch = await bcrypt.compare(Password, user.password);

    if (!isMatch) {
      return res.status(400).json({ message: "Wrong password" });
    }

    const token = jwt.sign(
      { userId: user._id, email: user.email, role: user.role },
      "secretkey",
      { expiresIn: "1h" }
    );

    res.json({ message: "Login success", token: token, role: user.role });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get("/profile", authMiddleware, (req, res) => {
  res.json({ message: "User authenticated", user: req.user });
});

// ================== FORGOT PASSWORD + SEND OTP ==================
router.post("/forgot-password", async (req, res) => {
  try {
    const { Email } = req.body;

    const user = await User.findOne({ email: Email });

    if (!user) {
      return res.status(404).json({
        message: "User not found"
      });
    }

    const otp = Math.floor(100000 + Math.random() * 900000);

    user.otp = otp;
    user.otpExpires = Date.now() + 10 * 60 * 1000;

    await user.save();

    await transporter.sendMail({
      from: "factorybridge7@gmail.com",
      to: Email,
      subject: "Password Reset OTP",
      text: `Your OTP is ${otp}`
    });

    res.status(200).json({
      message: "OTP sent successfully"
    });

  } catch (err) {
    console.log(err);   // مهم جدًا
    res.status(500).json({
      message: err.message
    });
  }
});
// ================== VERIFY OTP + RESET PASSWORD ==================
router.post("/reset-password", async (req, res) => {
  try {
    const { Email, OTP, NewPassword, ConfirmPassword } = req.body;

    if (NewPassword !== ConfirmPassword) {
      return res.status(400).json({
        message: "Passwords do not match"
      });
    }

    const user = await User.findOne({ email: Email });

    if (!user) {
      return res.status(400).json({
        message: "User not found"
      });
    }

    console.log("Saved OTP:", user.otp);
    console.log("Entered OTP:", OTP);

    if (user.otp.toString() !== OTP.toString()) {
      return res.status(400).json({
        message: "Invalid OTP"
      });
    }

    if (user.otpExpires < new Date()) {
      return res.status(400).json({
        message: "OTP expired"
      });
    }

    const hashedPassword = await bcrypt.hash(NewPassword, 10);

    user.password = hashedPassword;
    user.otp = null;
    user.otpExpires = null;

    await user.save();

    res.json({
      message: "Password reset successfully"
    });

  } catch (err) {
    res.status(500).json({
      message: err.message
    });
  }
});

// ================== CHANGE PASSWORD ==================
router.put("/change-password", authMiddleware, async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;

    const user = await User.findById(req.user.userId);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const isMatch = await bcrypt.compare(oldPassword, user.password);

    if (!isMatch) {
      return res.status(400).json({ message: "Old password is incorrect" });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedPassword;
    await user.save();

    res.json({ message: "Password changed successfully" });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ================== DELETE ACCOUNT ==================
router.delete("/delete-account", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.userId;

    await User.findByIdAndDelete(userId);

    res.json({ message: "Account deleted successfully" });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;