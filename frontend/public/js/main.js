// Main application initialization
document.addEventListener("DOMContentLoaded", () => {
  // Initialize the application
  initApp();
  setupEventListeners();
});

function initApp() {
  // Check authentication state
  const isAuthenticated = checkAuthState();

  // Get main elements
  const mainContent = document.getElementById("mainContent");
  const loginView = document.getElementById("loginView");
  const navbar = document.querySelector(".navbar");

  if (isAuthenticated) {
    // User is logged in - show main content and navbar
    mainContent.style.display = "block";
    loginView.style.display = "none";
    navbar.style.display = "flex";

    // Initialize router to handle the current route
    router.handleRoute();
  } else {
    // User is not logged in - show login form
    mainContent.style.display = "none";
    loginView.style.display = "block";
    navbar.style.display = "none";
  }

  // Initialize theme
  initializeTheme();
}

function checkAuthState() {
  return !!localStorage.getItem("token");
}

function initializeTheme() {
  const themeToggle = document.getElementById("themeToggle");
  const lightText = document.querySelector(".light-text");
  const darkText = document.querySelector(".dark-text");

  // Check saved theme preference
  const savedTheme = localStorage.getItem("theme") || "light";
  document.documentElement.setAttribute("data-theme", savedTheme);
  updateThemeToggleButton(savedTheme === "dark");

  // Theme toggle click handler
  themeToggle.addEventListener("click", () => {
    const currentTheme = document.documentElement.getAttribute("data-theme");
    const newTheme = currentTheme === "light" ? "dark" : "light";

    // Add transition class
    document.documentElement.classList.add("theme-transition");

    // Update theme
    document.documentElement.setAttribute("data-theme", newTheme);
    localStorage.setItem("theme", newTheme);

    // Update button appearance
    updateThemeToggleButton(newTheme === "dark");

    // Add spin animation
    themeToggle.classList.add("theme-toggle-spin");

    // Remove transition class and spin animation after transition
    setTimeout(() => {
      document.documentElement.classList.remove("theme-transition");
      themeToggle.classList.remove("theme-toggle-spin");
    }, 500);
  });
}

function updateThemeToggleButton(isDark) {
  const lightText = document.querySelector(".light-text");
  const darkText = document.querySelector(".dark-text");

  if (isDark) {
    lightText.style.display = "none";
    darkText.style.display = "inline-block";
  } else {
    lightText.style.display = "inline-block";
    darkText.style.display = "none";
  }
}

function setupEventListeners() {
  // Logout functionality
  const logoutBtn = document.getElementById("logoutBtn");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", (e) => {
      e.preventDefault();
      handleLogout();
    });
  }

  // Mobile menu toggle
  const menuButton = document.querySelector(".menu-button");
  if (menuButton) {
    menuButton.addEventListener("click", toggleMenu);
  }
}

function handleLogout() {
  // Clear local storage
  localStorage.removeItem("token");
  localStorage.removeItem("userType");

  // Redirect to login
  window.location.href = "#login";

  // Hide header and main content
  document.querySelector(".main-header").style.display = "none";
  document.getElementById("mainContent").style.display = "none";
}

function toggleMenu() {
  const navLinks = document.getElementById("nav-links");
  if (navLinks) {
    navLinks.classList.toggle("active");
  }
}

// API calls
async function fetchTournaments() {
  try {
    const response = await fetch(
      "https://tournament-project-668e.onrender.com/api/tournaments",
      {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      }
    );

    if (!response.ok) throw new Error("Failed to fetch tournaments");

    const tournaments = await response.json();
    displayTournaments(tournaments);
  } catch (error) {
    console.error("Error fetching tournaments:", error);
    showError("Failed to load tournaments. Please try again later.");
  }
}

function displayTournaments(tournaments) {
  const container = document.getElementById("tournamentListView");
  const tournamentListContainer = document.querySelector("#tournamentListView");
  if (!container) return;

  // Always show the nav bar when viewing tournaments
  const navbar = document.querySelector(".navbar");
  if (navbar) navbar.style.display = "flex";

  // Always show the tournament list view
  container.style.display = "block";
  // Ensure hero background is applied
  tournamentListContainer.classList.add("hero-bg");
  tournamentListContainer.classList.remove("tournament-bg");

  if (!tournaments || tournaments.length === 0) {
    container.innerHTML = `
      <div class="tournament-empty-message">
        <h2>There are no available or ongoing tournaments now.</h2>
      </div>
    `;
    return;
  }

  const userEmail = localStorage.getItem("userEmail");
  container.innerHTML = `
    <div class="tournament-hero-content">
      <h1>Tournaments</h1>
      <div class="tournament-list-hero">
                    ${tournaments
                      .map(
                        (tournament) => `
              <div class="tournament-hero-item">
                <span class="tournament-hero-name">${tournament.name}</span>
                <span class="tournament-hero-date">${new Date(
                  tournament.startDate
                ).toLocaleDateString()}</span>
                <span class="tournament-hero-status">${tournament.status}</span>
                <button onclick="viewTournamentDetails('${
                  tournament._id
                }')">View Details</button>
                ${
                  tournament.status === "pending" &&
                  !(
                    tournament.players &&
                    tournament.players.some((p) => p.email === userEmail)
                  )
                    ? `<button onclick="joinTournament('${tournament._id}')">Join Tournament</button>`
                    : ""
                }
              </div>
                    `
                      )
                      .join("")}
      </div>
        </div>
    `;
}

