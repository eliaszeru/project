// Theme handling
const themeToggle = document.getElementById("themeToggle");
const lightText = themeToggle.querySelector(".light-text");
const darkText = themeToggle.querySelector(".dark-text");

// Check for saved theme preference or default to 'light'
const savedTheme = localStorage.getItem("theme") || "light";
document.documentElement.setAttribute("data-theme", savedTheme);
updateThemeToggleButton(savedTheme);

// Add transition class to body after initial load
setTimeout(() => {
  document.body.classList.add("theme-transition");
}, 100);

themeToggle.addEventListener("click", () => {
  const currentTheme = document.documentElement.getAttribute("data-theme");
  const newTheme = currentTheme === "light" ? "dark" : "light";

  // Add animation class
  themeToggle.classList.add("theme-toggle-spin");

  // Update theme with transition
  document.documentElement.setAttribute("data-theme", newTheme);
  localStorage.setItem("theme", newTheme);
  updateThemeToggleButton(newTheme);

  // Remove animation class after animation completes
  setTimeout(() => {
    themeToggle.classList.remove("theme-toggle-spin");
  }, 500);
});

function updateThemeToggleButton(theme) {
  if (theme === "dark") {
    lightText.style.display = "none";
    darkText.style.display = "inline";
    themeToggle.classList.add("dark-mode");
  } else {
    lightText.style.display = "inline";
    darkText.style.display = "none";
    themeToggle.classList.remove("dark-mode");
  }
}

// Check if user is logged in
document.addEventListener("DOMContentLoaded", () => {
  // Initialize auth manager
  const authManager = new AuthManager();
});

// Login and Registration Management
class AuthManager {
  constructor() {
    this.API_URL = "https://tournament-project-668e.onrender.com/api"; // Updated to Render backend URL
    this.initializeEventListeners();
    this.checkAuthState();
  }

  checkAuthState() {
    const token = localStorage.getItem("token");
    const navbar = document.querySelector(".navbar");
    const mainContent = document.getElementById("mainContent");
    const loginView = document.getElementById("loginView");
    const signupView = document.getElementById("signupView");

    if (token) {
      // User is logged in
      navbar.style.display = "flex";
      mainContent.style.display = "block";
      loginView.style.display = "none";
      signupView.style.display = "none";
    } else {
      // User is not logged in
      navbar.style.display = "none";
      mainContent.style.display = "none";
      loginView.style.display = "block";
      signupView.style.display = "none";
    }
  }

  initializeEventListeners() {
    // Form elements
    const loginForm = document.getElementById("loginForm");
    const signupForm = document.getElementById("signupForm");

    // Links for switching forms
    const loginLinks = document.querySelectorAll(".login-link");
    const signupLinks = document.querySelectorAll(".signup-link");

    // Logout button
    const logoutBtn = document.getElementById("logoutBtn");

    // Add form switch handlers
    loginLinks.forEach((link) => {
      link.addEventListener("click", (e) => {
        e.preventDefault();
        this.showLoginForm();
      });
    });

    signupLinks.forEach((link) => {
      link.addEventListener("click", (e) => {
        e.preventDefault();
        this.showSignupForm();
      });
    });

    // Add form submit handlers
    if (loginForm) {
      loginForm.addEventListener("submit", (e) => this.handleLogin(e));
    }

    if (signupForm) {
      signupForm.addEventListener("submit", (e) => this.handleSignup(e));
    }

    // Add logout handler
    if (logoutBtn) {
      logoutBtn.addEventListener("click", (e) => {
        e.preventDefault();
        this.handleLogout();
      });
    }

    // Add admin logout handler
    const adminLogoutBtn = document.getElementById("adminLogoutBtn");
    if (adminLogoutBtn) {
      adminLogoutBtn.addEventListener("click", (e) => {
        e.preventDefault();
        this.adminLogout();
      });
    }

    const adminLoginForm = document.getElementById("adminLoginForm");
    if (adminLoginForm) {
      adminLoginForm.addEventListener("submit", (e) =>
        this.handleAdminLogin(e)
      );
    }
  }

  showLoginForm() {
    document.getElementById("signupView").style.display = "none";
    document.getElementById("loginView").style.display = "block";
    document.querySelector(".navbar").style.display = "none";
  }

  showSignupForm() {
    document.getElementById("loginView").style.display = "none";
    document.getElementById("signupView").style.display = "block";
    document.querySelector(".navbar").style.display = "none";
  }

  showAdminLoginForm() {
    document.getElementById("loginView").style.display = "none";
    document.getElementById("signupView").style.display = "none";
    document.getElementById("adminLoginView").style.display = "block";
    document.querySelector(".navbar").style.display = "none";
  }

