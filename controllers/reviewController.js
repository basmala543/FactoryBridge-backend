const Review = require('../models/review');

// إضافة مراجعة جديدة
exports.addReview = async (req, res) => {
  try {
    const { factoryId, rating, comment, userName } = req.body;
    const newReview = new Review({
      factory: factoryId,
      user: req.user.id, // نأخذه من الـ authMiddleware
      userName,
      rating,
      comment
    });
    await newReview.save();
    res.status(201).json(newReview);
  } catch (error) {
    res.status(500).json({ message: "Error adding review", error });
  }
};

// جلب مراجعات مصنع معين
exports.getFactoryReviews = async (req, res) => {
  try {
    const reviews = await Review.find({ factory: req.params.factoryId }).sort({ createdAt: -1 });
    res.json(reviews);
  } catch (error) {
    res.status(500).json({ message: "Error fetching reviews", error });
  }
};