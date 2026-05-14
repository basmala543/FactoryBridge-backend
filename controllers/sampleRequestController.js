const SampleRequest = require('../models/SampleRequest');
const Notification = require('../models/Notification');
const FactoryProfile = require('../models/factoryProfile');
const BrandProfile = require('../models/brandProfile'); // ✅ أضف ده

exports.createRequest = async (req, res) => {
  try {
    const { factoryId, productName, quantity, notes } = req.body;

    const factoryProfile = await FactoryProfile.findById(factoryId);
    if (!factoryProfile) {
      return res.status(404).json({ message: "Factory not found" });
    }
    const factoryUserId = factoryProfile.userId;

    // ✅ جيب BrandProfile بالـ userId
    const brandProfile = await BrandProfile.findOne({ userId: req.user.userId });
    if (!brandProfile) {
      return res.status(404).json({ message: "Brand profile not found" });
    }

    const request = await SampleRequest.create({
  brand: brandProfile._id,
  brandUserId: req.user.userId, // ✅ زودي ده
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
        requestId: request._id,
        productName,
        quantity,
      },
    });

    res.status(201).json({ data: request });
  } catch (error) {
    res.status(500).json({ message: "Error creating request", error });
  }
};

exports.getFactoryRequests = async (req, res) => {
  try {
    const factoryProfile = await FactoryProfile.findOne({ userId: req.user.userId });
    if (!factoryProfile) {
      return res.status(404).json({ message: "Factory profile not found" });
    }

    const requests = await SampleRequest.find({
      factory: factoryProfile._id
    })
      .populate('brand', 'brandName logo') // ✅ جيب اسم البراند والـ logo
      .sort({ createdAt: -1 });

    res.json({ data: requests });
  } catch (error) {
    res.status(500).json({ message: "Error fetching requests", error });
  }
};
exports.updateStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const request = await SampleRequest.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    );

    if (!request) {
      return res.status(404).json({ message: "Request not found" });
    }

    if (status === 'accepted') {
      await Notification.create({
        user: request.brandUserId, // ✅
        title: 'Sample Request Accepted!',
        message: `Your sample request for "${request.productName}" has been accepted.`,
        type: 'system',
      });
    } else if (status === 'rejected') {
      await Notification.create({
        user: request.brandUserId, // ✅ هنا كانت الغلطة
        title: 'Sample Request Update',
        message: `Your sample request for "${request.productName}" was not accepted.`,
        type: 'system',
      });
    }

    res.json({ data: request });
  } catch (error) {
    res.status(500).json({ message: "Error updating request", error });
  }
};
exports.getBrandRequests = async (req, res) => {
  try {
    const brandProfile = await BrandProfile.findOne({ userId: req.user.userId });
    if (!brandProfile) {
      return res.status(404).json({ message: "Brand profile not found" });
    }

    const requests = await SampleRequest.find({
      brand: brandProfile._id
    })
      .populate('factory', 'factoryName logo')
      .sort({ createdAt: -1 });

    res.json({ data: requests });
  } catch (error) {
    res.status(500).json({ message: "Error fetching requests", error });
  }
};



