const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const Message = require("../models/Message");
const authMiddleware = require("../middleware/authMiddleware");

// ============================================================
// GET /api/chats
// جيب كل المحادثات اللي فيها المستخدم الحالي
// ============================================================
router.get("/", authMiddleware, async (req, res) => {
  try {
const userId = req.user.userId;

    // جيب آخر رسالة لكل محادثة فريدة
    const conversations = await Message.aggregate([
      {
        $match: {
          $or: [{ senderId: userId }, { receiverId: userId }],
        },
      },
      {
        $sort: { timestamp: -1 },
      },
      {
        $addFields: {
          // عمل chatId ثابت بين طرفين (أصغر ID يجي الأول دايمًا)
          chatId: {
            $cond: {
              if: { $lt: ["$senderId", "$receiverId"] },
              then: { $concat: ["$senderId", "_", "$receiverId"] },
              else: { $concat: ["$receiverId", "_", "$senderId"] },
            },
          },
          // الطرف التاني (مش أنا)
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
          // عد الرسائل الغير مقروءة اللي المستلم منها أنا
          unreadCount: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ["$receiverId", userId] },
                    { $eq: [{ $ifNull: ["$isRead", false] }, false] },
                  ],
                },
                1,
                0,
              ],
            },
          },
        },
      },
      {
        $sort: { lastUpdated: -1 },
      },
    ]);

    // جيب بيانات المشاركين (اسم وصورة) من users collection
const User = mongoose.models.User || mongoose.model("User", new mongoose.Schema({
  name: String,
  email: String,
  profileImage: String,
  companyName: String,
}, { strict: false }));

    const participantIds = conversations.map((c) => c.participantId);
const FactoryProfile = require('../models/factoryProfile');
const BrandProfile = require('../models/brandProfile');

const factoryProfiles = await FactoryProfile.find({
  userId: { $in: participantIds }
}).select('userId factoryName');

const brandProfiles = await BrandProfile.find({
  userId: { $in: participantIds }
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
        _id: { $in: participantIds.map((id) => {
          try { return new mongoose.Types.ObjectId(id); } catch { return id; }
        }) },
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

// ============================================================
// GET /api/chats/:chatId/messages
// جيب رسائل محادثة معينة (chatId = senderId_receiverId)
// ============================================================
router.get("/:chatId/messages", authMiddleware, async (req, res) => {
  try {
const userId = req.user.userId;
    const { chatId } = req.params;

    // chatId = "id1_id2" — استخرج الطرفين
    const parts = chatId.split("_");
    if (parts.length < 2) {
      return res.status(400).json({ message: "Invalid chatId format" });
    }

    const [idA, idB] = parts;

    // تأكد إن المستخدم الحالي طرف في المحادثة
    if (userId !== idA && userId !== idB) {
      return res.status(403).json({ message: "Access denied" });
    }

    const messages = await Message.find({
      $or: [
        { senderId: idA, receiverId: idB },
        { senderId: idB, receiverId: idA },
      ],
    })
      .sort({ timestamp: 1 })
      .limit(100);

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

// ============================================================
// POST /api/chats/:chatId/messages
// ابعت رسالة HTTP (fallback لو Socket مش متاح)
// ============================================================
router.post("/:chatId/messages", authMiddleware, async (req, res) => {
  try {
const userId = req.user.userId;
    const { chatId } = req.params;
    const { message } = req.body;

    if (!message || !message.trim()) {
      return res.status(400).json({ message: "Message is required" });
    }

    const parts = chatId.split("_");
    if (parts.length < 2) {
      return res.status(400).json({ message: "Invalid chatId format" });
    }

    const [idA, idB] = parts;

    if (userId !== idA && userId !== idB) {
      return res.status(403).json({ message: "Access denied" });
    }

    const receiverId = userId === idA ? idB : idA;

    const newMsg = new Message({
      senderId: userId,
      receiverId,
      message: message.trim(),
    });

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