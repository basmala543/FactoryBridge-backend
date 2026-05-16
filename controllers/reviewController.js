const Review = require('../models/review');
const Notification = require('../models/Notification'); // ← ضيفي الـ import ده فوق

// إضافة مراجعة جديدة
exports.addReview = async (req, res) => {
  try {
    const { factoryId, rating, comment, userName } = req.body;
    const newReview = new Review({
      factory: factoryId,
user: req.user.userId,
      userName,
      rating,
      comment
    });
    await newReview.save();
  await Notification.create({
      user: factoryId, // الـ factory هي اللي هتستقبل الإشعار
      title: 'New Review',
      message: `${userName} left you a ${rating}-star review`,
      type: 'review',
      data: {
        reviewId: newReview._id,
        rating,
        comment,
        reviewerName: userName,
      },
    });

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