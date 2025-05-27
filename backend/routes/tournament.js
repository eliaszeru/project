const express = require("express");
const router = express.Router();
const { protect, admin } = require("../middleware/auth");
const {
  createTournament,
  getTournaments,
  getTournamentById,
  joinTournament,
  endTournament,
  submitResult,
  approveResult,
  requestReschedule,
  respondToReschedule,
  getPreviousResults,
  getPlayerTournaments,
  getPendingResults,
  continueTournament,
  getPendingPlayerRequests,
  createTournamentFromPending,
  joinWaitingList,
  getWaitingList,
  createTournamentFromWaitingList,
} = require("../controllers/tournamentController");

// @route   POST /api/tournaments
// @desc    Create a new tournament
// @access  Private (Admin only)
router.post("/", protect, admin, createTournament);

// @route   GET /api/tournaments
// @desc    Get all tournaments
// @access  Public
router.get("/", getTournaments);

// @route   GET /api/tournaments/:id
// @desc    Get tournament by ID
// @access  Public
router.get("/:id", getTournamentById);

// @route   POST /api/tournaments/join
// @desc    Player requests to join a tournament (global pending)
// @access  Private (User only)
router.post("/join", protect, joinTournament);

// @route   POST /api/matches/:id/submit
// @desc    Submit a match result
// @access  Private (User only)
router.post("/matches/:id/submit", protect, submitResult);

// @route   POST /api/matches/:id/approve
// @desc    Approve a match result
// @access  Private (Admin only)
router.post("/matches/:id/approve", protect, admin, approveResult);

// @route   POST /api/tournaments/create
// @desc    Admin creates a tournament with selected players, date, and time
// @access  Private (Admin only)
router.post("/create", protect, admin, createTournament);

// @route   POST /api/tournaments/:id/end
// @desc    Admin ends a tournament
// @access  Private (Admin only)
router.post("/:id/end", protect, admin, endTournament);

// @route   POST /api/tournaments/:id/submit-result
// @desc    Player submits match result
// @access  Private (User only)
router.post("/:id/submit-result", protect, submitResult);

// @route   POST /api/tournaments/:id/approve-result
// @desc    Admin approves match result
// @access  Private (Admin only)
router.post("/:id/approve-result", protect, admin, approveResult);

// @route   GET /api/tournaments/previous/results
// @desc    Get previous results
// @access  Public
router.get("/previous/results", getPreviousResults);

// @route   GET /api/player/tournaments
// @desc    Get player's tournaments
// @access  Private (User only)
router.get("/player/tournaments", protect, getPlayerTournaments);

// @route   GET /api/tournaments/pending-results
// @desc    Get all pending match results for admin approval
// @access  Private (Admin only)
router.get("/pending-results", protect, admin, getPendingResults);

// @route   POST /api/tournaments/:id/continue
// @desc    Continue tournament to next round
// @access  Private (Admin only)
router.post("/:id/continue", protect, admin, continueTournament);

// @route   GET /api/tournaments/requests
// @desc    Get all pending player requests for tournaments
// @access  Private (Admin only)
router.get("/requests", protect, admin, getPendingPlayerRequests);

// @route   POST /api/tournaments/create-from-pending
// @desc    Admin creates a tournament from selected pending player requests
// @access  Private (Admin only)
router.post(
  "/create-from-pending",
  protect,
  admin,
  createTournamentFromPending
);

// Waiting list routes
// @route   POST /api/waiting-list/join
// @desc    Player joins the waiting list
// @access  Private (User only)
router.post("/waiting-list/join", protect, joinWaitingList);

// @route   GET /api/waiting-list
// @desc    Get all users in the waiting list
// @access  Private (Admin only)
router.get("/waiting-list", protect, admin, getWaitingList);

// @route   POST /api/tournaments/create-from-waiting-list
// @desc    Admin creates a tournament from waiting list
// @access  Private (Admin only)
router.post(
  "/create-from-waiting-list",
  protect,
  admin,
  createTournamentFromWaitingList
);

module.exports = router;
