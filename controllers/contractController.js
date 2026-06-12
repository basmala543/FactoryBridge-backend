const Contract = require('../models/Contract');
const Order = require('../models/Orders');
const FactoryProfile = require('../models/factoryProfile');
const BrandProfile = require('../models/brandProfile');
const User = require('../models/users');
const Notification = require('../models/Notification');


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
const brandId = contract.brand?.toString();
const factoryId = contract.factory?.toString();

const [brandUser, brandProfile, factoryProfile] = await Promise.all([
  User.findById(brandId).catch(() => null),
  BrandProfile.findOne({ userId: brandId }).catch(() => null),
  FactoryProfile.findOne({ 
    $or: [{ _id: factoryId }, { userId: factoryId }] 
  }).catch(() => null),
]);

const factoryUser = factoryProfile?.userId 
  ? await User.findById(factoryProfile.userId).catch(() => null)
  : null;
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
    console.error('getContractByOrder error:', err);
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
const approveContract = async (req, res) => {
  try {
    const { role } = req.body;
    const contract = await Contract.findById(req.params.id).populate('order');  // ← زيد .populate('order')

    if (!contract) return res.status(404).json({ message: 'Contract not found' });

    if (role === 'brand') contract.brandApproved = true;
    if (role === 'factory') contract.factoryApproved = true;

    if (contract.brandApproved && contract.factoryApproved) {
      contract.status = 'active';

      await Notification.create({
        user: contract.brand,
        title: 'Contract Active!',
        message: 'Both parties approved the contract. You can now proceed to payment.',
        type: 'contract',
        data: {
         orderId: contract.order?._id?.toString() ?? contract.order?.toString() ?? '',
          contractId: contract._id.toString(),
        },
      });

    } else if (role === 'brand') {
      contract.status = 'brand_approved';

      // ✅ الحل - جيب Factory بـ findOne مش findById
      const factoryProfile = await FactoryProfile.findOne({ 
        _id: contract.factory  // ✅ أو
        // userId: contract.factory  // جربي الاتنين
      });
      
      if (factoryProfile) {
        await Notification.create({
          user: factoryProfile.userId,
          title: 'Brand Signed the Contract!',
          message: 'The brand approved the contract. Please review and sign.',
          type: 'contract',
          data: {
           orderId: contract.order?._id?.toString() ?? contract.order?.toString() ?? '',
            contractId: contract._id.toString(),
          },
        });
      }

    } else {
      contract.status = 'factory_approved';
    }

    await contract.save();
    res.json(contract);
  } catch (err) {
    console.error('approveContract error:', err); // ✅ أضيفي ده
    res.status(500).json({ message: err.message });
  }
};
const notifyBrand = async (req, res) => {
  try {
    const contract = await Contract.findById(req.params.id).populate('order');
    if (!contract) return res.status(404).json({ message: 'Contract not found' });

    await Notification.create({
      user: contract.brand,
      title: 'Contract is Active!',
      message: 'The factory has signed the contract. You can now proceed to payment.',
      type: 'contract',
      data: {
        orderId: contract.order?._id?.toString() ?? contract.order?.toString() ?? '',
        contractId: contract._id.toString(),
      },
    });

    res.json({ message: 'Brand notified successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = { createContract, getContractByOrder, approveContract, rejectContract, notifyBrand };