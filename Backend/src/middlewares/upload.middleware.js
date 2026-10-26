const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Directorio base para imágenes de productos
const uploadDir = path.join(__dirname, '../../uploads/products');

// Asegurar que la carpeta exista al arrancar
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Mapa estricto de MIME a extensión segura (sin SVG para prevenir Stored XSS)
const SAFE_IMAGE_MIMES = {
  'image/jpeg': '.jpg',
  'image/jpg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/gif': '.gif'
};

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const ext = SAFE_IMAGE_MIMES[file.mimetype] || '.jpg';
    cb(null, `prod_${uniqueSuffix}${ext}`);
  }
});

const fileFilter = (req, file, cb) => {
  if (Object.prototype.hasOwnProperty.call(SAFE_IMAGE_MIMES, file.mimetype)) {
    cb(null, true);
  } else {
    const error = new Error('Formato de imagen no válido. Solo se permiten JPG, PNG, WEBP o GIF.');
    error.statusCode = 400;
    cb(error, false);
  }
};

const uploadProductImage = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // Máximo 5MB por imagen
  }
});

// Directorio para logos y banners de tiendas (tenants)
const storeUploadDir = path.join(__dirname, '../../uploads/store');
if (!fs.existsSync(storeUploadDir)) {
  fs.mkdirSync(storeUploadDir, { recursive: true });
}

const storeStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, storeUploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const ext = SAFE_IMAGE_MIMES[file.mimetype] || '.png';
    const prefix = req.path.includes('banner') ? 'banner' : 'logo';
    cb(null, `${prefix}_${uniqueSuffix}${ext}`);
  }
});

const uploadStoreImage = multer({
  storage: storeStorage,
  fileFilter,
  limits: {
    fileSize: 8 * 1024 * 1024 // Máximo 8MB para banners de alta calidad
  }
});

/**
 * Verifica que los primeros bytes del archivo en disco correspondan a una firma real
 * de imagen (JPEG, PNG, GIF o WebP). Si no coincide, elimina el archivo y lanza HTTP 400.
 */
const verifyUploadedImageSignature = (filePath) => {
  if (!filePath || !fs.existsSync(filePath)) {
    throw Object.assign(new Error('El archivo subido no se encontró en el servidor.'), { statusCode: 400 });
  }
  const fd = fs.openSync(filePath, 'r');
  const buffer = Buffer.alloc(12);
  let bytesRead = 0;
  try {
    bytesRead = fs.readSync(fd, buffer, 0, 12, 0);
  } finally {
    fs.closeSync(fd);
  }

  const isJpeg = bytesRead >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  const isPng = bytesRead >= 8 &&
    buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47 &&
    buffer[4] === 0x0d && buffer[5] === 0x0a && buffer[6] === 0x1a && buffer[7] === 0x0a;
  const isGif = bytesRead >= 6 &&
    buffer[0] === 0x47 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x38 &&
    (buffer[4] === 0x37 || buffer[4] === 0x39) && buffer[5] === 0x61;
  const isWebp = bytesRead >= 12 &&
    buffer.toString('ascii', 0, 4) === 'RIFF' &&
    buffer.toString('ascii', 8, 12) === 'WEBP';

  if (!isJpeg && !isPng && !isGif && !isWebp) {
    try {
      fs.unlinkSync(filePath);
    } catch (_) {
      // Ignorar fallo de limpieza
    }
    throw Object.assign(
      new Error('El contenido del archivo no corresponde a una imagen válida (JPG, PNG, WEBP o GIF).'),
      { statusCode: 400 }
    );
  }
};

module.exports = {
  uploadProductImage,
  uploadStoreImage,
  uploadStoreAsset: uploadStoreImage,
  verifyUploadedImageSignature
};
