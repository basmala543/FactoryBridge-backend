const express = require("express");
const router = express.Router();
const FactoryProfile = require("../models/factoryProfile");
const authMiddleware = require("../middleware/authMiddleware");
const {
  uploadFactoryMedia,
  handleUploadError,
} = require("../middleware/uploads/uploadMiddleware");

// ================== CREATE FACTORY PROFILE ==================
router.post(
  "/profile",
  authMiddleware,
  uploadFactoryMedia.array("media", 10),
  handleUploadError,
  async (req, res) => {
    try {
      const {
        factoryName,
        description,
        location,
        productCategories,
        productionCapacity,
        certifications,
        machinery,
      } = req.body;

      const mediaUrls = req.files ? req.files.map((file) => file.path) : [];

      const newProfile = new FactoryProfile({
        userId: req.user.userId,
        factoryName,
        description,
        location,
        productCategories,
        productionCapacity,
        certifications,
        machinery,
        media: mediaUrls,
        factoryProducts: req.body.factoryProducts
          ? typeof req.body.factoryProducts === 'string'
            ? JSON.parse(req.body.factoryProducts)
            : req.body.factoryProducts
          : [],
      });

      await newProfile.save();
      res.json({ message: "Factory profile created successfully", data: newProfile });
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  },
);

// ================== GET FACTORY PROFILE ==================
router.get("/profile", authMiddleware, async (req, res) => {
  try {
    const factoryProfile = await FactoryProfile.findOne({ userId: req.user.userId });
    if (!factoryProfile) {
      return res.status(404).json({ message: "Factory profile not found" });
    }
    res.json({ message: "Factory profile fetched successfully", data: factoryProfile });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ================== UPDATE FACTORY PROFILE ==================
// ================== UPDATE FACTORY PROFILE ==================
router.put(
  "/profile",
  authMiddleware,
  // التعديل هنا: هنخليه يستقبل حقل للصور وحقل مخصوص للوجو
  uploadFactoryMedia.fields([
    { name: 'media', maxCount: 10 },
    { name: 'logo', maxCount: 1 }
  ]),
  handleUploadError,
  async (req, res) => {
    try {
      const {
        factoryName,
        description,
        // ... باقي الحقول اللي عندك ...
      } = req.body;

      const updateData = {};
      // ... الكود بتاعك زي ما هو لتحديث النصوص ...
      if (factoryName) updateData.factoryName = factoryName;
      if (description) updateData.description = description;
      // ... الخ

      // --- الجزء الجديد الخاص باللوجو ---
      if (req.files && req.files['logo']) {
        updateData.logo = req.files['logo'][0].path; // حفظ رابط اللوجو من كلوديناري
      }

      // --- تحديث الصور العامة (Media) ---
      if (req.files && req.files['media']) {
        updateData.media = req.files['media'].map((file) => file.path);
      }

      const updatedFactoryProfile = await FactoryProfile.findOneAndUpdate(
        { userId: req.user.userId },
        { $set: updateData },
        { new: true, runValidators: true },
      );

      if (!updatedFactoryProfile) {
        return res.status(404).json({ message: "Factory profile not found" });
      }

      res.json({ message: "Factory profile updated successfully", data: updatedFactoryProfile });
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  },
);

// ================== SEARCH ==================
router.get('/search-factories', async (req, res) => {
  try {
    const searchTerm = req.query.q;
    const results = await FactoryProfile.find({
      $or: [
        { factoryName: { $regex: searchTerm, $options: 'i' } },
        { productCategories: { $regex: searchTerm, $options: 'i' } },
        { description: { $regex: searchTerm, $options: 'i' } },
        { location: { $regex: searchTerm, $options: 'i' } },
      ]
    });
    res.status(200).json(results);
  } catch (error) {
    res.status(500).json({ message: "خطأ في عملية البحث", error });
  }
});

// ================== BY CATEGORY ==================
router.get('/by-category', async (req, res) => {
  try {
    const category = req.query.category;
    if (!category) return res.status(400).json({ message: "Category is required" });
    const results = await FactoryProfile.find({
      productCategories: { $regex: category, $options: 'i' }
    });
    res.status(200).json(results);
  } catch (error) {
    res.status(500).json({ message: "خطأ في جلب المصانع", error });
  }
});

// ================== RECOMMENDED ==================
router.get('/recommended', async (req, res) => {
  try {
    const factories = await FactoryProfile.find().sort({ createdAt: -1 }).limit(10);
    res.status(200).json(factories);
  } catch (error) {
    res.status(500).json({ message: "Error", error: error.message });
  }
});

// ================== TOP DEALS ==================
router.get('/top-deals', async (req, res) => {
  try {
    const factories = await FactoryProfile.find({ isTopDeal: true }).limit(10);
    res.status(200).json(factories);
  } catch (error) {
    res.status(500).json({ message: "Error", error: error.message });
  }
});

// ================== FACTORY PRODUCTS ==================
router.get('/:id/products', async (req, res) => {
  try {
    const factory = await FactoryProfile.findById(req.params.id);
    if (!factory) return res.status(404).json({ message: "Factory not found" });
    res.json({ data: factory.factoryProducts || [] });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
