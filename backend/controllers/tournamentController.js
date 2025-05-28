const Tournament = require("../models/Tournament");
const Match = require("../models/Match");
const User = require("../models/User");
const nodemailer = require("nodemailer");
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// @desc    Create new tournament
// @route   POST /api/tournaments
// @access  Private (Admin only)
exports.createTournament = async (req, res) => {
  try {
    // Check for existing active tournament
    const activeTournament = await Tournament.findOne({ status: "active" });
    if (activeTournament) {
      return res.status(400).json({
        message:
          "An active tournament already exists. Please end it before creating a new one.",
      });
    }
    const { name, playerIds, startDate, matchTime } = req.body;
    if (!playerIds || playerIds.length < 2 || playerIds.length > 8) {
      return res.status(400).json({ message: "Select 2, 4, or 8 players." });
    }
    const tournament = await Tournament.findOne({ name, status: "pending" });
    if (!tournament) {
      return res.status(404).json({ message: "Pending tournament not found" });
    }
    // Only allow selected players who are in pendingPlayers
    const validPlayerIds = playerIds.filter((pid) =>
      tournament.pendingPlayers.map((id) => id.toString()).includes(pid)
    );
    if (validPlayerIds.length !== playerIds.length) {
      return res.status(400).json({
        message: "Some selected players are not in pending requests.",
      });
    }
    // Move selected players to players array
    tournament.players = validPlayerIds;
    tournament.pendingPlayers = [];
    // Shuffle and pair players
    const shuffled = shuffle([...validPlayerIds]);
    const matches = [];
    for (let i = 0; i < shuffled.length; i += 2) {
      if (shuffled[i + 1]) {
        matches.push({
          player1: shuffled[i],
          player2: shuffled[i + 1],
          scheduledTime: matchTime || startDate,
        });
      }
    }
    tournament.bracket = matches;
    tournament.status = "active";
    tournament.startDate = startDate;
    tournament.maxPlayers = validPlayerIds.length;
    await tournament.save();
    // Send email notifications to players about their first round match
    for (const match of matches) {
      const [player1, player2] = await Promise.all([
        User.findById(match.player1),
        User.findById(match.player2),
      ]);
      const dateStr = new Date(match.scheduledTime).toLocaleString();
      const subject = `Tournament Match Scheduled: ${name}`;
      const text1 = `Hello ${player1.username},\n\nYou have a tournament match scheduled!\nOpponent: ${player2.username}\nDate & Time: ${dateStr}\n\nGood luck!`;
      const text2 = `Hello ${player2.username},\n\nYou have a tournament match scheduled!\nOpponent: ${player1.username}\nDate & Time: ${dateStr}\n\nGood luck!`;
      await sendEmail(player1.email, subject, text1);
      await sendEmail(player2.email, subject, text2);
    }
    res.status(201).json(tournament);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server Error" });
  }
};

// @desc    Get all tournaments
// @route   GET /api/tournaments
// @access  Public
exports.getTournaments = async (req, res) => {
  try {
    const tournaments = await Tournament.find({ status: { $ne: "ended" } })
      .populate("players", "username email")
      .populate(
        "bracket.player1 bracket.player2 bracket.result.winner",
        "username email"
      );
    res.json(tournaments);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server Error" });
  }
};

// @desc    Get tournament by ID
// @route   GET /api/tournaments/:id
// @access  Public
exports.getTournamentById = async (req, res) => {
  try {
    const tournament = await Tournament.findById(req.params.id)
      .populate("admin", "username email")
      .populate("players", "username email");

    if (!tournament) {
      return res.status(404).json({ message: "Tournament not found" });
    }

    res.json(tournament);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server Error" });
  }
};

