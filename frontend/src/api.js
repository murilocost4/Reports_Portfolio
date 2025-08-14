import axios from "axios";

const API_BASE_URL =
  process.env.NODE_ENV === "production"
    ? "https://sua_url.com/api"
    : "http://localhost:3000/api";

// CSRF Service
const csrfService = {
  getToken: () => {
    const token = localStorage.getItem("csrfToken");
    return token;
  },

  refreshToken: async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/csrf-token`, {
        withCredentials: true,
      });

      const token = response.data.csrfToken;
      localStorage.setItem("csrfToken", token);

      return token;
    } catch (error) {
      throw error;
    }
  },

  clearToken: () => {
    localStorage.removeItem("csrfToken");
  }
};

// Axios Instance
const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: {
    Accept: "application/json",
    "Content-Type": "application/json",
  },
});

// Request Interceptor
api.interceptors.request.use(async (config) => {
  // Skip CSRF and auth for these endpoints
  const excludedEndpoints = [
    "/csrf-token",
    "/auth/login",
    "/auth/refresh-token",
    "/auth/logout",
    "/publico/",  // Rotas públicas de laudo
  ];

  const isPublicRoute = excludedEndpoints.some((ep) => config.url.includes(ep));
  
  if (isPublicRoute) {
    return config;
  }

  // Add Authorization Bearer token for all protected requests
  const accessToken = localStorage.getItem("accessToken");
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }

  // Add CSRF token only for modifying requests (POST, PUT, PATCH, DELETE)
  if (
    ["post", "put", "patch", "delete"].includes(config.method.toLowerCase())
  ) {
    let token = csrfService.getToken();
    
    // **SE NÃO TEM TOKEN CSRF, OBTER UM NOVO**
    if (!token) {
      try {
        token = await csrfService.refreshToken();
      } catch (error) {
      }
    }
    
    if (token) {
      config.headers["X-CSRF-Token"] = token;
    } 
  }

  return config;
});

// Response Interceptor
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Handle CSRF token errors (múltiplas variações)
    const isCsrfError = error.response?.status === 403 && (
      error.response.data?.error === "Invalid CSRF token" ||
      error.response.data?.code === "EBADCSRFTOKEN" ||
      error.response.data?.error?.includes("CSRF") ||
      error.response.data?.message?.includes("csrf")
    );

    if (isCsrfError && !originalRequest._retry) {
      originalRequest._retry = true;
      
      try {
        // Limpar token antigo
        localStorage.removeItem("csrfToken");
        
        // Obter novo token
        const newToken = await csrfService.refreshToken();
        originalRequest.headers["X-CSRF-Token"] = newToken;
        
        return api(originalRequest);
      } catch (refreshError) {
        return Promise.reject(error);
      }
    }

    // Handle JWT token errors (401 Unauthorized)
    if (error.response?.status === 401 && !originalRequest._retry) {
      // Check if this is a public route
      const isPublicRoute = originalRequest.url?.includes('/publico/');
      
      if (!isPublicRoute) {
        // Clear invalid tokens and redirect to login
        localStorage.removeItem("accessToken");
        localStorage.removeItem("refreshToken");
        localStorage.removeItem("userInfo");
        localStorage.removeItem("csrfToken");
        
        // Only redirect if not already on login page
        if (!window.location.pathname.includes('/login')) {
          window.location.href = "/login?error=session_expired";
        }
      }
      return Promise.reject(error);
    }
    
    return Promise.reject(error);
  },
);

export const initializeCSRF = async () => {
  try {
    // Only initialize CSRF if not on a public route
    const isPublicRoute = window.location.pathname.includes('/publico/');
    if (!isPublicRoute) {
      await csrfService.refreshToken();
    }
  } catch (error) {
    // Don't throw error for public routes
    const isPublicRoute = window.location.pathname.includes('/publico/');
    if (!isPublicRoute) {
      throw error;
    }
  }
};

export default api;
