const express = require('express');
const router = express.Router();
const Order = require('../models/Orders');
const BrandProfile = require('../models/brandProfile');
const FactoryProfile = require('../models/factoryProfile');
const Notification = require('../models/Notification');
const User = require('../models/users');
const auth = require('../middleware/authMiddleware');

async function findFactoryProfile(userId) {
    return FactoryProfile.findOne({ userId });
}

async function enrichOrders(orders) {
    const brandIds = [...new Set(orders.map((order) => order.brand).filter(Boolean))];
    const brandProfiles = await BrandProfile.find({ userId: { $in: brandIds } });
    const brandUsers = await User.find({ _id: { $in: brandIds } });
    const brandMap = new Map();
    const userMap = new Map();

    brandProfiles.forEach((brand) => {
        const key = brand.userId?.toString?.() ?? brand.userId;
        if (key) {
            brandMap.set(key, brand);
        }
    });

    brandUsers.forEach((user) => {
        userMap.set(user._id?.toString?.() ?? user._id, user);
    });

    return orders.map((order) => {
        const obj = order.toObject();
        const brandId = order.brand?.toString?.() ?? order.brand;
        const brandProfile = brandMap.get(brandId);
        const brandUser = userMap.get(brandId);
        if (brandProfile || brandUser) {
            // Prefer the brand profile display name (brandName or name).
            // Fall back to the user's name only if no brand name exists.
            obj.brandName = (brandProfile && (brandProfile.brandName || brandProfile.name)) || (brandUser && brandUser.name) || obj.brandName;
            obj.brandId = brandId;
        }
        return obj;
    });
}

function buildStatusOptions(status) {
    // Only factories can transition, and only to the next valid states
    const transitions = {
        'pending': ['accepted', 'rejected'],
        'pending_payment': ['in_progress', 'waiting_delivery'],
        'accepted': ['in_progress', 'waiting_delivery', 'out_for_delivery', 'order_at_your_location'],
        'in_progress': ['waiting_delivery', 'out_for_delivery', 'order_at_your_location'],
        'waiting_delivery': ['out_for_delivery', 'order_at_your_location'],
        'out_for_delivery': ['order_at_your_location'],
        'order_at_your_location': ['done'],
        'delivered': ['done'],
        'done': [],
        'rejected': [],
    };
    return transitions[status] || [];
}

function getNotificationMessage(status, order) {
    switch (status) {
        case 'accepted':
            return `Your order for "${order.productName}" has been accepted by the factory.`;
        case 'rejected':
            return `Your order for "${order.productName}" was declined by the factory.`;
        case 'pending_payment':
            return `Order accepted. Awaiting your payment for "${order.productName}".`;
        case 'in_progress':
            return `Production has started for "${order.productName}".`;
        case 'waiting_delivery':
            return `Your order "${order.productName}" is ready and waiting for delivery.`;
        case 'out_for_delivery':
            return `Your order "${order.productName}" is out for delivery!`;
        case 'order_at_your_location':
            return `Your order "${order.productName}" has arrived at your location!`;
        case 'delivered':
            return `Your order "${order.productName}" has been delivered.`;
        case 'done':
            return `Your order "${order.productName}" has been completed and closed.`;
        default:
            return `Order status updated to ${status}.`;
    }
}

