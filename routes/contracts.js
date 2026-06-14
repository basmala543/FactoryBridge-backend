const express = require('express');
const router = express.Router();
const { createContract, getContractByOrder, approveContract, rejectContract, notifyBrand } = require('../controllers/contractController');

// generate a new contract
router.get('/order/:orderId', getContractByOrder);

// approve the Contract
router.put('/:id/approve', approveContract);

// reject the Contract
router.put('/:id/reject', rejectContract);

router.post('/:id/notify-brand', notifyBrand);

module.exports = router;