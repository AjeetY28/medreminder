import axios from 'axios';

const API = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Attach Authorization Bearer token automatically if present in localStorage
API.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('admin_token');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Intercept unauthorized response errors and force session logs cleanup
API.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      logger_warn_session_expired();
      localStorage.removeItem('admin_token');
      localStorage.removeItem('admin_user');
      // If we are not on the login page already, redirect there
      if (!window.location.pathname.endsWith('/login')) {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

function logger_warn_session_expired() {
  console.warn('Session expired or unauthorized request. Clearing auth credentials.');
}

export default API;
