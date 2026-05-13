const express = require('express');
const router = express.Router();
const reviewController = require('../controllers/reviewController');
const authMiddleware = require('../middleware/authMiddleware');

// GET reviews for a factory
router.get('/:factoryId', reviewController.getFactoryReviews);

// POST new review (requires auth)
router.post('/', authMiddleware, reviewController.addReview);

module.exports = router;