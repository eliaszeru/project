window.joinTournament = async function (tournamentId) {
  try {
    const response = await fetch(
      "https://tournament-project-668e.onrender.com/api/tournaments/waiting-list/join",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      }
    );
    if (!response.ok) throw new Error("Failed to join tournament");
    showSuccess("Request to join tournament sent!");
    // Redirect to tournaments page after join
    if (typeof router !== "undefined") {
      router.navigateTo("tournaments");
    }
    fetchTournaments();
  } catch (error) {
    showError("Could not join tournament.");
  }
};
