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
  ...Array.from({ length: 20 }, (_, i) => ({ 
    name: `productImage_${i}`, 
    maxCount: 1 
  })),
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

     // ← بعد (صح)
products = products.map((product, index) => {
  const fileKey = `productImage_${index}`;
  if (req.files && req.files[fileKey] && req.files[fileKey][0]) {
    product.imageUrl = req.files[fileKey][0].path;
  }
  return product;
});

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

// ================== BY CATEGORY ==================
router.get("/by-category", async (req, res) => {
  try {
    const category = req.query.category;
    if (!category)
      return res.status(400).json({ message: "Category is required" });
    const Review = require("../models/review");
    const results = await FactoryProfile.find({
      productCategories: { $regex: category, $options: "i" },
    });
    const resultsWithRating = await Promise.all(
      results.map(async (factory) => {
        const reviews = await Review.find({ factory: factory._id.toString() });
        const avgRating =
          reviews.length > 0
            ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
            : 0;
        return { ...factory.toObject(), rating: avgRating };
      })
    );
    res.status(200).json(resultsWithRating);
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
    const Review = require("../models/review");
    const { category } = req.query; // ← أضف ده

    // لو في category فلتر بيها، لو لأ جيب الكل
    const query = category && category.trim() !== ""
      ? { productCategories: { $regex: category, $options: "i" } }
      : {};

    const factories = await FactoryProfile.find(query); // ← استخدم query هنا

    const withRatings = await Promise.all(
      factories.map(async (f) => {
        const reviews = await Review.find({ factory: f._id.toString() });
        const avg =
          reviews.length > 0
            ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
            : 0;
        return { ...f.toObject(), rating: avg };
      })
    );

    const sorted = withRatings
      .sort((a, b) => b.rating - a.rating)
      .slice(0, 10);

    res.status(200).json(sorted);
  } catch (error) {
    res.status(500).json({ message: "Error", error: error.message });
  }
});

