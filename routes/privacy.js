const express = require("express");
const router = express.Router();
const User = require("../models/users");
const authMiddleware = require("../middleware/authMiddleware");
const nodemailer = require("nodemailer");
const crypto = require("crypto");
const Report = require("../models/Report");
const Notification = require("../models/Notification");
const cloudinary = require("cloudinary").v2;
const multer = require("multer");
const upload = multer({ storage: multer.memoryStorage() });

const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 587,
  secure: false,
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_PASS,
  },
  family: 4,
  tls: { rejectUnauthorized: false },
});

// ================== EMAIL VERIFICATION ==================

// GET  /privacy/email-verification-status
// بيرجع هل الإيميل متأكد منه ولا لأ
router.get("/email-verification-status", authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select("email isEmailVerified");
    if (!user) return res.status(404).json({ message: "User not found" });

    res.json({ email: user.email, isEmailVerified: user.isEmailVerified });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /privacy/send-verification-email
// بيبعت إيميل تأكيد للمستخدم
router.post("/send-verification-email", authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    if (user.isEmailVerified) {
      return res.status(400).json({ message: "Email already verified" });
    }

    const token = crypto.randomBytes(32).toString("hex");
    user.emailVerificationToken = token;
    user.emailVerificationExpires = Date.now() + 24 * 60 * 60 * 1000; // 24 ساعة
    await user.save();

    const verifyUrl = `${process.env.BASE_URL}/privacy/verify-email/${token}`;

    await transporter.sendMail({
      from: process.env.GMAIL_USER,
      to: user.email,
      subject: "Verify Your Email - FactoryBridge",
      html: `
        <h2>Email Verification</h2>
        <p>Click the link below to verify your email address:</p>
        <a href="${verifyUrl}" style="
          background:#081B36;color:#E8D8C4;padding:12px 24px;
          border-radius:8px;text-decoration:none;display:inline-block;margin-top:8px
        ">Verify Email</a>
        <p style="margin-top:16px;color:#888">This link expires in 24 hours.</p>
      `,
    });

    res.json({ message: "Verification email sent successfully" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /privacy/verify-email/:token
// الـ link اللى بيجي في الإيميل - بيأكد الإيميل
router.get("/verify-email/:token", async (req, res) => {
  try {
    const user = await User.findOne({
      emailVerificationToken: req.params.token,
      emailVerificationExpires: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({ message: "Invalid or expired verification link" });
    }

    user.isEmailVerified = true;
    user.emailVerificationToken = null;
    user.emailVerificationExpires = null;
    await user.save();

    res.json({ message: "Email verified successfully" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ================== LOGIN ACTIVITY ==================

// GET /privacy/login-activity
// بيرجع آخر 10 sessions للمستخدم
router.get("/login-activity", authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select("loginSessions");
    if (!user) return res.status(404).json({ message: "User not found" });

    const sessions = [...user.loginSessions]
      .sort((a, b) => new Date(b.loginAt) - new Date(a.loginAt))
      .slice(0, 10);

    res.json({ sessions });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ================== PRIVACY SETTINGS ==================

// GET /privacy/settings
// بيرجع إعدادات الخصوصية الحالية
router.get("/settings", authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select("privacySettings");
    if (!user) return res.status(404).json({ message: "User not found" });

    res.json({ privacySettings: user.privacySettings });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PUT /privacy/settings
// بيحدّث إعدادات الخصوصية
// Body: { profileVisibility, hideContactInfo, whoCanContact }
router.put("/settings", authMiddleware, async (req, res) => {
  try {
    const { profileVisibility, hideContactInfo, whoCanContact } = req.body;

    const user = await User.findById(req.user.userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    const allowed = ["Everyone", "Contacts", "Nobody"];

    if (profileVisibility !== undefined) {
      if (!allowed.includes(profileVisibility)) {
        return res.status(400).json({ message: "Invalid profileVisibility value" });
      }
      user.privacySettings.profileVisibility = profileVisibility;
    }

    if (hideContactInfo !== undefined) {
      user.privacySettings.hideContactInfo = Boolean(hideContactInfo);
    }

    if (whoCanContact !== undefined) {
      if (!allowed.includes(whoCanContact)) {
        return res.status(400).json({ message: "Invalid whoCanContact value" });
      }
      user.privacySettings.whoCanContact = whoCanContact;
    }

    await user.save();

    res.json({
      message: "Privacy settings updated successfully",
      privacySettings: user.privacySettings,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ================== BLOCK USERS ==================

// POST /privacy/block/:userId
// بيعمل block لـ user معين
router.post("/block/:userId", authMiddleware, async (req, res) => {
  try {
    const targetId = req.params.userId;

    if (targetId === req.user.userId) {
      return res.status(400).json({ message: "You cannot block yourself" });
    }

    const target = await User.findById(targetId);
    if (!target) return res.status(404).json({ message: "User not found" });

    const user = await User.findById(req.user.userId);

    if (user.blockedUsers.includes(targetId)) {
      return res.status(400).json({ message: "User already blocked" });
    }

    user.blockedUsers.push(targetId);
    await user.save();

    res.json({ message: "User blocked successfully" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// DELETE /privacy/block/:userId
// بيعمل unblock
router.delete("/block/:userId", authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    user.blockedUsers = user.blockedUsers.filter(
      (id) => id.toString() !== req.params.userId
    );
    await user.save();

    res.json({ message: "User unblocked successfully" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /privacy/blocked-users
// بيرجع قايمة المحظورين
router.get("/blocked-users", authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId)
      .populate("blockedUsers", "name email role");
    if (!user) return res.status(404).json({ message: "User not found" });

    res.json({ blockedUsers: user.blockedUsers });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ================== REPORT A PROBLEM ==================

// POST /privacy/report
// بيبعت report عن مشكلة أو مستخدم مشبوه
router.post("/report", authMiddleware, async (req, res) => {
  try {
    const { reason, description, factoryId, orderId, factoryName, screenshotUrl } = req.body;

    if (!reason) return res.status(400).json({ message: "Reason is required" });

    const reporter = await User.findById(req.user.userId).select("name email");
    if (!reporter) return res.status(404).json({ message: "User not found" });

    await Report.create({
      reporterName:  reporter.name,
      reporterEmail: reporter.email,
      reporterId:    req.user.userId,
      factoryId:     factoryId || null,
      factoryName:   factoryName || "",
      orderId:       orderId || null,
      reason,
      description:   description || "",
      screenshotUrl: screenshotUrl || "",
    });

    await Notification.create({
      user: req.user.userId,
      title: 'Report Received',
      message: `Your report regarding "${reason}" has been received. We'll review it and get back to you within 48 hours.`,
      type: 'report',
    });

    res.json({ message: "Report submitted successfully" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});
router.post("/upload-screenshot", authMiddleware, upload.single("file"), async (req, res) => {
  try {
    const result = await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        { folder: "reports" },
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        }
      );
      stream.end(req.file.buffer);
    });
    res.json({ url: result.secure_url });
  } catch (err) {
    res.status(500).json({ message: "Upload failed" });
  }
 
});
// GET /privacy/admin/reports ← للـ Admin Dashboard
router.get("/admin/reports", authMiddleware, async (req, res) => {
  try {
    const reports = await Report.find()
      .sort({ createdAt: -1 });
    res.json({ reports });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PATCH /privacy/admin/reports/:id ← mark as resolved
router.patch("/admin/reports/:id", authMiddleware, async (req, res) => {
  try {
    const { status } = req.body;
    await Report.findByIdAndUpdate(req.params.id, { status });
    res.json({ message: "Report updated" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});



module.exports = router;