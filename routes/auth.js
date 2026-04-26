const express = require("express");
const router = express.Router();
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const User = require("../models/users");
const authMiddleware = require("../middleware/authMiddleware");

// ================== SIGNUP ==================
router.post("/signup", async (req, res) => {
  try {
    const {
      UserName,
      Email,
      Password,
      ConfirmPassword,
      Role
    } = req.body;

    // تأكيد الباسورد
    if (Password !== ConfirmPassword) {
      return res.status(400).json({
        message: "Passwords do not match",
      });
    }

    // التحقق من الـ Role
    if (!["factory", "brand"].includes(Role)) {
      return res.status(400).json({
        message: "Invalid role",
      });
    }

    const existingUser = await User.findOne({
      email: Email,
    });

    if (existingUser) {
      return res.status(400).json({
        message: "Email already exists",
      });
    }

    const hashedPassword = await bcrypt.hash(Password, 10);

    const newUser = new User({
      name: UserName,
      email: Email,
      password: hashedPassword,
      role: Role,
    });

    await newUser.save();

    res.json({
      message: "User created successfully",
    });

  } catch (err) {
    res.status(500).json({
      message: err.message,
    });
  }
});
// ================== LOGIN ==================
router.post("/login", async (req, res) => {
  try {
    const { Email, Password } = req.body;

    const user = await User.findOne({
      email: Email,
    });

    if (!user) {
      return res.status(400).json({
        message: "User not found",
      });
    }

    const isMatch = await bcrypt.compare(Password, user.password);

    if (!isMatch) {
      return res.status(400).json({
        message: "Wrong password",
      });
    }

   const token = jwt.sign(
  {
    userId: user._id,
    email: user.email,
    role: user.role,
  },
  "secretkey",
  {
    expiresIn: "1h",
  },
);

   res.json({
  message: "Login success",
  token: token,
  role: user.role,
});
  } catch (err) {
    res.status(500).json({
      message: err.message,
    });
  }
});

router.get("/profile", authMiddleware, (req, res) => {
  res.json({
    message: "User authenticated",
    user: req.user,
  });
});

// ================== FORGOT PASSWORD + SEND OTP ==================
router.post("/forgot-password", async (req, res) => {
  try {
    const { Email } = req.body;

    const user = await User.findOne({
      email: Email,
    });

    if (!user) {
      return res.status(400).json({
        message: "User not found",
      });
    }

    // توليد OTP من 6 أرقام
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // صلاحية 10 دقائق
    user.otp = otp;
    user.otpExpires = new Date(Date.now() + 10 * 60 * 1000);

    await user.save();

    res.json({
      message: "OTP sent successfully",
      otp: otp,
    });
  } catch (err) {
    res.status(500).json({
      message: err.message,
    });
  }
});


// ================== VERIFY OTP + RESET PASSWORD ==================
router.post("/reset-password", async (req, res) => {
  try {
    const {
      Email,
      OTP,
      NewPassword,
      ConfirmPassword
    } = req.body;

    if (NewPassword !== ConfirmPassword) {
      return res.status(400).json({
        message: "Passwords do not match"
      });
    }

    const user = await User.findOne({
      email: Email
    });

    if (!user) {
      return res.status(400).json({
        message: "User not found"
      });
    }

    if (user.otp !== OTP) {
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

module.exports = router;
