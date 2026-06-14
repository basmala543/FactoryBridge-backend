const Review = require('../models/review');
const Notification = require('../models/Notification');

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
      user: factoryId, // factory owner will receive the notification
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

// fetch all reviews for a specific factory
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

// edit a review
exports.updateReview = async (req, res) => {
  try {
    const { rating, comment } = req.body;
    const review = await Review.findById(req.params.id);

    if (!review) {
      return res.status(404).json({ message: "Review not found" });
    }

    // make sure the user is the owner of the review
    if (review.user !== req.user.userId) {
      return res.status(403).json({ message: "Not authorized" });
    }

    review.rating = rating;
    review.comment = comment;
    await review.save();

    res.json({ data: review });
  } catch (error) {
    res.status(500).json({ message: "Error updating review", error });
  }
};

// delete a review
exports.deleteReview = async (req, res) => {
  try {
    const review = await Review.findById(req.params.id);

    if (!review) {
      return res.status(404).json({ message: "Review not found" });
    }

    // make sure the user is the owner of the review
    if (review.user !== req.user.userId) {
      return res.status(403).json({ message: "Not authorized" });
    }

    await Review.findByIdAndDelete(req.params.id);
    res.json({ message: "Review deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Error deleting review", error });
  }
};