// Tournament Management
class TournamentManager {
  constructor() {
    this.selectedPlayers = [];
    this.MAX_PLAYERS = 8;
    this.MIN_PLAYERS = 2;
    this.initializeEventListeners();
    this.fetchAndDisplayPendingResults();
  }

  initializeEventListeners() {
    const form = document.getElementById("tournamentForm");
    const createBtn = document.getElementById("createTournamentBtn");
    if (form) {
      form.addEventListener("submit", (e) => this.handleTournamentSubmit(e));
      form.addEventListener("input", () => {
        const name = document.getElementById("tournamentName").value;
        const date = document.getElementById("startDate").value;
        const time = document.getElementById("startTime").value;
        const limit = document.getElementById("playerLimit").value;
        createBtn.disabled = !(
          name &&
          date &&
          time &&
          ["2", "4", "8"].includes(limit)
        );
      });
    }
    if (document.getElementById("adminView")) {
      this.fetchAndDisplayTournaments();
    }
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
    const playerLimit = parseInt(
      document.getElementById("playerLimit").value,
      10
    );
    if (
      !tournamentName ||
      !startDate ||
      !startTime ||
      ![2, 4, 8].includes(playerLimit)
    ) {
      showError(
        "Please fill in all required fields and select a valid player limit."
      );
      return;
    }
    try {
      const response = await fetch(
        "https://tournament-project-668e.onrender.com/api/tournaments",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
          body: JSON.stringify({
            name: tournamentName,
            startDate,
            matchTime: `${startDate}T${startTime}`,
            maxPlayers: playerLimit,
          }),
        }
      );
      if (!response.ok) throw new Error("Failed to create tournament");
      showSuccess("Tournament created successfully!");
      document.getElementById("tournamentForm").reset();
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
    } catch (error) {
      showError("Failed to continue tournament. Please try again.");
    }
  }

  async fetchAndDisplayPendingResults() {
    const pendingList = document.getElementById("pending-results-list");
    if (!pendingList) return;
    pendingList.innerHTML = '<div class="loading">Loading...</div>';
    try {
      const response = await fetch(
        "https://tournament-project-668e.onrender.com/api/tournaments/pending-results",
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );
      if (!response.ok) throw new Error("Failed to fetch pending results");
      const results = await response.json();
      if (!results.length) {
        pendingList.innerHTML =
          '<div class="empty">No pending/conflicting results.</div>';
        return;
      }
      pendingList.innerHTML = results
        .map(
          (r) => `
          <div class="pending-result-item">
            <div class="pending-result-info">
              <b>${r.tournamentName}</b> (Round ${r.round})<br>
              <span>${r.player1.username || r.player1.email}:</span> <b>${
            r.player1Result
          }</b> (${r.player1Score || "-"})<br>
              <span>${r.player2.username || r.player2.email}:</span> <b>${
            r.player2Result
          }</b> (${r.player2Score || "-"})
            </div>
            <div class="pending-result-actions">
              <button onclick="tournamentManager.resolveResult('${
                r.tournamentId
              }','${r.matchId}','${r.player1._id}')">Approve ${
            r.player1.username || r.player1.email
          }</button>
              <button onclick="tournamentManager.resolveResult('${
                r.tournamentId
              }','${r.matchId}','${r.player2._id}')">Approve ${
            r.player2.username || r.player2.email
          }</button>
            </div>
          </div>
        `
        )
        .join("");
    } catch (error) {
      pendingList.innerHTML =
        '<div class="empty">Failed to load pending results.</div>';
    }
  }

  async resolveResult(tournamentId, matchId, winnerId) {
    if (!confirm("Are you sure you want to approve this winner?")) return;
    try {
      const response = await fetch(
        `https://tournament-project-668e.onrender.com/api/tournaments/${tournamentId}/approve-result`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
          body: JSON.stringify({ matchId, winnerId }),
        }
      );
      if (!response.ok) throw new Error("Failed to approve result");
      showSuccess("Result approved.");
      this.fetchAndDisplayPendingResults();
      this.fetchAndDisplayTournaments();
    } catch (error) {
      showError("Failed to approve result. Please try again.");
    }
  }
}

// Initialize tournament manager
const tournamentManager = new TournamentManager();
