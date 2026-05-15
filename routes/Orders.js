const express = require('express');
const router = express.Router();
const Order = require('../models/Orders');
const FactoryProfile = require('../models/factoryProfile');
const Notification = require('../models/Notification');
const auth = require('../middleware/authMiddleware');

// البراند يعمل order
router.post('/create', auth, async (req, res) => {
  try {
    const { factoryId, productName, quantity, selectedSize, selectedColor, specifications, notes, productData } = req.body;

    const factoryProfile = await FactoryProfile.findById(factoryId);
    if (!factoryProfile) {
      return res.status(404).json({ message: "Factory not found" });
    }

    const order = await Order.create({
      brand: req.user.userId,
      factory: factoryId,
      productName,
      quantity,
      selectedSize,
      selectedColor,
      specifications,
      notes,
      productData,
    });

    // notification للـ factory
    await Notification.create({
      user: factoryProfile.userId,
      title: 'New Order Received!',
      message: `You received a new order for "${productName}" (${quantity} units).`,
      type: 'order',
    });

    res.status(201).json({ data: order });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// البراند يشوف orders بتاعته
router.get('/my-orders', auth, async (req, res) => {
  try {
    const orders = await Order.find({ brand: req.user.userId }).sort({ createdAt: -1 });
    res.json({ data: orders });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// تفاصيل order
router.get('/:id', auth, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: "Order not found" });
    res.json({ data: order });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;