// Player Dashboard Management
class PlayerDashboard {
  constructor() {
    this.initializeEventListeners();
    this.userName = localStorage.getItem("userName");
    this.userEmail = localStorage.getItem("userEmail");
  }

  initializeEventListeners() {
    const resultForm = document.getElementById("resultForm");
    if (resultForm) {
      resultForm.addEventListener("submit", (e) => this.handleResultSubmit(e));
    }

    // Load player's tournaments when dashboard is shown
    document
      .getElementById("playerDashboardView")
      ?.addEventListener("show", () => {
        this.loadPlayerTournaments();
      });
  }

  async loadPlayerTournaments() {
    try {
      const response = await fetch(
        "https://tournament-project-668e.onrender.com/api/player/tournaments",
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );

      if (!response.ok) throw new Error("Failed to fetch tournaments");

      const tournaments = await response.json();
      this.displayTournaments(tournaments);
    } catch (error) {
      console.error("Error loading tournaments:", error);
      // Always show the 'not selected' message if there's an error
      this.displayTournaments([]);
      // Optionally show an error message to the user
      // showError("Failed to load your tournaments. Please try again.");
    }
  }

  displayTournaments(tournaments) {
    const container = document.getElementById("playerTournaments");
    const dashboardContainer = document.querySelector(".dashboard-container");
    if (!container) return;
    dashboardContainer.classList.add("player-bg");
    dashboardContainer.classList.remove("hero-bg");
    // Clear previous content
    while (container.firstChild) container.removeChild(container.firstChild);

    let isSelected = false;
    let selectedTournament = null;

    // Check if user is selected in any tournament and if tournament is ended
    tournaments.forEach((tournament) => {
      if (
        tournament.players &&
        tournament.players.some(
          (player) =>
            player.email === this.userEmail && player.status === "selected"
        )
      ) {
        // If tournament is ended, treat as not selected
        if (tournament.status === "ended") {
          isSelected = false;
          selectedTournament = null;
        } else {
          isSelected = true;
          selectedTournament = tournament;
        }
      }
    });

    // If not selected or tournament ended, show not selected message
    if (
      !isSelected ||
      (selectedTournament && selectedTournament.status === "ended")
    ) {
      const msgDiv = document.createElement("div");
      const h2 = document.createElement("h2");
      h2.textContent = "You are not selected as a player as of now.";
      h2.style.fontSize = "2.2rem";
      h2.style.fontWeight = "bold";
      h2.style.textAlign = "center";
      msgDiv.appendChild(h2);
      container.appendChild(msgDiv);
      return;
    }

    // If selected and tournament is active, show tournament info and match section
    if (selectedTournament && selectedTournament.status === "active") {
      const tournamentDiv = document.createElement("div");
      tournamentDiv.className = "player-tournament-info";
      tournamentDiv.innerHTML = `
        <h2>Current Tournament: ${selectedTournament.name || "Tournament"}</h2>
        <div class="match-results">
          ${this.getMatchSection(selectedTournament)}
        </div>
      `;
      container.appendChild(tournamentDiv);
    }
  }

  getMatchSection(tournament) {
    if (!tournament.matches) return "";
    // Only show form if tournament is active
    if (tournament.status !== "active")
      return "<div class='match-info'><p>No pending matches</p></div>";

    const currentMatch = tournament.matches.find(
      (match) =>
        (match.player1.email === this.userEmail ||
          match.player2.email === this.userEmail) &&
        !match.score
    );

    if (!currentMatch) {
      return `
        <div class="match-info">
          <p>No pending matches</p>
        </div>
      `;
    }

    const isPlayer1 = currentMatch.player1.email === this.userEmail;
    const opponent = isPlayer1 ? currentMatch.player2 : currentMatch.player1;

    return `
      <div class="match-info">
        <h5>Current Match</h5>
        <div class="match-players">
          <span class="current-player">${
            isPlayer1 ? "You" : opponent.name
          }</span>
          <span>vs</span>
          <span class="opponent">${isPlayer1 ? opponent.name : "You"}</span>
        </div>
        <form class="score-form" onsubmit="playerDashboard.submitScore(event, '${
          tournament._id
        }', '${currentMatch._id}')">
          <div class="score-inputs">
            <div class="score-input">
              <label>Your Score</label>
              <input type="number" min="0" required name="playerScore">
            </div>
            <div class="score-input">
              <label>${opponent.name}'s Score</label>
              <input type="number" min="0" required name="opponentScore">
            </div>
          </div>
          <button type="submit" class="submit-btn">Submit Score</button>
        </form>
      </div>
    `;
  }

  async submitScore(event, tournamentId, matchId) {
    event.preventDefault();
    const form = event.target;
    const playerScore = parseInt(form.playerScore.value);
    const opponentScore = parseInt(form.opponentScore.value);

    try {
      const response = await fetch(
        `https://tournament-project-668e.onrender.com/api/tournaments/${tournamentId}/matches/${matchId}/score`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
          body: JSON.stringify({
            playerScore,
            opponentScore,
            playerName: this.userName,
          }),
        }
      );

      if (!response.ok) throw new Error("Failed to submit score");

      showSuccess("Score submitted successfully! Waiting for admin approval.");
      await this.loadPlayerTournaments(); // Refresh the tournaments display
      // After refresh, check if still selected
      const tournaments = await fetch(
        "https://tournament-project-668e.onrender.com/api/player/tournaments",
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      ).then((r) => r.json());
      let isSelected = false;
      tournaments.forEach((tournament) => {
        if (
          tournament.players.some(
            (player) =>
              player.email === this.userEmail && player.status === "selected"
          )
        ) {
          isSelected = true;
        }
      });
      if (!isSelected) {
        document.querySelector(".match-results").style.display = "none";
      }
    } catch (error) {
      console.error("Error submitting score:", error);
      showError("Failed to submit score. Please try again.");
    }
  }

  async handleResultSubmit(e) {
    e.preventDefault();
    // Additional result submission logic if needed
  }
}

// Initialize player dashboard
const playerDashboard = new PlayerDashboard();

function renderSubmitResultForm(match) {
  const form = document.createElement("form");
  form.className = "submit-result-form";
  form.innerHTML = `
    <label>Match Result:</label><br>
    <input type="radio" name="outcome" value="win" required> I won<br>
    <input type="radio" name="outcome" value="lose" required> I lost<br>
    <label>Score:</label>
    <input type="text" name="score" placeholder="e.g. 1-0" required><br>
    <button type="submit">Submit Result</button>
  `;
  form.onsubmit = async (e) => {
    e.preventDefault();
    const outcome = form.elements["outcome"].value;
    const score = form.elements["score"].value;
    try {
      const response = await fetch(
        `https://tournament-project-668e.onrender.com/api/tournaments/${match.tournamentId}/submit-result`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
          body: JSON.stringify({ matchId: match._id, outcome, score }),
        }
      );
      if (!response.ok) throw new Error("Failed to submit result");
      showSuccess("Result submitted!");
      // Optionally refresh the dashboard
    } catch (error) {
      showError("Could not submit result.");
    }
  };
  return form;
}
