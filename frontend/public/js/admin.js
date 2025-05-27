// Tournament Management
class TournamentManager {
  constructor() {
    this.selectedPlayers = [];
    this.MAX_PLAYERS = 8;
    this.MIN_PLAYERS = 2;
    this.initializeEventListeners();
  }

  initializeEventListeners() {
    // Form elements
    const form = document.getElementById("tournamentForm");
    const playerEmail = document.getElementById("playerEmail");
    const addPlayerBtn = document.getElementById("addPlayerBtn");
    const playerList = document.getElementById("player-list");
    const createBtn = document.getElementById("createTournamentBtn");

    if (form) {
      form.addEventListener("submit", (e) => this.handleTournamentSubmit(e));
    }

    if (addPlayerBtn) {
      addPlayerBtn.addEventListener("click", () => this.addPlayer());
    }

    // Listen for player selection changes
    document
      .getElementById("pending-requests-list")
      ?.addEventListener("change", (e) => {
        if (e.target.classList.contains("request-checkbox")) {
          this.togglePlayerSelection(e.target.value, e.target.checked);
        }
      });
    // Validate player count on every change
    form?.addEventListener("change", () => this.validatePlayerCount());

    // Initialize tournament list if we're on the admin view
    if (document.getElementById("adminView")) {
      this.fetchAndDisplayTournaments();
    }

    this.fetchPendingRequests();
    this.fetchPendingResults();
  }

  // Email validation helper
  isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  // Add player to tournament
  addPlayer() {
    const playerEmail = document.getElementById("playerEmail");
    const email = playerEmail.value.trim();

    if (!email || !this.isValidEmail(email)) {
      showError("Please enter a valid email address.");
      return;
    }

    if (this.selectedPlayers.includes(email)) {
      showError("This player is already added.");
      return;
    }

    if (this.selectedPlayers.length >= this.MAX_PLAYERS) {
      showError(`Maximum ${this.MAX_PLAYERS} players allowed.`);
      return;
    }

    this.selectedPlayers.push(email);
    this.updatePlayerList();
    playerEmail.value = "";

    // Show success message
    showSuccess("Player added successfully");
  }

  // Update the player list display
  updatePlayerList() {
    const playerList = document.getElementById("player-list");
    if (!playerList) return;

    playerList.innerHTML = "";
    this.selectedPlayers.forEach((email, index) => {
      const playerItem = document.createElement("div");
      playerItem.className = "player-item";
      playerItem.innerHTML = `
                <span>${email}</span>
                <button type="button" class="remove-player" data-index="${index}">
                    <i class="fas fa-times"></i>
                </button>
            `;

      // Add remove player handler
      playerItem
        .querySelector(".remove-player")
        .addEventListener("click", () => {
          this.selectedPlayers.splice(index, 1);
          this.updatePlayerList();
        });

      playerList.appendChild(playerItem);
    });
  }

