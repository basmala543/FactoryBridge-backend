const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");

const app = express();

app.use(cors());
app.use(express.json());

// routes
const authRoutes = require("./routes/auth");
const factoryProfileRoutes = require("./routes/factoryProfile");
const brandProfileRoutes = require("./routes/brandProfile");
app.use("/api/brand", brandProfileRoutes);

app.use("/api/auth", authRoutes);
app.use("/api/factory", factoryProfileRoutes);

mongoose
  .connect(
    "mongodb+srv://basmala21102004_db_user:26AEes2axrSer11F@cluster0.qtldces.mongodb.net/factorybridge",
  )
  .then(() => {
    console.log("DB connected");

    app.listen(3000, () => {
      console.log("Server running on port 3000");
    });
  })
  .catch((err) => {
    console.log("Mongo Error:", err);
  });

