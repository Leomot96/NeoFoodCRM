import axios from 'axios';
import { Preferences } from '@capacitor/preferences';

const DEFAULT_SERVER_URL = 'http://192.168.0.16:4000/api/v1';

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
  let cleanUrl = url.trim();
  if (!cleanUrl.startsWith('http://') && !cleanUrl.startsWith('https://')) {
    cleanUrl = `http://${cleanUrl}`;
  }
  if (!cleanUrl.includes('/api/v1')) {
    cleanUrl = cleanUrl.endsWith('/') ? `${cleanUrl}api/v1` : `${cleanUrl}/api/v1`;
  }
  
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

// Interceptor para inyectar token y tenant en cada solicitud
api.interceptors.request.use(async (config) => {
  try {
    let token = sessionStorage.getItem('neofood_token');
    let tenantId = sessionStorage.getItem('neofood_tenant_id');
    
    if (!token || !tenantId) {
      try {
        const tokenPref = await Preferences.get({ key: 'neofood_token' });
        if (!token) token = tokenPref.value;
        const tenantPref = await Preferences.get({ key: 'neofood_tenant_id' });
        if (!tenantId) tenantId = tenantPref.value;
      } catch (err) {
        // Fallback
      }
    }

    if (!token) token = localStorage.getItem('neofood_token');
    if (!tenantId) tenantId = localStorage.getItem('neofood_tenant_id');

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    if (tenantId) {
      config.headers['x-tenant-id'] = tenantId;
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
    let url = testUrl || (await getServerUrl());
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = `http://${url}`;
    }
    if (!url.includes('/api/v1')) {
      url = url.endsWith('/') ? `${url}api/v1` : `${url}/api/v1`;
    }
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
