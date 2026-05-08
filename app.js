const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
require("dotenv").config();

const app = express();

app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);
app.use(express.json());

// routes
const authRoutes = require("./routes/auth");
const factoryProfileRoutes = require("./routes/factoryProfile");
const brandProfileRoutes = require("./routes/brandProfile");
app.use("/api/brand", brandProfileRoutes);

app.use("/api/auth", authRoutes);
app.use("/api/factory", factoryProfileRoutes);
mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => {
    console.log("DB connected");

    app.listen(process.env.PORT || 3000, "0.0.0.0", () => {
      console.log("Server running on port " + (process.env.PORT || 3000));
    });
  })
  .catch((err) => {
    console.log("Mongo Error:", err);
  });
