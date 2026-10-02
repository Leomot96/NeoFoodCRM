/**
 * Helper para resolver la URL completa de una imagen servida por el backend o externa.
 */
export const getFullImageUrl = (path) => {
  if (!path) return null;
  if (path.startsWith('http://') || path.startsWith('https://') || path.startsWith('data:')) {
    return path;
  }
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:4000/api/v1';
  const backendBase = apiUrl.replace(/\/api\/v1\/?$/, '');
  return `${backendBase}${path.startsWith('/') ? '' : '/'}${path}`;
};

export default getFullImageUrl;
