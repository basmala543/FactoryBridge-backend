const express = require("express");
const router = express.Router();

const BrandProfile = require("../models/brandProfile");
const authMiddleware = require("../middleware/authMiddleware");

// ================== CREATE BRAND PROFILE ==================
router.post("/profile", authMiddleware, async (req, res) => {
  try {
    const {
      brandName,
      description,
      location,
      productCategories,
      industry,
      contactInformation,
      logo
    } = req.body;

    const newBrandProfile = new BrandProfile({
      userId: req.user.userId,
      brandName,
      description,
      location,
      productCategories,
      industry,
      contactInformation,
      logo
    });

    await newBrandProfile.save();

    res.json({
      message: "Brand profile created successfully",
      data: newBrandProfile
    });

  } catch (err) {
    res.status(500).json({
      message: err.message
    });
  }
});







// ================== CREATE BRAND PROFILE ==================
router.post("/profile", authMiddleware, async (req, res) => {
  try {
    const {
      brandName,
      description,
      location,
      productCategories,
      industry,
      contactInformation,
      logo
    } = req.body;

    const newBrandProfile = new BrandProfile({
      userId: req.user.userId,
      brandName,
      description,
      location,
      productCategories,
      industry,
      contactInformation,
      logo
    });

    await newBrandProfile.save();

    res.json({
      message: "Brand profile created successfully",
      data: newBrandProfile
    });

  } catch (err) {
    res.status(500).json({
      message: err.message
    });
  }
});


// ================== GET BRAND PROFILE ==================
router.get("/profile", authMiddleware, async (req, res) => {
  try {
    const brandProfile = await BrandProfile.findOne({
      userId: req.user.userId
    });

    if (!brandProfile) {
      return res.status(404).json({
        message: "Brand profile not found"
      });
    }

    res.json({
      message: "Brand profile fetched successfully",
      data: brandProfile
    });

  } catch (err) {
    res.status(500).json({
      message: err.message
    });
  }
});




// ================== UPDATE BRAND PROFILE ==================
router.put("/profile", authMiddleware, async (req, res) => {
  try {
    const {
      brandName,
      description,
      location,
      productCategories,
      industry,
      contactInformation,
      logo
    } = req.body;

    const updatedBrandProfile = await BrandProfile.findOneAndUpdate(
      {
        userId: req.user.userId
      },
      {
        brandName,
        description,
        location,
        productCategories,
        industry,
        contactInformation,
        logo
      },
      {
        new: true
      }
    );

    if (!updatedBrandProfile) {
      return res.status(404).json({
        message: "Brand profile not found"
      });
    }

    res.json({
      message: "Brand profile updated successfully",
      data: updatedBrandProfile
    });

  } catch (err) {
    res.status(500).json({
      message: err.message
    });
  }
});


module.exports = router;