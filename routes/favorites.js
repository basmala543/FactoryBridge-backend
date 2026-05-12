const express = require("express");
const router = express.Router();
const Favorite = require("../models/favorites");
const authMiddleware = require("../middleware/authMiddleware");

// GET /api/user/favorites - جيب favorites الـ user
router.get("/", authMiddleware, async (req, res) => {
  try {
    const favorites = await Favorite.find({ userId: req.user.id }).populate(
      "factoryId"
    );

    const data = favorites
      .filter((f) => f.factoryId) // شيل أي factory اتحذفت
      .map((f) => {
        const factory = f.factoryId;
        return {
          _id: factory._id,
          id: factory._id,
          name: factory.name,
          factoryName: factory.name,
          description: factory.description || "",
          imageUrl: factory.imageUrl || factory.image_url || "",
          rating: factory.rating || 0,
          isBestSeller: factory.isBestSeller || false,
          isFavorite: true,
        };
      });

    res.json(data);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

// POST /api/user/favorites - أضف favorite
router.post("/", authMiddleware, async (req, res) => {
  try {
    const { factoryId } = req.body;

    if (!factoryId) {
      return res.status(400).json({ message: "factoryId is required" });
    }

    // تأكد مش موجود أصلاً
    const existing = await Favorite.findOne({
      userId: req.user.id,
      factoryId,
    });

    if (existing) {
      return res.status(200).json({ message: "Already in favorites" });
    }

    const favorite = new Favorite({ userId: req.user.id, factoryId });
    await favorite.save();

    res.status(201).json({ message: "Added to favorites" });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

// DELETE /api/user/favorites/:factoryId - شيل favorite
router.delete("/:factoryId", authMiddleware, async (req, res) => {
  try {
    await Favorite.findOneAndDelete({
      userId: req.user.id,
      factoryId: req.params.factoryId,
    });

    res.json({ message: "Removed from favorites" });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;