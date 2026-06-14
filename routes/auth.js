const express = require("express");
const router = express.Router();
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const User = require("../models/users");
const authMiddleware = require("../middleware/authMiddleware");
const nodemailer = require("nodemailer");
const dns = require('node:dns');
dns.setDefaultResultOrder('ipv4first');

const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 587,
  secure: false, // لازم false مع بورت 587 عشان يشغل الـ STARTTLS
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_PASS,
  },
  family: 4,
  connectionTimeout: 30000, // زودنا الوقت عشان نضمن الربط
  greetingTimeout: 20000,
  socketTimeout: 30000,
  tls: {
    rejectUnauthorized: false,
    minVersion: 'TLSv1.2'
  }
});




// ================== SIGNUP ==================
router.post("/signup", async (req, res) => {
  try {
    const { UserName, Email, Password, ConfirmPassword, Role } = req.body;

    if (Password !== ConfirmPassword)
      return res.status(400).json({ message: "Passwords do not match" });

    if (!["factory", "brand"].includes(Role))
      return res.status(400).json({ message: "Invalid role" });

    const existingUser = await User.findOne({ email: Email });
    if (existingUser) {
      // لو موجود بس لسه ما اتأكدش، نبعتله OTP تاني
      if (!existingUser.isEmailVerified) {
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        existingUser.emailVerificationToken = otp;
        existingUser.emailVerificationExpires = Date.now() + 10 * 60 * 1000;
        await existingUser.save();

        await transporter.sendMail({
          from: "factorybridge3@gmail.com",
          to: Email,
          subject: "Verify your email - FactoryBridge",
          text: `Your verification code is: ${otp}`,
        });

        return res.status(200).json({ message: "OTP resent. Please verify your email." });
      }
      return res.status(400).json({ message: "Email already exists" });
    }


    const hashedPassword = await bcrypt.hash(Password, 10);
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    const newUser = new User({
      name: UserName,
      email: Email,
      password: hashedPassword,
      role: Role,
      isEmailVerified: false,
      emailVerificationToken: otp,
      emailVerificationExpires: Date.now() + 10 * 60 * 1000,
    });

    await newUser.save();

    await transporter.sendMail({
      from: "factorybridge3@gmail.com",
      to: Email,
      subject: "Verify your email - FactoryBridge",
      text: `Your verification code is: ${otp}`,
    });

    res.status(200).json({ message: "OTP sent. Please verify your email." });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

//login//

router.post("/login", async (req, res) => {
  try {
    const { Email, Password, Role } = req.body; // ← أضف Role

    const user = await User.findOne({ email: Email });
    if (!user) return res.status(400).json({ message: "User not found" });

    const isMatch = await bcrypt.compare(Password, user.password);
    if (!isMatch) return res.status(400).json({ message: "Wrong password" });

    if (!user.isEmailVerified) {
  return res.status(403).json({ message: "Please verify your email before logging in" });
}


    // ================== SUSPENSION CHECK ==================
    if (user.isSuspended) {
      return res.status(403).json({ 
        message: "Your account has been suspended due to: " + (user.suspendReason || "policy violation") 
      });
    }

    //   login session //
    const ip = req.headers["x-forwarded-for"] || req.socket.remoteAddress || "";
    const userAgent = req.headers["user-agent"] || "";

    let device = "Unknown Device";
    if (/Mobile|Android|iPhone/i.test(userAgent)) device = "Mobile";
    else if (/Tablet|iPad/i.test(userAgent)) device = "Tablet";
    else if (/Windows|Mac|Linux/i.test(userAgent)) device = "Desktop";

    user.loginSessions.push({ device, ip });

    if (user.loginSessions.length > 20) {
      user.loginSessions = user.loginSessions.slice(-20);
    }

    await user.save();

    const token = jwt.sign(
      { userId: user._id, email: user.email, role: user.role },
      "secretkey",
      { expiresIn: "1h" }
    );

    res.json({ message: "Login success", token, role: user.role, _id: user._id });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
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
      from: "factorybridge3@gmail.com",
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
// ================== VERIFY EMAIL OTP ==================
router.post("/verify-email", async (req, res) => {
  try {
    const { Email, OTP } = req.body;

    const user = await User.findOne({ email: Email });
    if (!user) return res.status(404).json({ message: "User not found" });

    if (user.isEmailVerified)
      return res.status(400).json({ message: "Email already verified" });

    if (user.emailVerificationToken !== OTP.toString())
      return res.status(400).json({ message: "Invalid OTP" });

    if (user.emailVerificationExpires < Date.now())
      return res.status(400).json({ message: "OTP expired" });

    user.isEmailVerified = true;
    user.emailVerificationToken = null;
    user.emailVerificationExpires = null;
    await user.save();

    res.json({ message: "Email verified successfully" });

  } catch (err) {
    res.status(500).json({ message: err.message });
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
// ================== ADMIN - GET ALL USERS ==================
router.get("/admin/users", async (req, res) => {
  try {
    const users = await User.find({}, { password: 0, otp: 0 });
    res.json({ data: users });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});
router.delete("/admin/users/:id", async (req, res) => {
  try {
    await User.findByIdAndDelete(req.params.id);
    res.json({ message: "User deleted" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});
// ================== ADMIN - SUSPEND USER ==================
router.patch("/admin/users/:id/suspend", async (req, res) => {
  try {
    const { reason } = req.body;
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    user.isSuspended = true;
    user.suspendedAt = new Date();
    user.suspendReason = reason || "Violated platform policies";
    await user.save();

    res.json({ message: "User suspended successfully" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});
router.patch("/admin/users/:id/unsuspend", async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: "User not found" });
    user.isSuspended = false;
    user.suspendedAt = null;
    user.suspendReason = null;
    await user.save();
    res.json({ message: "User unsuspended successfully" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});
module.exports = router;