// ================== AI RECOMMENDED (Gemini) ==================
// ⚠️ لازم يكون قبل /:id
router.get("/ai-recommended", async (req, res) => {
  try {
    const { category } = req.query;

    // لو مفيش category → رجع الأعلى تقييم
    if (!category || category.trim() === "") {
      const Review = require("../models/review");
      const factories = await FactoryProfile.find();
      const withRatings = await Promise.all(
        factories.map(async (f) => {
          const reviews = await Review.find({ factory: f._id.toString() });
          const avg =
            reviews.length > 0
              ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
              : 0;
          return { ...f.toObject(), rating: avg };
        })
      );
      const sorted = withRatings
        .sort((a, b) => b.rating - a.rating)
        .slice(0, 10);
      return res.status(200).json(sorted);
    }

    // دور على مصانع من نفس الـ category
    const categoryFactories = await FactoryProfile.find({
      productCategories: { $regex: category, $options: "i" },
    }).limit(10);

    // لو مفيش مصانع من الـ category، رجع فاضي
    if (categoryFactories.length === 0) {
      return res.status(200).json([]);
    }

    // بعتهم للـ Gemini يرتبهم
    const factoriesData = categoryFactories.map((f) => ({
      id: f._id.toString(),
      name: f.factoryName,
      categories: f.productCategories,
      description: f.description,
    }));

    const prompt = `You are a factory recommendation engine.
A brand with category "${category}" needs factories.
Rank these factories by relevance:
${JSON.stringify(factoriesData, null, 2)}
Return ONLY a JSON array of IDs. Example: ["id1", "id2"]`;

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
    const cleanText = aiText.replace(/```json|```/g, "").trim();

    try {
      const sortedIds = JSON.parse(cleanText);
      const factoryMap = {};
      categoryFactories.forEach((f) => {
        factoryMap[f._id.toString()] = f;
      });
      const sorted = sortedIds
        .filter((id) => factoryMap[id])
        .map((id) => factoryMap[id]);

      return res.status(200).json(sorted.length > 0 ? sorted : categoryFactories);
    } catch {
      return res.status(200).json(categoryFactories);
    }
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

router.post("/offers", authMiddleware, async (req, res) => {
  try {
    const { title, discountPercent, promoCode, minimumOrder, description, expiryDate } = req.body;
    const expiry = expiryDate ? new Date(expiryDate) : null;
    const isActive = expiry ? expiry > new Date() : true;
    const profile = await FactoryProfile.findOneAndUpdate(
      { userId: req.user.userId },
      {
        $push: {
          offers: {
            title,
            discountPercent: Number(discountPercent), // ← التعديل هنا
            promoCode,   
            minimumOrder,
            description,
            expiryDate: expiry,
            isActive,
          }
        }
      },
      { new: true }
    );
    if (!profile) return res.status(404).json({ message: "Factory profile not found" });
    res.status(201).json({ message: "Offer added", data: profile.offers });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ================== GET MY OFFERS ==================
router.get("/offers", authMiddleware, async (req, res) => {
  try {
    const profile = await FactoryProfile.findOne({ userId: req.user.userId });
    if (!profile) return res.status(404).json({ message: "Factory profile not found" });

    const now = new Date();
    let hasExpiredUpdate = false;
    const offers = (profile.offers || []).map((offer) => {
      if (offer.isActive && offer.expiryDate && offer.expiryDate <= now) {
        offer.isActive = false;
        hasExpiredUpdate = true;
      }
      return offer;
    });

    if (hasExpiredUpdate) {
      await profile.save();
    }

    res.json({ data: offers });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ================== DELETE OFFER ==================
router.delete("/offers/:offerId", authMiddleware, async (req, res) => {
  try {
    const profile = await FactoryProfile.findOneAndUpdate(
      { userId: req.user.userId },
      { $pull: { offers: { _id: req.params.offerId } } },
      { new: true }
    );
    if (!profile) return res.status(404).json({ message: "Factory profile not found" });
    res.json({ message: "Offer deleted", data: profile.offers });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ================== UPDATE OFFER EXPIRY ==================
router.patch("/offers/:offerId", authMiddleware, async (req, res) => {
  try {
    const { expiryDate } = req.body;
    const profile = await FactoryProfile.findOne({ userId: req.user.userId });
    if (!profile) return res.status(404).json({ message: "Factory profile not found" });

    const offer = profile.offers.id(req.params.offerId);
    if (!offer) return res.status(404).json({ message: "Offer not found" });

    const expiry = expiryDate ? new Date(expiryDate) : null;
    offer.expiryDate = expiry;
    offer.isActive = expiry ? expiry > new Date() : true;

    await profile.save();
    res.json({ message: "Offer updated", data: profile.offers });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});


// ================== GET ALL ACTIVE OFFERS ==================
router.get("/all-offers", async (req, res) => {
  try {
    const factories = await FactoryProfile.find(
      { "offers.0": { $exists: true } }
    ).select("factoryName logo location media offers");

    const now = new Date();
    const filteredFactories = [];

    for (const factory of factories) {
      let hasExpiredUpdate = false;
      const activeOffers = (factory.offers || []).filter((offer) => {
        if (offer.isActive && offer.expiryDate && offer.expiryDate <= now) {
          offer.isActive = false;
          hasExpiredUpdate = true;
        }
        return offer.isActive && (!offer.expiryDate || offer.expiryDate > now);
      });

      if (hasExpiredUpdate) {
        await factory.save();
      }

      if (activeOffers.length > 0) {
        const plainFactory = factory.toObject();
        plainFactory.offers = activeOffers;
        filteredFactories.push(plainFactory);
      }
    }

    res.json({ data: filteredFactories });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ================== SEARCH FACTORIES (with ratings) ==================
router.get("/search-factories", async (req, res) => {
  try {
    const { q } = req.query;
    const Review = require("../models/review");

    // Build search query
    const searchQuery = q && q.trim() !== ""
      ? {
        $or: [
          { factoryName: { $regex: q, $options: "i" } },
          { productCategories: { $regex: q, $options: "i" } },
          { location: { $regex: q, $options: "i" } },
          { description: { $regex: q, $options: "i" } },
        ],
      }
      : {};

    const factories = await FactoryProfile.find(searchQuery).lean();

    // Enrich with ratings
    const withRatings = await Promise.all(
      factories.map(async (f) => {
        try {
          const reviews = await Review.find({ factory: f._id.toString() });
          const avgRating =
            reviews.length > 0
              ? reviews.reduce((sum, r) => sum + (r.rating || 0), 0) / reviews.length
              : 0;
          return {
            ...f,
            rating: Math.round(avgRating * 10) / 10, // Round to 1 decimal
            id: f._id.toString(),
          };
        } catch (err) {
          console.error(`Error calculating rating for factory ${f._id}:`, err);
          return {
            ...f,
            rating: 0,
            id: f._id.toString(),
          };
        }
      })
    );

    res.status(200).json(withRatings);
  } catch (error) {
    console.error("Search factories error:", error);
    res.status(500).json({ message: "Error searching factories", error: error.message });
  }
});

// ================== GET FACTORY BY ID ==================
router.get("/:id", async (req, res) => {
  try {
    const factory = await FactoryProfile.findById(req.params.id);
    if (!factory) {
      return res.status(404).json({ message: "Factory not found" });
    }
    res.json({ message: "Factory fetched successfully", data: factory });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ================== ADMIN - GET ALL FACTORIES ==================
router.get("/admin/all", async (req, res) => {
  try {
    const factories = await FactoryProfile.find();
    res.json({ data: factories });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});
router.delete("/admin/:id", async (req, res) => {
  try {
    await FactoryProfile.findByIdAndDelete(req.params.id);
    res.json({ message: "Factory deleted" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;