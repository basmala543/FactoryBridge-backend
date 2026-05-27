const mongoose = require('mongoose'); // ✅ أضيفي هذا السطر
const SampleRequest = require('../models/SampleRequest');
const Notification = require('../models/Notification');
const FactoryProfile = require('../models/factoryProfile');
const BrandProfile = require('../models/brandProfile'); // ✅ أضف هذا


exports.createRequest = async (req, res) => {
  try {
    const { factoryId, productName, quantity, notes } = req.body;

    const factoryProfile = await FactoryProfile.findById(factoryId);
    if (!factoryProfile) {
      return res.status(404).json({ message: "Factory not found" });
    }
    const factoryUserId = factoryProfile.userId;

    // ✅ جيبي اسم البراند
    const brandProfile = await BrandProfile.findOne({ userId: req.user.userId });
    const brandName = brandProfile?.brandName || brandProfile?.name || 'A Brand';

    const request = await SampleRequest.create({
      brand: req.user.userId,
      factory: factoryId,
      productName,
      quantity,
      notes,
    });

    await Notification.create({
      user: factoryUserId,
      title: 'New Sample Request',
      message: `You received a new sample request for "${productName}" (${quantity} units).`,
      type: 'system',
      data: {
  requestId: request._id.toString(), // ✅ كده
        productName,
        quantity,
        brandName,      // ✅ أضيفي دي
        brandId: req.user.userId, // ✅ وده
       brandLogo: brandProfile?.logo || null, // ✅ أضيفي دي

      },
    });

    res.status(201).json({ data: request });
  } catch (error) {
    res.status(500).json({ message: "Error creating request", error });
  }
};
exports.getFactoryRequests = async (req, res) => {
  try {
    const requests = await SampleRequest.find({ 
      factory: req.user.userId 
    }).sort({ createdAt: -1 });

    // ✅ أضيفي هذا
    const enriched = await Promise.all(requests.map(async (req) => {
      const brandProfile = await BrandProfile.findOne({ userId: req.brand });
      return {
        ...req.toObject(),
        brandName: brandProfile?.brandName ?? null,
      };
    }));

    res.json({ data: enriched });
  } catch (error) {
    res.status(500).json({ message: "Error fetching requests", error });
  }
};

exports.updateStatus = async (req, res) => {
  try {
    const { status } = req.body;
 const request = await SampleRequest.findOneAndUpdate(
  { _id: new mongoose.Types.ObjectId(req.params.id.trim()) },
  { status },
  { new: true }
);
console.log('Looking for ID:', req.params.id);
console.log('Request found:', request);

    if (!request) {
      return res.status(404).json({ message: "Request not found" });
    }

    // ✅ جيبي بيانات الـ factory
    const factoryProfile = await FactoryProfile.findOne({ userId: req.user.userId });
    const factoryName = factoryProfile?.factoryName || 'Factory';
    const factoryLogo = factoryProfile?.logo || null;

    if (status === 'accepted') {
      await Notification.create({
        user: request.brand,
        title: 'Sample Request Accepted!',
        message: `Your sample request for "${request.productName}" has been accepted.`,
        type: 'system',
        data: {
          factoryName,      // ✅
          factoryLogo,      // ✅
          requestId: request._id.toString(),      // ✅ أضيفي دي
          productName: request.productName,        // ✅ وده
        },
      });
    } else if (status === 'rejected') {
      await Notification.create({
        user: request.brand,
        title: 'Sample Request Update',
        message: `Your sample request for "${request.productName}" was not accepted.`,
        type: 'system',
        data: {
          factoryName,      // ✅
          factoryLogo,      // ✅
          requestId: request._id.toString(),      // ✅ أضيفي دي
          productName: request.productName,        // ✅ وده
        },
      });
    }

    res.json({ data: request });
  } catch (error) {
    res.status(500).json({ message: "Error updating status", error });
  }
};