const express = require('express');
const router = express.Router();
const Order = require('../models/Orders');
const FactoryProfile = require('../models/factoryProfile');
const Notification = require('../models/Notification');
const User = require('../models/users'); // ✅ أضيفها فوق
const auth = require('../middleware/authMiddleware');

// البراند يعمل order
router.post('/create', auth, async (req, res) => {
  try {
    const { factoryId, productName, quantity, selectedSize, selectedColor, specifications, notes, productData } = req.body;

    const factoryProfile = await FactoryProfile.findById(factoryId);
    if (!factoryProfile) {
      return res.status(404).json({ message: "Factory not found" });
    }

    // ✅ جيب اسم البراند من الـ DB
    const brandUser = await User.findById(req.user.userId);

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

    await Notification.create({
      user: factoryProfile.userId,
      title: 'New Order Received!',
      message: `You received a new order for "${productName}" (${quantity} units).`,
      type: 'order',
      data: {
        requestId: order._id,
        productName,
        quantity,
        selectedSize,
        selectedColor,
        notes,
        brandId: req.user.userId,
        brandName: brandUser?.name ?? 'Unknown Brand', // ✅
      },
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

// المصنع يقبل أو يرفض الأوردر
router.put('/:id/status', auth, async (req, res) => {
  try {
    const { status } = req.body;

    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: "Order not found" });

    order.status = status;
    await order.save();

    const factoryProfile = await FactoryProfile.findOne({ userId: req.user.userId });
    
    // ✅ جيب اسم البراند من الـ DB
    const brandUser = await User.findById(order.brand);

    await Notification.create({
      user: order.brand,
      title: status === 'accepted' ? 'Order Accepted!' : 'Order Declined',
      message: status === 'accepted'
        ? `Your order for "${order.productName}" has been accepted by the factory.`
        : `Your order for "${order.productName}" was declined by the factory.`,
      type: 'order',
      data: {
        orderId: order._id,
        productName: order.productName,
        status,
        factoryId: req.user.userId,
        factoryName: factoryProfile?.factoryName ?? '',
        factoryLogo: factoryProfile?.imageUrl ?? '',
        brandName: brandUser?.name ?? '', // ✅
      },
    });

    res.json({ message: `Order ${status}`, data: order });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;