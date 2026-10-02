const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Asegurar que la carpeta de subidas para productos exista
const uploadDir = path.join(__dirname, '../../uploads/products');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Configuración de almacenamiento en disco
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const cleanBase = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9]/g, '_');
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e6)}`;
    cb(null, `prod_${cleanBase}_${uniqueSuffix}${ext}`);
  }
});

// Filtro de tipos de archivo permitidos (solo imágenes)
const fileFilter = (req, file, cb) => {
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml'];
  if (allowedTypes.includes(file.mimetype.toLowerCase())) {
    cb(null, true);
  } else {
    const err = new Error('Formato de archivo no válido. Solo se admiten imágenes JPG, PNG, WEBP o GIF.');
    err.statusCode = 400;
    cb(err, false);
  }
};

const uploadProductImage = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5 MB máximo
  }
});

const uploadStoreDir = path.join(__dirname, '../../uploads/store');
if (!fs.existsSync(uploadStoreDir)) {
  fs.mkdirSync(uploadStoreDir, { recursive: true });
}

const storeStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadStoreDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const cleanBase = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9]/g, '_');
    const prefix = file.fieldname === 'banner' ? 'banner' : 'logo';
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e6)}`;
    cb(null, `${prefix}_${cleanBase}_${uniqueSuffix}${ext}`);
  }
});

const uploadStoreImage = multer({
  storage: storeStorage,
  fileFilter,
  limits: {
    fileSize: 8 * 1024 * 1024 // 8 MB máximo
  }
});

module.exports = {
  uploadProductImage,
  uploadStoreImage
};
