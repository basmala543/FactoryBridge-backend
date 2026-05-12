const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const http = require("http");
const { Server } = require("socket.io");
const fetch = require("node-fetch");
require("dotenv").config();

// Models
const Message = require("./models/Message");

const app = express();

/* ---------------- MIDDLEWARE ---------------- */

app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.use(express.json());

/* ---------------- ROUTES ---------------- */

const authRoutes = require("./routes/auth");
const factoryProfileRoutes = require("./routes/factoryProfile");
const brandProfileRoutes = require("./routes/brandProfile");
const helpRoutes = require("./routes/help");

app.use("/api/brand", brandProfileRoutes);
app.use("/api/help", helpRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/factory", factoryProfileRoutes);

/* ---------------- SERVER + SOCKET ---------------- */

const server = http.createServer(app);

const io = new Server(server, {
  cors: { origin: "*" },
});

/* ---------------- CLAUDE FUNCTION ---------------- */

async function callClaude(message) {
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": process.env.CLAUDE_API_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 300,
      system:
        "You are a helpful support agent for FactoryBridge. Be concise and friendly.",
      messages: [{ role: "user", content: message }],
    }),
  });

  const data = await response.json();
  return data.content[0].text;
}

/* ---------------- SOCKET LOGIC ---------------- */

io.on("connection", (socket) => {
  console.log("✅ User Connected:", socket.id);

  // Join private room
  socket.on("join_room", (userId) => {
    socket.join(userId);
    console.log(`👤 User ${userId} joined room`);
  });

  // Send message
  socket.on("send_message", async (data) => {
    try {
      const { senderId, receiverId, message } = data;

      // Save user message
      const newMessage = new Message({
        senderId,
        receiverId: receiverId || "admin",
        message,
      });

      await newMessage.save();

      /* -------- AI RESPONSE -------- */

      if (receiverId === "admin" && senderId !== "admin") {
        let aiReply = "Sorry, I couldn't respond right now.";

        try {
          aiReply = await callClaude(message);
        } catch (error) {
          console.error("Claude Error:", error);
        }

        // Save AI message
        const aiMessage = new Message({
          senderId: "admin",
          receiverId: senderId,
          message: aiReply,
        });

        await aiMessage.save();

        // Send AI reply to user
        io.to(senderId).emit("receive_message", {
          senderId: "admin",
          receiverId: senderId,
          message: aiReply,
        });

        console.log("🤖 AI replied to", senderId);
      } else {
        // Normal chat
        io.to(senderId)
          .to(receiverId)
          .emit("receive_message", data);
      }

    } catch (err) {
      console.error("❌ Error in send_message:", err);
    }
  });

  socket.on("disconnect", () => {
    console.log("❌ User Disconnected");
  });
});

/* ---------------- DATABASE + START ---------------- */

const MONGO_URL = process.env.MONGO_URL;

mongoose
  .connect(MONGO_URL)
  .then(() => {
    console.log("✅ MongoDB Connected");

    const PORT = process.env.PORT || 3000;

    server.listen(PORT, "0.0.0.0", () => {
      console.log(`🚀 Server running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.log("❌ Mongo Error:", err);
  });