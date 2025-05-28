// Fetch and display pending player requests (waiting list)
async fetchPendingRequests() {
  try {
    const response = await fetch(
      "https://tournament-project-668e.onrender.com/api/tournaments/waiting-list",
      {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      }
    );
    if (!response.ok) throw new Error("Failed to fetch requests");
    const requests = await response.json();
    // DEBUG: Show the raw response in the admin dashboard
    const debugDiv = document.getElementById("pending-requests-debug");
    if (debugDiv) {
      debugDiv.textContent = JSON.stringify(requests, null, 2);
    }
    this.displayPendingRequests(requests);
  } catch (error) {
    document.getElementById(
      "pending-requests-list"
    ).innerHTML = `<div class='error'>Failed to load requests</div>`;
  }
}

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
      "https://tournament-project-668e.onrender.com/api/tournaments/create-from-waiting-list",
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