const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const connectDB = require("./config/db");
const WaitingList = require("./models/WaitingList");

// Import routes
const authRoutes = require("./routes/auth");
const tournamentRoutes = require("./routes/tournament");

// Load environment variables
dotenv.config();
console.log("MONGODB_URI:", process.env.MONGODB_URI);
console.log("NODE_ENV:", process.env.NODE_ENV);

// Connect to MongoDB
connectDB();

// Create Express app
const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Use API prefix from environment or default to '/api'
const API_PREFIX = process.env.API_PREFIX || "/api";

// Routes
app.get("/", (req, res) => {
  res.json({ message: "Tournament Management API" });
});

// Use routes
app.use(`${API_PREFIX}/auth`, authRoutes);
app.use(`${API_PREFIX}/tournaments`, tournamentRoutes);

// Debug route to see all waiting list entries (no auth for quick test)
app.get("/api/debug-waiting-list", async (req, res) => {
  try {
    const list = await WaitingList.find().populate("user", "username email");
    res.json(list);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
