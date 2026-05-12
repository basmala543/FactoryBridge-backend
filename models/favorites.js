const mongoose = require("mongoose");

const favoriteSchema = new mongoose.Schema({
  userId: String,
  factoryId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Factory",
  },
});

module.exports = mongoose.model("Favorite", favoriteSchema);