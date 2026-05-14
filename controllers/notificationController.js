const Notification = require('../models/Notification');

exports.getNotifications = async (req, res) => {
  try {
    const notifications = await Notification.find({ user: req.user.userId })
      .sort({ createdAt: -1 })
      .limit(20);
    res.json({ data: notifications.map(n => ({ ...n.toObject(), id: n._id })) });
  } catch (error) {
    res.status(500).json({ message: "Error fetching notifications", error });
  }
};

exports.markAsRead = async (req, res) => {
  try {
    await Notification.findByIdAndUpdate(req.params.id, { isRead: true });
    res.json({ message: "Marked as read" });
  } catch (error) {
    res.status(500).json({ message: "Error", error });
  }
};

exports.markAllAsRead = async (req, res) => {
  try {
    await Notification.updateMany({ user: req.user.userId }, { isRead: true });
    res.json({ message: "All marked as read" });
  } catch (error) {
    res.status(500).json({ message: "Error", error });
  }
};

exports.deleteNotification = async (req, res) => {
  try {
    await Notification.findByIdAndDelete(req.params.id);
    res.json({ message: "Deleted" });
  } catch (error) {
    res.status(500).json({ message: "Error", error });
  }
};

exports.getUnreadCount = async (req, res) => {
  try {
    const count = await Notification.countDocuments({ 
      user: req.user.userId, 
      isRead: false 
    });
    res.json({ count });
  } catch (error) {
    res.status(500).json({ message: 'Error', error });
  }
};