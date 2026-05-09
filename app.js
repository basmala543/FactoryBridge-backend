const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const http = require("http"); 
const { Server } = require("socket.io"); 
require("dotenv").config();

// استدعاء الموديل الخاص بالرسائل (تأكدي من وجود الملف في models/Message.js)
const Message = require('./models/Message');

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

// Routes Setup
const authRoutes = require("./routes/auth");
const factoryProfileRoutes = require("./routes/factoryProfile");
const brandProfileRoutes = require("./routes/brandProfile");
const helpRoutes = require('./routes/help');

app.use("/api/brand", brandProfileRoutes);
app.use('/api/help', helpRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/factory", factoryProfileRoutes);

// 3. إعداد السيرفر ليدعم الـ Socket والـ HTTP مع بعض
const server = http.createServer(app); 
const io = new Server(server, {
  cors: { origin: "*" } 
});

// 4. منطق الـ Live Chat المطور (Rooms & Persistence)
io.on('connection', (socket) => {
  console.log('✅ User Connected: ' + socket.id);

  // أ) انضمام المستخدم لغرفة خاصة به (عشان الرسايل متبقاش عامة للكل)
  socket.on('join_room', (userId) => {
    socket.join(userId);
    console.log(`👤 User ${userId} joined their private room`);
  });

  // ب) استقبال وحفظ وإرسال الرسالة
  socket.on('send_message', async (data) => {
    try {
      const { senderId, receiverId, message } = data;

      // 1. حفظ الرسالة في الـ MongoDB
      const newMessage = new Message({
        senderId,
        receiverId: receiverId || 'admin', // لو مفيش مستلم محدد بتروح للأدمن
        message
      });
      await newMessage.save();

      // 2. إرسال الرسالة للمرسل والمستقبل فقط (نظام الغرف)
      io.to(senderId).to(receiverId).emit('receive_message', data);
      
      console.log(`📩 Message saved and sent from ${senderId} to ${receiverId}`);
    } catch (err) {
      console.error("❌ Error in send_message:", err);
    }
  });

  socket.on('disconnect', () => {
    console.log('❌ User Disconnected');
  });
});

// 5. الاتصال بالقاعدة وتشغيل السيرفر
const MONGO_URL = "mongodb://basmala21102004_db_user:bas21102004@ac-obtbhf4-shard-00-00.qtldces.mongodb.net:27017,ac-obtbhf4-shard-00-01.qtldces.mongodb.net:27017,ac-obtbhf4-shard-00-02.qtldces.mongodb.net:27017/factorybridge?ssl=true&replicaSet=atlas-6nucod-shard-0&authSource=admin&retryWrites=true&w=majority&appName=Cluster0";

mongoose
  .connect(MONGO_URL)
  .then(() => {
    console.log("✅ MongoDB Connected Successfully");

    const PORT = process.env.PORT || 3000;

    // التعامل مع خطأ البورت المشغول برمجياً
    server.on('error', (e) => {
      if (e.code === 'EADDRINUSE') {
        console.error(`⚠️ Port ${PORT} is busy. Please close other terminals or processes.`);
        process.exit(1); // يقفل السيرفر بدل ما يفضل "مهنج"
      }
    });

    server.listen(PORT, "0.0.0.0", () => {
      console.log(`🚀 Server & Socket ready at http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.log("❌ Mongo Connection Error:", err);
  });