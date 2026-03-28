import axios from 'axios';

const SESSION_STORAGE_KEY = 'fingenie_access_session_v1';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000/api',
  timeout: 20000,
});

api.interceptors.request.use((config) => {
  if (typeof window === 'undefined') {
    return config;
  }

  try {
    const raw = window.localStorage.getItem(SESSION_STORAGE_KEY);
    const token = raw ? JSON.parse(raw)?.accessToken : null;
    if (token) {
      config.headers = config.headers || {};
      config.headers.Authorization = `Bearer ${token}`;
    }
  } catch {
    return config;
  }

  return config;
});

export default api;
