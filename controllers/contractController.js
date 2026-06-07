const Contract = require('../models/Contract');
const Order = require('../models/Orders');
const FactoryProfile = require('../models/factoryProfile');
const BrandProfile = require('../models/brandProfile');
const User = require('../models/users');

// ✅ لما Factory توافق على الـ Order - يتجنرت Contract تلقائياً
const createContract = async (orderId) => {
  const order = await Order.findById(orderId);
  if (!order) throw new Error('Order not found');

  const contract = new Contract({
    order: order._id,
    brand: order.brand,
    factory: order.factory,
  });

  await contract.save();
  return contract;
};

// ✅ جيب الـ Contract بتاع Order معين
const getContractByOrder = async (req, res) => {
  try {
    const contract = await Contract.findOne({ order: req.params.orderId })
      .populate('order');

    if (!contract) return res.status(404).json({ message: 'Contract not found' });

    // جيب Factory و Brand profiles
    const factoryProfile = await FactoryProfile.findOne({ userId: contract.factory });
    const brandProfile = await BrandProfile.findOne({ userId: contract.brand });
    const factoryUser = await User.findById(contract.factory);
    const brandUser = await User.findById(contract.brand);

    res.json({
      ...contract.toObject(),
      factoryInfo: {
        name: factoryProfile?.factoryName ?? '',
        ownerName: factoryUser?.name ?? '',
        email: factoryUser?.email ?? '',
        phone: factoryProfile?.contactInformation ?? '',
      },
      brandInfo: {
        name: brandProfile?.brandName ?? '',
        representative: brandUser?.name ?? '',
        email: brandUser?.email ?? '',
        phone: brandProfile?.contactInformation ?? '',
      },
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ✅ Brand أو Factory يوافقوا
const approveContract = async (req, res) => {
  try {
    const { role } = req.body; // 'brand' or 'factory'
    const contract = await Contract.findById(req.params.id);
    
    if (!contract) return res.status(404).json({ message: 'Contract not found' });

    if (role === 'brand') contract.brandApproved = true;
    if (role === 'factory') contract.factoryApproved = true;

    // لو الاتنين وافقوا
    if (contract.brandApproved && contract.factoryApproved) {
      contract.status = 'active';
    } else if (role === 'brand') {
      contract.status = 'brand_approved';
    } else {
      contract.status = 'factory_approved';
    }

    await contract.save();
    res.json(contract);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ✅ رفض الـ Contract
const rejectContract = async (req, res) => {
  try {
    const contract = await Contract.findById(req.params.id);
    if (!contract) return res.status(404).json({ message: 'Contract not found' });

    contract.status = 'rejected';
    await contract.save();
    res.json(contract);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = { createContract, getContractByOrder, approveContract, rejectContract };