router.get('/accepted-orders', auth, async (req, res) => {
    try {
        const factoryProfile = await findFactoryProfile(req.user.userId);
        if (!factoryProfile) {
            return res.status(404).json({ message: 'Factory profile not found' });
        }

        const activeStatuses = [
            'accepted', 'pending_payment', 'in_progress',
            'waiting_delivery', 'out_for_delivery', 'order_at_your_location'  // ← ضيفي
        ];
        const orders = await Order.find({
            factory: factoryProfile._id.toString(),
            status: { $in: activeStatuses },
        }).sort({ createdAt: -1 });

        res.json({ data: await enrichOrders(orders) });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

router.get('/delivering-orders', auth, async (req, res) => {
    try {
        const factoryProfile = await findFactoryProfile(req.user.userId);
        if (!factoryProfile) {
            return res.status(404).json({ message: 'Factory profile not found' });
        }

        const orders = await Order.find({
            factory: factoryProfile._id.toString(),
            status: 'out_for_delivery',
        }).sort({ createdAt: -1 });

        res.json({ data: await enrichOrders(orders) });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

router.get('/completed-orders', auth, async (req, res) => {
    try {
        const factoryProfile = await findFactoryProfile(req.user.userId);
        if (!factoryProfile) {
            return res.status(404).json({ message: 'Factory profile not found' });
        }

        const orders = await Order.find({
            factory: factoryProfile._id.toString(),
            status: { $in: ['delivered', 'done'] },
        }).sort({ createdAt: -1 });

        res.json({ data: await enrichOrders(orders) });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

router.get('/recent-production-jobs', auth, async (req, res) => {
    try {
        const factoryProfile = await findFactoryProfile(req.user.userId);
        if (!factoryProfile) {
            return res.status(404).json({ message: 'Factory profile not found' });
        }

        const limit = Number(req.query.limit) || 2;
        const orders = await Order.find({
            factory: factoryProfile._id.toString(),
            status: { $nin: ['pending', 'rejected'] },
        })
            .sort({ createdAt: -1 })
            .limit(limit);

        res.json({ data: await enrichOrders(orders) });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

router.get('/orders/:id', auth, async (req, res) => {
    try {
        const factoryProfile = await findFactoryProfile(req.user.userId);
        if (!factoryProfile) {
            return res.status(404).json({ message: 'Factory profile not found' });
        }

        const order = await Order.findOne({
            _id: req.params.id,
            factory: factoryProfile._id.toString(),
        });
        if (!order) {
            return res.status(404).json({ message: 'Order not found' });
        }

        const [enriched] = await enrichOrders([order]);
        res.json({ data: enriched });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

router.get('/orders/:id/available-statuses', auth, async (req, res) => {
    try {
        const factoryProfile = await findFactoryProfile(req.user.userId);
        if (!factoryProfile) {
            return res.status(404).json({ message: 'Factory profile not found' });
        }

        const order = await Order.findOne({
            _id: req.params.id,
            factory: factoryProfile._id.toString(),
        });
        if (!order) {
            return res.status(404).json({ message: 'Order not found' });
        }

        res.json({ data: buildStatusOptions(order.status) });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

router.put('/orders/:id/status', auth, async (req, res) => {
    try {
        const { status } = req.body;
        const factoryProfile = await findFactoryProfile(req.user.userId);
        if (!factoryProfile) {
            return res.status(404).json({ message: 'Factory profile not found' });
        }

        const order = await Order.findOne({
            _id: req.params.id,
            factory: factoryProfile._id.toString(),
        });
        if (!order) {
            return res.status(404).json({ message: 'Order not found' });
        }

        order.status = status;
        await order.save();

        const brandUser = await User.findById(order.brand);
        const brandProfile = await BrandProfile.findOne({ userId: order.brand });

        const title = status === 'accepted' ? 'Order Accepted!'
            : status === 'rejected' ? 'Order Declined'
                : status === 'in_progress' ? 'Production Started'
                    : status === 'out_for_delivery' ? 'Out for Delivery'
                        : status === 'order_at_your_location' ? 'Order At Your Location' // ← ضيفي
                            : status === 'delivered' ? 'Order Delivered'
                                : 'Order Update';
        await Notification.create({
            user: order.brand,
            title,
            message: getNotificationMessage(status, order),
            type: 'order',
            data: {
                orderId: order._id.toString(),
                requestId: order._id.toString(),
                productName: order.productName,
                quantity: order.quantity,
                status,
                factoryId: factoryProfile._id.toString(),
                factoryName: factoryProfile.factoryName || '',
                factoryLogo: factoryProfile.logo || '',
                brandName: brandProfile?.brandName || brandProfile?.name || brandUser?.name || '',
                brandLogo: brandProfile?.logo || '',
            },
        });

        const [enriched] = await enrichOrders([order]);
        res.json({ data: enriched });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;
