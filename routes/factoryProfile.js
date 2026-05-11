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

      // Get media URLs from uploaded files
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
      });

      await newProfile.save();

      res.json({
        message: "Factory profile created successfully",
        data: newProfile,
      });
    } catch (err) {
      res.status(500).json({
        message: err.message,
      });
    }
  },
);

// ================== GET FACTORY PROFILE ==================
router.get("/profile", authMiddleware, async (req, res) => {
  try {
    const factoryProfile = await FactoryProfile.findOne({
      userId: req.user.userId,
    });

    if (!factoryProfile) {
      return res.status(404).json({
        message: "Factory profile not found",
      });
    }

    res.json({
      message: "Factory profile fetched successfully",
      data: factoryProfile,
    });
  } catch (err) {
    res.status(500).json({
      message: err.message,
    });
  }
});

// ================== UPDATE FACTORY PROFILE ==================
router.put(
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

      // Build update data
      const updateData = {
        factoryName,
        description,
        location,
        productCategories,
        productionCapacity,
        certifications,
        machinery,
      };

      // If new media files are uploaded, add them
      if (req.files && req.files.length > 0) {
        updateData.media = req.files.map((file) => file.path);
      }

      const updatedFactoryProfile = await FactoryProfile.findOneAndUpdate(
        {
          userId: req.user.userId,
        },
        updateData,
        {
          new: true,
        },
      );

      if (!updatedFactoryProfile) {
        return res.status(404).json({
          message: "Factory profile not found",
        });
      }

      res.json({
        message: "Factory profile updated successfully",
        data: updatedFactoryProfile,
      });
    } catch (err) {
      res.status(500).json({
        message: err.message,
      });
    }
  },
);

// search bar in brand home

router.get('/search-factories', async (req, res) => {
    try {
        const searchTerm = req.query.q; // الكلمة اللي المستخدم كتبها في السيرش
        
        const results = await FactoryProfile.find({
            $or: [
                { factoryName: { $regex: searchTerm, $options: 'i' } }, // بحث بالاسم
                { industry: { $regex: searchTerm, $options: 'i' } }    // بحث بمجال الصناعة
            ]
        });
        
        res.status(200).json(results);
    } catch (error) {
        res.status(500).json({ message: "خطأ في عملية البحث", error });
    }
});

module.exports = router;



