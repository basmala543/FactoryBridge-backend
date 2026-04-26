const express = require("express");
const router = express.Router();
const FactoryProfile = require("../models/factoryProfile");
const authMiddleware = require("../middleware/authMiddleware");

router.post("/profile", authMiddleware, async (req, res) => {
  try {
    const {
      factoryName,
      description,
      location,
      productCategories,
      productionCapacity,
      certifications,
      machinery
    } = req.body;

    const newProfile = new FactoryProfile({
      userId: req.user.userId,
      factoryName,
      description,
      location,
      productCategories,
      productionCapacity,
      certifications,
      machinery
    });

    await newProfile.save();

    res.json({
      message: "Factory profile created successfully"
    });

  } catch (err) {
    res.status(500).json({
      message: err.message
    });
  }
});

// ================== GET FACTORY PROFILE ==================
router.get("/profile", authMiddleware, async (req, res) => {
  try {
    const factoryProfile = await FactoryProfile.findOne({
      userId: req.user.userId
    });

    if (!factoryProfile) {
      return res.status(404).json({
        message: "Factory profile not found"
      });
    }

    res.json({
      message: "Factory profile fetched successfully",
      data: factoryProfile
    });

  } catch (err) {
    res.status(500).json({
      message: err.message
    });
  }
});
// ================== GET FACTORY PROFILE ==================
router.get("/profile", authMiddleware, async (req, res) => {
  try {
    const factoryProfile = await FactoryProfile.findOne({
      userId: req.user.userId
    });

    if (!factoryProfile) {
      return res.status(404).json({
        message: "Factory profile not found"
      });
    }

    res.json({
      message: "Factory profile fetched successfully",
      data: factoryProfile
    });

  } catch (err) {
    res.status(500).json({
      message: err.message
    });
  }
});


// ================== UPDATE FACTORY PROFILE ==================
router.put("/profile", authMiddleware, async (req, res) => {
  try {
    const {
      factoryName,
      description,
      location,
      productCategories,
      productionCapacity,
      certifications,
      machinery,
      media
    } = req.body;

    const updatedFactoryProfile = await FactoryProfile.findOneAndUpdate(
      {
        userId: req.user.userId
      },
      {
        factoryName,
        description,
        location,
        productCategories,
        productionCapacity,
        certifications,
        machinery,
        media
      },
      {
        new: true
      }
    );

    if (!updatedFactoryProfile) {
      return res.status(404).json({
        message: "Factory profile not found"
      });
    }

    res.json({
      message: "Factory profile updated successfully",
      data: updatedFactoryProfile
    });

  } catch (err) {
    res.status(500).json({
      message: err.message
    });
  }
});













module.exports = router;