  async handleLogin(e) {
    e.preventDefault();

    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;
    const errorDiv = document.getElementById("userLoginError");
    errorDiv.style.display = "none";
    errorDiv.textContent = "";

    try {
      const response = await fetch(`${this.API_URL}/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (response.ok) {
        // Store auth data
        localStorage.setItem("token", data.token);
        localStorage.setItem("userEmail", email);
        if (data.name) localStorage.setItem("userName", data.name);
        if (data.userId) localStorage.setItem("userId", data.userId);

        // Show navbar and main content
        document.querySelector(".navbar").style.display = "flex";
        document.getElementById("mainContent").style.display = "block";
        document.getElementById("loginView").style.display = "none";

        // Navigate to home
        window.location.hash = "#home";

        this.showSuccess("Login successful!");
        errorDiv.style.display = "none";
        errorDiv.textContent = "";
      } else {
        errorDiv.style.display = "block";
        errorDiv.textContent =
          "This account is not registered or the password is incorrect.";
      }
    } catch (error) {
      console.error("Login error:", error);
      errorDiv.style.display = "block";
      errorDiv.textContent =
        "This account is not registered or the password is incorrect.";
    }
  }

  async handleSignup(e) {
    e.preventDefault();

    const name = document.getElementById("signupName").value;
    const email = document.getElementById("signupEmail").value;
    const password = document.getElementById("signupPassword").value;
    const confirmPassword = document.getElementById("confirmPassword").value;

    if (password !== confirmPassword) {
      this.showError("Passwords do not match!");
      return;
    }

    try {
      // First, try to register
      const registerResponse = await fetch(`${this.API_URL}/auth/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username: name,
          email,
          password,
        }),
      });

      const registerData = await registerResponse.json();

      if (!registerResponse.ok) {
        throw new Error(registerData.message || "Registration failed");
      }

      // If registration successful, automatically log in
      const loginResponse = await fetch(`${this.API_URL}/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });

      const loginData = await loginResponse.json();

      if (loginResponse.ok) {
        // Store auth data
        localStorage.setItem("token", loginData.token);
        localStorage.setItem("userEmail", email);
        localStorage.setItem("userName", name);
        if (loginData.userId) localStorage.setItem("userId", loginData.userId);

        // Show navbar and main content
        document.querySelector(".navbar").style.display = "flex";
        document.getElementById("mainContent").style.display = "block";
        document.getElementById("signupView").style.display = "none";

        // Navigate to home
        window.location.hash = "#home";

        this.showSuccess("Account created and logged in successfully!");
      } else {
        this.showError(
          "Account created but login failed. Please try logging in."
        );
        this.showLoginForm();
      }
    } catch (error) {
      console.error("Signup error:", error);
      this.showError(error.message || "Registration failed. Please try again.");
    }
  }

  handleLogout() {
    // Clear authentication data
    localStorage.removeItem("token");
    localStorage.removeItem("userEmail");
    localStorage.removeItem("userName");
    localStorage.removeItem("userId");
    localStorage.removeItem("isAdmin");

    // Hide navbar and main content, show login
    document.querySelector(".navbar").style.display = "none";
    document.getElementById("mainContent").style.display = "none";
    document.getElementById("loginView").style.display = "block";
    document.getElementById("signupView").style.display = "none";
    document.getElementById("adminView").style.display = "none";
    document.getElementById("adminLoginView").style.display = "none";

    // Reset forms
    document.getElementById("loginForm").reset();
    document.getElementById("signupForm").reset();

    // Show success message
    this.showSuccess("Logged out successfully!");
  }

  async handleAdminLogin(e) {
    e.preventDefault();
    const email = document.getElementById("adminEmail").value;
    const password = document.getElementById("adminPassword").value;
    const errorDiv = document.getElementById("adminLoginError");
    errorDiv.style.display = "none";
    errorDiv.textContent = "";
    try {
      const response = await fetch(`${this.API_URL}/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password, userType: "admin" }),
      });
      const data = await response.json();
      if (response.ok) {
        // Store auth data
        localStorage.setItem("token", data.token);
        localStorage.setItem("userEmail", email);
        localStorage.setItem("userName", data.username);
        localStorage.setItem("userId", data._id);
        localStorage.setItem("isAdmin", "true");
        // Show admin dashboard
        document.querySelector(".navbar").style.display = "flex";
        document.getElementById("mainContent").style.display = "block";
        document.getElementById("adminLoginView").style.display = "none";
        document.getElementById("adminView").style.display = "block";
        window.location.hash = "#admin";
        this.showSuccess("Admin login successful!");
        errorDiv.style.display = "none";
        errorDiv.textContent = "";
      } else {
        errorDiv.style.display = "block";
        errorDiv.textContent = "ONLY AUTHORIZED PEOPLE CAN LOGIN";
      }
    } catch (error) {
      console.error("Admin login error:", error);
      errorDiv.style.display = "block";
      errorDiv.textContent = "ONLY AUTHORIZED PEOPLE CAN LOGIN";
    }
  }

  adminLogout() {
    localStorage.removeItem("isAdmin");
    document.getElementById("adminView").style.display = "none";
    document.getElementById("adminLoginView").style.display = "block";
    this.showSuccess("Admin logged out successfully!");
  }

  showError(message) {
    const errorDiv = document.createElement("div");
    errorDiv.className = "error fade-in";
    errorDiv.textContent = message;
    document.body.appendChild(errorDiv);
    setTimeout(() => errorDiv.remove(), 3000);
  }

  showSuccess(message) {
    const successDiv = document.createElement("div");
    successDiv.className = "success fade-in";
    successDiv.textContent = message;
    document.body.appendChild(successDiv);
    setTimeout(() => successDiv.remove(), 3000);
  }
}
