const Review = require('../models/review');

// إضافة مراجعة جديدة
exports.addReview = async (req, res) => {
  try {
    const { factoryId, rating, comment, userName } = req.body;
    const newReview = new Review({
      factory: factoryId,
      user: req.user.id,
      userName,
      rating,
      comment
    });
    await newReview.save();
    res.status(201).json({ data: newReview });
  } catch (error) {
    res.status(500).json({ message: "Error adding review", error });
  }
};

// جلب مراجعات مصنع معين
exports.getFactoryReviews = async (req, res) => {
  try {
    const reviews = await Review.find({ 
      factory: req.params.factoryId 
    }).sort({ createdAt: -1 });
    
    res.json({ data: reviews });
  } catch (error) {
    res.status(500).json({ message: "Error fetching reviews", error });
  }
};