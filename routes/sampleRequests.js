const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/sampleRequestController');
const auth = require('../middleware/authMiddleware');

router.post('/', auth, ctrl.createRequest);
router.get('/factory', auth, ctrl.getFactoryRequests);
router.put('/:id/status', auth, ctrl.updateStatus);

module.exports = router;