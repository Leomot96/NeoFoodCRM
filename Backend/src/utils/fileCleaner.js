const fs = require('fs');
const path = require('path');

/**
 * Elimina de manera segura un archivo local subido dado su path relativo o URL
 * Ej: /uploads/products/prod_xxx.png o /uploads/store/logo_xxx.png
 */
function deleteUploadedFile(relativeUrl) {
  if (!relativeUrl || typeof relativeUrl !== 'string') return;
  
  // Si es una URL externa (http/https) o blob/data URI, no intentamos borrar localmente
  if (relativeUrl.startsWith('http://') || relativeUrl.startsWith('https://') || relativeUrl.startsWith('data:')) {
    return;
  }

  try {
    // Normalizar ruta: quitar query strings o slash inicial
    const cleanPath = relativeUrl.split('?')[0].replace(/^\/+/, '');
    
    // Solo permitir borrar archivos dentro de la carpeta uploads
    if (!cleanPath.startsWith('uploads/')) return;

    const fullPath = path.resolve(__dirname, '../../', cleanPath);
    
    // Verificación de seguridad para no salirse de la carpeta de uploads
    const uploadsRoot = path.resolve(__dirname, '../../uploads');
    if (!fullPath.startsWith(uploadsRoot)) return;

    if (fs.existsSync(fullPath)) {
      fs.unlinkSync(fullPath);
      console.log(`[FileCleaner] Archivo físico eliminado: ${cleanPath}`);
    }
  } catch (error) {
    console.warn(`[FileCleaner] Error al eliminar archivo ${relativeUrl}:`, error.message);
  }
}

module.exports = { deleteUploadedFile };
