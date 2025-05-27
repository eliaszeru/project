const mongoose = require("mongoose");

const waitingListSchema = new mongoose.Schema({
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

const WaitingList = mongoose.model("WaitingList", waitingListSchema);
module.exports = WaitingList;