  // Handle tournament form submission
  async handleTournamentSubmit(e) {
    e.preventDefault();
    const tournamentName = document.getElementById("tournamentName").value;
    const startDate = document.getElementById("startDate").value;
    const startTime = document.getElementById("startTime").value;
    if (!tournamentName || !startDate || !startTime) {
      showError("Please fill in all required fields.");
      return;
    }
    if (![2, 4, 8].includes(this.selectedPlayers.length)) {
      showError("Select 2, 4, or 8 players.");
      return;
    }
    const matchTime = `${startDate}T${startTime}`;
    try {
      const response = await fetch(
        "https://tournament-project-668e.onrender.com/api/tournaments/create",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
          body: JSON.stringify({
            name: tournamentName,
            playerIds: this.selectedPlayers,
            startDate,
            matchTime,
          }),
        }
      );
      if (!response.ok) throw new Error("Failed to create tournament");
      showSuccess("Tournament created successfully!");
      this.selectedPlayers = [];
      document.getElementById("tournamentForm").reset();
      this.fetchPendingRequests();
      this.fetchAndDisplayTournaments();
    } catch (error) {
      showError("Failed to create tournament. Please try again.");
    }
  }

  // Reset the form
  resetForm() {
    document.getElementById("tournamentForm").reset();
    this.selectedPlayers = [];
    this.updatePlayerList();
  }

  // Fetch and display tournaments
  async fetchAndDisplayTournaments() {
    try {
      const response = await fetch(
        "https://tournament-project-668e.onrender.com/api/tournaments",
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error("Failed to fetch tournaments");
      }

      const tournaments = await response.json();
      this.displayTournaments(tournaments);
    } catch (error) {
      console.error("Error fetching tournaments:", error);
      showError("Failed to load tournaments. Please try again.");
    }
  }

  // Display tournaments in the admin view
  displayTournaments(tournaments) {
    const container = document.getElementById("tournamentListView");
    if (!container) return;

    // Find the first active tournament (if any)
    const activeTournament = tournaments.find((t) => t.status === "active");
    const endedTournament = tournaments.find(
      (t) => t.status === "ended" && t.champion
    );
    let endButtonHtml = "";
    let continueHtml = "";
    let championHtml = "";
    this.selectedWinners = [];
    if (activeTournament) {
      const currentRound = activeTournament.currentRound || 1;
      const matches = activeTournament.bracket || [];
      const currentMatches = matches.filter((m) => m.round === currentRound);
      const allCompleted =
        currentMatches.length > 0 &&
        currentMatches.every((m) => m.status === "completed");
      // Only show continue if more than 1 match in current round
      if (allCompleted && currentMatches.length > 1) {
        // Gather all players in current round and their results
        const playerMap = {};
        currentMatches.forEach((m) => {
          [m.player1, m.player2].forEach((p) => {
            if (!playerMap[p._id]) {
              playerMap[p._id] = {
                _id: p._id,
                username: p.username,
                email: p.email,
                result: null,
              };
            }
          });
          // Mark winner
          if (m.result && m.result.winner) {
            playerMap[m.result.winner.toString()].result = "Winner";
            const loserId =
              m.player1._id === m.result.winner.toString()
                ? m.player2._id
                : m.player1._id;
            playerMap[loserId].result = "Loser";
          }
        });
        const players = Object.values(playerMap);
        const expectedCount = currentMatches.length / 2;
        continueHtml = `
          <form id="continueTournamentForm" style="display:block;margin-bottom:1rem;">
            <div style="margin-bottom:0.5rem;font-weight:600;">Select ${expectedCount} players to advance:</div>
            <div class="winner-selection-list">
              ${players
                .map(
                  (p) => `
                  <label class="winner-select-item">
                    <input type="checkbox" class="winner-checkbox" value="${
                      p._id
                    }" />
                    <span>${
                      p.username || p.email
                    } <span class="winner-result-label">(${
                    p.result || "-"
                  })</span></span>
                  </label>
                `
                )
                .join("")}
            </div>
            <label for="nextRoundTime" style="margin-right:0.5rem;">Next Round Time:</label>
            <input type="datetime-local" id="nextRoundTime" required style="margin-right:0.5rem;" />
            <button type="submit" class="continue-tournament-btn" disabled><i class="fas fa-forward"></i> Continue Tournament</button>
          </form>
        `;
      }
      endButtonHtml = `
        <button class="end-tournament-btn" onclick="tournamentManager.endTournament('${activeTournament._id}')">
          <i class="fas fa-stop"></i> End Tournament
        </button>
      `;
    } else if (endedTournament && endedTournament.champion) {
      // Show champion message if tournament ended and champion exists
      const champion = endedTournament.players.find(
        (p) =>
          p._id === endedTournament.champion || p === endedTournament.champion
      );
      championHtml = `<div class="champion-message"><h2>Champion: ${
        champion ? champion.username || champion.email : "Unknown"
      }</h2></div>`;
    }

    container.innerHTML = `
      <div class="tournament-list-container">
        <h2>Tournament Management</h2>
        ${championHtml}
        ${continueHtml}
        ${endButtonHtml}
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Start Date</th>
              <th>Players</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            ${tournaments
              .map(
                (tournament) => `
                  <tr>
                    <td>${tournament.name}</td>
                    <td>${new Date(
                      tournament.startDate
                    ).toLocaleDateString()}</td>
                    <td>${tournament.players.length} / ${this.MAX_PLAYERS}</td>
                    <td>${tournament.status}</td>
                    <td>
                      <button onclick="tournamentManager.viewTournament('${
                        tournament._id
                      }')" class="btn-view">
                        <i class="fas fa-eye"></i>
                      </button>
                      <button onclick="tournamentManager.deleteTournament('${
                        tournament._id
                      }')" class="btn-delete">
                        <i class="fas fa-trash"></i>
                      </button>
                    </td>
                  </tr>
                `
              )
              .join("")}
          </tbody>
        </table>
      </div>
    `;

    // Winner selection logic
    const continueForm = document.getElementById("continueTournamentForm");
    if (continueForm && activeTournament) {
      const checkboxes = continueForm.querySelectorAll(".winner-checkbox");
      const submitBtn = continueForm.querySelector(".continue-tournament-btn");
      const currentRound = activeTournament.currentRound || 1;
      const matches = activeTournament.bracket || [];
      const currentMatches = matches.filter((m) => m.round === currentRound);
      const expectedCount = currentMatches.length / 2;
      this.selectedWinners = [];
      checkboxes.forEach((cb) => {
        cb.addEventListener("change", () => {
          this.selectedWinners = Array.from(checkboxes)
            .filter((c) => c.checked)
            .map((c) => c.value);
          submitBtn.disabled = this.selectedWinners.length !== expectedCount;
        });
      });
      continueForm.addEventListener("submit", (e) => {
        e.preventDefault();
        const nextRoundTime = document.getElementById("nextRoundTime").value;
        if (!nextRoundTime) {
          showError("Please select a date and time for the next round.");
          return;
        }
        if (this.selectedWinners.length !== expectedCount) {
          showError(
            `Please select exactly ${expectedCount} players to advance.`
          );
          return;
        }
        this.continueTournament(
          activeTournament._id,
          nextRoundTime,
          this.selectedWinners
        );
      });
    }
  }

  // View tournament details
  async viewTournament(id) {
    try {
      const response = await fetch(
        `https://tournament-project-668e.onrender.com/api/tournaments/${id}`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error("Failed to fetch tournament details");
      }

      const tournament = await response.json();
      router.navigateTo("tournament-details");
      this.displayTournamentDetails(tournament);
    } catch (error) {
      console.error("Error fetching tournament details:", error);
      showError("Failed to load tournament details.");
    }
  }

  // Delete tournament
  async deleteTournament(id) {
    if (!confirm("Are you sure you want to delete this tournament?")) {
      return;
    }

    try {
      const response = await fetch(
        `https://tournament-project-668e.onrender.com/api/tournaments/${id}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error("Failed to delete tournament");
      }

      showSuccess("Tournament deleted successfully");
      this.fetchAndDisplayTournaments();
    } catch (error) {
      console.error("Error deleting tournament:", error);
      showError("Failed to delete tournament.");
    }
  }

  // Display tournament details
  displayTournamentDetails(tournament) {
    const container = document.getElementById("tournamentDetailsView");
    if (!container) return;

    container.innerHTML = `
            <div class="tournament-details">
                <h2>${tournament.name}</h2>
                <div class="tournament-info">
                    <p><strong>Start Date:</strong> ${new Date(
                      tournament.startDate
                    ).toLocaleDateString()}</p>
                    <p><strong>Status:</strong> ${tournament.status}</p>
                </div>
                <div class="players-section">
                    <h3>Players</h3>
                    <div class="players-grid">
                        ${tournament.players
                          .map(
                            (player) => `
                            <div class="player-card">
                                <div class="player-email">${player.email}</div>
                                <div class="player-status ${player.status.toLowerCase()}">${
                              player.status
                            }</div>
                            </div>
                        `
                          )
                          .join("")}
                    </div>
                </div>
                ${
                  tournament.matches
                    ? `
                    <div class="matches-section">
                        <h3>Matches</h3>
                        <div class="matches-grid">
                            ${tournament.matches
                              .map(
                                (match) => `
                                <div class="match-card">
                                    <div class="match-players">
                                        <span>${match.player1}</span>
                                        <span>vs</span>
                                        <span>${match.player2}</span>
                                    </div>
                                    <div class="match-score">
                                        ${
                                          match.score
                                            ? `${match.score.player1} - ${match.score.player2}`
                                            : "Pending"
                                        }
                                    </div>
                                </div>
                            `
                              )
                              .join("")}
                        </div>
                    </div>
                `
                    : ""
                }
            </div>
        `;
  }

  async fetchPendingRequests() {
    try {
      const response = await fetch(
        "https://tournament-project-668e.onrender.com/api/tournaments/requests",
        {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        }
      );
      if (!response.ok) throw new Error("Failed to fetch requests");
      const requests = await response.json();
      this.displayPendingRequests(requests);
    } catch (error) {
      document.getElementById(
        "pending-requests-list"
      ).innerHTML = `<div class='error'>Failed to load requests</div>`;
    }
  }

  displayPendingRequests(requests) {
    const container = document.getElementById("pending-requests-list");
    if (!container) return;
    container.innerHTML =
      requests.length === 0
        ? `<div class='empty'>No pending player requests.</div>`
        : requests
            .map(
              (req) => `
      <div class="request-item">
        <input type="checkbox" class="request-checkbox" value="${
          req._id
        }" id="req-${req._id}" />
        <label for="req-${req._id}">${req.username} (${req.email})${
                req.tournamentName
                  ? ` - <span style='color:#888'>${req.tournamentName}</span>`
                  : ""
              }</label>
      </div>
    `
            )
            .join("");
    this.selectedPlayers = [];
    this.validatePlayerCount();
  }

  togglePlayerSelection(playerId, checked) {
    if (checked) {
      if (!this.selectedPlayers.includes(playerId))
        this.selectedPlayers.push(playerId);
    } else {
      this.selectedPlayers = this.selectedPlayers.filter(
        (id) => id !== playerId
      );
    }
    this.validatePlayerCount();
  }

  validatePlayerCount() {
    const createBtn = document.getElementById("createTournamentBtn");
    const count = this.selectedPlayers.length;
    createBtn.disabled = ![2, 4, 8].includes(count);
  }

  async fetchPendingResults() {
    try {
      const response = await fetch(
        "https://tournament-project-668e.onrender.com/api/tournaments/pending-results",
        {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        }
      );
      if (!response.ok) throw new Error("Failed to fetch pending results");
      const results = await response.json();
      this.displayPendingResults(results);
    } catch (error) {
      document.getElementById(
        "pending-results-list"
      ).innerHTML = `<div class='error'>Failed to load pending results</div>`;
    }
  }

  displayPendingResults(results) {
    const container = document.getElementById("pending-results-list");
    if (!container) return;
    if (!results.length) {
      container.innerHTML = `<div class='empty'>No pending match results.</div>`;
      return;
    }
    container.innerHTML = results
      .map(
        (result) => `
      <div class="pending-result-item">
        <div class="pending-result-info">
          <strong>${result.tournamentName}</strong><br/>
          ${result.player1Name} vs ${result.player2Name}<br/>
          <span>Score: ${result.score}</span>
        </div>
        <div class="pending-result-actions">
          <button onclick="tournamentManager.approveResult('${result.tournamentId}', '${result.matchId}')">Approve</button>
        </div>
      </div>
    `
      )
      .join("");
  }

  async approveResult(tournamentId, matchId) {
    try {
      const response = await fetch(
        `https://tournament-project-668e.onrender.com/api/tournaments/${tournamentId}/approve-result`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
          body: JSON.stringify({ matchId }),
        }
      );
      if (!response.ok) throw new Error("Failed to approve result");
      showSuccess("Result approved!");
      this.fetchPendingResults();
      this.fetchAndDisplayTournaments();
    } catch (error) {
      showError("Failed to approve result. Please try again.");
    }
  }

  async endTournament(tournamentId) {
    if (!confirm("Are you sure you want to end this tournament?")) return;
    try {
      const response = await fetch(
        `https://tournament-project-668e.onrender.com/api/tournaments/${tournamentId}/end`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );
      if (!response.ok) throw new Error("Failed to end tournament");
      showSuccess("Tournament ended successfully.");
      this.fetchAndDisplayTournaments();
      this.fetchPendingRequests();
      this.fetchPendingResults();
    } catch (error) {
      showError("Failed to end tournament. Please try again.");
    }
  }

  async continueTournament(tournamentId, nextRoundTime, selectedWinners) {
    try {
      const response = await fetch(
        `https://tournament-project-668e.onrender.com/api/tournaments/${tournamentId}/continue`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
          body: JSON.stringify({ nextRoundTime, selectedWinners }),
        }
      );
      if (!response.ok) throw new Error("Failed to continue tournament");
      showSuccess("Next round scheduled!");
      this.fetchAndDisplayTournaments();
      this.fetchPendingRequests();
      this.fetchPendingResults();
    } catch (error) {
      showError("Failed to continue tournament. Please try again.");
    }
  }
}

// Initialize tournament manager
const tournamentManager = new TournamentManager();
