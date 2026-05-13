const Review = require('../models/review');

// إضافة مراجعة جديدة
exports.getFactoryReviews = async (req, res) => {
  try {
    const reviews = await Review.find({ 
      factory: req.params.factoryId 
    }).sort({ createdAt: -1 });
    
    // ✅ غير ده:
    res.json({ data: reviews }); // عشان Flutter تتوقع { data: [...] }
  } catch (error) {
    res.status(500).json({ message: "Error fetching reviews", error });
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