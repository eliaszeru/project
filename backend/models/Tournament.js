const mongoose = require("mongoose");

const matchSchema = new mongoose.Schema({
  player1: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  player2: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  scheduledTime: { type: Date, required: true },
  result: {
    score: String,
    winner: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    approved: { type: Boolean, default: false },
    submittedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  status: {
    type: String,
    enum: ["pending", "completed", "ended"],
    default: "pending",
  },
});

const tournamentSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  admin: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  players: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  ],
  bracket: [matchSchema],
  status: {
    type: String,
    enum: ["pending", "active", "completed", "ended"],
    default: "pending",
  },
  currentRound: {
    type: Number,
    default: 1,
  },
  maxPlayers: {
    type: Number,
    default: 8,
  },
  startDate: {
    type: Date,
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  endedAt: {
    type: Date,
  },
  pendingPlayers: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  ],
});

const Tournament = mongoose.model("Tournament", tournamentSchema);
module.exports = Tournament;
