const express = require('express');
const router = express.Router();
const reviewController = require('../controllers/reviewController');
const authMiddleware = require('../middleware/authMiddleware');

// GET reviews for a factory
router.get('/:factoryId', reviewController.getFactoryReviews);

// POST new review (requires auth)
router.post('/', authMiddleware, reviewController.addReview);

// PUT update review (requires auth)
router.put('/:id', authMiddleware, reviewController.updateReview);
// DELETE review (requires auth)
router.delete('/:id', authMiddleware, reviewController.deleteReview);
module.exports = router;