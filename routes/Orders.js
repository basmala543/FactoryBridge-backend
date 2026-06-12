const express = require('express');
const router = express.Router();
const Order = require('../models/Orders');
const FactoryProfile = require('../models/factoryProfile');
const BrandProfile = require('../models/brandProfile');
const Notification = require('../models/Notification');
const User = require('../models/users');
const auth = require('../middleware/authMiddleware');
const { createContract } = require('../controllers/contractController');

async function enrichBrandOrders(orders) {
  const factoryIds = [...new Set(orders.map((order) => order.factory).filter(Boolean))];
  const factoryProfiles = await FactoryProfile.find({ _id: { $in: factoryIds } });
  const factoryMap = new Map();
  factoryProfiles.forEach((factory) => {
    const key = factory._id?.toString?.() ?? factory._id;
    if (key) factoryMap.set(key, factory);
  });

  return orders.map((order) => {
    const obj = order.toObject();
    const factoryId = order.factory?.toString?.() ?? order.factory;
    const factoryProfile = factoryMap.get(factoryId);
    if (factoryProfile) {
      obj.factoryName = factoryProfile.factoryName || factoryProfile.name || '';
      obj.factoryLogo = factoryProfile.logo || factoryProfile.imageUrl || '';
      obj.factoryLocation = factoryProfile.location || '';
    }
    return obj;
  });
}

