import axios from 'axios';
import { Preferences } from '@capacitor/preferences';

const DEFAULT_SERVER_URL = import.meta.env?.VITE_API_URL || 'http://192.168.0.16:4000/api/v1';

// Determina si un host es IP de red local/loopback (permite http:// en LAN) o dominio remoto (fuerza https://)
const normalizeServerUrl = (rawUrl) => {
  let cleanUrl = (rawUrl || '').trim();
  if (!cleanUrl.startsWith('http://') && !cleanUrl.startsWith('https://')) {
    const isLocalHost = /^(localhost|127\.\d+\.\d+\.\d+|10\.\d+\.\d+\.\d+|192\.168\.\d+\.\d+|172\.(1[6-9]|2\d|3[0-1])\.\d+\.\d+)(:\d+)?(\/|$)/i.test(cleanUrl);
    cleanUrl = `${isLocalHost ? 'http' : 'https'}://${cleanUrl}`;
  }
  if (!cleanUrl.includes('/api/v1')) {
    cleanUrl = cleanUrl.endsWith('/') ? `${cleanUrl}api/v1` : `${cleanUrl}/api/v1`;
  }
  return cleanUrl;
};

// Función para obtener la URL del servidor almacenada o por defecto
export const getServerUrl = async () => {
  try {
    const { value } = await Preferences.get({ key: 'neofood_server_url' });
    return value || localStorage.getItem('neofood_server_url') || DEFAULT_SERVER_URL;
  } catch (e) {
    return localStorage.getItem('neofood_server_url') || DEFAULT_SERVER_URL;
  }
};

// Función para guardar la nueva URL del servidor
export const setServerUrl = async (url) => {
  const cleanUrl = normalizeServerUrl(url);
  
  try {
    await Preferences.set({ key: 'neofood_server_url', value: cleanUrl });
  } catch (e) {
    // Fallback
  }
  localStorage.setItem('neofood_server_url', cleanUrl);
  api.defaults.baseURL = cleanUrl;
  return cleanUrl;
};

// Instancia de Axios
const api = axios.create({
  baseURL: localStorage.getItem('neofood_server_url') || DEFAULT_SERVER_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

let unauthorizedCallback = null;

export const setOnUnauthorizedCallback = (cb) => {
  unauthorizedCallback = cb;
};

// Interceptor para inyectar token en cada solicitud
api.interceptors.request.use(async (config) => {
  try {
    let token = sessionStorage.getItem('neofood_token');
    
    if (!token) {
      try {
        const tokenPref = await Preferences.get({ key: 'neofood_token' });
        if (!token) token = tokenPref.value;
      } catch (err) {
        // Fallback
      }
    }

    if (!token) token = localStorage.getItem('neofood_token');

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  } catch (e) {
    console.error('Error in request interceptor:', e);
  }
  return config;
});

// Interceptor para manejo de respuestas y errores
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Sesión expirada o no autorizada
      sessionStorage.removeItem('neofood_token');
      sessionStorage.removeItem('neofood_user');
      sessionStorage.removeItem('neofood_tenant_id');
      localStorage.removeItem('neofood_token');
      localStorage.removeItem('neofood_user');
      Preferences.remove({ key: 'neofood_token' }).catch(() => {});
      Preferences.remove({ key: 'neofood_user' }).catch(() => {});
      if (typeof unauthorizedCallback === 'function') {
        unauthorizedCallback();
      }
    }
    return Promise.reject(error);
  }
);

// Probar conexión con el servidor
export const pingServer = async (testUrl) => {
  try {
    const url = normalizeServerUrl(testUrl || (await getServerUrl()));
    const res = await axios.get(`${url}/health`, { timeout: 4000 }).catch(() => {
      // Si no hay endpoint /health, probar con un get a auth
      return axios.get(`${url}/auth/login`, { timeout: 4000 });
    });
    return { ok: true, status: res.status };
  } catch (err) {
    // Si respondió 404 o 405 significa que el servidor sí está vivo y respondiendo
    if (err.response) {
      return { ok: true, status: err.response.status };
    }
    return { ok: false, message: 'No hay respuesta del servidor. Revisa la IP y el WiFi.' };
  }
};

export default api;
