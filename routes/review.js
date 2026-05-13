const express = require('express');
const router = express.Router();
const reviewController = require('../controllers/reviewController');
const auth = require('../middleware/authMiddleware'); // لحماية إضافة المراجعات

// جلب مراجعات مصنع (متاح للجميع)
router.get('/:factoryId', reviewController.getFactoryReviews);

// إضافة مراجعة (للمسجلين فقط)
router.post('/add', auth, reviewController.addReview);

module.exports = router;