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

module.exports = {
  uploadProductImage,
  uploadStoreImage,
  uploadStoreAsset: uploadStoreImage
};
