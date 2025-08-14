import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter as Router } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import App from "./App";
import "./index.css";
import { initializeCSRF } from "./api";

const root = ReactDOM.createRoot(document.getElementById("root"));

// Initialize CSRF only if not on public route
const isPublicRoute = window.location.pathname.includes('/publico/') || 
                     window.location.pathname.includes('/termos') || 
                     window.location.pathname.includes('/privacidade') ||
                     window.location.pathname.includes('/erro');

if (isPublicRoute) {
  // Render immediately for public routes
  root.render(
    <Router>
      <App />
    </Router>
  );
} else {
  // Initialize CSRF for private routes
  initializeCSRF().then(() => {
    root.render(
      <Router>
        <App />
      </Router>
    );
  }).catch((error) => {
    console.error("Failed to initialize CSRF:", error);
    // Render anyway with error handling
    root.render(
      <Router>
        <App />
      </Router>
    );
  });
}
