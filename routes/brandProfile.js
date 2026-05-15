const express = require("express");
const router = express.Router();
const BrandProfile = require("../models/brandProfile");
const authMiddleware = require("../middleware/authMiddleware");
const {
  uploadBrandLogo,
  handleUploadError,
} = require("../middleware/uploads/uploadMiddleware");

// ================== CREATE BRAND PROFILE ==================
router.post(
  "/profile",
  authMiddleware,
  uploadBrandLogo.single("logo"),
  handleUploadError,
  async (req, res) => {
    try {
      const {
        brandName,
        description,
        location,
        productCategories,
        industry,
        contactInformation,
      } = req.body;

      const logoUrl = req.file ? req.file.path : req.body.logo;

      const newBrandProfile = new BrandProfile({
        userId: req.user.userId,
        brandName,
        description,
        location,
        productCategories,
        industry,
        contactInformation,
        logo: logoUrl,
      });

      await newBrandProfile.save();
      res.json({
        message: "Brand profile created successfully",
        data: newBrandProfile,
      });
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  },
);

// ================== GET BRAND PROFILE ==================
router.get("/profile", authMiddleware, async (req, res) => {
  try {
    const brandProfile = await BrandProfile.findOne({
      userId: req.user.userId,
    });
    if (!brandProfile)
      return res.status(404).json({ message: "Brand profile not found" });
    res.json({
      message: "Brand profile fetched successfully",
      data: brandProfile,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ================== UPDATE BRAND PROFILE ==================
router.put(
  "/profile",
  authMiddleware,
  uploadBrandLogo.single("logo"),
  handleUploadError,
  async (req, res) => {
    try {
      const {
        brandName,
        description,
        location,
        productCategories,
        industry,
        contactInformation,
      } = req.body;

      const updateData = {};
      if (brandName) updateData.brandName = brandName;
      if (description) updateData.description = description;
      if (location) updateData.location = location;
      if (productCategories) updateData.productCategories = productCategories;
      if (industry) updateData.industry = industry;
      if (contactInformation) updateData.contactInformation = contactInformation;
      if (req.file) updateData.logo = req.file.path;

      const updatedBrandProfile = await BrandProfile.findOneAndUpdate(
        { userId: req.user.userId },
        { $set: updateData },
        { new: true, runValidators: true },
      );

      if (!updatedBrandProfile)
        return res.status(404).json({ message: "Brand profile not found" });

      res.json({
        message: "Brand profile updated successfully",
        data: updatedBrandProfile,
      });
    } catch (err) {
      console.error("Update error:", err.message, err.stack);
      res.status(500).json({ message: err.message });
    }
  },
);

module.exports = router;
