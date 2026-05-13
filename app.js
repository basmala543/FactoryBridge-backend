const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const http = require("http");
const { Server } = require("socket.io");
const { GoogleGenerativeAI } = require("@google/generative-ai");
require("dotenv").config();

// الموديلات
const Message = require("./models/Message");

const app = express();

// Middleware
app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);
app.use(express.json());

// Routes
const authRoutes = require("./routes/auth");
const factoryProfileRoutes = require("./routes/factoryProfile");
const brandProfileRoutes = require("./routes/brandProfile");
const helpRoutes = require("./routes/help");
const favoriteRoutes = require("./routes/favorites");
const chatRoutes = require("./routes/chat");


app.use("/api/brand", brandProfileRoutes);
app.use("/api/help", helpRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/factory", factoryProfileRoutes);
app.use("/api/user/favorites", favoriteRoutes);
app.use("/api/chats", chatRoutes);

// ============ Gemini AI Setup ============
const AI_SYSTEM_PROMPT = `You are the FactoryBridge support assistant.
FactoryBridge is a platform that connects fashion brands with manufacturing factories.

Guidelines:
- Be concise, warm, and professional.
- Help users with: finding factories, posting orders, account issues, payments, shipping, and platform features.
- If a question needs human review (refunds, disputes, legal), tell the user you'll connect them with a human agent.
- Keep replies under 4 sentences unless the user asks for detail.
- If the user writes in Arabic, reply in Arabic. Otherwise reply in English.`;

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const geminiModel = genAI.getGenerativeModel({
  model: "gemini-2.5-flash",  // ✅ أحدث وحدود أحسن
  systemInstruction: AI_SYSTEM_PROMPT,
  generationConfig: {
    maxOutputTokens: 400,
    temperature: 0.7,
  },
});

async function generateAiReply(userId) {
  // هات آخر 20 رسالة بين المستخدم و الـ AI
  const history = await Message.find({
    $or: [
      { senderId: userId, receiverId: "ai" },
      { senderId: "ai", receiverId: userId },
    ],
  })
    .sort({ createdAt: 1 })
    .limit(20);

  if (history.length === 0) return null;

  // تحويل لصيغة Gemini
  let contents = history.map((m) => ({
    role: m.senderId === "ai" ? "model" : "user",
    parts: [{ text: String(m.message || "").slice(0, 2000) }],
  }));

  // Gemini محتاج التاريخ يبدأ بـ user role
  while (contents.length > 0 && contents[0].role !== "user") {
    contents.shift();
  }

  if (contents.length === 0) return null;

  const result = await geminiModel.generateContent({ contents });
  const reply = result.response.text().trim();

  return reply || null;
}

// ============ HTTP + Socket Server ============
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*" },
});

io.on("connection", (socket) => {
  console.log("✅ User Connected: " + socket.id);

  socket.on("join_room", (userId) => {
    socket.join(userId);
    console.log(`👤 User ${userId} joined their private room`);
  });

  socket.on("send_message", async (data) => {
    try {
      const { senderId, receiverId, message } = data;
      const target = receiverId || "ai";

      // 1) حفظ رسالة المستخدم
      const userMsg = new Message({
        senderId,
        receiverId: target,
        message,
      });
      await userMsg.save();

      // 2) echo رسالة المستخدم في غرفته
      io.to(senderId).emit("receive_message", {
        senderId,
        receiverId: target,
        message,
      });

      // 3) لو المستلم أدمن بشري، ابعتلوا وخلاص
      if (target !== "ai") {
        io.to(target).emit("receive_message", {
          senderId,
          receiverId: target,
          message,
        });
        console.log(`📩 Forwarded from ${senderId} to human ${target}`);
        return;
      }

      // 4) لو المستلم AI، ولّد الرد من Gemini
      io.to(senderId).emit("ai_typing", { typing: true });

      let reply;
      try {
        reply = await generateAiReply(senderId);
      } catch (aiErr) {
        console.error("❌ Gemini API error:", aiErr);
        reply =
          "Sorry, I'm having trouble right now. Please try again in a moment.";
      }

      io.to(senderId).emit("ai_typing", { typing: false });

      if (!reply) reply = "Sorry, I didn't catch that. Could you rephrase?";

      // 5) حفظ رد الـ AI
      const aiMsg = new Message({
        senderId: "ai",
        receiverId: senderId,
        message: reply,
      });
      await aiMsg.save();

      // 6) إرسال رد الـ AI للمستخدم
      io.to(senderId).emit("receive_message", {
        senderId: "ai",
        receiverId: senderId,
        message: reply,
      });

      console.log(`🤖 Gemini replied to ${senderId}`);
    } catch (err) {
      console.error("❌ Error in send_message:", err);
      if (data?.senderId) {
        io.to(data.senderId).emit("ai_typing", { typing: false });
      }
    }
  });

  socket.on("disconnect", () => {
    console.log("❌ User Disconnected");
  });
});

// ============ MongoDB + Server Start ============
const MONGO_URI = process.env.MONGO_URI;
if (!MONGO_URI) {
  console.error("❌ MONGO_URI is missing from environment variables");
  process.exit(1);
}

if (!process.env.GEMINI_API_KEY) {
  console.warn("⚠️ GEMINI_API_KEY is missing — AI replies will fail");
}

mongoose 
  .connect(MONGO_URI)
  .then(() => {
    console.log("✅ MongoDB Connected Successfully");

    const PORT = process.env.PORT || 3000;

    server.on("error", (e) => {
      if (e.code === "EADDRINUSE") {
        console.error(`⚠️ Port ${PORT} is busy.`);
        process.exit(1);
      }
    });

    server.listen(PORT, "0.0.0.0", () => {
      console.log(`🚀 Server & Socket ready at http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.log("❌ Mongo Connection Error:", err);
  });