// البراند يعمل order
router.post('/create', auth, async (req, res) => {
  try {
    const { factoryId, productName, quantity, selectedSize, selectedColor,
      specifications, notes, productData,
      materials, manufacturingTime, shippingMethod, deliveryDate,
      totalPrice, deposit, paymentMethod, currency } = req.body;

    const factoryProfile = await FactoryProfile.findById(factoryId);
    if (!factoryProfile) {
      return res.status(404).json({ message: "Factory not found" });
    }

    const brandUser = await User.findById(req.user.userId);
    const brandProfile = await BrandProfile.findOne({ userId: req.user.userId });
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
      materials,
      manufacturingTime,
      shippingMethod,
      deliveryDate,
      totalPrice,
      deposit,
      paymentMethod,
      currency: currency ?? 'USD',
    });

    await Notification.create({
      user: factoryProfile.userId,
      title: 'New Order Received!',
      message: `Brand ${brandUser?.name ?? 'Unknown'} sent order details for "${productName}" (${quantity} units).`,
      type: 'order',
      data: {
        orderId: order._id,  // ✅ ضيف
        requestId: order._id,
        productName,
        quantity,
        selectedSize,
        selectedColor,
        notes,
        productData,  // ✅ أضيفي السطر ده
        brandId: req.user.userId,
        brandName: brandUser?.name ?? 'Unknown Brand',
        brandLogo: brandProfile?.logo ?? '',

        // ✅ تفاصيل البراند
        brandDescription: brandProfile?.description ?? '',
        brandLocation: brandProfile?.location ?? '',
        brandCategory: brandProfile?.productCategories ?? '',
        brandIndustry: brandProfile?.industry ?? '',
        brandContact: brandProfile?.contactInformation ?? '',
      },
    });

    res.status(201).json({ data: order });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// البراند يشوف orders بتاعته
// البراند يشوف orders بتاعته
router.get('/my-orders', auth, async (req, res) => {
  try {
    const { factoryId } = req.query;
    const filter = { brand: req.user.userId };
    if (factoryId) filter.factory = factoryId;

    const orders = await Order.find(filter).sort({ createdAt: -1 });
    const enriched = await enrichBrandOrders(orders);
    res.json({ data: enriched });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// تفاصيل order
router.get('/:id', auth, async (req, res) => {
  try {
    const order = await Order.findOne({ _id: req.params.id, brand: req.user.userId });
    if (!order) return res.status(404).json({ message: "Order not found" });
    const [enriched] = await enrichBrandOrders([order]);
    res.json({ data: enriched });
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

    // Only factory owner can update
    const factoryProfile = await FactoryProfile.findOne({ userId: req.user.userId });
    if (!factoryProfile || order.factory !== factoryProfile._id.toString()) {
      return res.status(403).json({ message: "Not authorized" });
    }
    if (status === 'in_progress' && !order.isPaidByBrand) {
  return res.status(400).json({ message: 'Cannot start production before deposit is paid' });
}

order.status = status;  

    await order.save();

    if (status === 'accepted') {
      await createContract(order._id);
    }
    const brandUser = await User.findById(order.brand);
    const brandProfile = await BrandProfile.findOne({ userId: order.brand });

    await Notification.create({
      user: order.brand,
      title: status === 'accepted' ? 'Order Accepted!' : 'Order Declined',
      message: status === 'accepted'
        ? `Your order for "${order.productName}" has been accepted by the factory.`
        : `Your order for "${order.productName}" was declined by the factory.`,
      type: 'order',
      data: {
        orderId: order._id.toString(),
        requestId: order._id.toString(),
        productName: order.productName,
        quantity: order.quantity,
        status,
        factoryId: factoryProfile?._id?.toString() ?? '',
        factoryName: factoryProfile?.factoryName ?? '',
        factoryLogo: factoryProfile?.logo ?? factoryProfile?.imageUrl ?? '',
        brandName: brandUser?.name ?? '',
        brandLogo: brandProfile?.logo ?? '',
        brandDescription: brandProfile?.description ?? '',
        brandLocation: brandProfile?.location ?? '',
        brandCategory: brandProfile?.productCategories ?? '',
        brandIndustry: brandProfile?.industry ?? '',
        brandContact: brandProfile?.contactInformation ?? '',
      },
    });

    res.json({ message: `Order ${status}`, data: order });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/factory/:factoryId/products', auth, async (req, res) => {
  try {
    const factory = await FactoryProfile.findById(req.params.factoryId);
    if (!factory) return res.status(404).json({ message: "Factory not found" });
    res.json({ data: factory.factoryProducts || [] });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});
// البراند يأكد استلام المنتج
router.put('/:id/confirm-delivery', auth, async (req, res) => {
  try {
    const order = await Order.findOne({ _id: req.params.id, brand: req.user.userId });
    if (!order) return res.status(404).json({ message: 'Order not found' });

if (order.status !== 'order_at_your_location') {
        return res.status(400).json({ message: 'Order is not in progress' });
    }

    order.status = 'done';
    await order.save();

    const factoryProfile = await FactoryProfile.findById(order.factory);
    if (factoryProfile) {
      await Notification.create({
        user: factoryProfile.userId,
        title: 'Order Completed!',
        message: `Brand confirmed delivery for "${order.productName}".`,
        type: 'order',
        data: { orderId: order._id.toString() },
      });
    }

    res.json({ message: 'Order confirmed', data: order });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});
router.put('/:id/pay-deposit', auth, async (req, res) => {
  try {
    const order = await Order.findOne({ _id: req.params.id, brand: req.user.userId });
    if (!order) return res.status(404).json({ message: 'Order not found' });

    order.isPaidByBrand = true;
    order.paymentMethod = req.body.method ?? 'card';
    await order.save();

    const factoryProfile = await FactoryProfile.findById(order.factory);
    if (factoryProfile) {
      await Notification.create({
        user: factoryProfile.userId,
        title: 'Deposit Received!',
        message: `Brand paid the deposit for "${order.productName}". You can start production.`,
        type: 'order',
        data: { orderId: order._id.toString() },
      });
    }

    res.json({ message: 'Deposit paid', data: order });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});
router.put('/:id/pay-remaining', auth, async (req, res) => {
  try {
    const order = await Order.findOne({ _id: req.params.id, brand: req.user.userId });
    if (!order) return res.status(404).json({ message: 'Order not found' });

    if (!order.isPaidByBrand) {
      return res.status(400).json({ message: 'Deposit not paid yet' });
    }

    order.isRemainingPaid = true;
    order.paymentMethod = req.body.method ?? 'card';
    await order.save();

    const factoryProfile = await FactoryProfile.findById(order.factory);
    if (factoryProfile) {
      await Notification.create({
        user: factoryProfile.userId,
        title: 'Remaining Payment Received!',
        message: `Brand paid the remaining amount for "${order.productName}".`,
        type: 'order',
        data: { orderId: order._id.toString() },
      });
    }

    res.json({ message: 'Remaining paid', data: order });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});
router.put('/:id/refund', auth, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: 'Order not found' });

    // ── جيب تفاصيل الفاكتوري ──
    const factoryProfile = await FactoryProfile.findById(order.factory);
    const brandProfile = await BrandProfile.findOne({ userId: order.brand });

    const totalPaid = order.isRemainingPaid
      ? (order.totalPrice ?? 0)
      : order.isPaidByBrand
        ? (order.deposit ?? 0)
        : 0;

    const currency = order.currency ?? 'USD';

    order.isPaidByBrand = false;
    order.isRemainingPaid = false;
    order.status = 'rejected';
    await order.save();

    // ── notification للبراند ──
    await Notification.create({
      user: order.brand,
      title: '💰 Refund Processed',
      message: `Your refund of ${totalPaid} ${currency} for "${order.productName}" (${order.quantity} units) from ${factoryProfile?.factoryName ?? 'the factory'} has been processed by admin due to: ${req.body.reason ?? 'a reported issue'}.`,
      type: 'refund',
      data: {
        orderId: order._id.toString(),
        productName: order.productName,
        quantity: order.quantity,
        totalPaid,
        currency,
        factoryName: factoryProfile?.factoryName ?? '',
        factoryLogo: factoryProfile?.logo ?? '',
        reason: req.body.reason ?? '',
      },
    });

    res.json({ message: 'Refund processed', data: order });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});
// المصنع يشوف orders بتاعته (مع فلتر brandId اختياري)
router.get('/factory-orders', auth, async (req, res) => {
  try {
    const factoryProfile = await FactoryProfile.findOne({ userId: req.user.userId });
    console.log('factoryProfile._id:', factoryProfile?._id);
    
    const { brandId } = req.query;
    console.log('brandId from query:', brandId);
    
    const BrandProfile = require('../models/brandProfile');
    const brandProfile = await BrandProfile.findById(brandId);
    console.log('brandProfile:', brandProfile);
    console.log('brandProfile.userId:', brandProfile?.userId);
    
const filter = { factory: factoryProfile._id.toString() };
    if (brandProfile) filter.brand = brandProfile.userId;
    
    console.log('filter:', filter);
    
    const orders = await Order.find(filter).sort({ createdAt: -1 });
    console.log('orders count:', orders.length);
    
    res.json({ data: orders });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});
module.exports = router;