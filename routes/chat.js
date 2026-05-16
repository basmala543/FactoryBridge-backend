const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const Message = require("../models/Message");
const FactoryProfile = require('../models/factoryProfile');
const BrandProfile = require('../models/brandProfile');
const authMiddleware = require("../middleware/authMiddleware");

const User = mongoose.models.User || mongoose.model("User", new mongoose.Schema({
  name: String,
  email: String,
  profileImage: String,
  companyName: String,
}, { strict: false }));

router.get("/", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.userId;

    const conversations = await Message.aggregate([
      { $match: { $or: [{ senderId: userId }, { receiverId: userId }] } },
      { $sort: { timestamp: -1 } },
      {
        $addFields: {
          chatId: {
            $cond: {
              if: { $lt: ["$senderId", "$receiverId"] },
              then: { $concat: ["$senderId", "_", "$receiverId"] },
              else: { $concat: ["$receiverId", "_", "$senderId"] },
            },
          },
          participantId: {
            $cond: {
              if: { $eq: ["$senderId", userId] },
              then: "$receiverId",
              else: "$senderId",
            },
          },
        },
      },
      {
        $group: {
          _id: "$chatId",
          lastMessage: { $first: "$message" },
          lastUpdated: { $first: "$timestamp" },
          participantId: { $first: "$participantId" },
          unreadCount: {
            $sum: {
              $cond: [
                { $and: [
                  { $eq: ["$receiverId", userId] },
                  { $eq: [{ $ifNull: ["$isRead", false] }, false] },
                ]},
                1, 0,
              ],
            },
          },
        },
      },
      { $sort: { lastUpdated: -1 } },
    ]);

    const participantIds = conversations.map((c) => c.participantId);

    const validParticipantIds = participantIds.filter(id =>
      id !== 'ai' && mongoose.Types.ObjectId.isValid(id)
    );

    const factoryProfiles = await FactoryProfile.find({
      userId: { $in: validParticipantIds }
    }).select('userId factoryName');

    const brandProfiles = await BrandProfile.find({
      userId: { $in: validParticipantIds }
    }).select('userId brandName');

    const profileMap = {};
    factoryProfiles.forEach(p => {
      profileMap[p.userId.toString()] = p.factoryName;
    });
    brandProfiles.forEach(p => {
      profileMap[p.userId.toString()] = p.brandName;
    });

    let participants = [];
    try {
      participants = await User.find({
        _id: { $in: validParticipantIds.map(id => new mongoose.Types.ObjectId(id)) },
      }).select("_id name companyName profileImage");
    } catch (_) {}

    const participantMap = {};
    participants.forEach((p) => {
      participantMap[p._id.toString()] = p;
    });

    const result = conversations.map((conv) => {
      const participant = participantMap[conv.participantId] || null;
      const name = conv.participantId === "ai"
        ? "FactoryBridge Support"
        : (profileMap[conv.participantId] || participant?.companyName || participant?.name || "Unknown");

      return {
        id: conv._id,
        title: name,
        participantName: name,
        participantImageUrl: participant?.profileImage || "",
        lastMessage: conv.lastMessage,
        lastUpdated: conv.lastUpdated,
        unreadCount: conv.unreadCount || 0,
      };
    });

    return res.json({ data: result });
  } catch (err) {
    console.error("❌ GET /api/chats error:", err);
    return res.status(500).json({ message: "Server error", error: err.message });
  }
});

router.get("/:chatId/messages", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { chatId } = req.params;
    const parts = chatId.split("_");
    if (parts.length < 2) return res.status(400).json({ message: "Invalid chatId format" });
    const [idA, idB] = parts;
    if (userId !== idA && userId !== idB) return res.status(403).json({ message: "Access denied" });

    const messages = await Message.find({
      $or: [
        { senderId: idA, receiverId: idB },
        { senderId: idB, receiverId: idA },
      ],
    }).sort({ timestamp: 1 }).limit(100);

    const result = messages.map((m) => ({
      id: m._id.toString(),
      senderId: m.senderId,
      senderName: m.senderId === userId ? "Me" : "Other",
      text: m.message,
      createdAt: m.timestamp,
      isMe: m.senderId === userId,
    }));

    return res.json({ data: result });
  } catch (err) {
    console.error("❌ GET /api/chats/:chatId/messages error:", err);
    return res.status(500).json({ message: "Server error", error: err.message });
  }
});

router.post("/:chatId/messages", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { chatId } = req.params;
    const { message } = req.body;
    if (!message || !message.trim()) return res.status(400).json({ message: "Message is required" });

    const parts = chatId.split("_");
    if (parts.length < 2) return res.status(400).json({ message: "Invalid chatId format" });
    const [idA, idB] = parts;
    if (userId !== idA && userId !== idB) return res.status(403).json({ message: "Access denied" });

    const receiverId = userId === idA ? idB : idA;
    const newMsg = new Message({ senderId: userId, receiverId, message: message.trim() });
    await newMsg.save();

    return res.status(201).json({
      data: {
        id: newMsg._id.toString(),
        senderId: newMsg.senderId,
        senderName: "Me",
        text: newMsg.message,
        createdAt: newMsg.timestamp,
        isMe: true,
      },
    });
  } catch (err) {
    console.error("❌ POST /api/chats/:chatId/messages error:", err);
    return res.status(500).json({ message: "Server error", error: err.message });
  }
});

module.exports = router;