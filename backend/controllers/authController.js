const User = require("../models/User");
const jwt = require("jsonwebtoken");

// Generate JWT Token
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "24h",
  });
};

// Maximum number of allowed admin accounts
const MAX_ADMINS = 6;

// List of allowed admin emails and shared password
const ADMIN_EMAIL = "tournament.notify@gmail.com";
const ADMIN_SHARED_PASSWORD = "Project4admin";

// @desc    Register new user
// @route   POST /api/auth/register
// @access  Public
exports.register = async (req, res) => {
  try {
    const { username, email, password, userType } = req.body;
    console.log("REGISTER ATTEMPT:", { username, email, userType });

    // Check if user exists
    const userExists = await User.findOne({ email });
    console.log("User exists?", !!userExists);
    if (userExists) {
      return res.status(400).json({ message: "User already exists" });
    }

    // If registering as admin, check current admin count
    if (userType === "admin") {
      const adminCount = await User.countDocuments({ role: "admin" });
      console.log("Admin count:", adminCount);
      if (adminCount >= MAX_ADMINS) {
        return res.status(400).json({
          message: `Maximum number of admin accounts (${MAX_ADMINS}) has been reached`,
        });
      }
    }

    // Create user
    const user = await User.create({
      username,
      email,
      password,
      role: userType || "player", // default to player if no role specified
    });
    console.log("User created:", user.email);

    if (user) {
      res.status(201).json({
        _id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        token: generateToken(user._id),
      });
    }
  } catch (error) {
    console.error("REGISTER ERROR:", error);
    res.status(500).json({ message: "Server Error" });
  }
};

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Allow admin login with just email and password
    if (email === ADMIN_EMAIL && password === ADMIN_SHARED_PASSWORD) {
      return res.json({
        _id: "admin",
        username: "Admin",
        email: ADMIN_EMAIL,
        role: "admin",
        token: generateToken("admin"),
      });
    }

    // Find user
    const user = await User.findOne({ email });

    // Check if user exists and password matches
    if (user && (await user.matchPassword(password))) {
      res.json({
        _id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        token: generateToken(user._id),
      });
    } else {
      res.status(401).json({ message: "Invalid email or password" });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server Error" });
  }
};

// @desc    Check admin status
// @route   GET /api/auth/check-admin
// @access  Public
exports.checkAdmin = async (req, res) => {
  try {
    const adminCount = await User.countDocuments({ role: "admin" });
    res.json({
      currentAdmins: adminCount,
      maxAdmins: MAX_ADMINS,
      remainingSlots: Math.max(0, MAX_ADMINS - adminCount),
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server Error" });
  }
};
