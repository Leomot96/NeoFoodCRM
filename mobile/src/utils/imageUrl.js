import api from '../services/api';

/**
 * Helper para resolver la URL completa de una imagen servida por el backend (fotos de productos, logos, etc.)
 * Funciona de forma transparente tanto en red local (IP), como en túneles (TryCloudflare) o en producción.
 */
export const getFullImageUrl = (path) => {
  if (!path) return null;
  if (path.startsWith('http://') || path.startsWith('https://') || path.startsWith('data:')) {
    return path;
  }

  // 1. Obtener la URL configurada para el servidor (desde api.defaults.baseURL o localStorage)
  const currentBase =
    api?.defaults?.baseURL ||
    localStorage.getItem('neofood_server_url') ||
    'http://192.168.0.16:4000/api/v1';

  // 2. Remover el sufijo '/api/v1' para obtener la raíz del servidor
  const serverRoot = currentBase.replace(/\/api\/v1\/?$/, '');

  // 3. Normalizar la ruta del archivo
  const cleanPath = path.startsWith('/') ? path : `/${path}`;

  return `${serverRoot}${cleanPath}`;
};

export default getFullImageUrl;
