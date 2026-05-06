const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");

const app = express();

app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
})); app.use(express.json());

// routes
const authRoutes = require("./routes/auth");
const factoryProfileRoutes = require("./routes/factoryProfile");
const brandProfileRoutes = require("./routes/brandProfile");
app.use("/api/brand", brandProfileRoutes);

app.use("/api/auth", authRoutes);
app.use("/api/factory", factoryProfileRoutes);
mongoose
  .connect(
    "mongodb://basmala21102004_db_user:bas21102004@ac-obtbhf4-shard-00-00.qtldces.mongodb.net:27017,ac-obtbhf4-shard-00-01.qtldces.mongodb.net:27017,ac-obtbhf4-shard-00-02.qtldces.mongodb.net:27017/factorybridge?ssl=true&replicaSet=atlas-6nucod-shard-0&authSource=admin&retryWrites=true&w=majority&appName=Cluster0"
  )
  .then(() => {
    console.log("DB connected");

    app.listen(3000, '0.0.0.0', () => {
      console.log("Server running on port 3000");
    });
  })
  .catch((err) => {
    console.log("Mongo Error:", err);
  });