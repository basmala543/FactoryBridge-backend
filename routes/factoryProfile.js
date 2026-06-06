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
          ? typeof req.body.factoryProducts === "string"
            ? JSON.parse(req.body.factoryProducts)
            : req.body.factoryProducts
          : [],
      });

      await newProfile.save();
      res.json({
        message: "Factory profile created successfully",
        data: newProfile,
      });
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  }
);

// ================== GET FACTORY PROFILE ==================
router.get("/profile", authMiddleware, async (req, res) => {
  try {
    const factoryProfile = await FactoryProfile.findOne({
      userId: req.user.userId,
    });
    if (!factoryProfile) {
      return res.status(404).json({ message: "Factory profile not found" });
    }
    res.json({
      message: "Factory profile fetched successfully",
      data: factoryProfile,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ================== UPDATE FACTORY PROFILE ==================
router.put(
  "/profile",
  authMiddleware,
  uploadFactoryMedia.fields([
    { name: "media", maxCount: 10 },
    { name: "logo", maxCount: 1 },
    { name: "productImages", maxCount: 20 },
  ]),
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
        factoryProducts,
        existingMediaUrls,
      } = req.body;

      const updateData = {};

      if (factoryName) updateData.factoryName = factoryName;
      if (description) updateData.description = description;
      if (location) updateData.location = location;
      if (productCategories) updateData.productCategories = productCategories;
      if (productionCapacity) updateData.productionCapacity = productionCapacity;
      if (certifications) updateData.certifications = certifications;
      if (machinery) updateData.machinery = machinery;

      if (factoryProducts) {
        let products =
          typeof factoryProducts === "string"
            ? JSON.parse(factoryProducts)
            : factoryProducts;

        if (req.files && req.files["productImages"]) {
          req.files["productImages"].forEach((file, index) => {
            if (products[index] && file.size > 0) {
              products[index].imageUrl = file.path;
            }
          });
        }

        updateData.factoryProducts = products;
      }

      if (req.files && req.files["logo"]) {
        updateData.logo = req.files["logo"][0].path;
      }

      if (req.files && req.files["media"] && req.files["media"].length > 0) {
        const newMediaUrls = req.files["media"].map((file) => file.path);
        let keptUrls = [];
        if (existingMediaUrls) {
          keptUrls = Array.isArray(existingMediaUrls)
            ? existingMediaUrls
            : JSON.parse(existingMediaUrls);
        }
        updateData.media = [...keptUrls, ...newMediaUrls];
      } else if (existingMediaUrls) {
        updateData.media = Array.isArray(existingMediaUrls)
          ? existingMediaUrls
          : JSON.parse(existingMediaUrls);
      }

      const updatedFactoryProfile = await FactoryProfile.findOneAndUpdate(
        { userId: req.user.userId },
        { $set: updateData },
        { new: true, runValidators: true }
      );

      if (!updatedFactoryProfile) {
        return res.status(404).json({ message: "Factory profile not found" });
      }

      res.json({
        message: "Factory profile updated successfully",
        data: updatedFactoryProfile,
      });
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  }
);

// ================== SEARCH ==================
router.get("/search-factories", async (req, res) => {
  try {
    const searchTerm = req.query.q;
    const results = await FactoryProfile.find({
      $or: [
        { factoryName: { $regex: searchTerm, $options: "i" } },
        { productCategories: { $regex: searchTerm, $options: "i" } },
        { description: { $regex: searchTerm, $options: "i" } },
        { location: { $regex: searchTerm, $options: "i" } },
      ],
    });
    res.status(200).json(results);
  } catch (error) {
    res.status(500).json({ message: "خطأ في عملية البحث", error });
  }
});

// ================== BY CATEGORY ==================
router.get("/by-category", async (req, res) => {
  try {
    const category = req.query.category;
    if (!category)
      return res.status(400).json({ message: "Category is required" });
    const results = await FactoryProfile.find({
      productCategories: { $regex: category, $options: "i" },
    });
    res.status(200).json(results);
  } catch (error) {
    res.status(500).json({ message: "خطأ في جلب المصانع", error });
  }
});

// ================== RECOMMENDED ==================
router.get("/recommended", async (req, res) => {
  try {
    const factories = await FactoryProfile.find()
      .sort({ createdAt: -1 })
      .limit(10);
    res.status(200).json(factories);
  } catch (error) {
    res.status(500).json({ message: "Error", error: error.message });
  }
});

// ================== TOP DEALS ==================
router.get("/top-deals", async (req, res) => {
  try {
    const factories = await FactoryProfile.find({ isTopDeal: true }).limit(10);
    res.status(200).json(factories);
  } catch (error) {
    res.status(500).json({ message: "Error", error: error.message });
  }
});

// ================== AI RECOMMENDED (Gemini) ==================
// ⚠️ لازم يكون قبل /:id عشان Express ميفسرهوش كـ ID
router.get("/ai-recommended", async (req, res) => {
  try {
    const { category } = req.query;

    const factories = await FactoryProfile.find().limit(30);

    if (factories.length === 0) {
      return res.status(200).json([]);
    }

    // لو مفيش category ارجع المصانع العادية
    if (!category || category.trim() === "") {
      return res.status(200).json(factories.slice(0, 10));
    }

    const factoriesData = factories.map((f) => ({
      id: f._id.toString(),
      name: f.factoryName,
      categories: f.productCategories,
      description: f.description,
      location: f.location,
    }));

    const prompt = `You are a factory recommendation engine for a fashion sourcing platform.

A brand with product category "${category}" is looking for suitable factories.

Here are the available factories:
${JSON.stringify(factoriesData, null, 2)}

Return ONLY a JSON array of factory IDs sorted by relevance to the brand's category "${category}".
The most relevant factories should come first.
Return maximum 10 factories.
Return ONLY valid JSON array like: ["id1", "id2", "id3"]
No explanation, no markdown, just the JSON array.`;

    // ── Gemini API ──
    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
        }),
      }
    );

    const geminiData = await geminiRes.json();
    const aiText =
      geminiData.candidates?.[0]?.content?.parts?.[0]?.text || "[]";

    // نظف الـ response من الـ markdown
    const cleanText = aiText.replace(/```json|```/g, "").trim();
console.log("🤖 Gemini response:", cleanText);
console.log("📦 Sorted IDs:", sortedIds);

    let sortedIds = [];
    try {
      sortedIds = JSON.parse(cleanText);
    } catch {
      return res.status(200).json(factories.slice(0, 10));
    }

    const factoryMap = {};
    factories.forEach((f) => {
      factoryMap[f._id.toString()] = f;
    });

    const sortedFactories = sortedIds
      .filter((id) => factoryMap[id])
      .map((id) => factoryMap[id]);

    // لو الـ AI مرجعش نتايج كافية، أضيف من الباقي
   // رجع بس اللي الـ AI اختارهم
res.status(200).json(sortedFactories);
    res.status(200).json(sortedFactories);
  } catch (error) {
    console.error("AI recommendation error:", error);
    try {
      const fallback = await FactoryProfile.find().limit(10);
      res.status(200).json(fallback);
    } catch (e) {
      res.status(500).json({ message: "Error", error: error.message });
    }
  }
});

// ================== FACTORY PRODUCTS ==================
router.get("/:id/products", async (req, res) => {
  try {
    const factory = await FactoryProfile.findById(req.params.id);
    if (!factory)
      return res.status(404).json({ message: "Factory not found" });
    res.json({ data: factory.factoryProducts || [] });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ================== GET FACTORY BY ID ==================
router.get("/:id", async (req, res) => {
  try {
    const factory = await FactoryProfile.findById(req.params.id);
    if (!factory) {
      return res.status(404).json({ message: "Factory not found" });
    }
    res.json({
      message: "Factory fetched successfully",
      data: factory,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;