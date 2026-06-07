const mongoose = require('mongoose');
const SampleRequest = require('../models/SampleRequest');
const Notification = require('../models/Notification');
const FactoryProfile = require('../models/factoryProfile');
const BrandProfile = require('../models/brandProfile');
const Order = require('../models/Orders');


exports.createRequest = async (req, res) => {
  try {
    const { factoryId, productName, quantity, notes } = req.body;

    const factoryProfile = await FactoryProfile.findById(factoryId);
    if (!factoryProfile) {
      return res.status(404).json({ message: "Factory not found" });
    }
    const factoryUserId = factoryProfile.userId;

    const brandProfile = await BrandProfile.findOne({ userId: req.user.userId });
    const brandName = brandProfile?.brandName || brandProfile?.name || 'A Brand';
    const brandUser = await require('../models/users').findById(req.user.userId);

    const request = await SampleRequest.create({
      brand: req.user.userId,
      factory: factoryUserId,
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
        requestId: request._id.toString(),
        productName,
        quantity,
        brandName: brandUser?.name ?? brandName,
        brandId: req.user.userId,
        brandLogo: brandProfile?.logo || null,
        brandDescription: brandProfile?.description || '',
        brandLocation: brandProfile?.location || '',
        brandCategory: brandProfile?.productCategories || '',
        brandIndustry: brandProfile?.industry || '',
        brandContact: brandProfile?.contactInformation || '',
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

    // If sample request is accepted, create an Order so it appears in factory's active orders
    if (status === 'accepted') {
      try {
        await Order.create({
          brand: request.brand,
          factory: request.factory,
          productName: request.productName,
          quantity: request.quantity,
          notes: request.notes,
          status: 'accepted',
          isPaidByBrand: false,
        });
        console.log('Order created from accepted sample request:', request._id);
      } catch (orderError) {
        console.error('Failed to create order from sample request:', orderError);
        // Don't fail the entire request update if order creation fails
      }
    }

    const factoryProfile = await FactoryProfile.findOne({ userId: req.user.userId });
    const factoryName = factoryProfile?.factoryName || 'Factory';
    const factoryLogo = factoryProfile?.logo || null;
    const factoryId = factoryProfile?._id?.toString() || '';

    const title = status === 'accepted' ? 'Sample Request Accepted!' : 'Sample Request Declined';
    const message = status === 'accepted'
      ? `Your sample request for "${request.productName}" has been accepted.`
      : `Your sample request for "${request.productName}" has been declined.`;

    await Notification.create({
      user: request.brand,
      title,
      message,
      type: 'system',
      data: {
        factoryName,
        factoryLogo,
        factoryId,
        requestId: request._id.toString(),
        productName: request.productName,
        status,
      },
    });

    res.json({ data: request });
  } catch (error) {
    res.status(500).json({ message: "Error updating status", error });
  }
};

exports.getAllRequests = async (req, res) => {
  try {
    const requests = await SampleRequest.find()
      .populate('brand', 'brandName location logo')
      .populate('factory', 'factoryName location logo')
      .sort({ createdAt: -1 });

    res.json({ success: true, data: requests });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};