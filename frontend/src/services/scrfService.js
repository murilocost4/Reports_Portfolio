// src/services/csrfService.js
import api from "../api";

const CSRF_TOKEN_KEY = "csrf-token";

const csrfService = {
  getCsrfToken: () => {
    const cookieValue = document.cookie
      .split("; ")
      .find((row) => row.startsWith("XSRF-TOKEN="))
      ?.split("=")[1];

    if (cookieValue) return cookieValue;

    return localStorage.getItem(CSRF_TOKEN_KEY) || null;
  },

  setCsrfToken: (token) => {
    localStorage.setItem(CSRF_TOKEN_KEY, token);
  },

  clearCsrfToken: () => {
    localStorage.removeItem(CSRF_TOKEN_KEY);
    // Não podemos remover o cookie HTTP-only aqui
  },

  initializeCsrfToken: async () => {
    try {
      const response = await api.get("/csrf-token", {
        headers: { "X-CSRF-Skip": "true" },
        _skipCsrfProtection: true,
      });

      if (response.data?.csrfToken) {
        csrfService.setCsrfToken(response.data.csrfToken);
        return response.data.csrfToken;
      }
      throw new Error("No CSRF token received");
    } catch (error) {
      console.error("CSRF initialization failed:", error);
      throw error;
    }
  },

  refreshCsrfToken: async () => {
    try {
      const token = await csrfService.initializeCsrfToken();
      return token;
    } catch (error) {
      console.error("Failed to refresh CSRF token:", error);
      throw error;
    }
  },
  isCsrfError: (error) => {
    return (
      error?.response?.status === 403 &&
      error?.response?.data?.code === "EBADCSRFTOKEN"
    );
  },
};

export default csrfService;
