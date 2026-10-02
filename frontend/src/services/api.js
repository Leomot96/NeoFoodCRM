import axios from 'axios';

// Usamos import.meta.env que es el estándar de Vite
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:4000/api/v1',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor para inyectar el Access Token en cada petición
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Interceptor para manejar errores globales
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // Si el token expira, limpiamos y redirigimos
      console.error('Sesión expirada o no autorizada');
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      // Opcional: window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;