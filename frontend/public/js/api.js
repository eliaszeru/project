class ApiService {
  constructor() {
    this.API_URL = "https://tournament-project-668e.onrender.com/api";
  }

  getHeaders() {
    const token = localStorage.getItem("token");
    return {
      "Content-Type": "application/json",
      Authorization: token ? `Bearer ${token}` : "",
    };
  }

  async get(endpoint) {
    try {
      const response = await fetch(`${this.API_URL}${endpoint}`, {
        method: "GET",
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error(`GET ${endpoint} failed:`, error);
      throw error;
    }
  }

  async post(endpoint, data) {
    try {
      const response = await fetch(`${this.API_URL}${endpoint}`, {
        method: "POST",
        headers: this.getHeaders(),
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error(`POST ${endpoint} failed:`, error);
      throw error;
    }
  }

  async put(endpoint, data) {
    try {
      const response = await fetch(`${this.API_URL}${endpoint}`, {
        method: "PUT",
        headers: this.getHeaders(),
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error(`PUT ${endpoint} failed:`, error);
      throw error;
    }
  }

  async delete(endpoint) {
    try {
      const response = await fetch(`${this.API_URL}${endpoint}`, {
        method: "DELETE",
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error(`DELETE ${endpoint} failed:`, error);
      throw error;
    }
  }

  // Tournament specific methods
  async getTournaments() {
    return this.get("/tournaments");
  }

  async createTournament(tournamentData) {
    return this.post("/tournaments", tournamentData);
  }

  async getTournamentById(id) {
    return this.get(`/tournaments/${id}`);
  }

  async updateTournament(id, tournamentData) {
    return this.put(`/tournaments/${id}`, tournamentData);
  }

  async deleteTournament(id) {
    return this.delete(`/tournaments/${id}`);
  }

  // Player specific methods
  async getPlayerProfile() {
    return this.get("/players/profile");
  }

  async updatePlayerProfile(profileData) {
    return this.put("/players/profile", profileData);
  }

  async joinTournament(tournamentId) {
    return this.post(`/tournaments/${tournamentId}/join`);
  }

  // Match specific methods
  async submitMatchResult(matchId, resultData) {
    return this.post(`/matches/${matchId}/result`, resultData);
  }

  async getMatchesByTournament(tournamentId) {
    return this.get(`/tournaments/${tournamentId}/matches`);
  }
}

// Create a global instance of the API service
const api = new ApiService();
