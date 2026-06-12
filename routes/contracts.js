const express = require('express');
const router = express.Router();
const { createContract, getContractByOrder, approveContract, rejectContract, notifyBrand } = require('../controllers/contractController');

// جيب الـ Contract بتاع Order معين
router.get('/order/:orderId', getContractByOrder);

// وافق على الـ Contract
router.put('/:id/approve', approveContract);

// ارفض الـ Contract
router.put('/:id/reject', rejectContract);

router.post('/:id/notify-brand', notifyBrand);

module.exports = router;