// @desc    Join tournament (global pending request)
// @route   POST /api/tournaments/join
// @access  Private
exports.joinTournament = async (req, res) => {
  try {
    const tournament = await Tournament.findById(req.params.id);
    if (!tournament) {
      return res.status(404).json({ message: "Tournament not found" });
    }
    if (tournament.status !== "pending") {
      return res
        .status(400)
        .json({ message: "Tournament is not open for joining" });
    }
    if (tournament.players.length >= tournament.maxPlayers) {
      return res.status(400).json({ message: "Tournament is full" });
    }
    if (tournament.players.includes(req.user._id)) {
      return res
        .status(400)
        .json({ message: "You have already joined this tournament" });
    }
    tournament.players.push(req.user._id);
    // If full, start tournament and create matches
    if (tournament.players.length === tournament.maxPlayers) {
      tournament.status = "active";
      // Shuffle and pair players
      const shuffled = shuffle([...tournament.players]);
      const matches = [];
      for (let i = 0; i < shuffled.length; i += 2) {
        if (shuffled[i + 1]) {
          matches.push({
            player1: shuffled[i],
            player2: shuffled[i + 1],
            scheduledTime: tournament.startDate,
          });
        }
      }
      tournament.bracket = matches;
    }
    await tournament.save();
    res.json({ message: "Joined tournament" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server Error" });
  }
};

// Helper function to start tournament and create first round matches
async function startTournament(tournamentId) {
  try {
    const tournament = await Tournament.findById(tournamentId);
    if (!tournament) return;

    // Shuffle players array for random matchups
    const players = [...tournament.players];
    for (let i = players.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [players[i], players[j]] = [players[j], players[i]];
    }

    // Create matches for first round
    for (let i = 0; i < players.length; i += 2) {
      await Match.create({
        tournament: tournamentId,
        round: 1,
        player1: players[i],
        player2: players[i + 1],
      });
    }

    tournament.status = "active";
    tournament.currentRound = 1;
    await tournament.save();
  } catch (error) {
    console.error("Error starting tournament:", error);
  }
}

// Admin: End tournament
exports.endTournament = async (req, res) => {
  try {
    const tournament = await Tournament.findById(req.params.id);
    if (!tournament)
      return res.status(404).json({ message: "Tournament not found" });
    tournament.status = "ended";
    tournament.endedAt = new Date();
    await tournament.save();
    res.json({ message: "Tournament ended" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server Error" });
  }
};

// Player: Submit match result
exports.submitResult = async (req, res) => {
  try {
    const { matchId, outcome, score } = req.body;
    const tournament = await Tournament.findById(req.params.id);
    if (!tournament)
      return res.status(404).json({ message: "Tournament not found" });
    const match = tournament.bracket.id(matchId);
    if (!match) return res.status(404).json({ message: "Match not found" });
    // Determine if user is player1 or player2
    const isPlayer1 = match.player1.toString() === req.user._id.toString();
    const isPlayer2 = match.player2.toString() === req.user._id.toString();
    if (!isPlayer1 && !isPlayer2) {
      return res
        .status(403)
        .json({ message: "Not authorized to submit result for this match" });
    }
    // Update match with result
    if (isPlayer1) {
      match.player1Result = outcome;
      match.player1Score = score;
      match.player1Submitted = true;
    } else {
      match.player2Result = outcome;
      match.player2Score = score;
      match.player2Submitted = true;
    }
    await tournament.save();
    // If both players submitted and results match, auto-approve
    if (match.player1Submitted && match.player2Submitted) {
      if (
        (match.player1Result === "win" && match.player2Result === "lose") ||
        (match.player1Result === "lose" && match.player2Result === "win")
      ) {
        match.winner = isPlayer1 ? match.player1 : match.player2;
        match.status = "completed";
        match.result = {
          score,
          winner: match.winner,
          approved: true,
          submittedBy: req.user._id,
        };
        await tournament.save();
        return res.json({ message: "Result auto-approved.", match });
      }
    }
    await tournament.save();
    res.json({
      message: "Result submitted, waiting for admin approval.",
      match,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server Error" });
  }
};

// Admin: Approve match result
exports.approveResult = async (req, res) => {
  try {
    const { matchId } = req.body;
    const tournament = await Tournament.findById(req.params.id);
    if (!tournament)
      return res.status(404).json({ message: "Tournament not found" });
    const match = tournament.bracket.id(matchId);
    if (!match) return res.status(404).json({ message: "Match not found" });
    match.result.approved = true;
    match.status = "completed";
    await tournament.save();
    res.json({ message: "Result approved." });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server Error" });
  }
};

// Get previous results (user view)
exports.getPreviousResults = async (req, res) => {
  try {
    const tournaments = await Tournament.find({ status: "ended" })
      .populate("players", "username email")
      .populate(
        "bracket.player1 bracket.player2 bracket.result.winner",
        "username email"
      );
    res.json(tournaments);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server Error" });
  }
};

// @desc    Get tournaments for the logged-in player
// @route   GET /api/player/tournaments
// @access  Private
exports.getPlayerTournaments = async (req, res) => {
  try {
    const tournaments = await Tournament.find({
      players: req.user._id,
      status: { $ne: "ended" },
    })
      .populate("players", "username email")
      .populate(
        "bracket.player1 bracket.player2 bracket.result.winner",
        "username email"
      );
    res.json(tournaments);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server Error" });
  }
};

// Helper: shuffle array
function shuffle(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

// @desc    Get all global pending player requests
// @route   GET /api/tournaments/requests
// @access  Private (Admin only)
exports.getPendingPlayerRequests = async (req, res) => {
  try {
    const requests = await PendingPlayerRequest.find().populate(
      "user",
      "username email"
    );
    res.json(
      requests.map((r) => ({
        _id: r.user._id,
        username: r.user.username,
        email: r.user.email,
        requestedAt: r.requestedAt,
      }))
    );
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server Error" });
  }
};

// @desc    Admin creates a tournament from selected pending player requests
// @route   POST /api/tournaments/create-from-pending
// @access  Private (Admin only)
exports.createTournamentFromPending = async (req, res) => {
  try {
    const { name, playerIds, startDate, matchTime } = req.body;
    if (!playerIds || playerIds.length < 2 || playerIds.length > 8) {
      return res.status(400).json({ message: "Select 2, 4, or 8 players." });
    }
    // Remove selected players from pending requests
    await PendingPlayerRequest.deleteMany({ user: { $in: playerIds } });
    // Shuffle and pair players
    const shuffled = shuffle([...playerIds]);
    const matches = [];
    for (let i = 0; i < shuffled.length; i += 2) {
      if (shuffled[i + 1]) {
        matches.push({
          player1: shuffled[i],
          player2: shuffled[i + 1],
          scheduledTime: matchTime || startDate,
        });
      }
    }
    const tournament = await Tournament.create({
      name,
      admin: req.user._id,
      players: playerIds,
      bracket: matches,
      status: "active",
      startDate,
      maxPlayers: playerIds.length,
    });
    // Send email notifications to players about their first round match
    for (const match of matches) {
      const [player1, player2] = await Promise.all([
        User.findById(match.player1),
        User.findById(match.player2),
      ]);
      const dateStr = new Date(match.scheduledTime).toLocaleString();
      const subject = `Tournament Match Scheduled: ${name}`;
      const text1 = `Hello ${player1.username},\n\nYou have a tournament match scheduled!\nOpponent: ${player2.username}\nDate & Time: ${dateStr}\n\nGood luck!`;
      const text2 = `Hello ${player2.username},\n\nYou have a tournament match scheduled!\nOpponent: ${player1.username}\nDate & Time: ${dateStr}\n\nGood luck!`;
      await sendEmail(player1.email, subject, text1);
      await sendEmail(player2.email, subject, text2);
    }
    res.status(201).json(tournament);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server Error" });
  }
};

// Helper function to send emails
async function sendEmail(to, subject, text) {
  try {
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to,
      subject,
      text,
    });
  } catch (error) {
    console.error("Error sending email:", error);
  }
}
