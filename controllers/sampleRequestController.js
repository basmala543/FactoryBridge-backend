const SampleRequest = require('../models/SampleRequest');
const Notification = require('../models/Notification');

// البراند يبعت request
exports.createRequest = async (req, res) => {
  try {
    const { factoryId, productName, quantity, notes } = req.body;
    const request = await SampleRequest.create({
      brand: req.user.userId,
      factory: factoryId,
      productName,
      quantity,
      notes,
    });
    res.status(201).json({ data: request });
  } catch (error) {
    res.status(500).json({ message: "Error creating request", error });
  }
};

// المصنع يشوف الـ requests بتاعته
exports.getFactoryRequests = async (req, res) => {
  try {
    const requests = await SampleRequest.find({ 
      factory: req.user.userId 
    }).sort({ createdAt: -1 });
    res.json({ data: requests });
  } catch (error) {
    res.status(500).json({ message: "Error fetching requests", error });
  }
};

// المصنع يقبل أو يرفض
exports.updateStatus = async (req, res) => {
  try {
    const { status } = req.body; // 'accepted' or 'rejected'
    const request = await SampleRequest.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    );

    if (!request) {
      return res.status(404).json({ message: "Request not found" });
    }

    // ابعت notification للبراند
    if (status === 'accepted') {
      await Notification.create({
        user: request.brand,
        title: 'Sample Request Accepted!',
        message: `Your sample request for "${request.productName}" has been accepted.`,
        type: 'system',
      });
    } else if (status === 'rejected') {
      await Notification.create({
        user: request.brand,
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