async function viewTournamentDetails(tournamentId) {
  try {
    const response = await fetch(
      `https://tournament-project-668e.onrender.com/api/tournaments/${tournamentId}`,
      {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      }
    );

    if (!response.ok) throw new Error("Failed to fetch tournament details");

    const tournament = await response.json();
    displayTournamentDetails(tournament);
    // Show only the tournament details view
    document
      .querySelectorAll(".view")
      .forEach((v) => (v.style.display = "none"));
    document.getElementById("tournamentDetailsView").style.display = "block";
  } catch (error) {
    console.error("Error fetching tournament details:", error);
    showError("Failed to load tournament details. Please try again later.");
  }
}

function displayTournamentDetails(tournament) {
  const container = document.getElementById("tournamentDetailsView");
  if (!container) return;

  // DEBUG: Show raw tournament data at the top of the page
  let debugBox = document.getElementById("debug-tournament-raw");
  if (!debugBox) {
    debugBox = document.createElement("pre");
    debugBox.id = "debug-tournament-raw";
    debugBox.style.background = "#222";
    debugBox.style.color = "#fff";
    debugBox.style.padding = "1rem";
    debugBox.style.margin = "1rem 0";
    debugBox.style.overflow = "auto";
    debugBox.style.maxHeight = "300px";
    debugBox.style.fontSize = "0.9rem";
    debugBox.style.border = "2px solid #f39c12";
    debugBox.style.zIndex = 9999;
    container.parentElement.insertBefore(debugBox, container);
  }
  debugBox.textContent =
    "RAW TOURNAMENT DATA:\n" + JSON.stringify(tournament, null, 2);

  // Always show the nav bar when viewing tournament details
  const navbar = document.querySelector(".navbar");
  if (navbar) navbar.style.display = "flex";

  // Ensure hero background is applied
  container.classList.add("hero-bg");

  // Helper to get player name/email
  function getPlayerName(player) {
    if (!player) return "Unknown";
    if (typeof player === "object")
      return player.username || player.email || "Unknown";
    // fallback for id
    return player;
  }

  // Group matches by round
  const matches = tournament.bracket || [];
  const rounds = {};
  matches.forEach((match) => {
    const round = match.round || 1;
    if (!rounds[round]) rounds[round] = [];
    rounds[round].push(match);
  });

  let bracketHtml = "";
  Object.keys(rounds)
    .sort((a, b) => a - b)
    .forEach((round) => {
      bracketHtml += `<div class='bracket-section'><h3>Round ${round}</h3><div class='bracket-list'>`;
      bracketHtml += rounds[round]
        .map((match) => {
          const player1 = getPlayerName(match.player1);
          const player2 = getPlayerName(match.player2);
          const dateStr = match.scheduledTime
            ? new Date(match.scheduledTime).toLocaleString()
            : "TBD";
          let result = "";
          if (match.result && match.result.winner) {
            const winner = getPlayerName(match.result.winner);
            result = `<span class='match-winner'>(Winner: ${winner})</span>`;
          }
          return `<div class='bracket-match'><span class='match-pair'>${player1} <b>vs</b> ${player2}</span><span class='match-date'>${dateStr}</span>${result}</div>`;
        })
        .join("");
      bracketHtml += "</div></div>";
    });

  // Champion display
  let championHtml = "";
  if (tournament.status === "ended" && tournament.bracket) {
    // Find the last match with a winner
    const lastMatch = tournament.bracket
      .slice()
      .reverse()
      .find((m) => m.result && m.result.winner);
    if (lastMatch) {
      const champion = getPlayerName(lastMatch.result.winner);
      championHtml = `<div class='champion-message'><h2>Champion: ${champion}</h2></div>`;
    }
  }

  container.innerHTML = `
    <div class="tournament-hero-content">
      <h1>${tournament.name}</h1>
      <div class="tournament-hero-info">
        <p><strong>Start Date:</strong> ${new Date(
          tournament.startDate
        ).toLocaleDateString()}</p>
        <p><strong>Status:</strong> ${tournament.status}</p>
        <h3>Players</h3>
        <ul>
          ${tournament.players
            .map((player) => `<li>${player.email}</li>`)
            .join("")}
        </ul>
      </div>
      ${championHtml}
      ${bracketHtml}
    </div>
  `;
}

// Join Tournament handler
window.joinTournament = async function (tournamentId) {
  try {
    const response = await fetch(
      `https://tournament-project-668e.onrender.com/api/tournaments/${tournamentId}/join`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      }
    );
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Failed to join tournament");
    }
    showSuccess("Joined tournament!");
    fetchTournaments();
  } catch (error) {
    showError(error.message || "Could not join tournament.");
  }
};

// Error handling
function showError(message) {
  const errorDiv = document.createElement("div");
  errorDiv.className = "error fade-in";
  errorDiv.textContent = message;
  document.body.appendChild(errorDiv);
  setTimeout(() => errorDiv.remove(), 3000);
}

// Success message
function showSuccess(message) {
  const successDiv = document.createElement("div");
  successDiv.className = "success fade-in";
  successDiv.textContent = message;
  document.body.appendChild(successDiv);
  setTimeout(() => successDiv.remove(), 3000);
}

function showHomeView() {
  // Always show the nav bar when viewing home
  const navbar = document.querySelector(".navbar");
  if (navbar) navbar.style.display = "flex";
  document.getElementById("homeView").style.display = "block";
}
