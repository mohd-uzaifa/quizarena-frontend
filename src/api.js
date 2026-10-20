import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || "http://localhost:8080/api",
  headers: {
    "Content-Type": "application/json",
  },
});

// Interceptor: automatically attach JWT Bearer token if present
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("qa_token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Interceptor: handle 401 Unauthorized (expired or invalid token)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      localStorage.removeItem("qa_token");
      localStorage.removeItem("qa_teacher");
    }
    return Promise.reject(error);
  }
);

export default api;