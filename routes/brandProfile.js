const express = require("express");
const router = express.Router();
const BrandProfile = require("../models/brandProfile");
const authMiddleware = require("../middleware/authMiddleware");
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');

// 1. إعدادات Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUD_NAME,
  api_key: process.env.API_KEY, 
  api_secret: process.env.API_SECRET 
});

// 2. إعداد مخزن الصور
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'brand_logos',
    allowed_formats: ['jpg', 'png', 'jpeg'],
  },
});

const upload = multer({ storage: storage });

// ================== CREATE BRAND PROFILE ==================
// أضفنا upload.single('logo') هنا
router.post("/profile", authMiddleware, upload.single('logo'), async (req, res) => {
  try {
    const { brandName, description, location, productCategories, industry, contactInformation } = req.body;

    // التحقق: إذا رفع المستخدم صورة، نأخذ الرابط من Cloudinary، وإلا نأخذ ما أرسله في الـ body
    const logoUrl = req.file ? req.file.path : req.body.logo;

    const newBrandProfile = new BrandProfile({
      userId: req.user.userId,
      brandName,
      description,
      location,
      productCategories,
      industry,
      contactInformation,
      logo: logoUrl // تخزين رابط الصورة
    });

    await newBrandProfile.save();
    res.json({ message: "Brand profile created successfully", data: newBrandProfile });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ================== GET BRAND PROFILE ==================
router.get("/profile", authMiddleware, async (req, res) => {
  try {
    const brandProfile = await BrandProfile.findOne({ userId: req.user.userId });
    if (!brandProfile) return res.status(404).json({ message: "Brand profile not found" });
    res.json({ message: "Brand profile fetched successfully", data: brandProfile });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ================== UPDATE BRAND PROFILE ==================
// أضفنا upload.single('logo') هنا أيضاً
router.put("/profile", authMiddleware, upload.single('logo'), async (req, res) => {
  try {
    const updateData = { ...req.body };

    // إذا تم رفع ملف جديد، نحدث رابط الصورة
    if (req.file) {
      updateData.logo = req.file.path;
    }

    const updatedBrandProfile = await BrandProfile.findOneAndUpdate(
      { userId: req.user.userId },
      updateData,
      { new: true }
    );

    if (!updatedBrandProfile) return res.status(404).json({ message: "Brand profile not found" });
    res.json({ message: "Brand profile updated successfully", data: updatedBrandProfile });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;