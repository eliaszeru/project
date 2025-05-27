const mongoose = require("mongoose");

const pendingPlayerRequestSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
    unique: true,
  },
  requestedAt: {
    type: Date,
    default: Date.now,
  },
});

const PendingPlayerRequest = mongoose.model(
  "PendingPlayerRequest",
  pendingPlayerRequestSchema
);
module.exports = PendingPlayerRequest;
