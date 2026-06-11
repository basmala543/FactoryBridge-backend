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
module.exports = router;